import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Caption, Project } from '@core/types';
import type {
  CreatorDeliveryV1,
  TimelineRenderCapabilities,
  TimelineRenderJobV1,
} from '@core/types/creatorDelivery';
import {
  creatorDeliveryService,
  CreatorRenderError,
  defaultCreatorDelivery,
  hashRenderContent,
  canonicalRenderJson,
} from '@core/services/creatorDeliveryService';
import {
  creatorCaptionService,
  exportCreatorSrt,
  importCreatorSrt,
  validateCreatorCaptions,
} from '@core/services/creatorCaptionService';
import {
  creatorPublishingService,
  type CreatorPublishingText,
} from '@core/services/creatorPublishingService';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { downloadProjectBlob } from '@core/services/projectTransferService';
import { resolveOtioSelection } from '@core/services/otioExportService';
import { resolveProjectAssetBlob } from '@core/utils/projectArchiver';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';

export function CreatorDeliveryPanel() {
  const { t, i18n } = useTranslation('creator');
  const projectId = useProjectStore((state) => state.currentProjectId);
  const projectName =
    useProjectStore((state) => state.projects.find((item) => item.id === projectId)?.name) ??
    'Project';
  const clips = useAppStore((state) => state.clips);
  const assets = useAppStore((state) => state.assets);
  const [settings, setSettings] = useState<CreatorDeliveryV1 | null>(null);
  const [capabilities, setCapabilities] = useState<TimelineRenderCapabilities>({
    available: false,
  });
  const [job, setJob] = useState<TimelineRenderJobV1 | null>(null);
  const [error, setError] = useState('');
  const [errorClip, setErrorClip] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [audioId, setAudioId] = useState('');
  const [consent, setConsent] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [publishProposal, setPublishProposal] = useState<{
    text: CreatorPublishingText;
    binding: string;
  } | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [proposal, setProposal] = useState<{ captions: Caption[]; binding: string } | null>(null);
  const idRef = useRef(projectId);
  idRef.current = projectId;
  const busyRef = useRef(false);
  const audioRef = useRef(audioId);
  audioRef.current = audioId;
  const jobRef = useRef(job);
  jobRef.current = job;
  const duration = Math.max(
    0,
    ...clips.filter((clip) => clip.type !== 'text').map((clip) => clip.startTime + clip.duration),
  );
  const captionClips = clips.filter((clip) => clip.type === 'text' && clip.caption);
  const captions = captionClips.map((clip) => ({
    ...clip.caption!,
    startTime: clip.startTime,
    endTime: clip.startTime + clip.duration,
  }));
  const binding = () =>
    JSON.stringify({
      id: idRef.current,
      audioId: audioRef.current,
      clips: useAppStore.getState().clips,
    });
  const publicationBinding = async (id: string | null): Promise<string> => {
    const snapshot = canonicalRenderJson({ projectId: id, settings: settingsRef.current });
    const hash = await hashRenderContent(JSON.parse(snapshot));
    if (
      snapshot !== canonicalRenderJson({ projectId: idRef.current, settings: settingsRef.current })
    )
      throw new Error(
        t('delivery.publishStale', 'Publication text or project changed. Request a new proposal.'),
      );
    return `${hash}:${snapshot}`;
  };
  useEffect(() => {
    let live = true;
    setSettings(null);
    setJob(null);
    setProposal(null);
    setPublishProposal(null);
    setConsent(false);
    setError('');
    setBusy(false);
    if (projectId)
      void projectDocumentService
        .load(projectId)
        .then((project) => {
          if (live && project)
            setSettings(project.creatorDelivery ?? defaultCreatorDelivery(project));
        })
        .catch((reason: unknown) => {
          if (live) setError(String(reason));
        });
    return () => {
      live = false;
      const active = jobRef.current;
      if (active && ['queued', 'rendering', 'verifying'].includes(active.status))
        void window.electron?.cancelTimelineRender?.(active.id).catch(() => undefined);
    };
  }, [projectId]);
  useEffect(() => {
    let live = true;
    if (window.electron?.getTimelineRenderCapabilities)
      void window.electron
        .getTimelineRenderCapabilities()
        .then((result) => {
          if (live) setCapabilities(result);
        })
        .catch(() => {
          if (live)
            setCapabilities({
              available: false,
              reason: 'Local rendering could not be initialized.',
            });
        });
    const unsubscribe = window.electron?.onTimelineRenderUpdate?.((update) => {
      if (update.projectId === idRef.current && update.id === jobRef.current?.id) setJob(update);
    });
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, []);
  const change = (updates: Partial<CreatorDeliveryV1>) =>
    setSettings((value) => (value ? { ...value, ...updates } : value));
  const act = async (operation: (id: string) => Promise<void>) => {
    if (!projectId || busyRef.current) return;
    busyRef.current = true;
    const id = projectId;
    setBusy(true);
    setError('');
    setErrorClip(undefined);
    try {
      await operation(id);
    } catch (reason) {
      if (idRef.current === id) {
        setError(reason instanceof Error ? reason.message : String(reason));
        if (reason instanceof CreatorRenderError) setErrorClip(reason.clipId);
      }
    } finally {
      busyRef.current = false;
      if (idRef.current === id) setBusy(false);
    }
  };
  const capture = async (id: string): Promise<Project> => {
    const document = useEditorSessionStore
      .getState()
      .captureCurrentProjectDocument({ id, name: projectName });
    await projectDocumentService.save(document);
    if (idRef.current !== id) throw new Error('Project changed.');
    const saved = await projectDocumentService.load(id);
    if (!saved) throw new Error('Save this project before exporting.');
    return saved;
  };
  const render = () =>
    act(async (id) => {
      if (!settings || !window.electron?.startTimelineRender)
        throw new Error('Local export requires the desktop app.');
      await capture(id);
      const savedSettings = await creatorDeliveryService.saveSettings(id, settings);
      if (idRef.current !== id) return;
      setSettings(savedSettings);
      const project = (await projectDocumentService.load(id))!;
      const run = useProductionRunStore.getState().activeRun;
      const plan = await creatorDeliveryService.buildPlan(
        project,
        assets,
        run?.projectId === id ? run : null,
        resolution,
      );
      if (idRef.current !== id) return;
      const started = await window.electron.startTimelineRender(plan);
      if (idRef.current !== id) {
        await window.electron.cancelTimelineRender?.(started.id);
        return;
      }
      setJob(started);
      jobRef.current = started;
      const latest = await window.electron.getTimelineRenderJob?.(started.id);
      if (latest && idRef.current === id) setJob(latest);
    });
  const addCaptions = (values: Caption[]) => {
    validateCreatorCaptions(values, duration);
    const state = useAppStore.getState();
    const track = state.tracks.find((item) => item.type === 'text');
    const trackId = track?.id ?? 'creator-captions';
    if (!track)
      useAppStore.setState({
        tracks: [
          ...state.tracks,
          { id: trackId, label: 'Captions', type: 'text', trackType: 'captions', zIndex: 20 },
        ],
      });
    for (const caption of values)
      useAppStore.getState().addTimelineClip({
        id: crypto.randomUUID(),
        resourceId: caption.id,
        type: 'text',
        trackId,
        label: caption.text,
        startTime: caption.startTime,
        duration: caption.endTime - caption.startTime,
        offset: 0,
        caption,
      });
  };
  if (!projectId || !settings)
    return (
      <p className="p-4">
        {t('delivery.saveProject', 'Open a saved project to prepare a video delivery.')}
      </p>
    );
  const running = job && ['queued', 'rendering', 'verifying'].includes(job.status);
  const failedClip = job?.error ? clips.find((clip) => job.error!.includes(clip.id)) : undefined;
  const selectedAudio = assets.find((asset) => asset.id === audioId);
  const selectedAudioClip = clips.find(
    (clip) => clip.type === 'audio' && clip.resourceId === audioId,
  );
  const inputClass = 'rounded border border-slate-600 bg-slate-950 p-2 text-slate-100';
  const buttonClass = 'rounded border border-slate-500 px-3 py-2 disabled:opacity-50';
  return (
    <section
      aria-labelledby="creator-delivery-title"
      className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100"
    >
      <h2 id="creator-delivery-title" className="text-xl font-semibold">
        {t('delivery.title', 'Export video')}
      </h2>
      {!capabilities.available && (
        <p role="status">
          {t(
            'delivery.desktopRequired',
            'Local MP4 export requires the desktop app with its bundled renderer.',
          )}
          {capabilities.reason ? ` ${capabilities.reason}` : ''}
        </p>
      )}
      <div className="flex flex-wrap gap-4">
        <label>
          {t('delivery.ratio', 'Format')}{' '}
          <select
            aria-label={t('delivery.ratio', 'Format')}
            className={inputClass}
            value={settings.aspectRatio}
            onChange={(event) =>
              change({ aspectRatio: event.target.value as CreatorDeliveryV1['aspectRatio'] })
            }
          >
            {['9:16', '16:9', '1:1'].map((ratio) => (
              <option key={ratio}>{ratio}</option>
            ))}
          </select>
        </label>
        <label>
          {t('delivery.resolution', 'Resolution')}{' '}
          <select
            aria-label={t('delivery.resolution', 'Resolution')}
            className={inputClass}
            value={resolution}
            onChange={(event) => setResolution(event.target.value as typeof resolution)}
          >
            <option>1080p</option>
            <option>720p</option>
          </select>
        </label>
        <label>
          {t('delivery.margin', 'Safe margin')}{' '}
          <input
            aria-label={t('delivery.margin', 'Safe margin')}
            type="range"
            min="0.02"
            max="0.2"
            step="0.01"
            value={settings.safeMargin}
            onChange={(event) => change({ safeMargin: Number(event.target.value) })}
          />{' '}
          {Math.round(settings.safeMargin * 100)}%
        </label>
      </div>
      <p>
        {t('delivery.limit', 'Up to 60 seconds · 30 fps · H.264/AAC · no watermark')}:{' '}
        {duration.toFixed(1)}s
      </p>
      <details>
        <summary>{t('delivery.crop', 'Preview crop and safe margins')}</summary>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clips
            .filter((clip) => clip.type === 'video' || clip.type === 'image')
            .map((clip) => {
              const crop = settings.crops[clip.id] ?? { mode: 'fit' as const, x: 0.5, y: 0.5 };
              const activeRun = useProductionRunStore.getState().activeRun;
              const selected = resolveOtioSelection(
                clip.resourceId,
                clip.selectedTakeId,
                activeRun?.projectId === projectId ? activeRun : null,
                clip.type,
              );
              const asset = assets.find((item) => item.id === selected.mediaKey);
              const shot = useAppStore
                .getState()
                .sbShots.find((item) => item.id === clip.resourceId);
              const source =
                asset?.url ??
                selected.take?.localMediaUrl ??
                shot?.generatedVideoUrl ??
                shot?.takes?.[shot.selectedTakeIndex];
              return (
                <div key={clip.id} className="space-y-2">
                  <p>{clip.label}</p>
                  <div
                    className="relative overflow-hidden bg-black"
                    style={{ aspectRatio: settings.aspectRatio.replace(':', '/') }}
                  >
                    {source &&
                      (clip.type === 'image' ? (
                        <img
                          src={source}
                          alt={clip.label}
                          className="h-full w-full"
                          style={{
                            objectFit: crop.mode === 'fit' ? 'contain' : 'cover',
                            objectPosition: `${crop.x * 100}% ${crop.y * 100}%`,
                          }}
                        />
                      ) : (
                        <video
                          src={source}
                          controls
                          preload="metadata"
                          className="h-full w-full"
                          style={{
                            objectFit: crop.mode === 'fit' ? 'contain' : 'cover',
                            objectPosition: `${crop.x * 100}% ${crop.y * 100}%`,
                          }}
                        />
                      ))}
                    <div
                      className="pointer-events-none absolute text-center text-sm font-semibold"
                      style={{
                        left: `${settings.safeMargin * 100}%`,
                        right: `${settings.safeMargin * 100}%`,
                        bottom: `${settings.safeMargin * 100}%`,
                        fontFamily: settings.style?.fontFamily ?? 'Noto Sans',
                        color: settings.style?.textColor ?? '#ffffff',
                        backgroundColor:
                          settings.captionStyle === 'pop'
                            ? (settings.style?.primaryColor ?? '#334155')
                            : 'transparent',
                        textShadow:
                          settings.captionStyle === 'classic'
                            ? '1px 1px 2px black, -1px -1px 2px black'
                            : undefined,
                      }}
                    >
                      {settings.captionStyle === 'karaoke' ? (
                        <>
                          <span style={{ color: settings.style?.primaryColor ?? '#facc15' }}>
                            {
                              (captions[0]?.text ?? t('delivery.newCaption', 'Your caption')).split(
                                ' ',
                              )[0]
                            }
                          </span>{' '}
                          {(captions[0]?.text ?? t('delivery.newCaption', 'Your caption'))
                            .split(' ')
                            .slice(1)
                            .join(' ')}
                        </>
                      ) : (
                        (captions[0]?.text ?? t('delivery.newCaption', 'Your caption'))
                      )}
                    </div>
                    {settings.style?.logoAssetId &&
                      assets.find((asset) => asset.id === settings.style?.logoAssetId)?.url && (
                        <img
                          src={
                            assets.find((asset) => asset.id === settings.style?.logoAssetId)!.url
                          }
                          alt=""
                          className="pointer-events-none absolute w-12"
                          style={{
                            top: `${settings.safeMargin * 100}%`,
                            right: `${settings.safeMargin * 100}%`,
                          }}
                        />
                      )}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute border border-dashed border-amber-300"
                      style={{ inset: `${settings.safeMargin * 100}%` }}
                    />
                  </div>
                  <label>
                    {t('delivery.cropMode', 'Crop mode')}{' '}
                    <select
                      aria-label={t('delivery.cropMode', 'Crop mode')}
                      className={inputClass}
                      value={crop.mode}
                      onChange={(event) =>
                        change({
                          crops: {
                            ...settings.crops,
                            [clip.id]: { ...crop, mode: event.target.value as 'fit' | 'fill' },
                          },
                        })
                      }
                    >
                      <option value="fit">{t('delivery.fit', 'Fit entire image')}</option>
                      <option value="fill">{t('delivery.fill', 'Crop to fill')}</option>
                    </select>
                  </label>
                  {crop.mode === 'fill' &&
                    ['x', 'y'].map((axis) => (
                      <label key={axis}>
                        {axis.toUpperCase()}{' '}
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={crop[axis as 'x' | 'y']}
                          onChange={(event) =>
                            change({
                              crops: {
                                ...settings.crops,
                                [clip.id]: { ...crop, [axis]: Number(event.target.value) },
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                </div>
              );
            })}
        </div>
      </details>
      <details>
        <summary>{t('delivery.audioMix', 'Audio levels and fades')}</summary>
        {clips
          .filter((clip) => clip.type === 'audio')
          .map((clip) => {
            const fades = settings.audioFades?.[clip.id] ?? { inSeconds: 0, outSeconds: 0 };
            return (
              <div key={clip.id} className="my-3 flex flex-wrap gap-3">
                <p>{clip.label}</p>
                <label>
                  {t('delivery.volume', 'Volume')}{' '}
                  <input
                    className={`${inputClass} w-24`}
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={clip.volume ?? 1}
                    onChange={(event) =>
                      useAppStore
                        .getState()
                        .updateTimelineClip(clip.id, { volume: Number(event.target.value) })
                    }
                  />
                </label>
                {(['inSeconds', 'outSeconds'] as const).map((field) => (
                  <label key={field}>
                    {field === 'inSeconds'
                      ? t('delivery.fadeIn', 'Fade in (seconds)')
                      : t('delivery.fadeOut', 'Fade out (seconds)')}{' '}
                    <input
                      className={`${inputClass} w-24`}
                      type="number"
                      min="0"
                      max={clip.duration / 2}
                      step="0.1"
                      value={fades[field]}
                      onChange={(event) =>
                        change({
                          audioFades: {
                            ...settings.audioFades,
                            [clip.id]: { ...fades, [field]: Number(event.target.value) },
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            );
          })}
      </details>
      <details open>
        <summary>{t('delivery.captions', 'Captions')}</summary>
        <div className="my-3 flex flex-wrap gap-3">
          <label>
            {t('delivery.captionStyle', 'Style')}{' '}
            <select
              aria-label={t('delivery.captionStyle', 'Style')}
              className={inputClass}
              value={settings.captionStyle}
              onChange={(event) =>
                change({ captionStyle: event.target.value as CreatorDeliveryV1['captionStyle'] })
              }
            >
              {['classic', 'pop', 'karaoke'].map((style) => (
                <option key={style} value={style}>
                  {t(
                    `delivery.styles.${style}`,
                    style === 'classic' ? 'Classic' : style === 'pop' ? 'Pop' : 'Karaoke',
                  )}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('delivery.captionMode', 'Output')}{' '}
            <select
              aria-label={t('delivery.captionMode', 'Output')}
              className={inputClass}
              value={settings.captionsMode}
              onChange={(event) =>
                change({ captionsMode: event.target.value as CreatorDeliveryV1['captionsMode'] })
              }
            >
              <option value="sidecar">{t('delivery.sidecar', 'SRT sidecar')}</option>
              <option value="burn-in">{t('delivery.burnIn', 'Burn into video')}</option>
            </select>
          </label>
        </div>
        {captionClips.map((clip) => (
          <div key={clip.id} className="my-2 flex flex-wrap gap-2">
            <label>
              {t('delivery.captionText', 'Text')}
              <textarea
                aria-label={t('delivery.captionText', 'Text')}
                className={inputClass}
                value={clip.caption!.text}
                onChange={(event) =>
                  useAppStore.getState().updateTimelineClip(clip.id, {
                    caption: { ...clip.caption!, text: event.target.value },
                    label: event.target.value,
                  })
                }
              />
            </label>
            <label>
              {t('delivery.startTime', 'Start (seconds)')}
              <input
                className={`${inputClass} w-24`}
                type="number"
                min="0"
                step="0.1"
                value={clip.startTime}
                onChange={(event) =>
                  useAppStore
                    .getState()
                    .updateTimelineClip(clip.id, { startTime: Number(event.target.value) })
                }
              />
            </label>
            <label>
              {t('delivery.endTime', 'End (seconds)')}
              <input
                className={`${inputClass} w-24`}
                type="number"
                min="0"
                step="0.1"
                value={clip.startTime + clip.duration}
                onChange={(event) =>
                  useAppStore.getState().updateTimelineClip(clip.id, {
                    duration: Number(event.target.value) - clip.startTime,
                  })
                }
              />
            </label>
            <button
              className={buttonClass}
              onClick={() =>
                useAppStore.setState({
                  clips: useAppStore.getState().clips.filter((item) => item.id !== clip.id),
                })
              }
            >
              {t('delivery.remove', 'Remove')}
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          <button
            className={buttonClass}
            disabled={duration <= 0}
            onClick={() =>
              addCaptions([
                {
                  id: crypto.randomUUID(),
                  text: t('delivery.newCaption', 'Your caption'),
                  startTime: 0,
                  endTime: Math.min(3, duration),
                  style: settings.captionStyle,
                },
              ])
            }
          >
            {t('delivery.addCaption', 'Add caption')}
          </button>
          <label>
            {t('delivery.importSrt', 'Import SRT')}
            <input
              type="file"
              accept=".srt"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file)
                  void act(async () => addCaptions(importCreatorSrt(await file.text(), duration)));
                event.target.value = '';
              }}
            />
          </label>
          <button
            className={buttonClass}
            disabled={!captions.length}
            onClick={() =>
              void act(async () => {
                validateCreatorCaptions(captions, duration);
                downloadProjectBlob(
                  new Blob([exportCreatorSrt(captions)], { type: 'application/x-subrip' }),
                  `${settings.title}.srt`,
                );
              })
            }
          >
            {t('delivery.exportSrt', 'Download SRT')}
          </button>
        </div>
        <div className="my-4 space-y-2">
          <label>
            {t('delivery.audio', 'Audio to transcribe')}{' '}
            <select
              aria-label={t('delivery.audio', 'Audio to transcribe')}
              className={inputClass}
              value={audioId}
              onChange={(event) => {
                setAudioId(event.target.value);
                setAudioDuration(0);
                setConsent(false);
                setProposal(null);
              }}
            >
              <option value="">—</option>
              {assets
                .filter(
                  (asset) =>
                    asset.type === 'audio' &&
                    clips.some((clip) => clip.type === 'audio' && clip.resourceId === asset.id),
                )
                .map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
            </select>
          </label>
          <p>
            {t(
              'delivery.consentText',
              'Gemini receives the complete selected audio file shown below; captions are mapped to its timeline trim. Its provider may charge for this request. The desktop approval dialog shows the maximum charge before sending.',
            )}
            {selectedAudio && ` ${selectedAudio.name} · ${audioDuration.toFixed(1)}s`}
            {selectedAudio && (
              <audio
                controls
                preload="metadata"
                src={selectedAudio.url}
                onLoadedMetadata={(event) =>
                  setAudioDuration(
                    Number.isFinite(event.currentTarget.duration)
                      ? event.currentTarget.duration
                      : 0,
                  )
                }
              />
            )}
          </p>
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />{' '}
            {t('delivery.consent', 'I approve sending this audio for a caption proposal.')}
          </label>
          <button
            className={buttonClass}
            disabled={
              busy ||
              !consent ||
              !selectedAudio ||
              !selectedAudioClip ||
              audioDuration <= 0 ||
              !window.electron?.approveProviderCost
            }
            onClick={() =>
              void act(async (id) => {
                const before = binding();
                const blob = await resolveProjectAssetBlob(selectedAudio!);
                if (!blob) throw new Error('Local audio is missing.');
                const sourceCaptions = await creatorCaptionService.propose(blob, audioDuration);
                const audioClip = selectedAudioClip!;
                const values = sourceCaptions
                  .filter(
                    (caption) =>
                      caption.endTime > audioClip.offset &&
                      caption.startTime < audioClip.offset + audioClip.duration,
                  )
                  .map((caption) => ({
                    ...caption,
                    startTime:
                      audioClip.startTime + Math.max(0, caption.startTime - audioClip.offset),
                    endTime:
                      audioClip.startTime +
                      Math.min(audioClip.duration, caption.endTime - audioClip.offset),
                  }));
                validateCreatorCaptions(values, duration);
                if (idRef.current === id && before === binding())
                  setProposal({ captions: values, binding: before });
                else throw new Error('Project or captions changed. Request a new proposal.');
              })
            }
          >
            {t('delivery.propose', 'Request Gemini proposal')}
          </button>
        </div>
        {proposal && (
          <div>
            <p>{t('delivery.reviewProposal', 'Review caption proposal before accepting')}</p>
            {proposal.captions.map((caption) => (
              <p key={caption.id}>
                {caption.startTime}–{caption.endTime}: {caption.text}
              </p>
            ))}
            <button
              className={buttonClass}
              onClick={() => {
                if (proposal.binding !== binding())
                  setError(
                    t(
                      'delivery.staleProposal',
                      'Project or captions changed. Request a new proposal.',
                    ),
                  );
                else {
                  addCaptions(proposal.captions);
                  setProposal(null);
                }
              }}
            >
              {t('delivery.acceptProposal', 'Accept proposal')}
            </button>
            <button className={buttonClass} onClick={() => setProposal(null)}>
              {t('delivery.discard', 'Discard')}
            </button>
          </div>
        )}
      </details>
      <label className="block">
        {t('delivery.publishTitle', 'Publication title')}
        <input
          className={`${inputClass} block w-full`}
          value={settings.title}
          onChange={(event) => change({ title: event.target.value })}
        />
      </label>
      <label className="block">
        {t('delivery.description', 'Description')}
        <textarea
          className={`${inputClass} block w-full`}
          value={settings.description}
          onChange={(event) => change({ description: event.target.value })}
        />
      </label>
      <p>
        {t(
          'delivery.publishAiConsent',
          'Only the publication title and description shown above are sent to Gemini. The desktop approval dialog shows the maximum charge before sending.',
        )}
      </p>
      <button
        className={buttonClass}
        disabled={
          busy ||
          !settings.title.trim() ||
          !settings.description.trim() ||
          !window.electron?.approveProviderCost
        }
        onClick={() =>
          void act(async (id) => {
            const before = await publicationBinding(id);
            const text = await creatorPublishingService.propose(
              { title: settings.title, description: settings.description },
              i18n?.resolvedLanguage ?? i18n?.language ?? 'en',
            );
            const after = await publicationBinding(idRef.current);
            if (idRef.current === id && before === after)
              setPublishProposal({ text, binding: before });
            else
              throw new Error(
                t(
                  'delivery.publishStale',
                  'Publication text or project changed. Request a new proposal.',
                ),
              );
          })
        }
      >
        {t('delivery.publishAi', 'Request publication text proposal')}
      </button>
      {publishProposal && (
        <div>
          <p>{t('delivery.publishProposal', 'Review publication text proposal')}</p>
          <p>{publishProposal.text.title}</p>
          <p className="whitespace-pre-wrap">{publishProposal.text.description}</p>
          <button
            className={buttonClass}
            disabled={busy}
            onClick={() =>
              void act(async (id) => {
                const current = await publicationBinding(id);
                if (current !== publishProposal.binding)
                  throw new Error(
                    t(
                      'delivery.publishStale',
                      'Publication text or project changed. Request a new proposal.',
                    ),
                  );
                change(publishProposal.text);
                setPublishProposal(null);
              })
            }
          >
            {t('delivery.acceptPublish', 'Accept publication text')}
          </button>
          <button className={buttonClass} onClick={() => setPublishProposal(null)}>
            {t('delivery.discard', 'Discard')}
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          className={buttonClass}
          disabled={busy}
          onClick={() =>
            void act(async (id) => {
              await capture(id);
              const saved = await creatorDeliveryService.saveSettings(id, settings);
              if (idRef.current === id) setSettings(saved);
            })
          }
        >
          {t('delivery.saveSettings', 'Save delivery settings')}
        </button>
        <button
          className={buttonClass}
          disabled={busy || !!running || !capabilities.available}
          onClick={() => void render()}
        >
          {job?.status === 'failed'
            ? t('delivery.retry', 'Retry export')
            : t('delivery.render', 'Export video')}
        </button>
        {running && (
          <button
            className={buttonClass}
            onClick={() =>
              void act(async () => {
                if (job) {
                  const cancelled = await window.electron?.cancelTimelineRender?.(job.id);
                  if (cancelled) {
                    const latest = await window.electron?.getTimelineRenderJob?.(job.id);
                    if (latest) setJob(latest);
                  }
                }
              })
            }
          >
            {t('delivery.cancel', 'Cancel export')}
          </button>
        )}
        {job?.status === 'complete' && (
          <>
            {[false, true].map((pack) => (
              <button
                key={String(pack)}
                className={buttonClass}
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const result = await window.electron?.saveTimelineRender?.({
                      id: job.id,
                      package: pack,
                    });
                    if (result?.saved) setJob({ ...job, savedName: result.name });
                  })
                }
              >
                {pack
                  ? t('delivery.package', 'Save publication package')
                  : t('delivery.saveMp4', 'Save MP4')}
              </button>
            ))}
          </>
        )}
      </div>
      {job && (
        <div role="status">
          <p>
            {t(`delivery.status.${job.status}`, job.status)}: {Math.round(job.progress * 100)}%{' '}
            {job.savedName}
          </p>
          <progress
            aria-label={t('delivery.progress', 'Export progress')}
            max="1"
            value={job.progress}
          />
          {job.error && (
            <div role="alert">
              {job.error}
              {failedClip && (
                <button
                  className={buttonClass}
                  onClick={() => useAppStore.getState().setCurrentTime(failedClip.startTime)}
                >
                  {t('delivery.locateClip', 'Locate affected clip')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {error && (
        <div role="alert">
          {error}
          {errorClip && (
            <button
              className={`${buttonClass} ml-2`}
              onClick={() => {
                const clip = clips.find((item) => item.id === errorClip);
                if (clip) useAppStore.getState().setCurrentTime(clip.startTime);
              }}
            >
              {t('delivery.locateClip', 'Locate affected clip')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
