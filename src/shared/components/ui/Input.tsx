/**
 * Input Component - v1.4.0
 * Reusable input with validation states and variants
 */

import React, { InputHTMLAttributes, forwardRef } from 'react';

export type InputVariant = 'default' | 'filled';
export type InputSize = 'sm' | 'base' | 'lg';
export type InputState = 'default' | 'error' | 'success' | 'warning';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  inputSize?: InputSize;
  state?: InputState;
  label?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      inputSize = 'base',
      state = 'default',
      label,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    // Base styles
    const baseStyles = `
      rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    // Variant styles
    const variantStyles = {
      default: `
        bg-transparent
        border border-slate-300 dark:border-slate-700
        text-slate-900 dark:text-slate-100
        placeholder-slate-400 dark:placeholder-slate-500
        hover:border-slate-400 dark:hover:border-slate-600
      `,
      filled: `
        bg-slate-100 dark:bg-slate-800
        border border-transparent
        text-slate-900 dark:text-slate-100
        placeholder-slate-400 dark:placeholder-slate-500
        hover:bg-slate-200 dark:hover:bg-slate-700
      `,
    };

    // Size styles
    const sizeStyles = {
      sm: 'h-8 px-3 text-sm',
      base: 'h-10 px-4 text-base',
      lg: 'h-12 px-5 text-lg',
    };

    // State styles
    const stateStyles = {
      default: 'focus:ring-blue-500 focus:border-blue-500',
      error: 'border-red-500 focus:ring-red-500 focus:border-red-500',
      success: 'border-green-500 focus:ring-green-500 focus:border-green-500',
      warning: 'border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500',
    };

    // Icon padding
    const iconPadding = {
      left: leftIcon ? 'pl-10' : '',
      right: rightIcon ? 'pr-10' : '',
    };

    // Width styles
    const widthStyles = fullWidth ? 'w-full' : '';

    // Combine all styles
    const combinedStyles = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[inputSize]}
      ${stateStyles[state]}
      ${iconPadding.left}
      ${iconPadding.right}
      ${widthStyles}
      ${className}
    `
      .replace(/\s+/g, ' ')
      .trim();

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
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}
          <input ref={ref} id={inputId} className={combinedStyles} {...props} />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          )}
        </div>
        {helperText && <p className={`mt-1.5 text-sm ${helperTextColor[state]}`}>{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
