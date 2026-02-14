/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import {
  HistoryEntry,
  PromptTemplate,
  CustomPreset,
  ExamplePrompt,
  VisualDNA,
  CharacterProfile,
  Project,
  PromptState,
} from '@core/types';
import { CHARACTER_LIMITS, INITIAL_STATE } from '@core/constants';
import { appUIStrings } from '@core/constants/translations';
import { validateField } from '@core/utils/validation';
import * as geminiService from '@core/services/geminiService';

import { performanceService } from '@core/services/performanceService';
import { useHistoryState } from '@shared/hooks/useHistoryState';
import { usePromptLogic } from '@shared/hooks/usePromptLogic';
import { videoGenerationService } from '@core/services/videoGenerationService';
import { useAppStore } from '@core/store/useAppStore';
import { useVideoStore } from '@core/store/useVideoStore';
import { pluginService } from '@core/services/pluginService';
import { useAppSync } from '@shared/hooks/useAppSync';
import { useHotkeys } from '@shared/hooks/useHotkeys';
import { useLocationStore } from '@core/store/useLocationStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useHistoryStore } from '@core/store/useHistoryStore';
import { databaseService } from '@core/services/databaseService';
import { performanceProfiler } from '@core/services/performanceProfiler';
import { useOnboarding } from '@shared/contexts/OnboardingContext';
import { registerInternalPlugins } from '@core/config/internalPlugins';

import { Header, ActionBar, Sidebar, ModalManager } from '@shared/components/layout';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import PromptOutput from '@features/prompt/PromptOutput';
import ExamplesCarousel from '@features/prompt/ExamplesCarousel';
// Lazy load non-critical components
const ChatBot = React.lazy(() => import('@features/help/ChatBot'));
import Toast from '@shared/components/ui/Toast';
import CollapsibleSection from '@shared/components/ui/CollapsibleSection';
import PromptBuilderSummary from '@features/prompt/PromptBuilderSummary';
import TargetModelToggle from '@features/prompt/TargetModelToggle';
import Icon from '@shared/components/ui/Icon';
import CheckboxInput from '@shared/components/ui/CheckboxInput';
import ImageUploadInput from '@features/prompt/ImageUploadInput';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import Tabs from '@shared/components/ui/Tabs';
import AssetLibrary from '@features/prompt/AssetLibrary';
import { hasApiKey } from '@core/services/apiKeyService';
// Lazy load onboarding and help components
const WelcomeModal = React.lazy(() =>
  import('./components/onboarding').then((module) => ({ default: module.WelcomeModal })),
);
const TutorialOverlay = React.lazy(() =>
  import('./components/onboarding').then((module) => ({ default: module.TutorialOverlay })),
);
const HelpPanel = React.lazy(() =>
  import('@features/help').then((module) => ({ default: module.HelpPanel })),
);
const ContextualHelp = React.lazy(() =>
  import('@features/help').then((module) => ({ default: module.ContextualHelp })),
);
import { UpdateNotification } from '@features/settings/updates/components/UpdateNotification';
const SettingsModal = React.lazy(() =>
  import('@features/settings/SettingsModal').then((module) => ({ default: module.SettingsModal })),
);

// Import Tab Components via Lazy Loading
const StyleTab = React.lazy(() => import('@features/prompt/tabs/StyleTab'));
const CameraTab = React.lazy(() => import('@features/prompt/tabs/CameraTab'));
const SceneTab = React.lazy(() => import('@features/prompt/tabs/SceneTab'));
const CharacterTab = React.lazy(() => import('@features/prompt/tabs/CharacterTab'));
const AudioTab = React.lazy(() => import('@features/prompt/tabs/AudioTab'));
const AdvancedTab = React.lazy(() => import('@features/prompt/tabs/AdvancedTab'));
import { ProjectTemplate } from '@core/config/projectTemplates';
import { usePromptOptions } from '@shared/hooks/usePromptOptions';
import { useHelpPanel } from '@shared/hooks/useHelpPanel';
import { useSafeMode } from '@shared/hooks/useSafeMode';
import { useGenerationState } from '@shared/hooks/useGenerationState';
import { useToastManager } from '@shared/hooks/useToastManager';

// Loading Fallback Component
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-500 text-sm">Loading module...</span>
    </div>
  </div>
);

// Helper to safely truncate text to defined limits
const truncateText = (text: string, limit?: number) => {
  if (!text || !limit || text.length <= limit) return text;
  const sub = text.substring(0, limit);
  const lastSpace = sub.lastIndexOf(' ');
  if (lastSpace > 0 && sub.length - lastSpace < 15) {
    return sub.substring(0, lastSpace);
  }
  return sub;
};

