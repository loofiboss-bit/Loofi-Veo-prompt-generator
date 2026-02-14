/**
 * Button Component — Unified
 * Reusable button with variants, sizes, loading states, and icons.
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'base' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show loading spinner. Alias: isLoading */
  loading?: boolean;
  /** Alias for loading (backwards-compat) */
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'base',
      loading: loadingProp = false,
      isLoading: isLoadingProp = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const loading = loadingProp || isLoadingProp;

    // Base styles
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-lg
      transition-all duration-200
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    `;

    // Variant styles
    const variantStyles = {
      primary: `
        bg-gradient-to-r from-blue-600 to-blue-500
        text-white
        hover:from-blue-700 hover:to-blue-600
        focus-visible:ring-blue-500
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-slate-700 dark:bg-slate-700
        text-white
        hover:bg-slate-600 dark:hover:bg-slate-600
        focus-visible:ring-slate-500
        border border-slate-600
      `,
      tertiary: `
        bg-transparent
        text-slate-700 dark:text-slate-300
        hover:bg-slate-100 dark:hover:bg-slate-800
        focus-visible:ring-slate-500
        border border-slate-300 dark:border-slate-700
      `,
      danger: `
        bg-gradient-to-r from-red-600 to-red-500
        text-white
        hover:from-red-700 hover:to-red-600
        focus-visible:ring-red-500
        shadow-sm hover:shadow-md
      `,
      ghost: `
        bg-transparent
        text-slate-700 dark:text-slate-300
        hover:bg-slate-100 dark:hover:bg-slate-800
        focus-visible:ring-slate-500
      `,
    };

    // Size styles
    const sizeStyles = {
      sm: 'h-8 px-3 text-sm',
      base: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    };

    // Width styles
    const widthStyles = fullWidth ? 'w-full' : '';

    // Combine all styles
    const combinedStyles = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${widthStyles}
      ${className}
    `
      .replace(/\s+/g, ' ')
      .trim();

    return (
      <button ref={ref} className={combinedStyles} disabled={disabled || loading} {...props}>
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
