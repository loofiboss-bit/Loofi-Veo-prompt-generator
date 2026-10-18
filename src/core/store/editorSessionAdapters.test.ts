import { describe, expect, it } from 'vitest';
import {
  buildProjectDocument,
  createEmptyProjectDocument,
  createDefaultProjectComposerState,
} from './editorSessionAdapters';
import { createPromptStudioDraft } from '@core/services/promptStudioDraftService';

describe('project document adapters', () => {
  it('preserves draft and unknown extension fields when rebuilding a document', () => {
    const base = createEmptyProjectDocument({ id: 'a', name: 'A' });
    base.studioDraft = createPromptStudioDraft('a');
    base.studioDraft.video.idea = 'Keep draft';
    base.futureExtension = { nested: 'Keep extension' };
    const composer = createDefaultProjectComposerState();
    composer.gridSize = 36;
    const rebuilt = buildProjectDocument({
      ...base,
      name: 'Updated A',
      composer,
      baseDocument: base,
    });
    expect(rebuilt.studioDraft?.video.idea).toBe('Keep draft');
    expect(rebuilt.futureExtension).toEqual({ nested: 'Keep extension' });
    expect(rebuilt.composer?.gridSize).toBe(36);
    expect(rebuilt.name).toBe('Updated A');
  });

  it('benchmark: captureProjectDocumentFromStores / buildProjectDocument completes under 5ms for a 20-shot payload', () => {
    const base = createEmptyProjectDocument({ id: 'bench-p', name: 'Benchmark Project' });
    base.storyboard.shots = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      action: `Action shot ${i + 1} with camera motion`,
      camera: 'Pan right 45 degrees, slow track',
      duration: 4,
    })) as unknown as typeof base.storyboard.shots;
    base.storyboard.timeline.tracks = [
      { id: 'track-v1', type: 'video', name: 'Main Video', clips: [] },
      { id: 'track-v2', type: 'video', name: 'Overlay B-Roll', clips: [] },
      { id: 'track-a1', type: 'audio', name: 'Dialogue', clips: [] },
      { id: 'track-a2', type: 'audio', name: 'Score', clips: [] },
    ] as unknown as typeof base.storyboard.timeline.tracks;
    base.storyboard.timeline.clips = Array.from({ length: 20 }, (_, i) => ({
      id: `clip-${i + 1}`,
      trackId: i % 2 === 0 ? 'track-v1' : 'track-v2',
      name: `Shot ${i + 1}`,
      startTime: i * 4,
      duration: 4,
      sourceStart: 0,
      type: 'video',
    })) as unknown as typeof base.storyboard.timeline.clips;

    // Warm-up
    for (let i = 0; i < 5; i++) {
      buildProjectDocument({ ...base, baseDocument: base });
    }

    const start = performance.now();
    const runs = 10;
    for (let i = 0; i < runs; i++) {
      const doc = buildProjectDocument({ ...base, baseDocument: base });
      expect(doc.storyboard.shots.length).toBe(20);
    }
    const avgDurationMs = (performance.now() - start) / runs;
    expect(avgDurationMs).toBeLessThan(5);
  });
});
