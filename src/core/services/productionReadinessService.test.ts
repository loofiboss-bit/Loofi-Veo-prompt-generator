import { describe, expect, it } from 'vitest';
import type { Asset, ProductionRun, ProductionShot } from '@core/types';
import {
  isTakeReviewCurrent,
  isReviewEvidenceCurrent,
  manualReviewContext,
  productionReadiness,
  shotReadiness,
} from './productionReadinessService';

const shot = (): ProductionShot =>
  ({
    id: 1,
    title: 'Scene',
    prompt: 'A scene',
    negativePrompt: '',
    camera: '',
    durationSeconds: 8,
    status: 'accepted',
    generationRequest: { mode: 'text-to-video', referenceAssetIds: [] },
    selectedTakeId: 'take',
    takes: [
      {
        id: 'take',
        status: 'accepted',
        localMediaKey: 'media',
        localMediaUrl: 'blob:video',
        request: { mode: 'text-to-video' },
        review: { source: 'local' },
      },
    ],
  }) as unknown as ProductionShot;
const run = (scene: ProductionShot) =>
  ({
    brief: 'Brief',
    shots: [scene],
    assetIds: [],
    status: 'complete',
  }) as unknown as ProductionRun;

describe('production readiness', () => {
  it('does not count failed or pending takes as generated', () => {
    for (const status of ['failed', 'generating', 'queued'] as const) {
      const scene = shot();
      scene.takes[0].status = status;
      expect(productionReadiness(run(scene)).completion.generate).toBe(false);
    }
  });
  it('requires all scene references to exist with usable image content', () => {
    const scene = shot();
    scene.generationRequest.mode = 'image-to-video';
    scene.generationRequest.firstFrameAssetId = 'image';
    expect(shotReadiness(scene).references).toBe(false);
    expect(
      shotReadiness(scene, [{ id: 'other', type: 'image', data: 'abc' } as Asset]).references,
    ).toBe(false);
    expect(
      shotReadiness(scene, [{ id: 'image', type: 'image', data: 'abc' } as Asset]).references,
    ).toBe(true);
  });
  it('uses selected take and invalidates manual review when context changes', () => {
    const scene = shot();
    const take = scene.takes[0];
    take.status = 'complete';
    expect(isTakeReviewCurrent(scene, take)).toBe(false);
    take.manualReview = {
      contextIdentity: manualReviewContext(scene, take),
      confirmedAt: 1,
      notes: 'Watched',
    };
    expect(isTakeReviewCurrent(scene, take)).toBe(true);
    scene.generationRequest.prompt = 'Changed';
    expect(isTakeReviewCurrent(scene, take)).toBe(false);
    expect(productionReadiness(run(scene)).nextAction?.kind).toBe('review');
  });
  it('keeps legacy accepted reviews but blocks missing selected media delivery', () => {
    const scene = shot();
    expect(productionReadiness(run(scene)).completion.export).toBe(true);
    scene.takes[0].localMediaUrl = undefined;
    expect(productionReadiness(run(scene)).completion.export).toBe(false);
    expect(productionReadiness(run(scene)).nextAction?.kind).toBe('relink');
  });
  it('shows current local prechecks without treating them as manual acceptance or stale evidence', () => {
    const scene = shot();
    scene.takes[0].status = 'complete';
    scene.takes[0].reviewContextIdentity = manualReviewContext(scene, scene.takes[0]);
    expect(isReviewEvidenceCurrent(scene, scene.takes[0])).toBe(true);
    expect(isTakeReviewCurrent(scene, scene.takes[0])).toBe(false);
    scene.generationRequest.prompt = 'Changed';
    expect(isReviewEvidenceCurrent(scene, scene.takes[0])).toBe(false);
  });
  it('invalidates an AI review when the request identity changes', () => {
    const scene = shot();
    const take = scene.takes[0];
    take.status = 'complete';
    take.review!.source = 'mixed';
    take.reviewContextIdentity = manualReviewContext(scene, take);
    expect(isTakeReviewCurrent(scene, take)).toBe(true);
    scene.generationRequest.prompt = 'New prompt';
    expect(isTakeReviewCurrent(scene, take)).toBe(false);
  });
  it('recognizes durable image references without inline data', () => {
    const scene = shot();
    scene.generationRequest.mode = 'image-to-video';
    scene.generationRequest.firstFrameAssetId = 'image';
    expect(
      shotReadiness(scene, [
        { id: 'image', type: 'image', data: '', storageKey: 'saved-image' } as Asset,
      ]).references,
    ).toBe(true);
  });
});
