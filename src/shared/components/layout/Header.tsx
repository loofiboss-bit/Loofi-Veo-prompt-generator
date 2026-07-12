import React, { memo, useState } from 'react';
import Icon from '@shared/components/ui/Icon';
import { useCollaborativeProject } from '@shared/hooks/useCollaborativeProject';
import { useTranslation } from 'react-i18next';
import { HealthBar } from '@shared/components/resilience/HealthBar';
import { CostBadge } from '@shared/components/resilience/CostBadge';
import { PresenceIndicator } from '@features/collaboration/PresenceIndicator';
import { useViewport } from '@shared/hooks/useViewport';

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
  const { t } = useTranslation(['common', 'tutorial', 'tooltips']);

  // Integrate Collab Hook
  const {
    isConnected,
    connectToRoom,
    disconnect,
    activeUsers: _activeUsers,
    roomId: _roomId,
  } = useCollaborativeProject();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [roomInput, setRoomInput] = useState('');

  const { isCompact } = useViewport();
  const labelCls = isCompact ? 'hidden' : 'hidden sm:inline';

  const handleConnect = () => {
    if (roomInput.trim()) {
      connectToRoom(roomInput.trim());
      setIsInviteOpen(false);
    }
  };

  return (
    <header className="py-3 sm:py-4" data-tour-id="app-header">
      <div className="flex flex-wrap justify-between items-center gap-y-4">
        <div className={`flex items-center ${isCompact ? 'gap-2' : 'gap-4'}`}>
          <div
            className="flex items-center space-x-2 p-2 bg-slate-800/50 rounded-lg"
            title={isTabSyncConnected ? t('common:syncActiveTitle') : t('common:syncInactiveTitle')}
          >
            <span
              className={`w-3 h-3 rounded-full ${isTabSyncConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}
            ></span>
            <span className="text-xs text-slate-300 select-none hidden sm:inline">
              {isTabSyncConnected ? t('common:liveSyncLabel') : t('common:offlineLabel')}
            </span>
          </div>

          {/* Project Indicator / Button */}
          {onOpenProjectManager && (
            <button
              onClick={onOpenProjectManager}
              data-tour-id="project-indicator"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                currentProjectName
                  ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-100 hover:bg-cyan-900/40'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title={t('common:manageProjectsTitle')}
            >
              <Icon
                name="folder"
                className={`w-4 h-4 ${currentProjectName ? 'text-cyan-400' : 'text-slate-500'}`}
              />
              <span className="text-xs font-semibold max-w-[150px] truncate">
                {currentProjectName || t('common:unsavedProject')}
              </span>
            </button>
          )}

          {/* API Health & Cost (v2.5.0) */}
          <HealthBar />
          <CostBadge />

          {/* COLLABORATION UI */}
          <div className="relative">
            {!isConnected ? (
              <button
                onClick={() => setIsInviteOpen(!isInviteOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-600/40 text-xs font-bold transition-all"
              >
                <Icon name="users" className="w-3.5 h-3.5" />
                <span className={labelCls}>{t('common:inviteTeamButton')}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-indigo-900/30 border border-indigo-500/30 rounded-full px-2 py-1">
                <PresenceIndicator />
                <button
                  onClick={disconnect}
                  className="ml-2 text-xs text-slate-400 hover:text-white"
                  aria-label="Disconnect from collaboration session"
                >
                  <Icon name="cancel" className="w-3 h-3" />
                </button>
              </div>
            )}

            {isInviteOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-4 z-50 animate-fade-in-up">
                <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase">
                  {t('common:multiplayerMode')}
                </h4>
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  placeholder={t('common:roomIdPlaceholder')}
                  className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-white mb-2"
                />
                <button
                  onClick={handleConnect}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded py-1.5 text-xs font-bold"
                >
                  {t('common:goLiveButton')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`min-w-0 flex-1 overflow-hidden ${isCompact ? 'compact-toolbar' : ''}`}>
          <div
            className={`flex items-center ${isCompact ? 'gap-0.5' : 'gap-1 sm:gap-2'} max-w-full`}
          >
            <button
              onClick={onOpenWizard}
              className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-purple-900/20 transition-all hover:scale-105 flex-shrink-0 border border-white/10"
              title="Start Quick Wizard"
            >
              <Icon name="magic" className="w-3.5 h-3.5" />
              <span className={labelCls}>{t('common:wizardButton')}</span>
            </button>

            {onOpenVariablesPanel && (
              <button
                onClick={onOpenVariablesPanel}
                className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-fuchsia-300 text-xs font-bold border border-slate-600 transition-all hover:border-fuchsia-500/50 flex-shrink-0 font-mono"
                title="Global Variables"
              >
                {`{ }`}
                <span className={`${labelCls} ml-1`}>{t('common:varsButton')}</span>
              </button>
            )}

            {onOpenStoryBoard && (
              <button
                onClick={onOpenStoryBoard}
                className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-all hover:border-cyan-500/50 flex-shrink-0"
                title="Open Story Board"
              >
                <Icon name="film" className="w-3.5 h-3.5" />
                <span className={labelCls}>{t('common:storyBoardButton') || 'Story Board'}</span>
              </button>
            )}

            {onOpenCharacterBank && (
              <button
                onClick={onOpenCharacterBank}
                className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-all hover:border-cyan-500/50 flex-shrink-0"
                title="Open Character Library"
              >
                <Icon name="users" className="w-3.5 h-3.5" />
                <span className={labelCls}>{t('common:characterBankButton') || 'Characters'}</span>
              </button>
            )}

            {onOpenLocationBank && (
              <button
                onClick={onOpenLocationBank}
                className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-all hover:border-emerald-500/50 flex-shrink-0"
                title="Open Location Library"
              >
                <Icon name="map-pin" className="w-3.5 h-3.5 text-emerald-400" />
                <span className={labelCls}>{t('common:locationsButton')}</span>
              </button>
            )}

            {onOpenSeriesBible && (
              <button
                onClick={onOpenSeriesBible}
                className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-all hover:border-amber-500/50 flex-shrink-0"
                title="Series Bible (Lore & Rules)"
              >
                <Icon name="library" className="w-3.5 h-3.5 text-amber-400" />
                <span className={labelCls}>{t('common:loreButton')}</span>
              </button>
            )}

            <div className="w-px h-6 bg-slate-700/50 mx-1"></div>

            <button
              onClick={onShowSearch}
              className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200 hover:scale-110 flex-shrink-0"
              aria-label={t('common:searchButton')}
              title={t('common:searchButton')}
            >
              <Icon name="search" className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
            <button
              onClick={onStartTutorial}
              className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200 hover:scale-110 flex-shrink-0"
              aria-label={t('tutorial:startButton')}
              title={t('tooltips:tutorialButton')}
            >
              <Icon name="help" className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
            <button
              onClick={onResetAll}
              className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 hover:scale-110 flex-shrink-0"
              aria-label={t('common:resetAllButton')}
              title={t('tooltips:resetAllButton')}
            >
              <Icon name="trash" className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
            <button
              onClick={onThemeToggle}
              className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={t('tooltips:themeToggle')}
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
              data-tour-id="creative-studios-header-group"
              className="flex items-center gap-1 sm:gap-2 border-l border-slate-700/50 pl-1 sm:pl-2 ml-1 sm:ml-2"
            >
              <button
                onClick={onOpenScriptStudio}
                className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
                aria-label={t('common:scriptStudioButton')}
                title={t('common:scriptStudioButton')}
              >
                <Icon name="file-text" className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
              <button
                onClick={onShowVideoAnalysis}
                className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
                aria-label={t('common:videoAnalysisButton')}
                title={t('tooltips:videoAnalysisButton')}
              >
                <Icon name="video-analysis" className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
              <button
                onClick={onShowVideoStudio}
                className="p-2 sm:p-2.5 rounded-full text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 hover:text-cyan-200 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-300 hover:scale-110 flex-shrink-0"
                aria-label={t('common:videoStudioButton')}
                title={t('tooltips:videoStudioButton')}
              >
                <Icon name="film" className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
              <button
                onClick={onShowSunoStudio}
                className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
                aria-label={sunoStudioButtonText}
                title={t('tooltips:sunoStudioButton')}
              >
                <Icon name="music" className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
              <button
                onClick={onShowImageStudio}
                className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
                aria-label={imageStudioButtonText}
                title={t('tooltips:imageStudioButton')}
              >
                <Icon name="image" className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
            </div>
            <div className="border-l border-slate-700/50 pl-1 sm:pl-2 ml-1 sm:ml-2">
              <button
                onClick={onShowHistory}
                className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 hover:scale-110 flex-shrink-0"
                aria-label={historyButtonText}
                title={t('tooltips:historyButton')}
              >
                <Icon name="history" className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default memo(Header);
