
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
import { getPromptTemplates } from './templates';
import { appUIStrings, pronunciationGuides } from './translations';
import { validateField } from './utils/validation';
import { getApiErrorMessage } from './utils/errorHandler';
import * as geminiService from './services/geminiService';

import { useHistoryState } from './hooks/useHistoryState';
import { usePromptLogic } from './hooks/usePromptLogic';
import { useStudios } from './hooks/useStudios';
import { useVideoGeneration } from './hooks/useVideoGeneration';
import { useAppStore } from './store/useAppStore';
import { useAppSync } from './hooks/useAppSync';
import { useHotkeys } from './hooks/useHotkeys';
import { useLocationStore } from './store/useLocationStore';

import Header from './components/Header';
import ActionBar from './components/ActionBar';
import PromptOutput from './components/PromptOutput';
import ExamplesCarousel from './components/ExamplesCarousel';
import HistoryPanel from './components/HistoryPanel';
import TemplatesPanel from './components/TemplatesPanel';
import VariationsPanel from './components/VariationsPanel';
// Lazy load heavy studio components to improve initial load time
const ImageStudio = React.lazy(() => import('./components/ImageStudio'));
const SunoSongStudio = React.lazy(() => import('./components/SunoSongStudio'));
const VideoAnalysisStudio = React.lazy(() => import('./components/VideoAnalysisStudio'));
const VideoGenerationStudio = React.lazy(() => import('./components/VideoGenerationStudio'));
import ChatBot from './components/ChatBot';
import Toast from './components/Toast';
import CollapsibleSection from './components/CollapsibleSection';
import PromptBuilderSummary from './components/PromptBuilderSummary';
import TargetModelToggle from './components/TargetModelToggle';
import Icon from './components/Icon';
import CheckboxInput from './components/CheckboxInput';
import PronunciationGuide from './components/PronunciationGuide';
import ImageUploadInput from './components/ImageUploadInput';
import TextAreaInput from './components/TextAreaInput';
import Tabs from './components/Tabs';
import TutorialGuide from './components/TutorialGuide';
import GlobalSearchModal from './components/GlobalSearchModal';
import CompareModelsModal from './components/CompareModelsModal';
import SpatialDirectorModal from './components/SpatialDirectorModal';
import VisualDNAModal from './components/VisualDNAModal';
import WizardModal from './components/WizardModal';
import StoryBoard from './components/StoryBoard';
import CharacterBankModal from './components/CharacterBankModal';
import ProjectManagerModal from './components/ProjectManagerModal';
import AssetLibrary from './components/AssetLibrary';
import ShortcutsModal from './components/ShortcutsModal';
import SeriesBibleModal from './components/SeriesBibleModal';
import LocationManagerModal from './components/LocationManagerModal';

// Import Tab Components
import StyleTab from './components/tabs/StyleTab';
import CameraTab from './components/tabs/CameraTab';
import SceneTab from './components/tabs/SceneTab';
import CharacterTab from './components/tabs/CharacterTab';
import AudioTab from './components/tabs/AudioTab';
import AdvancedTab from './components/tabs/AdvancedTab';

const LOCAL_STORAGE_KEY = 'veo-prompt-state';
const CUSTOM_PRESETS_KEY = 'veo-custom-presets';
const VISUAL_DNA_KEY = 'veo-visual-dna';
const CHARACTER_BANK_KEY = 'veo-character-bank';

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

// Simplified load function for Zustand-based init
function getSavedState() {
  try {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      return { ...INITIAL_STATE, ...parsedState, audioMix: { ...INITIAL_STATE.audioMix, ...(parsedState.audioMix || {}) } };
    }
  } catch (error) {
    console.error("Failed to load state from localStorage", error);
  }
  return INITIAL_STATE;
}

