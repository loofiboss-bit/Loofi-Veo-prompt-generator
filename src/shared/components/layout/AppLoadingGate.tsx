import { memo } from 'react';

export const AppLoadingGate = memo(function AppLoadingGate() {
  return (
    <div className="h-full bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Loading workspace"
        />
        <p className="text-slate-400 text-sm">Loading Workspace...</p>
      </div>
    </div>
  );
});
AppLoadingGate.displayName = 'AppLoadingGate';
