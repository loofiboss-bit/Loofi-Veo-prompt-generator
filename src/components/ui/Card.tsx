/**
 * Card Component - v1.4.0
 * Reusable card with hover effects and variants
 */

import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'bordered' | 'elevated';
    hoverable?: boolean;
    padding?: 'none' | 'sm' | 'base' | 'lg';
}

const Card: React.FC<CardProps> = ({
    variant = 'default',
    hoverable = false,
    padding = 'base',
    className = '',
    children,
    ...props
}) => {
    // Base styles
    const baseStyles = 'rounded-xl transition-all duration-200';

    // Variant styles
    const variantStyles = {
        default: 'bg-white dark:bg-slate-900',
        bordered: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
        elevated: 'bg-white dark:bg-slate-900 shadow-md',
    };

    // Padding styles
    const paddingStyles = {
        none: '',
        sm: 'p-4',
        base: 'p-6',
        lg: 'p-8',
    };

    // Hover styles
    const hoverStyles = hoverable
        ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer'
        : '';

    // Combine all styles
    const combinedStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    ${hoverStyles}
    ${className}
  `.replace(/\s+/g, ' ').trim();

    return (
        <div className={combinedStyles} {...props}>
            {children}
        </div>
    );
};

// Card subcomponents
export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({
    className = '',
    children,
    ...props
}) => (
    <div
        className={`mb-4 ${className}`}
        {...props}
    >
        {children}
    </div>
);

export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({
    className = '',
    children,
    ...props
}) => (
    <h3
        className={`text-lg font-semibold text-slate-900 dark:text-slate-100 ${className}`}
        {...props}
    >
        {children}
    </h3>
);

export const CardDescription: React.FC<HTMLAttributes<HTMLParagraphElement>> = ({
    className = '',
    children,
    ...props
}) => (
    <p
        className={`text-sm text-slate-600 dark:text-slate-400 ${className}`}
        {...props}
    >
        {children}
    </p>
);

export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({
    className = '',
    children,
    ...props
}) => (
    <div className={className} {...props}>
        {children}
    </div>
);

export const CardFooter: React.FC<HTMLAttributes<HTMLDivElement>> = ({
    className = '',
    children,
    ...props
}) => (
    <div
        className={`mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 ${className}`}
        {...props}
    >
        {children}
    </div>
);

export default Card;
