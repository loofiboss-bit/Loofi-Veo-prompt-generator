import React, { ReactNode } from 'react';
import Button from './Button';

export interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    secondaryAction,
    className = '',
}) => {
    const defaultIcon = (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
        </svg>
    );

    return (
        <div className={`empty-state ${className}`}>
            <div className="empty-state-icon animate-fade-in-up">
                {icon || defaultIcon}
            </div>

            <h3 className="empty-state-title animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                {title}
            </h3>

            {description && (
                <p className="empty-state-description animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    {description}
                </p>
            )}

            {(action || secondaryAction) && (
                <div className="empty-state-actions animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    {action && (
                        <Button variant="primary" onClick={action.onClick}>
                            {action.label}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button variant="ghost" onClick={secondaryAction.onClick}>
                            {secondaryAction.label}
                        </Button>
                    )}
                </div>
            )}

            <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-12) var(--spacing-6);
          text-align: center;
          min-height: 300px;
        }

        .empty-state-icon {
          margin-bottom: var(--spacing-6);
          color: var(--color-text-tertiary);
          opacity: 0.5;
        }

        .empty-state-icon svg {
          width: 64px;
          height: 64px;
        }

        .empty-state-title {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-3);
        }

        .empty-state-description {
          font-size: var(--font-size-base);
          color: var(--color-text-secondary);
          max-width: 400px;
          line-height: 1.6;
          margin-bottom: var(--spacing-6);
        }

        .empty-state-actions {
          display: flex;
          gap: var(--spacing-3);
          flex-wrap: wrap;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .empty-state {
            padding: var(--spacing-8) var(--spacing-4);
          }

          .empty-state-icon svg {
            width: 48px;
            height: 48px;
          }

          .empty-state-title {
            font-size: var(--font-size-lg);
          }

          .empty-state-actions {
            flex-direction: column;
            width: 100%;
          }

          .empty-state-actions button {
            width: 100%;
          }
        }
      `}</style>
        </div>
    );
};

// Preset empty states for common scenarios
export const EmptyProjects: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
    <EmptyState
        icon={
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
        }
        title="No projects yet"
        description="Get started by creating your first project to organize your prompts."
        action={{ label: 'Create Project', onClick: onCreate }}
    />
);

export const EmptyPrompts: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
    <EmptyState
        icon={
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
        }
        title="No prompts yet"
        description="Create your first AI video prompt to get started."
        action={{ label: 'New Prompt', onClick: onCreate }}
    />
);

export const EmptySearch: React.FC<{ query: string; onClear: () => void }> = ({ query, onClear }) => (
    <EmptyState
        icon={
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
            </svg>
        }
        title="No results found"
        description={`We couldn't find anything matching "${query}". Try different keywords or clear your search.`}
        action={{ label: 'Clear Search', onClick: onClear }}
    />
);

export const EmptyTemplates: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
    <EmptyState
        icon={
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
            </svg>
        }
        title="No templates yet"
        description="Create reusable templates to speed up your workflow."
        action={{ label: 'Create Template', onClick: onCreate }}
    />
);

export default EmptyState;
