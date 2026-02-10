/**
 * Badge Component - v1.4.0
 * Reusable badge for status indicators and labels
 */

import React, { HTMLAttributes } from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'base' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    size?: BadgeSize;
    dot?: boolean;
    removable?: boolean;
    onRemove?: () => void;
}

const Badge: React.FC<BadgeProps> = ({
    variant = 'default',
    size = 'base',
    dot = false,
    removable = false,
    onRemove,
    className = '',
    children,
    ...props
}) => {
    // Base styles
    const baseStyles = `
    inline-flex items-center gap-1.5
    font-medium rounded-full
    transition-colors duration-200
  `;

    // Variant styles
    const variantStyles = {
        default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        info: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
    };

    // Size styles
    const sizeStyles = {
        sm: 'px-2 py-0.5 text-xs',
        base: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
    };

    // Dot color
    const dotColors = {
        default: 'bg-slate-500',
        primary: 'bg-blue-500',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        error: 'bg-red-500',
        info: 'bg-cyan-500',
    };

    // Combine all styles
    const combinedStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
  `.replace(/\s+/g, ' ').trim();

    return (
        <span className={combinedStyles} {...props}>
            {dot && (
                <span
                    className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`}
                    aria-hidden="true"
                />
            )}
            {children}
            {removable && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                    aria-label="Remove badge"
                >
                    <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            )}
        </span>
    );
};

export default Badge;
