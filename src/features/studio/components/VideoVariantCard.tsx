import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VideoPromptVariant } from '@core/types';

export function VideoVariantCard({
  variant,
  primary,
  onCopy,
  onHandoff,
  onEdit,
}: {
  variant: VideoPromptVariant;
  primary?: boolean;
  onCopy: (text: string, label: string) => void;
  onHandoff?: () => void;
  onEdit?: (changes: Partial<VideoPromptVariant>) => void;
}) {
  const { t } = useTranslation('studio');
  const [open, setOpen] = useState(Boolean(primary));
  return (
    <article className="studio-variant">
      <header className="studio-result-heading">
        <h3>{variant.title}</h3>
        <button aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? t('collapse') : t('open')}
        </button>
      </header>
      {open ? (
        <div className="studio-variant-body">
          <textarea
            readOnly={!onEdit}
            value={variant.prompt}
            onChange={(e) => onEdit?.({ prompt: e.target.value })}
            aria-label={variant.label + ' prompt'}
            rows={8}
          />
          <details className="studio-details">
            <summary>{t('negativePrompt')}</summary>
            <textarea
              readOnly={!onEdit}
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
                {t('copyHandoff')}
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
