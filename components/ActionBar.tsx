import React, { useState, useCallback, useRef } from 'react';
import Icon from './Icon';
import { PromptState, VeoPromptResponse, ToastMessage } from '../types';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { decode, decodeAudioData } from '../utils/audio';

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
    onSavePrompt: (newPrompt: string) => void;
    onSetIsEditing: (isEditing: boolean) => void;
    onSetEditedPrompt: (prompt: string) => void;

    canUndoEdit: boolean;
    onUndoEdit: () => void;
    canRedoEdit: boolean;
    onRedoEdit: () => void;
    
    isGeneratingArt: boolean;
    onGenerateArt: (prompt: string) => void;
    isGeneratingVideo: boolean;
    onGenerateVideo: (prompt: string) => void;
    isGeneratingStoryboard: boolean;
    onGenerateStoryboard: (prompt: string) => void;
    isGeneratingVariations: boolean;
    onGenerateVariations: (prompt: string) => void;
    
    onSaveToHistory: () => void;
    onShare: () => void;
    onDownload: (prompt: string) => void;
}

const ControlButton: React.FC<{
    onClick: () => void;
    iconName: React.ComponentProps<typeof Icon>['name'];
    children: React.ReactNode;
    'aria-label': string;
    title: string;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    isLoading?: boolean;
}> = ({ onClick, iconName, children, 'aria-label': ariaLabel, title, variant = 'ghost', disabled, isLoading }) => {
    
    const baseClasses = "flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
        primary: 'bg-cyan-600 text-white hover:bg-cyan-500 disabled:bg-cyan-600/50 shadow-md shadow-cyan-500/20',
        secondary: 'bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:bg-slate-700/50',
        ghost: 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
    };
    
    return (
        <button
            onClick={onClick}
            className={`${baseClasses} ${variantClasses[variant]}`}
            aria-label={ariaLabel}
            title={title}
            disabled={disabled || isLoading}
        >
            {isLoading ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name={iconName} className="w-4 h-4" />}
            <span>{children}</span>
        </button>
    );
};


const ActionBar: React.FC<ActionBarProps> = (props) => {
    const {
        uiStrings: t, promptState, generatedPrompt, isLoading, isEditing, editedPrompt, errors, addToast,
        onGeneratePrompt, onSavePrompt, onSetIsEditing,
        canUndoEdit, onUndoEdit, canRedoEdit, onRedoEdit,
        isGeneratingArt, onGenerateArt, isGeneratingVideo, onGenerateVideo,
        isGeneratingStoryboard, onGenerateStoryboard, isGeneratingVariations, onGenerateVariations,
        onSaveToHistory, onShare, onDownload
    } = props;
    
    const [copied, setCopied] = useState(false);
    const [isReadingAloud, setIsReadingAloud] = useState(false);
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


    const anyActionInProgress = isLoading || isGeneratingArt || isGeneratingVideo || isGeneratingStoryboard || isGeneratingVariations || isReadingAloud;

    return (
        <div className="h-20 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                {generatedPrompt && (
                    <p className="text-sm text-slate-400 truncate hidden md:block" title={currentPromptText}>
                        <span className="font-semibold text-slate-300">Current Prompt: </span>{currentPromptText}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {!generatedPrompt ? (
                    <button 
                        onClick={onGeneratePrompt}
                        disabled={isLoading || Object.keys(errors).length > 0 || !promptState.idea}
                        className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105"
                        title={t.tooltips.generateButton}
                    >
                        {isLoading ? <Icon name="spinner" className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" /> : <Icon name="magic" className="w-5 h-5 mr-2" />}
                        {t.generateButton}
                    </button>
                ) : isEditing ? (
                    <>
                        <ControlButton onClick={handleSave} iconName="check" aria-label="Save changes" variant="primary" title={t.tooltips.saveButton}>{t.saveButton}</ControlButton>
                        <ControlButton onClick={handleCancel} iconName="cancel" aria-label="Cancel editing" variant="secondary" title={t.tooltips.cancelButton}>{t.cancelButton}</ControlButton>
                        <div className="border-l border-slate-700 h-5 mx-1"></div>
                        <ControlButton onClick={onUndoEdit} iconName="undo" aria-label={t.undoButton} disabled={!canUndoEdit} title={t.tooltips.undoButton}>{t.undoButton}</ControlButton>
                        <ControlButton onClick={onRedoEdit} iconName="redo" aria-label={t.redoButton} disabled={!canRedoEdit} title={t.tooltips.redoButton}>{t.redoButton}</ControlButton>
                    </>
                ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                        <ControlButton onClick={() => onGenerateVideo(currentPromptText)} iconName="video" aria-label="Generate video" disabled={anyActionInProgress} isLoading={isGeneratingVideo} variant="primary" title={t.tooltips.generateVideoButton}>{isGeneratingVideo ? t.loadingVideoButton : t.generateVideoButton}</ControlButton>
                        <ControlButton onClick={() => onGenerateArt(currentPromptText)} iconName="palette" aria-label="Generate concept art" disabled={anyActionInProgress} isLoading={isGeneratingArt} title={t.tooltips.conceptArtButton}>{isGeneratingArt ? t.loadingArtButton : t.generateArtButton}</ControlButton>
                        <ControlButton onClick={() => onGenerateStoryboard(currentPromptText)} iconName="film" aria-label="Generate storyboard" disabled={anyActionInProgress} isLoading={isGeneratingStoryboard} title={t.tooltips.storyboardButton}>{isGeneratingStoryboard ? t.loadingStoryboardButton : t.generateStoryboardButton}</ControlButton>
                        <ControlButton onClick={() => onGenerateVariations(currentPromptText)} iconName="sparkles" aria-label="Generate prompt variations" disabled={anyActionInProgress} isLoading={isGeneratingVariations} title={t.tooltips.variationsButton}>{isGeneratingVariations ? t.loadingVariationsButton : t.generateVariationsButton}</ControlButton>
                        <div className="border-l border-slate-700 h-5 mx-1"></div>
                        <ControlButton onClick={handleEdit} iconName="edit" aria-label="Edit prompt" variant="secondary" title={t.tooltips.editButton}>{t.editButton}</ControlButton>
                        <div className="border-l border-slate-700 h-5 mx-1"></div>
                        <ControlButton onClick={onSaveToHistory} iconName="save" aria-label={t.saveToHistoryButton} title={t.tooltips.saveToHistoryButton}>{t.saveToHistoryButton}</ControlButton>
                        <ControlButton onClick={onShare} iconName="share" aria-label="Share prompt" title={t.tooltips.shareButton}>{t.shareButton}</ControlButton>
                        <button onClick={() => onDownload(currentPromptText)} className="p-2 rounded-md text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors" aria-label="Download prompt" title={t.tooltips.downloadButton}><Icon name="download" className="w-4 h-4" /></button>
                        <button onClick={handleReadAloud} disabled={anyActionInProgress} className="p-2 rounded-md text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors disabled:opacity-50" aria-label="Read prompt aloud" title={t.tooltips.readAloudButton}><Icon name="audio" className="w-4 h-4" /></button>
                        <button onClick={handleCopy} className="p-2 rounded-md text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors" aria-label="Copy prompt" title={t.tooltips.copyButton}>{copied ? <Icon name="check" className="w-4 h-4 text-green-400" /> : <Icon name="copy" className="w-4 h-4" />}</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionBar;