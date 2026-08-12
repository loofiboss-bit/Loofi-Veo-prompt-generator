import { useTranslation } from 'react-i18next';

import { useAppStore } from '@core/store/useAppStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';

export function ContinuitySummary() {
  const { t } = useTranslation('create');
  const productionBible = useAppStore((state) => state.productionBible);
  const activeRun = useProductionRunStore((state) => state.activeRun);

  return (
    <section
      aria-labelledby="create-continuity-title"
      className="mb-4 rounded-xl border border-blue-900/70 bg-slate-950/70 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
            {t('continuity.eyebrow', 'Assets & Continuity')}
          </p>
          <h2 id="create-continuity-title" className="mt-1 text-lg font-semibold text-slate-100">
            {t('continuity.title', 'Production Bible bindings')}
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-400">
            {t(
              'continuity.description',
              'Every shot keeps explicit identity, place, prop, and look bindings. The paid boundary uses the saved snapshot, not a newly guessed reference.',
            )}
          </p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
          {productionBible.profiles.length} {t('continuity.profiles', 'profiles')}
        </span>
      </div>

      {!activeRun ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-700 p-3 text-xs text-slate-500">
          {t(
            'continuity.createPlanFirst',
            'Create a local plan to preview shot bindings and snapshots.',
          )}
        </p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {activeRun.shots.map((shot) => {
            const status = shot.continuityReport?.status ?? 'blocked';
            const statusClass =
              status === 'ready'
                ? 'border-emerald-900/70 text-emerald-200'
                : status === 'warning'
                  ? 'border-amber-900/70 text-amber-200'
                  : 'border-rose-900/70 text-rose-200';
            return (
              <div key={shot.id} className={`rounded-md border bg-slate-900/70 p-3 ${statusClass}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">
                    {t('continuity.shot', 'Shot {{id}}', { id: shot.id })}
                  </p>
                  <span className="text-[10px] uppercase tracking-wide">{status}</span>
                </div>
                <p className="mt-1 truncate text-[11px] text-slate-400">{shot.title}</p>
                <p className="mt-2 text-[11px] text-slate-500">
                  {shot.continuityBinding?.profileIds.length ?? 0}{' '}
                  {t('continuity.boundProfiles', 'bound profiles')} ·{' '}
                  {shot.continuitySnapshot?.referenceAssetIds.length ?? 0}{' '}
                  {t('continuity.references', 'identity refs')} ·{' '}
                  {shot.continuitySnapshot?.snapshotHash ??
                    t('continuity.noSnapshot', 'no snapshot')}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
