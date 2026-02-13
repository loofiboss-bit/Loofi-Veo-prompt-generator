import React from 'react';
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

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  isOpen,
  onToggle,
  stepNumber,
  color = 'cyan',
  tutorialId,
}) => {
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
      className={`group rounded-2xl border transition-all duration-300 overflow-hidden ${
        isOpen
          ? `bg-slate-900/60 backdrop-blur-sm ${C.activeBorder} shadow-lg ${C.shadow}`
          : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-5 text-left focus:outline-none focus:bg-slate-800/30 transition-colors"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-4">
          {stepNumber && (
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold transition-colors ${isOpen ? C.numberBg : 'bg-slate-800 text-slate-500 border-slate-700 group-hover:border-slate-600'}`}
            >
              {stepNumber}
            </div>
          )}
          <h2
            className={`text-lg font-semibold transition-colors ${isOpen ? 'text-slate-100' : 'text-slate-300 group-hover:text-slate-200'}`}
          >
            {title}
          </h2>
        </div>
        <div
          className={`p-2 rounded-full transition-all duration-300 ${isOpen ? 'bg-slate-800 rotate-180 text-slate-200' : 'text-slate-600 group-hover:text-slate-400'}`}
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
};

export default CollapsibleSection;
