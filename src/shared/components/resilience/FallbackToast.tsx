/**
 * FallbackToast — notification toast when a model fallback occurs.
 * Shows briefly when the primary model was unavailable and a fallback was used.
 *
 * @module shared/components/resilience/FallbackToast
 */
import React, { useEffect, useState } from 'react';

interface FallbackToastProps {
  /** The primary model that was attempted */
  primaryModel: string;
  /** The fallback model that was actually used */
  fallbackModel: string;
  /** Auto-dismiss after this many ms (default: 5000) */
  durationMs?: number;
  /** Called when the toast is dismissed */
  onDismiss: () => void;
}

export const FallbackToast: React.FC<FallbackToastProps> = ({
  primaryModel,
  fallbackModel,
  durationMs = 5000,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for exit animation
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm transition-all duration-300
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-900/80 border border-amber-700/50 shadow-xl backdrop-blur-sm">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="w-5 h-5 text-amber-400"
            fill="none"
            viewBox="0 0 20 20"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M10 2l1.5 5H16l-4 3 1.5 5L10 12l-3.5 3 1.5-5-4-3h4.5z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-200">Model Fallback</p>
          <p className="text-xs text-amber-300/70 mt-0.5">
            <span className="line-through">{primaryModel}</span>
            {' → '}
            <span className="font-medium text-amber-200">{fallbackModel}</span>
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="flex-shrink-0 p-0.5 rounded text-amber-400/60 hover:text-amber-300 transition-colors"
          title="Dismiss notification"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 16 16"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
};
