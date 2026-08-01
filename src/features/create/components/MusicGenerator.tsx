import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getModel } from '@core/models/catalog';
import { musicGenerationService } from '@core/services/musicGenerationService';
import { useAppStore } from '@core/store/useAppStore';
import type { LyriaModelId, MusicGenerationTask, MusicImageInput } from '@core/types';

const readImage = async (file: File): Promise<MusicImageInput> => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Unsupported image type.');
  }
  if (file.size > 25 * 1024 * 1024) throw new Error('Images must be 25 MB or smaller.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Image read failed.'));
    reader.readAsDataURL(file);
  });
  return {
    data: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mimeType: file.type as MusicImageInput['mimeType'],
  };
};

export function MusicGenerator() {
  const { t } = useTranslation('create');
  const [modelId, setModelId] = useState<LyriaModelId>('lyria-3-clip-preview');
  const [responseFormat, setResponseFormat] = useState<'mp3' | 'wav'>('mp3');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [structure, setStructure] = useState('');
  const [images, setImages] = useState<MusicImageInput[]>([]);
  const [jobs, setJobs] = useState<MusicGenerationTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const assets = useAppStore((state) => state.assets);
  const addAsset = useAppStore((state) => state.addAsset);
  const model = getModel(modelId)!;
  const maximumCharge = useMemo(
    () => musicGenerationService.estimateMaximumCharge(modelId),
    [modelId],
  );

  const recordCompletedAsset = useCallback(
    (job: MusicGenerationTask) => {
      if (job.status !== 'Complete' || !job.localMediaUrl) return;
      const assetId = `asset:${job.id}`;
      if (assets.some((asset) => asset.id === assetId)) return;
      addAsset({
        id: assetId,
        type: 'audio',
        name: `${getModel(job.request.modelId)?.displayName ?? 'Lyria'} ${new Date(job.timestamp).toLocaleString()}`,
        url: job.localMediaUrl,
        data: '',
        mimeType: job.mimeType ?? 'audio/mpeg',
        storageKey: job.localMediaKey,
        tags: ['lyria-3', 'official-generation'],
      });
    },
    [addAsset, assets],
  );

  useEffect(() => {
    void musicGenerationService.list().then((storedJobs) => {
      setJobs(storedJobs.sort((a, b) => b.timestamp - a.timestamp));
      storedJobs.forEach(recordCompletedAsset);
    });
    return musicGenerationService.subscribe((updated) => {
      setJobs((current) => [updated, ...current.filter((job) => job.id !== updated.id)]);
      recordCompletedAsset(updated);
    });
  }, [recordCompletedAsset]);

  const handleModelChange = (nextModel: LyriaModelId) => {
    setModelId(nextModel);
    if (nextModel === 'lyria-3-clip-preview') setResponseFormat('mp3');
  };

  const handleImages = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    try {
      const selected = [...files].slice(0, 10);
      setImages(await Promise.all(selected.map(readImage)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('music.errors.image'));
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const queued = await musicGenerationService.submit({
        modelId,
        prompt,
        lyrics,
        structure,
        responseFormat,
        images,
      });
      setJobs((current) => [queued, ...current.filter((job) => job.id !== queued.id)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('music.errors.submit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="music-generator-title"
      className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            {t('music.eyebrow')}
          </p>
          <h3 id="music-generator-title" className="mt-1 text-lg font-semibold text-white">
            {t('music.title')}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{t('music.description')}</p>
        </div>
        <p className="text-xs text-slate-500">{t('music.sunoHandoff')}</p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm text-slate-300">
            {t('music.model')}
            <select
              value={modelId}
              onChange={(event) => handleModelChange(event.target.value as LyriaModelId)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="lyria-3-clip-preview">Lyria 3 Clip · 30s</option>
              <option value="lyria-3-pro-preview">Lyria 3 Pro</option>
            </select>
          </label>
          <label className="block text-sm text-slate-300">
            {t('music.prompt')}
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              maxLength={200000}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              placeholder={t('music.promptPlaceholder')}
            />
          </label>
          <details className="rounded-md border border-slate-800 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-200">
              {t('music.advanced')}
            </summary>
            <div className="mt-3 space-y-3">
              <label className="block text-sm text-slate-300">
                {t('music.lyrics')}
                <textarea
                  value={lyrics}
                  onChange={(event) => setLyrics(event.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm text-slate-300">
                {t('music.structure')}
                <textarea
                  value={structure}
                  onChange={(event) => setStructure(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  placeholder={t('music.structurePlaceholder')}
                />
              </label>
              <label className="block text-sm text-slate-300">
                {t('music.images')}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => void handleImages(event.target.files)}
                  className="mt-1 block w-full text-sm text-slate-400 file:me-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-100"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  {t('music.imagesSelected', { count: images.length })}
                </span>
              </label>
              <label className="block text-sm text-slate-300">
                {t('music.format')}
                <select
                  value={responseFormat}
                  onChange={(event) => setResponseFormat(event.target.value as 'mp3' | 'wav')}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="mp3">MP3</option>
                  {model.capabilities.supportedAudioFormats?.includes('wav') && (
                    <option value="wav">WAV</option>
                  )}
                </select>
              </label>
            </div>
          </details>
          <div className="rounded-md border border-blue-500/40 bg-blue-500/10 p-3 text-sm text-blue-100">
            <p>{t('music.cost', { cost: maximumCharge.toFixed(2) })}</p>
            <p className="mt-1 text-xs text-blue-200">
              {t('music.pricingSource', { date: model.pricing.source.verifiedDate })}
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || !prompt.trim()}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? t('music.submitting')
              : t('music.approve', { cost: maximumCharge.toFixed(2) })}
          </button>
        </div>

        <div aria-live="polite">
          <h4 className="text-sm font-semibold text-white">{t('music.history')}</h4>
          <div className="mt-2 space-y-3">
            {jobs.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-700 p-5 text-sm text-slate-500">
                {t('music.empty')}
              </p>
            ) : (
              jobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-md border border-slate-800 bg-slate-950 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {getModel(job.request.modelId)?.displayName}
                    </p>
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      {t(`music.status.${job.status}`)}
                    </span>
                  </div>
                  {job.localMediaUrl && (
                    <audio
                      controls
                      preload="metadata"
                      src={job.localMediaUrl}
                      className="mt-3 w-full"
                    >
                      {t('music.audioFallback')}
                    </audio>
                  )}
                  {job.generatedText && (
                    <details className="mt-2 text-xs text-slate-400">
                      <summary className="cursor-pointer">{t('music.generatedText')}</summary>
                      <pre className="mt-2 whitespace-pre-wrap font-sans">{job.generatedText}</pre>
                    </details>
                  )}
                  {job.error && <p className="mt-2 text-xs text-rose-300">{job.error}</p>}
                  {job.localMediaUrl && (
                    <a
                      href={job.localMediaUrl}
                      download={`lyria-${job.id}.${job.request.responseFormat}`}
                      className="mt-3 inline-flex rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
                    >
                      {t('music.export')}
                    </a>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
