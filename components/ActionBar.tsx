
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Icon from './Icon';
import { PromptState, VeoPromptResponse, ToastMessage } from '../types';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { decode, decodeAudioData } from '../utils/audio';
import QualityMeter from './QualityMeter';

interface ActionBarProps {
    uiStrings: any;
    promptState: PromptState;
    generatedPrompt: VeoPromptResponse | null;
    isLoading: boolean;
    isEditing: boolean;
    editedPrompt: string;
    errors: Partial<Record<keyof PromptState, string>>;
    addToast: (message: string, type: ToastMessage['type']) => void;
    
    onGeneratePrompt: () => void;
    onNewPrompt: () => void;
    onSavePrompt: (newPrompt: string) => void;
    onSetIsEditing: (isEditing: boolean) => void;
    onSetEditedPrompt: (prompt: string) => void;

    canUndoEdit: boolean;
    onUndoEdit: () => void;
    canRedoEdit: boolean;
    onRedoEdit: () => void;

    // Global History Props
    canUndoPromptState?: boolean;
    onUndoPromptState?: () => void;
    canRedoPromptState?: boolean;
    onRedoPromptState?: () => void;
    
    isGeneratingArt: boolean;
    onGenerateArt: (prompt: string) => void;
    isGeneratingVideo: boolean;
    onGenerateVideo: (prompt: string) => void;
    isGeneratingStoryboard: boolean;
    onGenerateStoryboard: (prompt: string) => void;
    isGeneratingVariations: boolean;
    onGenerateVariations: (prompt: string) => void;
    isRefining: boolean;
    onRefinePrompt: (prompt: string) => void;
    isRestructuring: boolean;
    onRestructurePrompt: (prompt: string) => void;
    
    onSaveToHistory: () => void;
    onShare: () => void;
    onDownload: (prompt: string) => void;
    onOpenSavePresetModal: () => void;
    onOpenTemplatesPanel: () => void;
    onCompareModels: () => void;
}

