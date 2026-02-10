/**
 * Radio Component - v1.4.0
 * Reusable radio button with sizes and states
 */

import React, { InputHTMLAttributes, forwardRef } from 'react';

export type RadioSize = 'sm' | 'base' | 'lg';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    size?: RadioSize;
    label?: string;
    description?: string;
    error?: boolean;
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
    (
        {
            size = 'base',
            label,
            description,
            error = false,
            checked,
            disabled,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

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

        return (
            <div className={`flex items-start gap-3 ${className}`}>
                <div className="flex items-center h-6">
                    <input
                        ref={ref}
                        type="radio"
                        id={radioId}
                        checked={checked}
                        disabled={disabled}
                        className={`
              ${sizeConfig[size]}
              rounded-full
              border-2
              transition-all duration-200
              focus:ring-2 focus:ring-offset-0
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error
                                ? 'border-red-500 text-red-600 focus:ring-red-500'
                                : 'border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500'
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
                                htmlFor={radioId}
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

Radio.displayName = 'Radio';

export default Radio;

// RadioGroup component for managing multiple radio buttons
export interface RadioGroupProps {
    name: string;
    value?: string;
    onChange?: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
    name,
    value,
    onChange,
    children,
    className = '',
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e.target.value);
    };

    return (
        <div className={`space-y-3 ${className}`} role="radiogroup">
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child) && child.type === Radio) {
                    return React.cloneElement(child as React.ReactElement<RadioProps>, {
                        name,
                        checked: child.props.value === value,
                        onChange: handleChange,
                    });
                }
                return child;
            })}
        </div>
    );
};
