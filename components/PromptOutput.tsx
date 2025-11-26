import React, { useState, useMemo } from 'react';
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
    // A series is identified by markdown h3 headers or specific patterns like "Episode 1:"
    if (!promptText.trim().includes('###') && !promptText.includes('**Part') && !promptText.includes('**Episode')) {
        return { isSeries: false, content: promptText };
    }

    // Robust splitting for different markdown styles
    const parts = promptText.split(/(?:^|\n)(?:###|\*\*Episode|\*\*Part)/).filter(p => p.trim().length > 10);
    
    if (parts.length <= 1) {
        return { isSeries: false, content: promptText };
    }

    const episodes = parts.map(part => {
        const lines = part.split('\n');
        // Clean up title (remove colons, stars, etc.)
        let title = lines[0].replace(/[:*]/g, '').trim();
        // If the split removed "Episode", add it back if it looks like just a number
        if (/^\d+$/.test(title)) title = `Episode ${title}`;
        
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
  const [isFlashing, setIsFlashing] = useState(false);
  const seriesData = useMemo(() => parseSeries(prompt), [prompt]);

  const webChunks = useMemo(() => groundingChunks?.filter(c => c.web) ?? [], [groundingChunks]);
  const mapChunks = useMemo(() => groundingChunks?.filter(c => c.maps) ?? [], [groundingChunks]);

  return (
    <div className={`bg-slate-900/60 backdrop-blur-lg rounded-2xl border border-slate-700 shadow-2xl shadow-black/30 overflow-hidden ${isFlashing ? 'animate-flash-border' : ''}`}>
      
      {/* Header strip for professional look */}
      <div className="h-2 bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 opacity-50"></div>

      <div className="p-4 sm:p-6">
        {isEditing ? (
          <textarea
            value={editedPrompt}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={onEditKeyDown}
            className="w-full h-96 bg-slate-950/50 border border-slate-700 rounded-lg shadow-inner text-slate-200 font-mono text-sm leading-relaxed focus:ring-cyan-500 focus:border-cyan-500 transition duration-150 ease-in-out p-4 resize-y"
            aria-label="Prompt editing area"
            spellCheck={false}
          />
        ) : seriesData.isSeries ? (
          <div className="space-y-6 animate-text-fade-in">
            {(seriesData.content as Episode[]).map((episode, index) => (
              <div key={index} className="relative pl-6 border-l-2 border-slate-700/50 hover:border-cyan-500/50 transition-colors group">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-600 group-hover:border-cyan-500 transition-colors"></div>
                <h4 className="font-bold text-cyan-400 mb-2 text-lg tracking-wide uppercase">{episode.title}</h4>
                <p className="text-slate-300 leading-7 text-base whitespace-pre-wrap font-light">{episode.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-200 text-lg leading-relaxed whitespace-pre-wrap font-serif animate-text-fade-in pl-4 border-l-4 border-cyan-500/20 py-2">
            {seriesData.content as string}
          </p>
        )}
      </div>

      {storyboardImages.length > 0 && !isEditing && (
        <div className="border-t border-slate-800/50 p-4 sm:p-6 animate-fade-in-up bg-slate-900/40">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                <Icon name="film" className="w-3 h-3 mr-2" />
                Visual Storyboard
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {storyboardImages.map((image, index) => (
                    <div key={index} className="aspect-video bg-slate-800 rounded-md overflow-hidden border border-slate-700 shadow-lg relative group">
                        <img src={image} alt={`Frame ${index + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-white font-mono">Shot {index + 1}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {(webChunks.length > 0 || mapChunks.length > 0) && !isEditing && (
        <div className="border-t border-slate-800 p-4 sm:p-6 animate-fade-in-up text-sm bg-slate-900/80">
          {webChunks.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                <Icon name="globe" className="w-4 h-4" /> Grounding Sources
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {webChunks.map((chunk, index) =>
                  chunk.web ? (
                    <li key={`web-${index}`} className="flex items-start gap-2 text-slate-400 hover:text-slate-200 transition-colors">
                      <span className="text-cyan-500/50">●</span>
                      <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="hover:underline truncate block">
                        {chunk.web.title}
                      </a>
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