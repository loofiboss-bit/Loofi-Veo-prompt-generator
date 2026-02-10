/**
 * Toggle/Switch Component - v1.4.0
 * Reusable toggle switch with sizes and states
 */

import React, { InputHTMLAttributes, forwardRef } from 'react';

export type ToggleSize = 'sm' | 'base' | 'lg';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    size?: ToggleSize;
    label?: string;
    description?: string;
    onToggle?: (checked: boolean) => void;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
    (
        {
            size = 'base',
            label,
            description,
            checked,
            disabled,
            className = '',
            id,
            onToggle,
            onChange,
            ...props
        },
        ref
    ) => {
        const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

        // Size configurations
        const sizeConfig = {
            sm: {
                track: 'w-9 h-5',
                thumb: 'w-4 h-4',
                translate: 'translate-x-4',
            },
            base: {
                track: 'w-11 h-6',
                thumb: 'w-5 h-5',
                translate: 'translate-x-5',
            },
            lg: {
                track: 'w-14 h-7',
                thumb: 'w-6 h-6',
                translate: 'translate-x-7',
            },
        };

        const config = sizeConfig[size];

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange?.(e);
            onToggle?.(e.target.checked);
        };

        return (
            <div className={`flex items-start gap-3 ${className}`}>
                <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-labelledby={label ? `${toggleId}-label` : undefined}
                    disabled={disabled}
                    onClick={() => {
                        const input = document.getElementById(toggleId) as HTMLInputElement;
                        input?.click();
                    }}
                    className={`
            relative inline-flex items-center
            ${config.track}
            rounded-full
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${checked
                            ? 'bg-blue-600'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }
          `}
                >
                    <span
                        className={`
              ${config.thumb}
              bg-white
              rounded-full
              shadow-md
              transform transition-transform duration-200
              ${checked ? config.translate : 'translate-x-0.5'}
            `}
                    />
                    <input
                        ref={ref}
                        type="checkbox"
                        id={toggleId}
                        checked={checked}
                        disabled={disabled}
                        onChange={handleChange}
                        className="sr-only"
                        {...props}
                    />
                </button>

                {(label || description) && (
                    <div className="flex-1">
                        {label && (
                            <label
                                id={`${toggleId}-label`}
                                htmlFor={toggleId}
                                className={`
                  block font-medium
                  text-slate-900 dark:text-slate-100
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-sm'}
                `}
                            >
                                {label}
                            </label>
                        )}
                        {description && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

Toggle.displayName = 'Toggle';

export default Toggle;
