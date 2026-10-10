import type { Asset, ProductionRun, Project, TimelineClip } from '@core/types';
import type { CreatorDeliveryV1, TimelineRenderPlanV1 } from '@core/types/creatorDelivery';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { resolveOtioSelection } from '@core/services/otioExportService';
import { resolveProjectAssetBlob } from '@core/utils/projectArchiver';
import { validateCreatorCaptions } from '@core/services/creatorCaptionService';

export function defaultCreatorDelivery(project: Project): CreatorDeliveryV1 {
  return {
    schemaVersion: 1,
    revision: 0,
    aspectRatio: '9:16',
    captionsMode: 'sidecar',
    captionStyle: 'classic',
    safeMargin: 0.08,
    crops: {},
    title: project.name,
    description: project.storyboard.shots
      .map((shot) => shot.action)
      .filter(Boolean)
      .join('\n')
      .slice(0, 2000),
    updatedAt: Date.now(),
  };
}
export function canonicalRenderJson(value: unknown): string {
  const sort = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(sort)
      : item && typeof item === 'object'
        ? Object.fromEntries(
            Object.entries(item)
              .filter(([, v]) => v !== undefined)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([k, v]) => [k, sort(v)]),
          )
        : item;
  return JSON.stringify(sort(value));
}
export async function hashRenderContent(value: unknown): Promise<string> {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRenderJson(value))),
    ),
  ]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
