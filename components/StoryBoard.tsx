
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
import CheckboxInput from './CheckboxInput';
import { CHARACTER_LIMITS } from '../constants';
import { ToastMessage, CharacterProfile, Shot, GlobalContext, GenerationTask, SFXEvent, TransitionType, LocationProfile, Asset, TextOverlay, MotionConfig } from '../types';
import { generateShotList } from '../utils/pdfExport';
import { buildShotPrompt } from '../services/promptBuilder';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import TimelinePlayer from './TimelinePlayer';
import { useDirectorsChain } from '../hooks/useDirectorsChain'; 
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
import GenerativeCanvasModal from './GenerativeCanvasModal';
import RecordingBoothModal from './RecordingBoothModal';
import TableReadPlayer from './TableReadPlayer';
import Tooltip from './Tooltip';
import { useCollaborativeProject } from '../hooks/useCollaborativeProject';
import ScriptImportReviewModal from './ScriptImportReviewModal';
import { renderTitleCard } from '../services/videoEditorService';
import TitleEditorModal from './TitleEditorModal';
import * as lipSyncService from '../services/lipSyncService';
import { extractLastFrame } from '../utils/videoUtils';
import PoseEditorModal from './PoseEditorModal';
import MotionEditorPanel from './MotionEditorPanel';
import { upscaleVideo } from '../services/upscaleService';
import DubbingModal from './DubbingModal';

