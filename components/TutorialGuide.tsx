

import React, { useState, useEffect } from 'react';

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
    uiStrings: any;
}

const TutorialGuide: React.FC<TutorialGuideProps> = ({ isActive, steps, currentStepIndex, onNext, onPrev, onFinish, uiStrings }) => {
    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    
    const currentStep = steps[currentStepIndex];

    useEffect(() => {
        if (!isActive || !currentStep) return;

        const targetElement = document.querySelector(`[data-tutorial-id="${currentStep.targetId}"]`);
        
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const padding = 10;
            
            // Style for the glowing highlight border
            setHighlightStyle({
                position: 'fixed',
                top: `${rect.top - padding / 2}px`,
                left: `${rect.left - padding / 2}px`,
                width: `${rect.width + padding}px`,
                height: `${rect.height + padding}px`,
                border: '2px solid #22d3ee', // cyan-400
                borderRadius: '12px',
                boxShadow: '0 0 12px 2px rgba(34, 211, 238, 0.7)',
                transition: 'all 0.4s ease-in-out',
                pointerEvents: 'none',
                zIndex: 1000,
            });
            
            // Positioning logic for the tooltip
            const newTooltipStyle: React.CSSProperties = {
                position: 'fixed',
                transition: 'all 0.4s ease-in-out',
                zIndex: 1001,
            };
            
            const position = currentStep.position || 'bottom';
            const tooltipWidth = 320; // w-80

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

            // Horizontal boundary checks for top/bottom positions
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
             // Hide if target isn't found
            setHighlightStyle({ display: 'none' });
            setTooltipStyle({ display: 'none' });
        }

    }, [isActive, currentStep, currentStepIndex]);

    if (!isActive || !currentStep) return null;

    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === steps.length - 1;

    return (
        <>
            <div style={highlightStyle} />
            <div
                style={tooltipStyle}
                className="w-80 bg-slate-900/70 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-700/50 p-4 animate-fade-in-up"
                role="dialog"
                aria-modal="false" // It's not a modal anymore, just a guide
            >
                <h3 className="text-lg font-bold text-cyan-400 mb-2">{currentStep.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{currentStep.text}</p>
                <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-300">{currentStepIndex + 1} / {steps.length}</span>
                    <div className="flex items-center gap-2">
                        {!isFirstStep && (
                            <button onClick={onPrev} className="px-3 py-1 text-xs font-semibold rounded-md transition-colors bg-slate-700 text-white hover:bg-slate-600">
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
        </>
    );
};

export default TutorialGuide;