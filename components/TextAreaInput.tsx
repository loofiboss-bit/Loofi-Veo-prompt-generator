import React, { forwardRef } from 'react';
import Tooltip from './Tooltip';

interface TextAreaInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  error?: string;
  info?: string;
  actionButton?: React.ReactNode;
}

const TextAreaInput = forwardRef<HTMLTextAreaElement, TextAreaInputProps>(({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  maxLength,
  rows = 4,
  error,
  info,
  actionButton,
}, ref) => {
  const id = `textarea-${name}`;
  const hasError = !!error;
  const characterCount = value?.length || 0;

  const baseClasses = "w-full bg-slate-800/60 backdrop-blur-sm border rounded-lg shadow-sm text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 transition duration-150 ease-in-out p-3 resize-y";
  const errorClasses = "border-red-500/80 focus:border-red-500 focus:ring-red-500";
  const normalClasses = "border-slate-700";
  const actionButtonPadding = actionButton ? "pr-12" : "";

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={id} className="flex items-center space-x-2 text-sm font-medium text-slate-300">
            <span>{label}</span>
            {info && <Tooltip text={info} />}
        </label>
        {maxLength && (
          <span className={`text-sm ${characterCount > maxLength ? 'text-red-400' : 'text-slate-400'}`}>
            {characterCount} / {maxLength}
          </span>
        )}
      </div>
      <div className="relative">
        <textarea
          ref={ref}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className={`${baseClasses} ${hasError ? errorClasses : normalClasses} ${actionButtonPadding}`}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
        {actionButton && (
          <div className="absolute top-3 right-3 z-10">
            {actionButton}
          </div>
        )}
      </div>
      {hasError && (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default TextAreaInput;