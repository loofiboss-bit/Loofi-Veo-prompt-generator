import React, { memo } from 'react';
import Icon from './Icon';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  stepNumber?: number;
  color?: 'cyan' | 'fuchsia';
  tutorialId?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = memo(
  ({ title, children, isOpen, onToggle, stepNumber, color = 'cyan', tutorialId }) => {
    const contentId = `collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`;

    const colorStyles = {
      cyan: {
        activeBorder: 'border-cyan-500/30',
        numberBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        activeText: 'text-cyan-100',
        shadow: 'shadow-cyan-900/10',
      },
      fuchsia: {
        activeBorder: 'border-fuchsia-500/30',
        numberBg: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
        activeText: 'text-fuchsia-100',
        shadow: 'shadow-fuchsia-900/10',
      },
    };

    const C = colorStyles[color];

    return (
      <div
        data-tutorial-id={tutorialId}
        data-tour-id={tutorialId}
        className={`group rounded-2xl border transition-all duration-300 overflow-hidden ${
          isOpen
            ? `bg-slate-900/70 backdrop-blur-md ${C.activeBorder} shadow-xl ${C.shadow} shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]`
            : 'bg-slate-900/40 backdrop-blur-sm border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/55 shadow-sm'
        }`}
      >
        <button
          onClick={onToggle}
          className="w-full flex justify-between items-center p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset transition-colors"
          aria-expanded={isOpen}
          aria-controls={contentId}
        >
          <div className="flex items-center gap-4">
            {stepNumber && (
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold transition-all shadow-sm ${isOpen ? C.numberBg : 'bg-slate-800/80 text-slate-400 border-slate-700/80 group-hover:border-slate-600'}`}
              >
                {stepNumber}
              </div>
            )}
            <h2
              className={`text-lg font-semibold tracking-tight transition-colors ${isOpen ? 'text-slate-100' : 'text-slate-300 group-hover:text-slate-200'}`}
            >
              {title}
            </h2>
          </div>
          <div
            className={`p-2 rounded-xl transition-all duration-300 ${isOpen ? 'bg-slate-800/90 rotate-180 text-blue-300 shadow-sm' : 'text-slate-500 group-hover:text-slate-300 group-hover:bg-slate-800/50'}`}
          >
            <Icon name="chevron-down" className="w-5 h-5" />
          </div>
        </button>

        <div
          id={contentId}
          className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden">
            <div className="px-5 pb-6 pt-1">{children}</div>
          </div>
        </div>
      </div>
    );
  },
);

CollapsibleSection.displayName = 'CollapsibleSection';

export default CollapsibleSection;
