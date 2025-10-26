import React, { useState, useCallback, useMemo } from 'react';
import Icon from './Icon';
import { GroundingChunk } from '../types';

interface PromptOutputProps {
  prompt: string;
  groundingChunks?: GroundingChunk[];
  storyboardImages: string[];
  isEditing: boolean;
  editedPrompt: string;
  onEditChange: (value: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
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
  prompt, groundingChunks, storyboardImages,
  isEditing, editedPrompt, onEditChange, onEditKeyDown
}) => {
  const [isFlashing, setIsFlashing] = useState(false); // Used for copy feedback, can be triggered from parent
  const seriesData = useMemo(() => parseSeries(prompt), [prompt]);

  const webChunks = useMemo(() => groundingChunks?.filter(c => c.web) ?? [], [groundingChunks]);
  const mapChunks = useMemo(() => groundingChunks?.filter(c => c.maps) ?? [], [groundingChunks]);

  // Public method to trigger flash, can be called via a ref from parent if needed
  const triggerCopyFlash = () => {
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
    }, 600);
  };

  return (
    <div className={`bg-slate-900/60 backdrop-blur-lg rounded-2xl border border-slate-700 shadow-2xl shadow-black/30 ${isFlashing ? 'animate-flash-border' : ''}`}>
      <div className="p-4 sm:p-6">
        {isEditing ? (
          <textarea
            value={editedPrompt}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={onEditKeyDown}
            className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg shadow-sm text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 transition duration-150 ease-in-out p-3 resize-y"
            aria-label="Prompt editing area"
          />
        ) : seriesData.isSeries ? (
          <div className="space-y-4 animate-text-fade-in">
            {(seriesData.content as Episode[]).map((episode, index) => (
              <div key={index} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <h4 className="font-semibold text-cyan-400 mb-1">{episode.title}</h4>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{episode.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap min-h-[5rem] animate-text-fade-in">
            {seriesData.content as string}
          </p>
        )}
      </div>

      {storyboardImages.length > 0 && !isEditing && (
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

      {(webChunks.length > 0 || mapChunks.length > 0) && !isEditing && (
        <div className="border-t border-slate-700 p-4 sm:p-6 animate-fade-in-up">
          {webChunks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center">
                <Icon name="globe" className="w-4 h-4 mr-2 text-cyan-400" />
                <span>Sources from Google Search</span>
              </h4>
              <ul className="space-y-2 pl-2">
                {webChunks.map((chunk, index) =>
                  chunk.web ? (
                    <li key={`web-${index}`} className="flex items-start">
                      <span className="text-cyan-400 mr-3 mt-1 text-xs">●</span>
                      <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-cyan-400 transition-colors text-sm underline decoration-slate-600 hover:decoration-cyan-400 underline-offset-2" title={chunk.web.uri}>
                        {chunk.web.title}
                      </a>
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          )}
          {mapChunks.length > 0 && (
             <div>
              <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center">
                <Icon name="globe" className="w-4 h-4 mr-2 text-cyan-400" />
                <span>Sources from Google Maps</span>
              </h4>
              <ul className="space-y-2 pl-2">
                {mapChunks.map((chunk, index) =>
                  chunk.maps ? (
                    <li key={`map-${index}`} className="flex items-start flex-col">
                        <div className="flex items-start">
                            <span className="text-cyan-400 mr-3 mt-1 text-xs">●</span>
                            <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-cyan-400 transition-colors text-sm underline decoration-slate-600 hover:decoration-cyan-400 underline-offset-2" title={chunk.maps.uri}>
                                {chunk.maps.title}
                            </a>
                        </div>
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptOutput;