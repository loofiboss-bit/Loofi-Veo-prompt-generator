import React, { useState } from 'react';

interface ContextualHelpProps {
  topic: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  onLearnMore?: () => void;
  // New props for help panel integration
  topicId?: string;
  category?: string;
  onOpenHelp?: (topicId?: string, category?: string) => void;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  topic,
  content,
  placement = 'top',
  onLearnMore,
  topicId,
  category,
  onOpenHelp,
}) => {
  const [visible, setVisible] = useState(false);

  const handleLearnMore = () => {
    if (onOpenHelp && (topicId || category)) {
      onOpenHelp(topicId, category);
    } else if (onLearnMore) {
      onLearnMore();
    }
  };

  return (
    <>
      <div
        className="contextual-help-wrapper"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
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
        {visible && (
          <div className={`contextual-help-tooltip contextual-help-tooltip--${placement}`}>
            <div className="contextual-help-content">{content}</div>
            {(onLearnMore || onOpenHelp) && (
              <button className="contextual-help-learn-more" onClick={handleLearnMore}>
                Learn more →
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .contextual-help-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

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
          position: absolute;
          z-index: 50;
          max-width: 300px;
          padding: 8px 12px;
          background: var(--color-surface-2, #1e293b);
          border: 1px solid var(--color-border, rgba(255,255,255,0.1));
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          white-space: normal;
        }

        .contextual-help-tooltip--top {
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
        }

        .contextual-help-tooltip--bottom {
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
        }

        .contextual-help-tooltip--left {
          right: calc(100% + 8px);
          top: 50%;
          transform: translateY(-50%);
        }

        .contextual-help-tooltip--right {
          left: calc(100% + 8px);
          top: 50%;
          transform: translateY(-50%);
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
    </>
  );
};

export default ContextualHelp;
