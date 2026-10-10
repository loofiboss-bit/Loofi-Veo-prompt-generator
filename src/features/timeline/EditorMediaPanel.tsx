import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Asset } from '@core/types';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';

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
  const assets = useAppStore((state) => state.assets);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
          void run(async () => {
            const imported: Asset[] = [];
            for (const file of files) imported.push(await mediaAssetService.importLocalFile(file));
            if (projectId !== useProjectStore.getState().currentProjectId)
              throw new Error(
                t(
                  'v16.projectChanged',
                  'The project changed. Import the media again in the intended project.',
                ),
              );
            imported.forEach((asset) => useAppStore.getState().addAsset(asset));
            appendEditorMedia(imported);
            for (const asset of imported) {
              try {
                const prepared = await mediaAssetService.prepareDesktopProxy(asset);
                useAppStore.getState().updateAsset(asset.id, {
                  proxyUrl: prepared.proxyUrl,
                  isProxyReady: prepared.isProxyReady,
                });
              } catch {
                /* Proxy failure leaves the verified original usable. */
              }
            }
          });
        }}
      />
      {error && <p role="alert">{error}</p>}
      {!assets.length && <p>{t('v16.importHint', 'Add your clips, images and music to begin.')}</p>}
      <ul>
        {assets.map((asset) => (
          <li key={asset.id}>
            {asset.type === 'image' && <img src={asset.url} alt="" loading="lazy" />}
            <span>{asset.name}</span>
            <button
              disabled={busy || (asset.type !== 'image' && !asset.durationSeconds)}
              onClick={() => void run(async () => appendEditorMedia([asset]))}
              aria-label={`${t('v16.addMedia', 'Add to timeline')}: ${asset.name}`}
            >
              {t('v16.addMedia', 'Add to timeline')}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
