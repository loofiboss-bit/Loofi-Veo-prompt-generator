import type { ReactNode } from 'react';
import { StepShell } from './StepShell';
export const GenerateStep = ({ children }: { children: ReactNode }) => (
  <StepShell
    id="generate"
    title="Generate"
    description="Inspect the model decision, approve a maximum cost, then submit paid work."
  >
    {children}
  </StepShell>
);
