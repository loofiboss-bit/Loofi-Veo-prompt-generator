import { studioCheckLabel, studioCheckDetail } from './studioValidationPresentation';
import { useTranslation } from 'react-i18next';
import type { PromptArtifactV1, PromptValidationAction } from '@core/types/promptArtifact';

interface ValidationRailProps {
  artifact: PromptArtifactV1;
  statuses?: Array<PromptArtifactV1['validation'][number]['status']>;
  onAction?: (action: PromptValidationAction) => void;
}

export function ValidationRail({ artifact, onAction, statuses }: ValidationRailProps) {
  const { t } = useTranslation('studio');
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {artifact.validation
        .filter((check) => !statuses || statuses.includes(check.status))
        .map((check) => {
          return (
            <div
              key={check.id}
              className={`rounded-lg border px-3 py-2 text-xs ${check.status === 'blocked' ? 'border-rose-500/60' : check.status === 'warning' ? 'border-amber-500/60' : 'border-emerald-500/60'}`}
              style={{
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
            >
              <div className="flex items-center gap-2 font-semibold">
                <span aria-hidden="true">
                  {check.status === 'pass' ? '✓' : check.status === 'warning' ? '!' : '×'}
                </span>
                <span className="sr-only">
                  {t(`validationStatus.${check.status}`, { defaultValue: check.status })}:{' '}
                </span>
                {studioCheckLabel(check, t)}
                {check.action?.variantIndex !== undefined && (
                  <span>
                    {t('validationVariant', {
                      defaultValue: 'Variant {{number}}',
                      number: check.action.variantIndex + 1,
                    })}
                  </span>
                )}
              </div>
              <p className="mt-1 leading-relaxed">{studioCheckDetail(check, t)}</p>
              {check.evidence && (
                <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {t(`evidence${check.evidence[0].toUpperCase()}${check.evidence.slice(1)}`, {
                    defaultValue: check.evidence,
                  })}
                </p>
              )}
              {check.sourceUrl && (
                <a
                  href={check.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block underline"
                >
                  {t('validationSource', { defaultValue: 'Source' })}
                  {check.verifiedDate ? ` (${check.verifiedDate})` : ''}
                </a>
              )}
              {check.status !== 'pass' && check.action && onAction && (
                <button
                  type="button"
                  onClick={() => onAction(check.action!)}
                  className="mt-2 block rounded border px-2 py-1"
                >
                  {t('validationAction', { defaultValue: 'Open control' })}
                </button>
              )}
            </div>
          );
        })}
    </div>
  );
}
