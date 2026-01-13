
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
import CheckboxInput from './CheckboxInput';
import { CHARACTER_LIMITS } from '../constants';
import { ToastMessage, CharacterProfile, Shot, GlobalContext, GenerationTask, SFXEvent, TransitionType, LocationProfile } from '../types';
import { generateShotList } from '../utils/pdfExport';
import { buildShotPrompt } from '../services/promptBuilder';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import TimelinePlayer from './TimelinePlayer';
import { useSequentialGeneration } from '../hooks/useSequentialGeneration';
import { createWavHeader } from '../utils/audio';
import { generateEDL } from '../utils/edlExport';
import JSZip from 'jszip';
import { useAppStore } from '../store/useAppStore';
import { useHotkeys } from '../hooks/useHotkeys';
import AutoBlockerModal from './AutoBlockerModal';
import { useLocationStore } from '../store/useLocationStore';
import CameraPlotterModal from './CameraPlotterModal';
import WhiteboardModal from './WhiteboardModal';

interface StoryBoardProps {
    isOpen: boolean;
    onClose: () => void;
    uiStrings: any;
    addToast: (message: string, type: ToastMessage['type']) => void;
    onGenerateBatch?: (prompts: string[]) => void;
    savedCharacters?: CharacterProfile[];
    // Removed lifted state props in favor of store
    // Video Generation Hooks passed down
    videoTasks?: GenerationTask[];
    startVideoGeneration?: (prompt: string, settings: any, image?: any) => Promise<string>;
}

interface BRollSuggestion {
    keyword: string;
    description: string;
}

