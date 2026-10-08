import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '@core/types';
import { compileVideoPromptArtifact } from '@core/services/promptStudioService';
import { externalStudioResultService } from './externalStudioResultService';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  update: vi.fn(),
  storeBlob: vi.fn(),
  remove: vi.fn(),
  getObjectUrl: vi.fn(),
  getRecord: vi.fn(),
}));
vi.mock('@core/services/projectDocumentService', () => ({ projectDocumentService: mocks }));
vi.mock('@core/services/mediaAssetService', () => ({ mediaAssetService: mocks }));
vi.mock('@core/services/loggerService', () => ({ logger: { warn: vi.fn() } }));

const artifact = () => ({
  ...compileVideoPromptArtifact({
    idea: 'A river',
    target: 'kling',
    mode: 'text-to-video',
    aspectRatio: '16:9',
    durationSeconds: 8,
  }),
  projectId: 'p1',
});
let project: Project;
function metadata(duration: number) {
  const create = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
    const element = create(tag, options);
    if (tag === 'video') {
      Object.defineProperty(element, 'duration', { value: duration });
      Object.defineProperty(element, 'videoWidth', { value: 32 });
      Object.defineProperty(element, 'videoHeight', { value: 32 });
      Object.defineProperty(element, 'load', { value: vi.fn() });
      queueMicrotask(() => {
        element.dispatchEvent(new Event('loadedmetadata'));
        element.dispatchEvent(new Event('loadeddata'));
      });
    }
    return element;
  });
}
beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  window.electron = undefined;
  project = {
    id: 'p1',
    studioResults: [],
    storyboard: { shots: [], timeline: { tracks: [], clips: [], zoomLevel: 20, currentTime: 0 } },
  } as unknown as Project;
  mocks.load.mockImplementation(async () => project);
  mocks.update.mockImplementation(
    async (_id: string, updater: (p: Project) => Promise<Project>) => {
      project = await updater(project);
      return { durable: true };
    },
  );
  mocks.getObjectUrl.mockResolvedValue('blob:local');
  mocks.getRecord.mockResolvedValue({ blob: new Blob(['video']) });
});

describe('externalStudioResultService', () => {
  it('freezes exact copied prompt before asynchronous metadata import', async () => {
    metadata(8);
    const source = artifact();
    const expected = source.primary.copyAll;
    const pending = externalStudioResultService.importVideo(
      'p1',
      source,
      0,
      new File(['video'], 'clip.mp4', { type: 'video/mp4' }),
    );
    source.primary.copyAll = 'Edited later';
    const result = await pending;
    expect(result.variantSnapshot.copyAll).toBe(expected);
    expect(result.sourceSnapshot.primary.copyAll).toBe(expected);
    expect(result.durationSeconds).toBe(8);
    expect(project.studioResults).toEqual([result]);
  });
  it('rejects non-video and invalid decoder metadata without storing media', async () => {
    await expect(
      externalStudioResultService.importVideo(
        'p1',
        artifact(),
        0,
        new File(['text'], 'x.txt', { type: 'text/plain' }),
      ),
    ).rejects.toThrow('video');
    metadata(Infinity);
    await expect(
      externalStudioResultService.importVideo(
        'p1',
        artifact(),
        0,
        new File(['x'], 'x.mp4', { type: 'video/mp4' }),
      ),
    ).rejects.toThrow('duration');
    expect(mocks.storeBlob).not.toHaveBeenCalled();
  });
  it('rolls back owned media when linking document fails and never copies desktop bytes', async () => {
    metadata(8);
    mocks.update.mockRejectedValue(new Error('Storage full'));
    const desktop = vi.fn();
    window.electron = { importDesktopMedia: desktop } as unknown as NonNullable<Window['electron']>;
    await expect(
      externalStudioResultService.importVideo(
        'p1',
        artifact(),
        0,
        new File(['x'], 'x.mp4', { type: 'video/mp4' }),
      ),
    ).rejects.toThrow('Storage full');
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(desktop).not.toHaveBeenCalled();
  });
  it('requires manual confirmation, creates a single scene, preserves timeline edits on reuse', async () => {
    metadata(8);
    const result = await externalStudioResultService.importVideo(
      'p1',
      artifact(),
      0,
      new File(['x'], 'x.mp4', { type: 'video/mp4' }),
    );
    await expect(
      externalStudioResultService.accept('p1', result.id, undefined, () => true),
    ).rejects.toThrow('manual review');
    await externalStudioResultService.confirm('p1', result.id, 'Watched video');
    await externalStudioResultService.accept('p1', result.id, undefined, () => true);
    project.storyboard.timeline.clips[0].startTime = 13;
    project.storyboard.timeline.clips[0].offset = 2;
    project.storyboard.timeline.clips[0].duration = 3;
    await externalStudioResultService.accept('p1', result.id, undefined, () => true);
    expect(project.storyboard.shots).toHaveLength(1);
    expect(project.storyboard.timeline.clips).toHaveLength(1);
    expect(project.storyboard.timeline.clips[0]).toMatchObject({
      resourceId: result.assetId,
      startTime: 13,
      offset: 2,
      duration: 3,
    });
  });
  it('invalidates manual review after media is relinked under the same key', async () => {
    metadata(8);
    const result = await externalStudioResultService.importVideo(
      'p1',
      artifact(),
      0,
      new File(['x'], 'x.mp4', { type: 'video/mp4' }),
    );
    await externalStudioResultService.confirm('p1', result.id, 'Watched original');
    mocks.getRecord.mockResolvedValueOnce({ blob: new Blob(['replacement video']) });
    await expect(
      externalStudioResultService.accept('p1', result.id, undefined, () => true),
    ).rejects.toThrow('Local media changed');
    expect(project.storyboard.shots).toHaveLength(0);
  });
  it('refuses acceptance when the active project changes during media read', async () => {
    metadata(8);
    const result = await externalStudioResultService.importVideo(
      'p1',
      artifact(),
      0,
      new File(['x'], 'x.mp4', { type: 'video/mp4' }),
    );
    await externalStudioResultService.confirm('p1', result.id, '');
    let active = true;
    mocks.getObjectUrl.mockImplementation(async () => {
      active = false;
      return 'blob:local';
    });
    await expect(
      externalStudioResultService.accept('p1', result.id, undefined, () => active),
    ).rejects.toThrow('active project changed');
    expect(project.storyboard.shots).toHaveLength(0);
  });
  it('relinks with a new media key, preserves exact source, and requires a new confirmation', async () => {
    metadata(8);
    const result = await externalStudioResultService.importVideo(
      'p1',
      artifact(),
      0,
      new File(['x'], 'original.mp4', { type: 'video/mp4' }),
    );
    await externalStudioResultService.confirm('p1', result.id, 'Original reviewed');
    const frozen = structuredClone(result.variantSnapshot);
    await externalStudioResultService.replaceVideo(
      'p1',
      result.id,
      new File(['replacement'], 'replacement.mp4', { type: 'video/mp4' }),
    );
    const replaced = project.studioResults![0];
    expect(replaced.assetId).not.toBe(result.assetId);
    expect(replaced.variantSnapshot).toEqual(frozen);
    expect(replaced.manualReview).toBeUndefined();
    await expect(
      externalStudioResultService.accept('p1', result.id, undefined, () => true),
    ).rejects.toThrow('manual review');
  });
});
