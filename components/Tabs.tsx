
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { KeyboardEvent, useRef, useEffect } from 'react';
import Icon from './Icon';

interface Tab {
  label: string;
  content: React.ReactNode;
  icon?: React.ComponentProps<typeof Icon>['name'];
}

interface TabsProps {
  tabs: Tab[];
  activeTabIndex: number;
  onTabChange: (index: number) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTabIndex, onTabChange }) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, tabs.length);
  }, [tabs]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let newIndex = index;
    if (e.key === 'ArrowRight') {
      newIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      newIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      newIndex = 0;
    } else if (e.key === 'End') {
      newIndex = tabs.length - 1;
    }

    if (newIndex !== index) {
      e.preventDefault();
      onTabChange(newIndex);
      tabRefs.current[newIndex]?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 bg-slate-950/40 backdrop-blur-sm p-1.5 rounded-xl border border-slate-800/60 overflow-x-auto no-scrollbar" role="tablist" aria-label="Prompt sections">
        <div className="flex space-x-1 min-w-max sm:min-w-0">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              id={`tab-${index}`}
              ref={(el) => { tabRefs.current[index] = el; }}
              role="tab"
              type="button"
              aria-selected={activeTabIndex === index}
              aria-controls={`tabpanel-${index}`}
              onClick={() => onTabChange(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              tabIndex={activeTabIndex === index ? 0 : -1}
              className={`flex-1 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 whitespace-nowrap flex items-center justify-center ${
                activeTabIndex === index
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              {tab.icon && (
                  <Icon 
                    name={tab.icon} 
                    className={`w-4 h-4 mr-2 ${activeTabIndex === index ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} 
                  />
              )}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-grow min-h-0 relative pt-4">
        {tabs.map((tab, index) => (
          <div
            key={tab.label}
            id={`tabpanel-${index}`}
            role="tabpanel"
            aria-labelledby={`tab-${index}`}
            hidden={activeTabIndex !== index}
            className={`h-full focus:outline-none transition-opacity duration-300 ${activeTabIndex === index ? 'opacity-100' : 'opacity-0 hidden'}`}
            tabIndex={0}
          >
            {activeTabIndex === index && tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
