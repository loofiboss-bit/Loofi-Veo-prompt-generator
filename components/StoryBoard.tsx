
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
import CheckboxInput from './CheckboxInput';
import { CHARACTER_LIMITS } from '../constants';
import { ToastMessage, CharacterProfile, Shot, GlobalContext, GenerationTask, SFXEvent, TransitionType, LocationProfile, Asset, TextOverlay } from '../types';
import { generateShotList } from '../utils/pdfExport';
import { buildShotPrompt } from '../services/promptBuilder';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import TimelinePlayer from './TimelinePlayer';
import { useDirectorsChain } from '../hooks/useDirectorsChain'; // New Hook
import { createWavHeader, getAudioDuration } from '../utils/audio';
import { generateEDL } from '../utils/edlExport';
import JSZip from 'jszip';
import { useAppStore } from '../store/useAppStore';
import { useHotkeys } from '../hooks/useHotkeys';
import AutoBlockerModal from './AutoBlockerModal';
import { useLocationStore } from '../store/useLocationStore';
import CameraPlotterModal from './CameraPlotterModal';
import WhiteboardModal from './WhiteboardModal';
import InpaintingModal from './InpaintingModal';
import GenerativeCanvasModal from './GenerativeCanvasModal'; // New Import
import RecordingBoothModal from './RecordingBoothModal';
import TableReadPlayer from './TableReadPlayer';
import Tooltip from './Tooltip';
import { useCollaborativeProject } from '../hooks/useCollaborativeProject';
import ScriptImportReviewModal from './ScriptImportReviewModal';
import { renderTitleCard } from '../services/videoEditorService';
import TitleEditorModal from './TitleEditorModal';
import * as lipSyncService from '../services/lipSyncService';
import { extractLastFrame } from '../utils/videoUtils';

interface StoryBoardProps {
    isOpen: boolean;
    onClose: () => void;
    uiStrings: any;
    addToast: (message: string, type: ToastMessage['type']) => void;
    onGenerateBatch?: (prompts: string[]) => void;
    // savedCharacters removed from props
    videoTasks?: GenerationTask[];
    startVideoGeneration?: (prompt: string, settings: any, image?: any) => Promise<string>;
}

interface BRollSuggestion {
    keyword: string;
    description: string;
}

