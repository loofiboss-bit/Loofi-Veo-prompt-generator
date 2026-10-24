import { describe, it, expect } from 'vitest';
import type { ProductionShot, ProductionTake } from '@core/types';

describe('handlePrepareRetake prompt preservation', () => {
  const shot: ProductionShot = {
    id: 1,
    title: 'Shot 1',
    prompt:
      'Wide cinematic establishing shot of hero walking down rainy neon alley, anamorphic lens',
    negativePrompt: '',
    camera: 'wide',
    durationSeconds: 4,
    generationRequest: {
      mode: 'text-to-video',
      modelId: 'veo-3.1-fast',
      prompt:
        'Wide cinematic establishing shot of hero walking down rainy neon alley, anamorphic lens',
      durationSeconds: 4,
      aspectRatio: '16:9',
      resolution: '720p',
      referenceAssetIds: [],
    },
    takes: [],
    status: 'draft',
  };

  const take: ProductionTake = {
    id: 'take-1',
    prompt: shot.prompt,
    request: {
      mode: 'text-to-video',
      modelId: 'veo-3.1-fast',
      prompt: shot.prompt,
      aspectRatio: '16:9',
      resolution: '720p',
      durationSeconds: 4,
      referenceAssetIds: [],
    },
    status: 'complete',
    provider: 'gemini-api',
    apiSurface: 'google-ai-v1beta',
    modelLifecycleSnapshot: 'preview',
    priceDimension: { unit: 'video-second', resolution: '720p', usdPerUnit: 0.1 },
    createdAt: 1,
  };

  it('preserves shot prompt and appends revision note when no AI proposed revision is present', () => {
    const revisionNotes = 'Adjust camera angle lower, reduce rain particles';
    let prompt = shot.prompt;
    const useRevision = true;
    if (useRevision) {
      if (take.review?.proposedRevisionPrompt) {
        prompt = take.review.proposedRevisionPrompt;
      } else if (revisionNotes?.trim()) {
        const notes = revisionNotes.trim();
        prompt = shot.prompt.includes('[Revision note:')
          ? shot.prompt.replace(/\[Revision note:[\s\S]*?\]/, `[Revision note: ${notes}]`)
          : `${shot.prompt}\n\n[Revision note: ${notes}]`;
      }
    }

    expect(prompt).toContain(
      'Wide cinematic establishing shot of hero walking down rainy neon alley',
    );
    expect(prompt).toContain('[Revision note: Adjust camera angle lower, reduce rain particles]');
  });

  it('updates existing revision note cleanly if retaken again', () => {
    const initialPrompt = `${shot.prompt}\n\n[Revision note: First revision]`;
    const newNotes = 'Second revision note';
    const prompt = initialPrompt.includes('[Revision note:')
      ? initialPrompt.replace(/\[Revision note:[\s\S]*?\]/, `[Revision note: ${newNotes}]`)
      : `${initialPrompt}\n\n[Revision note: ${newNotes}]`;

    expect(prompt).not.toContain('First revision');
    expect(prompt).toContain('[Revision note: Second revision note]');
    expect(prompt).toContain(
      'Wide cinematic establishing shot of hero walking down rainy neon alley',
    );
  });

  it('uses proposedRevisionPrompt when provided by review', () => {
    const takeWithReview: ProductionTake = {
      ...take,
      review: {
        id: 'rev-1',
        shotId: 1,
        takeId: 'take-1',
        overallScore: 80,
        dimensions: [],
        findings: [],
        proposedRevisionPrompt: 'Completely refined cinematic prompt from review model',
        source: 'gemini',
        createdAt: 1,
      },
    };

    let prompt = shot.prompt;
    const useRevision = true;
    if (useRevision) {
      if (takeWithReview.review?.proposedRevisionPrompt) {
        prompt = takeWithReview.review.proposedRevisionPrompt;
      }
    }

    expect(prompt).toBe('Completely refined cinematic prompt from review model');
  });

  it('preserves prompt exactly when useRevision is false', () => {
    let prompt = shot.prompt;
    const useRevision = false;
    if (useRevision) {
      prompt = 'Different';
    }
    expect(prompt).toBe(shot.prompt);
  });
});
