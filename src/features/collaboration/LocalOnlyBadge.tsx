import React from 'react';

/**
 * Informs users that collaboration sync is local-only (BroadcastChannel).
 * No cloud backend — works only between windows on the same machine.
 */
export function LocalOnlyBadge() {
  return (
    <span
      title="Sync uses BroadcastChannel — works between windows on the same machine only. No cloud sync."
      className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      Local only
    </span>
  );
}
