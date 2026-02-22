import React, { memo } from 'react';

export interface EmptyStateProps {
  /** Icon name or emoji shown above the title. */
  icon?: string;
  /** Main heading. */
  title: string;
  /** Supporting description text. */
  description?: string;
  /** Optional CTA button label. */
  actionLabel?: string;
  /** Callback fired when the CTA is clicked. */
  onAction?: () => void;
  /** Additional className on the wrapper */
  className?: string;
}

/**
 * Shared empty-state placeholder used across studios, panels, and lists
 * when there is no data to display.
 *
 * Design goals:
 * - Consistent look & feel across the entire product
 * - Subtle animation to feel alive
 * - Configurable icon, copy, and CTA
 *
 * Styles live in `shared/styles/animations.css`.
 */
const EmptyState: React.FC<EmptyStateProps> = memo(
  ({ icon = '📭', title, description, actionLabel, onAction, className = '' }) => (
    <div className={`empty-state ${className}`} role="status" aria-label={title}>
      <span className="empty-state-icon" aria-hidden="true">
        {icon}
      </span>

      <h3 className="empty-state-title">{title}</h3>

      {description && <p className="empty-state-desc">{description}</p>}

      {actionLabel && onAction && (
        <button type="button" className="empty-state-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  ),
);

EmptyState.displayName = 'EmptyState';

export default EmptyState;
