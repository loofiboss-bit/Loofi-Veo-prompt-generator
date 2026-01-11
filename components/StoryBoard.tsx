
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import { CHARACTER_LIMITS } from '../constants';
import { ToastMessage } from '../types';
import { generateShotList } from '../utils/pdfExport';

interface StoryBoardProps {
    isOpen: boolean;
    onClose: () => void;
    uiStrings: any;
    addToast: (message: string, type: ToastMessage['type']) => void;
    onGenerateBatch?: (prompts: string[]) => void;
}

interface Shot {
    id: number;
    action: string;
    camera: string;
}

interface GlobalContext {
    style: string;
    character: string;
    setting: string;
}

const StoryBoard: React.FC<StoryBoardProps> = ({ isOpen, onClose, uiStrings, addToast, onGenerateBatch }) => {
    const t = uiStrings.storyBoard;
    
    const [globalContext, setGlobalContext] = useState<GlobalContext>({
        style: '',
        character: '',
        setting: ''
    });

    const [shots, setShots] = useState<Shot[]>([
        { id: 1, action: '', camera: '' }
    ]);

    const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Reset prompts when inputs change essentially makes them "stale"
    useEffect(() => {
        if (generatedPrompts.length > 0) {
            // Optional: clear results if user modifies inputs? 
            // For now, keep them until re-generate is clicked.
        }
    }, [globalContext, shots]);

    const handleAddShot = () => {
        const newId = shots.length > 0 ? Math.max(...shots.map(s => s.id)) + 1 : 1;
        setShots([...shots, { id: newId, action: '', camera: '' }]);
    };

    const handleDeleteShot = (id: number) => {
        if (shots.length <= 1) {
            addToast("You need at least one shot.", 'error');
            return;
        }
        setShots(shots.filter(s => s.id !== id));
    };

    const handleShotChange = (id: number, field: keyof Shot, value: string) => {
        setShots(shots.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const generateAllPromptTexts = () => {
        return shots.map((shot, index) => {
            const parts = [];
            if (globalContext.style) parts.push(`Visual Style: ${globalContext.style}`);
            if (globalContext.setting) parts.push(`Setting: ${globalContext.setting}`);
            
            const char = globalContext.character ? `Character: ${globalContext.character}` : 'Character';
            parts.push(`${char} performing action: ${shot.action}`);
            
            if (shot.camera) parts.push(`Camera: ${shot.camera}`);
            
            return parts.join('. ') + '.';
        });
    };

    const handleBatchGenerate = () => {
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
        
        // Simulate a small delay for "processing" feel, though strictly deterministic text assembly is instant.
        setTimeout(() => {
            const results = generateAllPromptTexts();
            setGeneratedPrompts(results);
            setIsGenerating(false);
            addToast(t.resultsTitle + " Ready", 'success');
        }, 600);
    };

    const handleCopyAll = () => {
        if (generatedPrompts.length === 0) return;
        const text = generatedPrompts.map((p, i) => `Shot ${i+1}:\n${p}`).join('\n\n');
        navigator.clipboard.writeText(text);
        addToast("All prompts copied to clipboard", 'success');
    };

    const handleRenderAllVideos = () => {
        const prompts = generateAllPromptTexts();
        if (prompts.length === 0) return;
        if (onGenerateBatch) {
            onGenerateBatch(prompts);
            onClose(); // Close storyboard to show video studio
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

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[80] p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-slate-900/80 backdrop-blur-xl w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden"
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
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold border border-slate-600 transition-colors"
                            title="Download Shot List as PDF"
                        >
                            <Icon name="download" className="w-4 h-4" />
                            {t.exportPdf || "Export PDF"}
                        </button>
                        {onGenerateBatch && (
                            <button
                                onClick={handleRenderAllVideos}
                                disabled={shots.some(s => !s.action.trim())}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-full text-xs font-bold shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Icon name="video" className="w-4 h-4" />
                                {t.renderAll}
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
                                <button
                                    onClick={handleAddShot}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-full bg-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50 border border-cyan-800/50 transition-colors flex items-center gap-1"
                                >
                                    <Icon name="plus" className="w-3 h-3" />
                                    {t.addShot}
                                </button>
                            </div>

                            <div className="space-y-4">
                                {shots.map((shot, index) => (
                                    <div key={shot.id} className="relative bg-slate-800/20 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors group animate-fade-in-up">
                                        <div className="absolute top-4 left-4 bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                            {t.shot} {index + 1}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteShot(shot.id)}
                                            className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove shot"
                                        >
                                            <Icon name="trash" className="w-4 h-4" />
                                        </button>

                                        <div className="mt-6 grid grid-cols-1 gap-4">
                                            <TextAreaInput
                                                label={t.actionLabel}
                                                name={`shot-${shot.id}-action`}
                                                value={shot.action}
                                                onChange={(e) => handleShotChange(shot.id, 'action', e.target.value)}
                                                placeholder={t.actionPlaceholder}
                                                rows={2}
                                            />
                                            <TextAreaInput
                                                label={t.cameraLabel}
                                                name={`shot-${shot.id}-camera`}
                                                value={shot.camera}
                                                onChange={(e) => handleShotChange(shot.id, 'camera', e.target.value)}
                                                placeholder={t.cameraPlaceholder}
                                                rows={1}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="pt-4">
                            <button
                                onClick={handleBatchGenerate}
                                disabled={isGenerating}
                                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
        </div>
    );
};

export default StoryBoard;
