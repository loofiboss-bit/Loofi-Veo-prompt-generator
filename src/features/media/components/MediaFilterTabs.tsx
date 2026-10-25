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
      className={`flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-slate-800 text-xs ${className}`}
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
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {opt.label}
            {count !== undefined && count > 0 && (
              <span
                className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-blue-700/80 text-white' : 'bg-slate-800 text-slate-400'
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
