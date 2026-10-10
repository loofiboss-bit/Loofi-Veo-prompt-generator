import JSZip from 'jszip';
import { manualReviewContext } from './productionReadinessService';
import { createPromptStudioDraft } from './promptStudioDraftService';
import { studioRevisionSnapshot } from './studioRevisionService';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset, Project, ProductionRun, PromptArtifactV1 } from '@core/types';

const state = vi.hoisted(() => ({
  assets: [] as Asset[],
  blobs: new Map<string, Blob>(),
  documents: new Map<string, Project>(),
  savedRuns: [] as ProductionRun[],
  getRuns: vi.fn(),
  listArtifacts: vi.fn(),
  saveArtifacts: vi.fn(),
  listDrafts: vi.fn(),
  saveDraft: vi.fn(),
}));
vi.mock('@core/services/projectService', () => ({
  projectService: {
    createProject: vi.fn(async ({ name }: { name: string }) => ({ id: 'imported-project', name })),
  },
}));
vi.mock('@core/services/projectDocumentService', () => ({
  projectDocumentService: {
    save: vi.fn(async (project: Project) => state.documents.set(project.id, project)),
    load: vi.fn(async (id: string) => state.documents.get(id)),
  },
}));
vi.mock('@core/services/productionRunService', () => ({
  productionRunService: {
    getRunsForProject: state.getRuns,
    saveRun: vi.fn(async (run: ProductionRun) => state.savedRuns.push(run)),
  },
}));
vi.mock('@core/services/promptStudioHandoffService', () => ({
  promptStudioHandoffService: {
    listArtifacts: state.listArtifacts,
    saveArtifacts: state.saveArtifacts,
    listDrafts: state.listDrafts,
    saveDraft: state.saveDraft,
  },
}));
vi.mock('@core/services/mediaAssetService', () => ({
  mediaAssetService: {
    storeBlob: vi.fn(async (key: string, blob: Blob) => state.blobs.set(key, blob)),
    getRecord: vi.fn(async (key: string) =>
      state.blobs.has(key) ? { blob: state.blobs.get(key) } : null,
    ),
    getObjectUrl: vi.fn(async (key: string) => `blob:${key}`),
  },
}));
vi.mock('@core/store/useAppStore', () => ({
  useAppStore: {
    getState: () => ({
      assets: state.assets,
      addAsset: (asset: Asset) => state.assets.push(asset),
      updateAsset: (id: string, changes: Partial<Asset>) => {
        state.assets = state.assets.map((asset) =>
          asset.id === id ? { ...asset, ...changes } : asset,
        );
      },
    }),
  },
}));
import {
  buildPortableProjectBundle,
  importPortableProject,
  hydrateProjectMedia,
  exportProjectOtioBundle,
  preflightProjectOtioExport,
  OtioExportPreflightError,
} from './projectTransferService';

const project = {
  id: 'a',
  name: 'A',
  lastModified: 1,
  future: { message: 'retain' },
  composer: { future: true },
  studioDraft: { revision: 4 },
  storyboard: {
    shots: [{ id: 1, generatedVideoUrl: 'blob:stale', takes: ['blob:stale'] }],
    timeline: { tracks: [], clips: [{ resourceId: 'a-video' }] },
  },
} as unknown as Project;
const asset = {
  id: 'a-video',
  name: 'Video',
  type: 'video',
  url: 'blob:stale',
  data: '',
  storageKey: 'stored-a',
  mimeType: 'video/mp4',
} as Asset;

