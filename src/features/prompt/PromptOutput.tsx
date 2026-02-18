/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useCallback, useMemo } from 'react';
import { Icon } from '@shared/components/ui';
import { GroundingChunk } from '@core/types';

interface PromptOutputProps {
  prompt: string;
  groundingChunks?: GroundingChunk[];
  storyboardImages: string[];
  conceptArtImage: string | null;
  isEditing: boolean;
  editedPrompt: string;
  onEditChange: (value: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onRefine?: (currentText: string) => void;
  isRefining?: boolean;
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

  const parts = promptText.split(/(?:^|\n)###\s*/).filter((p) => p.trim());
  if (parts.length <= 1) {
    return { isSeries: false, content: promptText };
  }

  const episodes = parts
    .map((part) => {
      const lines = part.split('\n');
      const title = lines[0].trim();
      const description = lines.slice(1).join('\n').trim();
      return { title, description };
    })
    .filter((e) => e.title && e.description);

  if (episodes.length > 0) {
    return { isSeries: true, content: episodes };
  }

  return { isSeries: false, content: promptText };
};

const PromptOutput: React.FC<PromptOutputProps> = ({
  prompt,
  groundingChunks,
  storyboardImages,
  conceptArtImage,
  isEditing,
  editedPrompt,
  onEditChange,
  onEditKeyDown,
  onRefine,
  isRefining,
}) => {
  const [isFlashing, _setIsFlashing] = useState(false);
  const [copied, setCopied] = useState(false);
  const seriesData = useMemo(() => parseSeries(prompt), [prompt]);

  const webChunks = useMemo(() => groundingChunks?.filter((c) => c.web) ?? [], [groundingChunks]);
  const mapChunks = useMemo(() => groundingChunks?.filter((c) => c.maps) ?? [], [groundingChunks]);

  const handleDownloadImage = (imageUrl: string, prefix: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${prefix}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = useCallback(() => {
    if (!prompt) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(prompt).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [prompt]);

  const handleRefineClick = () => {
    if (onRefine) {
      onRefine(isEditing ? editedPrompt : prompt);
    }
  };

  return (
    <div
      className={`bg-slate-900/60 backdrop-blur-lg rounded-2xl border border-slate-700 shadow-2xl shadow-black/30 relative ${isFlashing ? 'animate-flash-border' : ''}`}
    >
      {/* Top Actions Overlay */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        {onRefine && (
          <button
            onClick={handleRefineClick}
            disabled={isRefining}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-all border border-slate-700/50 hover:border-cyan-500/50 backdrop-blur-md shadow-lg group"
            aria-label="Refine Prompt"
            title="Refine with AI to improve clarity and detail"
          >
            {isRefining ? (
              <Icon name="spinner" className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Icon
                name="sparkles"
                className="w-4 h-4 group-hover:scale-110 transition-transform"
              />
            )}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/50 hover:border-slate-600 backdrop-blur-md shadow-lg group"
          aria-label="Copy prompt text"
          title="Copy to clipboard"
        >
          {copied ? (
            <Icon name="check" className="w-4 h-4 text-green-400" />
          ) : (
            <Icon name="copy" className="w-4 h-4 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      <div className="p-4 sm:p-6 pt-12 sm:pt-12">
        {isEditing ? (
          <textarea
            value={editedPrompt}
            onChange={(e) => onEditChange(e.currentTarget.value)}
            onKeyDown={onEditKeyDown}
            className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg shadow-sm text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 transition duration-150 ease-in-out p-3 resize-y"
            aria-label="Prompt editing area"
          />
        ) : seriesData.isSeries ? (
          <div className="space-y-4 animate-text-fade-in">
            {(seriesData.content as Episode[]).map((episode, index) => (
              <div
                key={index}
                className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
              >
                <h4 className="font-semibold text-cyan-400 mb-1">{episode.title}</h4>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {episode.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap min-h-[5rem] animate-text-fade-in">
            {seriesData.content as string}
          </p>
        )}
      </div>

      {conceptArtImage && !isEditing && (
        <div className="border-t border-slate-700 p-4 sm:p-6 animate-fade-in-up bg-slate-900/30">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center">
              <Icon name="palette" className="w-4 h-4 mr-2 text-cyan-400" />
              <span>Visual Concept</span>
            </h4>
            <button
              onClick={() => handleDownloadImage(conceptArtImage, 'concept-art')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <Icon name="download" className="w-3 h-3" /> Save
            </button>
          </div>
          <div className="flex justify-center">
            <div className="relative group max-w-md w-full rounded-xl overflow-hidden shadow-lg border border-slate-700">
              <img
                src={conceptArtImage}
                alt="Generated Concept Art"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      )}

      {storyboardImages.length > 0 && !isEditing && (
        <div className="border-t border-slate-700 p-4 sm:p-6 animate-fade-in-up">
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
            <Icon name="film" className="w-4 h-4 mr-2 text-cyan-400" />
            <span>Storyboard</span>
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {storyboardImages.map((image, index) => (
              <div
                key={index}
                className="aspect-video bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-700/50 shadow-md relative group"
              >
                <img
                  src={image}
                  alt={`Storyboard frame ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleDownloadImage(image, `storyboard-${index + 1}`)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Icon name="download" className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(webChunks.length > 0 || mapChunks.length > 0) && !isEditing && (
        <div className="border-t border-slate-700 p-4 sm:p-6 animate-fade-in-up">
          {webChunks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
                <Icon name="globe" className="w-4 h-4 mr-2 text-cyan-400" />
                <span>Sources from Google Search</span>
              </h4>
              <ul className="space-y-2 pl-2">
                {webChunks.map((chunk, index) =>
                  chunk.web && chunk.web.uri ? (
                    <li key={`web-${index}`} className="flex items-start">
                      <span className="text-cyan-400 mr-3 mt-1 text-xs">●</span>
                      <a
                        href={chunk.web.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-300 hover:text-cyan-400 transition-colors text-sm underline decoration-slate-600 hover:decoration-cyan-400 underline-offset-2"
                        title={chunk.web.uri}
                      >
                        {chunk.web.title || chunk.web.uri}
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          )}
          {mapChunks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
                <Icon name="globe" className="w-4 h-4 mr-2 text-cyan-400" />
                <span>Sources from Google Maps</span>
              </h4>
              <ul className="space-y-2 pl-2">
                {mapChunks.map((chunk, index) =>
                  chunk.maps && chunk.maps.uri ? (
                    <li key={`map-${index}`} className="flex items-start flex-col">
                      <div className="flex items-start">
                        <span className="text-cyan-400 mr-3 mt-1 text-xs">●</span>
                        <a
                          href={chunk.maps.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-300 hover:text-cyan-400 transition-colors text-sm underline decoration-slate-600 hover:decoration-cyan-400 underline-offset-2"
                          title={chunk.maps.uri}
                        >
                          {chunk.maps.title || chunk.maps.uri}
                        </a>
                      </div>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(PromptOutput);
