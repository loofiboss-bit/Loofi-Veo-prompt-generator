/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from 'zustand';
import { useTranslation } from 'react-i18next';
import { PromptState } from '@core/types';

import { useHistoryState } from '@shared/hooks/useHistoryState';
import { usePromptLogic } from '@shared/hooks/usePromptLogic';
import { useAppStore } from '@core/store/useAppStore';
import { useVideoStore } from '@core/store/useVideoStore';
import { useAppSync } from '@shared/hooks/useAppSync';
import { useAutoSaveHistory } from '@shared/hooks/useAutoSaveHistory';
import { logger } from '@core/services/loggerService';
import { useProjectStore } from '@core/store/useProjectStore';
import { useHistoryStore } from '@core/store/useHistoryStore';
import { useOnboarding } from '@shared/contexts/OnboardingContext';
import { hasApiKey } from '@core/services/apiKeyService';
import { themeService } from '@core/services/themeService';

import { Header, Sidebar, ModalManager, AppOverlays, AppPanels } from '@shared/components/layout';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { PromptWorkspace } from '@features/prompt/PromptWorkspace';

// Lazy-loaded panels — only rendered when opened (v2.2.0 bundle reduction)
const AssetLibrary = React.lazy(() => import('@features/prompt/AssetLibrary'));
const OptimizePanel = React.lazy(() =>
  import('@features/optimization').then((m) => ({ default: m.OptimizePanel })),
);
const ShareDialog = React.lazy(() =>
  import('@features/collaboration').then((m) => ({ default: m.ShareDialog })),
);
const ConflictResolutionPanel = React.lazy(() =>
  import('@features/collaboration').then((m) => ({ default: m.ConflictResolutionPanel })),
);
const ProfileSetup = React.lazy(() =>
  import('@features/collaboration').then((m) => ({ default: m.ProfileSetup })),
);
const CommentPanel = React.lazy(() =>
  import('@features/collaboration').then((m) => ({ default: m.CommentPanel })),
);
const RoleManager = React.lazy(() =>
  import('@features/collaboration').then((m) => ({ default: m.RoleManager })),
);

// Extracted hooks
import { useAppInitialization } from '@shared/hooks/useAppInitialization';
import { useAppHandlers } from '@shared/hooks/useAppHandlers';
import { usePromptOptions } from '@shared/hooks/usePromptOptions';
import { useHelpPanel } from '@shared/hooks/useHelpPanel';
import { useSafeMode } from '@shared/hooks/useSafeMode';
import { useGenerationState } from '@shared/hooks/useGenerationState';
import { useToastManager } from '@shared/hooks/useToastManager';
import { useAppKeyboardShortcuts } from '@shared/hooks/useAppKeyboardShortcuts';
import { useDiagnosticsStore } from '@core/store/useDiagnosticsStore';
import { useJobQueueStore } from '@core/store/useJobQueueStore';
import { useFallbackNotifications } from '@shared/hooks/useFallbackNotifications';
import { useOptimizationStore } from '@core/store/useOptimizationStore';
import { useCollaborationStore } from '@core/store/useCollaborationStore';

