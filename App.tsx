
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  PromptState,
  ToastMessage,
  HistoryEntry,
  PromptTemplate,
  CustomPreset,
  ExamplePrompt,
  PromptVariation,
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
} from './constants';
import { getPromptTemplates } from './templates';
import { appUIStrings, pronunciationGuides } from './translations';
import { validateField } from './utils/validation';
import { getApiErrorMessage } from './utils/errorHandler';
import * as geminiService from './services/geminiService';

import { useBroadcastState } from './hooks/useBroadcastState';
import { useHistoryState } from './hooks/useHistoryState';
import { usePromptLogic } from './hooks/usePromptLogic';
import { useStudios } from './hooks/useStudios';

import Header from './components/Header';
import SelectInput from './components/SelectInput';
import TextAreaInput from './components/TextAreaInput';
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
import AudioUploadInput from './components/AudioUploadInput';
import RangeInput from './components/RangeInput';
import Tabs from './components/Tabs';
import TutorialGuide from './components/TutorialGuide';
import GlobalSearchModal from './components/GlobalSearchModal';
import PhysicsValidator from './components/PhysicsValidator';
import CompareModelsModal from './components/CompareModelsModal';
import SpatialDirectorModal from './components/SpatialDirectorModal';


const INITIAL_STATE: PromptState = {
  idea: '',
  environment: '',
  environmentSensoryDetails: '',
  environmentDynamicEvents: '',
  architecturalStyle: 'Any',
  characterActions: '',
  characterNuances: '',
  characterObjectInteraction: '',
  characterGender: 'Any',
  characterEthnicity: 'Any',
  characterClothing: 'Any',
  characterArchetype: 'Any',
  characterAge: 'Any',
  characterMood: 'Any',
  characterPose: 'Any',
  characterSkinTone: 'Any',
  characterSpecificClothing: '',
  characterAccessories: '',
  characterCameoTag: '',
  timeOfDay: 'Any',
  weather: 'Any',
  voiceOver: '',
  voiceStyle: 'None',
  ambientSound: 'None',
  soundEffectsIntensity: 'Subtle',
  negativePrompt: '',
  optimizeFor8Seconds: false,
  artStyle: 'Cinematic',
  customArtStyle: '',
  lightingStyle: 'Any',
  cameraMovement: 'Static shot',
  cameraDistance: 'Medium shot',
  lensType: 'Standard prime lens',
  compositionalGuide: 'Any',
  visualEffect: 'None',
  colorPalette: 'Vibrant and saturated',
  aspectRatio: '16:9',
  resolution: '1080p',
  animationPreset: 'None',
  motionIntensity: 'Medium',
  creativityLevel: 'Balanced',
  includeOverlayText: false,
  useGoogleSearch: false,
  useGoogleMaps: false,
  generateAsSeries: false,
  thinkingMode: false,
  youtubeUrl: '',
  imageStudioPrompt: '',
  uploadedImage: null,
  uploadedAudio: null,
  audioMix: { voice: 75, ambient: 50, sfx: 50 },
  useImageAsCameo: false,
  language: 'en',
  model: 'gemini-3-pro-preview',
  targetModel: 'veo',
  veoModel: 'fast',
  spatialMotions: {},
};

const LOCAL_STORAGE_KEY = 'veo-prompt-state';
const CUSTOM_PRESETS_KEY = 'veo-custom-presets';

