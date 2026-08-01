import { memo } from 'react';

export const AppBackground = memo(function AppBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-blue-900/10 opacity-20 blur-[120px]" />
      <div className="absolute right-[-10%] bottom-[-10%] h-[40%] w-[40%] rounded-full bg-slate-800/10 opacity-20 blur-[120px]" />
    </div>
  );
});
AppBackground.displayName = 'AppBackground';
