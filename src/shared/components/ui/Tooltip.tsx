import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const id = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex items-center space-x-2 relative">
      {children}
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="group"
        tabIndex={0}
        role="button"
        aria-describedby={id}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setIsVisible(!isVisible);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-slate-400 group-hover:text-slate-200 group-focus:text-slate-200 transition-colors"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        {isVisible && (
          <div
            id={id}
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800/80 backdrop-blur-md text-slate-200 text-sm rounded-lg shadow-lg border border-slate-700/50 z-10"
          >
            {text}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tooltip;
