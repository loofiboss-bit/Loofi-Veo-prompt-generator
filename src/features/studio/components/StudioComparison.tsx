import { studioInputRows } from './studioInputPresentation';
import { useTranslation } from 'react-i18next';
import { diffService } from '@core/services/diffService';
import type { PromptStudioDraftV1 } from '@core/types';

/** A view of a draft independent of its persistence counters and project identity. */
type ComparisonDraft = Pick<
  PromptStudioDraftV1,
  | 'mode'
  | 'video'
  | 'music'
  | 'artifact'
  | 'artifacts'
  | 'selectedVariant'
  | 'selectedVariants'
  | 'lockedSections'
>;

export function StudioComparison({
  before,
  after,
}: {
  before: ComparisonDraft;
  after: ComparisonDraft;
}) {
  const { t } = useTranslation('studio');
  const input = (source: ComparisonDraft['video'] | ComparisonDraft['music']) => {
    return studioInputRows(source, t)
      .map(({ label, value }) => `${label}: ${value}`)
      .join('\n');
  };
  const views = (draft: ComparisonDraft) => [
    ...(['video', 'music'] as const).flatMap((mode) => {
      const artifact = draft.mode === mode ? draft.artifact : draft.artifacts?.[mode];
      const label = t(mode === 'video' ? 'videoMode' : 'musicMode');
      return [
        { label: `${label} · ${t('brief')}`, text: input(draft[mode]) },
        ...[artifact?.primary, artifact?.alternatives[0], artifact?.alternatives[1]].map(
          (variant, index) => ({
            label: `${label} · ${variant ? (index === 0 ? t('primary') : variant.label) : t('emptyTitle')}`,
            text: variant?.copyAll ?? '',
          }),
        ),
        {
          label: `${label} · ${t('revision.selection')}`,
          text: `${(draft.mode === mode ? draft.selectedVariant : (draft.selectedVariants?.[mode] ?? 0)) + 1}`,
        },
      ];
    }),
    { label: t('revision.locks'), text: draft.lockedSections.join(', ') },
  ];
  const previous = views(before);
  const proposed = views(after);
  const sections = proposed.map((view, index) => ({
    label: view.label,
    result: diffService.compareText(previous[index]?.text ?? '', view.text),
  }));
  return (
    <div className="studio-comparison">
      <p className="studio-hint">{t('revision.diffLegend')}</p>
      {sections.map(({ label, result }, index) => (
        <details key={index} open={index === 1} className="studio-details">
          <summary>
            {label} ·{' '}
            {result.summary.additions + result.summary.deletions + result.summary.modifications
              ? t('revision.changed')
              : t('revision.unchanged')}
          </summary>
          <div className="studio-diff" aria-label={label}>
            {result.changes.map((change, line) => (
              <div key={line} className={`studio-diff-${change.type}`}>
                {change.originalContent !== undefined && change.type === 'modify' ? (
                  <div>− {change.originalContent}</div>
                ) : null}
                <span>
                  {change.type === 'add'
                    ? '+ '
                    : change.type === 'remove'
                      ? '− '
                      : change.type === 'modify'
                        ? '+ '
                        : '  '}
                </span>
                {change.content}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