function getInitialState(): PromptState {
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
  const [
      promptState, 
      setPromptState, 
      isSyncConnected, 
      undoPromptState, 
      redoPromptState, 
      canUndoPromptState, 
      canRedoPromptState
  ] = useBroadcastState<PromptState>(getInitialState());

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
    setArtStyleSuggestions,

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
  } = usePromptLogic({ promptState, setPromptState, addToast, userCoords, t });

  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVariationsOpen, setIsVariationsOpen] = useState(false);
  
  const [promptVariations, setPromptVariations] = useState<PromptVariation[]>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
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
    setPromptState(INITIAL_STATE, 'replace');
    setGeneratedPrompt(null);
    setErrors({});
    setStoryboardImages([]);
    setConceptArtImage(null);
    setIsEditing(false);
    resetEditHistory('');
    setPromptVariations([]);
    addToast('All fields have been reset.', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setPromptState, addToast, resetEditHistory, setGeneratedPrompt, setErrors]);

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


  // Load history & presets from localStorage on initial render
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('veo-prompt-history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      
      const savedPresets = localStorage.getItem(CUSTOM_PRESETS_KEY);
      if (savedPresets) setCustomPresets(JSON.parse(savedPresets));

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
    const { name, value } = e.target;
    const key = name as keyof PromptState;

    const newStateUpdate: Partial<PromptState> = { [key]: value };

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
    const { name, checked } = e.target;
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
    const { name, value } = e.target;
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

  const handleRefinePrompt = async (basePrompt: string) => {
    setIsRefining(true);
    try {
        const refinedPrompt = await geminiService.refinePrompt(basePrompt, promptState);
        setGeneratedPrompt(prev => {
            const currentChunks = prev?.groundingChunks || [];
            return { prompt: refinedPrompt, groundingChunks: currentChunks };
        });
        addToast(t.toastPromptRefined, 'success');
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsRefining(false);
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
    navigator.clipboard.writeText(url.toString());
    addToast(t.toastShareLink, 'success');
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

  const handleArtStyleSuggestionClick = (suggestion: string) => {
    const newValue = promptState.customArtStyle.trim()
      ? `${promptState.customArtStyle}, ${suggestion}`
      : suggestion;
    
    const fakeEvent = { target: { name: 'customArtStyle', value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
    handleInputChange(fakeEvent);
    
    setArtStyleSuggestions([]);
  };

  const handleCharacterSuggestionClick = (suggestion: string, field: 'characterSpecificClothing' | 'characterAccessories') => {
    const currentValue = promptState[field];
    const newValue = currentValue.trim()
        ? `${currentValue}, ${suggestion}`
        : suggestion;
    
    const fakeEvent = { target: { name: field, value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
    handleInputChange(fakeEvent);
  };
  
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

  // NEW: Global Hotkeys Effect
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();

      // Ctrl+G: Generate Prompt
      if (key === 'g' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (!isLoading) {
            handleGeneratePrompt();
        }
      }

      // Ctrl+Shift+S: Save Preset
      if (key === 's' && e.shiftKey) {
        e.preventDefault();
        handleOpenSavePresetModal();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGeneratePrompt, handleOpenSavePresetModal, isLoading]);

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

  const audioSuggestButton = (
    <button
        onClick={handleSuggestFullAudioDesign}
        disabled={isSuggestingFullAudio || !promptState.idea}
        className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 transition-colors"
        aria-label={t.tooltips.suggestAudio}
        title={t.tooltips.suggestAudio}
    >
        {isSuggestingFullAudio ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
    </button>
  );
  
  const environmentDetailsButton = (
    <button
        onClick={handleSuggestEnvironmentDetails}
        disabled={isSuggestingEnvironment || !promptState.idea}
        className="p-2 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
        aria-label={t.tooltips.suggestEnvironmentButton}
        title={t.tooltips.suggestEnvironmentButton}
        data-tutorial-id="environment-ai-button"
    >
        {isSuggestingEnvironment ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
    </button>
  );

  const sensoryDetailsButton = (
    <button
        onClick={handleSuggestSensoryDetails}
        disabled={isSuggestingSensoryDetails || !promptState.environment}
        className="p-2 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
        aria-label={t.suggestSensoryDetailsButton}
        title={t.suggestSensoryDetailsButton}
    >
        {isSuggestingSensoryDetails ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
    </button>
  );
  
  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-100 transition-colors duration-300 ${theme === 'light' ? 'theme-light' : ''}`}>
      {/* Background Gradient & Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[120px] opacity-30"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-900/10 blur-[120px] opacity-30"></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-blue-900/10 blur-[100px] opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
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
        />

        <main className="mt-8 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input Form (Wider) */}
          <div className="xl:col-span-7 space-y-8 animate-fade-in-up">
            
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
                        rows={6}
                        autoFocus
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
                                content: (
                                    <div className="space-y-6 animate-fade-in-up">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <SelectInput label={t.labelArtStyle} name="artStyle" options={artStyleOptions} value={promptState.artStyle} onChange={handleInputChange} info={t.tooltips.artStyle} />
                                                {promptState.artStyle === 'Custom' && (
                                                    <div className="mt-4">
                                                        <TextAreaInput
                                                            label={t.labelCustomArtStyle}
                                                            name="customArtStyle"
                                                            value={promptState.customArtStyle}
                                                            onChange={handleInputChange}
                                                            placeholder={t.placeholderCustomArtStyle}
                                                            rows={2}
                                                            maxLength={CHARACTER_LIMITS.customArtStyle}
                                                            error={errors.customArtStyle}
                                                            actionButton={<button onClick={handleSuggestArtStyles} disabled={isSuggestingArtStyle} className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 transition-colors" title="Suggest Styles">{isSuggestingArtStyle ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}</button>}
                                                            info={t.tooltips.customArtStyle}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-6">
                                                <SelectInput 
                                                    label={t.labelVisualEffect} 
                                                    name="visualEffect" 
                                                    options={visualEffectOptions} 
                                                    value={promptState.visualEffect} 
                                                    onChange={handleInputChange} 
                                                    info={t.tooltips.visualEffect}
                                                    actionButton={<button onClick={handleSuggestVisualEffect} disabled={isSuggestingEffect} className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 transition-colors" title="Suggest Effect">{isSuggestingEffect ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}</button>}
                                                />
                                                <SelectInput label={t.labelLightingStyle} name="lightingStyle" options={lightingStyleOptions} value={promptState.lightingStyle} onChange={handleInputChange} info={t.tooltips.lightingStyle} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput label={t.labelColorPalette} name="colorPalette" options={colorPaletteOptions} value={promptState.colorPalette} onChange={handleInputChange} info={t.tooltips.colorPalette} />
                                            <SelectInput label={t.labelAnimationPreset} name="animationPreset" options={animationPresetOptions} value={promptState.animationPreset} onChange={handleInputChange} info={t.tooltips.animationPreset} />
                                        </div>
                                    </div>
                                )
                            },
                            {
                                label: t.tabCamera,
                                content: (
                                    <div className="space-y-6 animate-fade-in-up">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput label={t.labelCameraMovement} name="cameraMovement" options={cameraMovementOptions} value={promptState.cameraMovement} onChange={handleInputChange} info={t.tooltips.cameraMovement} />
                                            <SelectInput label={t.labelCameraDistance} name="cameraDistance" options={cameraDistanceOptions} value={promptState.cameraDistance} onChange={handleInputChange} info={t.tooltips.cameraDistance} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput label={t.labelLensType} name="lensType" options={lensTypeOptions} value={promptState.lensType} onChange={handleInputChange} info={t.tooltips.lensType} />
                                            <SelectInput label={t.labelCompositionalGuide} name="compositionalGuide" options={compositionalGuideOptions} value={promptState.compositionalGuide} onChange={handleInputChange} info={t.tooltips.compositionalGuide} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput label={t.labelAspectRatio} name="aspectRatio" options={aspectRatioOptions} value={promptState.aspectRatio} onChange={handleInputChange} info={t.tooltips.aspectRatio} />
                                            <SelectInput label={t.labelResolution} name="resolution" options={resolutionOptions} value={promptState.resolution} onChange={handleInputChange} info={t.tooltips.resolution} />
                                        </div>
                                        
                                        <div className="pt-6 border-t border-slate-800">
                                            <button 
                                                onClick={() => studios.open('spatial')}
                                                className="w-full flex items-center justify-center space-x-3 py-4 bg-slate-900 border border-slate-700 hover:border-cyan-500/50 rounded-xl text-slate-200 transition-all group shadow-sm hover:shadow-md"
                                            >
                                                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors">
                                                    <Icon name="grid-3x3" className="w-6 h-6" />
                                                </div>
                                                <div className="text-left">
                                                    <span className="block font-semibold text-sm group-hover:text-cyan-100">{t.spatialDirectorButton}</span>
                                                    <span className="block text-xs text-slate-500 group-hover:text-cyan-200/70">Control motion in specific areas</span>
                                                </div>
                                            </button>
                                            {Object.keys(promptState.spatialMotions).length > 0 && (
                                                <p className="text-xs text-center text-cyan-400 mt-3 font-medium">
                                                    {Object.keys(promptState.spatialMotions).length} active spatial directives
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            },
                            {
                                label: t.tabScene,
                                content: (
                                    <div className="space-y-6 animate-fade-in-up">
                                        <TextAreaInput
                                            label={t.labelEnvironment}
                                            name="environment"
                                            value={promptState.environment}
                                            onChange={handleInputChange}
                                            placeholder={t.placeholderEnvironment}
                                            maxLength={CHARACTER_LIMITS.environment}
                                            actionButton={environmentDetailsButton}
                                            info={t.tooltips.environment}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <TextAreaInput
                                                label={t.labelSensoryDetails}
                                                name="environmentSensoryDetails"
                                                value={promptState.environmentSensoryDetails}
                                                onChange={handleInputChange}
                                                placeholder={t.placeholderSensoryDetails}
                                                rows={3}
                                                maxLength={CHARACTER_LIMITS.environmentSensoryDetails}
                                                actionButton={sensoryDetailsButton}
                                                info={t.tooltips.sensoryDetails}
                                            />
                                            <TextAreaInput
                                                label={t.labelEnvironmentDynamicEvents}
                                                name="environmentDynamicEvents"
                                                value={promptState.environmentDynamicEvents}
                                                onChange={handleInputChange}
                                                placeholder={t.placeholderEnvironmentDynamicEvents}
                                                rows={3}
                                                maxLength={CHARACTER_LIMITS.environmentDynamicEvents}
                                                info={t.tooltips.environmentDynamicEvents}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput label={t.labelArchitecturalStyle} name="architecturalStyle" options={architecturalStyleOptions} value={promptState.architecturalStyle} onChange={handleInputChange} info={t.tooltips.architecturalStyle} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <SelectInput label={t.labelTimeOfDay} name="timeOfDay" options={timeOfDayOptions} value={promptState.timeOfDay} onChange={handleInputChange} info={t.tooltips.timeOfDay} />
                                                <SelectInput label={t.labelWeather} name="weather" options={weatherOptions} value={promptState.weather} onChange={handleInputChange} info={t.tooltips.weather} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                label: t.tabCharacter,
                                content: (
                                    <div className="space-y-6 animate-fade-in-up">
                                        <TextAreaInput
                                            label={t.labelCharacterActions}
                                            name="characterActions"
                                            value={promptState.characterActions}
                                            onChange={handleInputChange}
                                            placeholder={t.placeholderCharacterActions}
                                            rows={3}
                                            maxLength={CHARACTER_LIMITS.characterActions}
                                            info={t.tooltips.characterActions}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput label={t.labelCharacterArchetype} name="characterArchetype" options={characterArchetypeOptions} value={promptState.characterArchetype} onChange={handleInputChange} info={t.tooltips.characterArchetype} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <SelectInput label={t.labelCharacterAge} name="characterAge" options={characterAgeOptions} value={promptState.characterAge} onChange={handleInputChange} info={t.tooltips.characterAge} />
                                                <SelectInput label={t.labelCharacterGender} name="characterGender" options={characterGenderOptions} value={promptState.characterGender} onChange={handleInputChange} info={t.tooltips.characterGender} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput label={t.labelCharacterMood} name="characterMood" options={characterMoodOptions} value={promptState.characterMood} onChange={handleInputChange} info={t.tooltips.characterMood} />
                                            <SelectInput label={t.labelCharacterPose} name="characterPose" options={characterPoseOptions} value={promptState.characterPose} onChange={handleInputChange} info={t.tooltips.characterPose} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput label={t.labelCharacterEthnicity} name="characterEthnicity" options={characterEthnicityOptions} value={promptState.characterEthnicity} onChange={handleInputChange} info={t.tooltips.characterEthnicity} />
                                            <SelectInput label={t.labelCharacterSkinTone} name="characterSkinTone" options={characterSkinToneOptions} value={promptState.characterSkinTone} onChange={handleInputChange} info={t.tooltips.characterSkinTone} />
                                        </div>
                                        <SelectInput label="Clothing Style" name="characterClothing" options={characterClothingOptions} value={promptState.characterClothing} onChange={handleInputChange} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <TextAreaInput
                                                label={t.labelCharacterSpecificClothing}
                                                name="characterSpecificClothing"
                                                value={promptState.characterSpecificClothing}
                                                onChange={handleInputChange}
                                                placeholder={t.placeholderCharacterSpecificClothing}
                                                rows={2}
                                                maxLength={CHARACTER_LIMITS.characterSpecificClothing}
                                                error={errors.characterSpecificClothing}
                                                info={t.tooltips.characterSpecificClothing}
                                            />
                                            <TextAreaInput
                                                label={t.labelCharacterAccessories}
                                                name="characterAccessories"
                                                value={promptState.characterAccessories}
                                                onChange={handleInputChange}
                                                placeholder={t.placeholderCharacterAccessories}
                                                rows={2}
                                                maxLength={CHARACTER_LIMITS.characterAccessories}
                                                info={t.tooltips.characterAccessories}
                                            />
                                        </div>
                                    </div>
                                )
                            },
                            {
                                label: t.tabAudio,
                                content: (
                                    <div className="space-y-6 animate-fade-in-up">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput 
                                                label={t.labelVoiceStyle} 
                                                name="voiceStyle" 
                                                options={voiceStyleOptions} 
                                                value={promptState.voiceStyle} 
                                                onChange={handleInputChange} 
                                                info={t.tooltips.voiceStyle} 
                                                actionButton={audioSuggestButton}
                                            />
                                            <TextAreaInput
                                                label={t.labelVoiceOver}
                                                name="voiceOver"
                                                value={promptState.voiceOver}
                                                onChange={handleInputChange}
                                                placeholder={t.placeholderVoiceOver}
                                                rows={3}
                                                maxLength={CHARACTER_LIMITS.voiceOver}
                                                disabled={promptState.voiceStyle === 'None'}
                                                error={errors.voiceOver}
                                                info={t.tooltips.voiceOver}
                                                actionButton={<button onClick={() => studios.open('pronunciation')} className="p-1 text-slate-400 hover:text-cyan-400" title="Pronunciation Guide"><Icon name="audio" className="w-4 h-4" /></button>}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput label={t.labelAmbientSound} name="ambientSound" options={ambientSoundOptions} value={promptState.ambientSound} onChange={handleInputChange} info={t.tooltips.ambientSound} />
                                            <SelectInput label={t.labelSoundEffectsIntensity} name="soundEffectsIntensity" options={soundEffectsIntensityOptions} value={promptState.soundEffectsIntensity} onChange={handleInputChange} info={t.tooltips.soundEffectsIntensity} />
                                        </div>
                                        <div className="p-6 border border-slate-800 rounded-xl bg-slate-900/40">
                                            <h4 className="text-sm font-semibold text-slate-300 mb-5 uppercase tracking-wide">{t.labelAudioMix}</h4>
                                            <div className="space-y-5">
                                                <RangeInput label={t.labelVoiceVolume} name="audioMix.voice" value={promptState.audioMix.voice} onChange={handleAudioMixChange} info={t.tooltips.audioMixVoice} />
                                                <RangeInput label={t.labelAmbientVolume} name="audioMix.ambient" value={promptState.audioMix.ambient} onChange={handleAudioMixChange} info={t.tooltips.audioMixAmbient} />
                                                <RangeInput label={t.labelSfxVolume} name="audioMix.sfx" value={promptState.audioMix.sfx} onChange={handleAudioMixChange} info={t.tooltips.audioMixSfx} />
                                            </div>
                                        </div>
                                        <AudioUploadInput 
                                            onAudioSelect={handleAudioUpload}
                                            onAudioClear={handleAudioClear}
                                            onAnalyze={handleAnalyzeAudio}
                                            uploadedAudioName={promptState.uploadedAudio?.name || null}
                                            isAnalyzing={isAnalyzingAudio}
                                            label={t.labelCustomAudio}
                                            placeholder={t.placeholderCustomAudio}
                                            info={t.tooltips.customAudio}
                                            analyzeButtonText={t.analyzeAudioButton}
                                        />
                                    </div>
                                )
                            },
                            {
                                label: t.tabAdvanced,
                                content: (
                                    <div className="space-y-6 animate-fade-in-up">
                                        <div className="flex justify-end">
                                            <button onClick={handleSuggestAdvancedSettings} disabled={isSuggestingAdvanced} className="flex items-center text-xs font-bold text-cyan-400 hover:text-cyan-300 disabled:opacity-50 tracking-wide uppercase">
                                                {isSuggestingAdvanced ? <Icon name="spinner" className="w-3 h-3 animate-spin mr-2" /> : <Icon name="magic" className="w-3 h-3 mr-2" />}
                                                {t.suggestAdvancedButton}
                                            </button>
                                        </div>
                                        <TextAreaInput
                                            label={t.labelNegativePrompt}
                                            name="negativePrompt"
                                            value={promptState.negativePrompt}
                                            onChange={handleInputChange}
                                            placeholder={t.placeholderNegativePrompt}
                                            rows={2}
                                            maxLength={CHARACTER_LIMITS.negativePrompt}
                                            info={t.tooltips.negativePrompt}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput label={t.labelMotionIntensity} name="motionIntensity" options={motionIntensityOptions} value={promptState.motionIntensity} onChange={handleInputChange} info={t.tooltips.motionIntensity} />
                                            <SelectInput label={t.labelCreativityLevel} name="creativityLevel" options={creativityLevelOptions} value={promptState.creativityLevel} onChange={handleInputChange} info={t.tooltips.creativityLevel} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectInput label={t.labelModel} name="model" options={modelOptions} value={promptState.model} onChange={handleInputChange} info={t.tooltips.model} />
                                            <TextAreaInput
                                                label={t.labelYoutubeUrl}
                                                name="youtubeUrl"
                                                value={promptState.youtubeUrl}
                                                onChange={handleInputChange}
                                                placeholder={t.placeholderYoutubeUrl}
                                                rows={1}
                                                maxLength={CHARACTER_LIMITS.youtubeUrl}
                                                error={errors.youtubeUrl}
                                                info={t.tooltips.youtubeUrl}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                            <CheckboxInput id="optimizeFor8Seconds" name="optimizeFor8Seconds" label={promptState.targetModel === 'sora' ? t.labelOptimizeFor15Seconds : t.labelOptimizeFor8Seconds} checked={promptState.optimizeFor8Seconds} onChange={handleCheckboxChange} tooltipText={promptState.targetModel === 'sora' ? t.tooltips.optimizeFor15Seconds : t.tooltips.optimizeFor8Seconds} />
                                            <CheckboxInput id="includeOverlayText" name="includeOverlayText" label={t.labelIncludeOverlayText} checked={promptState.includeOverlayText} onChange={handleCheckboxChange} tooltipText={t.tooltips.includeOverlayText} />
                                            <CheckboxInput id="useGoogleSearch" name="useGoogleSearch" label={t.labelUseGoogleSearch} checked={promptState.useGoogleSearch} onChange={handleCheckboxChange} tooltipText={t.tooltips.useGoogleSearch} />
                                            <CheckboxInput id="generateAsSeries" name="generateAsSeries" label={t.labelGenerateAsSeries} checked={promptState.generateAsSeries} onChange={handleCheckboxChange} tooltipText={t.tooltips.generateAsSeries} />
                                            <CheckboxInput id="useGoogleMaps" name="useGoogleMaps" label="Use Google Maps Grounding" checked={promptState.useGoogleMaps} onChange={handleCheckboxChange} color="fuchsia" />
                                        </div>
                                        
                                        <PhysicsValidator promptState={promptState} uiStrings={t} addToast={addToast} />
                                    </div>
                                )
                            },
                        ]}
                    />
                </div>
            </CollapsibleSection>

          </div>

          {/* Right Column: Output & Visualization (Sticky) */}
          <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-24 animate-fade-in-up animation-delay-300">
            
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
                isGeneratingVideo={false} // Managed by modal now
                onGenerateVideo={() => studios.open('video')}
                isGeneratingStoryboard={isGeneratingStoryboard}
                onGenerateStoryboard={handleGenerateStoryboard}
                isGeneratingVariations={isGeneratingVariations}
                onGenerateVariations={handleGenerateVariations}
                isRefining={isRefining}
                onRefinePrompt={handleRefinePrompt}
                
                onSaveToHistory={saveToHistory}
                onShare={handleShare}
                onDownload={handleDownloadPrompt}
                onOpenSavePresetModal={handleOpenSavePresetModal}
                onOpenTemplatesPanel={() => setIsTemplatesOpen(true)}
                onCompareModels={() => studios.open('compare')}
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
            />
          </React.Suspense>
      )}

      {studios.isPronunciationOpen && (
          <PronunciationGuide
            guideData={pronunciationGuides[promptState.language]?.terms || pronunciationGuides['en'].terms}
            onClose={studios.close}
            uiStrings={t.pronunciationGuide}
          />
      )}
      
      {studios.isCompareOpen && (
          <CompareModelsModal
            isOpen={studios.isCompareOpen}
            onClose={studios.close}
            idea={promptState.idea}
            language={promptState.language}
            uiStrings={t}
            addToast={addToast}
            onSelectPrompt={(prompt, model) => {
                setPromptState({ targetModel: model });
                setGeneratedPrompt({ prompt, groundingChunks: [] });
            }}
          />
      )}

      {studios.isSpatialOpen && (
          <SpatialDirectorModal
            isOpen={studios.isSpatialOpen}
            onClose={studios.close}
            uploadedImageUrl={uploadedImageUrl}
            spatialMotions={promptState.spatialMotions}
            onUpdateMotion={handleUpdateSpatialMotion}
            onClearAll={handleClearSpatialMotions}
            uiStrings={t}
          />
      )}

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

      <ChatBot />

      <TutorialGuide
        isActive={isTutorialActive}
        steps={tutorialSteps}
        currentStepIndex={tutorialStep}
        onNext={handleTutorialNext}
        onPrev={handleTutorialPrev}
        onFinish={endTutorial}
        uiStrings={t.tutorial}
      />

      {/* Toast Container */}
      <div className="fixed bottom-4 left-4 z-[100] flex flex-col space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        ))}
      </div>
    </div>
  );
}
