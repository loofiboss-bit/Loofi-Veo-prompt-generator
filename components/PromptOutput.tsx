import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Icon from './Icon';
import { GroundingChunk } from '../types';
import { useHistoryState } from '../hooks/useHistoryState';

interface PromptOutputProps {
  prompt: string;
  groundingChunks?: GroundingChunk[];
  storyboardImages: string[];
  onSave: (newPrompt: string) => void;
  copiedText: string;
  editText: string;
  saveText: string;
  cancelText: string;
  undoText: string;
  redoText: string;
  onSaveToHistory: () => void;
  saveToHistoryText: string;
  onGenerateArt: (prompt: string) => void;
  isGeneratingArt: boolean;
  generateArtText: string;
  loadingArtText: string;
  onGenerateVideo: (prompt: string) => void;
  isGeneratingVideo: boolean;
  generateVideoText: string;
  loadingVideoText: string;
  onGenerateStoryboard: (prompt: string) => void;
  isGeneratingStoryboard: boolean;
  generateStoryboardText: string;
  loadingStoryboardText: string;
  onGenerateVariations: (prompt: string) => void;
  isGeneratingVariations: boolean;
  generateVariationsText: string;
  loadingVariationsText: string;
  onShare: () => void;
  shareText: string;
  onDownload: (prompt: string) => void;
}

interface Episode {
    title: string;
    description: string;
}

