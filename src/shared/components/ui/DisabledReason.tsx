import type { ReactNode } from 'react';

interface DisabledReasonProps {
  reason?: string;
  disabled?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}

export function DisabledReason({
  reason,
  disabled = false,
  actionLabel,
  onAction,
  children,
  className = '',
}: DisabledReasonProps) {
  if (!disabled || !reason) {
    return <>{children}</>;
  }

  return (
    <div className={`group relative inline-flex flex-col items-start ${className}`}>
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden max-w-xs rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200 shadow-xl group-hover:pointer-events-auto group-hover:block group-focus-within:pointer-events-auto group-focus-within:block"
      >
        <p>{reason}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className="mt-1 cursor-pointer text-xs font-medium text-blue-400 underline hover:text-blue-300"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
