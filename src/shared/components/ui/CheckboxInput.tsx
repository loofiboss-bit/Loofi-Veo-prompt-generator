import React from 'react';
import Tooltip from './Tooltip';

interface CheckboxInputProps {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tooltipText?: string;
  color?: 'cyan' | 'fuchsia';
  disabled?: boolean;
}

const CheckboxInput: React.FC<CheckboxInputProps> = ({
  id,
  name,
  label,
  checked,
  onChange,
  tooltipText,
  color = 'cyan',
  disabled,
}) => {
  const labelContent = (
    <label
      htmlFor={id}
      className={`text-sm font-medium text-slate-200 select-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {label}
    </label>
  );

  const colorClasses = {
    cyan: 'text-cyan-600 focus:ring-cyan-500 focus:shadow-[0_0_10px_rgba(34,211,238,0.5)]',
    fuchsia: 'text-fuchsia-500 focus:ring-fuchsia-500 focus:shadow-[0_0_10px_rgba(217,70,239,0.5)]',
  };

  return (
    <div
      className={`flex items-center space-x-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700 ${disabled ? 'opacity-50' : ''}`}
    >
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`h-4 w-4 rounded border-slate-600 bg-slate-700 ${colorClasses[color]} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} transition-shadow`}
      />
      {tooltipText ? <Tooltip text={tooltipText}>{labelContent}</Tooltip> : labelContent}
    </div>
  );
};

export default CheckboxInput;
