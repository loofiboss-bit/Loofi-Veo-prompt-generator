import React, { useState } from 'react';
import Icon from './Icon';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = `collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="border border-gray-700 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 bg-gray-900/50 hover:bg-gray-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <h3 className="text-md font-semibold text-gray-100">{title}</h3>
        <Icon name="chevron-down" className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={contentId}
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
            <div className="p-4 bg-gray-800/30 rounded-b-lg border-t border-gray-700">
                {children}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
