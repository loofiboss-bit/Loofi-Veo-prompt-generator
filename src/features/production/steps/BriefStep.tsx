import type { ReactNode } from 'react';
import { StepShell } from './StepShell';
export const BriefStep = ({ children }: { children: ReactNode }) => (
  <StepShell
    id="brief"
    title="Brief"
    description="Define the production goal and create a local, zero-cost plan."
  >
    {children}
  </StepShell>
);
