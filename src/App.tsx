/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from 'zustand';
import { PromptState } from '@core/types';
import { appUIStrings } from '@core/constants/translations';

import { useHistoryState } from '@shared/hooks/useHistoryState';
import { usePromptLogic } from '@shared/hooks/usePromptLogic';
import { useAppStore } from '@core/store/useAppStore';
import { useVideoStore } from '@core/store/useVideoStore';
import { useAppSync } from '@shared/hooks/useAppSync';
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
  const t = useMemo(
    () => appUIStrings[promptState.language] || appUIStrings['en'],
    [promptState.language],
  );

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
  const promptLogic = usePromptLogic({ promptState, setPromptState, addToast, userCoords, t });
  const generationState = useGenerationState({ promptState, addToast, t });
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
    t,
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

  // Auto-save to history when prompt is generated (debounced to avoid excessive writes)
  useEffect(() => {
    if (!promptLogic.generatedPrompt?.prompt) return;

    const timeout = setTimeout(() => {
      const autoSaveToHistory = async () => {
        try {
          await historyStore.addEntry({
            projectId: projectStore.currentProjectId || 'default',
            prompt: promptLogic.generatedPrompt!.prompt,
            params: promptState,
            metadata: {
              style: promptState.artStyle,
              camera: promptState.cameraMovement,
              scene: promptState.environment,
              character: promptState.characterAge,
              audio: promptState.voiceStyle,
              aspectRatio: promptState.aspectRatio,
              model: promptState.model,
            },
            tags: [],
            favorite: false,
          });
        } catch (error) {
          logger.error('Failed to auto-save to history:', error);
        }
      };

      autoSaveToHistory();
    }, 500);

    return () => clearTimeout(timeout);
  }, [promptLogic.generatedPrompt, promptState, historyStore, projectStore.currentProjectId]);

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
            addToast(t.toastLocationAcquired, 'info');
          },
          () => {
            addToast(t.toastLocationError, 'error');
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

      {/* Child routes (Composer, Settings, etc.) */}
      {isChildRoute && (
        <div className="ml-0 lg:ml-64">
          <Outlet />
        </div>
      )}

      <div
        className={`relative z-10 h-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-6 pb-12 ml-0 lg:ml-64 transition-all duration-300 ${isChildRoute ? 'hidden' : ''}`}
      >
        <ErrorBoundary panelId="app-header-panel">
          <Header
            onShowHistory={() => openModal('isHistoryOpen')}
            historyButtonText={t.historyButton}
            onShowImageStudio={() => openStudioSafely('image')}
            imageStudioButtonText={t.imageStudioButton}
            onShowSunoStudio={() => openStudioSafely('suno')}
            sunoStudioButtonText={t.sunoStudioButton}
            onShowVideoAnalysis={() => openStudioSafely('analysis')}
            isSyncConnected={isSyncConnected}
            theme={theme}
            onThemeToggle={handleThemeToggle}
            onStartTutorial={restartTutorial}
            uiStrings={t}
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
          t={t}
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
        <ModalManager t={t} addToast={addToast} handlers={modalHandlers} />
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
