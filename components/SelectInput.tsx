
import React from 'react';
import { SelectOption } from '../types';
import Tooltip from './Tooltip';

interface SelectInputProps {
  label: string | React.ReactNode;
  name: string;
  options: SelectOption[];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLSelectElement>) => void;
  error?: string;
  disabled?: boolean;
  info?: string;
  actionButton?: React.ReactNode;
}

const SelectInput: React.FC<SelectInputProps> = ({ label, name, options, value, onChange, onBlur, error, disabled, info, actionButton }) => {
  const id = `select-${name}`;
  const baseClasses = "w-full bg-slate-800/60 backdrop-blur-sm border rounded-lg shadow-sm text-slate-100 focus:ring-cyan-500 focus:border-cyan-500 focus:shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all duration-150 ease-in-out p-3 appearance-none bg-no-repeat bg-right-4 disabled:opacity-50 disabled:cursor-not-allowed";
  const errorClasses = "border-red-500/80 focus:border-red-500 focus:ring-red-500";
  const normalClasses = "border-slate-700";
  const actionButtonPadding = actionButton ? "pr-20" : "";

  return (
    <div>
      <label htmlFor={id} className="flex items-center space-x-2 text-sm font-medium text-slate-200 mb-2">
        <span className="flex items-center gap-2">{label}</span>
        {info && <Tooltip text={info} />}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`${baseClasses} ${error ? errorClasses : normalClasses} ${actionButtonPadding}`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23cbd5e1' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '1.25em 1.25em',
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-900 text-slate-200">
              {option.label}
            </option>
          ))}
        </select>
        {actionButton && (
            <div className="absolute top-1/2 right-12 -translate-y-1/2 z-10">
                {actionButton}
            </div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-400 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default SelectInput;
