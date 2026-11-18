import { useTranslation } from 'react-i18next';

export type MediaFilterType = 'all' | 'video' | 'audio' | 'image' | 'reference' | 'generated';

interface MediaFilterTabsProps {
  current?: MediaFilterType;
  value?: MediaFilterType;
  onChange: (filter: MediaFilterType) => void;
  counts?: Partial<Record<MediaFilterType, number>>;
  className?: string;
}

export function MediaFilterTabs({
  current,
  value,
  onChange,
  counts,
  className = '',
}: MediaFilterTabsProps) {
  const { t } = useTranslation('common');
  const activeKey = current ?? value ?? 'all';

  const filterOptions: { key: MediaFilterType; label: string }[] = [
    { key: 'all', label: t('media.filterAll', 'All') },
    { key: 'video', label: t('media.filterVideo', 'Video') },
    { key: 'audio', label: t('media.filterAudio', 'Audio') },
    { key: 'image', label: t('media.filterImage', 'Images') },
    { key: 'reference', label: t('media.filterReference', 'References') },
    { key: 'generated', label: t('media.filterGenerated', 'Generated') },
  ];

  return (
    <div
      role="tablist"
      aria-label={t('media.filters', 'Filter media')}
      className={`flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-xs ${className}`}
    >
      {filterOptions.map((opt) => {
        const isSelected = activeKey === opt.key;
        const count = counts?.[opt.key];
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={isSelected}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              isSelected
                ? 'bg-[var(--color-action-bg)] text-[var(--color-on-accent)]'
                : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
            }`}
          >
            {opt.label}
            {count !== undefined && count > 0 && (
              <span
                className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? 'bg-[var(--color-action-bg)] text-[var(--color-on-accent)]'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
