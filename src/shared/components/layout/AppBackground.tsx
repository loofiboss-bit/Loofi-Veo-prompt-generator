import { memo } from 'react';

export const AppBackground = memo(function AppBackground() {
  return (
    <div className="creator-background fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />
  );
});
AppBackground.displayName = 'AppBackground';
