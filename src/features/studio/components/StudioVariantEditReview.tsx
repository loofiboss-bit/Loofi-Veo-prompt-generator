import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { diffService } from '@core/services/diffService';

export interface StudioVariantEditField {
  id: string;
  label: string;
  before: string;
  after: string;
}

interface StudioVariantEditReviewProps {
  title: string;
  hint: string;
  fields: StudioVariantEditField[];
  disabled: boolean;
  onAccept: (fields: string[]) => void;
  onReject: () => void;
  acceptLabel?: string;
}

export function StudioVariantEditReview({
  title,
  hint,
  fields,
  disabled,
  onAccept,
  onReject,
  acceptLabel,
}: StudioVariantEditReviewProps) {
  const { t } = useTranslation('studio');
  const fieldKey = fields.map((field) => field.id).join('\u0000');
  const [acceptedFields, setAcceptedFields] = useState(() => fields.map((field) => field.id));
  useEffect(() => {
    setAcceptedFields(fieldKey ? fieldKey.split('\u0000') : []);
  }, [fieldKey]);

  return (
    <section className="studio-proposal" aria-label={title}>
      <h3>{title}</h3>
      <p className="studio-hint">{hint}</p>
      {fields.map((field) => {
        const diff = diffService.compareText(field.before, field.after);
        return (
          <div key={field.id} className="studio-details">
            <label className="studio-field">
              <span>
                <input
                  type="checkbox"
                  checked={acceptedFields.includes(field.id)}
                  disabled={disabled}
                  onChange={(event) =>
                    setAcceptedFields((current) =>
                      event.target.checked
                        ? [...current, field.id]
                        : current.filter((item) => item !== field.id),
                    )
                  }
                />{' '}
                {t('variantEdit.acceptField', {
                  defaultValue: 'Accept {{field}}',
                  field: field.label,
                })}
              </span>
            </label>
            <div className="studio-diff" aria-label={`${field.label} changes`}>
              {diff.changes.map((change, index) => (
                <div key={index} className={`studio-diff-${change.type}`}>
                  {change.type === 'modify' ? <div>− {change.originalContent}</div> : null}
                  {change.type === 'add' || change.type === 'modify'
                    ? '+ '
                    : change.type === 'remove'
                      ? '− '
                      : '  '}
                  {change.content}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className="studio-actions">
        <button
          type="button"
          className="studio-primary"
          disabled={disabled || !acceptedFields.length}
          onClick={() => onAccept(acceptedFields)}
        >
          {acceptLabel ?? t('variantEdit.accept', { defaultValue: 'Accept selected fields' })}
        </button>
        <button type="button" disabled={disabled} onClick={onReject}>
          {t('revision.reject')}
        </button>
      </div>
    </section>
  );
}
