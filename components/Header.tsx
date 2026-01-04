
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
    onStartTutorial: () => void;
    uiStrings: any;
    onResetAll: () => void;
    onShowSearch: () => void;
    onShowVideoStudio: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onShowHistory, historyButtonText, 
    onShowImageStudio, imageStudioButtonText,
    onShowSunoStudio, sunoStudioButtonText,
    onShowVideoAnalysis,
    isSyncConnected,
    theme, onThemeToggle,
    onStartTutorial,
    uiStrings: t,
    onResetAll,
    onShowSearch,
    onShowVideoStudio,
}) => {
  return (
    <header className="py-3 sm:py-4">
        <div className="flex flex-wrap justify-between items-center gap-y-4">
            <div className="flex items-center space-x-2 p-2 bg-slate-800/50 rounded-lg" title={isSyncConnected ? "Real-time sync is active across tabs" : "Sync is not active"}>
                <span className={`w-3 h-3 rounded-full ${isSyncConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-xs text-slate-300 select-none hidden sm:inline">{isSyncConnected ? 'Live Sync' : 'Offline'}</span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0">
                <button
                    onClick={onShowSearch}
                    className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200 hover:scale-110 flex-shrink-0"
                    aria-label={t.searchButton}
                    title={t.searchButton}
                >
                    <Icon name="search" className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
                <button
                    onClick={onStartTutorial}
                    className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200 hover:scale-110 flex-shrink-0"
                    aria-label={t.tutorial.startButton}
                    title={t.tooltips.tutorialButton}
                >
                    <Icon name="help" className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
                <button
                    onClick={onResetAll}
                    className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 hover:scale-110 flex-shrink-0"
                    aria-label={t.resetAllButton}
                    title={t.tooltips.resetAllButton}
                >
                    <Icon name="trash" className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
                <button
                    onClick={onThemeToggle}
                    className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    title={t.tooltips.themeToggle}
                >
                    <div key={theme} className="animate-icon-spin flex items-center justify-center">
                        {theme === 'dark' ? (
                            <Icon name="sun" className="w-6 h-6 sm:w-7 sm:h-7" />
                        ) : (
                            <Icon name="moon" className="w-6 h-6 sm:w-7 sm:h-7" />
                        )}
                    </div>
                </button>
                 <div data-tutorial-id="creative-studios-header-group" className="flex items-center gap-1 sm:gap-2 border-l border-slate-700/50 pl-1 sm:pl-2 ml-1 sm:ml-2">
                    <button
                        onClick={onShowVideoAnalysis}
                        className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
                        aria-label={t.videoAnalysisButton}
                        title={t.tooltips.videoAnalysisButton}
                    >
                        <Icon name="video-analysis" className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                    <button
                        onClick={onShowVideoStudio}
                        className="p-2 sm:p-2.5 rounded-full text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 hover:text-cyan-200 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-300 hover:scale-110 flex-shrink-0"
                        aria-label={t.videoStudioButton}
                        title={t.tooltips.videoStudioButton}
                    >
                        <Icon name="film" className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                    <button
                        onClick={onShowSunoStudio}
                        className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
                        aria-label={sunoStudioButtonText}
                        title={t.tooltips.sunoStudioButton}
                    >
                        <Icon name="music" className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                    <button
                        onClick={onShowImageStudio}
                        className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
                        aria-label={imageStudioButtonText}
                        title={t.tooltips.imageStudioButton}
                    >
                        <Icon name="image" className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                 </div>
                <div className="border-l border-slate-700/50 pl-1 sm:pl-2 ml-1 sm:ml-2">
                    <button
                        onClick={onShowHistory}
                        className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
                        aria-label={historyButtonText}
                        title={t.tooltips.historyButton}
                    >
                        <Icon name="history" className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                </div>
            </div>
        </div>
    </header>
  );
};

export default Header;
