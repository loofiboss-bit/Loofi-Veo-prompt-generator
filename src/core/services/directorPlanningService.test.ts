import { describe, expect, it } from 'vitest';

import { INITIAL_STATE } from '@core/constants';
import type { Shot } from '@core/types';
import { directorPlanningService } from './directorPlanningService';

const shot: Shot = {
  id: 7,
  type: 'video',
  action: 'A courier runs through a neon market',
  camera: 'Tracking shot',
  characterId: 'courier',
  takes: [],
  selectedTakeIndex: 0,
  visualLink: false,
  duration: 5,
  transition: { type: 'cut', duration: 0 },
};

describe('directorPlanningService', () => {
  it('builds a local approval-gated plan without calling cloud services', () => {
    const run = directorPlanningService.buildLocalPlan({
      projectId: 'project-1',
      title: 'Neon Run',
      promptState: {
        ...INITIAL_STATE,
        idea: 'A courier crosses a futuristic night market.',
        resolution: '720p',
        veoModel: 'fast',
      },
      shots: [shot],
      assets: [],
    });

    expect(run.source).toBe('local');
    expect(run.status).toBe('awaiting-approval');
    expect(run.shots).toHaveLength(1);
    expect(run.shots[0]).toMatchObject({
      id: 7,
      status: 'awaiting-approval',
      generationRequest: { durationSeconds: 6, resolution: '720p' },
    });
    expect(run.cost.estimatedUsd).toBeCloseTo(0.6);
  });

  it('forces eight-second generation for high-resolution plans', () => {
    const run = directorPlanningService.buildLocalPlan({
      projectId: 'project-1',
      title: '4K Run',
      promptState: { ...INITIAL_STATE, idea: 'A mountain flyover', resolution: '4k' },
      shots: [shot],
    });

    expect(run.shots[0].generationRequest.durationSeconds).toBe(8);
  });

  it('builds a local plan from active studio targets with deterministic continuity seeds', () => {
    const baseInput = {
      projectId: 'proj-seed-1',
      title: 'Kling Handoff',
      promptState: { ...INITIAL_STATE, idea: 'A lantern drifts across the harbor' },
      studioInput: {
        idea: 'A lantern drifts across the harbor',
        target: 'kling' as const,
        mode: 'text-to-video' as const,
        durationSeconds: 10,
        aspectRatio: '16:9' as const,
      },
      sourceVariantIndex: 1 as const,
      shots: [shot],
    };
    const firstRun = directorPlanningService.buildLocalPlan(baseInput);
    const secondRun = directorPlanningService.buildLocalPlan(baseInput);

    expect(firstRun.shots[0].generationRequest.executionMode).toBe('external-manual-slot');
    expect(firstRun.shots[0].generationRequest.target).toBe('kling');
    expect(firstRun.shots[0].generationRequest.seed).toBeGreaterThan(0);
    expect(firstRun.shots[0].generationRequest.seed).toBe(
      secondRun.shots[0].generationRequest.seed,
    );
    expect(firstRun.cost.estimatedUsd).toBe(0);
  });
});
