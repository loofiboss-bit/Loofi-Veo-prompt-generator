/**
 * Checkbox Component - v1.4.0
 * Reusable checkbox with sizes and states
 */

import React, { InputHTMLAttributes, forwardRef } from 'react';

export type CheckboxSize = 'sm' | 'base' | 'lg';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    size?: CheckboxSize;
    label?: string;
    description?: string;
    error?: boolean;
    indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    (
        {
            size = 'base',
            label,
            description,
            error = false,
            indeterminate = false,
            checked,
            disabled,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

        // Size configurations
        const sizeConfig = {
            sm: 'w-4 h-4',
            base: 'w-5 h-5',
            lg: 'w-6 h-6',
        };

        const labelSizeConfig = {
            sm: 'text-sm',
            base: 'text-base',
            lg: 'text-lg',
        };

        // Set indeterminate state
        React.useEffect(() => {
            if (ref && 'current' in ref && ref.current) {
                ref.current.indeterminate = indeterminate;
            }
        }, [ref, indeterminate]);

        return (
            <div className={`flex items-start gap-3 ${className}`}>
                <div className="flex items-center h-6">
                    <input
                        ref={ref}
                        type="checkbox"
                        id={checkboxId}
                        checked={checked}
                        disabled={disabled}
                        className={`
              ${sizeConfig[size]}
              rounded
              border-2
              transition-all duration-200
              focus:ring-2 focus:ring-offset-0
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error
                                ? 'border-red-500 text-red-600 focus:ring-red-500'
                                : 'border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500'
                            }
              ${checked || indeterminate
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-transparent'
                            }
              cursor-pointer
            `}
                        {...props}
                    />
                </div>

                {(label || description) && (
                    <div className="flex-1">
                        {label && (
                            <label
                                htmlFor={checkboxId}
                                className={`
                  block font-medium
                  ${labelSizeConfig[size]}
                  ${error ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                            >
                                {label}
                            </label>
                        )}
                        {description && (
                            <p className={`mt-1 text-sm ${error ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                {description}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
