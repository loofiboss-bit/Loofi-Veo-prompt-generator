import type { ReactNode } from 'react';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { CreatorDeliveryPanel } from '@features/delivery/CreatorDeliveryPanel';
import { StepShell } from './StepShell';
export const ExportStep = ({ children }: { children: ReactNode }) => (
  <StepShell
    id="export"
    title="Export"
    description="Package accepted work, provenance, and handoff material."
  >
    <ErrorBoundary panelId="creator-delivery">
      <CreatorDeliveryPanel />
    </ErrorBoundary>
    {children}
  </StepShell>
);
