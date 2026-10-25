import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  LocalPromptTransformId,
  VideoVariantEditField,
  VideoVariantEditProposal,
} from '@core/services/videoVariantEditService';
import { StudioVariantEditReview } from './StudioVariantEditReview';

interface VideoVariantEditPanelProps {
  busy: boolean;
  disabled: boolean;
  proposal: VideoVariantEditProposal | null;
  onPropose: (
    direction: string,
    fields: VideoVariantEditField[],
    allowDialogueRewrite?: boolean,
  ) => void;
  onLocalTransform?: (transformId: LocalPromptTransformId, applyToAll?: boolean) => void;
  onAccept: (fields: VideoVariantEditField[]) => void;
  onReject: () => void;
  onCancel?: () => void;
}

export function VideoVariantEditPanel(props: VideoVariantEditPanelProps) {
  const { t } = useTranslation('studio');
  const [goal, setGoal] = useState('shorten');
  const [direction, setDirection] = useState('');
  const [fields, setFields] = useState('prompt');
  const [allowDialogueRewrite, setAllowDialogueRewrite] = useState(false);
  const [applyToAllVariants, setApplyToAllVariants] = useState(false);
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
          <label className="studio-check">
            <input
              type="checkbox"
              checked={allowDialogueRewrite}
              onChange={(event) => setAllowDialogueRewrite(event.target.checked)}
            />
            {t('variantEdit.allowDialogueRewrite', {
              defaultValue: 'Allow dialogue to be rewritten',
            })}
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
                allowDialogueRewrite,
              )
            }
          >
            {t('variantEdit.propose', { defaultValue: 'Propose selected variant changes' })}
          </button>
          {props.onLocalTransform && (
            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold">
                  {t('variantEdit.localTools', {
                    defaultValue: 'Instant local tools (0 tokens / offline)',
                  })}
                </span>
                <label className="studio-check text-xs">
                  <input
                    type="checkbox"
                    checked={applyToAllVariants}
                    onChange={(event) => setApplyToAllVariants(event.target.checked)}
                  />
                  {t('variantEdit.applyToAllVariants', {
                    defaultValue: 'Apply to all 3 variants',
                  })}
                </label>
              </div>
              <button
                type="button"
                className="text-xs"
                onClick={() => props.onLocalTransform?.('clean-compact', applyToAllVariants)}
              >
                {t('variantEdit.cleanCompact', { defaultValue: 'Clean & Compact' })}
              </button>
              <button
                type="button"
                className="text-xs"
                onClick={() => props.onLocalTransform?.('sync-target-grammar', applyToAllVariants)}
              >
                {t('variantEdit.syncGrammar', { defaultValue: 'Sync Target Grammar' })}
              </button>
              <button
                type="button"
                className="text-xs"
                onClick={() => props.onLocalTransform?.('harden-negative', applyToAllVariants)}
              >
                {t('variantEdit.hardenNegative', { defaultValue: 'Harden Negative' })}
              </button>
            </div>
          )}
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
          title={t('variantEdit.review', { defaultValue: 'Review selected variant changes' })}
          hint={t('variantEdit.reviewHint', {
            defaultValue:
              'Choose the fields to accept together. Other fields and variants stay as they are.',
          })}
          fields={(Object.keys(props.proposal.patch) as VideoVariantEditField[]).map((field) => ({
            id: field,
            label: t(field === 'prompt' ? 'variantEdit.prompt' : 'negativePrompt', {
              defaultValue: field === 'prompt' ? 'Prompt' : 'Negative prompt',
            }),
            before: props.proposal!.before[field],
            after: props.proposal!.patch[field]!,
          }))}
          disabled={props.disabled || props.busy}
          onAccept={(selected) => props.onAccept(selected as VideoVariantEditField[])}
          onReject={props.onReject}
        />
      ) : null}
    </div>
  );
}
