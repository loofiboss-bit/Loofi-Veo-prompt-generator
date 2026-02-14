/**
 * useAppHandlers Hook
 *
 * Consolidates all App-level event handlers: input changes, image/audio
 * upload, reset, save, share, download, project operations, and the
 * `handlers` bag passed to ModalManager.
 */

import React, { useCallback, useMemo } from 'react';
import {
  HistoryEntry,
  PromptTemplate,
  CustomPreset,
  ExamplePrompt,
  VisualDNA,
  CharacterProfile,
  Project,
  PromptState,
  VeoPromptResponse,
  PromptVariation,
} from '@core/types';
import type { StudioType } from '@shared/hooks/useStudios';
import { CHARACTER_LIMITS, INITIAL_STATE } from '@core/constants';
import { validateField } from '@core/utils/validation';
import * as geminiService from '@core/services/geminiService';
import { performanceService } from '@core/services/performanceService';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useHistoryStore } from '@core/store/useHistoryStore';
import { useLocationStore } from '@core/store/useLocationStore';
import { ProjectTemplate } from '@core/config/projectTemplates';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationStrings = any;

interface UseAppHandlersOptions {
  promptState: PromptState;
  setPromptState: (update: Partial<PromptState>, mode?: 'replace') => void;
  generatedPrompt: VeoPromptResponse | null;
  setGeneratedPrompt: (prompt: VeoPromptResponse | null) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  t: TranslationStrings;

  // Generation state
  promptVariations: PromptVariation[];
  isGeneratingVariations: boolean;
  isBrainstorming: boolean;
  resetGenerationState: () => void;
  conceptArtImage: string | null;
  setConceptArtImage: (img: string | null) => void;
  storyboardImages: string[];
  setStoryboardImages: (imgs: string[]) => void;

  // Upload state
  uploadedImageUrl: string | null;
  setUploadedImageUrl: (url: string | null) => void;

  // Edit state
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  resetEditHistory: (initial: string) => void;

  // Enhance state
  isEnhancingIdea: boolean;
  setIsEnhancingIdea: (enhancing: boolean) => void;

  // External refs
  ideaInputRef: React.RefObject<HTMLTextAreaElement | null>;

  // Safe-mode
  safeModeStatus: { enabled: boolean } | null;
  openStudioSafely: (studio: NonNullable<StudioType>) => void;

  // Misc
  currentProjectName: string | null;
  currentProjectId: string | null;
}

