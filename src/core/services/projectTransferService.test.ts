import JSZip from 'jszip';
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
  });
});
