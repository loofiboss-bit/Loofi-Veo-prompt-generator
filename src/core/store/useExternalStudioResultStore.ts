import { create } from 'zustand';
import type { Asset, PromptArtifactV1 } from '@core/types';
import type { ExternalStudioResultV1 } from '@core/types/externalStudioResult';
import { externalStudioResultService } from '@core/services/externalStudioResultService';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';

interface ExternalStudioResultState {
  projectId: string | null;
  results: ExternalStudioResultV1[];
  assets: Record<string, Asset>;
  pending: boolean;
  error: string | null;
  hydrate: (projectId: string) => Promise<void>;
  importVideo: (
    projectId: string,
    artifact: PromptArtifactV1,
    variant: 0 | 1 | 2,
    file: File,
  ) => Promise<void>;
  confirm: (resultId: string, notes: string) => Promise<void>;
  replaceVideo: (resultId: string, file: File) => Promise<void>;
  accept: (resultId: string, shotId?: number) => Promise<void>;
}

let hydration = 0;
export const useExternalStudioResultStore = create<ExternalStudioResultState>((set, get) => {
  const load = async (projectId: string, version = hydration) => {
    const results = await externalStudioResultService.list(projectId);
    const entries = await Promise.all(
      results.map(async (result) => {
        const asset = await externalStudioResultService.resolveAsset(result);
        return asset ? ([result.id, asset] as const) : null;
      }),
    );
    if (version !== hydration || get().projectId !== projectId) return;
    const assets = Object.fromEntries(entries.filter((entry) => entry !== null));
    set({ results, assets });
    if (useProjectStore.getState().currentProjectId === projectId) {
      for (const result of results) {
        const asset = assets[result.id] ?? {
          id: result.assetId,
          storageKey: result.assetId,
          groupId: projectId,
          name: result.assetName,
          type: 'video' as const,
          mimeType: result.mimeType,
          data: '',
          url: '',
        };
        const app = useAppStore.getState();
        if (app.assets.some((item) => item.id === asset.id)) app.updateAsset(asset.id, asset);
        else app.addAsset(asset);
      }
    }
  };
  const operate = async (projectId: string, operation: () => Promise<unknown>) => {
    if (get().pending || get().projectId !== projectId) return;
    const version = hydration;
    set({ pending: true, error: null });
    try {
      await operation();
      await load(projectId, version);
    } catch (error) {
      if (version === hydration)
        set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (version === hydration) set({ pending: false });
    }
  };
  return {
    projectId: null,
    results: [],
    assets: {},
    pending: false,
    error: null,
    hydrate: async (projectId) => {
      const version = ++hydration;
      set({ projectId, results: [], assets: {}, pending: true, error: null });
      try {
        await load(projectId, version);
      } catch (error) {
        if (version === hydration) set({ error: String(error) });
      } finally {
        if (version === hydration) set({ pending: false });
      }
    },
    importVideo: (projectId, artifact, variant, file) =>
      operate(projectId, () =>
        externalStudioResultService.importVideo(projectId, artifact, variant, file),
      ),
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
    accept: (resultId, shotId) => {
      const projectId = get().projectId;
      return projectId
        ? operate(projectId, async () => {
            const editor = useAppStore.getState();
            const isCurrent = () =>
              get().projectId === projectId &&
              useProjectStore.getState().currentProjectId === projectId &&
              useAppStore.getState().sbShots === editor.sbShots &&
              useAppStore.getState().clips === editor.clips &&
              useAppStore.getState().tracks === editor.tracks;
            const project = await externalStudioResultService.accept(
              projectId,
              resultId,
              shotId,
              isCurrent,
              {
                shots: editor.sbShots,
                timeline: {
                  clips: editor.clips,
                  tracks: editor.tracks,
                  zoomLevel: editor.zoomLevel,
                  currentTime: editor.currentTime,
                },
              },
            );
            if (isCurrent())
              useAppStore.setState({
                sbShots: project.storyboard.shots,
                tracks: project.storyboard.timeline.tracks,
                clips: project.storyboard.timeline.clips,
              });
          })
        : Promise.resolve();
    },
  };
});