interface StoryBoardProps {
    isOpen: boolean;
    onClose: () => void;
    uiStrings: any;
    addToast: (message: string, type: ToastMessage['type']) => void;
    onGenerateBatch?: (prompts: string[]) => void;
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
        characterBank: savedCharacters,
        credits,
        deductCredits
    } = useAppStore();

    // Connect to Location Store
    const { locations } = useLocationStore();
    
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

    // Pose Editor State
    const [poseEditorShotId, setPoseEditorShotId] = useState<number | null>(null);

    // Recording Booth State
    const [recordingShotId, setRecordingShotId] = useState<number | null>(null);

    // Text Overlay Editor State
    const [textEditorShotId, setTextEditorShotId] = useState<number | null>(null);

    // Motion Editor State
    const [motionEditorShotId, setMotionEditorShotId] = useState<number | null>(null);

    // Dubbing State
    const [dubbingShotId, setDubbingShotId] = useState<number | null>(null);

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

    // --- Upscaling State ---
    const [isUpscaling, setIsUpscaling] = useState<Record<number, boolean>>({});

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
                if (isImportModalOpen) setIsImportModalOpen(false);
                else if (isReviewingImport) setIsReviewingImport(false);
                else if (isPlayingMovie) setIsPlayingMovie(false);
                else if (isTableReadOpen) setIsTableReadOpen(false);
                else if (isAutoBlockerOpen) setIsAutoBlockerOpen(false);
                else if (plottingShotId !== null) setPlottingShotId(null);
                else if (whiteboardShotId !== null) setWhiteboardShotId(null);
                else if (inpaintingShotId !== null) setInpaintingShotId(null);
                else if (outpaintingShotId !== null) setOutpaintingShotId(null);
                else if (poseEditorShotId !== null) setPoseEditorShotId(null);
                else if (recordingShotId !== null) setRecordingShotId(null);
                else if (textEditorShotId !== null) setTextEditorShotId(null);
                else if (motionEditorShotId !== null) setMotionEditorShotId(null);
                else if (dubbingShotId !== null) setDubbingShotId(null);
                else if (doctorShotId !== null) setDoctorShotId(null);
                else if (colorMatchTargetId !== null) setColorMatchTargetId(null);
                else if (isOpen) onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isImportModalOpen, isPlayingMovie, isTableReadOpen, isAutoBlockerOpen, plottingShotId, whiteboardShotId, inpaintingShotId, outpaintingShotId, poseEditorShotId, recordingShotId, textEditorShotId, motionEditorShotId, dubbingShotId, doctorShotId, colorMatchTargetId, isOpen, isReviewingImport]);

    const handleDeleteShot = (id: number) => {
        if (shots.length <= 1) {
            addToast("You need at least one shot.", 'error');
            return;
        }
        deleteShot(id);
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

        let targetImgBase64 = '';
        let refImgBase64 = '';

        try {
            if (targetShot.generatedVideoUrl) {
                const f = await extractLastFrame(targetShot.generatedVideoUrl);
                targetImgBase64 = f.data;
            } else if (targetShot.conceptImageUrl) {
                targetImgBase64 = targetShot.conceptImageUrl.split(',')[1];
            }

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
        
        const indices = selectedShotIds.map(id => shots.findIndex(s => s.id === id)).sort((a, b) => a - b);
        const startIndex = indices[0];
        const endIndex = indices[1];
        
        if (startIndex === -1 || endIndex === -1) return;

        const shotA = shots[startIndex];
        const shotB = shots[endIndex];

        const numScenesStr = prompt("How many intermediate scenes to generate?", "1");
        const numScenes = parseInt(numScenesStr || "1", 10);
        if (isNaN(numScenes) || numScenes < 1) return;

        setIsBridging(true);
        try {
            const contextA = `Action: ${shotA.action}. Dialogue: ${shotA.dialogueText || 'None'}.`;
            const contextB = `Action: ${shotB.action}. Dialogue: ${shotB.dialogueText || 'None'}.`;
            
            const bridgeShots = await geminiService.bridgeScenes(contextA, contextB, numScenes);
            
            if (bridgeShots.length > 0) {
                const newShots = [...shots];
                const currentMaxId = Math.max(...shots.map(s => s.id), 0);
                
                const hydratedBridgeShots = bridgeShots.map((s, i) => ({
                    ...s,
                    id: currentMaxId + i + 1,
                    type: 'video',
                    generatedVideoUrl: '',
                    takes: [],
                    selectedTakeIndex: 0,
                    visualLink: true, 
                    duration: 5,
                    characterId: '' 
                } as Shot));

                newShots.splice(startIndex + 1, 0, ...hydratedBridgeShots);
                setShots(newShots);
                
                addToast(`Bridged gap with ${hydratedBridgeShots.length} new scenes.`, 'success');
                setSelectedShotIds([]); 
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

    const handleBatchGenerate = async () => {
        const videoShots = shots.filter(s => s.type !== 'title');
        
        if (videoShots.length === 0) {
            addToast("Add video shots to generate prompts.", 'info');
            return;
        }

        if (!globalContext.style && !globalContext.character && !globalContext.setting) {
            addToast("Please define Global Context first.", 'error');
            return;
        }

        setIsGenerating(true);
        try {
            const shotContexts = videoShots.map(s => ({
                action: s.action,
                camera: s.camera,
                characterId: s.characterId,
                locationId: s.locationId
            }));

            const refinedPrompts = await geminiService.refineStoryboardContinuity(
                shotContexts,
                globalContext,
                promptState.language,
                promptState.model,
                isContextualFlowEnabled
            );

            if (onGenerateBatch) {
                onGenerateBatch(refinedPrompts);
            }
        } catch (error) {
            addToast("Batch generation failed.", 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpscale = async (shot: Shot) => {
        if (!shot.generatedVideoUrl) return;
        
        // 1. Check Credits
        const cost = 5;
        if (!deductCredits(cost)) {
            addToast(`Insufficient credits for upscale. Requires ${cost}.`, 'error');
            return;
        }

        // 2. Start Process
        setIsUpscaling(prev => ({ ...prev, [shot.id]: true }));
        try {
            const upscaledUrl = await upscaleVideo(shot.generatedVideoUrl, 4);
            handleShotChange(shot.id, 'generatedVideoUrl', upscaledUrl);
            handleShotChange(shot.id, 'is4K', true);
            addToast("Video upscaled to 4K (Simulated).", 'success');
        } catch (error) {
            console.error("Upscale failed", error);
            addToast("Upscaling failed.", 'error');
        } finally {
            setIsUpscaling(prev => ({ ...prev, [shot.id]: false }));
        }
    };

    // Dubbing Logic
    const handleSaveDub = (lang: string, url: string) => {
        if (dubbingShotId === null) return;
        const shot = shots.find(s => s.id === dubbingShotId);
        if (shot) {
            const currentVersions = shot.versions || {};
            handleShotChange(dubbingShotId, 'versions', {
                ...currentVersions,
                [lang]: url
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/95 z-[60] flex flex-col overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Icon name="film" className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-xl font-bold text-slate-100">{t.title}</h2>
                    <div className="flex items-center px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                        <Icon name="zap" className="w-3 h-3 text-yellow-400 mr-2" />
                        <span className="text-xs font-bold text-yellow-100">{credits} Credits</span>
                    </div>
                    <div className="h-6 w-px bg-slate-700 mx-2" />
                    <button onClick={() => setIsAutoBlockerOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-fuchsia-400 border border-slate-600 transition-colors">
                        <Icon name="magic" className="w-4 h-4" /> Auto-Block
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsPlayingMovie(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-bold shadow-lg transition-colors">
                        <Icon name="play" className="w-4 h-4" /> Timeline
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-grow flex overflow-hidden">
                {/* Global Context Sidebar */}
                <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col flex-shrink-0 overflow-y-auto p-4 space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">{t.globalContext}</h3>
                        <p className="text-xs text-slate-500 mb-4">{t.globalContextDesc}</p>
                        <TextAreaInput 
                            label={t.styleLabel} 
                            name="globalStyle" 
                            value={globalContext.style} 
                            onChange={(e) => setGlobalContext(prev => ({...prev, style: e.target.value}))} 
                            rows={3} 
                            placeholder={t.stylePlaceholder} 
                        />
                        <div className="h-4" />
                        <TextAreaInput 
                            label={t.characterLabel} 
                            name="globalCharacter" 
                            value={globalContext.character} 
                            onChange={(e) => setGlobalContext(prev => ({...prev, character: e.target.value}))} 
                            rows={3} 
                            placeholder={t.characterPlaceholder} 
                        />
                        <div className="h-4" />
                        <TextAreaInput 
                            label={t.settingLabel} 
                            name="globalSetting" 
                            value={globalContext.setting} 
                            onChange={(e) => setGlobalContext(prev => ({...prev, setting: e.target.value}))} 
                            rows={3} 
                            placeholder={t.settingPlaceholder} 
                        />
                    </div>
                    
                    <div className="border-t border-slate-700 pt-4">
                        <CheckboxInput 
                            id="contextualFlow"
                            name="contextualFlow"
                            label="Contextual Flow (AI)"
                            checked={isContextualFlowEnabled}
                            onChange={(e) => setIsContextualFlowEnabled(e.target.checked)}
                            tooltipText="AI will enforce narrative continuity between shots."
                        />
                    </div>

                    <div className="mt-auto">
                        <button 
                            onClick={handleBatchGenerate}
                            disabled={isGenerating}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            {isGenerating ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
                            {isGenerating ? t.generating : t.batchGenerate}
                        </button>
                    </div>
                </div>

                {/* Shot List */}
                <div className="flex-grow bg-slate-950 overflow-y-auto p-6 space-y-4">
                    {shots.map((shot, index) => (
                        <div key={shot.id} className={`bg-slate-900 border ${selectedShotIds.includes(shot.id) ? 'border-cyan-500 ring-1 ring-cyan-500/50' : 'border-slate-800'} rounded-xl p-4 flex gap-4 transition-all hover:border-slate-600`}>
                            {/* Shot Header / ID */}
                            <div className="flex flex-col items-center gap-2 border-r border-slate-800 pr-4">
                                <span className="text-xl font-bold text-slate-500">#{index + 1}</span>
                                <input 
                                    type="checkbox" 
                                    checked={selectedShotIds.includes(shot.id)} 
                                    onChange={() => handleSelectionToggle(shot.id)}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500"
                                />
                                <button onClick={() => handleDeleteShot(shot.id)} className="text-slate-600 hover:text-red-400 mt-2">
                                    <Icon name="trash" className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Main Content */}
                            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Visual Preview */}
                                <div className="bg-black rounded-lg aspect-video flex items-center justify-center relative overflow-hidden group">
                                    {shot.generatedVideoUrl ? (
                                        <video src={shot.generatedVideoUrl} className="w-full h-full object-contain" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                                    ) : shot.conceptImageUrl ? (
                                        <img src={shot.conceptImageUrl} className="w-full h-full object-cover opacity-80" alt="Concept" />
                                    ) : (
                                        <div className="text-center text-slate-600">
                                            <Icon name="image" className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                            <span className="text-xs">No visual</span>
                                        </div>
                                    )}
                                    
                                    {/* 4K Badge */}
                                    {shot.is4K && (
                                        <div className="absolute top-2 left-2 bg-yellow-500/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none">
                                            4K
                                        </div>
                                    )}

                                    {/* Version Badge */}
                                    {shot.versions && Object.keys(shot.versions).length > 0 && (
                                        <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 flex items-center gap-1 cursor-help" title={`Dubbed Versions: ${Object.keys(shot.versions).join(', ').toUpperCase()}`}>
                                            <Icon name="globe" className="w-3 h-3" />
                                            {Object.keys(shot.versions).length}
                                        </div>
                                    )}

                                    {/* Loading State for Upscale */}
                                    {isUpscaling[shot.id] && (
                                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
                                            <Icon name="spinner" className="w-8 h-8 text-fuchsia-400 animate-spin mb-2" />
                                            <span className="text-xs font-bold text-fuchsia-200">Enhancing...</span>
                                        </div>
                                    )}
                                    
                                    {/* Visual Tools Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                        <button onClick={() => setWhiteboardShotId(shot.id)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white" title="Sketch"><Icon name="pencil" className="w-4 h-4" /></button>
                                        <button onClick={() => setPlottingShotId(shot.id)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white" title="Camera Plot"><Icon name="video" className="w-4 h-4" /></button>
                                        <button onClick={() => setPoseEditorShotId(shot.id)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white" title="Pose"><Icon name="accessibility" className="w-4 h-4" /></button>
                                        {shot.generatedVideoUrl && <button onClick={() => setMotionEditorShotId(shot.id)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white" title="Motion"><Icon name="move" className="w-4 h-4" /></button>}
                                        {shot.generatedVideoUrl && shot.dialogueText && (
                                            <button 
                                                onClick={() => setDubbingShotId(shot.id)} 
                                                className="p-2 bg-emerald-700 hover:bg-emerald-600 rounded-full text-white" 
                                                title="Global Dub (Translate & Sync)"
                                            >
                                                <Icon name="globe" className="w-4 h-4" />
                                            </button>
                                        )}
                                        {shot.generatedVideoUrl && !shot.is4K && !isUpscaling[shot.id] && (
                                            <button 
                                                onClick={() => handleUpscale(shot)} 
                                                className="p-2 bg-fuchsia-700 hover:bg-fuchsia-600 rounded-full text-white shadow-lg shadow-fuchsia-500/20" 
                                                title="Upscale to 4K (5 Credits)"
                                            >
                                                <Icon name="sparkles" className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Text Inputs */}
                                <div className="space-y-4">
                                    <TextAreaInput label={t.actionLabel} name={`action-${shot.id}`} value={shot.action} onChange={(e) => handleShotChange(shot.id, 'action', e.target.value)} placeholder={t.actionPlaceholder} rows={3} />
                                    <div className="relative">
                                        <TextAreaInput label="Dialogue" name={`dialogue-${shot.id}`} value={shot.dialogueText || ''} onChange={(e) => handleShotChange(shot.id, 'dialogueText', e.target.value)} placeholder="Spoken lines..." rows={2} />
                                        <button onClick={() => setRecordingShotId(shot.id)} className="absolute top-0 right-0 mt-8 mr-2 text-slate-400 hover:text-red-400" title="Record Audio"><Icon name="audio" className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                {/* Config */}
                                <div className="space-y-4">
                                    <SelectInput 
                                        label="Shot Type"
                                        name={`type-${shot.id}`}
                                        value={shot.camera}
                                        onChange={(e) => handleShotChange(shot.id, 'camera', e.target.value)}
                                        options={[
                                            { value: 'Wide Shot', label: 'Wide Shot' },
                                            { value: 'Medium Shot', label: 'Medium Shot' },
                                            { value: 'Close-up', label: 'Close-up' },
                                            { value: 'Extreme Close-up', label: 'Extreme Close-up' },
                                            { value: 'Tracking Shot', label: 'Tracking Shot' },
                                            { value: 'Drone Shot', label: 'Drone Shot' }
                                        ]} 
                                    />
                                    <SelectInput
                                        label="Character"
                                        name={`char-${shot.id}`}
                                        value={shot.characterId || ''}
                                        onChange={(e) => handleShotChange(shot.id, 'characterId', e.target.value)}
                                        options={[
                                            { value: '', label: 'None / Generic' },
                                            ...savedCharacters.map(c => ({ value: c.id, label: c.name }))
                                        ]}
                                    />
                                    {colorMatchTargetId === null ? (
                                        <button onClick={() => setColorMatchTargetId(shot.id)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs border border-slate-700 transition-colors">
                                            Match Color to this Shot
                                        </button>
                                    ) : colorMatchTargetId === shot.id ? (
                                        <button onClick={() => setColorMatchTargetId(null)} className="w-full py-2 bg-yellow-900/30 text-yellow-400 border border-yellow-500/50 rounded-lg text-xs animate-pulse">
                                            Select Reference Shot...
                                        </button>
                                    ) : (
                                        <button onClick={() => handleColorMatch(shot.id)} className="w-full py-2 bg-green-900/30 text-green-400 border border-green-500/50 rounded-lg text-xs hover:bg-green-800/50">
                                            Apply Color from Here
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    <button onClick={() => addShot('video')} className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-500 hover:bg-slate-900/50 transition-all flex items-center justify-center gap-2">
                        <Icon name="plus" className="w-5 h-5" />
                        {t.addShot}
                    </button>
                </div>
            </div>

            {/* Floating Actions */}
            {selectedShotIds.length === 2 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-slate-600 animate-fade-in-up z-[70]">
                    <span className="text-sm font-bold">{selectedShotIds.length} Shots Selected</span>
                    <button onClick={handleBridgeGap} className="px-4 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-full text-xs font-bold transition-colors">
                        Bridge Gap (AI)
                    </button>
                    <button onClick={() => setSelectedShotIds([])} className="text-slate-400 hover:text-white">
                        <Icon name="cancel" className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Modals */}
            {isAutoBlockerOpen && <AutoBlockerModal isOpen={isAutoBlockerOpen} onClose={() => setIsAutoBlockerOpen(false)} savedCharacters={savedCharacters} onGenerate={(newShots) => { newShots.forEach(s => addShot()); /* simple stub logic for merging */ }} uiStrings={uiStrings} />}
            {isImportModalOpen && <ScriptImportReviewModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} initialShots={pendingImportShots} characterOptions={savedCharacters.map(c => ({value: c.id, label: c.name}))} locationOptions={locations.map(l => ({value: l.id, label: l.name}))} onImport={() => {}} />}
            {isPlayingMovie && <TimelinePlayer shots={shots} onClose={() => setIsPlayingMovie(false)} bgMusicUrl={backgroundMusicUrl} />}
            {isTableReadOpen && <TableReadPlayer shots={shots} savedCharacters={savedCharacters} onClose={() => setIsTableReadOpen(false)} />}
            {whiteboardShotId !== null && <WhiteboardModal isOpen={whiteboardShotId !== null} onClose={() => setWhiteboardShotId(null)} onGeneratePreview={(b64) => { handleShotChange(whiteboardShotId!, 'conceptImageUrl', `data:image/png;base64,${b64}`); setWhiteboardShotId(null); }} initialImage={shots.find(s => s.id === whiteboardShotId)?.conceptImageUrl} />}
            {plottingShotId !== null && <CameraPlotterModal isOpen={plottingShotId !== null} onClose={() => setPlottingShotId(null)} conceptImageUrl={shots.find(s => s.id === plottingShotId)?.conceptImageUrl} onApply={(prompt) => { handleShotChange(plottingShotId!, 'camera', prompt); }} addToast={addToast} uiStrings={uiStrings} />}
            {recordingShotId !== null && <RecordingBoothModal isOpen={recordingShotId !== null} onClose={() => setRecordingShotId(null)} scriptText={shots.find(s => s.id === recordingShotId)?.dialogueText || ''} onSave={(blob) => { /* Upload logic */ }} />}
            {inpaintingShotId !== null && <InpaintingModal isOpen={inpaintingShotId !== null} onClose={() => setInpaintingShotId(null)} imageUrl={shots.find(s => s.id === inpaintingShotId)?.conceptImageUrl || ''} onGenerate={async () => {}} />}
            {outpaintingShotId !== null && <GenerativeCanvasModal isOpen={outpaintingShotId !== null} onClose={() => setOutpaintingShotId(null)} conceptImageUrl={shots.find(s => s.id === outpaintingShotId)?.conceptImageUrl || ''} onGenerateFill={async () => {}} />}
            {poseEditorShotId !== null && <PoseEditorModal isOpen={poseEditorShotId !== null} onClose={() => setPoseEditorShotId(null)} onSave={(b64) => handleShotChange(poseEditorShotId!, 'poseUrl', `data:image/png;base64,${b64}`)} />}
            {motionEditorShotId !== null && <MotionEditorPanel shot={shots.find(s => s.id === motionEditorShotId)!} onClose={() => setMotionEditorShotId(null)} onSave={(cfg) => handleShotChange(motionEditorShotId!, 'motionConfig', cfg)} />}
            
            {/* Title Editor */}
            {textEditorShotId !== null && (
                <TitleEditorModal 
                    isOpen={textEditorShotId !== null} 
                    onClose={() => setTextEditorShotId(null)} 
                    shot={shots.find(s => s.id === textEditorShotId)!} 
                    onSave={(overlays) => handleShotChange(textEditorShotId!, 'overlays', overlays)} 
                />
            )}

            {/* Dubbing Modal */}
            {dubbingShotId !== null && (
                <DubbingModal 
                    isOpen={dubbingShotId !== null} 
                    onClose={() => setDubbingShotId(null)} 
                    shot={shots.find(s => s.id === dubbingShotId)!} 
                    onSave={handleSaveDub}
                    addToast={addToast}
                />
            )}
        </div>
    );
};

export default StoryBoard;
