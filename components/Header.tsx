import React from 'react';
import Icon from './Icon';

interface HeaderProps {
    title: string;
    subtitle: string;
    onShowHistory: () => void;
    historyButtonText: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, onShowHistory, historyButtonText }) => {
  return (
    <header className="text-center relative">
      <div className="absolute top-0 right-0">
        <button
            onClick={onShowHistory}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
            aria-label={historyButtonText}
        >
            <Icon name="history" className="w-6 h-6" />
        </button>
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        {title}
      </h1>
      <p className="mt-3 text-lg text-gray-300">
        {subtitle}
      </p>
    </header>
  );
};

export default Header;
