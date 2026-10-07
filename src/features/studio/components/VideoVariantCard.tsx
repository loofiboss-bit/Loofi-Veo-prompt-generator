import { useState } from 'react';
import type { VideoPromptVariant } from '@core/types';

export function VideoVariantCard({
  variant,
  primary,
  onCopy,
  onHandoff,
}: {
  variant: VideoPromptVariant;
  primary?: boolean;
  onCopy: (text: string, label: string) => void;
  onHandoff?: () => void;
}) {
  const [open, setOpen] = useState(Boolean(primary));
  return (
    <article
      className={`rounded-2xl border ${primary ? 'border-cyan-400/50 bg-cyan-400/[0.06]' : 'border-slate-700 bg-slate-900/60'}`}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
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
          <textarea
            readOnly
            value={variant.prompt}
            aria-label={`${variant.label} prompt`}
            className="min-h-40 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-sm leading-relaxed text-slate-200"
          />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Negative prompt
            </p>
            <p className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-400">
              {variant.negativePrompt}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Handoff checklist
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-slate-400">
              {variant.settingsChecklist.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCopy(variant.copyPrompt, 'Prompt copied')}
              className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
            >
              Copy prompt
            </button>
            <button
              type="button"
              onClick={() => onCopy(variant.copyNegativePrompt, 'Negative prompt copied')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Copy negative
            </button>
            <button
              type="button"
              onClick={() => onCopy(variant.copySettingsChecklist, 'Settings checklist copied')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Copy checklist
            </button>
            <button
              type="button"
              onClick={() => onCopy(variant.copyAll, 'Handoff copied')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Copy handoff
            </button>
            {onHandoff ? (
              <button
                type="button"
                onClick={onHandoff}
                className="rounded-lg border border-amber-300/50 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/10"
              >
                Generate in app
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
