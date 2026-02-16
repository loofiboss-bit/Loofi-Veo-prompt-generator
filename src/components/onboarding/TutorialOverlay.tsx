import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOnboarding } from '@shared/contexts/OnboardingContext';
import { getTutorialStep, getTotalSteps } from '@infrastructure/database/migrations/tutorialSteps';
import Button from '@shared/components/ui/Button';

export const TutorialOverlay: React.FC = () => {
  const { state, nextStep, previousStep, skipTutorial } = useOnboarding();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = getTutorialStep(state.tutorialStep, state.tutorialFlow);
  const totalSteps = getTotalSteps(state.tutorialFlow);

  useEffect(() => {
    if (!state.tutorialActive || !currentStep) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(currentStep.targetSelector);

      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setTargetRect(rect);

        // Calculate tooltip position based on placement
        if (tooltipRef.current) {
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          let top = 0;
          let left = 0;

          switch (currentStep.placement) {
            case 'top':
              top = rect.top - tooltipRect.height - 16;
              left = rect.left + rect.width / 2 - tooltipRect.width / 2;
              break;
            case 'bottom':
              top = rect.bottom + 16;
              left = rect.left + rect.width / 2 - tooltipRect.width / 2;
              break;
            case 'left':
              top = rect.top + rect.height / 2 - tooltipRect.height / 2;
              left = rect.left - tooltipRect.width - 16;
              break;
            case 'right':
              top = rect.top + rect.height / 2 - tooltipRect.height / 2;
              left = rect.right + 16;
              break;
            case 'center':
              top = window.innerHeight / 2 - tooltipRect.height / 2;
              left = window.innerWidth / 2 - tooltipRect.width / 2;
              break;
          }

          // Ensure tooltip stays within viewport
          top = Math.max(16, Math.min(top, window.innerHeight - tooltipRect.height - 16));
          left = Math.max(16, Math.min(left, window.innerWidth - tooltipRect.width - 16));

          setTooltipPosition({ top, left });
        }
      } else {
        // If target not found, center the tooltip
        if (tooltipRef.current) {
          const tooltipRect = tooltipRef.current.getBoundingClientRect();
          setTooltipPosition({
            top: window.innerHeight / 2 - tooltipRect.height / 2,
            left: window.innerWidth / 2 - tooltipRect.width / 2,
          });
        }
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [state.tutorialActive, state.tutorialStep, currentStep]);

  if (!state.tutorialActive || !currentStep) return null;

  const handleNext = () => {
    if (currentStep.action) {
      currentStep.action();
    }
    nextStep();
  };

  return createPortal(
    <div className="tutorial-overlay">
      {/* Backdrop with spotlight */}
      <div className="tutorial-backdrop">
        {targetRect && currentStep.placement !== 'center' && (
          <div
            className="tutorial-spotlight"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="tutorial-tooltip animate-fade-in-up"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Progress indicator */}
        <div className="tutorial-progress">
          <span className="tutorial-step-count">
            Step {state.tutorialStep} of {totalSteps}
          </span>
          <div className="tutorial-progress-bar">
            <div
              className="tutorial-progress-fill"
              style={{ width: `${(state.tutorialStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="tutorial-content">
          <h3 className="tutorial-title">{currentStep.title}</h3>
          <p className="tutorial-description">{currentStep.description}</p>
        </div>

        {/* Actions */}
        <div className="tutorial-actions">
          {state.tutorialStep > 1 && (
            <Button variant="ghost" size="sm" onClick={previousStep}>
              Previous
            </Button>
          )}

          <div className="tutorial-actions-right">
            {currentStep.skipable && (
              <Button variant="ghost" size="sm" onClick={skipTutorial}>
                Skip Tour
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleNext}>
              {state.tutorialStep === totalSteps ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>

        {/* Arrow pointing to target */}
        {targetRect && currentStep.placement !== 'center' && (
          <div className={`tutorial-arrow tutorial-arrow-${currentStep.placement}`} />
        )}
      </div>

      <style>{`
        .tutorial-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: var(--z-tutorial);
          pointer-events: none;
        }

        .tutorial-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(2px);
          animation: fade-in var(--transition-base);
        }

        .tutorial-spotlight {
          position: absolute;
          background: transparent;
          border-radius: var(--radius-lg);
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
          transition: all var(--transition-base);
          pointer-events: auto;
        }

        .tutorial-tooltip {
          position: absolute;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          padding: var(--spacing-6);
          max-width: 400px;
          pointer-events: auto;
          z-index: 1;
        }

        .tutorial-progress {
          margin-bottom: var(--spacing-4);
        }

        .tutorial-step-count {
          display: block;
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-2);
        }

        .tutorial-progress-bar {
          height: 4px;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .tutorial-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary-500), var(--color-accent-500));
          transition: width var(--transition-base);
        }

        .tutorial-content {
          margin-bottom: var(--spacing-6);
        }

        .tutorial-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-2);
        }

        .tutorial-description {
          font-size: var(--font-size-base);
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .tutorial-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--spacing-3);
        }

        .tutorial-actions-right {
          display: flex;
          gap: var(--spacing-3);
          margin-left: auto;
        }

        .tutorial-arrow {
          position: absolute;
          width: 0;
          height: 0;
          border: 8px solid transparent;
        }

        .tutorial-arrow-top {
          bottom: -16px;
          left: 50%;
          transform: translateX(-50%);
          border-top-color: var(--color-bg-primary);
        }

        .tutorial-arrow-bottom {
          top: -16px;
          left: 50%;
          transform: translateX(-50%);
          border-bottom-color: var(--color-bg-primary);
        }

        .tutorial-arrow-left {
          right: -16px;
          top: 50%;
          transform: translateY(-50%);
          border-left-color: var(--color-bg-primary);
        }

        .tutorial-arrow-right {
          left: -16px;
          top: 50%;
          transform: translateY(-50%);
          border-right-color: var(--color-bg-primary);
        }

        @media (max-width: 768px) {
          .tutorial-tooltip {
            max-width: calc(100vw - 32px);
            padding: var(--spacing-4);
          }

          .tutorial-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .tutorial-actions-right {
            margin-left: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>,
    document.body,
  );
};

export default TutorialOverlay;
