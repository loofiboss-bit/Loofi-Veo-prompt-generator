import React, { useState } from 'react';
import Icon from './Icon';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = `collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="border border-slate-700/80 rounded-lg bg-black/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <h3 className="text-md font-semibold text-slate-100">{title}</h3>
        <Icon name="chevron-down" className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={contentId}
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
            <div className="p-4 rounded-b-lg border-t border-slate-700/80">
                {children}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;