export function App() {
  // Performance: end the app-startup mark started in index.tsx
  useEffect(() => {
    performanceService.endMark('app-startup');
  }, []);

  // --- Extracted Hooks ---
  const {
    isSafeMode: _isSafeMode,
    safeModeStatus,
    handleExitSafeMode: _handleExitSafeMode,
  } = useSafeMode();
  const { showHelpPanel, helpPanelTopic, helpPanelCategory, openHelpPanel, closeHelpPanel } =
    useHelpPanel();

  // Use Zustand Store
  const store = useAppStore();
  const {
    promptState,
    setPromptState,
    resetAll,
    setFullState, // For loading projects
    applyTemplate,
    _hasHydrated,

    // UI Actions from Slice
    openModal,
    openStudio,
    activeStudio,
    toggleTheme,
    theme,
    setNewProjectWizardOpen,
  } = store;

  const { setLocations } = useLocationStore();
  const projectStore = useProjectStore();
  const historyStore = useHistoryStore();
  const { restartTutorial } = useOnboarding();

  // Initialize sync
  const isSyncConnected = useAppSync();

  // Placeholder stubs for the ActionBar interface:
  const canUndoPromptState = false;
  const canRedoPromptState = false;
  const undoPromptState = () => {};
  const redoPromptState = () => {};

  const { toasts, addToast, dismissToast } = useToastManager();
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

  // Memoize translation to prevent unnecessary re-renders
  const t = useMemo(
    () => appUIStrings[promptState.language] || appUIStrings['en'],
    [promptState.language],
  );

  // --- Initialize Hooks ---
  const isGeneratingVideo = useVideoStore((state) => state.isGenerating);

  const {
    generatedPrompt,
    setGeneratedPrompt,
    isLoading,
    errors,
    setErrors,

    isAutoFilling,
    isSuggestingFullAudio,
    isAnalyzingAudio,
    isSuggestingArtStyle,
    isSuggestingEffect,
    isSuggestingAdvanced,
    isSuggestingEnvironment,
    isSuggestingSensoryDetails,
    isSuggestingCamera,
    isSuggestingActions,
    isRestructuring,
    isRefining,
    isGeneratingVisualDNA,

    handleGeneratePrompt,
    handleAutoFillModifiers,
    handleSuggestFullAudioDesign,
    handleSuggestEnvironmentDetails,
    handleSuggestSensoryDetails,
    handleSuggestVisualEffect,
    handleSuggestAdvancedSettings,
    handleSuggestArtStyles,
    handleTriggerCharacterDetails,
    handleAnalyzeAudio,
    handleSuggestCameraSetup,
    handleSuggestCharacterActions,
    handleRestructurePrompt,
    handleRefinePrompt,
    handleGenerateVisualDNA,
  } = usePromptLogic({ promptState, setPromptState, addToast, userCoords, t });

  // --- Generation State (extracted hook) ---
  const {
    promptVariations,
    isGeneratingVariations,
    isBrainstorming,
    isGeneratingArt,
    conceptArtImage,
    setConceptArtImage,
    isGeneratingStoryboard,
    storyboardImages,
    setStoryboardImages,
    handleGenerateVariations,
    handleBrainstormIdeas,
    handleGenerateArt,
    handleGenerateStoryboard,
    resetGenerationState,
  } = useGenerationState({ promptState, addToast, t });

  // --- Prompt Options (extracted hook) ---
  const {
    modelOptions,
    artStyleOptions,
    cameraMovementOptions,
    cameraDistanceOptions,
    lensTypeOptions,
    visualEffectOptions,
    colorPaletteOptions,
    aspectRatioOptions,
    resolutionOptions,
    animationPresetOptions,
    voiceStyleOptions,
    timeOfDayOptions,
    weatherOptions,
    motionIntensityOptions,
    creativityLevelOptions,
    characterGenderOptions,
    characterEthnicityOptions,
    characterClothingOptions,
    characterArchetypeOptions,
    characterAgeOptions,
    characterMoodOptions,
    characterPoseOptions,
    characterSkinToneOptions,
    ambientSoundOptions,
    soundEffectsIntensityOptions,
    architecturalStyleOptions,
    lightingStyleOptions,
    compositionalGuideOptions,
    examplePrompts,
  } = usePromptOptions(promptState.language);

  // Derive project context from project store (single source of truth)
  const currentProjectId = projectStore.currentProjectId;
  const currentProjectName =
    projectStore.projects.find((p) => p.id === currentProjectId)?.name ?? null;

  const [isExamplesVisible, setIsExamplesVisible] = useState(true);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(hasApiKey());

  // Check for API key on mount and show modal if missing
  useEffect(() => {
    if (_hasHydrated && !hasApiKey()) {
      setIsSettingsModalOpen(true);
    }
  }, [_hasHydrated, currentProjectId, promptState.idea, setNewProjectWizardOpen]);

  // Initialize database service and ensure default project exists
  useEffect(() => {
    if (!_hasHydrated) return;

    const initializeDatabase = async () => {
      try {
        await databaseService.initialize();
        await projectStore.initialize();
        // Initialize plugin service
        await pluginService.initialize();
        await registerInternalPlugins();

        // Initialize video generation service
        videoGenerationService.initialize();
      } catch (error) {
        console.error('Failed to initialize database/plugins:', error);
        addToast('Initialization failed', 'error');
      }
    };

    initializeDatabase();
  }, [_hasHydrated, projectStore, addToast]);

  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const {
    state: editedPrompt,
    setState: setEditedPrompt,
    undo: undoEdit,
    redo: redoEdit,
    reset: resetEditHistory,
    canUndo: canUndoEdit,
    canRedo: canRedoEdit,
  } = useHistoryState('');

  const [isEnhancingIdea, setIsEnhancingIdea] = useState(false);

  // --- Tutorial and UI State ---
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [openSections, setOpenSections] = useState<string[]>(['core-concept']);
  const [activeSection, setActiveSection] = useState<string>('prompt');

  const ideaInputRef = useRef<HTMLTextAreaElement>(null);
  const didRecordHydration = useRef(false);

  useEffect(() => {
    performanceProfiler.start('app.hydration');
  }, []);

  useEffect(() => {
    if (!_hasHydrated || didRecordHydration.current) return;

    performanceProfiler.end('app.hydration');
    didRecordHydration.current = true;
  }, [_hasHydrated]);

  // Check for fresh state to show New Project Wizard
  useEffect(() => {
    // Logic: If hydrated, and prompt idea is empty, and not visiting from a share link
    if (_hasHydrated) {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedState = urlParams.get('state');

      if (!sharedState && !promptState.idea && !currentProjectId) {
        setNewProjectWizardOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated]);

  const handleImageClear = useCallback(() => {
    setPromptState({ uploadedImage: null, useImageAsCameo: false });
    setUploadedImageUrl(null);
  }, [setPromptState]);

  const handleAudioClear = useCallback(() => {
    setPromptState({ uploadedAudio: null });
  }, [setPromptState]);

  const handleResetAll = useCallback(() => {
    setUploadedImageUrl(null);
    resetAll(); // Reset Zustand state
    setGeneratedPrompt(null);
    setErrors({});
    resetGenerationState();
    setIsEditing(false);
    resetEditHistory('');

    // Clear project context
    projectStore.clearCurrentProject();

    // Re-open wizard for fresh start feeling
    setNewProjectWizardOpen(true);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    resetAll,
    resetEditHistory,
    setGeneratedPrompt,
    setErrors,
    setNewProjectWizardOpen,
    resetGenerationState,
    projectStore,
  ]);

  useEffect(() => {
    if (generatedPrompt && !isEditing) {
      resetEditHistory(generatedPrompt.prompt);
    }
  }, [generatedPrompt, isEditing, resetEditHistory]);

  // --- Character Details Suggestion Trigger ---
  useEffect(() => {
    handleTriggerCharacterDetails();
  }, [handleTriggerCharacterDetails]);

  // Auto-save to history when prompt is generated
  useEffect(() => {
    if (!generatedPrompt || !generatedPrompt.prompt) return;

    const autoSaveToHistory = async () => {
      try {
        await historyStore.addEntry({
          projectId: projectStore.currentProjectId || 'default',
          prompt: generatedPrompt.prompt,
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
        console.error('Failed to auto-save to history:', error);
      }
    };

    autoSaveToHistory();
  }, [generatedPrompt, promptState, historyStore, projectStore.currentProjectId]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.currentTarget;
      const key = name as keyof PromptState;

      const newStateUpdate: Partial<PromptState> = { [key]: value } as Partial<PromptState>;

      if (key === 'voiceStyle' && value === 'None') {
        newStateUpdate.voiceOver = '';
      }

      setPromptState(newStateUpdate);

      // We need the *full* updated state for validation, so we merge
      const updatedState = { ...promptState, ...newStateUpdate };
      const newErrors = { ...errors };

      const currentFieldError = validateField(key, value, updatedState, t);
      if (currentFieldError) {
        newErrors[key] = currentFieldError;
      } else {
        delete newErrors[key];
      }

      setErrors(newErrors);
    },
    [promptState, setPromptState, t, errors, setErrors],
  );

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.currentTarget;
      setPromptState({ [name as keyof PromptState]: checked });

      if (name === 'useGoogleMaps' && checked) {
        if (navigator.geolocation) {
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
      }
    },
    [setPromptState, addToast, t],
  );

  const handleAudioMixChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.currentTarget;
      const mixKey = name.replace('audioMix.', '') as keyof PromptState['audioMix'];
      setPromptState({
        audioMix: {
          ...promptState.audioMix,
          [mixKey]: parseInt(value, 10),
        },
      });
    },
    [promptState.audioMix, setPromptState],
  );

  const handleImageUpload = useCallback(
    (image: { data: string; mimeType: string; url: string }) => {
      setPromptState({ uploadedImage: { data: image.data, mimeType: image.mimeType } });
      setUploadedImageUrl(image.url);
    },
    [setPromptState],
  );

  const handleAudioUpload = useCallback(
    (audio: { data: string; mimeType: string; name: string }) => {
      setPromptState({ uploadedAudio: audio });
    },
    [setPromptState],
  );

  const handleNewPrompt = useCallback(() => {
    setPromptState(INITIAL_STATE, 'replace');
    setGeneratedPrompt(null);
    setErrors({});
    resetGenerationState();
    handleImageClear();
    handleAudioClear();
    setIsEditing(false);
    resetEditHistory('');

    // Clear project context
    projectStore.clearCurrentProject();

    // Open wizard for new direction
    setNewProjectWizardOpen(true);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    setPromptState,
    handleImageClear,
    handleAudioClear,
    resetEditHistory,
    setGeneratedPrompt,
    setErrors,
    setNewProjectWizardOpen,
    resetGenerationState,
    projectStore,
  ]);

  const handleSavePrompt = useCallback(
    (newPrompt: string) => {
      const currentGrounding = generatedPrompt?.groundingChunks || [];
      const updatedPrompt = { prompt: newPrompt, groundingChunks: currentGrounding };
      setGeneratedPrompt(updatedPrompt);
      setIsEditing(false);
      addToast(t.toastPromptSaved, 'success');
    },
    [generatedPrompt, addToast, t, setGeneratedPrompt],
  );

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

  // Handlers for ModalManager
  const handlers = {
    handleUseHistoryEntry: (entry: HistoryEntry) => {
      setPromptState(entry.params, 'replace');
      setGeneratedPrompt({ prompt: entry.prompt, groundingChunks: entry.groundingChunks });
      store.closeModal('isHistoryOpen');
      setConceptArtImage(null);
      setStoryboardImages([]);
      addToast(t.toastHistoryLoaded, 'info');
    },
    handleClearHistory: () => store.clearHistory(),
    handleDeleteHistoryEntry: (id: string) => store.deleteHistoryEntry(id),
    handleUsePresetOrTemplate: useCallback(
      (preset: PromptTemplate | CustomPreset) => {
        setPromptState(
          { ...INITIAL_STATE, language: promptState.language, ...preset.params },
          'replace',
        );
        setGeneratedPrompt(null);
        setErrors({});
        store.closeModal('isTemplatesOpen');
        store.closeModal('isSearchOpen');
        setConceptArtImage(null);
        setStoryboardImages([]);
        addToast(t.toastTemplateApplied, 'info');
        ideaInputRef.current?.focus();
      },
      [
        promptState.language,
        setPromptState,
        addToast,
        t,
        setGeneratedPrompt,
        setErrors,
        store,
        setConceptArtImage,
        setStoryboardImages,
      ],
    ),
    handleSavePreset: (name: string) => {
      if (!name.trim()) {
        addToast(t.errorPresetNameRequired, 'error');
        return;
      }
      const newPreset: CustomPreset = {
        id: Date.now().toString(),
        name: name.trim(),
        params: promptState,
      };
      store.addPreset(newPreset);
      addToast(t.toastPresetSaved, 'success');
      store.closeModal('isSavePresetModalOpen');
    },
    handleDeletePreset: (id: string) => {
      store.deletePreset(id);
      addToast(t.toastPresetDeleted, 'success');
    },
    handleUpdatePreset: (updatedPreset: CustomPreset) => {
      store.updatePreset(updatedPreset);
      addToast(t.toastPresetSaved, 'success');
    },
    handleSaveDNA: (name: string, styleParams: Partial<PromptState>) => {
      const newDNA: VisualDNA = {
        id: Date.now().toString(),
        name,
        timestamp: Date.now(),
        styleParams,
      };
      store.addVisualDNA(newDNA);
      addToast('Visual DNA Saved', 'success');
    },
    handleApplyDNA: (dna: VisualDNA) => {
      setPromptState(dna.styleParams);
      addToast('Visual DNA Injected', 'success');
    },
    handleDeleteDNA: (id: string) => store.deleteVisualDNA(id),
    handleLoadProject: (project: Project) => {
      setFullState({
        promptState: project.promptState,
        sbGlobalContext: project.storyboard.globalContext,
        sbShots: project.storyboard.shots,
        sbTimeline: project.storyboard.timeline,
        characterBank: project.characterBank,
        visualDNA: project.visualDNA,
      });
      setLocations(project.locationBank || []);

      projectStore.setCurrentProject(project.id);
    },
    handleUpdateProjectMeta: (id: string, _name: string) => {
      projectStore.setCurrentProject(id);
      projectStore.refreshProjects();
    },
    handleResetAll,
    handleWizardComplete: (newState: Partial<PromptState>) => {
      const truncatedState: Partial<PromptState> = {};
      const stateRecord = newState as Record<string, unknown>;
      Object.keys(newState).forEach((key) => {
        const limit = CHARACTER_LIMITS[key as keyof typeof CHARACTER_LIMITS];
        const value = stateRecord[key];
        if (typeof value === 'string' && limit) {
          (truncatedState as Record<string, unknown>)[key] = truncateText(value, limit);
        } else {
          (truncatedState as Record<string, unknown>)[key] = value;
        }
      });
      setPromptState(truncatedState);
      addToast('Wizard configuration applied!', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    handleSelectTemplate: (template: ProjectTemplate) => {
      applyTemplate(template.settings);
      store.setNewProjectWizardOpen(false);
      if (template.autoOpen) {
        openStudioSafely(template.autoOpen);
      }
      addToast(`${template.label} workspace configured.`, 'success');
    },
    handleSelectCharacter: useCallback(
      (profile: CharacterProfile) => {
        setPromptState({
          characterAge: profile.attributes.age,
          characterGender: profile.attributes.gender,
          characterEthnicity: profile.attributes.ethnicity,
          characterSkinTone: profile.attributes.skinTone,
          characterSpecificClothing: profile.wardrobe,

          // Identity Lock Injection
          characterVisualDNA: profile.visualPrompt,
          characterFixedSeed: profile.fixedSeed,
          characterNegativePrompt: profile.negativePrompt,
        });
        addToast('Character applied with Identity Lock', 'success');
      },
      [setPromptState, addToast],
    ),
    handleUpdateSpatialMotion: (gridId: string, motion: string) => {
      setPromptState({
        spatialMotions: {
          ...promptState.spatialMotions,
          [gridId]: motion,
        },
      });
    },
    handleClearSpatialMotions: () => {
      setPromptState({ spatialMotions: {} });
    },
    handleSelectVariation: (variation: string) => {
      handleSavePrompt(variation);
      store.closeModal('isVariationsOpen');
    },
    handleUseAnalysis: (text: string) => setPromptState({ idea: text }),
    handleCompareSelect: (prompt: string, model: 'veo' | 'sora') => {
      setPromptState({ targetModel: model });
      setGeneratedPrompt({ prompt });
      addToast(`Applied ${model === 'veo' ? 'Veo' : 'Sora'} prompt.`, 'success');
    },
    // State needed for ModalManager render
    promptVariations,
    isGeneratingVariations,
    isBrainstorming,
    uploadedImageUrl,
    currentProjectName,
    currentProjectId,
    generatedPrompt,
  };

  const handleUseExample = useCallback(
    (example: ExamplePrompt) => {
      setPromptState(
        { ...INITIAL_STATE, language: promptState.language, ...example.params },
        'replace',
      );
      setGeneratedPrompt({ prompt: example.prompt, groundingChunks: example.groundingChunks });
      setErrors({});
      resetGenerationState();
      addToast(t.toastTemplateApplied, 'info');
      ideaInputRef.current?.focus();
    },
    [
      promptState.language,
      setPromptState,
      addToast,
      t,
      setGeneratedPrompt,
      setErrors,
      resetGenerationState,
    ],
  );

  // Wrapper for handleRefinePrompt to handle state if editing
  const handleRefinePromptWrapper = async (text: string) => {
    await handleRefinePrompt(text);
    if (isEditing) {
      setIsEditing(false); // Exit edit mode to show the new refined prompt
    }
  };

  const handleDownloadPrompt = (promptText: string) => {
    performanceService.startMark('export-prompt');
    const blob = new Blob([promptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'veo-prompt.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    performanceService.endMark('export-prompt');
    addToast(t.toastPromptDownloaded, 'success');
  };

  const handleShare = () => {
    const url = new URL(window.location.href);
    const stateToShare = { ...promptState, generatedPrompt: generatedPrompt };
    const encodedState = btoa(JSON.stringify(stateToShare));
    url.searchParams.set('state', encodedState);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url.toString());
      addToast(t.toastShareLink, 'success');
    }
  };

  const saveToHistory = useCallback(() => {
    if (!generatedPrompt) {
      addToast(t.errorNoPromptToSave, 'error');
      return;
    }
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      params: promptState,
      prompt: generatedPrompt.prompt,
      groundingChunks: generatedPrompt.groundingChunks,
    };
    store.addToHistory(newEntry);
    addToast(t.toastHistorySaved, 'success');
  }, [promptState, generatedPrompt, addToast, t, store]);

  const handleTargetModelChange = useCallback(
    (newModel: 'veo' | 'sora') => {
      const updates: Partial<PromptState> = { targetModel: newModel };

      if (newModel === 'sora' && promptState.artStyle === 'Cinematic') {
        updates.artStyle = 'Photorealistic';
        addToast(t.toastSoraStyleSet, 'info');
      }

      setPromptState(updates);
    },
    [promptState.artStyle, setPromptState, addToast, t],
  );

  // --- Keyboard Shortcuts Integration ---
  useHotkeys(
    {
      'CTRL+ENTER': () => {
        if (!isLoading) handleGeneratePrompt();
      },
      '?': () => openHelpPanel(),
      F1: () => openHelpPanel(),
    },
    !activeStudio &&
      !store.isHistoryOpen &&
      !store.isTemplatesOpen &&
      !store.isDNAModalOpen &&
      !store.isCharacterBankOpen &&
      !store.isLocationBankOpen &&
      !store.isProjectManagerOpen &&
      !store.isWizardOpen &&
      !store.isSeriesBibleOpen,
  ); // Disable main hotkeys when modals are open

  // Global Hotkeys Effect
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();

      // Ctrl+Shift+S: Save Preset
      if (key === 's' && e.shiftKey) {
        e.preventDefault();
        openModal('isSavePresetModalOpen');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [openModal]);

  const ideaActionButtons = (
    <div className="flex gap-1">
      <button
        onClick={handleBrainstormIdeas}
        disabled={isBrainstorming || isAutoFilling}
        className="p-2 rounded-full text-slate-400 hover:text-yellow-400 hover:bg-slate-800 transition-colors"
        aria-label={t.brainstormButton}
        title={t.brainstormButton}
      >
        {isBrainstorming ? (
          <Icon name="spinner" className="w-5 h-5 animate-spin" />
        ) : (
          <Icon name="lightbulb" className="w-5 h-5" />
        )}
      </button>
      <button
        onClick={handleAutoFillModifiers}
        disabled={isAutoFilling || !promptState.idea || isBrainstorming}
        className="p-2 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
        aria-label={t.autofillButton}
        title={t.autofillButton}
        data-tutorial-id="autofill-button"
      >
        {isAutoFilling ? (
          <Icon name="spinner" className="w-5 h-5 animate-spin" />
        ) : (
          <Icon name="magic" className="w-5 h-5" />
        )}
      </button>
    </div>
  );

  const handleEnhanceIdea = async () => {
    if (!promptState.idea.trim()) return;
    setIsEnhancingIdea(true);
    try {
      const context =
        promptState.artStyle === 'Custom' ? promptState.customArtStyle : promptState.artStyle;
      const enhanced = await geminiService.enhancePrompt(promptState.idea, context);

      // Update state
      setPromptState({ idea: enhanced });

      // Immediate validation to ensure UI state consistency
      const newState = { ...promptState, idea: enhanced };
      const error = validateField('idea', enhanced, newState, t);
      setErrors((prev) => {
        const next = { ...prev };
        if (error) next.idea = error;
        else delete next.idea;
        return next;
      });

      addToast('Idea enhanced with cinematic details!', 'success');
    } catch {
      addToast('Failed to enhance idea.', 'error');
    } finally {
      setIsEnhancingIdea(false);
    }
  };

  // If we haven't rehydrated from IDB yet, show a loader
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-100 transition-colors duration-300 ${theme === 'light' ? 'theme-light' : ''}`}
    >
      {/* Background Gradient & Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] opacity-30"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-900/10 blur-[120px] opacity-30"></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-blue-900/10 blur-[100px] opacity-20"></div>
      </div>

      {/* Sidebar Navigation */}
      <ErrorBoundary panelId="app-sidebar-panel">
        <Sidebar
          onNavigate={(section) => setActiveSection(section)}
          activeSection={activeSection}
          onOpenProject={() => openModal('isProjectManagerOpen')}
          onOpenHistory={() => openModal('isHistoryOpen')}
          onOpenTemplates={() => openModal('isTemplatesOpen')}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenPlugins={() => {
            /* TODO: Implement plugin manager UI */
          }}
        />
      </ErrorBoundary>

      {/* Global Asset Library */}
      <ErrorBoundary panelId="app-asset-library-panel">
        <AssetLibrary />
      </ErrorBoundary>

      <div className="relative z-10 max-w-full xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-6 pb-12 overflow-x:hidden ml-0 lg:ml-64 transition-all duration-300">
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
            onThemeToggle={toggleTheme}
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

        <main className="mt-8 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left Column: Input Form (Wider) */}
          <ErrorBoundary panelId="app-input-panel">
            <div className="xl:col-span-7 space-y-8 animate-fade-in-up w-full min-w-0">
              {/* Core Concept Section */}
              <CollapsibleSection
                title={t.sectionCoreConcept}
                isOpen={openSections.includes('core-concept')}
                onToggle={() =>
                  setOpenSections((prev) =>
                    prev.includes('core-concept')
                      ? prev.filter((s) => s !== 'core-concept')
                      : [...prev, 'core-concept'],
                  )
                }
                stepNumber={1}
                tutorialId="core-concept"
              >
                <div className="space-y-8">
                  <TargetModelToggle
                    value={promptState.targetModel}
                    onChange={handleTargetModelChange}
                    uiStrings={{
                      label: t.labelTargetModel,
                      veoLabel: t.toggleVeoLabel,
                      veoDescription: t.toggleVeoDescription,
                      soraLabel: t.toggleSoraLabel,
                      soraDescription: t.toggleSoraDescription,
                    }}
                    info={t.tooltips.targetModel}
                  />

                  <TextAreaInput
                    label={
                      <div className="flex items-center gap-1">
                        {t.labelIdea}
                        <Suspense fallback={null}>
                          <ContextualHelp
                            topic="Prompt Idea"
                            content="Enter your core video concept here. Be descriptive but concise."
                            topicId="create-prompt"
                            onOpenHelp={openHelpPanel}
                          />
                        </Suspense>{' '}
                      </div>
                    }
                    name="idea"
                    value={promptState.idea}
                    onChange={handleInputChange}
                    placeholder={t.placeholderIdea}
                    ref={ideaInputRef}
                    maxLength={CHARACTER_LIMITS.idea}
                    actionButton={ideaActionButtons}
                    info={t.tooltips.idea}
                    error={errors.idea}
                    rows={6}
                    autoFocus
                    onEnhance={handleEnhanceIdea}
                    isEnhancing={isEnhancingIdea}
                  />

                  <div className="bg-slate-900/40 rounded-xl border border-white/5 p-5">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                      Reference & Consistency
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ImageUploadInput
                        onImageSelect={handleImageUpload}
                        onImageClear={handleImageClear}
                        uploadedImageUrl={uploadedImageUrl}
                        label={
                          <div className="flex items-center gap-1">
                            {t.imageUploadLabel}
                            <Suspense fallback={null}>
                              <ContextualHelp
                                topic="Reference Image"
                                content={t.tooltips.imageUpload}
                                topicId="create-prompt"
                                onOpenHelp={openHelpPanel}
                              />
                            </Suspense>{' '}
                          </div>
                        }
                        placeholder={t.imageUploadPlaceholder}
                        info={t.tooltips.imageUpload}
                      />
                      {uploadedImageUrl ? (
                        <div className="flex flex-col justify-center space-y-4">
                          <CheckboxInput
                            id="useImageAsCameo"
                            name="useImageAsCameo"
                            label={t.labelUseImageAsCameo}
                            checked={promptState.useImageAsCameo}
                            onChange={handleCheckboxChange}
                            tooltipText={t.tooltips.useImageAsCameo}
                          />
                          {promptState.useImageAsCameo && (
                            <TextAreaInput
                              label={t.labelCharacterCameoTag}
                              name="characterCameoTag"
                              value={promptState.characterCameoTag}
                              onChange={handleInputChange}
                              placeholder={t.placeholderCharacterCameoTag}
                              maxLength={CHARACTER_LIMITS.characterCameoTag}
                              error={errors.characterCameoTag}
                              rows={1}
                              info={t.tooltips.characterCameoTag}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center p-4 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm italic">
                          Upload a reference image to unlock cameo controls.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Details Section */}
              <CollapsibleSection
                title="2. Refine Details"
                isOpen={openSections.includes('details-tabs')}
                onToggle={() =>
                  setOpenSections((prev) =>
                    prev.includes('details-tabs')
                      ? prev.filter((s) => s !== 'details-tabs')
                      : [...prev, 'details-tabs'],
                  )
                }
                stepNumber={2}
                tutorialId="details-tabs"
              >
                <div className="pt-2">
                  <Tabs
                    activeTabIndex={activeTabIndex}
                    onTabChange={setActiveTabIndex}
                    tabs={[
                      {
                        label: t.tabStyle,
                        icon: 'palette',
                        content: (
                          <Suspense fallback={<TabLoadingFallback />}>
                            <StyleTab
                              promptState={promptState}
                              handleInputChange={handleInputChange}
                              t={t}
                              errors={errors}
                              artStyleOptions={artStyleOptions}
                              visualEffectOptions={visualEffectOptions}
                              lightingStyleOptions={lightingStyleOptions}
                              colorPaletteOptions={colorPaletteOptions}
                              animationPresetOptions={animationPresetOptions}
                              handleSuggestArtStyles={handleSuggestArtStyles}
                              isSuggestingArtStyle={isSuggestingArtStyle}
                              handleSuggestVisualEffect={handleSuggestVisualEffect}
                              isSuggestingEffect={isSuggestingEffect}
                            />
                          </Suspense>
                        ),
                      },
                      {
                        label: t.tabCamera,
                        icon: 'video',
                        content: (
                          <Suspense fallback={<TabLoadingFallback />}>
                            <CameraTab
                              promptState={promptState}
                              handleInputChange={handleInputChange}
                              t={t}
                              errors={errors}
                              cameraMovementOptions={cameraMovementOptions}
                              cameraDistanceOptions={cameraDistanceOptions}
                              lensTypeOptions={lensTypeOptions}
                              compositionalGuideOptions={compositionalGuideOptions}
                              aspectRatioOptions={aspectRatioOptions}
                              resolutionOptions={resolutionOptions}
                              handleSuggestCameraSetup={handleSuggestCameraSetup}
                              isSuggestingCamera={isSuggestingCamera}
                              onOpenSpatialDirector={() => openStudioSafely('spatial')}
                            />
                          </Suspense>
                        ),
                      },
                      {
                        label: t.tabScene,
                        icon: 'image',
                        content: (
                          <Suspense fallback={<TabLoadingFallback />}>
                            <SceneTab
                              promptState={promptState}
                              handleInputChange={handleInputChange}
                              t={t}
                              errors={errors}
                              architecturalStyleOptions={architecturalStyleOptions}
                              timeOfDayOptions={timeOfDayOptions}
                              weatherOptions={weatherOptions}
                              handleSuggestEnvironmentDetails={handleSuggestEnvironmentDetails}
                              isSuggestingEnvironment={isSuggestingEnvironment}
                              handleSuggestSensoryDetails={handleSuggestSensoryDetails}
                              isSuggestingSensoryDetails={isSuggestingSensoryDetails}
                            />
                          </Suspense>
                        ),
                      },
                      {
                        label: t.tabCharacter,
                        icon: 'user',
                        content: (
                          <Suspense fallback={<TabLoadingFallback />}>
                            <CharacterTab
                              promptState={promptState}
                              handleInputChange={handleInputChange}
                              t={t}
                              errors={errors}
                              characterArchetypeOptions={characterArchetypeOptions}
                              characterAgeOptions={characterAgeOptions}
                              characterGenderOptions={characterGenderOptions}
                              characterMoodOptions={characterMoodOptions}
                              characterPoseOptions={characterPoseOptions}
                              characterEthnicityOptions={characterEthnicityOptions}
                              characterSkinToneOptions={characterSkinToneOptions}
                              characterClothingOptions={characterClothingOptions}
                              handleSuggestCharacterActions={handleSuggestCharacterActions}
                              isSuggestingActions={isSuggestingActions}
                              handleGenerateVisualDNA={handleGenerateVisualDNA}
                              isGeneratingVisualDNA={isGeneratingVisualDNA}
                            />
                          </Suspense>
                        ),
                      },
                      {
                        label: t.tabAudio,
                        icon: 'audio',
                        content: (
                          <Suspense fallback={<TabLoadingFallback />}>
                            <AudioTab
                              promptState={promptState}
                              handleInputChange={handleInputChange}
                              t={t}
                              errors={errors}
                              voiceStyleOptions={voiceStyleOptions}
                              ambientSoundOptions={ambientSoundOptions}
                              soundEffectsIntensityOptions={soundEffectsIntensityOptions}
                              handleSuggestFullAudioDesign={handleSuggestFullAudioDesign}
                              isSuggestingFullAudio={isSuggestingFullAudio}
                              onOpenPronunciation={() => openStudioSafely('pronunciation')}
                              handleAudioMixChange={handleAudioMixChange}
                              handleAudioUpload={handleAudioUpload}
                              handleAudioClear={handleAudioClear}
                              handleAnalyzeAudio={handleAnalyzeAudio}
                              isAnalyzingAudio={isAnalyzingAudio}
                            />
                          </Suspense>
                        ),
                      },
                      {
                        label: t.tabAdvanced,
                        icon: 'sliders',
                        content: (
                          <Suspense fallback={<TabLoadingFallback />}>
                            <AdvancedTab
                              promptState={promptState}
                              handleInputChange={handleInputChange}
                              handleCheckboxChange={handleCheckboxChange}
                              t={t}
                              errors={errors}
                              motionIntensityOptions={motionIntensityOptions}
                              creativityLevelOptions={creativityLevelOptions}
                              modelOptions={modelOptions}
                              handleSuggestAdvancedSettings={handleSuggestAdvancedSettings}
                              isSuggestingAdvanced={isSuggestingAdvanced}
                              addToast={addToast}
                            />
                          </Suspense>
                        ),
                      },
                    ]}
                  />
                </div>
              </CollapsibleSection>
            </div>
          </ErrorBoundary>

          {/* Right Column: Output & Visualization (Sticky) */}
          <ErrorBoundary panelId="app-output-panel">
            <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-24 self-start animate-fade-in-up animation-delay-300 w-full min-w-0">
              <ActionBar
                uiStrings={t}
                promptState={promptState}
                generatedPrompt={generatedPrompt}
                isLoading={isLoading}
                isEditing={isEditing}
                editedPrompt={editedPrompt}
                errors={errors}
                addToast={addToast}
                onGeneratePrompt={handleGeneratePrompt}
                onNewPrompt={handleNewPrompt}
                onSavePrompt={handleSavePrompt}
                onSetIsEditing={(editing) => {
                  setIsEditing(editing);
                  if (editing && generatedPrompt) {
                    setEditedPrompt(generatedPrompt.prompt); // Initialize edit state with current prompt
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
                isGeneratingArt={isGeneratingArt}
                onGenerateArt={handleGenerateArt}
                isGeneratingVideo={isGeneratingVideo}
                onGenerateVideo={(prompt) => {
                  if (generatedPrompt?.prompt && prompt === generatedPrompt.prompt) {
                    openStudioSafely('video');
                  } else {
                    openStudioSafely('video');
                  }
                }}
                isGeneratingStoryboard={isGeneratingStoryboard}
                onGenerateStoryboard={handleGenerateStoryboard}
                isGeneratingVariations={isGeneratingVariations}
                onGenerateVariations={handleGenerateVariations}
                isRefining={isRefining}
                onRefinePrompt={handleRefinePromptWrapper}
                isRestructuring={isRestructuring}
                onRestructurePrompt={handleRestructurePrompt}
                onSaveToHistory={saveToHistory}
                onShare={handleShare}
                onDownload={handleDownloadPrompt}
                onOpenSavePresetModal={() => openModal('isSavePresetModalOpen')}
                onOpenTemplatesPanel={() => openModal('isTemplatesOpen')}
                onCompareModels={() => openStudioSafely('compare')}
                onOpenVisualDNA={() => openModal('isDNAModalOpen')}
              />

              <div id="output-section" data-tutorial-id="output-section" className="min-h-[400px]">
                {generatedPrompt ? (
                  <PromptOutput
                    prompt={isEditing ? editedPrompt : generatedPrompt.prompt}
                    groundingChunks={generatedPrompt.groundingChunks}
                    storyboardImages={storyboardImages}
                    conceptArtImage={conceptArtImage}
                    isEditing={isEditing}
                    editedPrompt={editedPrompt}
                    onEditChange={setEditedPrompt}
                    onEditKeyDown={() => {}}
                    onRefine={handleRefinePromptWrapper}
                    isRefining={isRefining}
                  />
                ) : (
                  <div className="h-full">
                    <PromptBuilderSummary promptState={promptState} uiStrings={t.summary} />
                  </div>
                )}
              </div>

              {isExamplesVisible && !generatedPrompt && (
                <div className="hidden xl:block">
                  <ExamplesCarousel
                    examples={examplePrompts}
                    onUseExample={handleUseExample}
                    useExampleText={t.examplesCarousel.use}
                    onClose={() => setIsExamplesVisible(false)}
                    title={t.examplesCarousel.title}
                  />
                </div>
              )}
            </div>
          </ErrorBoundary>
        </main>
      </div>

      <ErrorBoundary panelId="app-modal-manager-panel">
        <ModalManager t={t} addToast={addToast} handlers={handlers} />
      </ErrorBoundary>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* Persistent Chat Assistant */}
      <Suspense fallback={null}>
        <ChatBot />
      </Suspense>

      {/* Settings Modal */}
      <Suspense fallback={null}>
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          safeModeStatus={safeModeStatus}
          onApiKeySet={() => {
            setApiKeyConfigured(true);
            addToast('API key saved successfully!', 'success');
          }}
        />
      </Suspense>

      {/* Onboarding Components */}
      <Suspense fallback={null}>
        <WelcomeModal
          isOpen={!localStorage.getItem('hasSeenWelcome')}
          onClose={() => localStorage.setItem('hasSeenWelcome', 'true')}
        />

        <TutorialOverlay />

        <HelpPanel
          isOpen={showHelpPanel}
          onClose={closeHelpPanel}
          initialTopic={helpPanelTopic}
          initialCategory={helpPanelCategory}
        />
      </Suspense>

      {/* Auto-Update Notification */}
      <UpdateNotification />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
        {/* Help Button */}
        <button
          onClick={() => openHelpPanel()}
          title="Help & Shortcuts (? or F1)"
          aria-label="Help & Shortcuts"
          className="p-3 rounded-xl shadow-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-200"
        >
          <Icon name="help" className="w-5 h-5" />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          title="Settings"
          aria-label="Settings"
          className={`p-3 rounded-xl shadow-lg transition-all duration-200 ${
            apiKeyConfigured
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white animate-pulse'
          }`}
        >
          <Icon name="settings" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
