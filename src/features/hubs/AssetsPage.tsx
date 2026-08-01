import { useTranslation } from 'react-i18next';

import { useAppStore } from '@core/store/useAppStore';

export function AssetsPage() {
  const { t } = useTranslation('common');
  const assets = useAppStore((state) => state.assets);

  return (
    <main id="main-content" className="min-h-full bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            {t('assets.libraryEyebrow', 'Local media library')}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">{t('sidebar.assets', 'Assets')}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {t(
              'assets.consolidatedDescription',
              'Generated media, character references, and locations for the current project.',
            )}
          </p>
        </header>
        <section
          aria-label={t('sidebar.assets', 'Assets')}
          className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {assets.length === 0 ? (
            <p className="col-span-full rounded-xl border border-dashed border-slate-700 p-8 text-slate-400">
              {t(
                'assets.empty',
                'No assets yet. Add references or accept generated media in Create.',
              )}
            </p>
          ) : (
            assets.map((asset) => (
              <article
                key={asset.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <p className="text-xs uppercase tracking-wide text-blue-300">{asset.type}</p>
                <h2 className="mt-1 truncate font-semibold">{asset.name}</h2>
                <p className="mt-2 text-xs text-slate-500">{asset.mimeType}</p>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
