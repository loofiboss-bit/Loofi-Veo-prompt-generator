import { create } from 'zustand';
import type {
  MusicPromptArtifactInput,
  PromptArtifactV1,
  PromptStudioDraftV1,
  VideoPromptArtifactInput,
} from '@core/types';
import { promptStudioDraftService } from '@core/services/promptStudioDraftService';

interface PromptStudioDraftStore {
  draft: PromptStudioDraftV1 | null;
  status: 'loading' | 'saving' | 'saved' | 'error';
  error: string | null;
  hydrate: (projectId: string) => Promise<boolean>;
  flush: (projectId?: string) => Promise<boolean>;
  updateVideo: (updates: Partial<VideoPromptArtifactInput>) => void;
  updateMusic: (updates: Partial<MusicPromptArtifactInput>) => void;
  setMode: (mode: 'video' | 'music') => void;
  setArtifact: (artifact: PromptArtifactV1 | null) => void;
  setSelectedVariant: (index: 0 | 1 | 2) => void;
  setLockedSections: (sections: string[]) => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<boolean> | null = null;
let dirty = false;
let hydrateVersion = 0;

export const usePromptStudioDraftStore = create<PromptStudioDraftStore>((set, get) => {
  const update = (changes: Partial<PromptStudioDraftV1>) => {
    const draft = get().draft;
    if (!draft || get().status === 'loading') return;
    dirty = true;
    set({
      draft: {
        ...draft,
        ...changes,
        revision: draft.revision + 1,
        updatedAt: new Date().toISOString(),
      },
      status: 'saving',
      error: null,
    });
    clearTimeout(timer);
    timer = setTimeout(() => {
      void get().flush();
    }, 500);
  };

  return {
    draft: null,
    status: 'loading',
    error: null,
    hydrate: async (projectId) => {
      if (get().draft?.projectId === projectId) return true;
      const version = ++hydrateVersion;
      if (!(await get().flush())) return false;
      if (version !== hydrateVersion) return false;
      set({ status: 'loading', error: null });
      try {
        const draft = await promptStudioDraftService.load(projectId);
        if (version !== hydrateVersion) return false;
        dirty = false;
        set({ draft, status: 'saved', error: null });
        return true;
      } catch (error) {
        if (version === hydrateVersion) set({ status: 'error', error: String(error) });
        return false;
      }
    },
    flush: async (projectId) => {
      clearTimeout(timer);
      if (saving) {
        if (!(await saving)) return false;
        return get().flush(projectId);
      }
      const draft = get().draft;
      if (!draft || !dirty || (projectId && projectId !== draft.projectId)) return true;
      set({ status: 'saving', error: null });
      saving = (async () => {
        try {
          await promptStudioDraftService.save(draft);
          if (get().draft === draft) {
            dirty = false;
            set({ status: 'saved', error: null });
          }
          return true;
        } catch (error) {
          set({ status: 'error', error: error instanceof Error ? error.message : String(error) });
          return false;
        }
      })();
      const result = await saving;
      saving = null;
      if (result && dirty) return get().flush(projectId);
      return result;
    },
    updateVideo: (updates) => {
      if (get().draft) update({ video: { ...get().draft!.video, ...updates } });
    },
    updateMusic: (updates) => {
      if (get().draft) update({ music: { ...get().draft!.music, ...updates } });
    },
    setMode: (mode) => {
      const draft = get().draft;
      if (!draft || draft.mode === mode) return;
      const artifacts = { ...draft.artifacts, [draft.mode]: draft.artifact };
      const selectedVariants = { ...draft.selectedVariants, [draft.mode]: draft.selectedVariant };
      update({
        mode,
        artifacts,
        selectedVariants,
        artifact: artifacts[mode] ?? null,
        selectedVariant: selectedVariants[mode] ?? 0,
      });
    },
    setArtifact: (artifact) => {
      const draft = get().draft;
      if (draft) update({ artifact, artifacts: { ...draft.artifacts, [draft.mode]: artifact } });
    },
    setSelectedVariant: (selectedVariant) => {
      const draft = get().draft;
      if (draft)
        update({
          selectedVariant,
          selectedVariants: { ...draft.selectedVariants, [draft.mode]: selectedVariant },
        });
    },
    setLockedSections: (lockedSections) => update({ lockedSections }),
  };
});
