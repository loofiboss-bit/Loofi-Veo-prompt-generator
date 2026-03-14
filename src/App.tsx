/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from 'zustand';
import { useTranslation } from 'react-i18next';
import type { CommandPaletteCommand } from '@shared/components/layout/CommandPalette';

import { useHistoryState } from '@shared/hooks/useHistoryState';
import { usePromptLogic } from '@shared/hooks/usePromptLogic';
import { useAppStore } from '@core/store/useAppStore';
import { useVideoStore } from '@core/store/useVideoStore';
import { useAppSync } from '@shared/hooks/useAppSync';
import { useAutoSaveHistory } from '@shared/hooks/useAutoSaveHistory';
import { useProjectStore } from '@core/store/useProjectStore';
import { useOnboarding } from '@shared/contexts/OnboardingContext';
import { hasApiKeyAsync } from '@core/services/apiKeyService';
import { themeService } from '@core/services/themeService';

import { AppLoadingGate, AppScaffold } from '@shared/components/layout';
import { PromptLogicProvider } from '@shared/contexts/PromptLogicContext';

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
import { useAppCollaborationState } from '@shared/hooks/useAppCollaborationState';
import { useAppPanelsProps } from '@shared/hooks/useAppPanelsProps';
import { useAppOverlaysProps } from '@shared/hooks/useAppOverlaysProps';

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

  // ---------- Collaboration & optimization panels (v3.4.0 – v3.6.0) ----------
  const {
    isOptimizePanelOpen,
    toggleOptimizePanel,
    isShareDialogOpen,
    setIsShareDialogOpen,
    isProfileSetupOpen,
    setIsProfileSetupOpen,
    isCommentPanelOpen,
    setIsCommentPanelOpen,
    isRoleManagerOpen,
    setIsRoleManagerOpen,
  } = useAppCollaborationState();

  // ---------- Local state ----------
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    try {
      return localStorage.getItem('hasSeenWelcome') === 'true';
    } catch {
      return false;
    }
  });
  const [isExamplesVisible, setIsExamplesVisible] = useState(true);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
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
  const promptLogic = usePromptLogic({ promptState, setPromptState, addToast });
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
    handleCheckboxChange,
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
    let isCancelled = false;

    void (async () => {
      const configured = await hasApiKeyAsync();
      if (!isCancelled) {
        setApiKeyConfigured(configured);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [location.pathname]);

  // Auto-save generated prompts to history (debounced)
  useAutoSaveHistory(promptLogic.generatedPrompt, promptState);

  // ---------- Keyboard shortcuts ----------
  const handleOpenSavePresetModal = useCallback(
    () => openModal('isSavePresetModalOpen'),
    [openModal],
  );

  const handleToggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen((prev) => !prev);
  }, []);

  const handleCloseCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const modalState = useMemo(
    () => ({
      isHistoryOpen: store.isHistoryOpen,
      isTemplatesOpen: store.isTemplatesOpen,
      isDNAModalOpen: store.isDNAModalOpen,
      isCharacterBankOpen: store.isCharacterBankOpen,
      isLocationBankOpen: store.isLocationBankOpen,
      isProjectManagerOpen: store.isProjectManagerOpen,
      isWizardOpen: store.isWizardOpen,
      isSeriesBibleOpen: store.isSeriesBibleOpen,
    }),
    [
      store.isHistoryOpen,
      store.isTemplatesOpen,
      store.isDNAModalOpen,
      store.isCharacterBankOpen,
      store.isLocationBankOpen,
      store.isProjectManagerOpen,
      store.isWizardOpen,
      store.isSeriesBibleOpen,
    ],
  );

  useAppKeyboardShortcuts({
    onGeneratePrompt: promptLogic.handleGeneratePrompt,
    isLoading: promptLogic.isLoading,
    onOpenHelpPanel: openHelpPanel,
    onOpenSavePresetModal: handleOpenSavePresetModal,
    onToggleCommandPalette: handleToggleCommandPalette,
    activeStudio,
    modalState,
  });

  // ---------- Section toggle helper ----------
  const handleToggleSection = useCallback((section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    );
  }, []);

  const handleSidebarNavigate = useCallback(
    (section: string) => {
      if (section === 'composer') {
        navigate('/composer');
      } else {
        if (location.pathname !== '/') navigate('/');
        setActiveSection(section);
      }
    },
    [navigate, location.pathname],
  );

  const commandPaletteCommands = useMemo<CommandPaletteCommand[]>(
    () => [
      {
        id: 'open-search',
        label: t('commandPalette.commands.search', 'Open Search'),
        description: t(
          'commandPalette.commands.searchDescription',
          'Find prompts, templates, and history',
        ),
        shortcut: 'Ctrl+F',
        group: t('commandPalette.groups.navigation', 'Navigation'),
        keywords: ['find', 'lookup', 'discover'],
        action: () => openModal('isSearchOpen'),
      },
      {
        id: 'open-history',
        label: t('commandPalette.commands.history', 'Open History'),
        description: t(
          'commandPalette.commands.historyDescription',
          'Review and reuse generated prompts',
        ),
        group: t('commandPalette.groups.workspace', 'Workspace'),
        keywords: ['recent', 'past', 'archive'],
        action: () => openModal('isHistoryOpen'),
      },
      {
        id: 'open-templates',
        label: t('commandPalette.commands.templates', 'Open Templates'),
        description: t(
          'commandPalette.commands.templatesDescription',
          'Apply saved and built-in templates',
        ),
        group: t('commandPalette.groups.workspace', 'Workspace'),
        keywords: ['preset', 'saved', 'starter'],
        action: () => openModal('isTemplatesOpen'),
      },
      {
        id: 'open-project-manager',
        label: t('commandPalette.commands.projects', 'Open Project Manager'),
        description: t(
          'commandPalette.commands.projectsDescription',
          'Switch, load, and manage projects',
        ),
        group: t('commandPalette.groups.workspace', 'Workspace'),
        keywords: ['workspace', 'switch', 'manage'],
        action: () => openModal('isProjectManagerOpen'),
      },
      {
        id: 'open-settings',
        label: t('commandPalette.commands.settings', 'Open Settings'),
        description: t(
          'commandPalette.commands.settingsDescription',
          'Configure app preferences and integrations',
        ),
        shortcut: 'Ctrl+,',
        group: t('commandPalette.groups.navigation', 'Navigation'),
        keywords: ['preferences', 'config', 'options'],
        action: () => navigate('/settings'),
      },
      {
        id: 'open-help',
        label: t('commandPalette.commands.help', 'Open Help Panel'),
        description: t(
          'commandPalette.commands.helpDescription',
          'Show keyboard shortcuts and guidance',
        ),
        shortcut: '?',
        group: t('commandPalette.groups.navigation', 'Navigation'),
        keywords: ['guide', 'shortcuts', 'support'],
        action: () => openHelpPanel(),
      },
      {
        id: 'open-batch',
        label: t('commandPalette.commands.batch', 'Open Batch Generator'),
        description: t(
          'commandPalette.commands.batchDescription',
          'Generate prompt sets in batches',
        ),
        group: t('commandPalette.groups.creation', 'Creation'),
        keywords: ['bulk', 'multiple', 'queue'],
        action: () => setIsBatchModalOpen(true),
      },
      {
        id: 'open-optimize',
        label: t('commandPalette.commands.optimize', 'Open Optimize Panel'),
        description: t(
          'commandPalette.commands.optimizeDescription',
          'Review project optimization suggestions',
        ),
        group: t('commandPalette.groups.creation', 'Creation'),
        keywords: ['improve', 'performance', 'suggestions'],
        action: () => toggleOptimizePanel(),
      },
      {
        id: 'open-collaboration',
        label: t('commandPalette.commands.collaborate', 'Open Collaboration'),
        description: t(
          'commandPalette.commands.collaborateDescription',
          'Share and collaborate on current project',
        ),
        group: t('commandPalette.groups.collaboration', 'Collaboration'),
        keywords: ['share', 'team', 'comments'],
        action: () => setIsShareDialogOpen(true),
      },
    ],
    [openModal, navigate, openHelpPanel, toggleOptimizePanel, setIsShareDialogOpen, t],
  );

  const handleSetIsEditing = useCallback(
    (editing: boolean) => {
      setIsEditing(editing);
      if (editing && promptLogic.generatedPrompt) {
        setEditedPrompt(promptLogic.generatedPrompt.prompt);
      }
    },
    [promptLogic.generatedPrompt, setEditedPrompt],
  );

  const handleCloseWelcome = useCallback(() => {
    try {
      localStorage.setItem('hasSeenWelcome', 'true');
    } catch {
      // Private browsing or quota exceeded
    }
    setHasSeenWelcome(true);
  }, []);

  const handleCloseDiagnostics = useCallback(() => {
    diagnosticsStore.closePanel();
  }, [diagnosticsStore]);

  const handleCloseBatchModal = useCallback(() => {
    setIsBatchModalOpen(false);
  }, []);

  const handleCloseJobsPanel = useCallback(() => {
    setIsJobsPanelOpen(false);
  }, []);

  const handleCloseWorkspaceManager = useCallback(() => {
    setIsWorkspaceManagerOpen(false);
  }, []);

  const handleCloseQueuePanel = useCallback(() => {
    setIsQueuePanelOpen(false);
  }, []);

  const collaborationPanelsProps = useMemo(
    () => ({
      isOptimizePanelOpen,
      onCloseOptimizePanel: toggleOptimizePanel,
      isShareDialogOpen,
      onCloseShareDialog: () => setIsShareDialogOpen(false),
      isProfileSetupOpen,
      onCloseProfileSetup: () => setIsProfileSetupOpen(false),
      isCommentPanelOpen,
      onCloseCommentPanel: () => setIsCommentPanelOpen(false),
      isRoleManagerOpen,
      onCloseRoleManager: () => setIsRoleManagerOpen(false),
      currentProjectId,
      currentProjectName,
    }),
    [
      isOptimizePanelOpen,
      toggleOptimizePanel,
      isShareDialogOpen,
      setIsShareDialogOpen,
      isProfileSetupOpen,
      setIsProfileSetupOpen,
      isCommentPanelOpen,
      setIsCommentPanelOpen,
      isRoleManagerOpen,
      setIsRoleManagerOpen,
      currentProjectId,
      currentProjectName,
    ],
  );

  const appPanelsProps = useAppPanelsProps({
    isBatchModalOpen,
    onCloseBatchModal: handleCloseBatchModal,
    addToast,
    isJobsPanelOpen,
    onCloseJobsPanel: handleCloseJobsPanel,
    isWorkspaceManagerOpen,
    onCloseWorkspaceManager: handleCloseWorkspaceManager,
    isQueuePanelOpen,
    onCloseQueuePanel: handleCloseQueuePanel,
    fallbackNotification,
    onDismissFallback: dismissFallback,
  });

  const appOverlaysProps = useAppOverlaysProps({
    toasts,
    dismissToast,
    hasSeenWelcome,
    onCloseWelcome: handleCloseWelcome,
    showHelpPanel,
    closeHelpPanel,
    helpPanelTopic,
    helpPanelCategory,
    isDiagnosticsOpen,
    onCloseDiagnostics: handleCloseDiagnostics,
    commandPalette: {
      isOpen: isCommandPaletteOpen,
      onClose: handleCloseCommandPalette,
      commands: commandPaletteCommands,
      title: t('commandPalette.title', 'Command Palette'),
      recentTitle: t('commandPalette.recent', 'Recent'),
      searchPlaceholder: t('commandPalette.searchPlaceholder', 'Type a command...'),
      emptyMessage: t('commandPalette.empty', 'No commands match your search.'),
    },
  });

  // ---------- Loading gate ----------
  if (!_hasHydrated) return <AppLoadingGate />;

  return (
    <PromptLogicProvider value={promptLogic}>
      <AppScaffold
        skipToContentLabel={t('common:skipToContent', 'Skip to main content')}
        pathname={location.pathname}
        isChildRoute={isChildRoute}
        activeSection={activeSection}
        sidebarProps={{
          onNavigate: handleSidebarNavigate,
          onOpenProject: () => openModal('isProjectManagerOpen'),
          onOpenHistory: () => openModal('isHistoryOpen'),
          onOpenTemplates: () => openModal('isTemplatesOpen'),
          onOpenSettings: () => navigate('/settings'),
          onOpenPlugins: () => navigate('/settings'),
          onOpenDiagnostics: () => diagnosticsStore.openPanel(),
          onOpenBatchGenerator: () => setIsBatchModalOpen(true),
          onOpenJobsPanel: () => setIsJobsPanelOpen(true),
          onOpenWorkspaceManager: () => setIsWorkspaceManagerOpen(true),
          onOpenQueue: () => setIsQueuePanelOpen(true),
          onOpenHelpPanel: () => openHelpPanel(),
          onOpenOptimize: toggleOptimizePanel,
          onOpenCollaborate: () => setIsShareDialogOpen(true),
          onOpenComments: () => setIsCommentPanelOpen(true),
          onOpenRoles: () => setIsRoleManagerOpen(true),
          diagnosticIssueCount,
          pendingJobCount,
          isApiConfigured: apiKeyConfigured,
        }}
        headerProps={{
          onShowHistory: () => openModal('isHistoryOpen'),
          historyButtonText: t('common:historyButton'),
          onShowImageStudio: () => openStudioSafely('image'),
          imageStudioButtonText: t('common:imageStudioButton'),
          onShowSunoStudio: () => openStudioSafely('suno'),
          sunoStudioButtonText: t('common:sunoStudioButton'),
          onShowVideoAnalysis: () => openStudioSafely('analysis'),
          isSyncConnected,
          theme,
          onThemeToggle: handleThemeToggle,
          onStartTutorial: restartTutorial,
          onResetAll: handleResetAll,
          onShowSearch: () => openModal('isSearchOpen'),
          onShowVideoStudio: () => openStudioSafely('video'),
          onOpenWizard: () => openModal('isWizardOpen'),
          onOpenStoryBoard: () => openStudioSafely('story'),
          onOpenCharacterBank: () => openModal('isCharacterBankOpen'),
          onOpenLocationBank: () => openModal('isLocationBankOpen'),
          onOpenProjectManager: () => openModal('isProjectManagerOpen'),
          onOpenSeriesBible: () => openModal('isSeriesBibleOpen'),
          onOpenVariablesPanel: () => openModal('isVariablesPanelOpen'),
          onOpenScriptStudio: () => openStudioSafely('script'),
          currentProjectName,
        }}
        promptWorkspaceProps={{
          promptState,
          promptId: currentProjectId || 'default',
          handleInputChange,
          handleCheckboxChange,
          handleTargetModelChange,
          handleImageUpload,
          handleImageClear,
          uploadedImageUrl,
          handleAudioMixChange,
          handleAudioUpload,
          handleAudioClear,
          errors: promptLogic.errors,
          addToast,
          openHelpPanel,
          ideaInputRef,
          openSections,
          onToggleSection: handleToggleSection,
          activeTabIndex,
          onTabChange: setActiveTabIndex,
          openStudioSafely,
          promptOptions,
          isBrainstorming: generationState.isBrainstorming,
          isAutoFilling: promptLogic.isAutoFilling,
          handleBrainstormIdeas: generationState.handleBrainstormIdeas,
          handleAutoFillModifiers: promptLogic.handleAutoFillModifiers,
          handleEnhanceIdea,
          isEnhancingIdea,
          isEditing,
          editedPrompt,
          onSetIsEditing: handleSetIsEditing,
          onSetEditedPrompt: setEditedPrompt,
          canUndoEdit,
          onUndoEdit: undoEdit,
          canRedoEdit,
          onRedoEdit: redoEdit,
          canUndoPromptState,
          onUndoPromptState: undoPromptState,
          canRedoPromptState,
          onRedoPromptState: redoPromptState,
          isGeneratingArt: generationState.isGeneratingArt,
          onGenerateArt: generationState.handleGenerateArt,
          isGeneratingVideo,
          onGenerateVideo: () => openStudioSafely('video'),
          isGeneratingStoryboard: generationState.isGeneratingStoryboard,
          onGenerateStoryboard: generationState.handleGenerateStoryboard,
          isGeneratingVariations: generationState.isGeneratingVariations,
          onGenerateVariations: generationState.handleGenerateVariations,
          handleNewPrompt,
          handleSavePrompt,
          saveToHistory,
          handleShare,
          handleDownloadPrompt,
          onOpenSavePresetModal: () => openModal('isSavePresetModalOpen'),
          onOpenTemplatesPanel: () => openModal('isTemplatesOpen'),
          onCompareModels: () => openStudioSafely('compare'),
          onOpenVisualDNA: () => openModal('isDNAModalOpen'),
          storyboardImages: generationState.storyboardImages,
          conceptArtImage: generationState.conceptArtImage,
          isExamplesVisible,
          onCloseExamples: () => setIsExamplesVisible(false),
          examplePrompts: promptOptions.examplePrompts,
          handleUseExample,
        }}
        modalManagerProps={{ addToast, handlers: modalHandlers }}
        collaborationPanelsProps={collaborationPanelsProps}
        appPanelsProps={appPanelsProps}
        appOverlaysProps={appOverlaysProps}
      />
    </PromptLogicProvider>
  );
}
