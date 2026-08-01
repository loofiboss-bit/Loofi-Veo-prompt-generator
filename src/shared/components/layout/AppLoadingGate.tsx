import { memo } from 'react';

export const AppLoadingGate = memo(function AppLoadingGate() {
  return (
    <div className="h-full bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
          role="status"
          aria-label="Loading workspace"
        />
        <p className="text-slate-400 text-sm">Loading Workspace...</p>
      </div>
    </div>
  );
});
AppLoadingGate.displayName = 'AppLoadingGate';
