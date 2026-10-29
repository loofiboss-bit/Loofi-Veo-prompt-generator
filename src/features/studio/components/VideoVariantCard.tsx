import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { diffService } from '@core/services/diffService';
import { estimateTokenCount } from '@core/services/promptAstLinterService';
import type { VideoPromptVariant } from '@core/types';

export function VideoVariantCard({
  variant,
  primary,
  compareBaseline,
  onCopy,
  onHandoff,
  onEdit,
}: {
  variant: VideoPromptVariant;
  primary?: boolean;
  compareBaseline?: VideoPromptVariant;
  onCopy: (text: string, label: string) => void;
  onHandoff?: () => void;
  onEdit?: (changes: Partial<VideoPromptVariant>) => void;
}) {
  const { t } = useTranslation('studio');
  const [open, setOpen] = useState(Boolean(primary));
  const tokenCount = useMemo(() => estimateTokenCount(variant.prompt), [variant.prompt]);
  const differences = useMemo(() => {
    if (!compareBaseline) return [];
    return [
      {
        label: t('promptLabel', { defaultValue: 'Prompt' }),
        before: compareBaseline.prompt,
        after: variant.prompt,
      },
      {
        label: t('negativePrompt'),
        before: compareBaseline.negativePrompt,
        after: variant.negativePrompt,
      },
      {
        label: t('checklist'),
        before: compareBaseline.settingsChecklist.join('\n'),
        after: variant.settingsChecklist.join('\n'),
      },
    ]
      .filter(({ before, after }) => before !== after)
      .map(({ label, before, after }) => ({ label, diff: diffService.compareText(before, after) }));
  }, [compareBaseline, variant, t]);
  return (
    <article className="studio-variant">
      <header className="studio-result-heading">
        <div className="flex flex-wrap items-center gap-2">
          <h3>{variant.title}</h3>
          <span
            className="studio-metric-badge"
            data-status={tokenCount > 280 ? 'warning' : tokenCount > 220 ? 'caution' : 'ok'}
          >
            {t('metrics.tokens', {
              defaultValue: '~{{count}} estimated tokens',
              count: tokenCount,
            })}
          </span>
        </div>
        <button aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? t('collapse') : t('open')}
        </button>
      </header>
      {open ? (
        <div className="studio-variant-body">
          <textarea
            readOnly={!onEdit}
            data-studio-field="prompt"
            value={variant.prompt}
            onChange={(e) => onEdit?.({ prompt: e.target.value })}
            aria-label={variant.label + ' prompt'}
            rows={8}
          />
          {differences.length ? (
            <details className="studio-details">
              <summary>
                {t('variantEdit.compareWithPrimary', { defaultValue: 'Compare with Primary' })}
              </summary>
              {differences.map(({ label, diff }) => (
                <div key={label}>
                  <h4>{label}</h4>
                  <div className="studio-diff">
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
              ))}
            </details>
          ) : null}
          <details className="studio-details">
            <summary>{t('negativePrompt')}</summary>
            <textarea
              readOnly={!onEdit}
              data-studio-field="negativePrompt"
              value={variant.negativePrompt}
              onChange={(e) => onEdit?.({ negativePrompt: e.target.value })}
              aria-label={t('negativePrompt')}
              rows={3}
            />
          </details>
          <details className="studio-details">
            <summary>{t('checklist')}</summary>
            <ul>
              {variant.settingsChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
          <div className="studio-actions">
            <button
              className="studio-primary"
              onClick={() => onCopy(variant.copyPrompt, t('copied'))}
            >
              {t('copyPrompt')}
            </button>
            <details className="studio-copy-menu">
              <summary>{t('copyOptions')}</summary>
              <button onClick={() => onCopy(variant.copyAll, t('copied'))}>
                {t('copyFullHandoff', {
                  defaultValue: 'Copy full handoff (prompt, negative prompt and settings)',
                })}
              </button>
              <button onClick={() => onCopy(variant.copyNegativePrompt, t('copied'))}>
                {t('copyNegative')}
              </button>
              <button onClick={() => onCopy(variant.copySettingsChecklist, t('copied'))}>
                {t('copyChecklist')}
              </button>
            </details>
            {onHandoff ? <button onClick={onHandoff}>{t('generateInApp')}</button> : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
