
import { useState, useCallback, useRef, useEffect } from 'react';
import { Shot, GenerationTask, CharacterProfile, LocationProfile, GlobalContext } from '../types';
import * as geminiService from '../services/geminiService';
import { getAudioDuration, createWavHeader } from '../utils/audio';
import { buildShotPrompt } from '../services/promptBuilder';

interface UseDirectorsChainProps {
    shots: Shot[];
    setShots: (shots: Shot[]) => void;
    updateShot: (id: number, field: keyof Shot, value: any) => void;
    tasks: GenerationTask[];
    startVideoGeneration: (
        prompt: string, 
        settings: { aspectRatio: string; resolution: '1080p' | '720p'; veoModel: 'fast' | 'quality'; count?: number },
        image?: { data: string; mimeType: string }
    ) => Promise<string>;
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    globalContext: GlobalContext;
    savedCharacters: CharacterProfile[];
    locations: LocationProfile[];
}

export const useDirectorsChain = ({ 
    shots, setShots, updateShot, tasks, startVideoGeneration, addToast, globalContext, savedCharacters, locations
}: UseDirectorsChainProps) => {
    
    const [chainStatus, setChainStatus] = useState<'idle' | 'running' | 'paused' | 'complete' | 'error'>('idle');
    const [currentShotId, setCurrentShotId] = useState<number | null>(null);
    const [currentStep, setCurrentStep] = useState<'audio' | 'image' | 'video' | null>(null);
    const [progressMessage, setProgressMessage] = useState('');
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    // Refs to access latest state inside async loop without dependencies issues
    const shotsRef = useRef(shots);
    shotsRef.current = shots;
    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;

    const stopChain = useCallback(() => {
        if (abortController) abortController.abort();
        setChainStatus('idle');
        setCurrentShotId(null);
        setCurrentStep(null);
        setProgressMessage('');
    }, [abortController]);

    const pauseChain = useCallback((errorMsg?: string) => {
        setChainStatus('error');
        setProgressMessage(errorMsg || "Chain paused.");
        addToast(errorMsg || "Production chain paused.", 'error');
    }, [addToast]);

    // --- Helper: Audio Generation ---
    const processAudio = async (shot: Shot): Promise<void> => {
        if (shot.audioUrl || !shot.dialogueText) return; // Skip if done or no dialogue

        setCurrentStep('audio');
        setProgressMessage(`Generating audio for Shot ${shot.id}...`);

        const base64Audio = await geminiService.generateSpeech(shot.dialogueText);
        
        // Process Blob
        const byteCharacters = atob(base64Audio);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const wavHeader = createWavHeader(byteArray.length, 24000, 1, 16);
        const wavBlob = new Blob([wavHeader, byteArray], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(wavBlob);
        const duration = await getAudioDuration(wavBlob);

        // Direct Store Update
        updateShot(shot.id, 'audioUrl', audioUrl);
        updateShot(shot.id, 'audioDuration', duration);
        updateShot(shot.id, 'duration', Math.ceil(duration));
    };

    // --- Helper: Image Generation ---
    const processImage = async (shot: Shot): Promise<string | null> => {
        // Return existing if available
        if (shot.conceptImageUrl) return shot.conceptImageUrl;
        if (!shot.action) return null;

        setCurrentStep('image');
        setProgressMessage(`Visualizing Shot ${shot.id}...`);

        const prompt = buildShotPrompt(globalContext, shot, savedCharacters.find(c => c.id === shot.characterId), locations.find(l => l.id === shot.locationId));
        // Force 16:9 for consistent video gen input usually, or use global preference
        const imageUrl = await geminiService.generateConceptArt(prompt, { aspectRatio: '16:9' });
        
        updateShot(shot.id, 'conceptImageUrl', imageUrl);
        return imageUrl;
    };

    // --- Helper: Video Generation ---
    const processVideo = async (shot: Shot, imageUrl: string | null): Promise<void> => {
        if (shot.generatedVideoUrl) return; // Skip if done

        setCurrentStep('video');
        setProgressMessage(`Rendering Shot ${shot.id}...`);

        const prompt = buildShotPrompt(globalContext, shot, savedCharacters.find(c => c.id === shot.characterId), locations.find(l => l.id === shot.locationId));
        
        let inputImage = undefined;
        if (imageUrl) {
            // Parse data URL to pass to generator
            try {
                const parts = imageUrl.split(',');
                if (parts.length === 2) {
                    const mimeMatch = parts[0].match(/:(.*?);/);
                    if (mimeMatch) {
                        inputImage = { mimeType: mimeMatch[1], data: parts[1] };
                    }
                }
            } catch(e) { console.error("Failed to parse image for video", e); }
        }

        const taskId = await startVideoGeneration(prompt, {
            aspectRatio: '16:9',
            resolution: '720p',
            veoModel: 'fast',
            count: 1
        }, inputImage);

        // Wait for Completion (Polling Pattern)
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                const currentTask = tasksRef.current.find(t => t.id === taskId);
                
                if (!currentTask) return; // Wait for task to appear in store

                if (currentTask.status === 'Complete' && currentTask.videoUrl) {
                    clearInterval(checkInterval);
                    updateShot(shot.id, 'generatedVideoUrl', currentTask.videoUrl);
                    resolve();
                } else if (currentTask.status === 'Error') {
                    clearInterval(checkInterval);
                    reject(new Error(currentTask.error || "Video generation failed"));
                }
            }, 1500);
        });
    };

    const runChain = async () => {
        setChainStatus('running');
        const controller = new AbortController();
        setAbortController(controller);

        try {
            // Iterate continuously until all shots are done
            // We re-read shotsRef every loop to get updated state
            let pendingShots = shotsRef.current.filter(s => !s.generatedVideoUrl && s.type !== 'title');
            
            // Loop while we have work
            while (pendingShots.length > 0) {
                if (controller.signal.aborted) break;

                const shot = pendingShots[0]; // Process first incomplete
                setCurrentShotId(shot.id);

                // 1. Audio
                try {
                    await processAudio(shot);
                } catch (e) {
                    console.error("Audio fail", e);
                    // Non-fatal? Maybe, but let's pause for review.
                    throw new Error(`Audio generation failed for Shot ${shot.id}`);
                }

                // Refetch shot from ref to get updated audio state
                const updatedShotAudio = shotsRef.current.find(s => s.id === shot.id)!;

                // 2. Image
                let imageUrl = updatedShotAudio.conceptImageUrl || null;
                try {
                    imageUrl = await processImage(updatedShotAudio);
                } catch (e) {
                    console.error("Image fail", e);
                    throw new Error(`Image generation failed for Shot ${shot.id}`);
                }

                // Refetch shot
                const updatedShotImage = shotsRef.current.find(s => s.id === shot.id)!;

                // 3. Video
                try {
                    // Pass the freshly generated (or existing) image URL
                    await processVideo(updatedShotImage, imageUrl);
                } catch (e) {
                    throw new Error(`Video rendering failed for Shot ${shot.id}: ${(e as Error).message}`);
                }

                // Re-evaluate pending list from latest state
                pendingShots = shotsRef.current.filter(s => !s.generatedVideoUrl && s.type !== 'title');
            }

            setChainStatus('complete');
            addToast("Director's Chain Complete! Movie is ready.", 'success');
            setCurrentShotId(null);
            setProgressMessage("All shots rendered.");

        } catch (error) {
            if (!controller.signal.aborted) {
                pauseChain((error as Error).message);
            }
        }
    };

    return {
        chainStatus,
        startChain: runChain,
        stopChain,
        currentShotId,
        currentStep,
        progressMessage
    };
};
