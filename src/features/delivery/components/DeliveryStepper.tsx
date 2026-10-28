import { useTranslation } from 'react-i18next';
import { DisabledReason } from '@shared/components/ui/DisabledReason';
import Icon from '@shared/components/ui/Icon';

export interface DeliveryStepperProps {
  busy: boolean;
  running: boolean;
  anyBatchRunning: boolean;
  capabilitiesAvailable: boolean;
  hasDiagnostics: boolean;
  isDiagnosticCurrent: boolean;
  hasPreview: boolean;
  isPreviewCurrent: boolean;
  hasExportedJob: boolean;
  hasSavedJob: boolean;
  batchFormatsCount: number;
  buttonClass: string;
  onCheck: () => void;
  onReview: () => void;
  onExport: () => void;
  onBatchExport: () => void;
  onCancel: () => void;
}

export function DeliveryStepper({
  busy,
  running,
  anyBatchRunning,
  capabilitiesAvailable,
  hasDiagnostics,
  isDiagnosticCurrent,
  hasPreview,
  isPreviewCurrent,
  hasExportedJob,
  hasSavedJob,
  batchFormatsCount,
  buttonClass,
  onCheck,
  onReview,
  onExport,
  onBatchExport,
  onCancel,
}: DeliveryStepperProps) {
  const { t } = useTranslation('creator');

  const checkCompleted = hasDiagnostics && isDiagnosticCurrent;
  const reviewCompleted = hasPreview && isPreviewCurrent;
  const exportCompleted = hasExportedJob;

  const currentStepNumber = !checkCompleted ? 1 : !reviewCompleted ? 2 : !exportCompleted ? 3 : 4;

  const steps = [
    { number: 1, label: t('v16.checkDelivery', 'Check delivery'), completed: checkCompleted },
    { number: 2, label: t('v16.reviewDelivery', 'Review delivery'), completed: reviewCompleted },
    { number: 3, label: t('delivery.render', 'Export video'), completed: exportCompleted },
    { number: 4, label: t('delivery.save', 'Save file'), completed: hasSavedJob },
  ];

  return (
    <div className="space-y-5 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5">
      {/* Visual Stepper Header */}
      <nav
        aria-label={t('delivery.stepsLabel', 'Delivery steps')}
        className="flex items-center justify-between gap-2 overflow-x-auto pb-2"
      >
        {steps.map((step, idx) => {
          const isActive = step.number === currentStepNumber;
          return (
            <div key={step.number} className="flex items-center gap-2 min-w-max">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  step.completed
                    ? 'bg-[var(--color-action-bg)] text-[var(--color-on-accent)]'
                    : isActive
                      ? 'bg-[var(--color-action-bg)] text-[var(--color-on-accent)] ring-2 ring-[var(--color-border-focus)]'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-primary)]'
                }`}
              >
                {step.completed ? '✓' : step.number}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive
                    ? 'text-[var(--color-text-primary)] font-semibold'
                    : step.completed
                      ? 'text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {step.label}
              </span>
              <span className="sr-only">
                {step.completed
                  ? t('delivery.stepCompleted', 'Completed')
                  : t('delivery.stepIncomplete', 'Not completed')}
              </span>
              {idx < steps.length - 1 && (
                <div
                  className={`hidden sm:block h-[1px] w-8 mx-2 ${
                    step.completed ? 'bg-emerald-700/60' : 'bg-slate-800'
                  }`}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* Primary Actions Pipeline */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {/* Step 1: Check */}
        <DisabledReason
          disabled={busy}
          reason={busy ? t('delivery.busyWait', 'Please wait...') : undefined}
        >
          <button
            type="button"
            className={`${buttonClass} ${currentStepNumber === 1 ? 'studio-primary' : ''}`}
            disabled={busy}
            onClick={onCheck}
          >
            {checkCompleted
              ? `✓ ${t('v16.checkDelivery', 'Check delivery')}`
              : t('v16.checkDelivery', 'Check delivery')}
          </button>
        </DisabledReason>

        {/* Step 2: Review preview */}
        <DisabledReason
          disabled={busy || !!running || anyBatchRunning || !capabilitiesAvailable}
          reason={
            !capabilitiesAvailable
              ? t('v16.capabilitiesMissing', 'Export renderer is not available.')
              : running || anyBatchRunning
                ? t('v16.renderRunning', 'A render is already running.')
                : busy
                  ? t('delivery.busyWait', 'Please wait...')
                  : undefined
          }
        >
          <button
            type="button"
            id="delivery-review-button"
            className={`${buttonClass} ${currentStepNumber === 2 ? 'studio-primary' : ''}`}
            disabled={busy || !!running || anyBatchRunning || !capabilitiesAvailable}
            onClick={onReview}
          >
            {reviewCompleted
              ? `✓ ${t('v16.reviewDelivery', 'Review delivery')}`
              : t('v16.reviewDelivery', 'Review delivery')}
          </button>
        </DisabledReason>

        {/* Step 3: Export Video */}
        <DisabledReason
          disabled={busy || !!running || anyBatchRunning || !capabilitiesAvailable}
          reason={
            !capabilitiesAvailable
              ? t('v16.capabilitiesMissing', 'Export renderer is not available.')
              : running || anyBatchRunning
                ? t('v16.renderRunning', 'A render is already running.')
                : undefined
          }
        >
          <button
            type="button"
            className={`${buttonClass} ${currentStepNumber === 3 ? 'studio-primary' : ''}`}
            aria-label={t('delivery.render', 'Export video')}
            disabled={busy || !!running || anyBatchRunning || !capabilitiesAvailable}
            onClick={onExport}
          >
            {t('delivery.render', 'Export video')}
          </button>
        </DisabledReason>

        {/* Batch Export option */}
        {batchFormatsCount > 1 && (
          <DisabledReason
            disabled={busy || !!running || anyBatchRunning || !capabilitiesAvailable}
            reason={
              running || anyBatchRunning
                ? t('v16.renderRunning', 'A render is already running.')
                : undefined
            }
          >
            <button
              type="button"
              className={buttonClass}
              disabled={busy || !!running || anyBatchRunning || !capabilitiesAvailable}
              onClick={onBatchExport}
            >
              {t('delivery.renderBatchWithCount', 'Batch export ({{count}} formats)', {
                count: batchFormatsCount,
              })}
            </button>
          </DisabledReason>
        )}

        {/* Cancel option */}
        {(running || anyBatchRunning) && (
          <button
            type="button"
            className="rounded-xl border border-red-700/80 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/50 transition-colors"
            onClick={onCancel}
          >
            {t('delivery.cancel', 'Cancel export')}
          </button>
        )}
      </div>

      {/* Helpful soft recommendation if exporting prior to review */}
      {!reviewCompleted && currentStepNumber === 3 && (
        <p className="text-xs text-amber-400/90 flex items-center gap-1.5">
          <Icon name="info" className="h-4 w-4 shrink-0" />
          <span>
            {t(
              'delivery.recommendReview',
              'Tip: We recommend reviewing the preview in Step 2 before the final export.',
            )}
          </span>
        </p>
      )}
    </div>
  );
}