const StoryBoard: React.FC<StoryBoardProps> = ({ 
    isOpen, onClose, uiStrings, addToast, onGenerateBatch, savedCharacters = [],
    videoTasks = [], startVideoGeneration
}) => {
    const t = uiStrings.storyBoard;
    
    // Connect to Zustand Store
    const { 
        sbGlobalContext: globalContext, 
        setSbGlobalContext: setGlobalContext, 
        sbShots: shots, 
        setSbShots: setShots,
        addShot,
        deleteShot,
        updateShot: handleShotChange,
        promptState 
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
    
    // Auto Blocker State
    const [isAutoBlockerOpen, setIsAutoBlockerOpen] = useState(false);

    // Camera Plotter State
    const [plottingShotId, setPlottingShotId] = useState<number | null>(null);

    // Whiteboard State
    const [whiteboardShotId, setWhiteboardShotId] = useState<number | null>(null);
    const [isProcessingSketch, setIsProcessingSketch] = useState<Record<number, boolean>>({});

    // Contextual Flow State
    const [isContextualFlowEnabled, setIsContextualFlowEnabled] = useState(true);

    // Timeline Player State
    const [isPlayingMovie, setIsPlayingMovie] = useState(false);

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

    // Sequential Generation Hook
    const { isSequencing, startSequence, stopSequence, currentShotIndex } = useSequentialGeneration({
        shots,
        setShots, // Store setter works here too
        tasks: videoTasks,
        startGeneration: startVideoGeneration || (async () => ""), // Fallback if not provided
        addToast
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Escape handling for sub-modals
            if (e.key === 'Escape') {
                if (isImportModalOpen) {
                    e.stopPropagation();
                    setIsImportModalOpen(false);
                }
                else if (isPlayingMovie) {
                    e.stopPropagation();
                    setIsPlayingMovie(false);
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
                else if (isOpen) {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isImportModalOpen, isPlayingMovie, isAutoBlockerOpen, plottingShotId, whiteboardShotId, isOpen]);

    // Auto-Critique Logic
    useEffect(() => {
        shots.forEach(shot => {
            // Check if video exists, no critique yet, and not currently processing
            if (shot.generatedVideoUrl && !shot.critique && !critiqueStatus[shot.id]) {
                triggerCritique(shot);
            }
        });
    }, [shots]); // Depend on shots. If generatedVideoUrl changes (or critique is cleared), it triggers.

    const triggerCritique = async (shot: Shot) => {
        // Guard to prevent double-firing if effect runs multiple times quickly
        if (critiqueStatus[shot.id]) return;
        
        setCritiqueStatus(prev => ({ ...prev, [shot.id]: true }));
        
        try {
            const charProfile = savedCharacters.find(c => c.id === shot.characterId);
            const locProfile = locations.find(l => l.id === shot.locationId);
            const promptText = buildShotPrompt(globalContext, shot, charProfile, locProfile);
            
            const result = await geminiService.critiqueVideo(shot.generatedVideoUrl!, promptText);
            handleShotChange(shot.id, 'critique', result);
        } catch (e) {
            console.error("Critique failed", e);
            // Set a dummy critique so we don't loop forever
            handleShotChange(shot.id, 'critique', { score: 0, feedback: "Analysis unavailable." });
        } finally {
            setCritiqueStatus(prev => {
                const next = { ...prev };
                delete next[shot.id];
                return next;
            });
        }
    };

    const handleDeleteShot = (id: number) => {
        if (shots.length <= 1) {
            addToast("You need at least one shot.", 'error');
            return;
        }
        deleteShot(id);
    };

    const cycleTake = (shotId: number, direction: 'prev' | 'next') => {
        const shot = shots.find(s => s.id === shotId);
        if (!shot || !shot.takes || shot.takes.length === 0) return;
        
        const currentIndex = shot.selectedTakeIndex ?? 0;
        let newIndex;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % shot.takes.length;
        } else {
            newIndex = (currentIndex - 1 + shot.takes.length) % shot.takes.length;
        }
        
        // Update both index and the main url field for compatibility
        handleShotChange(shotId, 'selectedTakeIndex', newIndex);
        handleShotChange(shotId, 'generatedVideoUrl', shot.takes![newIndex]);
    };

    const generateAllPromptTexts = () => {
        return shots.map((shot) => {
            const characterProfile = savedCharacters.find(c => c.id === shot.characterId);
            const locProfile = locations.find(l => l.id === shot.locationId);
            return buildShotPrompt(globalContext, shot, characterProfile, locProfile);
        });
    };

    const handleBatchGenerate = async () => {
        // Basic validation
        if (!globalContext.style && !globalContext.character && !globalContext.setting) {
            addToast("Please define some global context.", 'error');
            return;
        }
        if (shots.some(s => !s.action.trim())) {
            addToast("All shots must have an action.", 'error');
            return;
        }

        setIsGenerating(true);
        
        try {
            // Use AI to refine prompts for continuity
            const refinedPrompts = await geminiService.refineStoryboardContinuity(
                shots, 
                globalContext, 
                'en', 
                'gemini-3-pro-preview',
                isContextualFlowEnabled
            );
            
            if (refinedPrompts.length > 0) {
                setGeneratedPrompts(refinedPrompts);
                addToast(t.resultsTitle + " Ready", 'success');
            } else {
                // Fallback if AI returns empty
                const localPrompts = generateAllPromptTexts();
                setGeneratedPrompts(localPrompts);
                addToast("Generated local fallback.", 'info');
            }
        } catch (error) {
            console.error(error);
            addToast("AI generation failed, using fallback.", 'error');
            // Fallback to local builder on error
            const localPrompts = generateAllPromptTexts();
            setGeneratedPrompts(localPrompts);
        } finally {
            setIsGenerating(false);
        }
    };

    // Hotkeys Integration
    useHotkeys({
        "SHIFT+N": () => {
            if(!isSequencing) addShot();
        },
        "CTRL+ENTER": () => {
            if(!isGenerating && !isSequencing) handleBatchGenerate();
        }
    }, isOpen);

    const handleCopyAll = () => {
        if (generatedPrompts.length === 0) return;
        const text = generatedPrompts.map((p, i) => `Shot ${i+1}:\n${p}`).join('\n\n');
        navigator.clipboard.writeText(text);
        addToast("All prompts copied to clipboard", 'success');
    };

    const handleRenderAllVideos = () => {
        if (generatedPrompts.length === 0) return;
        
        // If startVideoGeneration is provided (which it should be via App.tsx)
        if (startVideoGeneration) {
            const hasVisualLinks = shots.some(s => s.visualLink);
            
            if (hasVisualLinks || true) { // Defaulting to sequential for StoryBoard to allow monitoring
                startSequence(generatedPrompts);
                addToast("Starting Sequential Render...", 'info');
            } else if (onGenerateBatch) {
                // Fallback to simple batch (parallel) if explicitly not using logic
                onGenerateBatch(generatedPrompts);
                onClose(); 
            }
        } else {
            addToast("Video generation service not connected.", 'error');
        }
    };

    const handleExportPDF = () => {
        try {
            generateShotList(shots, globalContext, "Veo Storyboard", t);
            addToast("PDF Exported", 'success');
        } catch (error) {
            console.error(error);
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
        addToast("Preparing package for NLE...", 'info');

        try {
            const zip = new JSZip();
            const projectTitle = "VEO_TIMELINE";
            
            // 1. Generate EDL
            const edlContent = generateEDL(validShots, projectTitle);
            zip.file(`${projectTitle}.edl`, edlContent);

            // 2. Fetch and Rename Videos
            const fetchPromises = validShots.map(async (shot, index) => {
                if (!shot.generatedVideoUrl) return;
                try {
                    const response = await fetch(shot.generatedVideoUrl);
                    if (!response.ok) throw new Error(`Failed to fetch video for shot ${shot.id}`);
                    const blob = await response.blob();
                    const filename = `${(index + 1).toString().padStart(3, '0')}.mp4`;
                    zip.file(filename, blob);
                } catch (e) {
                    console.error(e);
                    addToast(`Failed to include video for Shot ${shot.id}`, 'error');
                }
            });

            await Promise.all(fetchPromises);

            // 3. Generate Zip
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${projectTitle}_PACK.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            addToast("Export Complete! Import EDL in Resolve/Premiere.", 'success');

        } catch (error) {
            console.error("EDL Export Error:", error);
            addToast("Failed to export EDL package.", 'error');
        } finally {
            setIsExportingEDL(false);
        }
    };
    
    const handleParseScript = async () => {
        if (!scriptText.trim()) return;
        setIsParsingScript(true);
        try {
            const parsedScenes = await geminiService.parseScriptToScenes(
                scriptText,
                savedCharacters.map(c => ({ id: c.id, name: c.name })),
                'en',
                'gemini-3-pro-preview'
            );
            
            if (parsedScenes.length > 0) {
                const currentMaxId = shots.length > 0 ? Math.max(...shots.map(s => s.id)) : 0;
                const newShots: Shot[] = parsedScenes.map((scene, idx) => ({
                    id: currentMaxId + idx + 1,
                    action: scene.action,
                    camera: scene.camera || '',
                    characterId: scene.characterId || '',
                    generatedVideoUrl: '',
                    takes: [],
                    selectedTakeIndex: 0,
                    visualLink: idx > 0 // Auto-link if importing a sequence? Maybe safer false.
                }));
                
                // Append to existing shots if they have content, otherwise replace empty starter
                if (shots.length === 1 && !shots[0].action && !shots[0].camera) {
                    setShots(newShots);
                } else {
                    setShots([...shots, ...newShots]);
                }
                
                setIsImportModalOpen(false);
                setScriptText('');
                addToast(`Imported ${newShots.length} scenes from script`, 'success');
            } else {
                addToast("Could not identify scenes in script", 'error');
            }
        } catch (error) {
            console.error(error);
            addToast("Failed to parse script", 'error');
        } finally {
            setIsParsingScript(false);
        }
    };

    const handleAutoBlockComplete = (newShotsData: Partial<Shot>[]) => {
        const currentMaxId = shots.length > 0 ? Math.max(...shots.map(s => s.id)) : 0;
        
        const newShots: Shot[] = newShotsData.map((data, idx) => ({
            id: currentMaxId + idx + 1,
            action: data.action || '',
            camera: data.camera || '',
            characterId: data.characterId || '',
            visualLink: data.visualLink || false,
            generatedVideoUrl: '',
            takes: [],
            selectedTakeIndex: 0,
            dialogueText: ''
        }));

        if (shots.length === 1 && !shots[0].action && !shots[0].camera) {
            setShots(newShots);
        } else {
            setShots([...shots, ...newShots]);
        }
        addToast(`Added ${newShots.length} shots from Auto-Blocker.`, 'success');
    };

    const handleGenerateTTS = async (shot: Shot) => {
        // Use dialogue text if available, fallback to action
        const defaultText = shot.dialogueText || shot.action;
        const text = prompt(`Enter text for TTS:`, defaultText);
        if (text === null) return;
        const promptText = text.trim();
        
        if (!promptText) return;

        setIsGeneratingTTS(shot.id);
        try {
            const base64Audio = await geminiService.generateSpeech(promptText);
            const byteCharacters = atob(base64Audio);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const wavHeader = createWavHeader(byteArray.length, 24000, 1, 16);
            const wavBlob = new Blob([wavHeader, byteArray], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(wavBlob);
            
            handleShotChange(shot.id, 'audioUrl', audioUrl);
            
            // If we generated TTS from something, it's likely dialogue, so save it
            if (!shot.dialogueText) {
                handleShotChange(shot.id, 'dialogueText', promptText);
            }
            
            addToast("TTS Audio Generated", 'success');

        } catch (error) {
            addToast("Failed to generate speech", 'error');
        } finally {
            setIsGeneratingTTS(null);
        }
    };

    const handleGenerateConcept = async (shot: Shot) => {
        const charProfile = savedCharacters.find(c => c.id === shot.characterId);
        const locProfile = locations.find(l => l.id === shot.locationId);
        const promptText = buildShotPrompt(globalContext, shot, charProfile, locProfile);
        
        if (!promptText.trim()) {
            addToast("Please define shot action first.", 'error');
            return;
        }

        setIsGeneratingConcept(prev => ({ ...prev, [shot.id]: true }));
        try {
            const imageUrl = await geminiService.generateConceptImage(promptText);
            if (imageUrl) {
                handleShotChange(shot.id, 'conceptImageUrl', imageUrl);
                addToast("Concept image generated!", 'success');
            } else {
                addToast("Failed to generate image.", 'error');
            }
        } catch (error) {
            console.error(error);
            addToast("Failed to generate image.", 'error');
        } finally {
            setIsGeneratingConcept(prev => ({ ...prev, [shot.id]: false }));
        }
    };

    const handleGenerateSketch = async (base64Sketch: string) => {
        if (whiteboardShotId === null) return;
        const shot = shots.find(s => s.id === whiteboardShotId);
        if (!shot) return;

        setIsProcessingSketch(prev => ({ ...prev, [whiteboardShotId]: true }));
        setWhiteboardShotId(null); // Close modal, processing happens in bg

        try {
            const charProfile = savedCharacters.find(c => c.id === shot.characterId);
            const locProfile = locations.find(l => l.id === shot.locationId);
            const promptText = buildShotPrompt(globalContext, shot, charProfile, locProfile);

            if (!promptText.trim()) {
                addToast("Please define shot action before sketching.", 'error');
                return;
            }

            addToast("Rendering realistic layout from sketch...", 'info');
            const imageUrl = await geminiService.turnSketchToImage(base64Sketch, promptText);
            
            if (imageUrl) {
                handleShotChange(shot.id, 'conceptImageUrl', imageUrl);
                addToast("Sketch rendered!", 'success');
            } else {
                addToast("Failed to render sketch.", 'error');
            }
        } catch (error) {
            console.error(error);
            addToast("Sketch rendering failed.", 'error');
        } finally {
            if (whiteboardShotId !== null) { // Check if still relevant
                 setIsProcessingSketch(prev => ({ ...prev, [whiteboardShotId]: false }));
            }
        }
    };

    const handleAutoFoley = async (shot: Shot) => {
        if (!shot.generatedVideoUrl) {
            addToast("Please generate or attach a video first.", 'error');
            return;
        }

        setIsAutoFoleyRunning(shot.id);
        try {
            addToast("Analyzing visual events...", 'info');
            const events = await geminiService.analyzeVideoForSFX(shot.generatedVideoUrl);
            
            if (events.length === 0) {
                addToast("No distinct audio events found.", 'info');
                setIsAutoFoleyRunning(null);
                return;
            }

            const processedEvents: SFXEvent[] = [];
            addToast(`Generating ${events.length} sound effects...`, 'info');
            
            for (const event of events) {
                const rawAudio = await geminiService.generateSoundEffect(event.description);
                if (rawAudio) {
                    const byteCharacters = atob(rawAudio);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const wavHeader = createWavHeader(byteArray.length, 24000, 1, 16);
                    const wavBlob = new Blob([wavHeader, byteArray], { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(wavBlob);

                    processedEvents.push({
                        id: Date.now() + Math.random().toString(),
                        timestamp: event.timestamp,
                        description: event.description,
                        audioUrl: audioUrl
                    });
                }
            }

            handleShotChange(shot.id, 'sfx', processedEvents);
            addToast(`Added ${processedEvents.length} SFX tracks!`, 'success');

        } catch (error) {
            console.error(error);
            addToast("Auto-Foley failed.", 'error');
        } finally {
            setIsAutoFoleyRunning(null);
        }
    };

    const handleSuggestBRoll = async (shot: Shot) => {
        if (!shot.dialogueText) {
            addToast("Add dialogue text to analyze.", 'error');
            return;
        }
        
        setIsAnalyzingBRoll(prev => ({ ...prev, [shot.id]: true }));
        try {
            const suggestions = await geminiService.suggestBRoll(shot.dialogueText, 'en');
            setBRollSuggestions(prev => ({ ...prev, [shot.id]: suggestions }));
            addToast(`Found ${suggestions.length} B-Roll ideas.`, 'success');
        } catch (error) {
            console.error(error);
            addToast("Failed to suggest B-Roll.", 'error');
        } finally {
            setIsAnalyzingBRoll(prev => ({ ...prev, [shot.id]: false }));
        }
    };

    const handleInsertBRoll = (originalShotIndex: number, suggestion: BRollSuggestion) => {
        const currentMaxId = shots.length > 0 ? Math.max(...shots.map(s => s.id)) : 0;
        
        const newShot: Shot = {
            id: currentMaxId + 1,
            action: `${suggestion.description} (Duration: ~2s)`,
            camera: 'Close-up Insert Shot',
            characterId: '', // Usually B-Roll is generic/object based
            generatedVideoUrl: '',
            takes: [],
            selectedTakeIndex: 0,
            visualLink: false, // Don't strict link B-Roll usually
        };

        const newShots = [...shots];
        // Insert after the current shot
        newShots.splice(originalShotIndex + 1, 0, newShot);
        
        setShots(newShots);
        addToast(`Inserted B-Roll: ${suggestion.keyword}`, 'success');
        
        // Clear suggestions for that shot to clean up UI
        setBRollSuggestions(prev => {
            const next = { ...prev };
            delete next[shots[originalShotIndex].id];
            return next;
        });
    };

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, shotId: number) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            handleShotChange(shotId, 'audioUrl', url);
            addToast("Audio track attached.", 'success');
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

    const handlePlotCamera = (shotId: number) => {
        setPlottingShotId(shotId);
    };

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
                    {/* Header */}
                    <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
                        <div>
                            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                <Icon name="film" className="w-6 h-6 text-cyan-400" />
                                {t.title}
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">{t.description}</p>
                        </div>
                        <div className="flex gap-3">
                            {isSequencing && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg text-yellow-200 text-xs font-bold animate-pulse">
                                    <Icon name="spinner" className="w-4 h-4 animate-spin" />
                                    Rendering Shot {currentShotIndex + 1}/{shots.length}...
                                </div>
                            )}

                            {/* Play Movie Button */}
                            <button
                                onClick={() => setIsPlayingMovie(true)}
                                disabled={!hasPlayableVideos || isSequencing}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Play movie timeline (Space)"
                            >
                                <Icon name="play" className={`w-4 h-4 ${hasPlayableVideos ? 'text-green-400' : ''}`} />
                                Play Movie
                            </button>

                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                disabled={isSequencing}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-600 transition-colors disabled:opacity-50"
                                title="Import raw script text"
                            >
                                <Icon name="template" className="w-4 h-4" />
                                Import Script
                            </button>
                            
                            {/* EXPORT GROUP */}
                            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                <button
                                    onClick={handleExportPDF}
                                    disabled={isSequencing}
                                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                                    title="Export PDF Shot List"
                                >
                                    <Icon name="download" className="w-3.5 h-3.5" />
                                    PDF
                                </button>
                                <div className="w-px bg-slate-600 my-1"></div>
                                <button
                                    onClick={handleExportEDL}
                                    disabled={isSequencing || isExportingEDL || !hasPlayableVideos}
                                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                                    title="Export for Premiere/DaVinci (EDL + Video)"
                                >
                                    {isExportingEDL ? <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" /> : <Icon name="film" className="w-3.5 h-3.5 text-cyan-400" />}
                                    NLE
                                </button>
                            </div>

                            {generatedPrompts.length > 0 && (
                                <button
                                    onClick={isSequencing ? stopSequence : handleRenderAllVideos}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-transform hover:scale-105 ${
                                        isSequencing 
                                        ? 'bg-red-600 hover:bg-red-500 text-white' 
                                        : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white'
                                    }`}
                                >
                                    <Icon name={isSequencing ? 'cancel' : 'video'} className="w-4 h-4" />
                                    {isSequencing ? "Stop Render" : t.renderAll}
                                </button>
                            )}
                            <button 
                                onClick={onClose}
                                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                <Icon name="cancel" className="w-6 h-6" />
                            </button>
                        </div>
                    </header>

                    <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
                        
                        {/* Left Column: Inputs */}
                        <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-8 bg-slate-900/30 border-r border-slate-700/50">
                            
                            {/* Global Context */}
                            <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-2 mb-4">
                                    <Icon name="globe" className="w-5 h-5 text-fuchsia-400" />
                                    <h3 className="text-md font-bold text-slate-200 uppercase tracking-wide">{t.globalContext}</h3>
                                </div>
                                <p className="text-xs text-slate-400 mb-4">{t.globalContextDesc}</p>
                                
                                <div className="space-y-4">
                                    <TextAreaInput
                                        label={t.styleLabel}
                                        name="globalStyle"
                                        value={globalContext.style}
                                        onChange={(e) => setGlobalContext({ ...globalContext, style: e.target.value })}
                                        placeholder={t.stylePlaceholder}
                                        rows={1}
                                        maxLength={CHARACTER_LIMITS.customArtStyle}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <TextAreaInput
                                            label={t.characterLabel}
                                            name="globalCharacter"
                                            value={globalContext.character}
                                            onChange={(e) => setGlobalContext({ ...globalContext, character: e.target.value })}
                                            placeholder={t.characterPlaceholder}
                                            rows={2}
                                            maxLength={CHARACTER_LIMITS.characterSpecificClothing}
                                        />
                                        <TextAreaInput
                                            label={t.settingLabel}
                                            name="globalSetting"
                                            value={globalContext.setting}
                                            onChange={(e) => setGlobalContext({ ...globalContext, setting: e.target.value })}
                                            placeholder={t.settingPlaceholder}
                                            rows={2}
                                            maxLength={CHARACTER_LIMITS.environment}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Shot List */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-md font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                                        <Icon name="video" className="w-5 h-5 text-cyan-400" />
                                        {t.shotList}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <CheckboxInput
                                            id="contextual-flow-toggle"
                                            name="contextualFlow"
                                            label="Contextual Flow"
                                            checked={isContextualFlowEnabled}
                                            onChange={(e) => setIsContextualFlowEnabled(e.target.checked)}
                                            tooltipText="AI will enforce narrative continuity between shots."
                                        />
                                        <button
                                            onClick={() => setIsAutoBlockerOpen(true)}
                                            disabled={isSequencing}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-full bg-fuchsia-900/30 text-fuchsia-400 hover:bg-fuchsia-900/50 border border-fuchsia-800/50 transition-colors flex items-center gap-1 disabled:opacity-50"
                                            title="Auto-Block Scene"
                                        >
                                            <Icon name="film" className="w-3 h-3" />
                                            Auto-Block
                                        </button>
                                        <button
                                            onClick={addShot}
                                            disabled={isSequencing}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-full bg-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50 border border-cyan-800/50 transition-colors flex items-center gap-1 disabled:opacity-50"
                                            title="Add Shot (Shift+N)"
                                        >
                                            <Icon name="plus" className="w-3 h-3" />
                                            {t.addShot}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {shots.map((shot, index) => (
                                        <React.Fragment key={shot.id}>
                                            {/* Link & Transition Nodes Between Cards */}
                                            {index > 0 && (
                                                <div className="flex justify-center items-center gap-3 -my-3 relative z-10">
                                                    
                                                    {/* Visual Link Node */}
                                                    <div 
                                                        className={`rounded-full p-1.5 border shadow-md transition-colors ${
                                                            shot.visualLink 
                                                            ? 'bg-green-900/80 border-green-500/50 text-green-400' 
                                                            : 'bg-slate-800 border-slate-600 text-slate-500'
                                                        }`}
                                                        title="Visual Consistency Link"
                                                    >
                                                        <Icon name="sliders" className="w-3 h-3 rotate-90" />
                                                    </div>

                                                    <div className="w-8 h-px bg-slate-700"></div>

                                                    {/* Transition Selector Node */}
                                                    <button 
                                                        onClick={() => handleCycleTransition(shots[index-1].id)}
                                                        className={`rounded-full p-1.5 border shadow-md transition-all hover:scale-110 flex items-center justify-center ${
                                                            shots[index-1].transitionToNext && shots[index-1].transitionToNext !== 'cut'
                                                            ? 'bg-fuchsia-900/80 border-fuchsia-500/50 text-fuchsia-400'
                                                            : 'bg-slate-800 border-slate-600 text-slate-500 hover:text-slate-300'
                                                        }`}
                                                        title={`Transition: ${shots[index-1].transitionToNext || 'Cut'}`}
                                                    >
                                                        <Icon name={getTransitionIcon(shots[index-1].transitionToNext || 'cut')} className="w-3 h-3" />
                                                    </button>

                                                </div>
                                            )}

                                            <div className={`relative bg-slate-800/20 p-4 rounded-lg border hover:border-slate-600 transition-colors group animate-fade-in-up ${currentShotIndex === index && isSequencing ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-slate-700'}`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                                            {t.shot} {index + 1}
                                                        </span>
                                                        {shot.characterId && (
                                                            <span className="flex items-center gap-1 bg-cyan-900/40 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-800/50">
                                                                <Icon name="user" className="w-3 h-3" />
                                                                Starring: {savedCharacters.find(c => c.id === shot.characterId)?.name}
                                                            </span>
                                                        )}
                                                        {shot.locationId && (
                                                            <span className="flex items-center gap-1 bg-emerald-900/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-800/50">
                                                                <Icon name="map-pin" className="w-3 h-3" />
                                                                At: {locations.find(l => l.id === shot.locationId)?.name}
                                                            </span>
                                                        )}
                                                        
                                                        {/* Visual Link Toggle */}
                                                        {index > 0 && (
                                                            <label className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold cursor-pointer transition-colors ${shot.visualLink ? 'bg-green-900/30 border-green-500/30 text-green-300' : 'bg-slate-700/30 border-slate-600 text-slate-500 hover:text-slate-300'}`}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="hidden"
                                                                    checked={shot.visualLink || false}
                                                                    onChange={(e) => handleShotChange(shot.id, 'visualLink', e.target.checked)}
                                                                    disabled={isSequencing}
                                                                />
                                                                <Icon name="dna" className="w-3 h-3" />
                                                                <span>Visual Link</span>
                                                            </label>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {/* Take Controls */}
                                                        {shot.takes && shot.takes.length > 0 && (
                                                            <div className="flex items-center bg-black/40 rounded-full px-2 py-0.5 border border-slate-600/50 mr-2">
                                                                <button onClick={() => cycleTake(shot.id, 'prev')} className="text-slate-400 hover:text-white"><Icon name="chevron-down" className="w-3 h-3 rotate-90" /></button>
                                                                <span className="text-[10px] text-slate-300 mx-2 font-mono">
                                                                    Take {(shot.selectedTakeIndex ?? 0) + 1} / {shot.takes.length}
                                                                </span>
                                                                <button onClick={() => cycleTake(shot.id, 'next')} className="text-slate-400 hover:text-white"><Icon name="chevron-down" className="w-3 h-3 -rotate-90" /></button>
                                                            </div>
                                                        )}

                                                        {shot.generatedVideoUrl && (
                                                            <span className="p-1 text-green-400" title="Video Ready">
                                                                <Icon name="check" className="w-4 h-4" />
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteShot(shot.id)}
                                                            className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Remove shot"
                                                            disabled={isSequencing}
                                                        >
                                                            <Icon name="trash" className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Concept Image Preview */}
                                                {shot.conceptImageUrl && (
                                                    <div className="mb-4 relative group/image">
                                                        <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-600 bg-black/50">
                                                            <img 
                                                                src={shot.conceptImageUrl} 
                                                                alt={`Concept for Shot ${index + 1}`} 
                                                                className="w-full h-full object-contain" 
                                                            />
                                                        </div>
                                                        <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white backdrop-blur-sm">
                                                            Concept Preview
                                                        </div>
                                                        <button
                                                            onClick={() => handleShotChange(shot.id, 'conceptImageUrl', undefined)}
                                                            className="absolute top-2 right-2 p-1.5 bg-black/60 text-slate-300 hover:text-red-400 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity"
                                                            title="Remove Concept Image"
                                                        >
                                                            <Icon name="trash" className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="mt-2 grid grid-cols-1 gap-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <SelectInput
                                                            label="Cast Actor (Optional)"
                                                            name={`shot-${shot.id}-actor`}
                                                            value={shot.characterId || ''}
                                                            options={characterOptions}
                                                            onChange={(e) => handleShotChange(shot.id, 'characterId', e.target.value)}
                                                            info="Select a detailed character from your Bank to override the default description."
                                                            disabled={isSequencing}
                                                        />
                                                        <SelectInput
                                                            label="Set Location (Optional)"
                                                            name={`shot-${shot.id}-location`}
                                                            value={shot.locationId || ''}
                                                            options={locationOptions}
                                                            onChange={(e) => handleShotChange(shot.id, 'locationId', e.target.value)}
                                                            info="Select a persistent environment from your Location Library."
                                                            disabled={isSequencing}
                                                        />
                                                    </div>
                                                    <TextAreaInput
                                                        label={t.actionLabel}
                                                        name={`shot-${shot.id}-action`}
                                                        value={shot.action}
                                                        onChange={(e) => handleShotChange(shot.id, 'action', e.target.value)}
                                                        placeholder={t.actionPlaceholder}
                                                        rows={2}
                                                        disabled={isSequencing}
                                                        onEnhance={() => handleEnhanceShotAction(shot.id, shot.action)}
                                                        isEnhancing={isEnhancingShot[shot.id]}
                                                    />
                                                    
                                                    {/* Green Screen Controls */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/30 p-3 rounded-lg border border-slate-700/50">
                                                        <CheckboxInput
                                                            id={`shot-${shot.id}-greenscreen`}
                                                            name={`shot-${shot.id}-greenscreen`}
                                                            label="Green Screen Foreground"
                                                            checked={shot.isGreenScreen || false}
                                                            onChange={(e) => handleShotChange(shot.id, 'isGreenScreen', e.target.checked)}
                                                            tooltipText="Renders character against solid green for chroma keying."
                                                            color="fuchsia"
                                                            disabled={isSequencing}
                                                        />
                                                        {shot.isGreenScreen && (
                                                            <TextAreaInput
                                                                label="Background URL (for Compositing)"
                                                                name={`shot-${shot.id}-bgurl`}
                                                                value={shot.backgroundLayerUrl || ''}
                                                                onChange={(e) => handleShotChange(shot.id, 'backgroundLayerUrl', e.target.value)}
                                                                placeholder="https://..."
                                                                rows={1}
                                                                disabled={isSequencing}
                                                            />
                                                        )}
                                                    </div>

                                                    <TextAreaInput
                                                        label="Dialogue / Captions (Optional)"
                                                        name={`shot-${shot.id}-dialogue`}
                                                        value={shot.dialogueText || ''}
                                                        onChange={(e) => handleShotChange(shot.id, 'dialogueText', e.target.value)}
                                                        placeholder="Text to burn-in as subtitles..."
                                                        rows={1}
                                                        disabled={isSequencing}
                                                        actionButton={
                                                            <button
                                                                onClick={() => handleSuggestBRoll(shot)}
                                                                disabled={isAnalyzingBRoll[shot.id] || !shot.dialogueText}
                                                                className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-30"
                                                                title="Suggest B-Roll for Dialogue"
                                                            >
                                                                {isAnalyzingBRoll[shot.id] ? (
                                                                    <Icon name="spinner" className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Icon name="film" className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        }
                                                    />

                                                    {/* B-Roll Suggestions */}
                                                    {bRollSuggestions[shot.id] && bRollSuggestions[shot.id].length > 0 && (
                                                        <div className="flex flex-wrap gap-2 animate-fade-in-up bg-slate-900/30 p-2 rounded-lg border border-slate-700/50">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide w-full mb-1">
                                                                B-Roll Suggestions
                                                            </span>
                                                            {bRollSuggestions[shot.id].map((suggestion, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => handleInsertBRoll(index, suggestion)}
                                                                    className="flex flex-col items-start p-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 transition-all text-left max-w-[200px]"
                                                                    title={`Insert Shot: ${suggestion.description}`}
                                                                >
                                                                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                                                                        <Icon name="plus" className="w-3 h-3" />
                                                                        {suggestion.keyword}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                                                                        {suggestion.description}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <TextAreaInput
                                                            label={t.cameraLabel}
                                                            name={`shot-${shot.id}-camera`}
                                                            value={shot.camera}
                                                            onChange={(e) => handleShotChange(shot.id, 'camera', e.target.value)}
                                                            placeholder={t.cameraPlaceholder}
                                                            rows={1}
                                                            disabled={isSequencing}
                                                            actionButton={
                                                                <button
                                                                    onClick={() => handlePlotCamera(shot.id)}
                                                                    className="p-1.5 rounded-full text-slate-400 hover:text-fuchsia-400 transition-colors"
                                                                    title="Plot Camera Path"
                                                                >
                                                                    <Icon name="pencil" className="w-4 h-4" />
                                                                </button>
                                                            }
                                                        />
                                                        <TextAreaInput
                                                            label="Video URL (Optional)"
                                                            name={`shot-${shot.id}-url`}
                                                            value={shot.generatedVideoUrl || ''}
                                                            onChange={(e) => handleShotChange(shot.id, 'generatedVideoUrl', e.target.value)}
                                                            placeholder="Paste URL to enable playback..."
                                                            rows={1}
                                                            disabled={isSequencing}
                                                        />
                                                    </div>
                                                    
                                                    {/* Media Controls */}
                                                    <div className="flex flex-wrap gap-2">
                                                        {/* Generate Concept Button */}
                                                        <button
                                                            onClick={() => handleGenerateConcept(shot)}
                                                            disabled={isGeneratingConcept[shot.id] || isSequencing}
                                                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-medium border border-slate-600 transition-colors disabled:opacity-50"
                                                            title="Generate a static concept image first"
                                                        >
                                                            {isGeneratingConcept[shot.id] ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="image" className="w-3 h-3 text-fuchsia-400" />}
                                                            <span>Generate Concept</span>
                                                        </button>

                                                        {/* Draw Layout Button */}
                                                        <button
                                                            onClick={() => setWhiteboardShotId(shot.id)}
                                                            disabled={isProcessingSketch[shot.id] || isSequencing}
                                                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-medium border border-slate-600 transition-colors disabled:opacity-50"
                                                            title="Sketch layout to guide generation"
                                                        >
                                                            {isProcessingSketch[shot.id] ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="pencil" className="w-3 h-3 text-cyan-400" />}
                                                            <span>Draw Layout</span>
                                                        </button>

                                                        <div className="flex-grow"></div>

                                                        {/* Audio Controls */}
                                                        <div className="p-1 rounded-lg border border-slate-700 bg-slate-900/30 flex items-center gap-2">
                                                            <label className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-700 cursor-pointer text-xs font-medium text-slate-300 transition-colors">
                                                                <Icon name="upload" className="w-3 h-3" />
                                                                <span>Upload Audio</span>
                                                                <input 
                                                                    type="file" 
                                                                    accept="audio/*" 
                                                                    className="hidden" 
                                                                    onChange={(e) => handleAudioUpload(e, shot.id)}
                                                                    disabled={isSequencing}
                                                                />
                                                            </label>
                                                            <button 
                                                                onClick={() => handleGenerateTTS(shot)}
                                                                disabled={isGeneratingTTS === shot.id || isSequencing}
                                                                className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
                                                            >
                                                                {isGeneratingTTS === shot.id ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="magic" className="w-3 h-3" />}
                                                                <span>TTS</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleAutoFoley(shot)}
                                                                disabled={isAutoFoleyRunning === shot.id || !shot.generatedVideoUrl || isSequencing}
                                                                className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md hover:bg-purple-900/50 text-xs font-medium text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Analyze video and generate SFX"
                                                            >
                                                                {isAutoFoleyRunning === shot.id ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="sparkles" className="w-3 h-3" />}
                                                                <span>Auto-Foley</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    {shot.critique && (
                                                        <div className={`mt-2 p-2 rounded text-xs border ${
                                                            shot.critique.score >= 8 ? 'bg-green-900/30 border-green-500/50 text-green-200' :
                                                            shot.critique.score >= 5 ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-200' :
                                                            'bg-red-900/30 border-red-500/50 text-red-200'
                                                        }`}>
                                                            <div className="flex items-start gap-2">
                                                                <span className="font-bold flex-shrink-0">
                                                                    {shot.critique.score >= 8 ? '✅' : shot.critique.score >= 5 ? '⚠️' : '❌'} 
                                                                    {shot.critique.score}/10
                                                                </span>
                                                                <span>{shot.critique.feedback}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {critiqueStatus[shot.id] && (
                                                        <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                                                            <Icon name="spinner" className="w-3 h-3 animate-spin" />
                                                            Analyzing video quality...
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="pt-4">
                                <button
                                    onClick={handleBatchGenerate}
                                    disabled={isGenerating || isSequencing}
                                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Ctrl+Enter"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Icon name="spinner" className="w-5 h-5 animate-spin" />
                                            {t.generating}
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="sparkles" className="w-5 h-5" />
                                            {t.batchGenerate}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Results */}
                        {generatedPrompts.length > 0 && (
                            <div className="w-full md:w-[450px] bg-slate-950/30 p-6 overflow-y-auto border-l border-slate-700/50 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-100">{t.resultsTitle}</h3>
                                    <button
                                        onClick={handleCopyAll}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                    >
                                        <Icon name="copy" className="w-3 h-3" />
                                        {t.copyAll}
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {generatedPrompts.map((prompt, index) => {
                                        const shot = shots[index];
                                        const hasConcept = !!shot.conceptImageUrl;
                                        
                                        return (
                                            <div key={index} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 hover:border-cyan-500/30 transition-colors animate-fade-in-up">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.shot} {index + 1}</span>
                                                        {hasConcept && (
                                                            <span className="text-[10px] bg-fuchsia-900/30 text-fuchsia-300 px-1.5 py-0.5 rounded border border-fuchsia-500/20">
                                                                Concept Ready
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(prompt);
                                                            addToast("Copied to clipboard", 'success');
                                                        }}
                                                        className="text-slate-500 hover:text-white transition-colors"
                                                        title="Copy"
                                                    >
                                                        <Icon name="copy" className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <p className="text-sm text-slate-300 font-mono leading-relaxed whitespace-pre-wrap selection:bg-cyan-500/20">
                                                    {prompt}
                                                </p>
                                                
                                                {/* Single Shot Generation Button (Optional Enhancement) */}
                                                {startVideoGeneration && !isSequencing && (
                                                    <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-end">
                                                        <button
                                                            className="text-[10px] text-slate-500 cursor-not-allowed opacity-50"
                                                            disabled
                                                        >
                                                            {hasConcept ? "Will Animate Concept" : "Will Generate Video"}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Import Modal Overlay */}
                    {isImportModalOpen && (
                        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in-up">
                            <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-slate-100">Import Script</h3>
                                    <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white">
                                        <Icon name="cancel" className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-400 mb-4">Paste your script dialogue or action lines below. The AI will break it down into scenes and attempt to match characters.</p>
                                <TextAreaInput 
                                    label="Raw Script" 
                                    name="script-import" 
                                    value={scriptText} 
                                    onChange={(e) => setScriptText(e.target.value)}
                                    placeholder="INT. DINER - NIGHT&#10;John sits at the booth, nervous. He checks his watch.&#10;MARY enters, slamming the door..."
                                    rows={10}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-3 mt-6">
                                    <button 
                                        onClick={() => setIsImportModalOpen(false)} 
                                        className="px-4 py-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleParseScript} 
                                        disabled={!scriptText.trim() || isParsingScript}
                                        className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isParsingScript ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name="magic" className="w-4 h-4" />}
                                        Parse Scenes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Auto-Blocker Modal */}
                    <AutoBlockerModal
                        isOpen={isAutoBlockerOpen}
                        onClose={() => setIsAutoBlockerOpen(false)}
                        savedCharacters={savedCharacters}
                        onGenerate={handleAutoBlockComplete}
                        uiStrings={uiStrings}
                    />

                    {/* Camera Plotter Modal */}
                    <CameraPlotterModal
                        isOpen={plottingShotId !== null}
                        onClose={() => setPlottingShotId(null)}
                        conceptImageUrl={plottingShotId !== null ? shots.find(s => s.id === plottingShotId)?.conceptImageUrl : undefined}
                        onApply={handlePlotApply}
                        addToast={addToast}
                        uiStrings={uiStrings}
                    />

                    {/* Whiteboard Modal */}
                    <WhiteboardModal 
                        isOpen={whiteboardShotId !== null}
                        onClose={() => setWhiteboardShotId(null)}
                        onGeneratePreview={handleGenerateSketch}
                        initialImage={whiteboardShotId !== null ? shots.find(s => s.id === whiteboardShotId)?.conceptImageUrl : undefined}
                    />
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
        </>
    );
};

export default StoryBoard;
