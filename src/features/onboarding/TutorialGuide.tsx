/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useRef } from 'react';

interface TutorialStep {
  targetId: string;
  title: string;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialGuideProps {
  isActive: boolean;
  steps: TutorialStep[];
  currentStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uiStrings: any;
}

const TutorialGuide: React.FC<TutorialGuideProps> = ({
  isActive,
  steps,
  currentStepIndex,
  onNext,
  onPrev,
  onFinish,
  uiStrings,
}) => {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ display: 'none' });
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom' | 'left' | 'right'>(
    'bottom',
  );
  const activeElementRef = useRef<Element | null>(null);

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    // Cleanup previous highlight when step changes or guide is closed
    if (activeElementRef.current) {
      activeElementRef.current.removeAttribute('data-tutorial-active');
      activeElementRef.current = null;
    }

    if (!isActive || !currentStep) {
      setTooltipStyle({ display: 'none' });
      return;
    }

    // Handle the centered modal case which has no target element
    if (currentStep.targetId === 'center-modal') {
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
      });
      setTooltipPosition('bottom'); // Default for no target
      return;
    }

    const targetElement = document.querySelector(`[data-tutorial-id="${currentStep.targetId}"]`);

    if (targetElement) {
      // Apply highlight attribute to the new target
      targetElement.setAttribute('data-tutorial-active', 'true');
      activeElementRef.current = targetElement;

      const rect = targetElement.getBoundingClientRect();
      const padding = 16; // Extra space for the tooltip's tail

      const newTooltipStyle: React.CSSProperties = {
        position: 'fixed',
        transition: 'all 0.4s ease-in-out',
        zIndex: 1001,
      };

      const position = currentStep.position || 'bottom';
      setTooltipPosition(position);
      const tooltipWidth = 320; // Corresponds to w-80 in Tailwind

      switch (position) {
        case 'top':
          newTooltipStyle.bottom = `${window.innerHeight - rect.top + padding}px`;
          newTooltipStyle.left = `${rect.left + rect.width / 2}px`;
          newTooltipStyle.transform = 'translateX(-50%)';
          break;
        case 'bottom':
          newTooltipStyle.top = `${rect.bottom + padding}px`;
          newTooltipStyle.left = `${rect.left + rect.width / 2}px`;
          newTooltipStyle.transform = 'translateX(-50%)';
          break;
        case 'left':
          newTooltipStyle.top = `${rect.top + rect.height / 2}px`;
          newTooltipStyle.right = `${window.innerWidth - rect.left + padding}px`;
          newTooltipStyle.transform = 'translateY(-50%)';
          break;
        case 'right':
          newTooltipStyle.top = `${rect.top + rect.height / 2}px`;
          newTooltipStyle.left = `${rect.right + padding}px`;
          newTooltipStyle.transform = 'translateY(-50%)';
          break;
      }

      // Boundary checks to prevent the tooltip from going off-screen
      if (position === 'top' || position === 'bottom') {
        const leftPos = rect.left + rect.width / 2 - tooltipWidth / 2;
        if (leftPos < padding) {
          newTooltipStyle.left = `${padding}px`;
          newTooltipStyle.transform = 'translateX(0)';
        } else if (leftPos + tooltipWidth > window.innerWidth - padding) {
          newTooltipStyle.left = 'auto';
          newTooltipStyle.right = `${padding}px`;
          newTooltipStyle.transform = 'translateX(0)';
        }
      }

      setTooltipStyle(newTooltipStyle);
    } else {
      // If target isn't found, hide the tooltip
      setTooltipStyle({ display: 'none' });
    }

    // Final cleanup when the component unmounts or isActive becomes false
    return () => {
      if (activeElementRef.current) {
        activeElementRef.current.removeAttribute('data-tutorial-active');
      }
    };
  }, [isActive, currentStep, currentStepIndex]);

  if (!isActive || !currentStep) return null;

  // Generates the correct CSS classes for the tooltip's directional "tail"
  const getTailClass = () => {
    const base = 'absolute w-0 h-0 border-[8px] border-transparent';
    if (currentStep.targetId === 'center-modal') return '';

    switch (tooltipPosition) {
      case 'top':
        return `${base} left-1/2 -translate-x-1/2 bottom-[-16px] border-t-slate-800`;
      case 'bottom':
        return `${base} left-1/2 -translate-x-1/2 top-[-16px] border-b-slate-800`;
      case 'left':
        return `${base} top-1/2 -translate-y-1/2 right-[-16px] border-l-slate-800`;
      case 'right':
        return `${base} top-1/2 -translate-y-1/2 left-[-16px] border-r-slate-800`;
      default:
        return '';
    }
  };

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div
      style={tooltipStyle}
      className="w-80 bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-700 p-4 animate-fade-in-up"
      role="dialog"
      aria-modal="true"
    >
      <div className={getTailClass()} />
      <h3 className="text-lg font-bold text-cyan-400 mb-2">{currentStep.title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed">{currentStep.text}</p>
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-slate-300">
          {currentStepIndex + 1} / {steps.length}
        </span>
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <button
              onClick={onPrev}
              className="px-3 py-1 text-xs font-semibold rounded-md transition-colors bg-slate-700 text-white hover:bg-slate-600"
            >
              {uiStrings.prevButton}
            </button>
          )}
          <button
            onClick={isLastStep ? onFinish : onNext}
            className="px-3 py-1 text-xs font-semibold rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500"
          >
            {isLastStep ? uiStrings.finishButton : uiStrings.nextButton}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialGuide;
