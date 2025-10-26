
import React from 'react';
import Icon from './Icon';

interface HeaderProps {
    onShowHistory: () => void;
    historyButtonText: string;
    onShowImageStudio: () => void;
    imageStudioButtonText: string;
    onShowSunoStudio: () => void;
    sunoStudioButtonText: string;
    onShowVideoAnalysis: () => void;
    isSyncConnected: boolean;
    theme: 'dark' | 'light';
    onThemeToggle: () => void;
    uiStrings: any;
}

const Header: React.FC<HeaderProps> = ({ 
    onShowHistory, historyButtonText, 
    onShowImageStudio, imageStudioButtonText,
    onShowSunoStudio, sunoStudioButtonText,
    onShowVideoAnalysis,
    isSyncConnected,
    theme, onThemeToggle,
    uiStrings: t,
}) => {
  return (
    <header className="py-2">
        <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 p-2 bg-slate-800/50 rounded-lg" title={isSyncConnected ? "Real-time sync is active across tabs" : "Sync is not active"}>
                <span className={`w-3 h-3 rounded-full ${isSyncConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-xs text-slate-400 select-none hidden sm:inline">{isSyncConnected ? 'Live Sync' : 'Offline'}</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                    onClick={onThemeToggle}
                    className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    title={t.tooltips.themeToggle}
                >
                    {theme === 'dark' ? (
                        <Icon name="lightbulb" className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                        <Icon name="moon" className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                </button>
                 <button
                    onClick={onShowVideoAnalysis}
                    className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                    aria-label={t.videoAnalysisButton}
                    title={t.tooltips.videoAnalysisButton}
                >
                    <Icon name="video-analysis" className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                    onClick={onShowSunoStudio}
                    className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                    aria-label={sunoStudioButtonText}
                    title={t.tooltips.sunoStudioButton}
                >
                    <Icon name="music" className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                    onClick={onShowImageStudio}
                    className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                    aria-label={imageStudioButtonText}
                    title={t.tooltips.imageStudioButton}
                >
                    <Icon name="image" className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                    onClick={onShowHistory}
                    className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                    aria-label={historyButtonText}
                    title={t.tooltips.historyButton}
                >
                    <Icon name="history" className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            </div>
        </div>
    </header>
  );
};

export default Header;
