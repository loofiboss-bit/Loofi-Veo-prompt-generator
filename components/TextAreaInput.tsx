
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
  actionButtonPaddingClass?: string;
  disabled?: boolean;
  autoFocus?: boolean;
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
  actionButtonPaddingClass = 'pr-12',
  disabled,
  autoFocus,
}, ref) => {
  const id = `textarea-${name}`;
  const hasError = !!error;
  const characterCount = value?.length || 0;

  // More subtle styling for the glass effect
  const baseClasses = "w-full bg-slate-950/30 border rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200 ease-out p-4 resize-y disabled:opacity-50 disabled:cursor-not-allowed text-sm leading-relaxed";
  const errorClasses = "border-red-500/50 focus:border-red-500 focus:ring-red-500/20";
  const normalClasses = "border-slate-700/50 hover:border-slate-600";
  const actionButtonPadding = actionButton ? actionButtonPaddingClass : "";

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={id} className="flex items-center space-x-2 text-xs font-semibold text-slate-300 uppercase tracking-wide group-focus-within:text-cyan-400 transition-colors">
            <span>{label}</span>
            {info && <Tooltip text={info} />}
        </label>
        {maxLength && (
          <span className={`text-[10px] font-medium ${characterCount > maxLength ? 'text-red-400' : 'text-slate-500'}`}>
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
          disabled={disabled}
          autoFocus={autoFocus}
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
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-400 font-medium animate-text-fade-in" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default TextAreaInput;
