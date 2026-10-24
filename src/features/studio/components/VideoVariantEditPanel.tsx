import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { diffService } from '@core/services/diffService';
import type {
  LocalPromptTransformId,
  VideoVariantEditField,
  VideoVariantEditProposal,
} from '@core/services/videoVariantEditService';

interface VideoVariantEditPanelProps {
  busy: boolean;
  disabled: boolean;
  proposal: VideoVariantEditProposal | null;
  onPropose: (direction: string, fields: VideoVariantEditField[]) => void;
  onLocalTransform?: (transformId: LocalPromptTransformId) => void;
  onAccept: (fields: VideoVariantEditField[]) => void;
  onReject: () => void;
}

function VariantEditReview({
  proposal,
  disabled,
  onAccept,
  onReject,
}: Pick<VideoVariantEditPanelProps, 'disabled' | 'onAccept' | 'onReject'> & {
  proposal: VideoVariantEditProposal;
}) {
  const { t } = useTranslation('studio');
  const fields = Object.keys(proposal.patch) as VideoVariantEditField[];
  const [acceptedFields, setAcceptedFields] = useState(fields);
  return (
    <section
      className="studio-proposal"
      aria-label={t('variantEdit.review', { defaultValue: 'Review selected variant changes' })}
    >
      <h3>{t('variantEdit.review', { defaultValue: 'Review selected variant changes' })}</h3>
      <p className="studio-hint">
        {t('variantEdit.reviewHint', {
          defaultValue:
            'Choose the fields to accept together. Other fields and variants stay as they are.',
        })}
      </p>
      {fields.map((field) => {
        const label = t(field === 'prompt' ? 'variantEdit.prompt' : 'negativePrompt', {
          defaultValue: field === 'prompt' ? 'Prompt' : 'Negative prompt',
        });
        const diff = diffService.compareText(proposal.before[field], proposal.patch[field]!);
        return (
          <div key={field} className="studio-details">
            <label className="studio-field">
              <span>
                <input
                  type="checkbox"
                  checked={acceptedFields.includes(field)}
                  disabled={disabled}
                  onChange={(event) =>
                    setAcceptedFields((current) =>
                      event.target.checked
                        ? [...current, field]
                        : current.filter((item) => item !== field),
                    )
                  }
                />{' '}
                {t('variantEdit.acceptField', { defaultValue: 'Accept {{field}}', field: label })}
              </span>
            </label>
            <div
              className="studio-diff"
              aria-label={t('variantEdit.fieldDiff', {
                defaultValue: '{{field}} changes',
                field: label,
              })}
            >
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
          {t('variantEdit.accept', { defaultValue: 'Accept selected fields' })}
        </button>
        <button type="button" disabled={disabled} onClick={onReject}>
          {t('revision.reject')}
        </button>
      </div>
    </section>
  );
}

export function VideoVariantEditPanel(props: VideoVariantEditPanelProps) {
  const { t } = useTranslation('studio');
  const [goal, setGoal] = useState('shorten');
  const [direction, setDirection] = useState('');
  const [fields, setFields] = useState('prompt');
  const requestedDirection =
    goal === 'custom'
      ? direction.trim()
      : goal === 'camera'
        ? 'Clarify the camera movement while preserving the scene, action, and dialogue.'
        : 'Shorten the text while preserving the scene, action, camera direction, and dialogue.';
  return (
    <div className="space-y-3">
      <details className="studio-details">
        <summary>{t('variantEdit.title', { defaultValue: 'Improve selected variant' })}</summary>
        <fieldset disabled={props.disabled || props.busy} className="studio-variant-body">
          <label className="studio-field">
            <span>{t('variantEdit.goal', { defaultValue: 'Improvement goal' })}</span>
            <select
              aria-label={t('variantEdit.goal', { defaultValue: 'Improvement goal' })}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            >
              <option value="shorten">
                {t('variantEdit.shorten', { defaultValue: 'Shorter text' })}
              </option>
              <option value="camera">
                {t('variantEdit.camera', { defaultValue: 'Clearer camera movement' })}
              </option>
              <option value="custom">
                {t('variantEdit.custom', { defaultValue: 'Custom instruction' })}
              </option>
            </select>
          </label>
          {goal === 'custom' ? (
            <label className="studio-field">
              <span>{t('variantEdit.direction', { defaultValue: 'Requested improvement' })}</span>
              <textarea
                aria-label={t('variantEdit.direction', { defaultValue: 'Requested improvement' })}
                rows={3}
                value={direction}
                onChange={(event) => setDirection(event.target.value)}
              />
            </label>
          ) : null}
          <label className="studio-field">
            <span>{t('variantEdit.fields', { defaultValue: 'Fields to improve' })}</span>
            <select
              aria-label={t('variantEdit.fields', { defaultValue: 'Fields to improve' })}
              value={fields}
              onChange={(event) => setFields(event.target.value)}
            >
              <option value="prompt">{t('variantEdit.prompt', { defaultValue: 'Prompt' })}</option>
              <option value="negativePrompt">{t('negativePrompt')}</option>
              <option value="both">
                {t('variantEdit.both', { defaultValue: 'Prompt and negative prompt' })}
              </option>
            </select>
          </label>
          <button
            type="button"
            disabled={!requestedDirection}
            onClick={() =>
              props.onPropose(
                requestedDirection,
                fields === 'both'
                  ? ['prompt', 'negativePrompt']
                  : [fields as VideoVariantEditField],
              )
            }
          >
            {t('variantEdit.propose', { defaultValue: 'Propose selected variant changes' })}
          </button>
          {props.onLocalTransform && (
            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
              <span className="w-full text-xs font-semibold">
                {t('variantEdit.localTools', {
                  defaultValue: 'Instant local tools (0 tokens / offline)',
                })}
              </span>
              <button
                type="button"
                className="text-xs"
                onClick={() => props.onLocalTransform?.('clean-compact')}
              >
                {t('variantEdit.cleanCompact', { defaultValue: 'Clean & Compact' })}
              </button>
              <button
                type="button"
                className="text-xs"
                onClick={() => props.onLocalTransform?.('sync-target-grammar')}
              >
                {t('variantEdit.syncGrammar', { defaultValue: 'Sync Target Grammar' })}
              </button>
              <button
                type="button"
                className="text-xs"
                onClick={() => props.onLocalTransform?.('harden-negative')}
              >
                {t('variantEdit.hardenNegative', { defaultValue: 'Harden Negative' })}
              </button>
            </div>
          )}
        </fieldset>
      </details>
      {props.busy ? (
        <p role="status">
          {t('variantEdit.requesting', { defaultValue: 'Preparing a proposal…' })}
        </p>
      ) : null}
      {props.proposal ? (
        <VariantEditReview
          key={`${props.proposal.projectId}:${props.proposal.token}`}
          proposal={props.proposal}
          disabled={props.disabled || props.busy}
          onAccept={props.onAccept}
          onReject={props.onReject}
        />
      ) : null}
    </div>
  );
}
