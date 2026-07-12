import type { ReactNode } from 'react';
import { StepShell } from './StepShell';
export const AssetsStep = ({ children }: { children: ReactNode }) => (
  <StepShell
    id="assets"
    title="Assets"
    description="Attach references and verify every required local asset before approval."
  >
    {children}
  </StepShell>
);
