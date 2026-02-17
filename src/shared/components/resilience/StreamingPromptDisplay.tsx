/**
 * StreamingPromptDisplay — renders prompt text as it streams in,
 * with a typing cursor effect.
 *
 * @module shared/components/resilience/StreamingPromptDisplay
 */
import React, { useRef, useEffect } from 'react';

interface StreamingPromptDisplayProps {
  /** The text accumulated so far */
  text: string;
  /** Whether the stream is still active */
  isStreaming: boolean;
  /** Optional CSS class */
  className?: string;
}

export const StreamingPromptDisplay: React.FC<StreamingPromptDisplayProps> = ({
  text,
  isStreaming,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as text streams in
  useEffect(() => {
    if (containerRef.current && isStreaming) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text, isStreaming]);

  return (
    <div
      ref={containerRef}
      className={`relative rounded-lg bg-slate-800/50 border border-slate-700/50 p-4 overflow-y-auto max-h-64 ${className}`}
    >
      {text ? (
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
          {text}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </p>
      ) : isStreaming ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          Generating prompt...
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">No prompt generated yet.</p>
      )}

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-[10px] text-cyan-400 uppercase tracking-wider">Streaming</span>
        </div>
      )}
    </div>
  );
};
