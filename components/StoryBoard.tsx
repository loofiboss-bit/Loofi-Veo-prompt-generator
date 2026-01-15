
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
import CheckboxInput from './CheckboxInput';
import { CHARACTER_LIMITS } from '../constants';
import { ToastMessage, CharacterProfile, Shot, GlobalContext, GenerationTask, SFXEvent, TransitionType, LocationProfile, Asset } from '../types';
import { generateShotList } from '../utils/pdfExport';
import { buildShotPrompt } from '../services/promptBuilder';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import TimelinePlayer from './TimelinePlayer';
import { useSequentialGeneration } from '../hooks/useSequentialGeneration';
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
import RecordingBoothModal from './RecordingBoothModal';
import TableReadPlayer from './TableReadPlayer';
import Tooltip from './Tooltip';
import { useCollaborativeProject } from '../hooks/useCollaborativeProject';
import ScriptImportReviewModal from './ScriptImportReviewModal';
import { renderTitleCard } from '../services/videoEditorService';

interface StoryBoardProps {
    isOpen: boolean;
    onClose: () => void;
    uiStrings: any;
    addToast: (message: string, type: ToastMessage['type']) => void;
    onGenerateBatch?: (prompts: string[]) => void;
    savedCharacters?: CharacterProfile[];
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
        addAsset
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

    // Recording Booth State
    const [recordingShotId, setRecordingShotId] = useState<number | null>(null);

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
                else if (recordingShotId !== null) {
                    e.stopPropagation();
                    setRecordingShotId(null);
                }
                else if (doctorShotId !== null) {
                    e.stopPropagation();
                    setDoctorShotId(null);
                }
                else if (isOpen) {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isImportModalOpen, isPlayingMovie, isTableReadOpen, isAutoBlockerOpen, plottingShotId, whiteboardShotId, inpaintingShotId, recordingShotId, doctorShotId, isOpen, isReviewingImport]);

    const handleDeleteShot = (id: number) => {
        if (shots.length <= 1) {
            addToast("You need at least one shot.", 'error');
            return;
        }
        deleteShot(id);
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
            if(!isSequencing) addShot('video');
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
        // We only sequence generate standard video shots. 
        // Title Cards should be rendered individually or we could add auto-render logic here.
        // For simplicity, we filter to only video prompts that need Veo.
        const videoPrompts = generatedPrompts; // These map to video shots
        
        if (videoPrompts.length === 0) return;
        if (startVideoGeneration) {
            startSequence(videoPrompts);
            addToast("Starting Sequential Render...", 'info');
        } else {
            addToast("Video generation service not connected.", 'error');
        }
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
            
            // Add placeholder files for structure
            const videoFolder = zip.folder("VideoFiles");
            // In a real app we'd fetch blobs and add them, but here we just do EDL logic
            
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
                // Clear audio or warn? Instructions say "show a warning".
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
                    <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
                        <div>
                            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                <Icon name="film" className="w-6 h-6 text-cyan-400" />
                                {t.title}
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">{t.description}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsTableReadOpen(true)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/50 hover:bg-fuchsia-600/40 text-xs font-bold transition-all"
                                title="Preview Animatic with Audio & Images"
                            >
                                <Icon name="video" className="w-4 h-4" />
                                Table Read
                            </button>
                            <button 
                                onClick={handleRenderAllVideos}
                                disabled={isSequencing || generatedPrompts.length === 0}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Icon name={isSequencing ? "spinner" : "video"} className={`w-4 h-4 ${isSequencing ? "animate-spin" : ""}`} />
                                {isSequencing ? "Rendering..." : t.renderAll}
                            </button>
                            
                            {hasPlayableVideos && (
                                <button
                                    onClick={() => setIsPlayingMovie(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all"
                                >
                                    <Icon name="play" className="w-4 h-4" />
                                    Play Movie
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
                                                } ${currentShotIndex === index && isSequencing ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : ''}`}
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
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isTitleCard ? 'bg-slate-600 text-slate-200' : 'bg-slate-700 text-slate-300'}`}>
                                                            {isTitleCard ? 'TITLE CARD' : `${t.shot} ${index + 1}`}
                                                        </span>
                                                        {shot.duration && (
                                                            <div className="flex items-center gap-1 text-[10px] bg-slate-900/50 text-slate-300 px-2 py-0.5 rounded border border-slate-600/50">
                                                                <span>⏱ {shot.duration}s</span>
                                                            </div>
                                                        )}
                                                        {shot.generatedVideoUrl && (
                                                            <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-500/20">
                                                                <Icon name="check" className="w-3 h-3" /> Rendered
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
                                                        <button 
                                                            onClick={() => setInpaintingShotId(shot.id)}
                                                            className="absolute bottom-2 right-2 bg-black/60 hover:bg-fuchsia-600 text-white text-xs px-2 py-1 rounded backdrop-blur-sm opacity-0 group-hover/image:opacity-100 transition-all flex items-center gap-1"
                                                        >
                                                            <Icon name="magic" className="w-3 h-3" /> Fix
                                                        </button>
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
                                                            disabled={isSequencing}
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
                                                                    disabled={isSequencing}
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
                                                                    if (shot.audioUrl && e.target.value !== shot.dialogueText) {
                                                                        // Simple check: if changing text while audio exists, warn
                                                                        // To avoid spam, maybe debounce or just rely on user knowing
                                                                    }
                                                                }}
                                                                placeholder="Spoken text..."
                                                                rows={1}
                                                                disabled={isSequencing}
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
                                                                disabled={isGeneratingConcept[shot.id] || isSequencing}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
                                                            >
                                                                {isGeneratingConcept[shot.id] ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="image" className="w-3 h-3" />}
                                                                <span>Concept</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => setWhiteboardShotId(shot.id)}
                                                                disabled={isSequencing || isProcessingSketch[shot.id]}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
                                                            >
                                                                {isProcessingSketch[shot.id] ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="pencil" className="w-3 h-3" />}
                                                                <span>Sketch</span>
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
                                                                        disabled={isSequencing}
                                                                    />
                                                                </label>
                                                                <button 
                                                                    onClick={() => setRecordingShotId(shot.id)}
                                                                    disabled={isSequencing}
                                                                    className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md hover:bg-red-900/30 text-xs font-medium text-red-300 transition-colors disabled:opacity-50"
                                                                    title="Record Voice-Over"
                                                                >
                                                                    <Icon name="audio" className="w-3 h-3" />
                                                                    <span>Record</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleGenerateTTS(shot)}
                                                                    disabled={isGeneratingTTS === shot.id || isSequencing}
                                                                    className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
                                                                >
                                                                    {isGeneratingTTS === shot.id ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="magic" className="w-3 h-3" />}
                                                                    <span>TTS</span>
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

                    {/* Recording Booth Modal */}
                    <RecordingBoothModal
                        isOpen={recordingShotId !== null}
                        onClose={() => setRecordingShotId(null)}
                        scriptText={recordingShotId !== null ? (shots.find(s => s.id === recordingShotId)?.dialogueText || shots.find(s => s.id === recordingShotId)?.action || '') : ''}
                        onSave={handleSaveRecording}
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
