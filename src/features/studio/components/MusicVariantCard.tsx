import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MusicPromptVariant } from '@core/types';

export function MusicVariantCard({
  variant,
  primary,
  onCopy,
  onLyricsChange,
  onStyleChange,
}: {
  variant: MusicPromptVariant;
  primary?: boolean;
  onCopy: (text: string, label: string) => void;
  onLyricsChange?: (lyrics: string) => void;
  onStyleChange?: (style: string) => void;
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
          <label className="studio-field">
            <span>{t('musicStyle')}</span>
            <textarea
              readOnly={!onStyleChange}
              value={variant.styleOfMusic}
              onChange={(e) => onStyleChange?.(e.target.value)}
              aria-label={variant.label + ' style'}
              rows={3}
            />
          </label>
          <label className="studio-field">
            <span>{t('lyrics')}</span>
            <textarea
              readOnly={!onLyricsChange}
              value={variant.lyrics}
              onChange={(e) => onLyricsChange?.(e.target.value)}
              aria-label={variant.label + ' lyrics'}
              rows={12}
            />
          </label>
          <details className="studio-details">
            <summary>{t('advancedNotes')}</summary>
            <ul>
              {variant.productionNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </details>
          <div className="studio-actions">
            <button
              className="studio-primary"
              onClick={() => onCopy(variant.copyStyle, t('copied'))}
            >
              {t('copyStyle')}
            </button>
            <button onClick={() => onCopy(variant.copyLyrics, t('copied'))}>
              {t('copyLyrics')}
            </button>
            <button onClick={() => onCopy(variant.copyAll, t('copied'))}>{t('copyAll')}</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