const StoryBoard: React.FC<StoryBoardProps> = ({ 
    isOpen, onClose, uiStrings, addToast, onGenerateBatch,
    videoTasks = [], startVideoGeneration
}) => {
    const t = uiStrings.storyBoard;
    
    // Connect to Collaborative Sync Hook
    const { updateFocus, activeUsers } = useCollaborativeProject();

    // Connect to Zustand Store
    const { 
        sbGlobalContext: globalContext, 
        setSbGlobalContext: setGlobalContext, 
        sbShots: shots, 
        setSbShots: setShots,
        addShot,
        deleteShot,
        updateShot: handleShotChange,
        promptState,
        addAsset,
        characterBank: savedCharacters // Use store characters
    } = useAppStore();

    // Connect to Location Store
    const { locations } = useLocationStore();
    
    // Derived state for results can remain local as it's generated on demand
    const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Import Script State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [scriptText, setScriptText] = useState('');
    const [isParsingScript, setIsParsingScript] = useState(false);
    
    // Smart Import Review State
    const [pendingImportShots, setPendingImportShots] = useState<Partial<Shot>[]>([]);
    const [isReviewingImport, setIsReviewingImport] = useState(false);

    // Auto Blocker State
    const [isAutoBlockerOpen, setIsAutoBlockerOpen] = useState(false);

    // Camera Plotter State
    const [plottingShotId, setPlottingShotId] = useState<number | null>(null);

    // Whiteboard State
    const [whiteboardShotId, setWhiteboardShotId] = useState<number | null>(null);
    const [isProcessingSketch, setIsProcessingSketch] = useState<Record<number, boolean>>({});

    // Inpainting State
    const [inpaintingShotId, setInpaintingShotId] = useState<number | null>(null);

    // Outpainting (Generative Canvas) State
    const [outpaintingShotId, setOutpaintingShotId] = useState<number | null>(null);

    // Recording Booth State
    const [recordingShotId, setRecordingShotId] = useState<number | null>(null);

    // Text Overlay Editor State
    const [textEditorShotId, setTextEditorShotId] = useState<number | null>(null);

    // Contextual Flow State
    const [isContextualFlowEnabled, setIsContextualFlowEnabled] = useState(true);

    // Timeline Player State
    const [isPlayingMovie, setIsPlayingMovie] = useState(false);
    
    // Table Read State
    const [isTableReadOpen, setIsTableReadOpen] = useState(false);

    // Audio State
    const [isGeneratingTTS, setIsGeneratingTTS] = useState<number | null>(null);
    const [isAutoFoleyRunning, setIsAutoFoleyRunning] = useState<number | null>(null);
    const [isExportingEDL, setIsExportingEDL] = useState(false);

    // Concept Image State
    const [isGeneratingConcept, setIsGeneratingConcept] = useState<Record<number, boolean>>({});

    // Auto-Critique State
    const [critiqueStatus, setCritiqueStatus] = useState<Record<number, boolean>>({});

    // B-Roll State
    const [bRollSuggestions, setBRollSuggestions] = useState<Record<number, BRollSuggestion[]>>({});
    const [isAnalyzingBRoll, setIsAnalyzingBRoll] = useState<Record<number, boolean>>({});

    // Enhance Shot State
    const [isEnhancingShot, setIsEnhancingShot] = useState<Record<number, boolean>>({});

    // Script Doctor State
    const [doctorShotId, setDoctorShotId] = useState<number | null>(null);
    const [isDoctoring, setIsDoctoring] = useState(false);

    // Title Card Rendering State
    const [isRenderingTitle, setIsRenderingTitle] = useState<Record<number, boolean>>({});

    // --- Bridge / Selection State ---
    const [selectedShotIds, setSelectedShotIds] = useState<number[]>([]);
    const [isBridging, setIsBridging] = useState(false);

    // --- Color Match State ---
    const [colorMatchTargetId, setColorMatchTargetId] = useState<number | null>(null);
    const [isColorMatching, setIsColorMatching] = useState(false);

    // Prepare Background Music URL from Store
    const backgroundMusicUrl = useMemo(() => {
        if (promptState.uploadedAudio) {
            try {
                const byteCharacters = atob(promptState.uploadedAudio.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: promptState.uploadedAudio.mimeType });
                return URL.createObjectURL(blob);
            } catch (e) {
                console.error("Failed to process background music", e);
            }
        }
        return null;
    }, [promptState.uploadedAudio]);

    // --- DIRECTOR'S CHAIN INTEGRATION ---
    const { 
        chainStatus, 
        startChain, 
        stopChain, 
        currentShotId, 
        currentStep, 
        progressMessage 
    } = useDirectorsChain({
        shots,
        setShots,
        updateShot: handleShotChange,
        tasks: videoTasks,
        startVideoGeneration: startVideoGeneration || (async () => ""),
        addToast,
        globalContext,
        savedCharacters,
        locations
    });

    const isChaining = chainStatus === 'running';

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Escape handling for sub-modals
            if (e.key === 'Escape') {
                if (isImportModalOpen) {
                    e.stopPropagation();
                    setIsImportModalOpen(false);
                }
                else if (isReviewingImport) {
                    e.stopPropagation();
                    setIsReviewingImport(false);
                }
                else if (isPlayingMovie) {
                    e.stopPropagation();
                    setIsPlayingMovie(false);
                }
                else if (isTableReadOpen) {
                    e.stopPropagation();
                    setIsTableReadOpen(false);
                }
                else if (isAutoBlockerOpen) {
                    e.stopPropagation();
                    setIsAutoBlockerOpen(false);
                }
                else if (plottingShotId !== null) {
                    e.stopPropagation();
                    setPlottingShotId(null);
                }
                else if (whiteboardShotId !== null) {
                    e.stopPropagation();
                    setWhiteboardShotId(null);
                }
                else if (inpaintingShotId !== null) {
                    e.stopPropagation();
                    setInpaintingShotId(null);
                }
                else if (outpaintingShotId !== null) {
                    e.stopPropagation();
                    setOutpaintingShotId(null);
                }
                else if (recordingShotId !== null) {
                    e.stopPropagation();
                    setRecordingShotId(null);
                }
                else if (textEditorShotId !== null) {
                    e.stopPropagation();
                    setTextEditorShotId(null);
                }
                else if (doctorShotId !== null) {
                    e.stopPropagation();
                    setDoctorShotId(null);
                }
                else if (colorMatchTargetId !== null) {
                    e.stopPropagation();
                    setColorMatchTargetId(null);
                }
                else if (isOpen) {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isImportModalOpen, isPlayingMovie, isTableReadOpen, isAutoBlockerOpen, plottingShotId, whiteboardShotId, inpaintingShotId, outpaintingShotId, recordingShotId, textEditorShotId, doctorShotId, colorMatchTargetId, isOpen, isReviewingImport]);

    const handleDeleteShot = (id: number) => {
        if (shots.length <= 1) {
            addToast("You need at least one shot.", 'error');
            return;
        }
        deleteShot(id);
        // Clean selection
        setSelectedShotIds(prev => prev.filter(sid => sid !== id));
    };

    const handleSelectionToggle = (shotId: number) => {
        setSelectedShotIds(prev => {
            if (prev.includes(shotId)) return prev.filter(id => id !== shotId);
            return [...prev, shotId];
        });
    };

    const handleColorMatch = async (referenceShotId: number) => {
        if (colorMatchTargetId === null) return;
        
        const targetShot = shots.find(s => s.id === colorMatchTargetId);
        const refShot = shots.find(s => s.id === referenceShotId);
        
        if (!targetShot || !refShot) return;

        // Determine images
        let targetImgBase64 = '';
        let refImgBase64 = '';

        try {
            // Get Target Image
            if (targetShot.generatedVideoUrl) {
                const f = await extractLastFrame(targetShot.generatedVideoUrl);
                targetImgBase64 = f.data;
            } else if (targetShot.conceptImageUrl) {
                targetImgBase64 = targetShot.conceptImageUrl.split(',')[1];
            }

            // Get Ref Image
            if (refShot.generatedVideoUrl) {
                const f = await extractLastFrame(refShot.generatedVideoUrl);
                refImgBase64 = f.data;
            } else if (refShot.conceptImageUrl) {
                refImgBase64 = refShot.conceptImageUrl.split(',')[1];
            }

            if (!targetImgBase64 || !refImgBase64) {
                addToast("Both shots need visual content (video or image) to match color.", 'error');
                return;
            }

            setIsColorMatching(true);
            const params = await geminiService.calculateColorGrade(refImgBase64, targetImgBase64);
            
            handleShotChange(colorMatchTargetId, 'colorGrade', params);
            addToast(`Color Grade applied from Shot ${referenceShotId}.`, 'success');
            setColorMatchTargetId(null);

        } catch (error) {
            console.error(error);
            addToast("Failed to calculate color match.", 'error');
        } finally {
            setIsColorMatching(false);
        }
    };

    const handleBridgeGap = async () => {
        if (selectedShotIds.length !== 2) return;
        
        // Determine order
        const indices = selectedShotIds.map(id => shots.findIndex(s => s.id === id)).sort((a, b) => a - b);
        const startIndex = indices[0];
        const endIndex = indices[1];
        
        if (startIndex === -1 || endIndex === -1) return;

        const shotA = shots[startIndex];
        const shotB = shots[endIndex];

        // Prompt user for number of bridge scenes
        const numScenesStr = prompt("How many intermediate scenes to generate?", "1");
        const numScenes = parseInt(numScenesStr || "1", 10);
        if (isNaN(numScenes) || numScenes < 1) return;

        setIsBridging(true);
        try {
            const contextA = `Action: ${shotA.action}. Dialogue: ${shotA.dialogueText || 'None'}.`;
            const contextB = `Action: ${shotB.action}. Dialogue: ${shotB.dialogueText || 'None'}.`;
            
            const bridgeShots = await geminiService.bridgeScenes(contextA, contextB, numScenes);
            
            if (bridgeShots.length > 0) {
                // Insert into shots array
                const newShots = [...shots];
                const currentMaxId = Math.max(...shots.map(s => s.id), 0);
                
                const hydratedBridgeShots = bridgeShots.map((s, i) => ({
                    ...s,
                    id: currentMaxId + i + 1,
                    type: 'video',
                    generatedVideoUrl: '',
                    takes: [],
                    selectedTakeIndex: 0,
                    visualLink: true, // Bridge shots usually flow well visually
                    duration: 5,
                    characterId: '' // Could try to infer, but safer blank
                } as Shot));

                // Insert AFTER start index
                newShots.splice(startIndex + 1, 0, ...hydratedBridgeShots);
                setShots(newShots);
                
                addToast(`Bridged gap with ${hydratedBridgeShots.length} new scenes.`, 'success');
                setSelectedShotIds([]); // Clear selection
            } else {
                addToast("AI returned no bridge scenes.", 'error');
            }
        } catch (error) {
            console.error(error);
            addToast("Bridge failed.", 'error');
        } finally {
            setIsBridging(false);
        }
    };

    const generateAllPromptTexts = () => {
        return shots.map((shot) => {
            if (shot.type === 'title') return "Title Card: " + (shot.titleConfig?.text || "Text");
            const characterProfile = savedCharacters.find(c => c.id === shot.characterId);
            const locProfile = locations.find(l => l.id === shot.locationId);
            return buildShotPrompt(globalContext, shot, characterProfile, locProfile);
        });
    };

    const handleBatchGenerate = async () => {
        // Filter out title cards for AI generation
        const videoShots = shots.filter(s => s.type !== 'title');
        
        if (videoShots.length === 0) {
            addToast("Add video shots to generate prompts.", 'info');
            return;
        }

        if (!globalContext.style && !globalContext.character && !globalContext.setting) {
            addToast("Please define some global context.", 'error');
            return;
        }
        if (videoShots.some(s => !s.action.trim())) {
            addToast("All video shots must have an action.", 'error');
            return;
        }

        setIsGenerating(true);
        
        try {
            const refinedPrompts = await geminiService.refineStoryboardContinuity(
                videoShots, 
                globalContext, 
                'en', 
                'gemini-3-pro-preview',
                isContextualFlowEnabled
            );
            
            if (refinedPrompts.length > 0) {
                setGeneratedPrompts(refinedPrompts);
                addToast(t.resultsTitle + " Ready", 'success');
            } else {
                const localPrompts = generateAllPromptTexts();
                setGeneratedPrompts(localPrompts);
                addToast("Generated local fallback.", 'info');
            }
        } catch (error) {
            console.error(error);
            addToast("AI generation failed, using fallback.", 'error');
            const localPrompts = generateAllPromptTexts();
            setGeneratedPrompts(localPrompts);
        } finally {
            setIsGenerating(false);
        }
    };

    // Hotkeys Integration
    useHotkeys({
        "SHIFT+N": () => {
            if(!isChaining) addShot('video');
        },
        "CTRL+ENTER": () => {
            if(!isGenerating && !isChaining) handleBatchGenerate();
        }
    }, isOpen);

    const handleCopyAll = () => {
        if (generatedPrompts.length === 0) return;
        const text = generatedPrompts.map((p, i) => `Shot ${i+1}:\n${p}`).join('\n\n');
        navigator.clipboard.writeText(text);
        addToast("All prompts copied to clipboard", 'success');
    };

    const handleRenderAllVideos = () => {
       // Replaced by Director's Chain
       startChain();
    };

    const handleExportPDF = () => {
        try {
            generateShotList(shots, globalContext, "Veo Storyboard", t);
            addToast("PDF Exported", 'success');
        } catch (error) {
            addToast("Failed to generate PDF", 'error');
        }
    };

    const handleExportEDL = async () => {
        const validShots = shots.filter(s => s.generatedVideoUrl);
        if (validShots.length === 0) {
            addToast("No generated videos to export.", 'error');
            return;
        }
        setIsExportingEDL(true);
        try {
            const zip = new JSZip();
            const projectTitle = "VEO_TIMELINE";
            const edlContent = generateEDL(validShots, projectTitle);
            zip.file(`${projectTitle}.edl`, edlContent);
            
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${projectTitle}_EXPORT.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            addToast("EDL Package Exported", 'success');
        } catch (e) {
            addToast("Export failed", 'error');
        } finally {
            setIsExportingEDL(false);
        }
    };

    const handleParseScript = async () => {
        if (!scriptText.trim()) return;
        setIsParsingScript(true);
        try {
            const scenes = await geminiService.parseScriptToScenes(scriptText, savedCharacters, locations);
            if (scenes.length > 0) {
                // Map to shots format for review
                const potentialShots: Partial<Shot>[] = scenes.map(scene => ({
                    action: scene.action,
                    camera: scene.camera,
                    characterId: scene.characterId,
                    locationId: scene.locationId,
                    visualLink: true
                }));
                
                setPendingImportShots(potentialShots);
                setIsReviewingImport(true);
                setIsImportModalOpen(false);
                setScriptText('');
            } else {
                addToast("Could not parse scenes from script.", 'error');
            }
        } catch (e) {
            console.error(e);
            addToast("Script parsing failed", 'error');
        } finally {
            setIsParsingScript(false);
        }
    };

    const handleConfirmImport = (importedShots: Partial<Shot>[]) => {
        const currentMaxId = shots.length > 0 ? Math.max(...shots.map(s => s.id)) : 0;
        const newShots = importedShots.map((s, i) => ({
            ...s,
            id: currentMaxId + i + 1,
            type: 'video',
            // Ensure required Shot properties
            generatedVideoUrl: '',
            takes: [],
            selectedTakeIndex: 0
        } as Shot));
        
        setShots([...shots, ...newShots]);
        addToast(`Imported ${newShots.length} shots from script`, 'success');
    };

    const handleGenerateTTS = async (shot: Shot) => {
        const defaultText = shot.dialogueText || shot.action;
        const text = prompt(`Enter text for TTS:`, defaultText);
        if (text === null || !text.trim()) return;
        setIsGeneratingTTS(shot.id);
        try {
            const base64Audio = await geminiService.generateSpeech(text);
            const byteCharacters = atob(base64Audio);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const wavHeader = createWavHeader(byteArray.length, 24000, 1, 16);
            const wavBlob = new Blob([wavHeader, byteArray], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(wavBlob);
            
            // Smart Duration Sync
            const duration = await getAudioDuration(wavBlob);
            
            handleShotChange(shot.id, 'audioUrl', audioUrl);
            handleShotChange(shot.id, 'audioDuration', duration);
            handleShotChange(shot.id, 'duration', Math.ceil(duration)); // Sync shot duration
            // Reset sync status if audio changes
            handleShotChange(shot.id, 'syncStatus', 'unsynced');

            if (!shot.dialogueText) {
                handleShotChange(shot.id, 'dialogueText', text);
            }
            addToast(`TTS Generated (${duration.toFixed(1)}s)`, 'success');
        } catch (error) {
            addToast("Failed to generate speech", 'error');
        } finally {
            setIsGeneratingTTS(null);
        }
    };

    const handleSaveRecording = async (blob: Blob) => {
        if (recordingShotId === null) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            
            // Calculate duration
            const duration = await getAudioDuration(blob);
            
            handleShotChange(recordingShotId, 'audioUrl', base64data);
            handleShotChange(recordingShotId, 'audioDuration', duration);
            handleShotChange(recordingShotId, 'duration', Math.ceil(duration)); // Sync shot duration
            handleShotChange(recordingShotId, 'syncStatus', 'unsynced');
            
            addToast(`Voiceover saved (${duration.toFixed(1)}s).`, 'success');
        };
        reader.readAsDataURL(blob);
    };

    const handleGenerateConcept = async (shot: Shot) => {
        if (!shot.action) return;
        setIsGeneratingConcept(prev => ({ ...prev, [shot.id]: true }));
        try {
            const fullPrompt = buildShotPrompt(globalContext, shot, savedCharacters.find(c => c.id === shot.characterId), locations.find(l => l.id === shot.locationId));
            const imageUrl = await geminiService.generateConceptArt(fullPrompt, { aspectRatio: promptState.aspectRatio });
            handleShotChange(shot.id, 'conceptImageUrl', imageUrl);
            addToast("Concept art generated", 'success');
        } catch (e) {
            addToast("Failed to generate concept art", 'error');
        } finally {
            setIsGeneratingConcept(prev => ({ ...prev, [shot.id]: false }));
        }
    };

    const handleGenerateSketch = async (base64Sketch: string) => {
        if (whiteboardShotId === null) return;
        setIsProcessingSketch(prev => ({ ...prev, [whiteboardShotId]: true }));
        try {
            const shot = shots.find(s => s.id === whiteboardShotId);
            const prompt = shot ? shot.action : "A cinematic scene";
            const resultUrl = await geminiService.turnSketchToImage(base64Sketch, prompt);
            handleShotChange(whiteboardShotId, 'conceptImageUrl', resultUrl);
            setWhiteboardShotId(null);
            addToast("Sketch transformed to concept", 'success');
        } catch (e) {
            addToast("Failed to process sketch", 'error');
        } finally {
            if (whiteboardShotId !== null) setIsProcessingSketch(prev => ({ ...prev, [whiteboardShotId]: false }));
        }
    };

    const handleInpaintComplete = async (maskBase64: string, prompt: string) => {
        if (inpaintingShotId === null) return;
        const shot = shots.find(s => s.id === inpaintingShotId);
        if (!shot?.conceptImageUrl) return;
        
        const baseImage = shot.conceptImageUrl.split(',')[1];
        
        try {
            const resultUrl = await geminiService.inpaintingWithImagen(baseImage, maskBase64, prompt);
            handleShotChange(inpaintingShotId, 'conceptImageUrl', resultUrl);
            addToast("Image updated", 'success');
        } catch (e) {
            addToast("Inpainting failed", 'error');
        }
    };

    const handleOutpaintComplete = async (compositeBase64: string, maskBase64: string, prompt: string) => {
        if (outpaintingShotId === null) return;
        
        try {
            const resultUrl = await geminiService.outpaintImage(compositeBase64, maskBase64, prompt);
            handleShotChange(outpaintingShotId, 'conceptImageUrl', `data:image/png;base64,${resultUrl}`); // resultUrl from service might already have prefix, double check. Service currently returns pure base64 in inpaintingWithImagen but prefixed in generateConceptArt. Let's fix in service or here. inpaintingWithImagen returns data url. So we just pass it.
            // Actually inpaintingWithImagen returns full data url.
            // Let's check service logic for outpaintImage... it just calls inpaintingWithImagen.
            handleShotChange(outpaintingShotId, 'conceptImageUrl', resultUrl);
            
            addToast("Frame expanded!", 'success');
        } catch (e) {
            addToast("Outpainting failed", 'error');
        }
    };

    const handleSaveOverlays = (overlays: TextOverlay[]) => {
        if (textEditorShotId !== null) {
            handleShotChange(textEditorShotId, 'overlays', overlays);
            addToast("Titles saved.", 'success');
        }
    };

    const handleAutoFoley = async (shot: Shot) => {
        if (!shot.generatedVideoUrl) return;
        setIsAutoFoleyRunning(shot.id);
        try {
            const events = await geminiService.analyzeVideoForSFX(shot.generatedVideoUrl);
            
            const sfxList: SFXEvent[] = [];
            for (const event of events) {
                const audioBase64 = await geminiService.generateSoundEffect(event.description);
                const byteCharacters = atob(audioBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const wavHeader = createWavHeader(byteArray.length, 24000, 1, 16);
                const wavBlob = new Blob([wavHeader, byteArray], { type: 'audio/wav' });
                const url = URL.createObjectURL(wavBlob);
                
                sfxList.push({
                    id: Date.now() + Math.random().toString(),
                    timestamp: event.timestamp,
                    description: event.description,
                    audioUrl: url
                });
            }
            
            handleShotChange(shot.id, 'sfx', sfxList);
            addToast(`Generated ${sfxList.length} sound effects.`, 'success');
        } catch (e) {
            addToast("Auto-Foley failed", 'error');
        } finally {
            setIsAutoFoleyRunning(null);
        }
    };

    const handleSuggestBRoll = async (shot: Shot) => {
        if (!shot.action && !shot.dialogueText) return;
        setIsAnalyzingBRoll(prev => ({ ...prev, [shot.id]: true }));
        try {
            const context = shot.dialogueText || shot.action;
            const suggestions = await geminiService.suggestBRoll(context, 'en');
            setBRollSuggestions(prev => ({ ...prev, [shot.id]: suggestions }));
        } catch (e) {
            addToast("Failed to suggest B-Roll", 'error');
        } finally {
            setIsAnalyzingBRoll(prev => ({ ...prev, [shot.id]: false }));
        }
    };

    const handleScriptDoctor = async (shot: Shot, tone: string) => {
        if (!shot.dialogueText) {
            addToast("Write some dialogue first.", 'error');
            return;
        }
        setIsDoctoring(true);
        try {
            const context = `Action: ${shot.action}. Character: ${savedCharacters.find(c => c.id === shot.characterId)?.name || 'Unknown'}.`;
            const rewritten = await geminiService.rewriteDialogue(shot.dialogueText, context, tone);
            handleShotChange(shot.id, 'dialogueText', rewritten);
            if (shot.audioUrl) {
                handleShotChange(shot.id, 'syncStatus', 'unsynced');
                addToast("Dialogue changed. Please regenerate TTS/Audio.", 'info');
            } else {
                addToast("Script refined!", 'success');
            }
            setDoctorShotId(null);
        } catch (e) {
            addToast("Script Doctor failed.", 'error');
        } finally {
            setIsDoctoring(false);
        }
    };

    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, shotId: number) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const duration = await getAudioDuration(url);
            
            handleShotChange(shotId, 'audioUrl', url);
            handleShotChange(shotId, 'audioDuration', duration);
            handleShotChange(shotId, 'duration', Math.ceil(duration)); // Sync shot duration
            handleShotChange(shotId, 'syncStatus', 'unsynced');
            
            addToast(`Audio attached (${duration.toFixed(1)}s)`, 'success');
        }
    };

    const handleCycleTransition = (shotId: number) => {
        const shot = shots.find(s => s.id === shotId);
        if (!shot) return;
        const transitions: TransitionType[] = ['cut', 'crossfade', 'wipe_left', 'fade_black'];
        const currentIndex = transitions.indexOf(shot.transitionToNext || 'cut');
        const nextIndex = (currentIndex + 1) % transitions.length;
        handleShotChange(shotId, 'transitionToNext', transitions[nextIndex]);
    };

    const handlePlotCamera = (shotId: number) => { setPlottingShotId(shotId); };
    const handlePlotApply = (cameraPrompt: string) => {
        if (plottingShotId !== null) {
            handleShotChange(plottingShotId, 'camera', cameraPrompt);
        }
    };

    const handleEnhanceShotAction = async (shotId: number, currentAction: string) => {
        if (!currentAction.trim()) return;
        setIsEnhancingShot(prev => ({ ...prev, [shotId]: true }));
        try {
            const enhanced = await geminiService.enhancePrompt(currentAction, globalContext.style);
            handleShotChange(shotId, 'action', enhanced);
            addToast('Shot action enhanced!', 'success');
        } catch (e) {
            addToast('Failed to enhance shot.', 'error');
        } finally {
            setIsEnhancingShot(prev => ({ ...prev, [shotId]: false }));
        }
    }

    const handleRenderTitleShot = async (shot: Shot) => {
        if (!shot.titleConfig) return;
        setIsRenderingTitle(prev => ({ ...prev, [shot.id]: true }));
        try {
            const videoUrl = await renderTitleCard(
                shot.titleConfig.text,
                shot.duration || 5,
                {
                    background: shot.titleConfig.background,
                    color: shot.titleConfig.color,
                    fontSize: shot.titleConfig.fontSize
                }
            );
            handleShotChange(shot.id, 'generatedVideoUrl', videoUrl);
            addToast("Title card rendered.", 'success');
        } catch (e) {
            console.error(e);
            addToast("Failed to render title card.", 'error');
        } finally {
            setIsRenderingTitle(prev => ({ ...prev, [shot.id]: false }));
        }
    };

    const cycleTake = (shotId: number, direction: 'next' | 'prev') => {
        const shot = shots.find(s => s.id === shotId);
        if (!shot || !shot.takes || shot.takes.length <= 1) return;

        const currentIdx = shot.selectedTakeIndex ?? 0;
        let newIndex = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
        
        if (newIndex >= shot.takes.length) newIndex = 0;
        if (newIndex < 0) newIndex = shot.takes.length - 1;

        handleShotChange(shotId, 'selectedTakeIndex', newIndex);
        handleShotChange(shotId, 'generatedVideoUrl', shot.takes[newIndex]);
        // When changing takes, sync status is likely invalid
        handleShotChange(shotId, 'syncStatus', 'unsynced');
    };

    const handleInsertBRoll = (index: number, suggestion: BRollSuggestion) => {
        const newId = shots.length > 0 ? Math.max(...shots.map(s => s.id)) + 1 : 1;
        const newShot: Shot = {
            id: newId,
            type: 'video',
            action: suggestion.description,
            camera: 'B-Roll / Detail',
            characterId: '', // B-roll is usually object/scenery
            generatedVideoUrl: '',
            takes: [],
            selectedTakeIndex: 0,
            visualLink: false
        };
        
        // Insert after current shot
        const newShots = [...shots];
        newShots.splice(index + 1, 0, newShot);
        setShots(newShots);
        
        setBRollSuggestions(prev => {
            const next = { ...prev };
            delete next[shots[index].id];
            return next;
        });
        addToast(`Inserted B-Roll: ${suggestion.keyword}`, 'success');
    };

    // --- Lip Sync Handler ---
    const handleLipSync = async (shot: Shot) => {
        if (!shot.generatedVideoUrl || !shot.audioUrl) {
            addToast("Need both video and audio to sync lips.", 'error');
            return;
        }
        
        handleShotChange(shot.id, 'syncStatus', 'processing');
        addToast("Syncing lips... (This may take a moment)", 'info');
        
        try {
            const syncedUrl = await lipSyncService.syncVideo(shot.generatedVideoUrl, shot.audioUrl);
            handleShotChange(shot.id, 'generatedVideoUrl', syncedUrl);
            handleShotChange(shot.id, 'syncStatus', 'synced');
            
            // Optionally update current take if we want to preserve history of unsynced versions
            // For simplicity in this iteration, we replace the active video URL.
            
            addToast("Lip sync complete!", 'success');
        } catch (error) {
            console.error(error);
            addToast("Failed to sync lips.", 'error');
            handleShotChange(shot.id, 'syncStatus', 'unsynced');
        }
    };

    const getTransitionIcon = (type: TransitionType) => {
        switch (type) {
            case 'crossfade': return 'shuffle';
            case 'wipe_left': return 'arrow-right';
            case 'fade_black': return 'circle-filled';
            default: return 'scissors'; // cut
        }
    };

    const characterOptions = [
        { value: '', label: 'No Specific Actor' },
        ...savedCharacters.map(c => ({ value: c.id, label: c.name }))
    ];

    const locationOptions = [
        { value: '', label: 'Global Setting (Default)' },
        ...locations.map(l => ({ value: l.id, label: l.name }))
    ];

    const hasPlayableVideos = shots.some(s => s.generatedVideoUrl);

    // Calculate progress for the global bar
    const totalRenderableShots = shots.filter(s => s.type !== 'title').length;
    const completedShotsCount = shots.filter(s => s.type !== 'title' && s.generatedVideoUrl).length;
    const progressPercent = totalRenderableShots > 0 ? (completedShotsCount / totalRenderableShots) * 100 : 0;

    if (!isOpen) return null;

    return (
        <>
            <div 
                className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[80] p-4"
                onClick={onClose}
                role="dialog"
                aria-modal="true"
            >
                <div 
                    className="bg-slate-900/80 backdrop-blur-xl w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden relative"
                    onClick={e => e.stopPropagation()}
                >
                    <header className="flex flex-col p-0 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
                        {/* Status Bar for Chain */}
                        {(isChaining || chainStatus === 'paused') && (
                            <div className={`w-full px-5 py-2 flex items-center justify-between text-xs font-bold ${chainStatus === 'paused' ? 'bg-red-900/30 text-red-300' : 'bg-cyan-900/30 text-cyan-300'}`}>
                                <div className="flex items-center gap-3">
                                    {chainStatus === 'paused' ? (
                                        <Icon name="alert-triangle" className="w-4 h-4 animate-pulse" />
                                    ) : (
                                        <Icon name="spinner" className="w-4 h-4 animate-spin" />
                                    )}
                                    <span>
                                        {chainStatus === 'paused' ? `PAUSED: ${progressMessage}` : progressMessage}
                                    </span>
                                </div>
                                {chainStatus === 'paused' ? (
                                    <button onClick={startChain} className="underline hover:text-white">Resume Chain</button>
                                ) : (
                                    <button onClick={stopChain} className="hover:text-white">Stop</button>
                                )}
                            </div>
                        )}
                        {/* Progress Bar Line */}
                        {(isChaining || completedShotsCount > 0) && (
                            <div className="w-full h-1 bg-slate-800">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500" 
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between p-5">
                            <div>
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <Icon name="film" className="w-6 h-6 text-cyan-400" />
                                    {t.title}
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">{t.description}</p>
                            </div>
                            <div className="flex gap-3">
                                {/* Bridge Gap Button */}
                                {selectedShotIds.length === 2 && (
                                    <button
                                        onClick={handleBridgeGap}
                                        disabled={isBridging}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-900/20"
                                        title="AI generate intermediate scenes to connect selected shots"
                                    >
                                        {isBridging ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name="magic" className="w-4 h-4" />}
                                        Bridge Gap
                                    </button>
                                )}

                                <button
                                    onClick={() => setIsTableReadOpen(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/50 hover:bg-fuchsia-600/40 text-xs font-bold transition-all"
                                    title="Preview Animatic with Audio & Images"
                                >
                                    <Icon name="video" className="w-4 h-4" />
                                    Table Read
                                </button>
                                
                                {/* New Auto-Render Button */}
                                <button 
                                    onClick={startChain}
                                    disabled={isChaining || shots.length === 0}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-lg ${
                                        isChaining 
                                        ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 hover:scale-105'
                                    }`}
                                >
                                    {isChaining ? (
                                        <Icon name="spinner" className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Icon name="play" className="w-4 h-4" />
                                    )}
                                    {isChaining ? "Rendering..." : "🎬 Auto-Render Movie"}
                                </button>
                                
                                {hasPlayableVideos && (
                                    <button
                                        onClick={() => setIsPlayingMovie(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all"
                                    >
                                        <Icon name="play" className="w-4 h-4" />
                                        Play
                                    </button>
                                )}

                                <div className="w-px h-6 bg-slate-700/50 mx-1"></div>

                                <button onClick={handleExportPDF} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title={t.exportPdf}>
                                    <Icon name="download" className="w-5 h-5" />
                                </button>
                                <button onClick={handleExportEDL} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Export EDL Package">
                                    <Icon name="folder" className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={onClose}
                                    className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                >
                                    <Icon name="cancel" className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
                        
                        {/* Left Column: Inputs */}
                        <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-8 bg-slate-900/30 border-r border-slate-700/50">
                            
                            {/* Global Context */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t.globalContext}</h3>
                                    <button 
                                        onClick={() => setIsAutoBlockerOpen(true)}
                                        className="text-xs text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1"
                                    >
                                        <Icon name="magic" className="w-3 h-3" /> Auto-Block Scene
                                    </button>
                                </div>
                                <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 space-y-4">
                                    <TextAreaInput
                                        label={t.styleLabel}
                                        name="globalStyle"
                                        value={globalContext.style}
                                        onChange={(e) => setGlobalContext(prev => ({ ...prev, style: e.target.value }))}
                                        placeholder={t.stylePlaceholder}
                                        rows={1}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <TextAreaInput
                                            label={t.characterLabel}
                                            name="globalCharacter"
                                            value={globalContext.character}
                                            onChange={(e) => setGlobalContext(prev => ({ ...prev, character: e.target.value }))}
                                            placeholder={t.characterPlaceholder}
                                            rows={2}
                                        />
                                        <TextAreaInput
                                            label={t.settingLabel}
                                            name="globalSetting"
                                            value={globalContext.setting}
                                            onChange={(e) => setGlobalContext(prev => ({ ...prev, setting: e.target.value }))}
                                            placeholder={t.settingPlaceholder}
                                            rows={2}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckboxInput 
                                            id="contextualFlow"
                                            name="contextualFlow"
                                            label="Enable Contextual Flow (AI links shots narrative)"
                                            checked={isContextualFlowEnabled}
                                            onChange={(e) => setIsContextualFlowEnabled(e.target.checked)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Shot List */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t.shotList}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsImportModalOpen(true)} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors">
                                            Import Script
                                        </button>
                                        <button onClick={() => addShot('title')} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded transition-colors border border-slate-700">
                                            <Icon name="subtitles" className="w-3 h-3" /> Title Card
                                        </button>
                                        <button onClick={() => addShot('video')} className="flex items-center gap-1 text-xs bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-200 border border-cyan-800 px-3 py-1 rounded transition-colors">
                                            <Icon name="plus" className="w-3 h-3" /> {t.addShot}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {shots.map((shot, index) => {
                                        // Check if this shot is being focused by a remote user
                                        const remoteUser = activeUsers.find(u => u.focusId === shot.id);
                                        const isTitleCard = shot.type === 'title';
                                        const isProcessingThisShot = currentShotId === shot.id;
                                        const isSelected = selectedShotIds.includes(shot.id);
                                        
                                        return (
                                        <React.Fragment key={shot.id}>
                                            {/* Transition & Link Node */}
                                            {index > 0 && (
                                                <div className="flex justify-center items-center py-2 relative group/transition">
                                                    <div className="h-full w-px bg-slate-700 absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-0"></div>
                                                    <div className="z-10 flex flex-col items-center gap-2 bg-slate-900 p-1 rounded-full border border-slate-700">
                                                        <button 
                                                            onClick={() => handleCycleTransition(shots[index-1].id)}
                                                            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                                                            title={`Transition: ${shots[index-1].transitionToNext || 'Cut'}`}
                                                        >
                                                            <Icon name={getTransitionIcon(shots[index-1].transitionToNext || 'cut')} className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="absolute left-8 flex items-center">
                                                        <CheckboxInput 
                                                            id={`link-${shot.id}`}
                                                            name={`link-${shot.id}`}
                                                            label="Visual Link"
                                                            checked={shot.visualLink || false}
                                                            onChange={(e) => handleShotChange(shot.id, 'visualLink', e.target.checked)}
                                                            tooltipText="Use end frame of previous shot as start frame for this shot."
                                                            disabled={isTitleCard} // Title cards are synthetic, no visual link input
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div 
                                                className={`relative p-4 rounded-lg border transition-all duration-300 group animate-fade-in-up ${
                                                    isTitleCard ? 'bg-slate-800/40 border-slate-600' : 'bg-slate-800/20 border-slate-700'
                                                } ${isProcessingThisShot ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/10' : ''} ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/50 shadow-md shadow-indigo-500/20' : ''}`}
                                                style={remoteUser ? { borderColor: remoteUser.color, boxShadow: `0 0 10px ${remoteUser.color}40` } : {}}
                                                onFocus={() => updateFocus(shot.id)}
                                                onBlur={() => updateFocus(null)}
                                            >
                                                {/* Collaborative User Tag */}
                                                {remoteUser && (
                                                    <div 
                                                        className="absolute -top-3 -right-3 px-2 py-1 rounded-full text-[10px] text-white font-bold shadow-lg z-20"
                                                        style={{ backgroundColor: remoteUser.color }}
                                                    >
                                                        {remoteUser.name} is editing
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-2">
                                                        {/* Selection Checkbox */}
                                                        <button
                                                            onClick={() => handleSelectionToggle(shot.id)}
                                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-600 hover:border-slate-400'}`}
                                                            title="Select for bridging or multi-edit"
                                                        >
                                                            {isSelected && <Icon name="check" className="w-3 h-3" />}
                                                        </button>

                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isTitleCard ? 'bg-slate-600 text-slate-200' : 'bg-slate-700 text-slate-300'}`}>
                                                            {isTitleCard ? 'TITLE CARD' : `${t.shot} ${index + 1}`}
                                                        </span>
                                                        {shot.duration && (
                                                            <div className="flex items-center gap-1 text-[10px] bg-slate-900/50 text-slate-300 px-2 py-0.5 rounded border border-slate-600/50">
                                                                <span>⏱ {shot.duration}s</span>
                                                            </div>
                                                        )}
                                                        {isProcessingThisShot && (
                                                            <span className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-900/20 px-2 py-0.5 rounded border border-cyan-500/20 animate-pulse">
                                                                <Icon name="spinner" className="w-3 h-3 animate-spin" />
                                                                {currentStep === 'audio' && "Audio"}
                                                                {currentStep === 'image' && "Image"}
                                                                {currentStep === 'video' && "Video"}
                                                            </span>
                                                        )}
                                                        {shot.generatedVideoUrl && !isProcessingThisShot && (
                                                            <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-500/20">
                                                                <Icon name="check" className="w-3 h-3" /> Rendered
                                                            </span>
                                                        )}
                                                        {shot.colorGrade && (
                                                            <span className="flex items-center gap-1 text-[10px] text-fuchsia-300 bg-fuchsia-900/20 px-2 py-0.5 rounded border border-fuchsia-500/20">
                                                                🎨 Graded
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {shot.takes && shot.takes.length > 1 && (
                                                            <div className="flex items-center bg-slate-900 rounded-md border border-slate-700 mr-2">
                                                                <button onClick={() => cycleTake(shot.id, 'prev')} className="p-1 hover:bg-slate-800"><Icon name="chevron-down" className="w-3 h-3 rotate-90" /></button>
                                                                <span className="text-[10px] px-2 font-mono text-slate-400">{(shot.selectedTakeIndex ?? 0) + 1}/{shot.takes.length}</span>
                                                                <button onClick={() => cycleTake(shot.id, 'next')} className="p-1 hover:bg-slate-800"><Icon name="chevron-down" className="w-3 h-3 -rotate-90" /></button>
                                                            </div>
                                                        )}
                                                        <button onClick={() => handleDeleteShot(shot.id)} className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                                            <Icon name="trash" className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Concept Image Preview */}
                                                {!isTitleCard && shot.conceptImageUrl && (
                                                    <div className="mb-4 relative rounded-lg overflow-hidden border border-slate-700 group/image h-32 w-full">
                                                        <img src={shot.conceptImageUrl} alt="Concept" className="w-full h-full object-cover" />
                                                        
                                                        {/* Image Action Buttons */}
                                                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => setOutpaintingShotId(shot.id)}
                                                                className="bg-black/60 hover:bg-cyan-600 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1"
                                                                title="Expand Frame (Outpaint)"
                                                            >
                                                                <Icon name="expand" className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                onClick={() => setInpaintingShotId(shot.id)}
                                                                className="bg-black/60 hover:bg-fuchsia-600 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1"
                                                                title="Fix/Inpaint"
                                                            >
                                                                <Icon name="magic" className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {isTitleCard ? (
                                                    // --- Title Card Editor ---
                                                    <div className="space-y-4">
                                                        <TextAreaInput
                                                            label="Title Text"
                                                            name={`title-${shot.id}`}
                                                            value={shot.titleConfig?.text || ''}
                                                            onChange={(e) => handleShotChange(shot.id, 'titleConfig', { ...shot.titleConfig, text: e.target.value })}
                                                            placeholder="ENTER TEXT"
                                                            rows={1}
                                                        />
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-400 block mb-1">Background</label>
                                                                <div className="flex items-center gap-2">
                                                                    <input 
                                                                        type="color" 
                                                                        value={shot.titleConfig?.background || '#000000'}
                                                                        onChange={(e) => handleShotChange(shot.id, 'titleConfig', { ...shot.titleConfig, background: e.target.value })}
                                                                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                                                    />
                                                                    <span className="text-xs text-slate-300 font-mono">{shot.titleConfig?.background}</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-400 block mb-1">Text Color</label>
                                                                <div className="flex items-center gap-2">
                                                                    <input 
                                                                        type="color" 
                                                                        value={shot.titleConfig?.color || '#ffffff'}
                                                                        onChange={(e) => handleShotChange(shot.id, 'titleConfig', { ...shot.titleConfig, color: e.target.value })}
                                                                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                                                                    />
                                                                    <span className="text-xs text-slate-300 font-mono">{shot.titleConfig?.color}</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-400 block mb-1">Duration (s)</label>
                                                                <input 
                                                                    type="number" 
                                                                    min="1" 
                                                                    max="10" 
                                                                    value={shot.duration || 3}
                                                                    onChange={(e) => handleShotChange(shot.id, 'duration', parseInt(e.target.value))}
                                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200"
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        <button 
                                                            onClick={() => handleRenderTitleShot(shot)}
                                                            disabled={isRenderingTitle[shot.id]}
                                                            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded flex items-center justify-center gap-2"
                                                        >
                                                            {isRenderingTitle[shot.id] ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="video" className="w-3 h-3" />}
                                                            Render Title Card
                                                        </button>
                                                    </div>
                                                ) : (
                                                    // --- Standard Video Shot Editor ---
                                                    <div className="mt-2 grid grid-cols-1 gap-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <SelectInput
                                                                label="Actor"
                                                                name={`shot-${shot.id}-char`}
                                                                options={characterOptions}
                                                                value={shot.characterId || ''}
                                                                onChange={(e) => handleShotChange(shot.id, 'characterId', e.target.value)}
                                                            />
                                                            <SelectInput
                                                                label="Location"
                                                                name={`shot-${shot.id}-loc`}
                                                                options={locationOptions}
                                                                value={shot.locationId || ''}
                                                                onChange={(e) => handleShotChange(shot.id, 'locationId', e.target.value)}
                                                            />
                                                        </div>
                                                        
                                                        <TextAreaInput
                                                            label={t.actionLabel}
                                                            name={`shot-${shot.id}-action`}
                                                            value={shot.action}
                                                            onChange={(e) => handleShotChange(shot.id, 'action', e.target.value)}
                                                            placeholder={t.actionPlaceholder}
                                                            rows={2}
                                                            disabled={isChaining}
                                                            onEnhance={() => handleEnhanceShotAction(shot.id, shot.action)}
                                                            isEnhancing={isEnhancingShot[shot.id]}
                                                        />
                                                        
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-grow">
                                                                <TextAreaInput
                                                                    label={t.cameraLabel}
                                                                    name={`shot-${shot.id}-camera`}
                                                                    value={shot.camera}
                                                                    onChange={(e) => handleShotChange(shot.id, 'camera', e.target.value)}
                                                                    placeholder={t.cameraPlaceholder}
                                                                    rows={1}
                                                                    disabled={isChaining}
                                                                    actionButton={
                                                                        <button 
                                                                            onClick={() => handlePlotCamera(shot.id)}
                                                                            className="p-1 text-slate-400 hover:text-fuchsia-400 transition-colors"
                                                                            title="Open Camera Plotter"
                                                                        >
                                                                            <Icon name="pencil" className="w-4 h-4" />
                                                                        </button>
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="flex items-center pt-6">
                                                                <CheckboxInput
                                                                    id={`shot-${shot.id}-greenscreen`}
                                                                    name="greenScreen"
                                                                    label="Green Screen"
                                                                    checked={shot.isGreenScreen || false}
                                                                    onChange={(e) => handleShotChange(shot.id, 'isGreenScreen', e.target.checked)}
                                                                    color="fuchsia"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="relative">
                                                            <TextAreaInput
                                                                label="Dialogue / Voiceover"
                                                                name={`shot-${shot.id}-dialogue`}
                                                                value={shot.dialogueText || ''}
                                                                onChange={(e) => {
                                                                    handleShotChange(shot.id, 'dialogueText', e.target.value);
                                                                }}
                                                                placeholder="Spoken text..."
                                                                rows={1}
                                                                disabled={isChaining}
                                                                actionButton={
                                                                    <div className="flex gap-1">
                                                                         <button
                                                                            onClick={() => setDoctorShotId(doctorShotId === shot.id ? null : shot.id)}
                                                                            className="text-[10px] bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded text-white flex items-center gap-1 transition-colors"
                                                                            title="AI Script Doctor"
                                                                        >
                                                                            <Icon name="magic" className="w-3 h-3" /> Doctor
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleSuggestBRoll(shot)}
                                                                            className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
                                                                            disabled={isAnalyzingBRoll[shot.id]}
                                                                        >
                                                                            {isAnalyzingBRoll[shot.id] ? "..." : "B-Roll"}
                                                                        </button>
                                                                    </div>
                                                                }
                                                            />
                                                            {doctorShotId === shot.id && (
                                                                <div className="absolute z-20 mt-1 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 w-48 animate-fade-in-up">
                                                                    <div className="flex justify-between items-center mb-2 px-1">
                                                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase">Script Doctor</h4>
                                                                        <button onClick={() => setDoctorShotId(null)} className="text-slate-500 hover:text-white"><Icon name="cancel" className="w-3 h-3" /></button>
                                                                    </div>
                                                                    <div className="grid gap-1">
                                                                        {['Witty', 'Dramatic', 'Subtext-heavy', 'Shorten'].map(tone => (
                                                                            <button
                                                                                key={tone}
                                                                                onClick={() => handleScriptDoctor(shot, tone)}
                                                                                disabled={isDoctoring}
                                                                                className="text-left text-xs px-2 py-1.5 rounded hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-300 transition-colors flex items-center justify-between group"
                                                                            >
                                                                                <span>{tone}</span>
                                                                                {isDoctoring && <Icon name="spinner" className="w-3 h-3 animate-spin opacity-0 group-hover:opacity-100" />}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* B-Roll Suggestions Panel */}
                                                        {bRollSuggestions[shot.id] && (
                                                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 animate-fade-in-up">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <h4 className="text-xs font-bold text-slate-400 uppercase">B-Roll Ideas</h4>
                                                                    <button onClick={() => setBRollSuggestions(prev => { const n = {...prev}; delete n[shot.id]; return n; })} className="text-slate-500 hover:text-white"><Icon name="cancel" className="w-3 h-3" /></button>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {bRollSuggestions[shot.id].map((sug, i) => (
                                                                        <button 
                                                                            key={i}
                                                                            onClick={() => handleInsertBRoll(index, sug)}
                                                                            className="text-xs bg-slate-800 hover:bg-cyan-900/30 text-cyan-200 border border-slate-600 hover:border-cyan-500/50 px-2 py-1 rounded transition-colors"
                                                                            title={sug.description}
                                                                        >
                                                                            + {sug.keyword}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Media Controls */}
                                                        <div className="flex flex-wrap gap-2">
                                                            <button 
                                                                onClick={() => handleGenerateConcept(shot)}
                                                                disabled={isGeneratingConcept[shot.id] || isChaining}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
                                                            >
                                                                {isGeneratingConcept[shot.id] ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="image" className="w-3 h-3" />}
                                                                <span>Concept</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => setWhiteboardShotId(shot.id)}
                                                                disabled={isChaining || isProcessingSketch[shot.id]}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
                                                            >
                                                                {isProcessingSketch[shot.id] ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="pencil" className="w-3 h-3" />}
                                                                <span>Sketch</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => setTextEditorShotId(shot.id)}
                                                                disabled={isChaining}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
                                                            >
                                                                <Icon name="subtitles" className="w-3 h-3" />
                                                                <span>Titles</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => setColorMatchTargetId(shot.id)}
                                                                disabled={isChaining}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
                                                                title="Match color grade to another shot"
                                                            >
                                                                <Icon name="palette" className="w-3 h-3" />
                                                                <span>Match Color</span>
                                                            </button>

                                                            <div className="flex-grow"></div>

                                                            {/* Audio Controls */}
                                                            <div className="p-1 rounded-lg border border-slate-700 bg-slate-900/30 flex items-center gap-2">
                                                                <label className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-700 cursor-pointer text-xs font-medium text-slate-300 transition-colors">
                                                                    <Icon name="upload" className="w-3 h-3" />
                                                                    <span>Upload</span>
                                                                    <input 
                                                                        type="file" 
                                                                        accept="audio/*" 
                                                                        className="hidden" 
                                                                        onChange={(e) => handleAudioUpload(e, shot.id)}
                                                                        disabled={isChaining}
                                                                    />
                                                                </label>
                                                                <button 
                                                                    onClick={() => setRecordingShotId(shot.id)}
                                                                    disabled={isChaining}
                                                                    className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md hover:bg-red-900/30 text-xs font-medium text-red-300 transition-colors disabled:opacity-50"
                                                                    title="Record Voice-Over"
                                                                >
                                                                    <Icon name="audio" className="w-3 h-3" />
                                                                    <span>Record</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleGenerateTTS(shot)}
                                                                    disabled={isGeneratingTTS === shot.id || isChaining}
                                                                    className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
                                                                >
                                                                    {isGeneratingTTS === shot.id ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="magic" className="w-3 h-3" />}
                                                                    <span>TTS</span>
                                                                </button>
                                                                
                                                                {/* Lip Sync Button */}
                                                                <button 
                                                                    onClick={() => handleLipSync(shot)}
                                                                    disabled={!shot.generatedVideoUrl || !shot.audioUrl || shot.syncStatus === 'processing'}
                                                                    className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                                                        shot.syncStatus === 'synced' 
                                                                        ? 'text-fuchsia-300 bg-fuchsia-900/30 hover:bg-fuchsia-900/50' 
                                                                        : 'text-slate-300 hover:bg-slate-700'
                                                                    }`}
                                                                    title="Sync Character Lips to Audio"
                                                                >
                                                                    {shot.syncStatus === 'processing' ? (
                                                                        <Icon name="spinner" className="w-3 h-3 animate-spin" />
                                                                    ) : shot.syncStatus === 'synced' ? (
                                                                        <Icon name="smile" className="w-3 h-3" />
                                                                    ) : (
                                                                        <Icon name="activity" className="w-3 h-3" />
                                                                    )}
                                                                    <span>Sync Lips</span>
                                                                </button>

                                                                {shot.generatedVideoUrl && (
                                                                    <button 
                                                                        onClick={() => handleAutoFoley(shot)}
                                                                        disabled={isAutoFoleyRunning === shot.id}
                                                                        className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md hover:bg-purple-900/30 text-xs font-medium text-purple-300 transition-colors disabled:opacity-50"
                                                                        title="Auto-Generate Sound Effects from Video"
                                                                    >
                                                                        {isAutoFoleyRunning === shot.id ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="music" className="w-3 h-3" />}
                                                                        <span>Auto-Foley</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Auto-Critique Status */}
                                                        {shot.critique && (
                                                            <div className={`mt-2 p-2 rounded text-xs border ${shot.critique.score >= 7 ? 'bg-green-900/20 border-green-500/30 text-green-300' : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300'}`}>
                                                                <span className="font-bold mr-2">Score: {shot.critique.score}/10</span>
                                                                {shot.critique.feedback}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </React.Fragment>
                                    )})}
                                </div>
                            </div>
                            
                            <div className="pt-4">
                                <button onClick={handleBatchGenerate} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                                    {isGenerating ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="sparkles" className="w-5 h-5" />}
                                    {t.batchGenerate}
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Results */}
                        <div className="flex-1 flex flex-col p-6 bg-slate-950/20 min-h-[400px]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t.resultsTitle}</h3>
                                {generatedPrompts.length > 0 && (
                                    <button onClick={handleCopyAll} className="text-xs text-cyan-400 hover:text-cyan-300">
                                        {t.copyAll}
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex-grow overflow-y-auto space-y-4">
                                {generatedPrompts.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                        <Icon name="film" className="w-16 h-16 opacity-20 mb-4" />
                                        <p>{isGenerating ? t.generating : "Define shots and click generate."}</p>
                                    </div>
                                ) : (
                                    generatedPrompts.map((prompt, index) => (
                                        <div key={index} className="bg-slate-800/40 p-4 rounded-lg border border-slate-700 animate-fade-in-up">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-xs font-bold text-cyan-400">Shot {index + 1}</h4>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(prompt);
                                                        addToast("Copied to clipboard", 'success');
                                                    }}
                                                    className="text-slate-500 hover:text-white"
                                                >
                                                    <Icon name="copy" className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-slate-300 whitespace-pre-wrap">{prompt}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Modals */}
                    {colorMatchTargetId !== null && (
                        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[130] p-4">
                            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl animate-fade-in-up">
                                <header className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                        <Icon name="palette" className="w-5 h-5 text-fuchsia-400" />
                                        Select Reference Shot
                                    </h3>
                                    <button onClick={() => setColorMatchTargetId(null)} className="text-slate-400 hover:text-white">
                                        <Icon name="cancel" className="w-5 h-5" />
                                    </button>
                                </header>
                                <p className="text-sm text-slate-400 mb-4">
                                    Choose a shot to use as the visual reference for color grading. Shot #{colorMatchTargetId} will be adjusted to match.
                                </p>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {shots.filter(s => s.id !== colorMatchTargetId && (s.generatedVideoUrl || s.conceptImageUrl) && s.type !== 'title').map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => handleColorMatch(s.id)}
                                            disabled={isColorMatching}
                                            className="w-full flex items-center p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-fuchsia-500/50 transition-all text-left group"
                                        >
                                            <div className="w-12 h-8 bg-black rounded overflow-hidden mr-3 flex-shrink-0">
                                                {(s.generatedVideoUrl || s.conceptImageUrl) ? (
                                                    s.generatedVideoUrl ? (
                                                        <video src={s.generatedVideoUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <img src={s.conceptImageUrl} className="w-full h-full object-cover" alt="" />
                                                    )
                                                ) : null}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-200 group-hover:text-white">Shot #{s.id}</div>
                                                <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{s.action}</div>
                                            </div>
                                            {isColorMatching && <Icon name="spinner" className="w-4 h-4 ml-auto animate-spin text-fuchsia-400" />}
                                        </button>
                                    ))}
                                    {shots.filter(s => s.id !== colorMatchTargetId && (s.generatedVideoUrl || s.conceptImageUrl)).length === 0 && (
                                        <div className="text-center text-slate-500 py-4 text-xs italic">
                                            No other shots with visuals available.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {isImportModalOpen && (
                        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[90] p-4">
                            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                                <h3 className="text-lg font-bold text-slate-100 mb-4">Import Script</h3>
                                <TextAreaInput 
                                    label="Paste Script Here"
                                    name="scriptImport"
                                    value={scriptText}
                                    onChange={(e) => setScriptText(e.target.value)}
                                    placeholder="INT. KITCHEN - DAY..."
                                    rows={8}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-3 mt-4">
                                    <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                                    <button 
                                        onClick={handleParseScript}
                                        disabled={!scriptText.trim() || isParsingScript}
                                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isParsingScript ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name="magic" className="w-4 h-4" />}
                                        Parse Scenes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <ScriptImportReviewModal
                        isOpen={isReviewingImport}
                        onClose={() => setIsReviewingImport(false)}
                        initialShots={pendingImportShots}
                        characterOptions={characterOptions}
                        locationOptions={locationOptions}
                        onImport={handleConfirmImport}
                    />

                    <AutoBlockerModal
                        isOpen={isAutoBlockerOpen}
                        onClose={() => setIsAutoBlockerOpen(false)}
                        savedCharacters={savedCharacters}
                        onGenerate={(newShots) => {
                            const currentMaxId = shots.length > 0 ? Math.max(...shots.map(s => s.id)) : 0;
                            const shotsToAdd = newShots.map((s, i) => ({ ...s, id: currentMaxId + i + 1 } as Shot));
                            setShots([...shots, ...shotsToAdd]);
                            addToast(`Added ${newShots.length} shots from template`, 'success');
                        }}
                        uiStrings={uiStrings}
                    />

                    {/* Camera Plotter Modal */}
                    <CameraPlotterModal
                        isOpen={plottingShotId !== null}
                        onClose={() => setPlottingShotId(null)}
                        conceptImageUrl={shots.find(s => s.id === plottingShotId)?.conceptImageUrl}
                        onApply={handlePlotApply}
                        addToast={addToast}
                        uiStrings={uiStrings}
                    />

                    {/* Whiteboard Modal */}
                    <WhiteboardModal
                        isOpen={whiteboardShotId !== null}
                        onClose={() => setWhiteboardShotId(null)}
                        onGeneratePreview={handleGenerateSketch}
                        initialImage={shots.find(s => s.id === whiteboardShotId)?.conceptImageUrl}
                    />

                    {/* Inpainting Modal */}
                    <InpaintingModal
                        isOpen={inpaintingShotId !== null}
                        onClose={() => setInpaintingShotId(null)}
                        imageUrl={shots.find(s => s.id === inpaintingShotId)?.conceptImageUrl || ''}
                        onGenerate={handleInpaintComplete}
                    />

                    {/* Outpainting Modal (Generative Canvas) */}
                    <GenerativeCanvasModal
                        isOpen={outpaintingShotId !== null}
                        onClose={() => setOutpaintingShotId(null)}
                        conceptImageUrl={shots.find(s => s.id === outpaintingShotId)?.conceptImageUrl || ''}
                        onGenerateFill={handleOutpaintComplete}
                    />

                    {/* Recording Booth Modal */}
                    <RecordingBoothModal
                        isOpen={recordingShotId !== null}
                        onClose={() => setRecordingShotId(null)}
                        scriptText={recordingShotId !== null ? (shots.find(s => s.id === recordingShotId)?.dialogueText || shots.find(s => s.id === recordingShotId)?.action || '') : ''}
                        onSave={handleSaveRecording}
                    />

                    {/* Text & Titles Editor */}
                    {textEditorShotId !== null && (
                        <TitleEditorModal 
                            isOpen={textEditorShotId !== null}
                            onClose={() => setTextEditorShotId(null)}
                            shot={shots.find(s => s.id === textEditorShotId)!}
                            onSave={handleSaveOverlays}
                        />
                    )}
                </div>
            </div>
            
            {/* Timeline Player Modal */}
            {isPlayingMovie && (
                <TimelinePlayer 
                    shots={shots} 
                    onClose={() => setIsPlayingMovie(false)}
                    bgMusicUrl={backgroundMusicUrl}
                />
            )}

            {/* Table Read Player */}
            {isTableReadOpen && (
                <TableReadPlayer 
                    shots={shots}
                    savedCharacters={savedCharacters}
                    onClose={() => setIsTableReadOpen(false)}
                />
            )}
        </>
    );
};

export default StoryBoard;
