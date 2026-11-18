import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  MusicVariantEditField,
  MusicVariantEditProposal,
} from '@core/services/videoVariantEditService';
import { StudioVariantEditReview } from './StudioVariantEditReview';

interface MusicVariantEditPanelProps {
  busy: boolean;
  disabled: boolean;
  instrumental: boolean;
  proposal: MusicVariantEditProposal | null;
  onPropose: (direction: string, fields: MusicVariantEditField[]) => void;
  onAccept: (fields: MusicVariantEditField[]) => void;
  onReject: () => void;
  onCancel?: () => void;
}

export function MusicVariantEditPanel(props: MusicVariantEditPanelProps) {
  const { t } = useTranslation('studio');
  const [fieldChoice, setFieldChoice] = useState<'styleOfMusic' | 'lyrics' | 'both'>(
    'styleOfMusic',
  );
  const [direction, setDirection] = useState('');
  useEffect(() => {
    if (props.instrumental && fieldChoice !== 'styleOfMusic') setFieldChoice('styleOfMusic');
  }, [fieldChoice, props.instrumental]);
  const fields: MusicVariantEditField[] =
    fieldChoice === 'both' ? ['styleOfMusic', 'lyrics'] : [fieldChoice as MusicVariantEditField];
  const reviewFields = props.proposal
    ? fields
        .filter((field) => props.proposal!.patch[field] !== undefined)
        .map((field) => ({
          id: field,
          label: t(`variantEdit.${field}`, {
            defaultValue: field === 'styleOfMusic' ? 'Music style' : 'Lyrics',
          }),
          before: props.proposal!.before[field],
          after: props.proposal!.patch[field]!,
        }))
    : [];
  return (
    <div className="space-y-3">
      <details className="studio-details" open={Boolean(props.proposal)}>
        <summary>
          {t('variantEdit.musicTitle', { defaultValue: 'Improve selected variant' })}
        </summary>
        <fieldset disabled={props.disabled || props.busy} className="studio-variant-body">
          <label className="studio-field">
            <span>{t('variantEdit.fields', { defaultValue: 'Fields to improve' })}</span>
            <select
              aria-label={t('variantEdit.fields', { defaultValue: 'Fields to improve' })}
              value={fieldChoice}
              onChange={(event) =>
                setFieldChoice(event.target.value as 'styleOfMusic' | 'lyrics' | 'both')
              }
            >
              <option value="styleOfMusic">
                {t('variantEdit.musicStyle', { defaultValue: 'Music style' })}
              </option>
              <option value="lyrics" disabled={props.instrumental}>
                {t('lyrics', { defaultValue: 'Lyrics' })}
              </option>
              <option value="both" disabled={props.instrumental}>
                {t('variantEdit.musicBoth', { defaultValue: 'Music style and lyrics' })}
              </option>
            </select>
          </label>
          <label className="studio-field">
            <span>{t('variantEdit.direction', { defaultValue: 'Requested improvement' })}</span>
            <textarea
              aria-label={t('variantEdit.direction', { defaultValue: 'Requested improvement' })}
              rows={2}
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
              placeholder={t('variantEdit.musicDirection', {
                defaultValue: 'Describe the change you want',
              })}
            />
          </label>
          <button
            type="button"
            disabled={!direction.trim()}
            onClick={() => props.onPropose(direction.trim(), fields)}
          >
            {t('variantEdit.proposeMusic', { defaultValue: 'Propose music changes' })}
          </button>
        </fieldset>
      </details>
      {props.busy ? (
        <div className="studio-actions">
          <p role="status">
            {t('variantEdit.requesting', { defaultValue: 'Preparing a proposal…' })}
          </p>
          {props.onCancel ? (
            <button type="button" onClick={props.onCancel}>
              {t('variantEdit.cancel', { defaultValue: 'Cancel' })}
            </button>
          ) : null}
        </div>
      ) : null}
      {props.proposal ? (
        <StudioVariantEditReview
          key={`${props.proposal.projectId}:${props.proposal.revision}:${props.proposal.token}`}
          title={t('variantEdit.musicReview', { defaultValue: 'Review music variant changes' })}
          hint={t('variantEdit.musicReviewHint', {
            defaultValue: 'The other variants, title and production notes stay unchanged.',
          })}
          fields={reviewFields}
          disabled={props.disabled || props.busy}
          onAccept={(selected) => props.onAccept(selected as MusicVariantEditField[])}
          onReject={props.onReject}
        />
      ) : null}
    </div>
  );
}
