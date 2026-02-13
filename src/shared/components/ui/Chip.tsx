import React from 'react';
import Icon from './Icon';

interface ChipProps {
  label: string;
  onClick: () => void;
  iconName?: React.ComponentProps<typeof Icon>['name'];
  disabled?: boolean;
  className?: string;
}

const Chip: React.FC<ChipProps> = ({ label, onClick, iconName, disabled, className }) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${className || ''}`}
    >
      {iconName && (
        <Icon name={iconName} className="w-3 h-3 mr-1.5 opacity-70 group-hover:opacity-100" />
      )}
      {label}
    </button>
  );
};

export default Chip;