export function useAppHandlers(opts: UseAppHandlersOptions) {
  const {
    promptState,
    setPromptState,
    generatedPrompt,
    setGeneratedPrompt,
    errors,
    setErrors,
    addToast,
    t,
    promptVariations,
    isGeneratingVariations,
    isBrainstorming,
    resetGenerationState,
    conceptArtImage: _conceptArtImage,
    setConceptArtImage,
    storyboardImages: _storyboardImages,
    setStoryboardImages,
    uploadedImageUrl,
    setUploadedImageUrl,
    isEditing: _isEditing,
    setIsEditing,
    isEnhancingIdea: _isEnhancingIdea,
    setIsEnhancingIdea,
    resetEditHistory,
    ideaInputRef,
    openStudioSafely,
    currentProjectName,
    currentProjectId,
  } = opts;

  const store = useAppStore();
  const projectStore = useProjectStore();
  const historyStore = useHistoryStore();
  const { setLocations } = useLocationStore();

  // --- Basic input handlers ---

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.currentTarget;
      const key = name as keyof PromptState;

      const newStateUpdate: Partial<PromptState> = { [key]: value } as Partial<PromptState>;

      if (key === 'voiceStyle' && value === 'None') {
        newStateUpdate.voiceOver = '';
      }

      setPromptState(newStateUpdate);

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
              // Note: setUserCoords is managed in App; this is intentional.
              void position;
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

  // --- Image/Audio ---

  const handleImageUpload = useCallback(
    (image: { data: string; mimeType: string; url: string }) => {
      setPromptState({ uploadedImage: { data: image.data, mimeType: image.mimeType } });
      setUploadedImageUrl(image.url);
    },
    [setPromptState, setUploadedImageUrl],
  );

  const handleImageClear = useCallback(() => {
    setPromptState({ uploadedImage: null, useImageAsCameo: false });
    setUploadedImageUrl(null);
  }, [setPromptState, setUploadedImageUrl]);

  const handleAudioUpload = useCallback(
    (audio: { data: string; mimeType: string; name: string }) => {
      setPromptState({ uploadedAudio: audio });
    },
    [setPromptState],
  );

  const handleAudioClear = useCallback(() => {
    setPromptState({ uploadedAudio: null });
  }, [setPromptState]);

  // --- Prompt lifecycle ---

  const handleResetAll = useCallback(() => {
    setUploadedImageUrl(null);
    store.resetAll();
    setGeneratedPrompt(null);
    setErrors({});
    resetGenerationState();
    setIsEditing(false);
    resetEditHistory('');
    projectStore.clearCurrentProject();
    store.setNewProjectWizardOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    store,
    resetEditHistory,
    setGeneratedPrompt,
    setErrors,
    resetGenerationState,
    setIsEditing,
    setUploadedImageUrl,
    projectStore,
  ]);

  const handleNewPrompt = useCallback(() => {
    setPromptState(INITIAL_STATE, 'replace');
    setGeneratedPrompt(null);
    setErrors({});
    resetGenerationState();
    handleImageClear();
    handleAudioClear();
    setIsEditing(false);
    resetEditHistory('');
    projectStore.clearCurrentProject();
    store.setNewProjectWizardOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    setPromptState,
    handleImageClear,
    handleAudioClear,
    resetEditHistory,
    setGeneratedPrompt,
    setErrors,
    resetGenerationState,
    setIsEditing,
    projectStore,
    store,
  ]);

  const handleSavePrompt = useCallback(
    (newPrompt: string) => {
      const currentGrounding = generatedPrompt?.groundingChunks || [];
      const updatedPrompt = { prompt: newPrompt, groundingChunks: currentGrounding };
      setGeneratedPrompt(updatedPrompt);
      setIsEditing(false);
      addToast(t.toastPromptSaved, 'success');
    },
    [generatedPrompt, addToast, t, setGeneratedPrompt, setIsEditing],
  );

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

  // --- Sharing & export ---

  const handleShare = useCallback(() => {
    const url = new URL(window.location.href);
    const stateToShare = { ...promptState, generatedPrompt };
    const encodedState = btoa(JSON.stringify(stateToShare));
    url.searchParams.set('state', encodedState);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url.toString());
      addToast(t.toastShareLink, 'success');
    }
  }, [promptState, generatedPrompt, addToast, t]);

  const handleDownloadPrompt = useCallback(
    (promptText: string) => {
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
    },
    [addToast, t],
  );

  // --- Target model ---

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

  // --- Enhance idea ---

  const handleEnhanceIdea = useCallback(async () => {
    if (!promptState.idea.trim()) return;
    setIsEnhancingIdea(true);
    try {
      const context =
        promptState.artStyle === 'Custom' ? promptState.customArtStyle : promptState.artStyle;
      const enhanced = await geminiService.enhancePrompt(promptState.idea, context);

      setPromptState({ idea: enhanced });

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
  }, [promptState, setPromptState, setIsEnhancingIdea, addToast, t, setErrors]);

  // --- Example usage ---

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
      ideaInputRef,
    ],
  );

  // --- ModalManager handlers bag ---

  const modalHandlers = useMemo(
    () => ({
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
      handleUsePresetOrTemplate: (preset: PromptTemplate | CustomPreset) => {
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
        store.setFullState({
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
        store.applyTemplate(template.settings);
        store.setNewProjectWizardOpen(false);
        if (template.autoOpen) {
          openStudioSafely(template.autoOpen);
        }
        addToast(`${template.label} workspace configured.`, 'success');
      },
      handleSelectCharacter: (profile: CharacterProfile) => {
        setPromptState({
          characterAge: profile.attributes.age,
          characterGender: profile.attributes.gender,
          characterEthnicity: profile.attributes.ethnicity,
          characterSkinTone: profile.attributes.skinTone,
          characterSpecificClothing: profile.wardrobe,
          characterVisualDNA: profile.visualPrompt,
          characterFixedSeed: profile.fixedSeed,
          characterNegativePrompt: profile.negativePrompt,
        });
        addToast('Character applied with Identity Lock', 'success');
      },
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
      // State props exposed to ModalManager
      promptVariations,
      isGeneratingVariations,
      isBrainstorming,
      uploadedImageUrl,
      currentProjectName,
      currentProjectId,
      generatedPrompt,
    }),
    // Large dependency list is acceptable — this is a memoized bag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      promptState,
      generatedPrompt,
      addToast,
      t,
      store,
      projectStore,
      historyStore,
      setLocations,
      promptVariations,
      isGeneratingVariations,
      isBrainstorming,
      uploadedImageUrl,
      currentProjectName,
      currentProjectId,
      handleResetAll,
      handleSavePrompt,
      openStudioSafely,
      setPromptState,
      setGeneratedPrompt,
      setErrors,
      setConceptArtImage,
      setStoryboardImages,
      ideaInputRef,
    ],
  );

  return {
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
  };
}