const getInitialTheme = (): 'dark' | 'light' => {
    try {
        const savedTheme = localStorage.getItem('veo-theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
    } catch (error) {
        console.error("Failed to load theme from localStorage", error);
    }
    return 'dark'; // Default to dark
};


export default function App() {
  // Use Zustand Store instead of local state/broadcast hook
  const { 
    promptState, 
    setPromptState, 
    sbGlobalContext, 
    sbShots, 
    setSbGlobalContext, 
    setSbShots, 
    resetAll 
  } = useAppStore();

  const { setLocations } = useLocationStore();

  // Initialize sync
  const isSyncConnected = useAppSync();

  // History for promptState (separate from Zustand for now as it was built on custom hook)
  // To restore "undo/redo" fully with Zustand, a middleware like zundo would be best,
  // but for this refactor we maintain local undo/redo on top of the store state by syncing.
  // We'll skip complex undo/redo wiring for now to keep the refactor clean as requested.
  // Placeholder stubs for the ActionBar interface:
  const canUndoPromptState = false;
  const canRedoPromptState = false;
  const undoPromptState = () => {};
  const redoPromptState = () => {};

  // Initialize store from local storage on mount
  useEffect(() => {
      const saved = getSavedState();
      setPromptState(saved, 'replace');
  }, [setPromptState]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [userCoords, setUserCoords] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Memoize translation to prevent unnecessary re-renders
  const t = useMemo(() => appUIStrings[promptState.language] || appUIStrings['en'], [promptState.language]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  // --- Initialize Hooks ---
  const studios = useStudios();
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

  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Visual DNA State
  const [isDNAModalOpen, setIsDNAModalOpen] = useState(false);
  const [savedDNAs, setSavedDNAs] = useState<VisualDNA[]>([]);

  // Character Bank State
  const [isCharacterBankOpen, setIsCharacterBankOpen] = useState(false);
  const [savedCharacters, setSavedCharacters] = useState<CharacterProfile[]>([]);

  // Location Bank State
  const [isLocationBankOpen, setIsLocationBankOpen] = useState(false);

  // Project Manager State
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);

  // Series Bible State
  const [isSeriesBibleOpen, setIsSeriesBibleOpen] = useState(false);

  // Storyboard State moved to Zustand, accessed via store in StoryBoard component

  // Wizard Mode State
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVariationsOpen, setIsVariationsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  
  const [promptVariations, setPromptVariations] = useState<PromptVariation[]>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [conceptArtImage, setConceptArtImage] = useState<string | null>(null);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboardImages, setStoryboardImages] = useState<string[]>([]);
  const [isExamplesVisible, setIsExamplesVisible] = useState(true);
  
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme());

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
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const promptToRetry = useRef<string | null>(null);
  
  const [isEnhancingIdea, setIsEnhancingIdea] = useState(false);

  // --- Tutorial and UI State ---
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [openSections, setOpenSections] = useState<string[]>(['core-concept']);

  const ideaInputRef = useRef<HTMLTextAreaElement>(null);
  const tutorialSteps = useMemo(() => t.tutorial.steps.map((step: any) => ({
    ...step,
    text: step.text.replace('{GENERATE_BUTTON}', t.generateButton)
  })), [t]);

  const startTutorial = () => {
    setTutorialStep(0);
    setIsTutorialActive(true);
  };
  
  const endTutorial = () => {
    setIsTutorialActive(false);
  };
  
  const handleTutorialNext = () => setTutorialStep(prev => prev + 1);
  const handleTutorialPrev = () => setTutorialStep(prev => prev - 1);
  
  // Effect to control UI state during tutorial
  useEffect(() => {
      if (!isTutorialActive) return;
      const currentStep = tutorialSteps[tutorialStep];
      if (!currentStep) return;

      const { targetId } = currentStep;

      if (['core-concept', 'autofill-button'].includes(targetId)) {
        setOpenSections(prev => [...new Set([...prev, 'core-concept'])]);
      }
      
      if (['details-tabs', 'environment-ai-button'].includes(targetId)) {
          setOpenSections(prev => [...new Set([...prev, 'details-tabs'])]);
      }
      if (targetId === 'environment-ai-button') {
          setActiveTabIndex(0); // Switch to "Scene" tab
      }

  }, [isTutorialActive, tutorialStep, tutorialSteps]);

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

    addToast('All fields have been reset.', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [resetAll, addToast, resetEditHistory, setGeneratedPrompt, setErrors]);

  // Handle theme changes
  const handleThemeToggle = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('veo-theme', theme);
    } catch (error) {
        console.error("Failed to save theme to localStorage", error);
    }
    if (theme === 'light') {
        document.body.classList.add('light');
    } else {
        document.body.classList.remove('light');
    }
  }, [theme]);


  // Load history & presets & DNA & Characters from localStorage on initial render
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('veo-prompt-history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      
      const savedPresets = localStorage.getItem(CUSTOM_PRESETS_KEY);
      if (savedPresets) setCustomPresets(JSON.parse(savedPresets));

      const savedDNAs = localStorage.getItem(VISUAL_DNA_KEY);
      if (savedDNAs) setSavedDNAs(JSON.parse(savedDNAs));

      const savedChars = localStorage.getItem(CHARACTER_BANK_KEY);
      if (savedChars) setSavedCharacters(JSON.parse(savedChars));

    } catch (error) {
      console.error("Failed to load from localStorage", error);
    }
  }, []);
  
  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(promptState));
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [promptState]);

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

    const newStateUpdate: Partial<PromptState> = { [key]: value };

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
    
    // Cross-field validation triggers
    if (key === 'artStyle') {
        const customArtStyleError = validateField('customArtStyle', updatedState.customArtStyle, updatedState, t);
        if (customArtStyleError) newErrors.customArtStyle = customArtStyleError;
        else delete newErrors.customArtStyle;
    }
    
    if (key === 'voiceStyle') {
        const voiceOverError = validateField('voiceOver', updatedState.voiceOver, updatedState, t);
        if (voiceOverError) newErrors.voiceOver = voiceOverError;
        else delete newErrors.voiceOver;
    }
    
    if (key === 'characterActions' || key === 'characterClothing') {
        const clothingDetailsError = validateField('characterSpecificClothing', updatedState.characterSpecificClothing, updatedState, t);
        if (clothingDetailsError) newErrors.characterSpecificClothing = clothingDetailsError;
        else delete newErrors.characterSpecificClothing;
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
    addToast('Ready for a new prompt!', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setPromptState, addToast, handleImageClear, handleAudioClear, resetEditHistory, setGeneratedPrompt, setErrors]);
  
  const handleSavePrompt = useCallback((newPrompt: string) => {
    const currentGrounding = generatedPrompt?.groundingChunks || [];
    const updatedPrompt = { prompt: newPrompt, groundingChunks: currentGrounding };
    setGeneratedPrompt(updatedPrompt);
    setIsEditing(false);
    addToast(t.toastPromptSaved, 'success');
  }, [generatedPrompt, addToast, t, setGeneratedPrompt]);

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
    const updatedHistory = [newEntry, ...history.slice(0, 49)];
    setHistory(updatedHistory);
    try {
      localStorage.setItem('veo-prompt-history', JSON.stringify(updatedHistory));
      addToast(t.toastHistorySaved, 'success');
    } catch (error) {
      console.error("Failed to save history to localStorage", error);
      addToast(t.errorHistorySave, 'error');
    }
  }, [promptState, generatedPrompt, history, addToast, t]);

  const handleUseHistoryEntry = (entry: HistoryEntry) => {
    setPromptState(entry.params, 'replace');
    setGeneratedPrompt({ prompt: entry.prompt, groundingChunks: entry.groundingChunks });
    setIsHistoryOpen(false);
    setConceptArtImage(null);
    setStoryboardImages([]);
    addToast(t.toastHistoryLoaded, 'info');
  };

  const handleDeleteHistoryEntry = (id: string) => {
    const updatedHistory = history.filter(entry => entry.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('veo-prompt-history', JSON.stringify(updatedHistory));
  };
  
  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('veo-prompt-history');
  };

  const handleUsePresetOrTemplate = useCallback((preset: PromptTemplate | CustomPreset) => {
    setPromptState({ ...INITIAL_STATE, language: promptState.language, ...preset.params }, 'replace');
    setGeneratedPrompt(null);
    setErrors({});
    setIsTemplatesOpen(false);
    setConceptArtImage(null);
    setStoryboardImages([]);
    addToast(t.toastTemplateApplied, 'info');
    ideaInputRef.current?.focus();
  }, [promptState.language, setPromptState, addToast, t, setGeneratedPrompt, setErrors]);

  const handleOpenSavePresetModal = useCallback(() => {
    setNewPresetName('');
    setIsSavePresetModalOpen(true);
  }, []);
  
  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
        addToast(t.errorPresetNameRequired, 'error');
        return;
    }
    const newPreset: CustomPreset = {
        id: Date.now().toString(),
        name: newPresetName.trim(),
        params: promptState,
    };
    const updatedPresets = [newPreset, ...customPresets];
    setCustomPresets(updatedPresets);
    try {
        localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updatedPresets));
        addToast(t.toastPresetSaved, 'success');
    } catch (error) {
        console.error("Failed to save custom presets", error);
        addToast("Failed to save preset.", 'error');
    }
    setIsSavePresetModalOpen(false);
  };

  const handleDeletePreset = (id: string) => {
    const updatedPresets = customPresets.filter(p => p.id !== id);
    setCustomPresets(updatedPresets);
    try {
        localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updatedPresets));
        addToast(t.toastPresetDeleted, 'success');
    } catch (error) {
        console.error("Failed to delete custom preset", error);
        addToast("Failed to delete preset.", 'error');
    }
  };

  const handleUpdatePreset = (updatedPreset: CustomPreset) => {
      const updatedPresets = customPresets.map(p => p.id === updatedPreset.id ? updatedPreset : p);
      setCustomPresets(updatedPresets);
      try {
          localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updatedPresets));
          addToast(t.toastPresetSaved, 'success');
      } catch (error) {
          console.error("Failed to update custom preset", error);
          addToast("Failed to update preset.", 'error');
      }
  };

  // --- Visual DNA Handlers ---
  const handleSaveDNA = (name: string, styleParams: Partial<PromptState>) => {
      const newDNA: VisualDNA = {
          id: Date.now().toString(),
          name,
          timestamp: Date.now(),
          styleParams
      };
      const updatedDNAs = [newDNA, ...savedDNAs];
      setSavedDNAs(updatedDNAs);
      try {
          localStorage.setItem(VISUAL_DNA_KEY, JSON.stringify(updatedDNAs));
          addToast("Visual DNA Saved", 'success');
      } catch (error) {
          addToast("Failed to save Visual DNA", 'error');
      }
  };

  const handleApplyDNA = (dna: VisualDNA) => {
      setPromptState(dna.styleParams);
      addToast("Visual DNA Injected", 'success');
  };

  const handleDeleteDNA = (id: string) => {
      const updatedDNAs = savedDNAs.filter(dna => dna.id !== id);
      setSavedDNAs(updatedDNAs);
      localStorage.setItem(VISUAL_DNA_KEY, JSON.stringify(updatedDNAs));
  };

  // --- Character Bank Handlers ---
  const handleSaveCharacter = (profile: CharacterProfile) => {
      // Check if update or new
      const index = savedCharacters.findIndex(c => c.id === profile.id);
      let updatedList = [...savedCharacters];
      
      if (index !== -1) {
          updatedList[index] = profile;
      } else {
          updatedList = [profile, ...updatedList];
      }
      
      setSavedCharacters(updatedList);
      try {
          localStorage.setItem(CHARACTER_BANK_KEY, JSON.stringify(updatedList));
          addToast(index !== -1 ? "Character Updated" : "Character Created", 'success');
      } catch (e) {
          addToast("Failed to save character", 'error');
      }
  };

  const handleDeleteCharacter = (id: string) => {
      const updatedList = savedCharacters.filter(c => c.id !== id);
      setSavedCharacters(updatedList);
      localStorage.setItem(CHARACTER_BANK_KEY, JSON.stringify(updatedList));
      addToast("Character Deleted", 'success');
  };

  const handleSelectCharacter = (profile: CharacterProfile) => {
      const updates: Partial<PromptState> = {
          characterAge: profile.attributes.age,
          characterGender: profile.attributes.gender,
          characterEthnicity: profile.attributes.ethnicity,
          characterSkinTone: profile.attributes.skinTone,
          characterCameoTag: profile.name,
      };

      // Combine detailed appearance and wardrobe into description fields
      const details = [
          profile.attributes.bodyType ? `Body: ${profile.attributes.bodyType}` : '',
          profile.appearance.hair ? `Hair: ${profile.appearance.hair}` : '',
          profile.appearance.eyes ? `Eyes: ${profile.appearance.eyes}` : '',
          profile.appearance.distinguishingFeatures ? `Features: ${profile.appearance.distinguishingFeatures}` : '',
          profile.wardrobe ? `Outfit: ${profile.wardrobe}` : ''
      ].filter(Boolean).join('. ');

      updates.characterSpecificClothing = truncateText(details, CHARACTER_LIMITS.characterSpecificClothing);
      
      setPromptState(updates);
      addToast(t.characterBank.applySuccess, 'success');
  };

  const handleLoadProject = (project: Project) => {
      setPromptState(project.promptState, 'replace');
      setSavedCharacters(project.characterBank);
      setSavedDNAs(project.visualDNA);
      setLocations(project.locationBank || []); // Load locations
      
      // Update Store via actions
      setSbGlobalContext(project.storyboard.globalContext);
      setSbShots(project.storyboard.shots);
      
      setCurrentProjectId(project.id);
      setCurrentProjectName(project.name);
      
      // Update local storage for resources to keep sync
      localStorage.setItem(CHARACTER_BANK_KEY, JSON.stringify(project.characterBank));
      localStorage.setItem(VISUAL_DNA_KEY, JSON.stringify(project.visualDNA));
      // Note: Location bank syncs via its own store automatically on update
  };

  const handleUpdateProjectMeta = (id: string, name: string) => {
      setCurrentProjectId(id);
      setCurrentProjectName(name);
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
    setIsVariationsOpen(true);
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
        setIsVariationsOpen(false); 
    } finally {
        setIsGeneratingVariations(false);
    }
  };

  const handleBrainstormIdeas = async () => {
    setIsBrainstorming(true);
    setPromptVariations([]);
    setIsVariationsOpen(true);
    try {
        const ideas = await geminiService.suggestPromptIdeas(
            promptState.idea,
            promptState.language,
            promptState.model
        );
        setPromptVariations(ideas);
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
        setIsVariationsOpen(false);
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

  const handleSelectVariation = (variation: string) => {
    handleSavePrompt(variation);
    setIsVariationsOpen(false);
  };
  
  const handleGenerateArt = async (prompt: string) => {
    setIsGeneratingArt(true);
    setConceptArtImage(null);
    try {
      const imageUrl = await geminiService.generateConceptArt(prompt, promptState.aspectRatio);
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
  
  const handleSelectKeyAndRetry = async () => {
    if (typeof (window as any).aistudio?.openSelectKey !== 'function') return;

    await (window as any).aistudio.openSelectKey();
    setIsApiKeyModalOpen(false);
    if (promptToRetry.current) {
        studios.open('video'); 
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

  const handleUpdateSpatialMotion = (gridId: string, motion: string) => {
      setPromptState({
          spatialMotions: {
              ...promptState.spatialMotions,
              [gridId]: motion
          }
      });
  };

  const handleClearSpatialMotions = () => {
      setPromptState({ spatialMotions: {} });
  };

  const handleWizardComplete = (newState: Partial<PromptState>) => {
      const truncatedState: Partial<PromptState> = {};
      
      // Strict length check on all text fields from Wizard
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
      // Auto-scroll to top to show results
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Keyboard Shortcuts Integration ---
  useHotkeys({
    "CTRL+ENTER": () => {
        if (!isLoading) handleGeneratePrompt();
    },
    "?": () => setIsShortcutsOpen(true)
  }, !studios.activeStudio && !isHistoryOpen && !isTemplatesOpen && !isDNAModalOpen && !isCharacterBankOpen && !isLocationBankOpen && !isProjectManagerOpen && !isWizardOpen && !isSeriesBibleOpen); // Disable main hotkeys when modals are open

  // NEW: Global Hotkeys Effect - Kept 'Save Preset' as it's a specific app-wide utility
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();

      // Ctrl+Shift+S: Save Preset
      if (key === 's' && e.shiftKey) {
        e.preventDefault();
        handleOpenSavePresetModal();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleOpenSavePresetModal]);

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
            onShowHistory={() => setIsHistoryOpen(true)}
            historyButtonText={t.historyButton}
            onShowImageStudio={() => studios.open('image')}
            imageStudioButtonText={t.imageStudioButton}
            onShowSunoStudio={() => studios.open('suno')}
            sunoStudioButtonText={t.sunoStudioButton}
            onShowVideoAnalysis={() => studios.open('analysis')}
            isSyncConnected={isSyncConnected}
            theme={theme}
            onThemeToggle={handleThemeToggle}
            onStartTutorial={startTutorial}
            uiStrings={t}
            onResetAll={handleResetAll}
            onShowSearch={() => setIsSearchOpen(true)}
            onShowVideoStudio={() => studios.open('video')}
            onOpenWizard={() => setIsWizardOpen(true)}
            onOpenStoryBoard={() => studios.open('story')}
            onOpenCharacterBank={() => setIsCharacterBankOpen(true)}
            onOpenLocationBank={() => setIsLocationBankOpen(true)}
            onOpenProjectManager={() => setIsProjectManagerOpen(true)}
            onOpenSeriesBible={() => setIsSeriesBibleOpen(true)}
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
                                    onOpenSpatialDirector={() => studios.open('spatial')}
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
                                    onOpenPronunciation={() => studios.open('pronunciation')}
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
                        studios.open('video'); 
                    } else {
                        // Handle manual prompt entry via studio if needed, but Action Bar usually deals with generated state
                        studios.open('video');
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
                onOpenSavePresetModal={handleOpenSavePresetModal}
                onOpenTemplatesPanel={() => setIsTemplatesOpen(true)}
                onCompareModels={() => studios.open('compare')}
                onOpenVisualDNA={() => setIsDNAModalOpen(true)}
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

      {/* Modals & Overlays */}
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {isHistoryOpen && (
        <HistoryPanel
          history={history}
          onSelect={handleUseHistoryEntry}
          onClear={handleClearHistory}
          onDelete={handleDeleteHistoryEntry}
          onClose={() => setIsHistoryOpen(false)}
          uiStrings={t.history}
          language={promptState.language}
        />
      )}

      {isTemplatesOpen && (
        <TemplatesPanel
          builtInTemplates={getPromptTemplates(promptState.language)}
          customPresets={customPresets}
          onSelect={handleUsePresetOrTemplate}
          onDeletePreset={handleDeletePreset}
          onUpdatePreset={handleUpdatePreset}
          currentPromptState={promptState}
          onClose={() => setIsTemplatesOpen(false)}
          uiStrings={t.templates}
        />
      )}

      {isDNAModalOpen && (
          <VisualDNAModal
            isOpen={isDNAModalOpen}
            onClose={() => setIsDNAModalOpen(false)}
            savedDNAs={savedDNAs}
            onSaveDNA={handleSaveDNA}
            onApplyDNA={handleApplyDNA}
            onDeleteDNA={handleDeleteDNA}
            currentPromptState={promptState}
            uiStrings={t}
          />
      )}

      {isCharacterBankOpen && (
          <CharacterBankModal
            isOpen={isCharacterBankOpen}
            onClose={() => setIsCharacterBankOpen(false)}
            savedCharacters={savedCharacters}
            onSaveCharacter={handleSaveCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onSelectCharacter={handleSelectCharacter}
            uiStrings={t}
            language={promptState.language}
          />
      )}

      {isLocationBankOpen && (
          <LocationManagerModal
            isOpen={isLocationBankOpen}
            onClose={() => setIsLocationBankOpen(false)}
            addToast={addToast}
            uiStrings={t}
          />
      )}

      {isProjectManagerOpen && (
          <ProjectManagerModal
            isOpen={isProjectManagerOpen}
            onClose={() => setIsProjectManagerOpen(false)}
            currentProjectId={currentProjectId}
            currentProjectName={currentProjectName}
            currentPromptState={promptState}
            currentCharacters={savedCharacters}
            currentDNAs={savedDNAs}
            currentStoryboard={{ globalContext: sbGlobalContext, shots: sbShots }}
            onLoadProject={handleLoadProject}
            onResetWorkspace={handleResetAll}
            onUpdateProjectMeta={handleUpdateProjectMeta}
            addToast={addToast}
          />
      )}

      {isSeriesBibleOpen && (
          <SeriesBibleModal
            isOpen={isSeriesBibleOpen}
            onClose={() => setIsSeriesBibleOpen(false)}
            addToast={addToast}
          />
      )}

      {isWizardOpen && (
          <WizardModal
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            onComplete={handleWizardComplete}
            uiStrings={t}
            language={promptState.language}
            addToast={addToast}
          />
      )}

      {studios.isStoryOpen && (
          <StoryBoard
            isOpen={studios.isStoryOpen}
            onClose={() => studios.close()}
            uiStrings={t}
            addToast={addToast}
            onGenerateBatch={(prompts) => {
                studios.open('video');
                startBatchVideoGeneration(prompts, {
                    aspectRatio: promptState.aspectRatio,
                    resolution: promptState.resolution,
                    veoModel: promptState.veoModel
                });
            }}
            savedCharacters={savedCharacters}
            // Passing hooks only, state is now managed via store in StoryBoard
            startVideoGeneration={startVideoGeneration}
            videoTasks={videoTasks}
          />
      )}

      {isSavePresetModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">{t.savePresetModal.title}</h3>
            <TextAreaInput
                label={t.savePresetModal.label}
                name="newPresetName"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder={t.savePresetModal.placeholder}
                rows={1}
                autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsSavePresetModalOpen(false)} className="px-4 py-2 text-slate-300 hover:text-white">{t.savePresetModal.cancel}</button>
              <button onClick={handleSavePreset} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md">{t.savePresetModal.save}</button>
            </div>
          </div>
        </div>
      )}

      {isVariationsOpen && (
          <VariationsPanel
            variations={promptVariations}
            isLoading={isGeneratingVariations || isBrainstorming}
            onSelect={handleSelectVariation}
            onClose={() => setIsVariationsOpen(false)}
            uiStrings={isBrainstorming ? t.promptIdeas : t.variations}
            language={promptState.language}
            model={promptState.model}
            addToast={addToast}
            targetModel={promptState.targetModel}
          />
      )}

      {studios.isImageOpen && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <ImageStudio 
                onClose={studios.close} 
                aspectRatioOptions={aspectRatioOptions}
                uiStrings={t}
                addToast={addToast}
            />
          </React.Suspense>
      )}
      
      {studios.isSunoOpen && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <SunoSongStudio
                onClose={studios.close}
                uiStrings={t}
                addToast={addToast}
                language={promptState.language}
                model={promptState.model}
            />
          </React.Suspense>
      )}

      {studios.isAnalysisOpen && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <VideoAnalysisStudio
                onClose={studios.close}
                uiStrings={t}
                addToast={addToast}
                onUseAnalysis={(text) => setPromptState({ idea: text })}
            />
          </React.Suspense>
      )}

      {studios.isVideoOpen && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <VideoGenerationStudio
                onClose={studios.close}
                uiStrings={t}
                addToast={addToast}
                language={promptState.language}
                initialPrompt={generatedPrompt?.prompt || promptState.idea}
                initialSettings={{
                    aspectRatio: promptState.aspectRatio,
                    resolution: promptState.resolution,
                    veoModel: promptState.veoModel
                }}
                tasks={videoTasks}
                onGenerate={async (prompt, settings) => { await startVideoGeneration(prompt, settings); }}
                isGenerating={isGeneratingVideo}
            />
          </React.Suspense>
      )}
      
      {studios.isPronunciationOpen && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <PronunciationGuide
                guideData={pronunciationGuides[promptState.language].terms}
                onClose={studios.close}
                uiStrings={t.pronunciationGuide}
            />
          </React.Suspense>
      )}

      {studios.isCompareOpen && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <CompareModelsModal
                isOpen={studios.isCompareOpen}
                onClose={studios.close}
                idea={promptState.idea}
                language={promptState.language}
                uiStrings={t}
                addToast={addToast}
                onSelectPrompt={(prompt, model) => {
                    setPromptState({ targetModel: model });
                    setGeneratedPrompt({ prompt });
                    addToast(`Applied ${model === 'veo' ? 'Veo' : 'Sora'} prompt.`, 'success');
                }}
            />
          </React.Suspense>
      )}

      {studios.isSpatialOpen && (
          <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50" />}>
            <SpatialDirectorModal
                isOpen={studios.isSpatialOpen}
                onClose={studios.close}
                uploadedImageUrl={uploadedImageUrl}
                spatialMotions={promptState.spatialMotions}
                onUpdateMotion={handleUpdateSpatialMotion}
                onClearAll={handleClearSpatialMotions}
                uiStrings={t}
            />
          </React.Suspense>
      )}

      {/* Tutorial Guide */}
      <TutorialGuide
        isActive={isTutorialActive}
        steps={tutorialSteps}
        currentStepIndex={tutorialStep}
        onNext={handleTutorialNext}
        onPrev={handleTutorialPrev}
        onFinish={endTutorial}
        uiStrings={t.tutorial}
      />

      <GlobalSearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        history={history}
        presets={customPresets}
        templates={getPromptTemplates(promptState.language)}
        onSelectHistory={handleUseHistoryEntry}
        onSelectPreset={handleUsePresetOrTemplate}
        onSelectTemplate={handleUsePresetOrTemplate}
        uiStrings={t.search}
        language={promptState.language}
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
