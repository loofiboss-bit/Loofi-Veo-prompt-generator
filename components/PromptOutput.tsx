import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Icon from './Icon';

interface PromptOutputProps {
  prompt: string;
  onSave: (newPrompt: string) => void;
  copiedText: string;
  editText: string;
  saveText: string;
  cancelText: string;
  onGenerateArt: (prompt: string) => void;
  isGeneratingArt: boolean;
  generateArtText: string;
  onGenerateVideo: (prompt: string) => void;
  isGeneratingVideo: boolean;
  generateVideoText: string;
  onGenerateStoryboard: (prompt: string) => void;
  isGeneratingStoryboard: boolean;
  generateStoryboardText: string;
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


const PromptOutput: React.FC<PromptOutputProps> = ({ prompt, onSave, copiedText, editText, saveText, cancelText, onGenerateArt, isGeneratingArt, generateArtText, onGenerateVideo, isGeneratingVideo, generateVideoText, onGenerateStoryboard, isGeneratingStoryboard, generateStoryboardText }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');

  const seriesData = useMemo(() => parseSeries(prompt), [prompt]);

  useEffect(() => {
    if (!isEditing) {
      setEditedPrompt(prompt);
    }
  }, [prompt, isEditing]);

  const handleCopy = useCallback(() => {
    const textToCopy = isEditing ? editedPrompt : prompt;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setCopyStatus(copiedText);
      setTimeout(() => {
        setCopied(false);
        setCopyStatus('');
      }, 2000);
    });
  }, [prompt, isEditing, editedPrompt, copiedText]);

  const handleEdit = () => setIsEditing(true);

  const handleSave = () => {
    onSave(editedPrompt);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPrompt(prompt);
    setIsEditing(false);
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

  const ControlButton: React.FC<{onClick: () => void; iconName: 'edit' | 'check' | 'cancel' | 'copy' | 'palette' | 'video' | 'film'; children: React.ReactNode; 'aria-label': string; isPrimary?: boolean; disabled?: boolean; isLoading?: boolean}> = ({ onClick, iconName, children, 'aria-label': ariaLabel, isPrimary, disabled, isLoading }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isPrimary ? 'bg-purple-600 text-white hover:bg-purple-700' : 'text-gray-300 bg-gray-700/50 hover:bg-gray-700'}`}
        aria-label={ariaLabel}
        disabled={disabled || isLoading}
    >
        {isLoading ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name={iconName} className="w-4 h-4" />}
        <span>{children}</span>
    </button>
  );

  return (
    <div className="bg-gray-900/70 rounded-lg border border-gray-700 shadow-lg">
      <div className="sr-only" role="status" aria-live="polite">
        {copyStatus}
      </div>
      <div className="flex items-center justify-end p-2 bg-gray-800/50 rounded-t-lg border-b border-gray-700 space-x-2 relative">
        {isEditing ? (
          <>
            <ControlButton onClick={handleSave} iconName="check" aria-label="Save changes" isPrimary>{saveText}</ControlButton>
            <ControlButton onClick={handleCancel} iconName="cancel" aria-label="Cancel editing">{cancelText}</ControlButton>
          </>
        ) : (
            <>
            <ControlButton onClick={handleGenerateVideo} iconName="video" aria-label="Generate video" disabled={isGeneratingArt || isGeneratingStoryboard} isLoading={isGeneratingVideo}>{generateVideoText}</ControlButton>
            <ControlButton onClick={handleGenerateArt} iconName="palette" aria-label="Generate concept art" disabled={isGeneratingVideo || isGeneratingStoryboard} isLoading={isGeneratingArt}>{generateArtText}</ControlButton>
            <ControlButton onClick={handleGenerateStoryboard} iconName="film" aria-label="Generate storyboard" disabled={isGeneratingArt || isGeneratingVideo} isLoading={isGeneratingStoryboard}>{generateStoryboardText}</ControlButton>
            <div className="border-l border-gray-600 h-5 mx-1"></div>
            <ControlButton onClick={handleEdit} iconName="edit" aria-label="Edit prompt">{editText}</ControlButton>
            </>
        )}
        <div className="border-l border-gray-600 h-5 mx-1"></div>
        <button
            onClick={handleCopy}
            className="p-1.5 text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-md transition-colors"
            aria-label="Copy prompt"
        >
            {copied ? (
                <Icon name="check" className="w-5 h-5 text-green-400" />
            ) : (
                <Icon name="copy" className="w-5 h-5" />
            )}
        </button>
         {copied && (
            <span className="absolute top-1/2 -translate-y-1/2 right-full mr-3 text-sm text-green-400 bg-gray-800 px-2 py-1 rounded-md shadow-md whitespace-nowrap" aria-hidden="true">
                {copiedText}
            </span>
        )}
      </div>

      <div className="p-4">
        {isEditing ? (
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            className="w-full h-64 bg-gray-900/50 border border-gray-600 rounded-lg shadow-sm text-gray-200 placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 transition duration-150 ease-in-out p-3 resize-y"
            aria-label="Prompt editing area"
          />
        ) : seriesData.isSeries ? (
          <div className="space-y-4">
            {(seriesData.content as Episode[]).map((episode, index) => (
              <div key={index} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                <h4 className="font-semibold text-purple-400 mb-1">{episode.title}</h4>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{episode.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap min-h-[5rem]">
            {seriesData.content as string}
          </p>
        )}
      </div>
    </div>
  );
};

export default PromptOutput;