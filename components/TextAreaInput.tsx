
import React, { forwardRef } from 'react';
import Tooltip from './Tooltip';
import Icon from './Icon';

interface TextAreaInputProps {
  label: string | React.ReactNode;
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
  onEnhance?: () => void;
  isEnhancing?: boolean;
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
  onEnhance,
  isEnhancing
}, ref) => {
  const id = `textarea-${name}`;
  const hasError = !!error;
  const characterCount = value?.length || 0;

  // More subtle styling for the glass effect, unified with SelectInput
  const baseClasses = `w-full bg-slate-900/60 backdrop-blur-sm border rounded-xl text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 ease-out p-4 resize-y disabled:opacity-50 disabled:cursor-not-allowed text-sm leading-relaxed shadow-sm hover:shadow-md hover:border-slate-500/50 ${onEnhance ? 'pb-10' : ''}`;
  const errorClasses = "border-red-500/50 focus:border-red-500 focus:ring-red-500/20";
  const normalClasses = "border-slate-700/60";
  const actionButtonPadding = actionButton ? actionButtonPaddingClass : "";

  const handleEnhance = (e: React.MouseEvent) => {
      e.preventDefault();
      if(onEnhance) onEnhance();
  };

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={id} className="flex-grow flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wide group-focus-within:text-cyan-400 transition-colors">
            <span className="flex-grow">{label}</span>
            {info && <Tooltip text={info} />}
        </label>
        {maxLength && (
          <span className={`text-[10px] font-medium transition-colors ${characterCount > maxLength ? 'text-red-400' : 'text-slate-600 group-focus-within:text-slate-500'}`}>
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
        {onEnhance && (
            <button
                onClick={handleEnhance}
                disabled={isEnhancing || disabled || !value}
                className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 transition-all shadow-sm backdrop-blur-md group disabled:opacity-50 disabled:cursor-not-allowed"
                title="Magic Enhance (AI)"
            >
                {isEnhancing ? (
                    <Icon name="spinner" className="w-4 h-4 animate-spin" />
                ) : (
                    <div className="flex items-center gap-1.5">
                        <Icon name="sparkles" className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider pr-1">Magic</span>
                    </div>
                )}
            </button>
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
