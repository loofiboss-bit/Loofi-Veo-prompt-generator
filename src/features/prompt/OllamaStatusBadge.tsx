import React, { useEffect, useState } from 'react';

type Status = 'checking' | 'connected' | 'offline';

interface OllamaInfo {
  model?: string;
}

/**
 * Shows Ollama connection status when Local LLM mode is selected.
 * Pings http://localhost:11434/api/tags — no credentials required.
 */
export function OllamaStatusBadge() {
  const [status, setStatus] = useState<Status>('checking');
  const [info, setInfo] = useState<OllamaInfo>({});

  useEffect(() => {
    let cancelled = false;

    fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
      .then((r) => r.json())
      .then((data: { models?: Array<{ name: string }> }) => {
        if (cancelled) return;
        setStatus('connected');
        setInfo({ model: data.models?.[0]?.name });
      })
      .catch(() => {
        if (!cancelled) setStatus('offline');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'checking') {
    return <p className="text-xs text-slate-500 mt-2 text-center">Checking Ollama...</p>;
  }

  if (status === 'offline') {
    return (
      <div className="mt-3 rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
        <strong>Ollama not running.</strong> Start it with{' '}
        <code className="font-mono bg-amber-950/60 px-1 rounded">ollama serve</code> or{' '}
        <a
          href="https://ollama.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-amber-200"
        >
          install Ollama
        </a>
        .
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-300 flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>Connected{info.model ? ` · ${info.model}` : ''}</span>
    </div>
  );
}
