
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
import CheckboxInput from './CheckboxInput';
import { CHARACTER_LIMITS } from '../constants';
import { ToastMessage, CharacterProfile, Shot, GlobalContext, GenerationTask, SFXEvent } from '../types';
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
        updateShot: handleShotChange
    } = useAppStore();
    
    // Derived state for results can remain local as it's generated on demand
    const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Import Script State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [scriptText, setScriptText] = useState('');
    const [isParsingScript, setIsParsingScript] = useState(false);
    
    // Contextual Flow State
    const [isContextualFlowEnabled, setIsContextualFlowEnabled] = useState(true);

    // Timeline Player State
    const [isPlayingMovie, setIsPlayingMovie] = useState(false);

    // Audio State
    const [isGeneratingTTS, setIsGeneratingTTS] = useState<number | null>(null);
    const [isAutoFoleyRunning, setIsAutoFoleyRunning] = useState<number | null>(null);
    const [isExportingEDL, setIsExportingEDL] = useState(false);

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
                else if (isOpen) {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isImportModalOpen, isPlayingMovie, isOpen]);

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
            return buildShotPrompt(globalContext, shot, characterProfile);
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
            // Note: We use the sequence index + 1 padded to 3 digits (e.g. 001.mp4)
            // This matches the Reel ID logic in generateEDL
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

    const handleGenerateTTS = async (shot: Shot) => {
        const text = prompt(`Enter dialogue or text for TTS (Default: "${shot.action}")`, shot.action);
        if (text === null) return;
        const promptText = text.trim() || shot.action;
        
        setIsGeneratingTTS(shot.id);
        try {
            const base64Audio = await geminiService.generateSpeech(promptText);
            
            // Convert base64 to Blob URL for playback
            const byteCharacters = atob(base64Audio);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            
            // Simple WAV Header injection for 24kHz Mono 16-bit PCM
            const wavHeader = createWavHeader(byteArray.length, 24000, 1, 16);
            const wavBlob = new Blob([wavHeader, byteArray], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(wavBlob);
            
            handleShotChange(shot.id, 'audioUrl', audioUrl);
            addToast("TTS Audio Generated", 'success');

        } catch (error) {
            addToast("Failed to generate speech", 'error');
        } finally {
            setIsGeneratingTTS(null);
        }
    };

    const handleAutoFoley = async (shot: Shot) => {
        if (!shot.generatedVideoUrl) {
            addToast("Please generate or attach a video first.", 'error');
            return;
        }

        setIsAutoFoleyRunning(shot.id);
        try {
            // 1. Analyze Video for SFX Events
            addToast("Analyzing visual events...", 'info');
            const events = await geminiService.analyzeVideoForSFX(shot.generatedVideoUrl);
            
            if (events.length === 0) {
                addToast("No distinct audio events found.", 'info');
                setIsAutoFoleyRunning(null);
                return;
            }

            const processedEvents: SFXEvent[] = [];

            // 2. Generate Audio for each event
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
                    
                    // Simple WAV Header injection for 24kHz Mono 16-bit PCM
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

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, shotId: number) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            handleShotChange(shotId, 'audioUrl', url);
            addToast("Audio track attached.", 'success');
        }
    };

    // Prepare Character Options
    const characterOptions = [
        { value: '', label: 'No Specific Actor' },
        ...savedCharacters.map(c => ({ value: c.id, label: c.name }))
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
                                            {/* Visual Chain Link Between Cards */}
                                            {index > 0 && (
                                                <div className="flex justify-center -my-3 relative z-10">
                                                    <div 
                                                        className={`rounded-full p-1.5 border shadow-md transition-colors ${
                                                            shot.visualLink 
                                                            ? 'bg-green-900/80 border-green-500/50 text-green-400' 
                                                            : 'bg-slate-800 border-slate-600 text-slate-500'
                                                        }`}
                                                    >
                                                        <Icon name="sliders" className="w-3 h-3 rotate-90" />
                                                    </div>
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

                                                <div className="mt-2 grid grid-cols-1 gap-4">
                                                    <SelectInput
                                                        label="Cast Actor (Optional)"
                                                        name={`shot-${shot.id}-actor`}
                                                        value={shot.characterId || ''}
                                                        options={characterOptions}
                                                        onChange={(e) => handleShotChange(shot.id, 'characterId', e.target.value)}
                                                        info="Select a detailed character from your Bank to override the default description."
                                                        disabled={isSequencing}
                                                    />
                                                    <TextAreaInput
                                                        label={t.actionLabel}
                                                        name={`shot-${shot.id}-action`}
                                                        value={shot.action}
                                                        onChange={(e) => handleShotChange(shot.id, 'action', e.target.value)}
                                                        placeholder={t.actionPlaceholder}
                                                        rows={2}
                                                        disabled={isSequencing}
                                                    />
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <TextAreaInput
                                                            label={t.cameraLabel}
                                                            name={`shot-${shot.id}-camera`}
                                                            value={shot.camera}
                                                            onChange={(e) => handleShotChange(shot.id, 'camera', e.target.value)}
                                                            placeholder={t.cameraPlaceholder}
                                                            rows={1}
                                                            disabled={isSequencing}
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
                                                    
                                                    {/* Audio Controls */}
                                                    <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/30 flex items-center gap-3">
                                                        <div className="flex-shrink-0">
                                                            <Icon name="audio" className="w-5 h-5 text-slate-500" />
                                                        </div>
                                                        <div className="flex-grow flex gap-2">
                                                            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 cursor-pointer text-xs font-medium text-slate-300 transition-colors">
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
                                                                onClick={() => handleGenerateTTS(shot)}
                                                                disabled={isGeneratingTTS === shot.id || isSequencing}
                                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
                                                            >
                                                                {isGeneratingTTS === shot.id ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="magic" className="w-3 h-3" />}
                                                                <span>Generate TTS</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleAutoFoley(shot)}
                                                                disabled={isAutoFoleyRunning === shot.id || !shot.generatedVideoUrl || isSequencing}
                                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-purple-900/30 border border-purple-600/50 hover:bg-purple-900/50 text-xs font-medium text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Analyze video and generate SFX"
                                                            >
                                                                {isAutoFoleyRunning === shot.id ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="sparkles" className="w-3 h-3" />}
                                                                <span>Auto-Foley</span>
                                                            </button>
                                                        </div>
                                                        {(shot.audioUrl || (shot.sfx && shot.sfx.length > 0)) && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                                {shot.sfx && shot.sfx.length > 0 && <span>{shot.sfx.length} SFX</span>}
                                                                {shot.audioUrl && <span>Voice</span>}
                                                            </div>
                                                        )}
                                                    </div>
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
                                    {generatedPrompts.map((prompt, index) => (
                                        <div key={index} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 hover:border-cyan-500/30 transition-colors animate-fade-in-up">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.shot} {index + 1}</span>
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
                                        </div>
                                    ))}
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
                </div>
            </div>
            
            {/* Timeline Player Modal */}
            {isPlayingMovie && (
                <TimelinePlayer 
                    shots={shots} 
                    onClose={() => setIsPlayingMovie(false)} 
                />
            )}
        </>
    );
};

export default StoryBoard;
