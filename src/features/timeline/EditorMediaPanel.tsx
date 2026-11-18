import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Asset } from '@core/types';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { projectSaveCoordinator } from '@core/services/projectSaveCoordinator';
import { MediaFilterTabs, type MediaFilterType } from '@features/media/components/MediaFilterTabs';

export function appendEditorMedia(assets: Asset[]): void {
  const state = useAppStore.getState();
  const tracks = [...state.tracks];
  const clips = [...state.clips];
  for (const asset of assets) {
    const type = asset.type === 'audio' ? 'audio' : 'video';
    let track = tracks.find((item) => item.type === type);
    if (!track) {
      track = {
        id: `creator-${type}`,
        label: type === 'audio' ? 'Audio' : 'Video',
        type,
        trackType: type === 'audio' ? 'music' : 'dialogue',
        zIndex: type === 'audio' ? 1 : 0,
      };
      tracks.push(track);
    }
    const duration = asset.type === 'image' ? 5 : asset.durationSeconds;
    if (!duration || !Number.isFinite(duration))
      throw new Error('Read media duration before adding this file.');
    const startTime = Math.max(
      0,
      ...clips
        .filter((clip) => clip.trackId === track.id)
        .map((clip) => clip.startTime + clip.duration),
    );
    clips.push({
      id: crypto.randomUUID(),
      resourceId: asset.id,
      trackId: track.id,
      type: asset.type,
      label: asset.name,
      duration,
      startTime,
      offset: 0,
      volume: 1,
    });
  }
  useAppStore.setState({ tracks, clips });
}

export function EditorMediaPanel() {
  const { t } = useTranslation('creator');
  const input = useRef<HTMLInputElement>(null);
  const rawAssets = useAppStore((state) => state.assets);
  const assets = useMemo(() => rawAssets ?? [], [rawAssets]);
  const rawClips = useAppStore((state) => state.clips);
  const clips = useMemo(() => rawClips ?? [], [rawClips]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mediaFilter, setMediaFilter] = useState<MediaFilterType>('all');
  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const placedAssetIds = useMemo(
    () => new Set(clips.map((clip) => clip.resourceId).filter(Boolean)),
    [clips],
  );

  const filterCounts = useMemo(() => {
    return {
      all: assets.length,
      video: assets.filter((a) => a.type === 'video').length,
      audio: assets.filter((a) => a.type === 'audio').length,
      image: assets.filter((a) => a.type === 'image').length,
      reference: assets.filter((a) => a.tags?.includes('reference')).length,
      generated: assets.filter(
        (a) =>
          a.tags?.includes('generated') || a.name.startsWith('veo_') || a.name.startsWith('gen_'),
      ).length,
    };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (mediaFilter === 'all') return true;
      if (mediaFilter === 'video') return asset.type === 'video';
      if (mediaFilter === 'audio') return asset.type === 'audio';
      if (mediaFilter === 'image') return asset.type === 'image';
      if (mediaFilter === 'reference') return asset.tags?.includes('reference');
      if (mediaFilter === 'generated') {
        return (
          asset.tags?.includes('generated') ||
          asset.name.startsWith('veo_') ||
          asset.name.startsWith('gen_')
        );
      }
      return true;
    });
  }, [assets, mediaFilter]);

  return (
    <aside className="local-editor-media" aria-label={t('v16.mediaLibrary', 'Media library')}>
      <h2>{t('v16.mediaLibrary', 'Media library')}</h2>
      <button disabled={busy} onClick={() => input.current?.click()}>
        {busy ? t('v16.importing', 'Importing media…') : t('v16.importMedia', 'Import media')}
      </button>
      <input
        ref={input}
        type="file"
        className="sr-only"
        multiple
        accept="video/*,image/*,audio/*"
        aria-label={t('v16.chooseMedia', 'Choose local media')}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (!files.length) return;
          const projectId = useProjectStore.getState().currentProjectId;
          const projectRevision =
            useEditorSessionStore.getState().projectSnapshot?.documentRevision;
          const mutationVersion = useAppStore.getState().mutationVersion;
          void run(async () => {
            if (!projectId)
              throw new Error(t('v16.openProjectFirst', 'Open a project before importing media.'));
            const imported = await Promise.all(
              files.map((file) => mediaAssetService.importLocalFile(file)),
            );
            if (
              projectId !== useProjectStore.getState().currentProjectId ||
              projectId !== useEditorSessionStore.getState().projectSnapshot?.id ||
              projectRevision !==
                useEditorSessionStore.getState().projectSnapshot?.documentRevision ||
              mutationVersion !== useAppStore.getState().mutationVersion
            )
              throw new Error(
                t(
                  'v16.projectChanged',
                  'The project or its edits changed while importing. Import the media again in the intended project.',
                ),
              );
            imported.forEach((asset) => useAppStore.getState().addAsset(asset));
            appendEditorMedia(imported);
            await Promise.all(
              imported.map(async (asset) => {
                try {
                  const prepared = await mediaAssetService.prepareDesktopProxy(asset);
                  useAppStore.getState().updateAsset(asset.id, {
                    proxyUrl: prepared.proxyUrl,
                    isProxyReady: prepared.isProxyReady,
                  });
                } catch {
                  /* Proxy failure leaves the verified original usable. */
                }
              }),
            );
            await projectSaveCoordinator.saveProject(projectId);
          });
        }}
      />
      <div className="mt-3">
        <MediaFilterTabs current={mediaFilter} onChange={setMediaFilter} counts={filterCounts} />
      </div>
      {error && <p role="alert">{error}</p>}
      {!assets.length && <p>{t('v16.importHint', 'Add your clips, images and music to begin.')}</p>}
      {assets.length > 0 && !filteredAssets.length && (
        <p className="mt-4 text-center text-xs text-slate-500">
          {t('v16.noFilterMatches', 'No assets match the selected filter.')}
        </p>
      )}
      <ul>
        {filteredAssets.map((asset) => {
          const isPlaced = placedAssetIds.has(asset.id);
          return (
            <li key={asset.id}>
              {asset.type === 'image' && <img src={asset.url} alt="" loading="lazy" />}
              <div className="flex items-center justify-between gap-2">
                <span>{asset.name}</span>
                {isPlaced && (
                  <span
                    className="shrink-0 rounded bg-blue-900/60 px-1.5 py-0.5 text-[10px] font-medium text-blue-300"
                    title={t('v16.placedOnTimeline', 'Placed on timeline')}
                  >
                    {t('v16.placedOnTimeline', 'Placed on timeline')}
                  </span>
                )}
              </div>
              <button
                disabled={busy || (asset.type !== 'image' && !asset.durationSeconds)}
                onClick={() => void run(async () => appendEditorMedia([asset]))}
                aria-label={`${t('v16.addMedia', 'Add to timeline')}: ${asset.name}`}
              >
                {t('v16.addMedia', 'Add to timeline')}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