const parseSeries = (promptText: string): { isSeries: boolean; content: Episode[] | string } => {
    // A series is identified by markdown h3 headers.
    if (!promptText.trim().includes('###')) {
        return { isSeries: false, content: promptText };
    }

    const parts = promptText.split(/(?:^|\n)###\s*/).filter(p => p.trim());
    if (parts.length <= 1) {
        return { isSeries: false, content: promptText };
    }

    const episodes = parts.map(part => {
        const lines = part.split('\n');
        const title = lines[0].trim();
        const description = lines.slice(1).join('\n').trim();
        return { title, description };
    }).filter(e => e.title && e.description);

    if (episodes.length > 0) {
        return { isSeries: true, content: episodes };
    }

    return { isSeries: false, content: promptText };
};


const PromptOutput: React.FC<PromptOutputProps> = ({
  prompt, groundingChunks, storyboardImages, onSave, copiedText, editText, saveText, cancelText,
  undoText, redoText,
  onSaveToHistory, saveToHistoryText,
  onGenerateArt, isGeneratingArt, generateArtText, loadingArtText,
  onGenerateVideo, isGeneratingVideo, generateVideoText, loadingVideoText,
  onGenerateStoryboard, isGeneratingStoryboard, generateStoryboardText, loadingStoryboardText,
  onGenerateVariations, isGeneratingVariations, generateVariationsText, loadingVariationsText,
  onShare, shareText, onDownload
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { 
    state: editedPrompt, 
    setState: setEditedPrompt, 
    undo: undoEdit, 
    redo: redoEdit, 
    reset: resetEditHistory,
    canUndo: canUndoEdit, 
    canRedo: canRedoEdit 
  } = useHistoryState(prompt);
  
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);

  const seriesData = useMemo(() => parseSeries(prompt), [prompt]);

  useEffect(() => {
    if (!isEditing) {
      resetEditHistory(prompt);
    }
  }, [prompt, isEditing, resetEditHistory]);

  const handleCopy = useCallback(() => {
    const textToCopy = isEditing ? editedPrompt : prompt;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setCopyStatus(copiedText);
      setIsFlashing(true);
      setTimeout(() => {
        setCopied(false);
        setCopyStatus('');
      }, 2000);
      setTimeout(() => {
        setIsFlashing(false);
      }, 600);
    });
  }, [prompt, isEditing, editedPrompt, copiedText]);

  const handleEdit = () => setIsEditing(true);

  const handleSave = () => {
    onSave(editedPrompt);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Standard Undo/Redo shortcuts
    const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
    const isRedo = 
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || 
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z');

    if (isUndo) {
      e.preventDefault();
      undoEdit();
    } else if (isRedo) {
      e.preventDefault();
      redoEdit();
    }
  };
  
  const handleGenerateArt = () => {
      onGenerateArt(isEditing ? editedPrompt : prompt);
  };

  const handleGenerateVideo = () => {
      onGenerateVideo(isEditing ? editedPrompt : prompt);
  };
  
  const handleGenerateStoryboard = () => {
      onGenerateStoryboard(isEditing ? editedPrompt : prompt);
  };
  
  const handleGenerateVariations = () => {
    onGenerateVariations(isEditing ? editedPrompt : prompt);
  };
  
  const handleDownload = () => {
      onDownload(isEditing ? editedPrompt : prompt);
  };

  const ControlButton: React.FC<{onClick: () => void; iconName: React.ComponentProps<typeof Icon>['name']; children: React.ReactNode; 'aria-label': string; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; isLoading?: boolean}> = ({ onClick, iconName, children, 'aria-label': ariaLabel, variant = 'ghost', disabled, isLoading }) => {
    
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
            disabled={disabled || isLoading}
        >
            {isLoading ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name={iconName} className="w-4 h-4" />}
            <span>{children}</span>
        </button>
    );
  };

  return (
    <div className={`bg-slate-900/60 backdrop-blur-lg rounded-2xl border border-slate-700 shadow-2xl shadow-black/30 ${isFlashing ? 'animate-flash-border' : ''}`}>
      <div className="sr-only" role="status" aria-live="polite">
        {copyStatus}
      </div>
      <div className="flex flex-wrap items-center justify-between p-3 bg-slate-800/50 rounded-t-2xl border-b border-slate-700 gap-2 relative">
        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? (
            <>
              <ControlButton onClick={handleSave} iconName="check" aria-label="Save changes" variant="primary">{saveText}</ControlButton>
              <ControlButton onClick={handleCancel} iconName="cancel" aria-label="Cancel editing" variant="secondary">{cancelText}</ControlButton>
              <div className="border-l border-slate-700 h-5 mx-1"></div>
              <ControlButton onClick={undoEdit} iconName="undo" aria-label={undoText} disabled={!canUndoEdit}>{undoText}</ControlButton>
              <ControlButton onClick={redoEdit} iconName="redo" aria-label={redoText} disabled={!canRedoEdit}>{redoText}</ControlButton>
            </>
          ) : (
            <>
              <ControlButton onClick={handleGenerateVideo} iconName="video" aria-label="Generate video" disabled={isGeneratingArt || isGeneratingStoryboard || isGeneratingVariations} isLoading={isGeneratingVideo} variant="primary">{isGeneratingVideo ? loadingVideoText : generateVideoText}</ControlButton>
              <ControlButton onClick={handleGenerateArt} iconName="palette" aria-label="Generate concept art" disabled={isGeneratingVideo || isGeneratingStoryboard || isGeneratingVariations} isLoading={isGeneratingArt} variant="ghost">{isGeneratingArt ? loadingArtText : generateArtText}</ControlButton>
              <ControlButton onClick={handleGenerateStoryboard} iconName="film" aria-label="Generate storyboard" disabled={isGeneratingArt || isGeneratingVideo || isGeneratingVariations} isLoading={isGeneratingStoryboard} variant="ghost">{isGeneratingStoryboard ? loadingStoryboardText : generateStoryboardText}</ControlButton>
              <ControlButton onClick={handleGenerateVariations} iconName="sparkles" aria-label="Generate prompt variations" disabled={isGeneratingArt || isGeneratingVideo || isGeneratingVariations} isLoading={isGeneratingVariations} variant="ghost">{isGeneratingVariations ? loadingVariationsText : generateVariationsText}</ControlButton>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
            {!isEditing && <ControlButton onClick={handleEdit} iconName="edit" aria-label="Edit prompt" variant="secondary">{editText}</ControlButton> }
            <div className="border-l border-slate-700 h-5 mx-1"></div>
            <ControlButton onClick={onSaveToHistory} iconName="save" aria-label={saveToHistoryText} variant="ghost">{saveToHistoryText}</ControlButton>
            <ControlButton onClick={onShare} iconName="share" aria-label="Share prompt" variant="ghost">{shareText}</ControlButton>
            <button onClick={handleDownload} className="p-2 rounded-md text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors" aria-label="Download prompt"><Icon name="download" className="w-4 h-4" /></button>
            <button onClick={handleCopy} className="p-2 rounded-md text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors" aria-label="Copy prompt">{copied ? <Icon name="check" className="w-4 h-4 text-green-400" /> : <Icon name="copy" className="w-4 h-4" />}</button>
        </div>
         {copied && (
            <span className="absolute top-1/2 -translate-y-1/2 right-full mr-3 text-sm text-green-400 bg-slate-700 px-2 py-1 rounded-md shadow-md whitespace-nowrap" aria-hidden="true">
                {copiedText}
            </span>
        )}
      </div>

      <div className="p-4 sm:p-6">
        {isEditing ? (
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg shadow-sm text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 transition duration-150 ease-in-out p-3 resize-y"
            aria-label="Prompt editing area"
          />
        ) : seriesData.isSeries ? (
          <div className="space-y-4 animate-fade-in-up">
            {(seriesData.content as Episode[]).map((episode, index) => (
              <div key={index} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <h4 className="font-semibold text-cyan-400 mb-1">{episode.title}</h4>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{episode.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap min-h-[5rem] animate-fade-in-up">
            {seriesData.content as string}
          </p>
        )}
      </div>

      {storyboardImages.length > 0 && (
        <div className="border-t border-slate-700 p-4 sm:p-6 animate-fade-in-up">
            <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center">
                <Icon name="film" className="w-4 h-4 mr-2 text-cyan-400" />
                <span>Storyboard</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {storyboardImages.map((image, index) => (
                    <div key={index} className="aspect-video bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-700/50 shadow-md">
                        <img src={image} alt={`Storyboard frame ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>
        </div>
      )}

      {groundingChunks && groundingChunks.filter(c => c.web).length > 0 && (
        <div className="border-t border-slate-700 p-4 sm:p-6 animate-fade-in-up">
          <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center">
            <Icon name="globe" className="w-4 h-4 mr-2 text-cyan-400" />
            <span>Sources from Google Search</span>
          </h4>
          <ul className="space-y-2 pl-2">
            {groundingChunks.map((chunk, index) =>
              chunk.web ? (
                <li key={index} className="flex items-start">
                  <span className="text-cyan-400 mr-3 mt-1 text-xs">●</span>
                  <a
                    href={chunk.web.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-300 hover:text-cyan-400 transition-colors text-sm underline decoration-slate-600 hover:decoration-cyan-400 underline-offset-2"
                    title={chunk.web.uri}
                  >
                    {chunk.web.title}
                  </a>
                </li>
              ) : null
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PromptOutput;