const ControlButton: React.FC<{
    onClick?: () => void;
    iconName: React.ComponentProps<typeof Icon>['name'];
    children: React.ReactNode;
    'aria-label': string;
    title?: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'dropdown-trigger';
    disabled?: boolean;
    isLoading?: boolean;
    className?: string;
}> = ({ onClick, iconName, children, 'aria-label': ariaLabel, title, variant = 'ghost', disabled, isLoading, className = '' }) => {
    
    const baseClasses = "flex items-center space-x-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

    const variantClasses = {
        primary: 'bg-cyan-600 text-white hover:bg-cyan-500 disabled:bg-cyan-600/50 shadow-md shadow-cyan-500/20',
        secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 disabled:bg-slate-700/50',
        ghost: 'text-slate-200 hover:bg-slate-700/60 hover:text-white',
        'dropdown-trigger': 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
    };
    
    return (
        <button
            onClick={onClick}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            aria-label={ariaLabel}
            title={title || ariaLabel}
            disabled={disabled || isLoading}
        >
            {isLoading ? <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" /> : <Icon name={iconName} className="w-3.5 h-3.5" />}
            <span>{children}</span>
        </button>
    );
};

const DropdownMenu: React.FC<{
    triggerLabel: string;
    triggerIcon: React.ComponentProps<typeof Icon>['name'];
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
}> = ({ triggerLabel, triggerIcon, children, isOpen, onToggle, onClose }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    return (
        <div className="relative" ref={ref}>
            <ControlButton 
                onClick={onToggle} 
                iconName={triggerIcon} 
                aria-label={triggerLabel} 
                variant="dropdown-trigger"
                className={isOpen ? 'ring-2 ring-cyan-500/50 border-cyan-500/50' : ''}
            >
                {triggerLabel}
                <Icon name="chevron-down" className={`w-3 h-3 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </ControlButton>
            
            {isOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-48 bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden z-50 animate-fade-in-up origin-bottom-left">
                    <div className="p-1 space-y-0.5">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

const DropdownItem: React.FC<{
    onClick: () => void;
    iconName: React.ComponentProps<typeof Icon>['name'];
    label: string;
    disabled?: boolean;
    isLoading?: boolean;
}> = ({ onClick, iconName, label, disabled, isLoading }) => (
    <button
        onClick={onClick}
        disabled={disabled || isLoading}
        className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/80 rounded-lg transition-colors disabled:opacity-50 text-left"
    >
        <div className="w-5 flex justify-center">
            {isLoading ? <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" /> : <Icon name={iconName} className="w-3.5 h-3.5 text-cyan-400" />}
        </div>
        <span>{label}</span>
    </button>
);


const ActionBar: React.FC<ActionBarProps> = (props) => {
    const {
        uiStrings: t, promptState, generatedPrompt, isLoading, isEditing, editedPrompt, errors, addToast,
        onGeneratePrompt, onNewPrompt, onSavePrompt, onSetIsEditing,
        canUndoEdit, onUndoEdit, canRedoEdit, onRedoEdit,
        canUndoPromptState, onUndoPromptState, canRedoPromptState, onRedoPromptState,
        isGeneratingArt, onGenerateArt, isGeneratingVideo, onGenerateVideo,
        isGeneratingStoryboard, onGenerateStoryboard, isGeneratingVariations, onGenerateVariations,
        isRefining, onRefinePrompt, isRestructuring, onRestructurePrompt,
        onSaveToHistory, onShare, onDownload, onOpenSavePresetModal, onOpenTemplatesPanel, onCompareModels
    } = props;
    
    const [copied, setCopied] = useState(false);
    const [isReadingAloud, setIsReadingAloud] = useState(false);
    const [creativeMenuOpen, setCreativeMenuOpen] = useState(false);
    const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const currentPromptText = isEditing ? editedPrompt : (generatedPrompt?.prompt || '');

    const handleCopy = useCallback(() => {
        if (!currentPromptText) return;
        navigator.clipboard.writeText(currentPromptText).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }, [currentPromptText]);

    const handleSave = () => onSavePrompt(editedPrompt);
    const handleCancel = () => onSetIsEditing(false);
    const handleEdit = () => onSetIsEditing(true);
    
    const handleReadAloud = async () => {
        if (isReadingAloud || !currentPromptText) return;
        
        setIsReadingAloud(true);
        try {
            const base64Audio = await geminiService.generateSpeech(currentPromptText);
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const ctx = audioContextRef.current;
            
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            const decodedBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(decodedBytes, ctx, 24000, 1);
            
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
            }

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.onended = () => {
                setIsReadingAloud(false);
                audioSourceRef.current = null;
            };
            source.start();
            audioSourceRef.current = source;
        } catch (error) {
            addToast(getApiErrorMessage(error, t), 'error');
            setIsReadingAloud(false);
        }
    };


    const anyActionInProgress = isLoading || isGeneratingArt || isGeneratingVideo || isGeneratingStoryboard || isGeneratingVariations || isRefining || isRestructuring || isReadingAloud;
    const isVeoAspectRatioInvalid = promptState.aspectRatio !== '16:9' && promptState.aspectRatio !== '9:16';

    return (
        <div className="flex flex-col gap-3 py-2 w-full">
            {/* Top Row: Current Prompt Text or Primary Actions */}
            <div className="w-full">
                {!generatedPrompt ? (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ControlButton onClick={onOpenTemplatesPanel} iconName="template" aria-label={t.templatesButton} title={t.tooltips.templatesButton}>{t.templatesButton}</ControlButton>
                            <ControlButton onClick={onOpenSavePresetModal} iconName="plus" aria-label={t.saveAsPresetButton} title={t.tooltips.saveAsPresetButton}>{t.saveAsPresetButton}</ControlButton>
                            {onUndoPromptState && (
                                <>
                                    <div className="border-l border-slate-700 h-4 mx-1"></div>
                                    <ControlButton onClick={onUndoPromptState} iconName="undo" aria-label={t.undoButton} disabled={!canUndoPromptState} title={t.tooltips.undoButton}>{t.undoButton}</ControlButton>
                                    <ControlButton onClick={onRedoPromptState} iconName="redo" aria-label={t.redoButton} disabled={!canRedoPromptState} title={t.tooltips.redoButton}>{t.redoButton}</ControlButton>
                                </>
                            )}
                            <div className="border-l border-slate-700 h-4 mx-1"></div>
                            <ControlButton onClick={onCompareModels} iconName="compare" aria-label={t.compareModelsButton} disabled={!promptState.idea} title={t.compareModelsButton}>Compare</ControlButton>
                        </div>
                        
                        {/* Prompt Quality Meter */}
                        <div className="hidden md:block">
                            <QualityMeter promptState={promptState} />
                        </div>
                    </div>
                ) : (
                     <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                        <p className="text-xs text-slate-300 truncate font-mono" title={currentPromptText}>
                            <span className="font-semibold text-cyan-500">PROMPT: </span>{currentPromptText}
                        </p>
                        <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors" title={t.tooltips.copyButton}>
                            {copied ? <Icon name="check" className="w-3.5 h-3.5 text-green-400" /> : <Icon name="copy" className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Row: Actions Toolbar */}
            <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex-1 md:hidden">
                     {/* Mobile Quality Meter position */}
                     {!generatedPrompt && <QualityMeter promptState={promptState} />}
                </div>
                <div className="flex-1 hidden md:block"></div>
                
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {!generatedPrompt ? (
                        <button 
                            onClick={onGeneratePrompt}
                            disabled={isLoading || Object.keys(errors).length > 0 || !promptState.idea}
                            className="flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-xl text-white bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 shadow-[0_0_8px_rgba(34,211,238,0.3)] hover:shadow-[0_0_18px_rgba(34,211,238,0.5)] w-full sm:w-auto"
                            title={t.tooltips.generateButton}
                            data-tutorial-id="generate-prompt-button"
                        >
                            {isLoading ? <Icon name="spinner" className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" /> : <Icon name="magic" className="w-4 h-4 mr-2" />}
                            {isLoading ? (t.loadingGenerateButton || "Architecting...") : t.generateButton}
                        </button>
                    ) : isEditing ? (
                        <>
                            <ControlButton onClick={handleSave} iconName="check" aria-label="Save changes" variant="primary" title={t.tooltips.saveButton}>{t.saveButton}</ControlButton>
                            <ControlButton onClick={handleCancel} iconName="cancel" aria-label="Cancel editing" variant="secondary" title={t.tooltips.cancelButton}>{t.cancelButton}</ControlButton>
                            <div className="border-l border-slate-700 h-4 mx-1"></div>
                            <ControlButton onClick={onUndoEdit} iconName="undo" aria-label={t.undoButton} disabled={!canUndoEdit} title={t.tooltips.undoButton}>{t.undoButton}</ControlButton>
                            <ControlButton onClick={onRedoEdit} iconName="redo" aria-label={t.redoButton} disabled={!canRedoEdit} title={t.tooltips.redoButton}>{t.redoButton}</ControlButton>
                        </>
                    ) : (
                        <>
                            {/* Primary Actions */}
                            <ControlButton onClick={onNewPrompt} iconName="plus" aria-label={t.newButton} title={t.tooltips.newButtonTooltip} disabled={anyActionInProgress} variant="secondary">{t.newButton}</ControlButton>
                            <ControlButton onClick={onGeneratePrompt} iconName="sparkles" aria-label={t.updateButton} title={t.tooltips.updateButtonTooltip} disabled={anyActionInProgress} isLoading={isLoading} variant="secondary">{isLoading ? t.loadingUpdateButton : t.updateButton}</ControlButton>
                            <ControlButton 
                                onClick={() => onGenerateVideo(currentPromptText)} 
                                iconName="video" 
                                aria-label="Generate video" 
                                disabled={anyActionInProgress || isVeoAspectRatioInvalid} 
                                isLoading={isGeneratingVideo} 
                                variant="primary" 
                                title={isVeoAspectRatioInvalid ? t.errorInvalidAspectRatioForVeo : t.tooltips.generateVideoButton}
                            >
                                {isGeneratingVideo ? t.loadingVideoButton : t.generateVideoButton}
                            </ControlButton>
                            
                            <div className="border-l border-slate-700 h-4 mx-1"></div>
                            
                            {/* Group: Creative Tools (Dropdown) */}
                            <DropdownMenu 
                                triggerLabel="Creative" 
                                triggerIcon="palette" 
                                isOpen={creativeMenuOpen} 
                                onToggle={() => setCreativeMenuOpen(!creativeMenuOpen)} 
                                onClose={() => setCreativeMenuOpen(false)}
                            >
                                <DropdownItem onClick={() => { onGenerateArt(currentPromptText); setCreativeMenuOpen(false); }} iconName="image" label={isGeneratingArt ? t.loadingArtButton : t.generateArtButton} isLoading={isGeneratingArt} disabled={anyActionInProgress} />
                                <DropdownItem onClick={() => { onGenerateStoryboard(currentPromptText); setCreativeMenuOpen(false); }} iconName="film" label={isGeneratingStoryboard ? t.loadingStoryboardButton : t.generateStoryboardButton} isLoading={isGeneratingStoryboard} disabled={anyActionInProgress} />
                                <DropdownItem onClick={() => { onGenerateVariations(currentPromptText); setCreativeMenuOpen(false); }} iconName="sparkles" label={isGeneratingVariations ? t.loadingVariationsButton : t.generateVariationsButton} isLoading={isGeneratingVariations} disabled={anyActionInProgress} />
                                <DropdownItem onClick={() => { onRefinePrompt(currentPromptText); setCreativeMenuOpen(false); }} iconName="magic" label={isRefining ? t.loadingRefineButton : t.refineButton} isLoading={isRefining} disabled={anyActionInProgress} />
                                <DropdownItem onClick={() => { onRestructurePrompt(currentPromptText); setCreativeMenuOpen(false); }} iconName="sliders" label={isRestructuring ? t.loadingRestructureButton : t.restructureButton} isLoading={isRestructuring} disabled={anyActionInProgress} />
                            </DropdownMenu>

                            {/* Group: Tools & Management (Dropdown) */}
                            <DropdownMenu 
                                triggerLabel="Tools" 
                                triggerIcon="sliders" 
                                isOpen={toolsMenuOpen} 
                                onToggle={() => setToolsMenuOpen(!toolsMenuOpen)} 
                                onClose={() => setToolsMenuOpen(false)}
                            >
                                <DropdownItem onClick={handleEdit} iconName="edit" label={t.editButton} disabled={anyActionInProgress} />
                                <DropdownItem onClick={onOpenTemplatesPanel} iconName="template" label={t.templatesButton} disabled={anyActionInProgress} />
                                <DropdownItem onClick={onSaveToHistory} iconName="save" label={t.saveToHistoryButton} disabled={anyActionInProgress} />
                                <DropdownItem onClick={onOpenSavePresetModal} iconName="plus" label={t.saveAsPresetButton} disabled={anyActionInProgress} />
                            </DropdownMenu>
                            
                            <div className="border-l border-slate-700 h-4 mx-1"></div>
                            
                            {/* Icons Only Group */}
                            <div className="flex items-center gap-1">
                                <button onClick={onShare} className="p-2 rounded-lg text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors" aria-label="Share prompt" title={t.tooltips.shareButton}><Icon name="share" className="w-3.5 h-3.5" /></button>
                                <button onClick={() => onDownload(currentPromptText)} className="p-2 rounded-lg text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors" aria-label="Download prompt" title={t.tooltips.downloadButton}><Icon name="download" className="w-3.5 h-3.5" /></button>
                                <button onClick={handleReadAloud} disabled={anyActionInProgress} className="p-2 rounded-lg text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors disabled:opacity-50" aria-label="Read prompt aloud" title="Read prompt aloud"><Icon name="audio" className="w-3.5 h-3.5" /></button>
                                <button onClick={handleCopy} className="p-2 rounded-lg text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors" aria-label="Copy prompt" title={t.tooltips.copyButton}>{copied ? <Icon name="check" className="w-4 h-4 text-green-400" /> : <Icon name="copy" className="w-4 h-4" />}</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActionBar;
