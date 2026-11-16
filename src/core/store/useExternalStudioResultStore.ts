import { create } from 'zustand';
import type { Asset, PromptArtifactV1, Shot, TimelineState } from '@core/types';
import type { ExternalStudioResultV1 } from '@core/types/externalStudioResult';
import { externalStudioResultService } from '@core/services/externalStudioResultService';
import { storeMediator } from '@core/store/mediator';

interface ExternalStudioResultState {
  projectId: string | null;
  results: ExternalStudioResultV1[];
  assets: Record<string, Asset>;
  pending: boolean;
  error: string | null;
  _hydrationVersion: number;
  hydrate: (projectId: string) => Promise<void>;
  importVideo: (
    projectId: string,
    artifact: PromptArtifactV1,
    variant: 0 | 1 | 2,
    file: File,
  ) => Promise<void>;
  confirm: (resultId: string, notes: string) => Promise<void>;
  saveComparisonNotes: (resultId: string, notes: string) => Promise<void>;
  replaceVideo: (resultId: string, file: File) => Promise<void>;
  accept: (
    resultId: string,
    shotId?: number,
    options?: {
      editorSnapshot?: { shots: Shot[]; timeline: TimelineState };
      isCurrent?: () => boolean;
    },
  ) => Promise<void>;
}

export const useExternalStudioResultStore = create<ExternalStudioResultState>((set, get) => {
  const load = async (projectId: string, version = get()._hydrationVersion) => {
    const results = await externalStudioResultService.list(projectId);
    const entries = await Promise.all(
      results.map(async (result) => {
        const asset = await externalStudioResultService.resolveAsset(result);
        return asset ? ([result.id, asset] as const) : null;
      }),
    );
    if (version !== get()._hydrationVersion || get().projectId !== projectId) return;
    const assets = Object.fromEntries(entries.filter((entry) => entry !== null));
    set({ results, assets });
    const resolvedAssets: Asset[] = results.map(
      (result) =>
        assets[result.id] ?? {
          id: result.assetId,
          storageKey: result.assetId,
          groupId: projectId,
          name: result.assetName,
          type: 'video' as const,
          mimeType: result.mimeType,
          data: '',
          url: '',
        },
    );
    storeMediator.emit('studioResult:assetsSynchronized', {
      projectId,
      assets: resolvedAssets,
    });
  };
  const operate = async (projectId: string, operation: () => Promise<unknown>) => {
    if (get().pending || get().projectId !== projectId) return;
    const version = get()._hydrationVersion;
    set({ pending: true, error: null });
    try {
      await operation();
      await load(projectId, version);
    } catch (error) {
      if (version === get()._hydrationVersion)
        set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (version === get()._hydrationVersion) set({ pending: false });
    }
  };
  return {
    projectId: null,
    results: [],
    assets: {},
    pending: false,
    error: null,
    _hydrationVersion: 0,
    hydrate: async (projectId) => {
      const version = get()._hydrationVersion + 1;
      set({
        projectId,
        results: [],
        assets: {},
        pending: true,
        error: null,
        _hydrationVersion: version,
      });
      try {
        await load(projectId, version);
      } catch (error) {
        if (version === get()._hydrationVersion) set({ error: String(error) });
      } finally {
        if (version === get()._hydrationVersion) set({ pending: false });
      }
    },
    importVideo: (projectId, artifact, variant, file) =>
      operate(projectId, () =>
        externalStudioResultService.importVideo(projectId, artifact, variant, file),
      ),
    saveComparisonNotes: async (resultId, notes) => {
      const projectId = get().projectId;
      if (!projectId || get().pending)
        throw new Error('Wait for the active project to finish loading.');
      const version = get()._hydrationVersion;
      await externalStudioResultService.saveComparisonNotes(projectId, resultId, notes);
      if (version === get()._hydrationVersion && get().projectId === projectId)
        set({
          results: get().results.map((result) =>
            result.id === resultId ? { ...result, comparisonNotes: notes } : result,
          ),
        });
    },
    confirm: (resultId, notes) => {
      const projectId = get().projectId;
      return projectId
        ? operate(projectId, () => externalStudioResultService.confirm(projectId, resultId, notes))
        : Promise.resolve();
    },
    replaceVideo: (resultId, file) => {
      const projectId = get().projectId;
      return projectId
        ? operate(projectId, () =>
            externalStudioResultService.replaceVideo(projectId, resultId, file),
          )
        : Promise.resolve();
    },
    accept: (resultId, shotId, options) => {
      const projectId = get().projectId;
      return projectId
        ? operate(projectId, async () => {
            const isCurrent = options?.isCurrent ?? (() => get().projectId === projectId);
            const project = await externalStudioResultService.accept(
              projectId,
              resultId,
              shotId,
              isCurrent,
              options?.editorSnapshot,
            );
            if (isCurrent()) {
              storeMediator.emit('timeline:synced', {
                shots: project.storyboard.shots,
                tracks: project.storyboard.timeline.tracks,
                clips: project.storyboard.timeline.clips,
              });
            }
          })
        : Promise.resolve();
    },
  };
});
