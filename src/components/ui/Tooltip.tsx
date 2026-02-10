/**
 * Tooltip Component - v1.4.0
 * Reusable tooltip with positioning and animations
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
    content: React.ReactNode;
    position?: TooltipPosition;
    delay?: number;
    children: React.ReactElement;
    disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
    content,
    position = 'top',
    delay = 200,
    children,
    disabled = false,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();

    const showTooltip = () => {
        if (disabled) return;
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    // Calculate tooltip position
    useEffect(() => {
        if (!isVisible || !triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const gap = 8; // Gap between trigger and tooltip

        let top = 0;
        let left = 0;

        switch (position) {
            case 'top':
                top = triggerRect.top - tooltipRect.height - gap;
                left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = triggerRect.bottom + gap;
                left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                left = triggerRect.left - tooltipRect.width - gap;
                break;
            case 'right':
                top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
                left = triggerRect.right + gap;
                break;
        }

        // Keep tooltip within viewport
        const padding = 8;
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

        setCoords({ top, left });
    }, [isVisible, position]);

    // Arrow position classes
    const arrowClasses = {
        top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-slate-700',
        bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-slate-700',
        left: 'right-[-4px] top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-slate-700',
        right: 'left-[-4px] top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-slate-700',
    };

    return (
        <>
            {React.cloneElement(children, {
                ref: triggerRef,
                onMouseEnter: showTooltip,
                onMouseLeave: hideTooltip,
                onFocus: showTooltip,
                onBlur: hideTooltip,
            })}

            {isVisible &&
                createPortal(
                    <div
                        ref={tooltipRef}
                        role="tooltip"
                        className="fixed z-50 animate-fade-in"
                        style={{
                            top: `${coords.top}px`,
                            left: `${coords.left}px`,
                        }}
                    >
                        <div className="relative">
                            <div className="bg-slate-900 dark:bg-slate-700 text-white text-sm px-3 py-2 rounded-lg shadow-lg max-w-xs">
                                {content}
                            </div>
                            {/* Arrow */}
                            <div
                                className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}
                            />
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};

export default Tooltip;
