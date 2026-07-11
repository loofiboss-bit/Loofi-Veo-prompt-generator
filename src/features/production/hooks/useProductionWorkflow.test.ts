import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ProductionRun } from '@core/types';
import { useProductionWorkflow } from './useProductionWorkflow';

describe('useProductionWorkflow', () => {
  beforeEach(() => localStorage.clear());

  it('persists the current step per project', () => {
    const { result, unmount } = renderHook(() => useProductionWorkflow('project-1', null));
    act(() => result.current.setCurrentStep('assets'));
    expect(localStorage.getItem('production-workflow-step:project-1')).toBe('assets');
    unmount();
    const restored = renderHook(() => useProductionWorkflow('project-1', null));
    expect(restored.result.current.currentStep).toBe('assets');
  });

  it('derives completion from durable production state', () => {
    const run = {
      brief: 'A brief',
      assetIds: [],
      status: 'complete',
      shots: [
        {
          status: 'accepted',
          generationRequest: { mode: 'text-to-video' },
          takes: [{ review: { overallScore: 90 } }],
        },
      ],
    } as unknown as ProductionRun;
    const { result } = renderHook(() => useProductionWorkflow('project-2', run));
    expect(result.current.completion).toEqual({
      brief: true,
      scenes: true,
      assets: true,
      generate: true,
      review: true,
      export: true,
    });
  });
});
