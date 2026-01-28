
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ToastMessage,
  HistoryEntry,
  PromptTemplate,
  CustomPreset,
  ExamplePrompt,
  PromptVariation,
  VisualDNA,
  CharacterProfile,
  Project,
  PromptState
} from './types';
import {
  getLanguageOptions,
  getModelOptions,
  getArtStyles,
  getCameraMovements,
  getCameraDistances,
  getLensTypes,
  getVisualEffects,
  getColorPalettes,
  getAspectRatios,
  getAnimationPresets,
  getVoiceStyles,
  getTimeOfDayOptions,
  getWeatherOptions,
  getMotionIntensityOptions,
  getCreativityLevelOptions,
  getCharacterGenders,
  getCharacterEthnicityOptions,
  getCharacterClothings,
  getCharacterArchetypes,
  getCharacterAges,
  getCharacterMoods,
  getCharacterPoses,
  getCharacterSkinTones,
  getAmbientSounds,
  getSoundEffectsIntensity,
  getStaticInspirationPrompts,
  CHARACTER_LIMITS,
  getResolutionOptions,
  getVeoModelOptions,
  getArchitecturalStyles,
  getLightingStyles,
  getCompositionalGuides,
  INITIAL_STATE,
} from './constants';
import { appUIStrings } from './translations';
import { validateField } from './utils/validation';
import { getApiErrorMessage } from './utils/errorHandler';
import * as geminiService from './services/geminiService';

import { useHistoryState } from './hooks/useHistoryState';
import { usePromptLogic } from './hooks/usePromptLogic';
import { useVideoGeneration } from './hooks/useVideoGeneration';
import { useAppStore } from './store/useAppStore';
import { useAppSync } from './hooks/useAppSync';
import { useHotkeys } from './hooks/useHotkeys';
import { useLocationStore } from './store/useLocationStore';

import Header from './components/Header';
import ActionBar from './components/ActionBar';
import PromptOutput from './components/PromptOutput';
import ExamplesCarousel from './components/ExamplesCarousel';
import ChatBot from './components/ChatBot';
import Toast from './components/Toast';
import CollapsibleSection from './components/CollapsibleSection';
import PromptBuilderSummary from './components/PromptBuilderSummary';
import TargetModelToggle from './components/TargetModelToggle';
import Icon from './components/Icon';
import CheckboxInput from './components/CheckboxInput';
import ImageUploadInput from './components/ImageUploadInput';
import TextAreaInput from './components/TextAreaInput';
import Tabs from './components/Tabs';
import AssetLibrary from './components/AssetLibrary';
import ModalManager from './components/ModalManager';

// Import Tab Components
import StyleTab from './components/tabs/StyleTab';
import CameraTab from './components/tabs/CameraTab';
import SceneTab from './components/tabs/SceneTab';
import CharacterTab from './components/tabs/CharacterTab';
import AudioTab from './components/tabs/AudioTab';
import AdvancedTab from './components/tabs/AdvancedTab';
import { ProjectTemplate } from './config/projectTemplates';

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

