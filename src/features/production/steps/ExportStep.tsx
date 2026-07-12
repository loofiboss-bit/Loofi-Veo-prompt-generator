import type { ReactNode } from 'react';
import { StepShell } from './StepShell';
export const ExportStep = ({ children }: { children: ReactNode }) => (
  <StepShell
    id="export"
    title="Export"
    description="Package accepted work, provenance, and handoff material."
  >
    {children}
  </StepShell>
);
