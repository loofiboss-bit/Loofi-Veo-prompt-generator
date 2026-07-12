import type { SafeModeStatus } from '@shared/hooks/useSafeMode';

const WIKI_BASE = 'https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/wiki';

export function SafeModeRecovery({
  status,
  onExit,
  onContinue,
}: {
  status: SafeModeStatus;
  onExit: () => void;
  onContinue: () => void;
}) {
  const resetSettings = () => {
    for (const key of Object.keys(localStorage)) {
      if (/settings|preferences|onboarding/i.test(key) && !/project|history/i.test(key)) {
        localStorage.removeItem(key);
      }
    }
    onExit();
  };
  const disablePlugins = () => {
    localStorage.setItem('veo-safe-mode-disable-plugins', 'true');
    onExit();
  };
  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/98 p-6 text-slate-100"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="safe-mode-title"
    >
      <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
          Recovery environment
        </p>
        <h1 id="safe-mode-title" className="mt-2 text-2xl font-bold">
          Loofi started in Safe Mode
        </h1>
        <p className="mt-3 text-sm text-slate-300">
          {status.reason === 'crash-loop'
            ? `${status.crashCount} repeated starts failed.`
            : 'Safe Mode was requested manually.'}{' '}
          Paid generation and plugins remain disabled until you choose a recovery action.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg border border-slate-600 p-4 text-left hover:border-cyan-400"
          >
            <strong className="block">Continue in Safe Mode</strong>
            <span className="mt-1 block text-xs text-slate-400">
              Inspect projects and export diagnostics without enabling risky integrations.
            </span>
          </button>
          <button
            type="button"
            onClick={disablePlugins}
            className="rounded-lg border border-slate-600 p-4 text-left hover:border-cyan-400"
          >
            <strong className="block">Restart with plugins disabled</strong>
            <span className="mt-1 block text-xs text-slate-400">
              Preserve projects and settings while isolating plugin failures.
            </span>
          </button>
          <button
            type="button"
            onClick={resetSettings}
            className="rounded-lg border border-slate-600 p-4 text-left hover:border-amber-400"
          >
            <strong className="block">Reset app settings</strong>
            <span className="mt-1 block text-xs text-slate-400">
              Keep project and history data, then rebuild preferences.
            </span>
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-slate-600 p-4 text-left hover:border-emerald-400"
          >
            <strong className="block">Exit Safe Mode and restart</strong>
            <span className="mt-1 block text-xs text-slate-400">
              Clear the crash-loop marker without changing data.
            </span>
          </button>
        </div>
        <nav aria-label="Safe Mode help" className="mt-6 flex flex-wrap gap-3 text-sm">
          <a
            className="text-cyan-300 underline"
            href={`${WIKI_BASE}/Troubleshooting-and-Diagnostics`}
            target="_blank"
            rel="noreferrer"
          >
            Troubleshooting and diagnostics
          </a>
          <a
            className="text-cyan-300 underline"
            href={`${WIKI_BASE}/Project-Backup-and-Restore`}
            target="_blank"
            rel="noreferrer"
          >
            Project backup and restore
          </a>
          <a
            className="text-cyan-300 underline"
            href={`${WIKI_BASE}/Privacy-and-Local-Storage`}
            target="_blank"
            rel="noreferrer"
          >
            Privacy and local storage
          </a>
        </nav>
      </div>
    </div>
  );
}
