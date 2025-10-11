import React from 'react';
import Tooltip from './Tooltip';

interface TextAreaInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  maxLength?: number;
  tooltipText?: string;
  rows?: number;
  error?: string;
  actionButton?: React.ReactNode;
}

const TextAreaInput: React.FC<TextAreaInputProps> = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  maxLength,
  tooltipText,
  rows = 4,
  error,
  actionButton,
}) => {
  const id = `textarea-${name}`;
  const characterCount = value ? value.length : 0;
  const isOverLimit = maxLength ? characterCount > maxLength : false;

  const baseClasses = "w-full bg-slate-800/60 backdrop-blur-sm border rounded-lg shadow-sm text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 transition duration-150 ease-in-out p-3 resize-y";
  const errorClasses = "border-red-500/80 focus:border-red-500 focus:ring-red-500";
  const normalClasses = "border-slate-700";

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <label htmlFor={id} className="block text-sm font-medium text-slate-300">
            {label}
          </label>
          {tooltipText && <Tooltip text={tooltipText} />}
          {actionButton}
        </div>
        {maxLength && (
          <span className={`text-xs ${isOverLimit ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
            {characterCount}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={`${baseClasses} ${error ? errorClasses : normalClasses}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default TextAreaInput;