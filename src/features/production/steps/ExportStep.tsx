import React, { Suspense, type ReactNode } from 'react';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
const CreatorDeliveryPanel = React.lazy(() =>
  import('@features/delivery/CreatorDeliveryPanel').then((m) => ({
    default: m.CreatorDeliveryPanel,
  })),
);
import { StepShell } from './StepShell';
export const ExportStep = ({ children }: { children: ReactNode }) => (
  <StepShell
    id="export"
    title="Export"
    description="Package accepted work, provenance, and handoff material."
  >
    <ErrorBoundary panelId="creator-delivery">
      <Suspense
        fallback={<div className="p-4 text-sm text-slate-400">Loading delivery panel...</div>}
      >
        <CreatorDeliveryPanel />
      </Suspense>
    </ErrorBoundary>
    {children}
  </StepShell>
);
