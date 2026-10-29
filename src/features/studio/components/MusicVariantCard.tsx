import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { diffService } from '@core/services/diffService';
import type { MusicPromptVariant } from '@core/types';

export function MusicVariantCard({
  variant,
  primary,
  compareBaseline,
  onCopy,
  onLyricsChange,
  onStyleChange,
}: {
  variant: MusicPromptVariant;
  primary?: boolean;
  compareBaseline?: MusicPromptVariant;
  onCopy: (text: string, label: string) => void;
  onLyricsChange?: (lyrics: string) => void;
  onStyleChange?: (style: string) => void;
}) {
  const { t } = useTranslation('studio');
  const [open, setOpen] = useState(Boolean(primary));
  const styleLength = variant.styleOfMusic.length;
  const sectionCount = useMemo(
    () => (variant.lyrics.match(/\[[^\]]+\]/g) ?? []).length,
    [variant.lyrics],
  );
  const differences = useMemo(() => {
    if (!compareBaseline) return [];
    return [
      { label: t('musicStyle'), before: compareBaseline.styleOfMusic, after: variant.styleOfMusic },
      { label: t('lyrics'), before: compareBaseline.lyrics, after: variant.lyrics },
      {
        label: t('advancedNotes'),
        before: compareBaseline.productionNotes.join('\n'),
        after: variant.productionNotes.join('\n'),
      },
    ]
      .filter(({ before, after }) => before !== after)
      .map(({ label, before, after }) => ({ label, diff: diffService.compareText(before, after) }));
  }, [compareBaseline, variant, t]);
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
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>{t('musicStyle')}</span>
              <span
                className="studio-metric-badge"
                data-status={styleLength > 200 ? 'warning' : 'ok'}
              >
                {t('metrics.styleChars', {
                  defaultValue: '{{count}} / 200 chars',
                  count: styleLength,
                })}
              </span>
            </span>
            <textarea
              readOnly={!onStyleChange}
              data-studio-field="styleOfMusic"
              value={variant.styleOfMusic}
              onChange={(e) => onStyleChange?.(e.target.value)}
              aria-label={variant.label + ' style'}
              rows={3}
            />
          </label>
          <label className="studio-field">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>{t('lyrics')}</span>
              <span
                className="studio-metric-badge"
                data-status={sectionCount === 0 ? 'warning' : 'ok'}
              >
                {t('metrics.lyricSections', {
                  defaultValue: '{{count}} sections',
                  count: sectionCount,
                })}
              </span>
            </span>
            <textarea
              readOnly={!onLyricsChange}
              data-studio-field="lyrics"
              value={variant.lyrics}
              onChange={(e) => onLyricsChange?.(e.target.value)}
              aria-label={variant.label + ' lyrics'}
              rows={12}
            />
          </label>
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
            <details className="studio-copy-menu">
              <summary>{t('copyOptions')}</summary>
              <button onClick={() => onCopy(variant.copyAll, t('copied'))}>
                {t('copyFullMusic', { defaultValue: 'Copy full pack (style, lyrics and notes)' })}
              </button>
            </details>
          </div>
        </div>
      ) : null}
    </article>
  );
}
