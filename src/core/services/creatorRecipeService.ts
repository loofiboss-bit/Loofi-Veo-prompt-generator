import type { Asset, Project, PromptStudioDraftV1 } from '@core/types';
import type { CreatorRecipeV1 } from '@core/types/creatorDelivery';
import { CREATOR_RECIPES, CREATOR_RECIPE_LABELS } from '@core/config/creatorRecipes';
import { projectService } from '@core/services/projectService';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { createPromptStudioDraft } from '@core/services/promptStudioDraftService';
import {
  compileVideoPromptArtifact,
  compileMusicPromptArtifact,
} from '@core/services/promptStudioService';
import { studioTemplateService } from '@core/services/studioTemplateService';
import { createEmptyProjectDocument } from '@core/store/editorSessionAdapters';

export function buildRecipeDraft(
  recipe: CreatorRecipeV1,
  idea: string,
  projectId: string,
): PromptStudioDraftV1 {
  const draft = createPromptStudioDraft(projectId);
  draft.video = {
    ...draft.video,
    idea,
    aspectRatio: recipe.aspectRatio === '9:16' ? '9:16' : '16:9',
    durationSeconds: 4,
  };
  draft.music = { ...draft.music, topic: idea, instrumental: true, genre: 'Ambient', mood: 'Warm' };
  draft.mode = recipe.category === 'music' ? 'music' : 'video';
  draft.artifact =
    draft.mode === 'music'
      ? compileMusicPromptArtifact(draft.music)
      : compileVideoPromptArtifact(draft.video);
  return draft;
}
class CreatorRecipeService {
  private static instance: CreatorRecipeService;
  static getInstance(): CreatorRecipeService {
    return (this.instance ??= new CreatorRecipeService());
  }
  async create(
    recipe: CreatorRecipeV1,
    idea: string,
    title: string,
    offline = false,
  ): Promise<{ project: Project; assets: Asset[] }> {
    if (!idea.trim() || !title.trim()) throw new Error('A title and idea are required.');
    const inventory = await projectService.createProject({ name: title.trim() });
    const project = createEmptyProjectDocument(inventory);
    project.studioDraft = buildRecipeDraft(recipe, idea, project.id);
    const assets: Asset[] = [];
    if (offline) {
      if (!recipe.exampleId) throw new Error('This recipe has no offline example.');
      for (const [file, type] of [
        [`${recipe.exampleId}.mp4`, 'video'],
        ['music.wav', 'audio'],
      ] as const) {
        const response = await fetch(`${import.meta.env.BASE_URL}creator-examples/${file}`);
        if (!response.ok) throw new Error(`Example media could not be loaded: ${file}`);
        const blob = await response.blob();
        const key = `creator-example:${crypto.randomUUID()}`;
        const mimeType = type === 'video' ? 'video/mp4' : 'audio/wav';
        let url: string;
        if (window.electron?.importDesktopMedia)
          url = (
            await window.electron.importDesktopMedia({
              key,
              bytes: await blob.arrayBuffer(),
              mimeType,
            })
          ).localUrl;
        else {
          await mediaAssetService.storeBlob(key, new Blob([blob], { type: mimeType }));
          url = (await mediaAssetService.getObjectUrl(key))!;
        }
        assets.push({
          id: key,
          storageKey: key,
          type,
          name: file,
          url,
          mimeType,
          data: '',
          tags: ['offline-example', 'CC0-1.0'],
        });
      }
    }
    project.storyboard.shots = recipe.sceneIdeas.map((scene, index) => {
      const artifact = compileVideoPromptArtifact({
        ...project.studioDraft!.video,
        idea: `${idea}. ${scene}`,
      });
      return {
        id: index + 1,
        type: 'video',
        action: 'prompt' in artifact.primary ? artifact.primary.prompt : scene,
        camera: '',
        characterId: '',
        takes: offline ? [assets[0].url] : [],
        selectedTakeIndex: 0,
        visualLink: false,
        duration: 4,
        transition: { type: 'cut', duration: 0 },
        generatedVideoUrl: offline ? assets[0].url : undefined,
        sourceType: offline ? 'stock' : undefined,
        stockSourceId: offline ? assets[0].id : undefined,
      };
    });
    project.storyboard.timeline = {
      zoomLevel: 20,
      currentTime: 0,
      tracks: [
        { id: 'creator-video', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 0 },
        { id: 'creator-music', label: 'Music', type: 'audio', trackType: 'music', zIndex: 1 },
        {
          id: 'creator-captions',
          label: 'Captions',
          type: 'text',
          trackType: 'captions',
          zIndex: 2,
        },
      ],
      clips: offline
        ? [
            ...project.storyboard.shots.map((shot, index) => ({
              id: crypto.randomUUID(),
              resourceId: shot.id,
              trackId: 'creator-video',
              startTime: index * 4,
              duration: 4,
              offset: 0,
              type: 'video' as const,
              label: recipe.sceneIdeas[index],
            })),
            ...recipe.sceneIdeas.map((text, index) => ({
              id: crypto.randomUUID(),
              resourceId: `creator-caption-${index}`,
              trackId: 'creator-captions',
              startTime: index * 4,
              duration: 4,
              offset: 0,
              type: 'text' as const,
              label: text,
              caption: {
                id: crypto.randomUUID(),
                text,
                startTime: index * 4,
                endTime: (index + 1) * 4,
                style: 'classic' as const,
              },
            })),
            {
              id: crypto.randomUUID(),
              resourceId: assets[1].id,
              trackId: 'creator-music',
              startTime: 0,
              duration: recipe.sceneCount * 4,
              offset: 0,
              type: 'audio',
              label: 'Original ambient tone',
              volume: 0.5,
            },
          ]
        : [],
    };
    project.creatorDelivery = {
      schemaVersion: 1,
      revision: 0,
      recipeId: recipe.id,
      editorMode: 'delivery',
      aspectRatio: recipe.aspectRatio,
      captionsMode: 'sidecar',
      captionStyle: 'classic',
      safeMargin: 0.08,
      crops: {},
      title: title.trim(),
      description: idea.trim(),
      updatedAt: Date.now(),
    };
    await projectDocumentService.save(project);
    await projectService.registerDocument(project);
    return { project, assets };
  }
  async createFromFiles(
    files: File[],
    title: string,
  ): Promise<{ project: Project; assets: Asset[] }> {
    if (!files.length || !title.trim()) throw new Error('Choose media and a project title.');
    const assets: Asset[] = [];
    for (const file of files) assets.push(await mediaAssetService.importLocalFile(file));
    const inventory = await projectService.createProject({ name: title.trim() });
    const project = createEmptyProjectDocument(inventory);
    let videoTime = 0;
    let audioTime = 0;
    project.storyboard.timeline = {
      zoomLevel: 20,
      currentTime: 0,
      tracks: [
        { id: 'creator-video', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 0 },
        { id: 'creator-audio', label: 'Audio', type: 'audio', trackType: 'music', zIndex: 1 },
        {
          id: 'creator-captions',
          label: 'Captions',
          type: 'text',
          trackType: 'captions',
          zIndex: 2,
        },
      ],
      clips: assets.map((asset) => {
        const duration = asset.type === 'image' ? 5 : asset.durationSeconds!;
        const startTime = asset.type === 'audio' ? audioTime : videoTime;
        if (asset.type === 'audio') audioTime += duration;
        else videoTime += duration;
        return {
          id: crypto.randomUUID(),
          resourceId: asset.id,
          type: asset.type,
          trackId: asset.type === 'audio' ? 'creator-audio' : 'creator-video',
          label: asset.name,
          startTime,
          duration,
          offset: 0,
          volume: 1,
        };
      }),
    };
    project.creatorDelivery = {
      schemaVersion: 1,
      revision: 0,
      editorMode: 'delivery',
      aspectRatio: '9:16',
      captionsMode: 'sidecar',
      captionStyle: 'classic',
      safeMargin: 0.08,
      crops: {},
      title: title.trim(),
      description: '',
      updatedAt: Date.now(),
    };
    await projectDocumentService.save(project);
    await projectService.registerDocument(project);
    return { project, assets };
  }
  async saveTemplate(recipe: CreatorRecipeV1, idea: string, title: string) {
    return studioTemplateService.create(
      title,
      CREATOR_RECIPE_LABELS[recipe.id].description,
      buildRecipeDraft(recipe, idea, 'template'),
    );
  }
  recipes = CREATOR_RECIPES;
}
export const creatorRecipeService = CreatorRecipeService.getInstance();
