import type { PromptArtifactV1 } from '@core/types';

export function ValidationRail({ artifact }: { artifact: PromptArtifactV1 }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {artifact.validation.map((check) => (
        <div
          key={check.id}
          className={`rounded-lg border px-3 py-2 text-xs ${
            check.status === 'blocked'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
              : check.status === 'warning'
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-100'
                : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <span aria-hidden="true">
              {check.status === 'pass' ? '✓' : check.status === 'warning' ? '!' : '×'}
            </span>
            {check.label}
          </div>
          <p className="mt-1 leading-relaxed opacity-80">{check.detail}</p>
        </div>
      ))}
    </div>
  );
}
