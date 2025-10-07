import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';

interface Tab {
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
}

const Tabs: React.FC<TabsProps> = ({ tabs }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
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
      setActiveTabIndex(newIndex);
      tabRefs.current[newIndex]?.focus();
    }
  };

  return (
    <div>
      <div className="border-b border-slate-800" role="tablist" aria-label="Prompt sections">
        <div className="flex -mb-px space-x-1 sm:space-x-4 overflow-x-auto">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              id={`tab-${index}`}
              ref={(el) => { tabRefs.current[index] = el; }}
              role="tab"
              aria-selected={activeTabIndex === index}
              aria-controls={`tabpanel-${index}`}
              onClick={() => setActiveTabIndex(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              tabIndex={activeTabIndex === index ? 0 : -1}
              className={`flex-shrink-0 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-t-md ${
                activeTabIndex === index
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="pt-6">
        {tabs.map((tab, index) => (
          <div
            key={tab.label}
            id={`tabpanel-${index}`}
            role="tabpanel"
            aria-labelledby={`tab-${index}`}
            hidden={activeTabIndex !== index}
            className="focus:outline-none"
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