export default function App() {
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
    setNewProjectWizardOpen
  } = store;

  const { setLocations } = useLocationStore();

  // Initialize sync
  const isSyncConnected = useAppSync();

  // Placeholder stubs for the ActionBar interface:
  const canUndoPromptState = false;
  const canRedoPromptState = false;
  const undoPromptState = () => {};
  const redoPromptState = () => {};

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [userCoords, setUserCoords] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Memoize translation to prevent unnecessary re-renders
  const t = useMemo(() => appUIStrings[promptState.language] || appUIStrings['en'], [promptState.language]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  // --- Initialize Hooks ---
  const { tasks: videoTasks, startGeneration: startVideoGeneration, isAnyGenerating: isGeneratingVideo, addToQueue: startBatchVideoGeneration } = useVideoGeneration(t, addToast);
  
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
    setArtStyleSuggestions,
    isRefining,

    handleGeneratePrompt,
    handleAutoFillModifiers,
    handleSuggestFullAudioDesign,
    handleSuggestEnvironmentDetails,
    handleSuggestSensoryDetails,
    handleSuggestCharacterNuances,
    handleSuggestVisualEffect,
    handleSuggestAdvancedSettings,
    handleSuggestArtStyles,
    handleTriggerCharacterDetails,
    handleAnalyzeAudio,
    handleSuggestCameraSetup,
    handleSuggestCharacterActions,
    handleRestructurePrompt,
    handleRefinePrompt,
  } = usePromptLogic({ promptState, setPromptState, addToast, userCoords, t });

  // Project Manager State Local tracking for Header display only
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);

  const [promptVariations, setPromptVariations] = useState<PromptVariation[]>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [conceptArtImage, setConceptArtImage] = useState<string | null>(null);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboardImages, setStoryboardImages] = useState<string[]>([]);
  const [isExamplesVisible, setIsExamplesVisible] = useState(true);
  
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const { 
    state: editedPrompt, 
    setState: setEditedPrompt, 
    undo: undoEdit, 
    redo: redoEdit, 
    reset: resetEditHistory, 
    canUndo: canUndoEdit, 
    canRedo: canRedoEdit 
  } = useHistoryState('');
  
  const [isEnhancingIdea, setIsEnhancingIdea] = useState(false);

  // --- Tutorial and UI State ---
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [openSections, setOpenSections] = useState<string[]>(['core-concept']);

  const ideaInputRef = useRef<HTMLTextAreaElement>(null);
  
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
    setStoryboardImages([]);
    setConceptArtImage(null);
    setIsEditing(false);
    resetEditHistory('');
    setPromptVariations([]);
    
    // Clear project context
    setCurrentProjectId(null);
    setCurrentProjectName(null);

    // Re-open wizard for fresh start feeling
    setNewProjectWizardOpen(true);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [resetAll, addToast, resetEditHistory, setGeneratedPrompt, setErrors, setNewProjectWizardOpen]);

  useEffect(() => {
    if (generatedPrompt && !isEditing) {
        resetEditHistory(generatedPrompt.prompt);
    }
  }, [generatedPrompt, isEditing, resetEditHistory]);
  
  // --- Character Details Suggestion Trigger ---
  useEffect(() => {
    handleTriggerCharacterDetails();
  }, [handleTriggerCharacterDetails]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.currentTarget;
    const key = name as keyof PromptState;

    const newStateUpdate: Partial<PromptState> = { [key]: value as any }; // Cast to any to handle type compatibility with Language union

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

}, [promptState, setPromptState, t, errors, setErrors]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
                }
            );
        }
    }
  }, [setPromptState, addToast, t]);

  const handleAudioMixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    const mixKey = name.replace('audioMix.', '') as keyof PromptState['audioMix'];
    setPromptState({
      audioMix: {
        ...promptState.audioMix,
        [mixKey]: parseInt(value, 10)
      }
    });
  }, [promptState.audioMix, setPromptState]);
  
  const handleImageUpload = useCallback((image: { data: string; mimeType: string; url: string; }) => {
      setPromptState({ uploadedImage: { data: image.data, mimeType: image.mimeType } });
      setUploadedImageUrl(image.url);
  }, [setPromptState]);
  
  const handleAudioUpload = useCallback((audio: { data: string; mimeType: string; name: string; }) => {
      setPromptState({ uploadedAudio: audio });
  }, [setPromptState]);

  const handleNewPrompt = useCallback(() => {
    setPromptState(INITIAL_STATE, 'replace');
    setGeneratedPrompt(null);
    setErrors({});
    setStoryboardImages([]);
    setConceptArtImage(null);
    handleImageClear();
    handleAudioClear();
    setIsEditing(false);
    resetEditHistory('');
    setPromptVariations([]);
    
    // Clear project context
    setCurrentProjectId(null);
    setCurrentProjectName(null);
    
    // Open wizard for new direction
    setNewProjectWizardOpen(true);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setPromptState, addToast, handleImageClear, handleAudioClear, resetEditHistory, setGeneratedPrompt, setErrors, setNewProjectWizardOpen]);
  
  const handleSavePrompt = useCallback((newPrompt: string) => {
    const currentGrounding = generatedPrompt?.groundingChunks || [];
    const updatedPrompt = { prompt: newPrompt, groundingChunks: currentGrounding };
    setGeneratedPrompt(updatedPrompt);
    setIsEditing(false);
    addToast(t.toastPromptSaved, 'success');
  }, [generatedPrompt, addToast, t, setGeneratedPrompt]);

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
      handleUsePresetOrTemplate: useCallback((preset: PromptTemplate | CustomPreset) => {
        setPromptState({ ...INITIAL_STATE, language: promptState.language, ...preset.params }, 'replace');
        setGeneratedPrompt(null);
        setErrors({});
        store.closeModal('isTemplatesOpen');
        store.closeModal('isSearchOpen');
        setConceptArtImage(null);
        setStoryboardImages([]);
        addToast(t.toastTemplateApplied, 'info');
        ideaInputRef.current?.focus();
      }, [promptState.language, setPromptState, addToast, t, setGeneratedPrompt, setErrors, store]),
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
              styleParams
          };
          store.addVisualDNA(newDNA);
          addToast("Visual DNA Saved", 'success');
      },
      handleApplyDNA: (dna: VisualDNA) => {
          setPromptState(dna.styleParams);
          addToast("Visual DNA Injected", 'success');
      },
      handleDeleteDNA: (id: string) => store.deleteVisualDNA(id),
      handleLoadProject: (project: Project) => {
          setFullState({
              promptState: project.promptState,
              sbGlobalContext: project.storyboard.globalContext,
              sbShots: project.storyboard.shots,
              sbTimeline: project.storyboard.timeline,
              characterBank: project.characterBank,
              visualDNA: project.visualDNA
          });
          setLocations(project.locationBank || []); 
          
          setCurrentProjectId(project.id);
          setCurrentProjectName(project.name);
      },
      handleUpdateProjectMeta: (id: string, name: string) => {
          setCurrentProjectId(id);
          setCurrentProjectName(name);
      },
      handleResetAll,
      handleWizardComplete: (newState: Partial<PromptState>) => {
          const truncatedState: Partial<PromptState> = {};
          Object.keys(newState).forEach(key => {
              const typedKey = key as keyof PromptState;
              const value = (newState as any)[typedKey];
              const limit = CHARACTER_LIMITS[typedKey as keyof typeof CHARACTER_LIMITS];
              if (typeof value === 'string' && limit) {
                  (truncatedState as any)[typedKey] = truncateText(value, limit);
              } else {
                  (truncatedState as any)[typedKey] = value;
              }
          });
          setPromptState(truncatedState);
          addToast("Wizard configuration applied!", "success");
          window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      handleSelectTemplate: (template: ProjectTemplate) => {
          applyTemplate(template.settings);
          store.setNewProjectWizardOpen(false);
          if (template.autoOpen) {
              openStudio(template.autoOpen);
          }
          addToast(`${template.label} workspace configured.`, 'success');
      },
      handleSelectCharacter: useCallback((profile: CharacterProfile) => {
          setPromptState({
              characterAge: profile.attributes.age,
              characterGender: profile.attributes.gender,
              characterEthnicity: profile.attributes.ethnicity,
              characterSkinTone: profile.attributes.skinTone,
              characterSpecificClothing: profile.wardrobe,
          });
          addToast('Character applied to settings', 'success');
      }, [setPromptState, addToast]),
      handleUpdateSpatialMotion: (gridId: string, motion: string) => {
          setPromptState({
              spatialMotions: {
                  ...promptState.spatialMotions,
                  [gridId]: motion
              }
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
      generatedPrompt
  };

  const handleUseExample = useCallback((example: ExamplePrompt) => {
    setPromptState({ ...INITIAL_STATE, language: promptState.language, ...example.params }, 'replace');
    setGeneratedPrompt({ prompt: example.prompt, groundingChunks: example.groundingChunks });
    setErrors({});
    setConceptArtImage(null);
    setStoryboardImages([]);
    addToast(t.toastTemplateApplied, 'info');
    ideaInputRef.current?.focus();
  }, [promptState.language, setPromptState, addToast, t, setGeneratedPrompt, setErrors]);

  const handleGenerateVariations = async (basePrompt: string) => {
    setIsGeneratingVariations(true);
    setIsBrainstorming(false); 
    setPromptVariations([]);
    store.openModal('isVariationsOpen');
    try {
        const variations = await geminiService.generatePromptVariations(
            basePrompt, 
            promptState.language, 
            promptState.model,
            promptState.targetModel
        );
        setPromptVariations(variations);
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
        store.closeModal('isVariationsOpen');
    } finally {
        setIsGeneratingVariations(false);
    }
  };

  const handleBrainstormIdeas = async () => {
    setIsBrainstorming(true);
    setPromptVariations([]);
    store.openModal('isVariationsOpen');
    try {
        const ideas = await geminiService.suggestPromptIdeas(
            promptState.idea,
            promptState.language,
            promptState.model
        );
        setPromptVariations(ideas);
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
        store.closeModal('isVariationsOpen');
    } finally {
        setIsBrainstorming(false);
    }
  };

  // Wrapper for handleRefinePrompt to handle state if editing
  const handleRefinePromptWrapper = async (text: string) => {
      await handleRefinePrompt(text);
      if (isEditing) {
          setIsEditing(false); // Exit edit mode to show the new refined prompt
      }
  };
  
  const handleGenerateArt = async (prompt: string) => {
    setIsGeneratingArt(true);
    setConceptArtImage(null);
    try {
      const imageUrl = await geminiService.generateConceptArt(prompt, { aspectRatio: promptState.aspectRatio });
      setConceptArtImage(imageUrl);
      addToast(t.toastArtGenerated, 'success');
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsGeneratingArt(false);
    }
  };

  const handleGenerateStoryboard = async (prompt: string) => {
    setIsGeneratingStoryboard(true);
    setStoryboardImages([]);
    try {
      const images = await geminiService.generateStoryboard(prompt, promptState.aspectRatio);
      setStoryboardImages(images);
      addToast(t.toastStoryboardGenerated, 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, t), 'error');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };
  
  const handleDownloadPrompt = (promptText: string) => {
    const blob = new Blob([promptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'veo-prompt.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
  
  // Memoized options
  const languageOptions = useMemo(() => getLanguageOptions(), []);
  const modelOptions = useMemo(() => getModelOptions(promptState.language), [promptState.language]);
  const veoModelOptions = useMemo(() => getVeoModelOptions(promptState.language), [promptState.language]);
  const artStyleOptions = useMemo(() => getArtStyles(promptState.language), [promptState.language]);
  const cameraMovementOptions = useMemo(() => getCameraMovements(promptState.language), [promptState.language]);
  const cameraDistanceOptions = useMemo(() => getCameraDistances(promptState.language), [promptState.language]);
  const lensTypeOptions = useMemo(() => getLensTypes(promptState.language), [promptState.language]);
  const visualEffectOptions = useMemo(() => getVisualEffects(promptState.language), [promptState.language]);
  const colorPaletteOptions = useMemo(() => getColorPalettes(promptState.language), [promptState.language]);
  const aspectRatioOptions = useMemo(() => getAspectRatios(promptState.language), [promptState.language]);
  const resolutionOptions = useMemo(() => getResolutionOptions(promptState.language), [promptState.language]);
  const animationPresetOptions = useMemo(() => getAnimationPresets(promptState.language), [promptState.language]);
  const voiceStyleOptions = useMemo(() => getVoiceStyles(promptState.language), [promptState.language]);
  const timeOfDayOptions = useMemo(() => getTimeOfDayOptions(promptState.language), [promptState.language]);
  const weatherOptions = useMemo(() => getWeatherOptions(promptState.language), [promptState.language]);
  const motionIntensityOptions = useMemo(() => getMotionIntensityOptions(promptState.language), [promptState.language]);
  const creativityLevelOptions = useMemo(() => getCreativityLevelOptions(promptState.language), [promptState.language]);
  const characterGenderOptions = useMemo(() => getCharacterGenders(promptState.language), [promptState.language]);
  const characterEthnicityOptions = useMemo(() => getCharacterEthnicityOptions(promptState.language), [promptState.language]);
  const characterClothingOptions = useMemo(() => getCharacterClothings(promptState.language), [promptState.language]);
  const characterArchetypeOptions = useMemo(() => getCharacterArchetypes(promptState.language), [promptState.language]);
  const characterAgeOptions = useMemo(() => getCharacterAges(promptState.language), [promptState.language]);
  const characterMoodOptions = useMemo(() => getCharacterMoods(promptState.language), [promptState.language]);
  const characterPoseOptions = useMemo(() => getCharacterPoses(promptState.language), [promptState.language]);
  const characterSkinToneOptions = useMemo(() => getCharacterSkinTones(promptState.language), [promptState.language]);
  const ambientSoundOptions = useMemo(() => getAmbientSounds(promptState.language), [promptState.language]);
  const soundEffectsIntensityOptions = useMemo(() => getSoundEffectsIntensity(promptState.language), [promptState.language]);
  const architecturalStyleOptions = useMemo(() => getArchitecturalStyles(promptState.language), [promptState.language]);
  const lightingStyleOptions = useMemo(() => getLightingStyles(promptState.language), [promptState.language]);
  const compositionalGuideOptions = useMemo(() => getCompositionalGuides(promptState.language), [promptState.language]);
  const examplePrompts = useMemo(() => getStaticInspirationPrompts(promptState.language), [promptState.language]);

  const handleTargetModelChange = useCallback((newModel: 'veo' | 'sora') => {
    const updates: Partial<PromptState> = { targetModel: newModel };
    
    if (newModel === 'sora' && promptState.artStyle === 'Cinematic') {
        updates.artStyle = 'Photorealistic';
        addToast(t.toastSoraStyleSet, 'info');
    }
    
    setPromptState(updates);
}, [promptState.artStyle, setPromptState, addToast, t]);

  // --- Keyboard Shortcuts Integration ---
  useHotkeys({
    "CTRL+ENTER": () => {
        if (!isLoading) handleGeneratePrompt();
    },
    "?": () => openModal('isShortcutsOpen')
  }, !activeStudio && !store.isHistoryOpen && !store.isTemplatesOpen && !store.isDNAModalOpen && !store.isCharacterBankOpen && !store.isLocationBankOpen && !store.isProjectManagerOpen && !store.isWizardOpen && !store.isSeriesBibleOpen); // Disable main hotkeys when modals are open

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
            {isBrainstorming ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="lightbulb" className="w-5 h-5" />}
        </button>
        <button
            onClick={handleAutoFillModifiers}
            disabled={isAutoFilling || !promptState.idea || isBrainstorming}
            className="p-2 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
            aria-label={t.autofillButton}
            title={t.autofillButton}
            data-tutorial-id="autofill-button"
        >
            {isAutoFilling ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
        </button>
    </div>
  );

  const handleEnhanceIdea = async () => {
    if (!promptState.idea.trim()) return;
    setIsEnhancingIdea(true);
    try {
        const context = promptState.artStyle === 'Custom' ? promptState.customArtStyle : promptState.artStyle;
        const enhanced = await geminiService.enhancePrompt(promptState.idea, context);
        
        // Update state
        setPromptState({ idea: enhanced });
        
        // Immediate validation to ensure UI state consistency
        const newState = { ...promptState, idea: enhanced };
        const error = validateField('idea', enhanced, newState, t);
        setErrors(prev => {
            const next = { ...prev };
            if (error) next.idea = error;
            else delete next.idea;
            return next;
        });

        addToast('Idea enhanced with cinematic details!', 'success');
    } catch (e) {
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
    <div className={`min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-100 transition-colors duration-300 ${theme === 'light' ? 'theme-light' : ''}`}>
      {/* Background Gradient & Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] opacity-30"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-900/10 blur-[120px] opacity-30"></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-blue-900/10 blur-[100px] opacity-20"></div>
      </div>

      {/* Global Asset Library */}
      <AssetLibrary />

      <div className="relative z-10 max-w-full xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-6 pb-12 overflow-x-hidden">
        <Header 
            onShowHistory={() => openModal('isHistoryOpen')}
            historyButtonText={t.historyButton}
            onShowImageStudio={() => openStudio('image')}
            imageStudioButtonText={t.imageStudioButton}
            onShowSunoStudio={() => openStudio('suno')}
            sunoStudioButtonText={t.sunoStudioButton}
            onShowVideoAnalysis={() => openStudio('analysis')}
            isSyncConnected={isSyncConnected}
            theme={theme}
            onThemeToggle={toggleTheme}
            onStartTutorial={() => { /* Logic to handle tutorial start */ }}
            uiStrings={t}
            onResetAll={handleResetAll}
            onShowSearch={() => openModal('isSearchOpen')}
            onShowVideoStudio={() => openStudio('video')}
            onOpenWizard={() => openModal('isWizardOpen')}
            onOpenStoryBoard={() => openStudio('story')}
            onOpenCharacterBank={() => openModal('isCharacterBankOpen')}
            onOpenLocationBank={() => openModal('isLocationBankOpen')}
            onOpenProjectManager={() => openModal('isProjectManagerOpen')}
            onOpenSeriesBible={() => openModal('isSeriesBibleOpen')}
            onOpenVariablesPanel={() => openModal('isVariablesPanelOpen')}
            currentProjectName={currentProjectName}
        />

        <main className="mt-8 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input Form (Wider) */}
          <div className="xl:col-span-7 space-y-8 animate-fade-in-up w-full min-w-0">
            
            {/* Core Concept Section */}
            <CollapsibleSection title={t.sectionCoreConcept} isOpen={openSections.includes('core-concept')} onToggle={() => setOpenSections(prev => prev.includes('core-concept') ? prev.filter(s => s !== 'core-concept') : [...prev, 'core-concept'])} stepNumber={1} tutorialId="core-concept">
                <div className="space-y-8">
                    <TargetModelToggle 
                        value={promptState.targetModel} 
                        onChange={handleTargetModelChange} 
                        uiStrings={{
                            label: t.labelTargetModel,
                            veoLabel: t.toggleVeoLabel,
                            veoDescription: t.toggleVeoDescription,
                            soraLabel: t.toggleSoraLabel,
                            soraDescription: t.toggleSoraDescription
                        }}
                        info={t.tooltips.targetModel}
                    />
                    
                    <TextAreaInput
                        label={t.labelIdea}
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
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Reference & Consistency</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ImageUploadInput 
                                onImageSelect={handleImageUpload}
                                onImageClear={handleImageClear}
                                uploadedImageUrl={uploadedImageUrl}
                                label={t.imageUploadLabel}
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
            <CollapsibleSection title="2. Refine Details" isOpen={openSections.includes('details-tabs')} onToggle={() => setOpenSections(prev => prev.includes('details-tabs') ? prev.filter(s => s !== 'details-tabs') : [...prev, 'details-tabs'])} stepNumber={2} tutorialId="details-tabs">
                <div className="pt-2">
                    <Tabs
                        activeTabIndex={activeTabIndex}
                        onTabChange={setActiveTabIndex}
                        tabs={[
                            {
                                label: t.tabStyle,
                                icon: 'palette',
                                content: (
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
                                )
                            },
                            {
                                label: t.tabCamera,
                                icon: 'video',
                                content: (
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
                                    onOpenSpatialDirector={() => openStudio('spatial')}
                                  />
                                )
                            },
                            {
                                label: t.tabScene,
                                icon: 'image',
                                content: (
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
                                )
                            },
                            {
                                label: t.tabCharacter,
                                icon: 'user',
                                content: (
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
                                  />
                                )
                            },
                            {
                                label: t.tabAudio,
                                icon: 'audio',
                                content: (
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
                                    onOpenPronunciation={() => openStudio('pronunciation')}
                                    handleAudioMixChange={handleAudioMixChange}
                                    handleAudioUpload={handleAudioUpload}
                                    handleAudioClear={handleAudioClear}
                                    handleAnalyzeAudio={handleAnalyzeAudio}
                                    isAnalyzingAudio={isAnalyzingAudio}
                                  />
                                )
                            },
                            {
                                label: t.tabAdvanced,
                                icon: 'sliders',
                                content: (
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
                                )
                            },
                        ]}
                    />
                </div>
            </CollapsibleSection>

          </div>

          {/* Right Column: Output & Visualization (Sticky) */}
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
                        openStudio('video'); 
                    } else {
                        openStudio('video');
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
                onCompareModels={() => openStudio('compare')}
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
        </main>
      </div>

      <ModalManager 
        t={t}
        addToast={addToast}
        videoHooks={{
            videoTasks,
            startVideoGeneration,
            isGeneratingVideo,
            startBatchVideoGeneration
        }}
        handlers={handlers}
      />

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
          </div>
        ))}
      </div>
      
      {/* Persistent Chat Assistant */}
      <ChatBot />
    </div>
  );
}
