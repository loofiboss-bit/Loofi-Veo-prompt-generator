import React from 'react';

interface TextAreaInputProps {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  name: string;
  rows?: number;
  error?: string | null;
  maxLength?: number;
  disabled?: boolean;
}

const TextAreaInput = React.forwardRef<HTMLTextAreaElement, TextAreaInputProps>(
  ({ label, value, onChange, onBlur, placeholder, name, rows = 3, error = null, maxLength, disabled = false }, ref) => {
    const id = `textarea-${name}`;

    const remaining = maxLength != null ? maxLength - value.length : null;
    const isOverLimit = remaining != null && remaining < 0;

    const counterColor =
      isOverLimit
        ? 'text-red-400'
        : remaining != null && remaining <= 20
        ? 'text-yellow-400'
        : 'text-gray-400';

    const borderClasses =
      error || isOverLimit
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-600 focus:border-purple-500 focus:ring-purple-500';
    
    const describedBy = [
        error ? `${id}-error` : null,
        maxLength != null ? `${id}-counter` : null
    ].filter(Boolean).join(' ');

    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
        <div className="relative">
          <textarea
            id={id}
            name={name}
            rows={rows}
            className={`w-full bg-gray-900/50 border rounded-lg shadow-sm text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out p-3 resize-y ${borderClasses} disabled:bg-gray-800/50 disabled:cursor-not-allowed disabled:text-gray-400`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            ref={ref}
            aria-invalid={!!error || isOverLimit}
            aria-describedby={describedBy || undefined}
            disabled={disabled}
          />
        </div>
        {(maxLength != null || error) && (
          <div className="flex justify-between items-start mt-2 min-h-[1.25rem]">
            {error ? (
              <p id={`${id}-error`} className="text-sm text-red-400 flex-1 pr-4" role="alert">
                {error}
              </p>
            ) : <div />}
            {maxLength != null && (
              <p id={`${id}-counter`} className={`text-xs text-right select-none flex-shrink-0 ${counterColor}`}>
                {isOverLimit ? `${Math.abs(remaining)} characters over limit` : `${remaining} characters remaining`}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

export default TextAreaInput;