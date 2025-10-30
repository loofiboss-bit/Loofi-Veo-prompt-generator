import React, { useState } from 'react';
import Icon from './Icon';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  stepNumber?: number;
  color?: 'cyan' | 'fuchsia';
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = false, stepNumber, color = 'cyan' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = `collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`;

  const colorStyles = {
    cyan: {
      glow: 'shadow-cyan-500/20',
      stepBg: 'bg-cyan-500/10',
      stepBorder: 'border-cyan-500/30',
      stepText: 'text-cyan-400',
      focusRing: 'focus:ring-cyan-500',
    },
    fuchsia: {
      glow: 'shadow-fuchsia-500/20',
      stepBg: 'bg-fuchsia-500/10',
      stepBorder: 'border-fuchsia-500/30',
      stepText: 'text-fuchsia-400',
      focusRing: 'focus:ring-fuchsia-500',
    }
  };

  const C = colorStyles[color];
  const containerGlowClass = isOpen ? `shadow-lg ${C.glow}` : '';


  return (
    <div className={`border border-slate-800 rounded-2xl bg-slate-900/40 transition-shadow duration-300 ${containerGlowClass}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex justify-between items-center p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-t-2xl ${C.focusRing}`}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-4">
            {stepNumber && (
                <div className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center ${C.stepBg} ${C.stepBorder}`}>
                    <span className={`font-bold text-xl ${C.stepText}`}>{stepNumber}</span>
                </div>
            )}
            <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
        </div>
        <Icon name="chevron-down" className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={contentId}
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
            <div className={`rounded-b-lg ${isOpen ? 'border-t border-slate-800' : ''}`}>
                {children}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;