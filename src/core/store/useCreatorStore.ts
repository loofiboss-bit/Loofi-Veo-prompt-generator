import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Project } from '@core/types';
import type { CreatorRecipeV1, CreatorStyleProfileV1 } from '@core/types/creatorDelivery';
import { creatorRecipeService } from '@core/services/creatorRecipeService';
import { creatorStyleService, validateCreatorStyle } from '@core/services/creatorStyleService';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { hydrateProjectMedia } from '@core/services/projectTransferService';
import { useProjectStore } from '@core/store/useProjectStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { usePromptStudioDraftStore } from '@core/store/usePromptStudioDraftStore';
import { resolveProjectAssetBlob } from '@core/utils/projectArchiver';
import { useAppStore } from '@core/store/useAppStore';

async function preserveCurrent(): Promise<void> {
  if (!(await usePromptStudioDraftStore.getState().flush()))
    throw new Error('Save the Studio draft before continuing.');
  const projects = useProjectStore.getState();
  const current = projects.projects.find((project) => project.id === projects.currentProjectId);
  if (current)
    await projectDocumentService.save(
      useEditorSessionStore.getState().captureCurrentProjectDocument(current),
    );
}
interface RecentCreatorProject {
  project: Project;
  mediaReady: boolean;
  previewUrl?: string;
}
interface CreatorStore {
  busy: boolean;
  error: string | null;
  notice: string | null;
  profiles: CreatorStyleProfileV1[];
  recent: RecentCreatorProject[];
  initialize: () => Promise<void>;
  open: (id: string) => Promise<boolean>;
  create: (
    recipe: CreatorRecipeV1,
    idea: string,
    name: string,
    offline?: boolean,
  ) => Promise<boolean>;
  saveStyle: (profile: CreatorStyleProfileV1) => Promise<boolean>;
  applyStyle: (profile: CreatorStyleProfileV1) => Promise<boolean>;
  saveTemplate: (recipe: CreatorRecipeV1, idea: string, title: string) => Promise<void>;
}
export const useCreatorStore = create<CreatorStore>()(
  temporal(
    (set, get) => {
      const run = async (operation: () => Promise<void>) => {
        if (get().busy) return false;
        set({ busy: true, error: null, notice: null });
        try {
          await operation();
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
          return false;
        } finally {
          set({ busy: false });
        }
      };
      const activate = async (project: Project) => {
        await hydrateProjectMedia(project);
        if (!(await useProjectStore.getState().setCurrentProject(project.id)))
          throw new Error('Project could not be activated.');
        useEditorSessionStore.getState().commitProjectDocument(project, 'load');
        if (!(await usePromptStudioDraftStore.getState().hydrate(project.id)))
          throw new Error('Studio draft could not be loaded.');
      };
      return {
        busy: false,
        error: null,
        notice: null,
        profiles: [],
        recent: [],
        initialize: async () => {
          await run(async () => {
            await useProjectStore.getState().refreshProjects();
            const recent: RecentCreatorProject[] = [];
            for (const metadata of useProjectStore
              .getState()
              .projects.filter((item) => item.status === 'active')
              .slice(0, 6)) {
              const project = await projectDocumentService.load(metadata.id);
              if (!project) continue;
              await hydrateProjectMedia(project);
              const shots = project.storyboard.shots;
              const clips =
                project.storyboard.timeline?.clips.filter(
                  (clip) => clip.type === 'video' || clip.type === 'image' || clip.type === 'audio',
                ) ?? [];
              const available = await Promise.all(
                clips.map(async (clip) => {
                  const shot = shots.find((candidate) => candidate.id === clip.resourceId);
                  const asset = useAppStore
                    .getState()
                    .assets.find(
                      (candidate) =>
                        candidate.id === clip.resourceId ||
                        candidate.id === shot?.stockSourceId ||
                        candidate.url === shot?.generatedVideoUrl,
                    );
                  return Boolean(asset && (await resolveProjectAssetBlob(asset)));
                }),
              );
              const mediaReady = clips.length > 0 && available.every(Boolean);
              recent.push({
                project,
                mediaReady,
                previewUrl: shots.find((shot) => shot.generatedVideoUrl)?.generatedVideoUrl,
              });
            }
            set({ recent, profiles: await creatorStyleService.list() });
          });
        },
        open: async (id) =>
          run(async () => {
            await preserveCurrent();
            const project = await projectDocumentService.load(id);
            if (!project) throw new Error('Project not found.');
            await activate(project);
          }),
        create: async (recipe, idea, name, offline = false) =>
          run(async () => {
            await preserveCurrent();
            const { project, assets } = await creatorRecipeService.create(
              recipe,
              idea,
              name,
              offline,
            );
            assets.forEach((asset) => useAppStore.getState().addAsset(asset));
            await useProjectStore.getState().refreshProjects();
            await activate(project);
          }),
        saveStyle: async (profile) =>
          run(async () => {
            await creatorStyleService.save(profile);
            set({ profiles: await creatorStyleService.list() });
          }),
        applyStyle: async (profile) =>
          run(async () => {
            validateCreatorStyle(profile);
            const id = useProjectStore.getState().currentProjectId;
            await preserveCurrent();
            if (id !== useProjectStore.getState().currentProjectId)
              throw new Error('Project changed before style application.');
            if (!id) throw new Error('Open a project before applying a style.');
            if (
              !(await usePromptStudioDraftStore
                .getState()
                .checkpoint('Before applying creator style'))
            )
              throw new Error('Style checkpoint could not be saved.');
            if (id !== useProjectStore.getState().currentProjectId)
              throw new Error('Project changed during style checkpoint.');
            await projectDocumentService.update(id, async (project) => {
              if (!project) throw new Error('Project not found.');
              const delivery = project.creatorDelivery ?? {
                schemaVersion: 1 as const,
                revision: 0,
                aspectRatio: '16:9' as const,
                captionsMode: 'sidecar' as const,
                captionStyle: 'classic' as const,
                safeMargin: 0.08,
                crops: {},
                title: project.name,
                description: '',
                updatedAt: Date.now(),
              };
              return {
                ...project,
                creatorDelivery: {
                  ...delivery,
                  style: structuredClone(profile),
                  revision: delivery.revision + 1,
                  updatedAt: Date.now(),
                },
              };
            });
            const saved = await projectDocumentService.load(id);
            if (!saved) throw new Error('Style could not be read back.');
            if (id !== useProjectStore.getState().currentProjectId)
              throw new Error('Project changed during style application.');
            useEditorSessionStore.getState().commitProjectDocument(saved, 'save');
            const draft = usePromptStudioDraftStore.getState();
            draft.updateVideo({ style: profile.creativeDescription });
            if (!(await draft.flush(id))) throw new Error('Style prompt could not be saved.');
            set({ notice: 'Style applied to this project.' });
          }),
        saveTemplate: async (recipe, idea, title) => {
          await run(async () => {
            await creatorRecipeService.saveTemplate(recipe, idea, title);
            set({ notice: 'Recipe saved to the Studio template library.' });
          });
        },
      };
    },
    { partialize: (state) => ({ profiles: state.profiles }) },
  ),
);
