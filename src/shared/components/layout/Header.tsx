import React, { useState } from 'react';
import Icon from '@shared/components/ui/Icon';
import { useCollaborativeProject } from '@shared/hooks/useCollaborativeProject';
import type { UIStrings } from '@core/constants';

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
  uiStrings: UIStrings;
  onResetAll: () => void;
  onShowSearch: () => void;
  onShowVideoStudio: () => void;
  onOpenWizard: () => void;
  onOpenStoryBoard?: () => void;
  onOpenCharacterBank?: () => void;
  onOpenLocationBank?: () => void;
  onOpenProjectManager?: () => void;
  onOpenSeriesBible?: () => void;
  onOpenVariablesPanel?: () => void;
  onOpenScriptStudio?: () => void;
  currentProjectName?: string | null;
}

const Header: React.FC<HeaderProps> = ({
  onShowHistory,
  historyButtonText,
  onShowImageStudio,
  imageStudioButtonText,
  onShowSunoStudio,
  sunoStudioButtonText,
  onShowVideoAnalysis,
  isSyncConnected: isTabSyncConnected,
  theme,
  onThemeToggle,
  onStartTutorial,
  uiStrings: t,
  onResetAll,
  onShowSearch,
  onShowVideoStudio,
  onOpenWizard,
  onOpenStoryBoard,
  onOpenCharacterBank,
  onOpenLocationBank,
  onOpenProjectManager,
  onOpenSeriesBible,
  onOpenVariablesPanel,
  onOpenScriptStudio,
  currentProjectName,
}) => {
  // Integrate Collab Hook
  const { isConnected, connectToRoom, disconnect, activeUsers, roomId: _roomId } = useCollaborativeProject();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [roomInput, setRoomInput] = useState('');

  const handleConnect = () => {
    if (roomInput.trim()) {
      connectToRoom(roomInput.trim());
      setIsInviteOpen(false);
    }
  };

  return (
    <header className="py-3 sm:py-4">
      <div className="flex flex-wrap justify-between items-center gap-y-4">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center space-x-2 p-2 bg-slate-800/50 rounded-lg"
            title={
              isTabSyncConnected ? 'Real-time sync is active across tabs' : 'Sync is not active'
            }
          >
            <span
              className={`w-3 h-3 rounded-full ${isTabSyncConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}
            ></span>
            <span className="text-xs text-slate-300 select-none hidden sm:inline">
              {isTabSyncConnected ? 'Live Sync' : 'Offline'}
            </span>
          </div>

          {/* Project Indicator / Button */}
          {onOpenProjectManager && (
            <button
              onClick={onOpenProjectManager}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                currentProjectName
                  ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-100 hover:bg-cyan-900/40'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title="Manage Projects"
            >
              <Icon
                name="folder"
                className={`w-4 h-4 ${currentProjectName ? 'text-cyan-400' : 'text-slate-500'}`}
              />
              <span className="text-xs font-semibold max-w-[150px] truncate">
                {currentProjectName || 'Unsaved Project'}
              </span>
            </button>
          )}

          {/* COLLABORATION UI */}
          <div className="relative">
            {!isConnected ? (
              <button
                onClick={() => setIsInviteOpen(!isInviteOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-600/40 text-xs font-bold transition-all"
              >
                <Icon name="users" className="w-3.5 h-3.5" />
                Invite Team
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-indigo-900/30 border border-indigo-500/30 rounded-full px-2 py-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-1"></span>
                <div className="flex -space-x-2">
                  {activeUsers.map((user) => (
                    <div
                      key={user.clientId}
                      className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold"
                      style={{ backgroundColor: user.color }}
                      title={user.name}
                    >
                      {user.name.charAt(0)}
                    </div>
                  ))}
                </div>
                <button
                  onClick={disconnect}
                  className="ml-2 text-xs text-slate-400 hover:text-white"
                >
                  <Icon name="cancel" className="w-3 h-3" />
                </button>
              </div>
            )}

            {isInviteOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-4 z-50 animate-fade-in-up">
                <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase">
                  Multiplayer Mode
                </h4>
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  placeholder="Enter Room ID (e.g. 'writers-room')"
                  className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-white mb-2"
                />
                <button
                  onClick={handleConnect}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded py-1.5 text-xs font-bold"
                >
                  Go Live
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0">
          <button
            onClick={onOpenWizard}
            className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-purple-900/20 transition-all hover:scale-105 flex-shrink-0 border border-white/10"
            title="Start Quick Wizard"
          >
            <Icon name="magic" className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.wizardButton}</span>
          </button>

          {onOpenVariablesPanel && (
            <button
              onClick={onOpenVariablesPanel}
              className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-fuchsia-300 text-xs font-bold border border-slate-600 transition-all hover:border-fuchsia-500/50 flex-shrink-0 font-mono"
              title="Global Variables"
            >
              {`{ }`}
              <span className="hidden sm:inline ml-1">Vars</span>
            </button>
          )}

          {onOpenStoryBoard && (
            <button
              onClick={onOpenStoryBoard}
              className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-all hover:border-cyan-500/50 flex-shrink-0"
              title="Open Story Board"
            >
              <Icon name="film" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.storyBoardButton || 'Story Board'}</span>
            </button>
          )}

          {onOpenCharacterBank && (
            <button
              onClick={onOpenCharacterBank}
              className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-all hover:border-cyan-500/50 flex-shrink-0"
              title="Open Character Library"
            >
              <Icon name="users" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.characterBankButton || 'Characters'}</span>
            </button>
          )}

          {onOpenLocationBank && (
            <button
              onClick={onOpenLocationBank}
              className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-all hover:border-emerald-500/50 flex-shrink-0"
              title="Open Location Library"
            >
              <Icon name="map-pin" className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Locations</span>
            </button>
          )}

          {onOpenSeriesBible && (
            <button
              onClick={onOpenSeriesBible}
              className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-all hover:border-amber-500/50 flex-shrink-0"
              title="Series Bible (Lore & Rules)"
            >
              <Icon name="library" className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Lore</span>
            </button>
          )}

          <div className="w-px h-6 bg-slate-700/50 mx-1"></div>

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
          <div
            data-tutorial-id="creative-studios-header-group"
            className="flex items-center gap-1 sm:gap-2 border-l border-slate-700/50 pl-1 sm:pl-2 ml-1 sm:ml-2"
          >
            <button
              onClick={onOpenScriptStudio}
              className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
              aria-label={t.scriptStudioButton}
              title="Script to Screen"
            >
              <Icon name="file-text" className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
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
