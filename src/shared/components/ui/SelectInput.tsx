import React, { memo } from 'react';
import { SelectOption } from '@core/types';
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

const SelectInput: React.FC<SelectInputProps> = memo(
  ({ label, name, options, value, onChange, onBlur, error, disabled, info, actionButton }) => {
    const id = `select-${name}`;
    const baseClasses =
      'w-full bg-slate-900/60 backdrop-blur-sm border rounded-xl text-slate-100 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 ease-out p-3 pl-4 appearance-none bg-no-repeat bg-right-4 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md hover:border-slate-500/50';
    const errorClasses = 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20';
    const normalClasses = 'border-slate-700/60';
    const actionButtonPadding = actionButton ? 'pr-20' : 'pr-10';

    return (
      <div className="group">
        <label
          htmlFor={id}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide group-focus-within:text-cyan-400 transition-colors"
        >
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
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 1rem center',
              backgroundSize: '1.25em 1.25em',
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-slate-900 text-slate-200 py-2"
              >
                {option.label}
              </option>
            ))}
          </select>
          {actionButton && (
            <div className="absolute top-1/2 right-10 -translate-y-1/2 z-10 border-l border-slate-700/50 pl-2 ml-2 h-6 flex items-center">
              {actionButton}
            </div>
          )}
        </div>
        {error && (
          <p
            id={`${id}-error`}
            className="mt-1.5 text-xs text-red-400 font-medium animate-text-fade-in"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

SelectInput.displayName = 'SelectInput';

export default SelectInput;
