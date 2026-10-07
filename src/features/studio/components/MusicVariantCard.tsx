import { useState } from 'react';
import type { MusicPromptVariant } from '@core/types';

export function MusicVariantCard({
  variant,
  primary,
  onCopy,
  onLyricsChange,
}: {
  variant: MusicPromptVariant;
  primary?: boolean;
  onCopy: (text: string, label: string) => void;
  onLyricsChange?: (lyrics: string) => void;
}) {
  const [open, setOpen] = useState(Boolean(primary));
  return (
    <article
      className={`rounded-2xl border ${primary ? 'border-fuchsia-400/50 bg-fuchsia-400/[0.06]' : 'border-slate-700 bg-slate-900/60'}`}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">
            {variant.label}
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">{variant.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-white"
          aria-expanded={open}
        >
          {open ? 'Collapse' : 'Open'}
        </button>
      </div>
      {open ? (
        <div className="space-y-4 border-t border-slate-800 p-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Style of Music
            </p>
            <textarea
              readOnly
              value={variant.styleOfMusic}
              aria-label={`${variant.label} style`}
              className="min-h-20 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-sm leading-relaxed text-fuchsia-100"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Lyrics
            </p>
            <textarea
              readOnly={!onLyricsChange}
              value={variant.lyrics}
              onChange={(event) => onLyricsChange?.(event.target.value)}
              aria-label={`${variant.label} lyrics`}
              className="min-h-64 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-sm leading-relaxed text-slate-200"
            />
          </div>
          <ul className="space-y-1 text-xs leading-relaxed text-slate-400">
            {variant.productionNotes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCopy(variant.copyStyle, 'Style copied')}
              className="rounded-lg bg-fuchsia-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-fuchsia-300"
            >
              Copy style
            </button>
            <button
              type="button"
              onClick={() => onCopy(variant.copyLyrics, 'Lyrics copied')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Copy lyrics
            </button>
            <button
              type="button"
              onClick={() => onCopy(variant.copyAll, 'Suno handoff copied')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Copy all
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
