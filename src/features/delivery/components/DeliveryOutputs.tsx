import { useTranslation } from 'react-i18next';
import type { TimelineRenderJobV1 } from '@core/types';
import Icon from '@shared/components/ui/Icon';

export interface DeliveryOutputsProps {
  job: TimelineRenderJobV1 | null;
  busy: boolean;
  isCurrent: boolean;
  saved: boolean;
  savedName?: string;
  buttonClass: string;
  onSaveFile: (pack: boolean) => void;
}

export function DeliveryOutputs({
  job,
  busy,
  isCurrent,
  saved,
  savedName,
  buttonClass,
  onSaveFile,
}: DeliveryOutputsProps) {
  const { t } = useTranslation('creator');

  if (!job || job.status !== 'complete' || job.purpose === 'preview') {
    return null;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-action-bg)] text-[var(--color-on-accent)]"
        >
          {saved ? <Icon name="check" className="h-3.5 w-3.5" /> : '4'}
        </span>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t('delivery.step4Title', '4. Save finished delivery')}
        </h3>
      </div>

      <p className="text-xs text-[var(--color-text-secondary)]">
        {t(
          'delivery.exportReadyDesc',
          'Video export complete and ready to save to your local device.',
        )}
      </p>

      {!isCurrent && (
        <p role="status" className="text-sm text-[var(--color-text-primary)]">
          {t('delivery.previousResult', 'Previous delivery: it may not include the current edit.')}
        </p>
      )}
      {saved && (
        <p role="status" className="text-xs text-[var(--color-text-primary)]">
          {savedName ? (
            <>
              {t('delivery.savedAs', 'Saved as:')}{' '}
              <span className="font-mono font-semibold">{savedName}</span>
            </>
          ) : (
            t('delivery.savedConfirmed', 'The file was saved to the chosen destination.')
          )}{' '}
          {t('delivery.savedHistory', 'The file may have been moved or deleted since saving.')}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={`${buttonClass} studio-primary font-semibold`}
          disabled={busy}
          onClick={() => onSaveFile(false)}
        >
          {t('delivery.saveMp4', 'Save MP4')}
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={busy}
          onClick={() => onSaveFile(true)}
        >
          {t('delivery.package', 'Save package')}
        </button>
      </div>
    </div>
  );
}
