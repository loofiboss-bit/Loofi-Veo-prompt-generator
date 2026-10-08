import { useEffect, useMemo, useState } from 'react';
import { productionReadiness } from '@core/services/productionReadinessService';
import type { Asset, ProductionRun } from '@core/types';

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

export function useProductionWorkflow(
  projectId: string,
  run: ProductionRun | null,
  assets?: Asset[],
) {
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

  const { completion, nextAction } = useMemo(() => productionReadiness(run, assets), [run, assets]);

  const currentIndex = PRODUCTION_STEPS.findIndex((step) => step.id === currentStep);
  const goNext = () => {
    const next = PRODUCTION_STEPS[Math.min(currentIndex + 1, PRODUCTION_STEPS.length - 1)];
    setCurrentStep(next.id);
  };
  const goBack = () => {
    const previous = PRODUCTION_STEPS[Math.max(currentIndex - 1, 0)];
    setCurrentStep(previous.id);
  };

  return { nextAction, currentStep, setCurrentStep, completion, currentIndex, goNext, goBack };
}