async function hashMediaBytes(bytes: ArrayBuffer): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
export class CreatorRenderError extends Error {
  constructor(
    message: string,
    public clipId?: string,
  ) {
    super(message);
    this.name = 'CreatorRenderError';
  }
}
function clipDiagnostics(clip: TimelineClip): CreatorDeliveryDiagnostic[] {
  const issues: CreatorDeliveryDiagnostic[] = [];
  const add = (message: string, action: string) =>
    issues.push({ clipId: clip.id, message: `${clip.label}: ${message}`, action });
  if (
    ![clip.startTime, clip.duration, clip.offset].every(Number.isFinite) ||
    clip.startTime < 0 ||
    clip.duration <= 0 ||
    clip.offset < 0
  )
    add(
      'Invalid clip timing.',
      'Set a nonnegative start and source offset, and a positive duration.',
    );
  if (clip.isLoading) add('Media is still loading.', 'Wait for import to finish.');
  const unsupported: [boolean, string, string][] = [
    [
      !!clip.effects?.some((effect) => effect.isEnabled),
      'Timeline effects',
      'Disable enabled timeline effects.',
    ],
    [!!clip.keyframes?.length, 'Motion keyframes', 'Remove motion keyframes.'],
    [!!clip.colorGrade, 'Color grading', 'Reset color grading.'],
    [!!clip.cameraEffect, 'Camera motion', 'Remove camera motion.'],
    [!!clip.reactivity, 'Audio reactivity', 'Disable audio reactivity.'],
    [!!clip.maskSequence?.length, 'Segmentation masks', 'Remove segmentation masks.'],
    [!!clip.volumeKeyframes?.length, 'Volume keyframes', 'Use a static clip volume.'],
    [
      clip.opacity !== undefined && clip.opacity !== 1,
      'Clip opacity',
      'Reset clip opacity to 100%.',
    ],
    [
      !!clip.panning && (clip.panning.x !== 0 || clip.panning.z !== 0),
      'Audio panning',
      'Reset audio panning.',
    ],
  ];
  for (const [enabled, name, action] of unsupported)
    if (enabled) add(`${name} is not supported by local export.`, action);
  if (
    clip.transform &&
    (clip.transform.scale !== 1 ||
      clip.transform.rotation !== 0 ||
      clip.transform.opacity !== 1 ||
      clip.transform.position.x !== 0 ||
      clip.transform.position.y !== 0)
  )
    add(
      'Timeline transforms are not supported.',
      'Reset timeline transforms and use export crop controls.',
    );
  if (clip.transition && !['cut', 'dissolve', 'fade_black'].includes(clip.transition.type))
    add('This transition is not supported.', 'Choose cut, dissolve or fade to black.');
  return issues;
}
function checkClip(clip: TimelineClip) {
  const first = clipDiagnostics(clip)[0];
  if (first) throw new CreatorRenderError(first.message, clip.id);
}
export interface CreatorDeliveryDiagnostic {
  clipId?: string;
  message: string;
  action: string;
}
class CreatorDeliveryService {
  private static instance: CreatorDeliveryService;
  static getInstance() {
    return (this.instance ??= new CreatorDeliveryService());
  }
  async saveSettings(id: string, settings: CreatorDeliveryV1) {
    await projectDocumentService.update(id, async (project) => {
      if (!project) throw new Error('Project is not saved.');
      if ((project.creatorDelivery?.revision ?? 0) > settings.revision)
        throw new Error('Delivery settings changed. Reload before saving.');
      return {
        ...project,
        creatorDelivery: {
          ...structuredClone(settings),
          revision: settings.revision + 1,
          updatedAt: Date.now(),
        },
      };
    });
    return (await projectDocumentService.load(id))!.creatorDelivery!;
  }
  /** Read-only inspection: never registers media, edits settings, or starts a render. */
  async preflight(
    project: Project,
    assets: Asset[],
    run?: ProductionRun | null,
  ): Promise<CreatorDeliveryDiagnostic[]> {
    const diagnostics: CreatorDeliveryDiagnostic[] = [];
    const add = (message: string, action: string, clipId?: string) =>
      diagnostics.push({ message, action, clipId });
    const timeline = project.storyboard.timeline;
    const media = timeline.clips.filter((clip) => clip.type !== 'text');
    const duration = Math.max(0, ...media.map((clip) => clip.startTime + clip.duration));
    if (run && run.projectId !== project.id)
      add('Production run belongs to another project.', 'Select this project’s production run.');
    if (!media.length) add('Timeline has no media.', 'Import media and add a clip.');
    if (!Number.isFinite(duration) || duration <= 0 || duration > 180)
      add('Video must be between 0 and 180 seconds.', 'Trim the timeline to three minutes.');
    if (
      new Set(media.filter((clip) => clip.type !== 'audio').map((clip) => clip.trackId)).size !== 1
    )
      add(
        'Local export requires one main video/image track.',
        'Move visual clips to one main track.',
      );
    const settings = project.creatorDelivery ?? defaultCreatorDelivery(project);
    const clipIds = new Set<string>();
    for (const clip of timeline.clips) {
      if (clipIds.has(clip.id))
        add(
          'Clip identity is duplicated.',
          'Duplicate this clip again to assign a fresh identity.',
          clip.id,
        );
      clipIds.add(clip.id);
      if (
        clip.volume !== undefined &&
        (!Number.isFinite(clip.volume) || clip.volume < 0 || clip.volume > 4)
      )
        add(
          'Clip volume is outside the supported range.',
          'Set volume between zero and four.',
          clip.id,
        );
      const crop = settings.crops[clip.id];
      if (
        crop &&
        (![crop.x, crop.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1) ||
          !['fit', 'fill'].includes(crop.mode))
      )
        add('Export crop is invalid.', 'Reset the crop controls.', clip.id);
      const fades = settings.audioFades?.[clip.id];
      if (
        fades &&
        ![fades.inSeconds, fades.outSeconds].every(
          (value) => Number.isFinite(value) && value >= 0 && value <= clip.duration,
        )
      )
        add('Audio fade exceeds clip duration.', 'Shorten or reset the audio fades.', clip.id);
      diagnostics.push(...clipDiagnostics(clip));
      if (!timeline.tracks.some((track) => track.id === clip.trackId))
        add('Clip track is missing.', 'Move this clip to an existing track.', clip.id);
      if (clip.type === 'text') {
        if (!clip.caption) add('Text clip has no caption.', 'Add caption text.', clip.id);
        if (clip.offset !== 0 || (clip.transition && clip.transition.type !== 'cut'))
          add(
            'Text offsets and transitions are not supported.',
            'Reset text offset and transition.',
            clip.id,
          );
        if (clip.caption) {
          try {
            validateCreatorCaptions(
              [
                {
                  ...clip.caption,
                  startTime: clip.startTime,
                  endTime: clip.startTime + clip.duration,
                },
              ],
              duration,
            );
          } catch (error) {
            add(
              String(error instanceof Error ? error.message : error),
              'Correct caption text and timing.',
              clip.id,
            );
          }
        }
        continue;
      }
      const selection = resolveOtioSelection(clip.resourceId, clip.selectedTakeId, run, clip.type);
      const shot =
        typeof clip.resourceId === 'number'
          ? project.storyboard.shots.find((item) => item.id === clip.resourceId)
          : undefined;
      const url =
        clip.type === 'audio'
          ? shot?.audioUrl
          : (selection.take?.localMediaUrl ??
            shot?.generatedVideoUrl ??
            shot?.takes?.[shot.selectedTakeIndex]);
      const candidates = assets.filter((asset) => asset.type === clip.type && asset.url === url);
      const asset =
        assets.find((item) => item.id === selection.mediaKey && item.type === clip.type) ??
        candidates.find((item) => item.groupId === project.id) ??
        (candidates.length === 1 ? candidates[0] : undefined);
      const key = asset?.storageKey ?? asset?.id ?? selection.take?.localMediaKey;
      if (!key || (selection.shot && !selection.take?.localMediaKey)) {
        add('Local media is missing.', 'Relink this clip to a local file.', clip.id);
        continue;
      }
      try {
        if (window.electron?.inspectTimelineRenderMedia) {
          const metadata = await window.electron.inspectTimelineRenderMedia(key);
          if (
            !metadata.available &&
            !asset?.data &&
            !(asset && (await resolveProjectAssetBlob(asset)))
          )
            add(
              metadata.reason ?? 'Local media is missing.',
              'Relink or reimport this clip.',
              clip.id,
            );
          if (
            metadata.durationSeconds !== undefined &&
            clip.type !== 'image' &&
            clip.offset + clip.duration > metadata.durationSeconds + 0.05
          )
            add(
              'Clip exceeds source duration.',
              'Shorten the clip or reset its source offset.',
              clip.id,
            );
        } else if (
          !asset?.data &&
          !(asset && (await resolveProjectAssetBlob(asset))) &&
          !(await window.electron?.readDesktopMedia?.(key))
        )
          add('Durable local media is missing.', 'Relink or reimport this clip.', clip.id);
      } catch (error) {
        add(
          String(error instanceof Error ? error.message : error),
          'Verify or reimport the original media.',
          clip.id,
        );
      }
    }
    const visuals = media
      .filter((clip) => clip.type !== 'audio')
      .sort((a, b) => a.startTime - b.startTime);
    visuals.forEach((clip, index) => {
      const previous = visuals[index - 1];
      const overlap = previous ? previous.startTime + previous.duration - clip.startTime : 0;
      if (
        (overlap > 0 &&
          (clip.transition?.type !== 'dissolve' ||
            Math.abs(overlap - clip.transition.duration) > 0.001)) ||
        (clip.transition?.type === 'dissolve' &&
          (!previous || overlap <= 0 || Math.abs(overlap - clip.transition.duration) > 0.001))
      )
        add(
          'Overlap requires a matching dissolve transition.',
          'Match overlap to dissolve duration or remove the overlap.',
          clip.id,
        );
    });
    if (
      settings.style?.logoAssetId &&
      !assets.some((asset) => asset.id === settings.style?.logoAssetId && asset.type === 'image')
    )
      add('Style logo is missing.', 'Relink the style logo.');
    return diagnostics;
  }
  async buildPlan(
    project: Project,
    assets: Asset[],
    run?: ProductionRun | null,
    resolution: '720p' | '1080p' = '1080p',
    purpose: 'preview' | 'delivery' = 'delivery',
  ): Promise<TimelineRenderPlanV1> {
    if (run && run.projectId !== project.id)
      throw new Error('Production run belongs to another project.');
    const settings = structuredClone(project.creatorDelivery ?? defaultCreatorDelivery(project));
    const timeline = structuredClone(project.storyboard.timeline);
    const clips = timeline.clips.filter((clip) => clip.type !== 'text');
    if (!clips.length) throw new Error('Add media to the timeline before exporting.');
    const visualTracks = new Set(
      clips
        .filter((clip) => clip.type === 'video' || clip.type === 'image')
        .map((clip) => clip.trackId),
    );
    if (visualTracks.size !== 1)
      throw new Error('Local export requires one main video/image track.');
    const duration = Math.max(...clips.map((clip) => clip.startTime + clip.duration));
    if (!Number.isFinite(duration) || duration <= 0 || duration > 180)
      throw new Error('Video must be between 0 and 180 seconds.');
    const visuals = clips
      .filter((clip) => clip.type !== 'audio')
      .sort((a, b) => a.startTime - b.startTime);
    for (let index = 0; index < visuals.length; index++) {
      const current = visuals[index];
      const previous = visuals[index - 1];
      const overlap = previous ? previous.startTime + previous.duration - current.startTime : 0;
      if (
        overlap > 0 &&
        (current.transition?.type !== 'dissolve' || overlap > current.transition.duration + 0.001)
      )
        throw new CreatorRenderError(
          `${current.label}: Overlap requires a matching dissolve transition.`,
          current.id,
        );
      if (
        current.transition?.type === 'dissolve' &&
        (!previous || overlap <= 0 || Math.abs(overlap - current.transition.duration) > 0.001)
      )
        throw new CreatorRenderError(
          `${current.label}: Overlap this clip with the previous clip by the dissolve duration.`,
          current.id,
        );
    }
    const mediaHashes: Record<string, string> = {};
    if (settings.style?.logoAssetId) {
      const logo = assets.find(
        (asset) => asset.id === settings.style!.logoAssetId && asset.type === 'image',
      );
      if (!logo) throw new Error('Style logo is missing. Relink it before exporting.');
      const key = logo.storageKey ?? logo.id;
      if (!(await window.electron?.readDesktopMedia?.(key))) {
        const blob = logo.data
          ? new Blob(
              [
                Uint8Array.from(
                  atob(logo.data.includes(',') ? logo.data.split(',').pop()! : logo.data),
                  (byte) => byte.charCodeAt(0),
                ),
              ],
              { type: logo.mimeType },
            )
          : await resolveProjectAssetBlob(logo);
        if (!blob || !window.electron?.importDesktopMedia)
          throw new Error('Style logo has no durable local bytes.');
        await window.electron.importDesktopMedia({
          key,
          bytes: await blob.arrayBuffer(),
          mimeType: logo.mimeType,
        });
      }
      const registeredLogo = await window.electron?.readDesktopMedia?.(key);
      if (!registeredLogo) throw new Error('Style logo registration failed.');
      mediaHashes[key] = await hashMediaBytes(registeredLogo.bytes);
      settings.style = { ...settings.style, logoAssetId: key };
    }
    const output: TimelineRenderPlanV1['clips'] = [];
    const registered = new Set<string>();
    for (const clip of clips) {
      checkClip(clip);
      if (!timeline.tracks.some((track) => track.id === clip.trackId))
        throw new CreatorRenderError('Clip track is missing.', clip.id);
      const selection = resolveOtioSelection(clip.resourceId, clip.selectedTakeId, run, clip.type);
      if (selection.shot && !selection.take?.localMediaKey)
        throw new CreatorRenderError(`${clip.label}: Selected take has no local media.`, clip.id);
      const shot =
        typeof clip.resourceId === 'number'
          ? project.storyboard.shots.find((item) => item.id === clip.resourceId)
          : undefined;
      const url =
        clip.type === 'audio'
          ? clip.trackId === 'audio_sfx' || clip.id.startsWith('sfx_')
            ? undefined
            : shot?.audioUrl
          : (selection.take?.localMediaUrl ??
            shot?.generatedVideoUrl ??
            shot?.takes?.[shot.selectedTakeIndex]);
      const candidates = assets.filter((asset) => asset.type === clip.type && asset.url === url);
      const asset =
        assets.find((item) => item.id === selection.mediaKey && item.type === clip.type) ??
        candidates.find((item) => item.groupId === project.id) ??
        (candidates.length === 1 ? candidates[0] : undefined) ??
        (selection.take?.localMediaKey
          ? {
              id: selection.take.localMediaKey,
              storageKey: selection.take.localMediaKey,
              type: 'video' as const,
              name: selection.take.id,
              mimeType: 'video/mp4',
              url: '',
              data: '',
            }
          : undefined);
      if (!asset)
        throw new CreatorRenderError(
          `${clip.label}: Local media is missing. Relink this clip.`,
          clip.id,
        );
      const key = asset.storageKey ?? asset.id;
      if (!registered.has(key)) {
        const existing = await window.electron?.readDesktopMedia?.(key);
        if (!existing) {
          let blob: Blob | null;
          if (asset.data)
            blob = new Blob(
              [
                Uint8Array.from(
                  atob(asset.data.includes(',') ? asset.data.split(',').pop()! : asset.data),
                  (byte) => byte.charCodeAt(0),
                ),
              ],
              { type: asset.mimeType },
            );
          else blob = await resolveProjectAssetBlob(asset);
          if (!blob?.size || !window.electron?.importDesktopMedia)
            throw new CreatorRenderError(`${clip.label}: Durable local media is missing.`, clip.id);
          const bytes = await blob.arrayBuffer();
          const result = await window.electron.importDesktopMedia({
            key,
            bytes,
            mimeType: blob.type,
          });
          const expected = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
          if (result.sha256 !== expected || result.sizeBytes !== blob.size)
            throw new CreatorRenderError(`${clip.label}: Media checksum mismatch.`, clip.id);
        }
        const verified = existing ?? (await window.electron?.readDesktopMedia?.(key));
        if (!verified)
          throw new CreatorRenderError(`${clip.label}: Media registration failed.`, clip.id);
        mediaHashes[key] = await hashMediaBytes(verified.bytes);
        registered.add(key);
      }
      const transition = clip.transition;
      const fades = settings.audioFades?.[clip.id];
      output.push({
        id: clip.id,
        mediaId: key,
        type: clip.type as 'video' | 'audio' | 'image',
        startTime: clip.startTime,
        duration: clip.duration,
        offset: clip.offset,
        volume: clip.volume ?? 1,
        crop: settings.crops[clip.id] ?? { mode: 'fit', x: 0.5, y: 0.5 },
        ...(fades ? { fadeInSeconds: fades.inSeconds, fadeOutSeconds: fades.outSeconds } : {}),
        ...(transition?.type === 'dissolve' ? { crossfadeSeconds: transition.duration } : {}),
        ...(transition?.type === 'fade_black'
          ? { fadeInSeconds: transition.duration, fadeOutSeconds: transition.duration }
          : {}),
      });
    }
    const captions = timeline.clips
      .filter((clip) => clip.type === 'text')
      .map((clip) => {
        checkClip(clip);
        if (clip.offset !== 0 || (clip.transition && clip.transition.type !== 'cut'))
          throw new CreatorRenderError(
            `${clip.label}: Text offsets and transitions are not supported.`,
            clip.id,
          );
        if (!timeline.tracks.some((track) => track.id === clip.trackId))
          throw new CreatorRenderError('Caption track is missing.', clip.id);
        if (!clip.caption)
          throw new CreatorRenderError(`${clip.label}: Text clip has no caption.`, clip.id);
        return {
          ...clip.caption,
          startTime: clip.startTime,
          endTime: clip.startTime + clip.duration,
          style: settings.captionStyle,
        };
      });
    if (captions.length) validateCreatorCaptions(captions, duration);
    const base = {
      schemaVersion: 1 as const,
      projectId: project.id,
      projectName: project.name,
      durationSeconds: duration,
      fps: 30 as const,
      aspectRatio: settings.aspectRatio,
      resolution,
      purpose,
      clips: output,
      mediaHashes,
      captions,
      captionsMode: settings.captionsMode,
      captionStyle: settings.captionStyle,
      safeMargin: settings.safeMargin,
      style: settings.style,
      title: settings.title,
      description: settings.description,
    };
    return structuredClone({ ...base, contentHash: await hashRenderContent(base) });
  }
}
export const creatorDeliveryService = CreatorDeliveryService.getInstance();