export function App() {
  // ---------- Store & top-level hooks ----------
  const store = useAppStore();
  const {
    promptState,
    setPromptState,
    _hasHydrated,
    openModal,
    openStudio,
    activeStudio,
    setTheme,
    theme,
    setNewProjectWizardOpen,
  } = store;

  const projectStore = useProjectStore();
  const historyStore = useHistoryStore();
  const { restartTutorial } = useOnboarding();
  const isSyncConnected = useAppSync();

  // v2.4.0 — Router & i18n integration
  const location = useLocation();
  const navigate = useNavigate();
  const isChildRoute = location.pathname !== '/';

  // Undo/Redo via Zundo temporal store
  const temporalStore = useAppStore.temporal;
  const canUndoPromptState = useStore(temporalStore, (state) => state.pastStates.length > 0);
  const canRedoPromptState = useStore(temporalStore, (state) => state.futureStates.length > 0);
  const undoPromptState = useCallback(() => temporalStore.getState().undo(), [temporalStore]);
  const redoPromptState = useCallback(() => temporalStore.getState().redo(), [temporalStore]);

  const { toasts, addToast, dismissToast } = useToastManager();
  const { safeModeStatus } = useSafeMode();
  const { showHelpPanel, helpPanelTopic, helpPanelCategory, openHelpPanel, closeHelpPanel } =
    useHelpPanel();

  // ---------- Diagnostics (v1.8.0) ----------
  const diagnosticsStore = useDiagnosticsStore();
  const isDiagnosticsOpen = diagnosticsStore.isPanelOpen;
  const diagnosticIssueCount = diagnosticsStore.result?.allIssues.length;

  // ---------- Jobs Panel (v1.8.0) ----------
  const pendingJobCount = useJobQueueStore((s) => s.pendingCount);
  const [isJobsPanelOpen, setIsJobsPanelOpen] = useState(false);
  const [isQueuePanelOpen, setIsQueuePanelOpen] = useState(false);
  const { notification: fallbackNotification, dismissNotification: dismissFallback } =
    useFallbackNotifications();

  // ---------- Optimization Panel (v3.4.0) ----------
  const toggleOptimizePanel = useOptimizationStore((s) => s.togglePanel);
  const isOptimizePanelOpen = useOptimizationStore((s) => s.panelOpen);

  // ---------- Share Dialog (v3.5.0) ----------
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // ---------- Collaboration panels (v3.6.0) ----------
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);
  const collabStatus = useCollaborationStore((s) => s.connectionStatus);
  const collabCurrentUser = useCollaborationStore((s) => s.currentUser);

  // Auto-open ProfileSetup when joining a room without a profile
  useEffect(() => {
    if (collabStatus === 'connected' && !collabCurrentUser) {
      setIsProfileSetupOpen(true);
    }
  }, [collabStatus, collabCurrentUser]);

  // ---------- Local state ----------
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [hasSeenWelcome, setHasSeenWelcome] = useState(
    () => localStorage.getItem('hasSeenWelcome') === 'true',
  );
  const [isExamplesVisible, setIsExamplesVisible] = useState(true);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(hasApiKey());
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEnhancingIdea, setIsEnhancingIdea] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [openSections, setOpenSections] = useState<string[]>(['core-concept']);
  const [activeSection, setActiveSection] = useState<string>(
    location.pathname === '/composer' ? 'composer' : 'prompt',
  );
  const ideaInputRef = useRef<HTMLTextAreaElement>(null);

  const {
    state: editedPrompt,
    setState: setEditedPrompt,
    undo: undoEdit,
    redo: redoEdit,
    reset: resetEditHistory,
    canUndo: canUndoEdit,
    canRedo: canRedoEdit,
  } = useHistoryState('');

  // ---------- Translations ----------
  const { t } = useTranslation(['common', 'toasts']);

  // ---------- Derived state ----------
  const currentProjectId = projectStore.currentProjectId;
  const currentProjectName =
    projectStore.projects.find((p) => p.id === currentProjectId)?.name ?? null;
  const isGeneratingVideo = useVideoStore((state) => state.isGenerating);

  const handleThemeToggle = useCallback(() => {
    const nextMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextMode);
    themeService.setMode(nextMode).catch(() => {});
  }, [setTheme, theme]);

  // ---------- Domain hooks ----------
  const promptLogic = usePromptLogic({ promptState, setPromptState, addToast, userCoords });
  const generationState = useGenerationState({ promptState, addToast });
  const promptOptions = usePromptOptions(promptState.language);

  // ---------- Initialization ----------
  useAppInitialization({
    _hasHydrated,
    currentProjectId,
    promptIdea: promptState.idea,
    setNewProjectWizardOpen,
    openSettings: () => navigate('/settings'),
    addToast,
  });

  // ---------- Safe-mode studio guard ----------
  const safeModeBlockedStudios = useMemo(
    () => new Set(['analysis', 'story', 'video', 'spatial', 'script']),
    [],
  );
  const openStudioSafely = useCallback(
    (studio: NonNullable<typeof activeStudio>) => {
      if (safeModeStatus?.enabled && safeModeBlockedStudios.has(studio)) {
        addToast('Safe Mode is active. This studio is temporarily disabled.', 'info');
        return;
      }
      openStudio(studio);
    },
    [safeModeStatus, safeModeBlockedStudios, addToast, openStudio],
  );

  // ---------- Handlers hook ----------
  const {
    handleInputChange,
    handleAudioMixChange,
    handleImageUpload,
    handleImageClear,
    handleAudioUpload,
    handleAudioClear,
    handleResetAll,
    handleNewPrompt,
    handleSavePrompt,
    saveToHistory,
    handleShare,
    handleDownloadPrompt,
    handleTargetModelChange,
    handleEnhanceIdea,
    handleUseExample,
    modalHandlers,
  } = useAppHandlers({
    promptState,
    setPromptState,
    generatedPrompt: promptLogic.generatedPrompt,
    setGeneratedPrompt: promptLogic.setGeneratedPrompt,
    errors: promptLogic.errors,
    setErrors: promptLogic.setErrors,
    addToast,
    promptVariations: generationState.promptVariations,
    isGeneratingVariations: generationState.isGeneratingVariations,
    isBrainstorming: generationState.isBrainstorming,
    resetGenerationState: generationState.resetGenerationState,
    conceptArtImage: generationState.conceptArtImage,
    setConceptArtImage: generationState.setConceptArtImage,
    storyboardImages: generationState.storyboardImages,
    setStoryboardImages: generationState.setStoryboardImages,
    uploadedImageUrl,
    setUploadedImageUrl,
    isEditing,
    setIsEditing,
    isEnhancingIdea,
    setIsEnhancingIdea,
    resetEditHistory,
    ideaInputRef,
    safeModeStatus,
    openStudioSafely,
    currentProjectName,
    currentProjectId,
  });

  // ---------- Side effects ----------
  // Sync edit state with generated prompt
  useEffect(() => {
    if (promptLogic.generatedPrompt && !isEditing) {
      resetEditHistory(promptLogic.generatedPrompt.prompt);
    }
  }, [promptLogic.generatedPrompt, isEditing, resetEditHistory]);

  // Character detail suggestion trigger
  const { handleTriggerCharacterDetails } = promptLogic;
  useEffect(() => {
    handleTriggerCharacterDetails();
  }, [handleTriggerCharacterDetails]);

  // Refresh API key badge state when route changes (settings flow)
  useEffect(() => {
    setApiKeyConfigured(hasApiKey());
  }, [location.pathname]);

  // Auto-save generated prompts to history (debounced)
  useAutoSaveHistory(promptLogic.generatedPrompt, promptState);

  // Geolocation handler (checkbox triggers this via handleCheckboxChange in useAppHandlers,
  // but the coord-setting still needs to be local)
  const handleCheckboxChangeWithCoords = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.currentTarget;
      setPromptState({ [name as keyof PromptState]: checked });

      if (name === 'useGoogleMaps' && checked && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserCoords({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            addToast(t('toasts:toastLocationAcquired'), 'info');
          },
          () => {
            addToast(t('toasts:toastLocationError'), 'error');
          },
        );
      }
    },
    [setPromptState, addToast, t],
  );

  // Refine prompt wrapper
  const handleRefinePromptWrapper = useCallback(
    async (text: string) => {
      await promptLogic.handleRefinePrompt(text);
      if (isEditing) setIsEditing(false);
    },
    [promptLogic, isEditing],
  );

  // ---------- Keyboard shortcuts ----------
  useAppKeyboardShortcuts({
    onGeneratePrompt: promptLogic.handleGeneratePrompt,
    isLoading: promptLogic.isLoading,
    onOpenHelpPanel: openHelpPanel,
    onOpenSavePresetModal: () => openModal('isSavePresetModalOpen'),
    activeStudio,
    modalState: {
      isHistoryOpen: store.isHistoryOpen,
      isTemplatesOpen: store.isTemplatesOpen,
      isDNAModalOpen: store.isDNAModalOpen,
      isCharacterBankOpen: store.isCharacterBankOpen,
      isLocationBankOpen: store.isLocationBankOpen,
      isProjectManagerOpen: store.isProjectManagerOpen,
      isWizardOpen: store.isWizardOpen,
      isSeriesBibleOpen: store.isSeriesBibleOpen,
    },
  });

  // ---------- Section toggle helper ----------
  const handleToggleSection = useCallback((section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    );
  }, []);

  // ---------- Loading gate ----------
  if (!_hasHydrated) {
    return (
      <div className="h-full bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="h-full bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-100 transition-colors duration-300">
      {/* Skip navigation link for keyboard/screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        {t('common:skipToContent', 'Skip to main content')}
      </a>
      {/* Background Gradient & Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] opacity-30"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-900/10 blur-[120px] opacity-30"></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-blue-900/10 blur-[100px] opacity-20"></div>
      </div>

      {/* Sidebar Navigation */}
      <ErrorBoundary panelId="app-sidebar-panel">
        <Sidebar
          onNavigate={(section) => {
            if (section === 'composer') {
              navigate('/composer');
            } else {
              if (location.pathname !== '/') navigate('/');
              setActiveSection(section);
            }
          }}
          activeSection={
            location.pathname === '/composer'
              ? 'composer'
              : location.pathname === '/settings'
                ? 'settings'
                : activeSection
          }
          onOpenProject={() => openModal('isProjectManagerOpen')}
          onOpenHistory={() => openModal('isHistoryOpen')}
          onOpenTemplates={() => openModal('isTemplatesOpen')}
          onOpenSettings={() => navigate('/settings')}
          onOpenPlugins={() => navigate('/settings')}
          onOpenDiagnostics={() => diagnosticsStore.openPanel()}
          onOpenBatchGenerator={() => setIsBatchModalOpen(true)}
          onOpenJobsPanel={() => setIsJobsPanelOpen(true)}
          onOpenWorkspaceManager={() => setIsWorkspaceManagerOpen(true)}
          onOpenQueue={() => setIsQueuePanelOpen(true)}
          onOpenHelpPanel={() => openHelpPanel()}
          onOpenOptimize={toggleOptimizePanel}
          onOpenCollaborate={() => setIsShareDialogOpen(true)}
          onOpenComments={() => setIsCommentPanelOpen(true)}
          onOpenRoles={() => setIsRoleManagerOpen(true)}
          diagnosticIssueCount={diagnosticIssueCount}
          pendingJobCount={pendingJobCount}
          isApiConfigured={apiKeyConfigured}
        />
      </ErrorBoundary>

      {/* Global Asset Library */}
      <ErrorBoundary panelId="app-asset-library-panel">
        <React.Suspense fallback={null}>
          <AssetLibrary />
        </React.Suspense>
      </ErrorBoundary>

      {/* AI Optimize Panel (v3.4.0) — fixed right sidebar */}
      {isOptimizePanelOpen && (
        <ErrorBoundary panelId="app-optimize-panel">
          <React.Suspense fallback={null}>
            <div className="fixed right-0 top-0 h-full z-50 shadow-2xl">
              <OptimizePanel
                promptId={currentProjectId || 'default'}
                onClose={toggleOptimizePanel}
              />
            </div>
          </React.Suspense>
        </ErrorBoundary>
      )}

      {/* Share Dialog (v3.5.0) — collaboration room management */}
      <ErrorBoundary panelId="app-share-dialog">
        <React.Suspense fallback={null}>
          {isShareDialogOpen && (
            <ShareDialog
              isOpen={isShareDialogOpen}
              onClose={() => setIsShareDialogOpen(false)}
              projectId={currentProjectId || 'default'}
              projectName={currentProjectName || t('common:unsavedProject')}
            />
          )}
        </React.Suspense>
      </ErrorBoundary>

      {/* Conflict Resolution Panel (v3.6.0) — always-mounted, self-hidden when no conflicts */}
      <ErrorBoundary panelId="app-conflict-resolution">
        <React.Suspense fallback={null}>
          <ConflictResolutionPanel />
        </React.Suspense>
      </ErrorBoundary>

      {/* Profile Setup (v3.6.0) — triggered on room join without profile */}
      <ErrorBoundary panelId="app-profile-setup">
        <React.Suspense fallback={null}>
          {isProfileSetupOpen && (
            <ProfileSetup
              isOpen={isProfileSetupOpen}
              onClose={() => setIsProfileSetupOpen(false)}
              onComplete={() => setIsProfileSetupOpen(false)}
            />
          )}
        </React.Suspense>
      </ErrorBoundary>

      {/* Comment Panel (v3.6.0) — project-level threaded comments */}
      {isCommentPanelOpen && (
        <ErrorBoundary panelId="app-comment-panel">
          <React.Suspense fallback={null}>
            <div className="fixed right-0 top-0 h-full z-50 shadow-2xl w-80 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t('common:sidebar.comments')}
                </h2>
                <button
                  onClick={() => setIsCommentPanelOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Close comments"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CommentPanel shotId={0} projectId={currentProjectId || 'default'} />
              </div>
            </div>
          </React.Suspense>
        </ErrorBoundary>
      )}

      {/* Role Manager (v3.6.0) — manage peer roles in active collaboration room */}
      <ErrorBoundary panelId="app-role-manager">
        <React.Suspense fallback={null}>
          {isRoleManagerOpen && (
            <RoleManager isOpen={isRoleManagerOpen} onClose={() => setIsRoleManagerOpen(false)} />
          )}
        </React.Suspense>
      </ErrorBoundary>

      {/* Child routes (Composer, Settings, etc.) */}
      {isChildRoute && (
        <div className="ml-0 lg:ml-64">
          <Outlet />
        </div>
      )}

      <div
        id="main-content"
        className={`relative z-10 h-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-6 pb-12 ml-0 lg:ml-64 transition-all duration-300 ${isChildRoute ? 'hidden' : ''}`}
      >
        <ErrorBoundary panelId="app-header-panel">
          <Header
            onShowHistory={() => openModal('isHistoryOpen')}
            historyButtonText={t('common:historyButton')}
            onShowImageStudio={() => openStudioSafely('image')}
            imageStudioButtonText={t('common:imageStudioButton')}
            onShowSunoStudio={() => openStudioSafely('suno')}
            sunoStudioButtonText={t('common:sunoStudioButton')}
            onShowVideoAnalysis={() => openStudioSafely('analysis')}
            isSyncConnected={isSyncConnected}
            theme={theme}
            onThemeToggle={handleThemeToggle}
            onStartTutorial={restartTutorial}
            onResetAll={handleResetAll}
            onShowSearch={() => openModal('isSearchOpen')}
            onShowVideoStudio={() => openStudioSafely('video')}
            onOpenWizard={() => openModal('isWizardOpen')}
            onOpenStoryBoard={() => openStudioSafely('story')}
            onOpenCharacterBank={() => openModal('isCharacterBankOpen')}
            onOpenLocationBank={() => openModal('isLocationBankOpen')}
            onOpenProjectManager={() => openModal('isProjectManagerOpen')}
            onOpenSeriesBible={() => openModal('isSeriesBibleOpen')}
            onOpenVariablesPanel={() => openModal('isVariablesPanelOpen')}
            onOpenScriptStudio={() => openStudioSafely('script')}
            currentProjectName={currentProjectName}
          />
        </ErrorBoundary>

        <PromptWorkspace
          promptState={promptState}
          promptId={currentProjectId || 'default'}
          handleInputChange={handleInputChange}
          handleCheckboxChangeWithCoords={handleCheckboxChangeWithCoords}
          handleTargetModelChange={handleTargetModelChange}
          handleImageUpload={handleImageUpload}
          handleImageClear={handleImageClear}
          uploadedImageUrl={uploadedImageUrl}
          handleAudioMixChange={handleAudioMixChange}
          handleAudioUpload={handleAudioUpload}
          handleAudioClear={handleAudioClear}
          errors={promptLogic.errors}
          addToast={addToast}
          openHelpPanel={openHelpPanel}
          ideaInputRef={ideaInputRef}
          openSections={openSections}
          onToggleSection={handleToggleSection}
          activeTabIndex={activeTabIndex}
          onTabChange={setActiveTabIndex}
          openStudioSafely={openStudioSafely}
          promptOptions={promptOptions}
          isBrainstorming={generationState.isBrainstorming}
          isAutoFilling={promptLogic.isAutoFilling}
          handleBrainstormIdeas={generationState.handleBrainstormIdeas}
          handleAutoFillModifiers={promptLogic.handleAutoFillModifiers}
          handleEnhanceIdea={handleEnhanceIdea}
          isEnhancingIdea={isEnhancingIdea}
          promptLogic={promptLogic}
          isEditing={isEditing}
          editedPrompt={editedPrompt}
          onSetIsEditing={(editing) => {
            setIsEditing(editing);
            if (editing && promptLogic.generatedPrompt) {
              setEditedPrompt(promptLogic.generatedPrompt.prompt);
            }
          }}
          onSetEditedPrompt={setEditedPrompt}
          canUndoEdit={canUndoEdit}
          onUndoEdit={undoEdit}
          canRedoEdit={canRedoEdit}
          onRedoEdit={redoEdit}
          canUndoPromptState={canUndoPromptState}
          onUndoPromptState={undoPromptState}
          canRedoPromptState={canRedoPromptState}
          onRedoPromptState={redoPromptState}
          isGeneratingArt={generationState.isGeneratingArt}
          onGenerateArt={generationState.handleGenerateArt}
          isGeneratingVideo={isGeneratingVideo}
          onGenerateVideo={() => openStudioSafely('video')}
          isGeneratingStoryboard={generationState.isGeneratingStoryboard}
          onGenerateStoryboard={generationState.handleGenerateStoryboard}
          isGeneratingVariations={generationState.isGeneratingVariations}
          onGenerateVariations={generationState.handleGenerateVariations}
          onRefinePromptWrapper={handleRefinePromptWrapper}
          handleNewPrompt={handleNewPrompt}
          handleSavePrompt={handleSavePrompt}
          saveToHistory={saveToHistory}
          handleShare={handleShare}
          handleDownloadPrompt={handleDownloadPrompt}
          onOpenSavePresetModal={() => openModal('isSavePresetModalOpen')}
          onOpenTemplatesPanel={() => openModal('isTemplatesOpen')}
          onCompareModels={() => openStudioSafely('compare')}
          onOpenVisualDNA={() => openModal('isDNAModalOpen')}
          storyboardImages={generationState.storyboardImages}
          conceptArtImage={generationState.conceptArtImage}
          isExamplesVisible={isExamplesVisible}
          onCloseExamples={() => setIsExamplesVisible(false)}
          examplePrompts={promptOptions.examplePrompts}
          handleUseExample={handleUseExample}
        />
      </div>

      <ErrorBoundary panelId="app-modal-manager-panel">
        <ModalManager addToast={addToast} handlers={modalHandlers} />
      </ErrorBoundary>

      <AppPanels
        isBatchModalOpen={isBatchModalOpen}
        onCloseBatchModal={() => setIsBatchModalOpen(false)}
        addToast={addToast}
        isJobsPanelOpen={isJobsPanelOpen}
        onCloseJobsPanel={() => setIsJobsPanelOpen(false)}
        isWorkspaceManagerOpen={isWorkspaceManagerOpen}
        onCloseWorkspaceManager={() => setIsWorkspaceManagerOpen(false)}
        isQueuePanelOpen={isQueuePanelOpen}
        onCloseQueuePanel={() => setIsQueuePanelOpen(false)}
        fallbackNotification={fallbackNotification}
        onDismissFallback={dismissFallback}
      />

      {/* Overlays: Toasts, Chat, Onboarding, Help, Diagnostics */}
      <AppOverlays
        toasts={toasts}
        dismissToast={dismissToast}
        hasSeenWelcome={hasSeenWelcome}
        onCloseWelcome={() => {
          localStorage.setItem('hasSeenWelcome', 'true');
          setHasSeenWelcome(true);
        }}
        showHelpPanel={showHelpPanel}
        closeHelpPanel={closeHelpPanel}
        helpPanelTopic={helpPanelTopic}
        helpPanelCategory={helpPanelCategory}
        isDiagnosticsOpen={isDiagnosticsOpen}
        onCloseDiagnostics={() => diagnosticsStore.closePanel()}
      />
    </div>
  );
}
