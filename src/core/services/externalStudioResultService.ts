import type { Asset, Project, Shot, TimelineClip, TimelineState } from '@core/types';
import { isVideoPromptArtifact, type PromptArtifactV1 } from '@core/types/promptArtifact';
import type { ExternalStudioResultV1 } from '@core/types/externalStudioResult';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { logger } from '@core/services/loggerService';

/** Probe decoder-readable metadata before retaining a user-selected video. */
export function readExternalVideoDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const finish = (duration?: number) => {
      clearTimeout(timeout);
      video.onloadedmetadata = null;
      video.onloadeddata = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      if (duration && Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error('The video is unreadable or has no finite positive duration.'));
    };
    const timeout = setTimeout(() => finish(), 15000);
    video.preload = 'auto';
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) finish();
    };
    video.onloadeddata = () =>
      finish(video.videoWidth > 0 && video.videoHeight > 0 ? video.duration : undefined);
    video.onerror = () => finish();
    video.src = url;
  });
}

class ExternalStudioResultService {
  private static instance: ExternalStudioResultService;
  static getInstance(): ExternalStudioResultService {
    return (this.instance ??= new ExternalStudioResultService());
  }

  private async mediaFingerprint(result: ExternalStudioResultV1): Promise<string | null> {
    let bytes: ArrayBuffer | undefined;
    try {
      const desktop = await window.electron?.readDesktopMedia?.(result.assetId);
      if (desktop && 'sha256' in desktop && typeof desktop.sha256 === 'string')
        return desktop.sha256;
      bytes = desktop?.bytes;
    } catch {
      /* A retained IndexedDB copy remains a valid fallback. */
    }
    if (!bytes) {
      const record = await mediaAssetService.getRecord(result.assetId);
      if (!record) return null;
      bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Local media could not be read.'));
        reader.readAsArrayBuffer(record.blob);
      });
    }
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async list(projectId: string): Promise<ExternalStudioResultV1[]> {
    const results = (await projectDocumentService.load(projectId))?.studioResults ?? [];
    return Promise.all(
      results.map(async (result) =>
        result.manualReview?.mediaHash &&
        result.manualReview.mediaHash !== (await this.mediaFingerprint(result))
          ? { ...result, manualReview: undefined }
          : result,
      ),
    );
  }

  async resolveAsset(result: ExternalStudioResultV1): Promise<Asset | null> {
    let url: string | null = null;
    try {
      url = (await window.electron?.readDesktopMedia?.(result.assetId))?.localUrl ?? null;
    } catch (error) {
      logger.warn('External result desktop read failed; checking local fallback', error);
    }
    url ??= await mediaAssetService.getObjectUrl(result.assetId);
    return url
      ? {
          id: result.assetId,
          storageKey: result.assetId,
          groupId: result.projectId,
          name: result.assetName,
          type: 'video',
          mimeType: result.mimeType,
          data: '',
          url,
        }
      : null;
  }

  async importVideo(
    projectId: string,
    artifact: PromptArtifactV1,
    variantIndex: 0 | 1 | 2,
    file: File,
  ): Promise<ExternalStudioResultV1> {
    if (!isVideoPromptArtifact(artifact) || artifact.target === 'veo-api')
      throw new Error('Select a manual video prompt target.');
    if (artifact.projectId && artifact.projectId !== projectId)
      throw new Error('The prompt belongs to another project.');
    // Snapshot synchronously, before decoder/storage work or a project/variant change.
    const sourceSnapshot = structuredClone(artifact);
    const variantSnapshot = structuredClone(
      [artifact.primary, ...artifact.alternatives][variantIndex],
    );
    if (!file.size || (file.type && !file.type.startsWith('video/')))
      throw new Error('Choose a non-empty video file.');
    const durationSeconds = await readExternalVideoDuration(file);
    const assetId = `external:${crypto.randomUUID()}`;
    const result: ExternalStudioResultV1 = {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      projectId,
      artifactId: sourceSnapshot.id,
      variantIndex,
      target: sourceSnapshot.target,
      assetId,
      assetName: file.name,
      mimeType: file.type || 'video/mp4',
      durationSeconds,
      importedAt: new Date().toISOString(),
      updatedAt: Date.now(),
      sourceSnapshot,
      variantSnapshot,
    };
    await mediaAssetService.storeBlob(assetId, file);
    try {
      await projectDocumentService.update(projectId, async (project) => {
        if (!project) throw new Error('Save the project before importing a result.');
        return { ...project, studioResults: [...(project.studioResults ?? []), result] };
      });
    } catch (error) {
      await mediaAssetService.remove(assetId);
      throw error;
    }
    // No desktop deletion bridge exists: migrate only after the initial durable link.
    try {
      if (window.electron?.importDesktopMedia)
        await window.electron.importDesktopMedia({
          key: assetId,
          bytes: await file.arrayBuffer(),
          mimeType: result.mimeType,
        });
    } catch (error) {
      logger.warn('External result kept in local storage after desktop copy failed', error);
    }
    return result;
  }

  async confirm(projectId: string, resultId: string, notes: string): Promise<void> {
    await projectDocumentService.update(projectId, async (project) => {
      if (!project) throw new Error('Project not found.');
      const result = project.studioResults?.find((item) => item.id === resultId);
      if (!result || !(await this.resolveAsset(result))) throw new Error('Local media is missing.');
      const mediaHash = await this.mediaFingerprint(result);
      if (!mediaHash) throw new Error('Local media is missing.');
      return {
        ...project,
        studioResults: project.studioResults!.map((item) =>
          item.id === resultId
            ? {
                ...item,
                updatedAt: Math.max(Date.now(), item.updatedAt + 1),
                manualReview: {
                  confirmedAt: new Date().toISOString(),
                  notes,
                  assetId: item.assetId,
                  mediaHash,
                },
              }
            : item,
        ),
      };
    });
  }

  /** Replace missing media without rewriting the frozen source or reusing its review. */
  async replaceVideo(projectId: string, resultId: string, file: File): Promise<void> {
    if (!file.size || (file.type && !file.type.startsWith('video/')))
      throw new Error('Choose a non-empty video file.');
    const durationSeconds = await readExternalVideoDuration(file);
    const assetId = `external:${crypto.randomUUID()}`;
    await mediaAssetService.storeBlob(assetId, file);
    try {
      await projectDocumentService.update(projectId, async (project) => {
        if (!project?.studioResults?.some((item) => item.id === resultId))
          throw new Error('The original result is unavailable.');
        return {
          ...project,
          studioResults: project.studioResults.map((item) =>
            item.id === resultId
              ? {
                  ...item,
                  assetId,
                  assetName: file.name,
                  mimeType: file.type || 'video/mp4',
                  durationSeconds,
                  manualReview: undefined,
                  updatedAt: Math.max(Date.now(), item.updatedAt + 1),
                }
              : item,
          ),
        };
      });
    } catch (error) {
      await mediaAssetService.remove(assetId);
      throw error;
    }
    try {
      await window.electron?.importDesktopMedia?.({
        key: assetId,
        bytes: await file.arrayBuffer(),
        mimeType: file.type || 'video/mp4',
      });
    } catch (error) {
      logger.warn('Replacement result retained locally after desktop copy failed', error);
    }
  }

  async accept(
    projectId: string,
    resultId: string,
    shotId: number | undefined,
    isCurrent: () => boolean,
    editorSnapshot?: { shots: Shot[]; timeline: TimelineState },
  ): Promise<Project> {
    let saved: Project | undefined;
    await projectDocumentService.update(projectId, async (project) => {
      if (!project || !isCurrent()) throw new Error('The active project changed.');
      const result = project.studioResults?.find((item) => item.id === resultId);
      if (!result?.manualReview || result.manualReview.assetId !== result.assetId)
        throw new Error('Confirm a manual review before using this result.');
      if (result.manualReview.mediaHash !== (await this.mediaFingerprint(result)))
        throw new Error('Local media changed. Confirm a new manual review.');
      const asset = await this.resolveAsset(result);
      if (!asset) throw new Error('Local media is missing.');
      if (!isCurrent()) throw new Error('The active project changed.');
      const shots = editorSnapshot?.shots ?? project.storyboard.shots;
      const targetId =
        shotId ?? result.storyboardShotId ?? Math.max(0, ...shots.map((s) => s.id)) + 1;
      const previous = shots.find((s) => s.id === targetId);
      if (shotId !== undefined && !previous)
        throw new Error('The selected scene no longer exists.');
      const takes = previous?.takes.includes(asset.url)
        ? previous.takes
        : [...(previous?.takes ?? []), asset.url];
      const shot: Shot = {
        ...(previous ?? {
          id: targetId,
          type: 'video',
          action: result.variantSnapshot.prompt,
          camera: '',
          characterId: '',
          visualLink: false,
          transition: { type: 'cut', duration: 0 },
        }),
        generatedVideoUrl: asset.url,
        videoUrl: asset.url,
        takes,
        selectedTakeIndex: takes.indexOf(asset.url),
        duration: result.durationSeconds,
      };
      const timeline = editorSnapshot?.timeline ?? project.storyboard.timeline;
      const priorClip = timeline.clips.find(
        (c) =>
          c.type === 'video' &&
          (c.resourceId === targetId ||
            c.id === `video_${targetId}` ||
            c.resourceId === result.assetId),
      );
      const clip: TimelineClip = priorClip
        ? {
            ...priorClip,
            resourceId: asset.id,
            selectedTakeId: undefined,
            duration: Math.min(
              priorClip.duration,
              result.durationSeconds -
                Math.min(priorClip.offset, Math.max(0, result.durationSeconds - 0.01)),
            ),
            offset: Math.min(priorClip.offset, Math.max(0, result.durationSeconds - 0.01)),
          }
        : {
            id: `video_${targetId}`,
            resourceId: asset.id,
            trackId: 'video_main',
            startTime: Math.max(
              0,
              ...timeline.clips
                .filter((c) => c.trackId === 'video_main')
                .map((c) => c.startTime + c.duration),
            ),
            duration: result.durationSeconds,
            offset: 0,
            type: 'video',
            label: result.variantSnapshot.title,
          };
      saved = {
        ...project,
        lastModified: Date.now(),
        studioResults: project.studioResults!.map((item) =>
          item.id === resultId
            ? {
                ...item,
                storyboardShotId: targetId,
                updatedAt: Math.max(Date.now(), item.updatedAt + 1),
              }
            : item,
        ),
        storyboard: {
          ...project.storyboard,
          shots: previous ? shots.map((s) => (s.id === targetId ? shot : s)) : [...shots, shot],
          timeline: {
            ...timeline,
            tracks: timeline.tracks.some((t) => t.id === 'video_main')
              ? timeline.tracks
              : [
                  ...timeline.tracks,
                  {
                    id: 'video_main',
                    label: 'Video',
                    type: 'video',
                    trackType: 'dialogue',
                    zIndex: 1,
                  },
                ],
            clips: priorClip
              ? timeline.clips.map((c) => (c.id === priorClip.id ? clip : c))
              : [...timeline.clips, clip],
          },
        },
      };
      return saved!;
    });
    return saved!;
  }
}

export const externalStudioResultService = ExternalStudioResultService.getInstance();
