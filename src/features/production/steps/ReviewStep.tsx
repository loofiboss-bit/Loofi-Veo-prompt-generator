import type { ReactNode } from 'react';
import { StepShell } from './StepShell';
export const ReviewStep = ({ children }: { children: ReactNode }) => (
  <StepShell
    id="review"
    title="Review"
    description="Compare takes side by side, record notes, and keep, reject, or revise."
  >
    {children}
  </StepShell>
);
