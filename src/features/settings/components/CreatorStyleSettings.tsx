import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@core/store/useAppStore';
import { useCreatorStore } from '@core/store/useCreatorStore';
import { useProjectStore } from '@core/store/useProjectStore';
import type { CreatorStyleProfileV1 } from '@core/types/creatorDelivery';

const createStyle = (name: string): CreatorStyleProfileV1 => ({
  schemaVersion: 1,
  id: crypto.randomUUID(),
  name,
  primaryColor: '#173d56',
  textColor: '#ffffff',
  fontFamily: 'Noto Sans',
  creativeDescription: '',
  updatedAt: Date.now(),
});

export function CreatorStyleSettings() {
  const { t } = useTranslation('creator');
  const creator = useCreatorStore();
  const initializeCreator = useCreatorStore((state) => state.initialize);
  const assets = useAppStore((state) => state.assets);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const projectName = useProjectStore(
    (state) => state.projects.find((project) => project.id === state.currentProjectId)?.name,
  );
  const [style, setStyle] = useState(() => createStyle(t('style.defaultName', 'My style')));
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    void initializeCreator();
  }, [initializeCreator]);

  return (
    <section className="space-y-5" aria-labelledby="creator-style-settings-title">
      <header>
        <h2 id="creator-style-settings-title" className="text-xl font-semibold text-slate-100">
          {t('style.title', 'My style')}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {t(
            'style.description',
            'Save your colors, font and creative direction. Applying a style saves a separate snapshot in the project.',
          )}
        </p>
      </header>

      {creator.error ? (
        <p role="alert" className="text-sm text-red-300">
          {creator.error}
        </p>
      ) : null}
      {creator.notice ? (
        <p role="status" className="text-sm text-emerald-300">
          {creator.notice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2" aria-label={t('style.savedProfiles', 'Saved styles')}>
        {creator.profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            className="rounded border border-slate-700 px-3 py-2 text-sm"
            onClick={() => {
              setStyle(structuredClone(profile));
              setShowPreview(false);
            }}
          >
            {profile.name}
          </button>
        ))}
        <button
          type="button"
          className="rounded border border-slate-700 px-3 py-2 text-sm"
          onClick={() => {
            setStyle(createStyle(t('style.defaultName', 'My style')));
            setShowPreview(false);
          }}
        >
          {t('style.new', 'New style')}
        </button>
      </div>

      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          {t('style.name', 'Style name')}
          <input
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
            value={style.name}
            onChange={(event) => setStyle({ ...style, name: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('style.primary', 'Primary color')}
          <input
            type="color"
            className="h-10 rounded border border-slate-700 bg-slate-950 p-1"
            value={style.primaryColor}
            onChange={(event) => setStyle({ ...style, primaryColor: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('style.text', 'Text color')}
          <input
            type="color"
            className="h-10 rounded border border-slate-700 bg-slate-950 p-1"
            value={style.textColor}
            onChange={(event) => setStyle({ ...style, textColor: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('style.font', 'Font')}
          <select
            value={style.fontFamily}
            onChange={(event) =>
              setStyle({
                ...style,
                fontFamily: event.target.value as CreatorStyleProfileV1['fontFamily'],
              })
            }
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option>Noto Sans</option>
            <option>Noto Serif</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          {t('style.logo', 'Logo from media library')}
          <select
            value={style.logoAssetId ?? ''}
            onChange={(event) =>
              setStyle({ ...style, logoAssetId: event.target.value || undefined })
            }
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
          >
            <option value="">{t('style.noLogo', 'No logo')}</option>
            {assets
              .filter((asset) => asset.type === 'image')
              .map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          {t('style.direction', 'Creative direction')}
          <textarea
            value={style.creativeDescription}
            onChange={(event) => setStyle({ ...style, creativeDescription: event.target.value })}
            className="min-h-24 rounded border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={creator.busy || !style.name.trim()}
          className="rounded border border-slate-700 px-3 py-2"
          onClick={() => void creator.saveStyle({ ...style, updatedAt: Date.now() })}
        >
          {t('style.save', 'Save style')}
        </button>
        <button
          type="button"
          disabled={creator.busy}
          className="rounded border border-slate-700 px-3 py-2"
          onClick={() => setShowPreview(true)}
        >
          {t('style.preview', 'Preview on current project')}
        </button>
      </div>

      {showPreview ? (
        <div className="max-w-2xl space-y-3">
          <div
            className="rounded-lg p-6"
            style={{
              background: style.primaryColor,
              color: style.textColor,
              fontFamily: style.fontFamily,
            }}
          >
            {style.logoAssetId ? (
              <img
                className="mb-3 max-h-12 max-w-40 object-contain"
                alt={t('style.logoPreview', 'Logo preview')}
                src={assets.find((asset) => asset.id === style.logoAssetId)?.url}
              />
            ) : null}
            <strong>{projectName || style.name}</strong>
            <p>{style.creativeDescription}</p>
            <p>{t('style.captionPreview', 'A caption that is easy to read')}</p>
          </div>
          <p className="text-sm text-slate-400">
            {currentProjectId
              ? t(
                  'style.confirmDescription',
                  'Apply these colors, font, logo and creative direction to the current project? Existing continuity profiles remain available.',
                )
              : t('style.openProjectFirst', 'Open a project before applying a style.')}
          </p>
          <button
            type="button"
            disabled={!currentProjectId || creator.busy}
            className="rounded bg-blue-600 px-3 py-2 disabled:opacity-50"
            onClick={() =>
              void creator.applyStyle({ ...style, updatedAt: Date.now() }).then((applied) => {
                if (applied) setShowPreview(false);
              })
            }
          >
            {t('style.confirm', 'Apply to this project')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
