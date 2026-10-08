import { memo } from 'react';

export const AppBackground = memo(function AppBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Top ambient studio light */}
      <div className="absolute top-[-150px] left-1/3 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-br from-blue-600/15 via-indigo-600/10 to-transparent blur-[140px]" />
      {/* Bottom right accent glow */}
      <div className="absolute -bottom-24 -right-24 h-[450px] w-[500px] rounded-full bg-gradient-to-tl from-cyan-600/10 via-blue-500/5 to-transparent blur-[130px]" />
      {/* Side subtle violet rim light */}
      <div className="absolute top-1/2 -left-32 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-purple-600/10 blur-[120px]" />
      {/* Subtle studio grid mesh texture */}
      <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    </div>
  );
});
AppBackground.displayName = 'AppBackground';
