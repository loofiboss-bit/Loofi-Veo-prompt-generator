import type { ReactNode } from 'react';
import { StepShell } from './StepShell';
export const ScenesStep = ({ children }: { children: ReactNode }) => (
  <StepShell
    id="scenes"
    title="Scenes"
    description="Review the scene breakdown, shot intent, camera, and timing."
  >
    {children}
  </StepShell>
);
