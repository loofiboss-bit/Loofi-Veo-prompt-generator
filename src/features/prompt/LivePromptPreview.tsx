import React, { useMemo } from 'react';
import type { PromptState } from '@core/types';
import { assemblePromptPreview } from '@core/utils/promptAssembler';

interface LivePromptPreviewProps {
  promptState: PromptState;
}

/**
 * Real-time prompt preview assembled from form state.
 * No AI call — pure template logic. Only shown when idea field is non-empty.
 */
export function LivePromptPreview({ promptState }: LivePromptPreviewProps) {
  const preview = useMemo(() => assemblePromptPreview(promptState), [promptState]);

  if (!preview) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Live Preview
      </p>
      <p className="text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
        {preview}
      </p>
      <p className="text-xs text-slate-600 mt-2">
        Updates as you fill in fields — generate for the AI-crafted prompt.
      </p>
    </div>
  );
}
