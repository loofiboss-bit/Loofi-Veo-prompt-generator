/**
 * Select Component - v1.4.0
 * Reusable select dropdown with search and custom styling
 */

import React, { SelectHTMLAttributes, forwardRef } from 'react';

export type SelectSize = 'sm' | 'base' | 'lg';
export type SelectState = 'default' | 'error' | 'success' | 'warning';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    selectSize?: SelectSize;
    state?: SelectState;
    label?: string;
    helperText?: string;
    options: SelectOption[];
    placeholder?: string;
    fullWidth?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            selectSize = 'base',
            state = 'default',
            label,
            helperText,
            options,
            placeholder,
            fullWidth = false,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

        // Base styles
        const baseStyles = `
      rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:opacity-50 disabled:cursor-not-allowed
      appearance-none
      bg-no-repeat
      pr-10
    `;

        // Size styles
        const sizeStyles = {
            sm: 'h-8 px-3 text-sm',
            base: 'h-10 px-4 text-base',
            lg: 'h-12 px-5 text-lg',
        };

        // State styles
        const stateStyles = {
            default: `
        bg-white dark:bg-slate-800
        border border-slate-300 dark:border-slate-700
        text-slate-900 dark:text-slate-100
        hover:border-slate-400 dark:hover:border-slate-600
        focus:ring-blue-500 focus:border-blue-500
      `,
            error: `
        bg-white dark:bg-slate-800
        border border-red-500
        text-slate-900 dark:text-slate-100
        focus:ring-red-500 focus:border-red-500
      `,
            success: `
        bg-white dark:bg-slate-800
        border border-green-500
        text-slate-900 dark:text-slate-100
        focus:ring-green-500 focus:border-green-500
      `,
            warning: `
        bg-white dark:bg-slate-800
        border border-yellow-500
        text-slate-900 dark:text-slate-100
        focus:ring-yellow-500 focus:border-yellow-500
      `,
        };

        // Width styles
        const widthStyles = fullWidth ? 'w-full' : '';

        // Combine all styles
        const combinedStyles = `
      ${baseStyles}
      ${sizeStyles[selectSize]}
      ${stateStyles[state]}
      ${widthStyles}
      ${className}
    `.replace(/\s+/g, ' ').trim();

        // Helper text color
        const helperTextColor = {
            default: 'text-slate-500 dark:text-slate-400',
            error: 'text-red-500',
            success: 'text-green-500',
            warning: 'text-yellow-500',
        };

        return (
            <div className={fullWidth ? 'w-full' : ''}>
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        className={combinedStyles}
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '1.5em 1.5em',
                        }}
                        {...props}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                {helperText && (
                    <p className={`mt-1.5 text-sm ${helperTextColor[state]}`}>
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;
