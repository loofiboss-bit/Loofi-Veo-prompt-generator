import React from 'react';
import Icon from './Icon';

interface HeaderProps {
    title: string;
    subtitle: string;
    onShowHistory: () => void;
    historyButtonText: string;
    onShowImageStudio: () => void;
    imageStudioButtonText: string;
    isSyncConnected: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, onShowHistory, historyButtonText, onShowImageStudio, imageStudioButtonText, isSyncConnected }) => {
  return (
    <header className="text-center relative">
       <div className="absolute top-0 left-0">
        <div className="flex items-center space-x-2 p-2 bg-slate-800/50 rounded-lg" title={isSyncConnected ? "Real-time sync is active across tabs" : "Sync is not active"}>
            <span className={`w-3 h-3 rounded-full ${isSyncConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-xs text-slate-400 select-none">{isSyncConnected ? 'Live Sync' : 'Offline'}</span>
        </div>
      </div>
      <div className="absolute top-0 right-0 flex items-center space-x-2">
        <button
            onClick={onShowImageStudio}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label={imageStudioButtonText}
        >
            <Icon name="image" className="w-6 h-6" />
        </button>
        <button
            onClick={onShowHistory}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label={historyButtonText}
        >
            <Icon name="history" className="w-6 h-6" />
        </button>
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-500">
        {title}
      </h1>
      <p className="mt-3 text-lg text-slate-400">
        {subtitle}
      </p>
    </header>
  );
};

export default Header;
