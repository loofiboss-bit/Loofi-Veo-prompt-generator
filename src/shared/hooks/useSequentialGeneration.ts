

import { useState, useCallback, useRef } from 'react';
import { Shot, GenerationTask } from '@core/types';
import { extractLastFrame } from '@core/utils/videoUtils';
import React from 'react';

interface UseSequentialGenerationProps {
    shots: Shot[];
    setShots: (shots: Shot[]) => void;
    tasks: GenerationTask[];
    startGeneration: (
        prompt: string, 
        settings: { aspectRatio: string; resolution: '1080p' | '720p'; veoModel: 'fast' | 'quality'; count?: number },
        image?: { data: string; mimeType: string }
    ) => Promise<string>; // Returns task ID
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const useSequentialGeneration = ({ 
    shots, setShots, tasks, startGeneration, addToast 
}: UseSequentialGenerationProps) => {
    const [isSequencing, setIsSequencing] = useState(false);
    const abortController = useRef<AbortController | null>(null);

    // Helper to find a completed task by ID and get its video URL
    const getTaskResult = (taskId: string): string | null => {
        const task = tasks.find(t => t.id === taskId);
        return (task && task.status === 'Complete') ? task.videoUrl : null;
    };

    const waitForTaskCompletion = async (taskId: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (abortController.current?.signal.aborted) {
                    clearInterval(checkInterval);
                    reject(new Error("Sequence Aborted"));
                    return;
                }
                // Rely on effect-based state machine instead of interval polling
                // This function is kept for structure reference if we needed imperative wait
                clearInterval(checkInterval);
            }, 1000);
        });
    };

    // We'll use an effect-based state machine for robustness
    const [currentShotIndex, setCurrentShotIndex] = useState<number>(-1);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [promptsList, setPromptsList] = useState<string[]>([]);
    
    const startSequence = useCallback((prompts: string[]) => {
        if (prompts.length === 0) return;
        setPromptsList(prompts);
        setCurrentShotIndex(0);
        setIsSequencing(true);
        abortController.current = new AbortController();
    }, []);

    const stopSequence = useCallback(() => {
        setIsSequencing(false);
        setCurrentShotIndex(-1);
        setCurrentTaskId(null);
        if (abortController.current) {
            abortController.current.abort();
        }
    }, []);

    // The Sequencer Effect
    // Watch tasks, currentShotIndex, and isSequencing
    React.useEffect(() => {
        if (!isSequencing || currentShotIndex === -1 || currentShotIndex >= promptsList.length) {
            if (isSequencing && currentShotIndex >= promptsList.length) {
                addToast("Sequence Generation Complete!", 'success');
                setIsSequencing(false);
            }
            return;
        }

        const processShot = async () => {
            const shot = shots[currentShotIndex];
            const prompt = promptsList[currentShotIndex];

            // If we already have a task ID for this index, check if it's done
            if (currentTaskId) {
                const task = tasks.find(t => t.id === currentTaskId);
                
                if (task) {
                    if (task.status === 'Complete' && task.videoUrl) {
                        // Task Finished!
                        const updatedShots = [...shots];
                        const existingShot = updatedShots[currentShotIndex];
                        
                        // Handle Takes Logic
                        const newTakes = existingShot.takes ? [...existingShot.takes] : (existingShot.generatedVideoUrl ? [existingShot.generatedVideoUrl] : []);
                        
                        // Add new take if it's unique or just always push for history
                        newTakes.push(task.videoUrl);

                        updatedShots[currentShotIndex] = { 
                            ...existingShot, 
                            generatedVideoUrl: task.videoUrl, // Update active URL
                            takes: newTakes,
                            selectedTakeIndex: newTakes.length - 1
                        };
                        setShots(updatedShots);

                        // 2. Move to next index
                        setCurrentTaskId(null);
                        setCurrentShotIndex(prev => prev + 1);
                    } else if (task.status === 'Error') {
                        // Stop on error
                        addToast(`Sequence failed at shot ${currentShotIndex + 1}: ${task.error}`, 'error');
                        setIsSequencing(false);
                    }
                }
                return;
            }

            // If no task ID, we need to START this shot
            try {
                let inputImage = undefined;

                // Visual Link Logic - Priority 1
                if (currentShotIndex > 0 && shot.visualLink) {
                    const prevShot = shots[currentShotIndex - 1];
                    // Use the *active* take of the previous shot for linking
                    const prevVideoUrl = prevShot.takes && prevShot.selectedTakeIndex !== undefined 
                        ? prevShot.takes[prevShot.selectedTakeIndex] 
                        : prevShot.generatedVideoUrl;

                    if (prevVideoUrl) {
                        addToast(`Linking visual from Shot ${currentShotIndex}...`, 'info');
                        try {
                            inputImage = await extractLastFrame(prevVideoUrl);
                        } catch (e) {
                            console.warn("Failed to extract frame, continuing without link", e);
                            addToast(`Frame extraction failed for Shot ${currentShotIndex}. Proceeding without link.`, 'error');
                        }
                    } else {
                        // Previous shot finished but has no URL? Should have been caught by 'Error' check above.
                        console.warn("Previous shot has no URL for linking.");
                    }
                } 
                // Concept Image Logic - Priority 2 (if no visual link active)
                else if (shot.conceptImageUrl) {
                    try {
                        // conceptImageUrl is "data:image/jpeg;base64,..."
                        // We need to strip the prefix
                        const parts = shot.conceptImageUrl.split(',');
                        if (parts.length === 2) {
                            const mimeMatch = parts[0].match(/:(.*?);/);
                            if (mimeMatch) {
                                inputImage = {
                                    mimeType: mimeMatch[1],
                                    data: parts[1]
                                };
                                addToast(`Using Concept Image for Shot ${currentShotIndex + 1}...`, 'info');
                            }
                        }
                    } catch (e) {
                        console.warn("Failed to parse concept image", e);
                    }
                }

                // Start Generation
                // We assume standard settings for now, can be parameterized
                const taskId = await startGeneration(prompt, {
                    aspectRatio: '16:9', // Default, should ideally come from global config
                    resolution: '720p',
                    veoModel: 'fast',
                    count: 1
                }, inputImage);

                setCurrentTaskId(taskId);

            } catch (e) {
                console.error("Failed to start generation", e);
                setIsSequencing(false);
            }
        };

        // Poll every 1s if we are waiting for a task, or run immediately if we need to start one
        const timer = setInterval(processShot, 1000);
        return () => clearInterval(timer);

    }, [isSequencing, currentShotIndex, currentTaskId, tasks, promptsList, shots, setShots, startGeneration, addToast]);

    return {
        isSequencing,
        startSequence,
        stopSequence,
        currentShotIndex
    };
};