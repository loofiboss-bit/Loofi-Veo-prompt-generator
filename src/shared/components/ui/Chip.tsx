import React, { memo } from 'react';
import Icon from './Icon';

interface ChipProps {
  label: string;
  onClick: () => void;
  iconName?: React.ComponentProps<typeof Icon>['name'];
  disabled?: boolean;
  className?: string;
}

const Chip: React.FC<ChipProps> = memo(({ label, onClick, iconName, disabled, className }) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      className={`group inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-slate-800/80 backdrop-blur-sm border border-slate-700/80 hover:bg-slate-700/90 text-slate-300 hover:text-blue-300 hover:border-blue-500/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 ${className || ''}`}
    >
      {iconName && (
        <Icon name={iconName} className="w-3 h-3 mr-1.5 opacity-70 group-hover:opacity-100" />
      )}
      {label}
    </button>
  );
});

Chip.displayName = 'Chip';

export default Chip;
