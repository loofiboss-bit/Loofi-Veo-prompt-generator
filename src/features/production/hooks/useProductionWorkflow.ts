import { useEffect, useMemo, useState } from 'react';
import type { ProductionRun } from '@core/types';

export const PRODUCTION_STEPS = [
  { id: 'brief', label: 'Brief' },
  { id: 'scenes', label: 'Scenes' },
  { id: 'assets', label: 'Assets' },
  { id: 'generate', label: 'Generate' },
  { id: 'review', label: 'Review' },
  { id: 'export', label: 'Export' },
] as const;

export type ProductionStepId = (typeof PRODUCTION_STEPS)[number]['id'];

const storageKey = (projectId: string) => `production-workflow-step:${projectId}`;

export function useProductionWorkflow(projectId: string, run: ProductionRun | null) {
  const [currentStep, setCurrentStepState] = useState<ProductionStepId>('brief');

  useEffect(() => {
    const stored = localStorage.getItem(storageKey(projectId));
    if (PRODUCTION_STEPS.some((step) => step.id === stored)) {
      setCurrentStepState(stored as ProductionStepId);
    } else {
      setCurrentStepState('brief');
    }
  }, [projectId]);

  const setCurrentStep = (step: ProductionStepId) => {
    setCurrentStepState(step);
    localStorage.setItem(storageKey(projectId), step);
  };

  const completion = useMemo<Record<ProductionStepId, boolean>>(() => {
    const shots = run?.shots ?? [];
    const hasAssets =
      (run?.assetIds.length ?? 0) > 0 ||
      shots.every((shot) => shot.generationRequest.mode === 'text-to-video');
    return {
      brief: Boolean(run?.brief.trim()),
      scenes: shots.length > 0,
      assets: Boolean(run && hasAssets),
      generate: shots.length > 0 && shots.every((shot) => shot.takes.length > 0),
      review:
        shots.length > 0 && shots.every((shot) => shot.takes.some((take) => Boolean(take.review))),
      export:
        run?.status === 'complete' ||
        (shots.length > 0 && shots.every((shot) => shot.status === 'accepted')),
    };
  }, [run]);

  const currentIndex = PRODUCTION_STEPS.findIndex((step) => step.id === currentStep);
  const goNext = () => {
    const next = PRODUCTION_STEPS[Math.min(currentIndex + 1, PRODUCTION_STEPS.length - 1)];
    setCurrentStep(next.id);
  };
  const goBack = () => {
    const previous = PRODUCTION_STEPS[Math.max(currentIndex - 1, 0)];
    setCurrentStep(previous.id);
  };

  return { currentStep, setCurrentStep, completion, currentIndex, goNext, goBack };
}
