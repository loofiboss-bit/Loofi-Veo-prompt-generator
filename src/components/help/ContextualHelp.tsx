import React from 'react';
import Tooltip from '../ui/Tooltip';

interface ContextualHelpProps {
    topic: string;
    content: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    onLearnMore?: () => void;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
    topic,
    content,
    placement = 'top',
    onLearnMore,
}) => {
    return (
        <Tooltip
            content={
                <div className="contextual-help-tooltip">
                    <div className="contextual-help-content">{content}</div>
                    {onLearnMore && (
                        <button className="contextual-help-learn-more" onClick={onLearnMore}>
                            Learn more →
                        </button>
                    )}
                </div>
            }
            placement={placement}
        >
            <button className="contextual-help-button" aria-label={`Help: ${topic}`}>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            </button>

            <style>{`
        .contextual-help-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: var(--radius-full);
          color: var(--color-text-tertiary);
          cursor: pointer;
          transition: all var(--transition-fast);
          vertical-align: middle;
        }

        .contextual-help-button:hover {
          color: var(--color-primary-500);
          background: var(--color-primary-50);
        }

        .contextual-help-button:focus {
          outline: 2px solid var(--color-primary-500);
          outline-offset: 2px;
        }

        .contextual-help-tooltip {
          max-width: 300px;
        }

        .contextual-help-content {
          font-size: var(--font-size-sm);
          line-height: 1.5;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-2);
        }

        .contextual-help-learn-more {
          display: inline-flex;
          align-items: center;
          padding: 0;
          background: transparent;
          border: none;
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-primary-500);
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .contextual-help-learn-more:hover {
          color: var(--color-primary-600);
          text-decoration: underline;
        }
      `}</style>
        </Tooltip>
    );
};

export default ContextualHelp;
