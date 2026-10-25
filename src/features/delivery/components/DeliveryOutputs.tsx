import { useTranslation } from 'react-i18next';
import type { TimelineRenderJobV1 } from '@core/types';
import Icon from '@shared/components/ui/Icon';

export interface DeliveryOutputsProps {
  job: TimelineRenderJobV1 | null;
  busy: boolean;
  buttonClass: string;
  onSaveFile: (pack: boolean) => void;
}

export function DeliveryOutputs({ job, busy, buttonClass, onSaveFile }: DeliveryOutputsProps) {
  const { t } = useTranslation('creator');

  if (!job || job.status !== 'complete' || job.purpose === 'preview') {
    return null;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-800/80 bg-emerald-950/20 p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600">
          <Icon name="check" className="h-3.5 w-3.5 text-white" />
        </span>
        <h3 className="text-sm font-semibold text-emerald-200">
          {t('delivery.step4Title', '4. Save finished delivery')}
        </h3>
      </div>

      <p className="text-xs text-slate-300">
        {t(
          'delivery.exportReadyDesc',
          'Video export complete and ready to save to your local device.',
        )}
      </p>

      {job.savedName && (
        <div className="rounded-lg border border-emerald-800/60 bg-emerald-900/30 px-3 py-2 text-xs text-emerald-300">
          {t('delivery.savedAs', 'Saved as:')}{' '}
          <span className="font-mono font-semibold">{job.savedName}</span>
        </div>
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