describe('portable project transfer', () => {
  beforeEach(() => {
    state.assets = [asset, { ...asset, id: 'b-video', storageKey: 'stored-b' }];
    state.blobs.clear();
    state.blobs.set('stored-a', new Blob(['actual-video'], { type: 'video/mp4' }));
    state.documents.clear();
    state.savedRuns = [];
    state.getRuns.mockResolvedValue([]);
    state.listArtifacts.mockResolvedValue([]);
    state.listDrafts.mockResolvedValue([]);
  });

  it('exports only referenced media and round trips the full document into durable storage without network', async () => {
    const network = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('Unexpected network');
    });
    const blob = await buildPortableProjectBundle(project);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file('assets/a-video.mp4')).not.toBeNull();
    expect(zip.file('assets/b-video.mp4')).toBeNull();
    expect(state.listArtifacts).toHaveBeenCalledWith('a');
    state.assets = [];
    state.blobs.clear();
    const restored = await importPortableProject(
      new File([await blob.arrayBuffer()], 'a.loofi-project'),
    );
    expect(restored.id).toBe('imported-project');
    expect(restored.future).toEqual({ message: 'retain' });
    expect(restored.composer).toEqual({ future: true });
    expect(restored.studioDraft).toEqual({ revision: 4 });
    const localAsset = state.assets[0];
    expect(localAsset.storageKey).toBe(localAsset.id);
    expect(await state.blobs.get(localAsset.id)?.text()).toBe('actual-video');
    expect(restored.storyboard.timeline.clips[0].resourceId).toBe(localAsset.id);
    expect(restored.storyboard.shots[0].generatedVideoUrl).toBe(localAsset.url);
    state.assets[0].url = 'blob:expired';
    restored.storyboard.shots[0].generatedVideoUrl = 'blob:expired';
    await hydrateProjectMedia(restored);
    expect(restored.storyboard.shots[0].generatedVideoUrl).toBe(`blob:${localAsset.id}`);
    expect(network).not.toHaveBeenCalled();
    network.mockRestore();
  });

  it('round trips linked captions without treating caption resource identities as media', async () => {
    const document = structuredClone(project);
    document.documentRevision = 42;
    document.storyboard.timeline.clips = [
      {
        id: 'source-clip',
        resourceId: 'a-video',
        type: 'video',
        trackId: 'v',
        label: 'Source',
        startTime: 0,
        duration: 2,
        offset: 0,
      },
      {
        id: 'caption-clip',
        resourceId: 'caption-resource',
        type: 'text',
        trackId: 'text_main',
        label: 'Hej',
        startTime: 0,
        duration: 2,
        offset: 0,
        sourceClipId: 'source-clip',
        caption: {
          id: 'caption-resource',
          text: 'Hej världen',
          startTime: 0,
          endTime: 2,
          style: 'classic',
        },
      },
    ];
    const blob = await buildPortableProjectBundle(document);
    const restored = await importPortableProject(
      new File([await blob.arrayBuffer()], 'captions.loofi-project'),
    );
    const [source, caption] = restored.storyboard.timeline.clips;
    expect(source.id).not.toBe('source-clip');
    expect(caption.sourceClipId).toBe(source.id);
    expect(caption.caption?.text).toBe('Hej världen');
    expect(restored.documentRevision).toBe(0);
  });

  it('includes revision-only media and remaps revision and nested project identities', async () => {
    const draft = createPromptStudioDraft('a');
    draft.video.referenceAssetIds = ['a-video'];
    const document = {
      ...project,
      storyboard: {
        ...project.storyboard,
        shots: [],
        timeline: { ...project.storyboard.timeline, clips: [] },
      },
      studioRevisions: [
        {
          schemaVersion: 1 as const,
          id: 'revision-a',
          projectId: 'a',
          createdAt: '2026-10-08',
          reason: 'save',
          snapshot: studioRevisionSnapshot(draft),
        },
      ],
    };
    const blob = await buildPortableProjectBundle(document);
    state.assets = [];
    const restored = await importPortableProject(
      new File([await blob.arrayBuffer()], 'revision.loofi-project'),
    );
    expect(restored.studioRevisions?.[0].projectId).toBe('imported-project');
    expect(restored.studioRevisions?.[0].id).not.toBe('revision-a');
    expect(restored.studioRevisions?.[0].snapshot.video.referenceAssetIds).toEqual([
      state.assets[0].id,
    ]);
  });
  it('fails explicitly if referenced local media is missing', async () => {
    state.blobs.clear();
    await expect(buildPortableProjectBundle(project)).rejects.toThrow('Local media missing');
  });

  it('remaps run/take identity and revokes active approvals without submitting jobs', async () => {
    const run = {
      id: 'run',
      projectId: 'a',
      sourceArtifactId: 'artifact',
      sourceHandoffId: 'handoff',
      status: 'generating',
      approvals: [{ id: 'approval', status: 'active' }],
      shots: [
        {
          id: 1,
          selectedTakeId: 'take',
          takes: [
            { id: 'take', taskId: 'old-job', status: 'generating', localMediaKey: 'stored-a' },
          ],
        },
      ],
    } as unknown as ProductionRun;
    const sourceTake = run.shots[0].takes[0];
    sourceTake.manualReview = {
      contextIdentity: manualReviewContext(run.shots[0], sourceTake),
      confirmedAt: 1,
      notes: 'Checked',
    };
    run.shots[0].takes.push({
      ...sourceTake,
      id: 'stale-take',
      manualReview: {
        contextIdentity: 'obsolete',
        confirmedAt: 1,
        notes: 'Stale',
      },
    });
    state.getRuns.mockResolvedValue([run]);
    state.listArtifacts.mockResolvedValue([{ id: 'artifact', projectId: 'a' } as PromptArtifactV1]);
    state.listDrafts.mockResolvedValue([
      {
        id: 'handoff',
        artifactId: 'artifact',
        projectId: 'a',
        destination: 'production',
        status: 'draft',
      },
    ]);
    const blob = await buildPortableProjectBundle(project);
    const restored = await importPortableProject(
      new File([await blob.arrayBuffer()], 'a.loofi-project'),
    );
    const imported = state.savedRuns[0];
    expect(imported.projectId).toBe(restored.id);
    expect(imported.id).not.toBe('run');
    expect(state.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        id: imported.sourceHandoffId,
        artifactId: imported.sourceArtifactId,
        projectId: restored.id,
      }),
      expect.objectContaining({ id: imported.sourceArtifactId }),
    );
    expect(imported.shots[0].selectedTakeId).toBe(imported.shots[0].takes[0].id);
    expect(imported.approvals[0].status).toBe('revoked');
    expect(imported.shots[0].takes[0].status).toBe('recovery-required');
    expect(imported.shots[0].takes[0].taskId).toBeUndefined();
    expect(imported.shots[0].takes[0].localMediaUrl).toMatch(/^blob:/);
    expect(imported.shots[0].takes[0].manualReview?.contextIdentity).toBe(
      manualReviewContext(imported.shots[0], imported.shots[0].takes[0]),
    );
    expect(imported.shots[0].takes[1].manualReview?.contextIdentity).toBe('obsolete');
  });
  it('packages storyboard dialogue from its audio URL independently of the selected video', async () => {
    state.assets[0] = { ...state.assets[0], groupId: project.id };
    const dialogue: Asset = {
      ...asset,
      id: 'dialogue',
      type: 'audio',
      mimeType: 'audio/wav',
      storageKey: 'dialogue-bytes',
      url: 'blob:dialogue',
    };
    state.assets.push(dialogue);
    state.blobs.set('dialogue-bytes', new Blob(['actual-dialogue'], { type: 'audio/wav' }));
    const document = {
      ...project,
      storyboard: {
        shots: [{ id: 1, generatedVideoUrl: asset.url, audioUrl: dialogue.url }],
        timeline: {
          tracks: [
            { id: 'v', type: 'video', label: 'Video' },
            { id: 'a', type: 'audio', label: 'Dialogue' },
          ],
          clips: [
            {
              id: 'video_1',
              resourceId: 1,
              trackId: 'v',
              type: 'video',
              label: 'Video',
              startTime: 0,
              duration: 2,
              offset: 0,
            },
            {
              id: 'audio_1',
              resourceId: 1,
              trackId: 'a',
              type: 'audio',
              label: 'Dialogue',
              startTime: 0,
              duration: 2,
              offset: 0,
            },
          ],
        },
      },
    } as unknown as Project;
    const run = {
      projectId: project.id,
      shots: [
        {
          id: 1,
          selectedTakeId: 'take',
          takes: [{ id: 'take', localMediaKey: 'a-video', localMediaUrl: asset.url }],
        },
      ],
    } as unknown as ProductionRun;
    for (const selectedRun of [run, undefined]) {
      const bundle = await exportProjectOtioBundle(document, selectedRun);
      const zip = await JSZip.loadAsync(await bundle.arrayBuffer());
      expect(await zip.file('assets/dialogue.wav')!.async('string')).toBe('actual-dialogue');
      const timeline = JSON.parse(await zip.file('timeline.otio')!.async('string'));
      expect(timeline.tracks.children[1].children[0].media_reference.target_url).toBe(
        'assets/dialogue.wav',
      );
      expect(timeline.tracks.children[0].children[0].media_reference.target_url).toBe(
        'assets/a-video.mp4',
      );
    }
  });
  it('delivers only actual video/audio edit media, ignoring unavailable old takes and revisions', async () => {
    const music: Asset = {
      ...asset,
      id: 'music',
      type: 'audio',
      mimeType: 'audio/wav',
      storageKey: 'music-bytes',
      url: 'blob:music',
    };
    state.assets.push(music);
    state.blobs.set('music-bytes', new Blob(['sound'], { type: 'audio/wav' }));
    const document = {
      ...project,
      studioRevisions: [{ snapshot: { referenceAssetIds: ['missing-revision'] } }],
      storyboard: {
        ...project.storyboard,
        timeline: {
          tracks: [
            { id: 'v', type: 'video', label: 'Video' },
            { id: 'a', type: 'audio', label: 'Audio' },
          ],
          clips: [
            {
              id: 'v1',
              trackId: 'v',
              type: 'video',
              resourceId: 'a-video',
              label: 'Chosen',
              startTime: 2,
              offset: 1,
              duration: 3,
            },
            {
              id: 'a1',
              trackId: 'a',
              type: 'audio',
              resourceId: 'music',
              label: 'Music',
              startTime: 0,
              offset: 0.5,
              duration: 5,
            },
          ],
        },
      },
    } as unknown as Project;
    const run = {
      id: 'run',
      projectId: 'a',
      shots: [
        {
          id: 1,
          selectedTakeId: 'gone',
          takes: [{ id: 'gone', localMediaKey: 'gone', status: 'accepted' }],
        },
      ],
    } as unknown as ProductionRun;
    state.getRuns.mockResolvedValue([run]);
    const network = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('Unexpected network');
    });
    const blob = await exportProjectOtioBundle(document, run);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file('assets/a-video.mp4')).not.toBeNull();
    expect(zip.file('assets/music.wav')).not.toBeNull();
    expect(zip.file('assets/gone.mp4')).toBeNull();
    expect(zip.file('project.json')).toBeNull();
    const timeline = JSON.parse(await zip.file('timeline.otio')!.async('string'));
    expect(timeline.tracks.children[0].children[0].OTIO_SCHEMA).toBe('Gap.1');
    expect(timeline.tracks.children[0].children[1].source_range.start_time.value).toBe(24);
    expect(timeline.tracks.children[1].children[0].media_reference.target_url).toBe(
      'assets/music.wav',
    );
    expect(network).not.toHaveBeenCalled();
    network.mockRestore();
    await expect(buildPortableProjectBundle(document)).rejects.toThrow(
      'Referenced local media missing',
    );
  });

  it('reports concrete missing chosen clips before packaging', async () => {
    state.blobs.clear();
    const document = {
      ...project,
      storyboard: {
        ...project.storyboard,
        timeline: {
          tracks: [{ id: 'v', type: 'video', label: 'Video' }],
          clips: [
            {
              id: 'c',
              trackId: 'v',
              resourceId: 'a-video',
              label: 'Scene opening',
              startTime: 0,
              duration: 2,
              offset: 0,
            },
          ],
        },
      },
    } as unknown as Project;
    expect(await preflightProjectOtioExport(document)).toEqual({
      missingMedia: [
        {
          mediaKey: 'a-video',
          clipId: 'c',
          clipLabel: 'Scene opening',
          assetId: 'a-video',
          shotId: undefined,
        },
      ],
    });
    await expect(exportProjectOtioBundle(document)).rejects.toBeInstanceOf(
      OtioExportPreflightError,
    );
  });

  it('remaps external result, frozen artifact and media identities while keeping numeric scenes consistent', async () => {
    const document = {
      ...project,
      studioResults: [
        {
          id: 'external-result',
          projectId: 'a',
          assetId: 'a-video',
          artifactId: 'frozen-artifact',
          storyboardShotId: 1,
          variantIndex: 0,
          artifactSnapshot: { id: 'frozen-artifact', projectId: 'a', prompt: 'Frozen prompt' },
        },
      ],
    } as unknown as Project;
    const blob = await buildPortableProjectBundle(document);
    state.assets = [];
    const restored = await importPortableProject(
      new File([await blob.arrayBuffer()], 'result.loofi-project'),
    );
    const result = (
      restored as unknown as {
        studioResults: {
          id: string;
          projectId: string;
          assetId: string;
          artifactId: string;
          storyboardShotId: number;
          artifactSnapshot: { id: string; projectId: string; prompt: string };
        }[];
      }
    ).studioResults[0];
    expect(result.id).not.toBe('external-result');
    expect(result.projectId).toBe(restored.id);
    expect(result.assetId).toBe(state.assets[0].id);
    expect(result.artifactId).toBe(result.artifactSnapshot.id);
    expect(result.artifactId).not.toBe('frozen-artifact');
    expect(result.artifactSnapshot.projectId).toBe(restored.id);
    expect(result.artifactSnapshot.prompt).toBe('Frozen prompt');
    expect(result.storyboardShotId).toBe(restored.storyboard.shots[0].id);
  });
  it('exports a selected generated take without requiring other takes or reference assets', async () => {
    const document = {
      ...project,
      storyboard: {
        ...project.storyboard,
        timeline: {
          tracks: [{ id: 'v', type: 'video', label: 'Video' }],
          clips: [
            {
              id: 'chosen',
              trackId: 'v',
              resourceId: 1,
              selectedTakeId: 'selected',
              label: 'Selected scene',
              startTime: 0,
              duration: 2,
              offset: 0.5,
            },
          ],
        },
      },
    } as unknown as Project;
    const run = {
      projectId: 'a',
      shots: [
        {
          id: 1,
          selectedTakeId: 'old',
          takes: [
            { id: 'old', localMediaKey: 'gone' },
            {
              id: 'selected',
              localMediaKey: 'selected-bytes',
              prompt: 'Chosen prompt',
              request: { modelId: 'veo' },
            },
          ],
        },
      ],
    } as unknown as ProductionRun;
    state.blobs.set('selected-bytes', new Blob(['chosen-video'], { type: 'video/mp4' }));
    const blob = await exportProjectOtioBundle(document, run);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file('assets/selected-bytes.mp4')).not.toBeNull();
    expect(zip.file('assets/a-video.mp4')).toBeNull();
    const timeline = JSON.parse(await zip.file('timeline.otio')!.async('string'));
    expect(timeline.tracks.children[0].children[0].metadata.loofi).toMatchObject({
      takeId: 'selected',
      prompt: 'Chosen prompt',
    });
    const provenance = JSON.parse(await zip.file('provenance.json')!.async('string'));
    expect(provenance.clips[0].take.id).toBe('selected');
    run.shots[0].takes[1].localMediaKey = undefined;
    expect((await preflightProjectOtioExport(document, run)).missingMedia).toHaveLength(1);
  });

  it('includes only selected external result provenance and keeps relative media paths', async () => {
    const document = {
      ...project,
      studioResults: [
        {
          id: 'chosen-result',
          assetId: 'a-video',
          artifactId: 'snapshot',
          variantIndex: 0,
          artifactSnapshot: { prompt: 'Exactly copied prompt' },
        },
        { id: 'unused-result', assetId: 'missing-external' },
      ],
      storyboard: {
        ...project.storyboard,
        timeline: {
          tracks: [{ id: 'v', type: 'video', label: 'Video' }],
          clips: [
            {
              id: 'external',
              trackId: 'v',
              resourceId: 'a-video',
              label: 'Imported result',
              startTime: 0,
              duration: 2,
              offset: 0,
            },
          ],
        },
      },
    } as unknown as Project;
    const blob = await exportProjectOtioBundle(document);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const provenance = JSON.parse(await zip.file('provenance.json')!.async('string'));
    expect(provenance.studioResults).toHaveLength(1);
    expect(provenance.studioResults[0].artifactSnapshot.prompt).toBe('Exactly copied prompt');
    const timeline = JSON.parse(await zip.file('timeline.otio')!.async('string'));
    expect(timeline.tracks.children[0].children[0].media_reference.target_url).toBe(
      'assets/a-video.mp4',
    );
  });
  it('rejects an empty actual edit instead of falling back to storyboard scenes', async () => {
    const document = {
      ...project,
      storyboard: {
        ...project.storyboard,
        timeline: { tracks: [{ id: 'v', type: 'video', label: 'Video' }], clips: [] },
      },
    } as unknown as Project;
    await expect(exportProjectOtioBundle(document)).rejects.toThrow(
      'Timeline has no exportable media clips',
    );
  });
});
