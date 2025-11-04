




import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  PromptState,
  SelectOption,
  ToastMessage,
  HistoryEntry,
  VeoPromptResponse,
  PromptTemplate,
  CustomPreset,
  ExamplePrompt,
} from '../types';
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
  getCharacterEthnicities,
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
} from '../constants';
import { getPromptTemplates } from '../templates';
import { appUIStrings, pronunciationGuides } from '../translations';
import { validateField, validateAllFields } from '../utils/validation';
import { getApiErrorMessage } from '../utils/errorHandler';
import { ApiError, ApiErrorType } from '../utils/apiErrors';
import * as geminiService from '../services/geminiService';

import { useBroadcastState } from '../hooks/useBroadcastState';
import { useHistoryState } from '../hooks/useHistoryState';

import Header from '../components/Header';
import SelectInput from '../components/SelectInput';
import TextAreaInput from '../components/TextAreaInput';
import ActionBar from '../components/ActionBar';
import PromptOutput from '../components/PromptOutput';
import ExamplesCarousel from '../components/ExamplesCarousel';
import HistoryPanel from '../components/HistoryPanel';
import TemplatesPanel from '../components/TemplatesPanel';
import VariationsPanel from '../components/VariationsPanel';
import ImageStudio from '../components/ImageStudio';
import SunoSongStudio from '../components/SunoSongStudio';
import VideoAnalysisStudio from '../components/VideoAnalysisStudio';
import ChatBot from '../components/ChatBot';
import Toast from '../components/Toast';
import CollapsibleSection from '../components/CollapsibleSection';
import PromptBuilderSummary from '../components/PromptBuilderSummary';
import VideoGenerationProgress from '../components/VideoGenerationProgress';
import TargetModelToggle from '../components/TargetModelToggle';
import Icon from '../components/Icon';
import CheckboxInput from '../components/CheckboxInput';
import PronunciationGuide from '../components/PronunciationGuide';
import ImageUploadInput from '../components/ImageUploadInput';
import Button from '../components/Button';
import Tabs from '../components/Tabs';
import TutorialGuide from '../components/TutorialGuide';


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
  // FIX: Added missing 'characterCameoTag' property to align with the PromptState type.
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
  // FIX: Added missing 'useImageAsCameo' property to align with the PromptState type and feature implementation.
  useImageAsCameo: false,
  language: 'en',
  model: 'gemini-2.5-pro',
  targetModel: 'veo',
  veoModel: 'fast',
};

const LOCAL_STORAGE_KEY = 'veo-prompt-state';
const CUSTOM_PRESETS_KEY = 'veo-custom-presets';

function getInitialState(): PromptState {
  try {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      // Merge with initial state to handle migrations where new fields are added
      return { ...INITIAL_STATE, ...parsedState };
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


function App() {
  const [promptState, setPromptState, isSyncConnected] = useBroadcastState<PromptState>(getInitialState());
  const [errors, setErrors] = useState<Partial<Record<keyof PromptState, string>>>({});
  const [generatedPrompt, setGeneratedPrompt] = useState<VeoPromptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const [isVariationsOpen, setIsVariationsOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isSunoStudioOpen, setIsSunoStudioOpen] = useState(false);
  const [isVideoAnalysisOpen, setIsVideoAnalysisOpen] = useState(false);
  const [isPronunciationGuideOpen, setIsPronunciationGuideOpen] = useState(false);
  const [promptVariations, setPromptVariations] = useState<string[]>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboardImages, setStoryboardImages] = useState<string[]>([]);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isSuggestingFullAudio, setIsSuggestingFullAudio] = useState(false);
  const [isExamplesVisible, setIsExamplesVisible] = useState(true);
  
  const [artStyleSuggestions, setArtStyleSuggestions] = useState<string[]>([]);
  const [isSuggestingArtStyle, setIsSuggestingArtStyle] = useState(false);
  const artStyleDebounceTimeout = useRef<number | null>(null);
  
  const [clothingSuggestions, setClothingSuggestions] = useState<string[]>([]);
  const [accessorySuggestions, setAccessorySuggestions] = useState<string[]>([]);
  const [isSuggestingCharacterDetails, setIsSuggestingCharacterDetails] = useState(false);
  const characterDetailsDebounceTimeout = useRef<number | null>(null);

  const [isSuggestingEnvironment, setIsSuggestingEnvironment] = useState(false);
  const [isSuggestingSensoryDetails, setIsSuggestingSensoryDetails] = useState(false);
  const [isSuggestingCharacterNuances, setIsSuggestingCharacterNuances] = useState(false);
  const [isSuggestingEffect, setIsSuggestingEffect] = useState(false);
  const [isSuggestingAdvanced, setIsSuggestingAdvanced] = useState(false);
  
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
  const lastPromptGenTime = useRef<number>(0);
  
  const [userCoords, setUserCoords] = useState<{latitude: number, longitude: number} | null>(null);

  // --- Tutorial and UI State ---
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [openSections, setOpenSections] = useState<string[]>(['core-concept']);

  const ideaInputRef = useRef<HTMLTextAreaElement>(null);
  const t = useMemo(() => appUIStrings[promptState.language] || appUIStrings['en'], [promptState.language]);
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

      // Ensure the 'Core Concept' section is open for early steps
      if (['core-concept', 'autofill-button'].includes(targetId)) {
        setOpenSections(prev => [...new Set([...prev, 'core-concept'])]);
      }
      
      // Open the 'Details' section and switch tabs if needed
      if (['details-tabs', 'environment-ai-button'].includes(targetId)) {
          setOpenSections(prev => [...new Set([...prev, 'details-tabs'])]);
      }
      if (targetId === 'environment-ai-button') {
          setActiveTabIndex(0); // Switch to "Scene" tab
      }

  }, [isTutorialActive, tutorialStep, tutorialSteps]);


  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const handleImageClear = useCallback(() => {
      setPromptState({ uploadedImage: null, useImageAsCameo: false });
      setUploadedImageUrl(null);
  }, [setPromptState]);

  const handleResetAll = useCallback(() => {
    setPromptState(INITIAL_STATE, 'replace');
    setGeneratedPrompt(null);
    setErrors({});
    setStoryboardImages([]);
    handleImageClear();
    setIsEditing(false);
    resetEditHistory('');
    setPromptVariations([]);
    addToast('All fields have been reset.', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setPromptState, addToast, handleImageClear, resetEditHistory]);

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
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const key = name as keyof PromptState;

    const newStateUpdate: Partial<PromptState> = { [key]: value };

    // If voice style is set to 'None', also clear the voice-over script.
    if (key === 'voiceStyle' && value === 'None') {
        newStateUpdate.voiceOver = '';
    }
    
    setPromptState(newStateUpdate);
    
    // Create a snapshot of the state as it will be after the update for validation purposes.
    const updatedState = { ...promptState, ...newStateUpdate };
    
    // Use a mutable copy of errors to perform all validation updates at once.
    const newErrors = { ...errors };

    // 1. Validate the field that was directly changed.
    const currentFieldError = validateField(key, value, updatedState, t);
    if (currentFieldError) {
        newErrors[key] = currentFieldError;
    } else {
        delete newErrors[key];
    }
    
    // 2. Handle validations for fields that depend on the changed field.
    if (key === 'artStyle') {
        const customArtStyleError = validateField('customArtStyle', updatedState.customArtStyle, updatedState, t);
        if (customArtStyleError) {
            newErrors.customArtStyle = customArtStyleError;
        } else {
            delete newErrors.customArtStyle;
        }
    }
    
    if (key === 'voiceStyle') {
        const voiceOverError = validateField('voiceOver', updatedState.voiceOver, updatedState, t);
        if (voiceOverError) {
            newErrors.voiceOver = voiceOverError;
        } else {
            delete newErrors.voiceOver;
        }
    }
    
    if (key === 'characterActions' || key === 'characterClothing') {
        const clothingDetailsError = validateField('characterSpecificClothing', updatedState.characterSpecificClothing, updatedState, t);
        if (clothingDetailsError) {
            newErrors.characterSpecificClothing = clothingDetailsError;
        } else {
            delete newErrors.characterSpecificClothing;
        }
    }

    // Atomically update the errors state.
    setErrors(newErrors);

}, [promptState, setPromptState, t, errors]);

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
  
  const handleImageUpload = useCallback((image: { data: string; mimeType: string; url: string; }) => {
      setPromptState({ uploadedImage: { data: image.data, mimeType: image.mimeType } });
      setUploadedImageUrl(image.url);
  }, [setPromptState]);

  const handleGeneratePrompt = useCallback(async () => {
    const validationErrors = validateAllFields(promptState, t);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      addToast(t.errorValidation, 'error');
      return;
    }

    setIsLoading(true);
    setGeneratedPrompt(null);
    setStoryboardImages([]);
    try {
      const result = await geminiService.generateVeoPrompt(promptState, userCoords);
      setGeneratedPrompt(result);
      lastPromptGenTime.current = Date.now();
      addToast(t.toastPromptGenerated, 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, t), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [promptState, t, addToast, userCoords]);
  
  const handleNewPrompt = useCallback(() => {
    setPromptState(INITIAL_STATE, 'replace');
    setGeneratedPrompt(null);
    setErrors({});
    setStoryboardImages([]);
    handleImageClear();
    setIsEditing(false);
    resetEditHistory('');
    setPromptVariations([]);
    addToast('Ready for a new prompt!', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setPromptState, addToast, handleImageClear, resetEditHistory]);
  
  const handleSavePrompt = useCallback((newPrompt: string) => {
    if (!generatedPrompt) return;
    const updatedPrompt = { ...generatedPrompt, prompt: newPrompt };
    setGeneratedPrompt(updatedPrompt);
    setIsEditing(false);
    addToast(t.toastPromptSaved, 'success');
  }, [generatedPrompt, addToast, t]);

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
    const updatedHistory = [newEntry, ...history.slice(0, 49)]; // Keep max 50 entries
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
    addToast(t.toastTemplateApplied, 'info');
    ideaInputRef.current?.focus();
  }, [promptState.language, setPromptState, addToast, t]);

  const handleOpenSavePresetModal = () => {
    setNewPresetName('');
    setIsSavePresetModalOpen(true);
  };
  
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

  const handleUseExample = useCallback((example: ExamplePrompt) => {
    setPromptState({ ...INITIAL_STATE, language: promptState.language, ...example.params }, 'replace');
    setGeneratedPrompt({ prompt: example.prompt, groundingChunks: example.groundingChunks });
    setErrors({});
    addToast(t.toastTemplateApplied, 'info');
    ideaInputRef.current?.focus();
  }, [promptState.language, setPromptState, addToast, t]);

  const handleGenerateVariations = async (basePrompt: string) => {
    setIsGeneratingVariations(true);
    setPromptVariations([]);
    setIsVariationsOpen(true);
    try {
        const variations = await geminiService.generatePromptVariations(basePrompt, promptState.language, promptState.model);
        setPromptVariations(variations);
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
        setIsVariationsOpen(false); // Close panel on error
    } finally {
        setIsGeneratingVariations(false);
    }
  };

  const handleRefinePrompt = async (basePrompt: string) => {
    setIsRefining(true);
    try {
        const refinedPrompt = await geminiService.refinePrompt(basePrompt, promptState);
        setGeneratedPrompt(prev => prev ? { ...prev, prompt: refinedPrompt } : { prompt: refinedPrompt, groundingChunks: prev?.groundingChunks });
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
    try {
      const imageUrl = await geminiService.generateConceptArt(prompt, promptState.aspectRatio);
      // In a real app, you'd display this image. For now, we'll just log it and show a toast.
      console.log("Generated Art URL:", imageUrl);
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

  const handleGenerateVideo = async (prompt: string) => {
    if (Date.now() - lastPromptGenTime.current < 500) {
      return; 
    }
    
    promptToRetry.current = prompt; // Store for potential retry

    if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            setIsApiKeyModalOpen(true);
            return;
        }
    }

    if (promptState.aspectRatio !== '16:9' && promptState.aspectRatio !== '9:16') {
      addToast(t.errorInvalidAspectRatioForVeo, 'error');
      return;
    }
    
    setIsGeneratingVideo(true);
    setVideoStatus('Init');
    setGeneratedVideoUrl(null);

    try {
      let operation = await geminiService.generateVideo(
        prompt, 
        promptState.uploadedImage,
        promptState.aspectRatio,
        promptState.resolution,
        promptState.veoModel
      );
      setVideoStatus('Processing');
      
      while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          setVideoStatus('Polling');
          operation = await geminiService.pollVideoOperation(operation);
      }
      
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setVideoStatus('Fetching');
        const videoBlobUrl = await geminiService.fetchVideo(downloadLink);
        setGeneratedVideoUrl(videoBlobUrl);
        setVideoStatus('Complete');
        addToast(t.toastVideoGenerated, 'success');
      } else {
        throw new Error("Video generation completed, but no download link was found.");
      }

    } catch(error) {
      const apiError = getApiErrorMessage(error, t);
      let shouldOpenModal = false;
      if (error instanceof ApiError && error.type === ApiErrorType.InvalidApiKey) {
          shouldOpenModal = true;
      }
      
      addToast(apiError, 'error');
      setVideoStatus('Error');

      if (shouldOpenModal) {
          setIsApiKeyModalOpen(true);
      }
    } finally {
      // Don't set isGeneratingVideo to false until the user closes the modal or it times out
    }
  };
  
  const handleSelectKeyAndRetry = async () => {
    if (typeof (window as any).aistudio?.openSelectKey !== 'function') return;

    await (window as any).aistudio.openSelectKey();
    setIsApiKeyModalOpen(false);
    // Optimistically assume key was selected and retry
    if (promptToRetry.current) {
        // Small delay to allow the new key to be registered
        setTimeout(() => {
            handleGenerateVideo(promptToRetry.current!);
        }, 250);
    }
  };

  const handleCloseVideoModal = () => {
    setIsGeneratingVideo(false);
    setVideoStatus('');
    // Revoke the object URL to prevent memory leaks
    if (generatedVideoUrl) {
      URL.revokeObjectURL(generatedVideoUrl);
    }
    setGeneratedVideoUrl(null);
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
  const characterEthnicityOptions = useMemo(() => getCharacterEthnicities(promptState.language), [promptState.language]);
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

  const handleAutoFillModifiers = useCallback(async () => {
    if (!promptState.idea.trim()) {
        addToast(t.errorValidation, 'error');
        return;
    }
    setIsAutoFilling(true);
    try {
        const suggestions = await geminiService.analyzeIdeaForModifiers(
            promptState.idea,
            promptState.language,
            {
                artStyles: artStyleOptions.map(o => o.value).filter(v => v !== 'Custom'),
                cameraMovements: cameraMovementOptions.map(o => o.value),
                colorPalettes: colorPaletteOptions.map(o => o.value),
                timeOfDay: timeOfDayOptions.map(o => o.value).filter(v => v !== 'Any'),
                weather: weatherOptions.map(o => o.value).filter(v => v !== 'Any'),
                visualEffects: visualEffectOptions.map(o => o.value),
                cameraDistances: cameraDistanceOptions.map(o => o.value),
                characterGenders: characterGenderOptions.map(o => o.value),
                characterAges: characterAgeOptions.map(o => o.value),
                characterMoods: characterMoodOptions.map(o => o.value).filter(v => v !== 'Any'),
                characterPoses: characterPoseOptions.map(o => o.value).filter(v => v !== 'Any'),
                characterClothings: characterClothingOptions.map(o => o.value),
                characterSkinTones: characterSkinToneOptions.map(o => o.value).filter(v => v !== 'Any'),
                ambientSounds: ambientSoundOptions.map(o => o.value),
                soundEffectsIntensity: soundEffectsIntensityOptions.map(o => o.value),
                voiceStyles: voiceStyleOptions.map(o => o.value),
                architecturalStyles: architecturalStyleOptions.map(o => o.value).filter(v => v !== 'Any'),
                lightingStyles: lightingStyleOptions.map(o => o.value).filter(v => v !== 'Any'),
                compositionalGuides: compositionalGuideOptions.map(o => o.value).filter(v => v !== 'Any'),
            },
            promptState.generateAsSeries,
            promptState.model,
            promptState.targetModel
        );
        
        const truncatedSuggestions: Partial<PromptState> = {};
        for (const key in suggestions) {
            const typedKey = key as keyof PromptState;
            const value = suggestions[typedKey];
            const limit = CHARACTER_LIMITS[typedKey as keyof typeof CHARACTER_LIMITS];

            if (limit && typeof value === 'string' && value.length > limit) {
                // Truncate to the last full word within the limit to avoid cutting mid-word.
                const truncatedValue = value.substring(0, limit);
                const lastSpaceIndex = truncatedValue.lastIndexOf(' ');
                (truncatedSuggestions as any)[typedKey] = (lastSpaceIndex > 0 ? truncatedValue.substring(0, lastSpaceIndex) : truncatedValue);
            } else {
                (truncatedSuggestions as any)[typedKey] = value;
            }
        }
        
        setPromptState(truncatedSuggestions);
        addToast(t.autofillSuccess, 'success');
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsAutoFilling(false);
    }
  }, [
      promptState.idea, 
      promptState.language, 
      promptState.generateAsSeries,
      promptState.model,
      promptState.targetModel,
      addToast, 
      setPromptState, 
      t, 
      artStyleOptions, 
      cameraMovementOptions, 
      colorPaletteOptions, 
      timeOfDayOptions, 
      weatherOptions, 
      visualEffectOptions, 
      cameraDistanceOptions,
      characterGenderOptions,
      characterAgeOptions,
      characterMoodOptions,
      characterPoseOptions,
      characterClothingOptions,
      // FIX: Corrected typo from characterSkinTones to characterSkinToneOptions
      characterSkinToneOptions,
      ambientSoundOptions,
      soundEffectsIntensityOptions,
      voiceStyleOptions,
      architecturalStyleOptions,
      lightingStyleOptions,
      compositionalGuideOptions,
  ]);
  
  const handleSuggestFullAudioDesign = useCallback(async () => {
    if (!promptState.idea.trim()) {
        addToast(t.errorValidation, 'error');
        return;
    }
    setIsSuggestingFullAudio(true);
    try {
        const suggestions = await geminiService.suggestFullAudioDesign(
            {
                artStyle: promptState.artStyle === 'Custom' ? promptState.customArtStyle : promptState.artStyle,
                cameraMovement: promptState.cameraMovement,
                idea: promptState.idea,
                environment: promptState.environment,
                characterActions: promptState.characterActions,
                characterMood: promptState.characterMood,
                voiceStyleOptions: voiceStyleOptions.map(o => o.value)
            },
            promptState.language,
            promptState.model,
            ambientSoundOptions.map(o => o.value),
            soundEffectsIntensityOptions.map(o => o.value)
        );
        
        setPromptState({
            voiceStyle: suggestions.suggestedVoiceStyle,
            voiceOver: suggestions.suggestedVoiceOverScript,
            ambientSound: suggestions.suggestedAmbientSound,
            soundEffectsIntensity: suggestions.suggestedSoundEffectsIntensity,
        });

        const newErrors = {...errors};
        delete newErrors.voiceStyle;
        delete newErrors.voiceOver;
        setErrors(newErrors);

        addToast(t.toastAudioSuggested, 'success');
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsSuggestingFullAudio(false);
    }
}, [
    promptState,
    setPromptState,
    addToast,
    t,
    voiceStyleOptions,
    ambientSoundOptions,
    soundEffectsIntensityOptions,
    errors
]);

const handleSuggestEnvironmentDetails = useCallback(async () => {
    if (!promptState.environment.trim()) {
        addToast(t.errorValidation, 'error');
        return;
    }
    setIsSuggestingEnvironment(true);
    try {
        const suggestions = await geminiService.suggestEnvironmentDetails(
            promptState.environment,
            promptState.language,
            promptState.model
        );
        
        const updates: Partial<PromptState> = {};
        
        // Append sensory details, preventing duplication and preserving user input
        if (suggestions.environmentSensoryDetails?.trim()) {
            updates.environmentSensoryDetails = [promptState.environmentSensoryDetails, suggestions.environmentSensoryDetails]
                .filter(Boolean) // Remove empty/null values
                .join(', '); // Join with a comma
        }
        
        // Append dynamic events, preserving user input
        if (suggestions.environmentDynamicEvents?.trim()) {
            updates.environmentDynamicEvents = [promptState.environmentDynamicEvents, suggestions.environmentDynamicEvents]
                .filter(Boolean)
                .join(', ');
        }
        
        if (Object.keys(updates).length > 0) {
            setPromptState(updates);
            addToast(t.toastEnvironmentSuggested, 'success');
        }
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsSuggestingEnvironment(false);
    }
}, [promptState.environment, promptState.language, promptState.model, promptState.environmentSensoryDetails, promptState.environmentDynamicEvents, addToast, setPromptState, t]);

const handleSuggestSensoryDetails = useCallback(async () => {
    if (!promptState.environment.trim()) {
        addToast(t.errorValidation, 'error');
        return;
    }
    setIsSuggestingSensoryDetails(true);
    try {
        const suggestion = await geminiService.suggestSensoryDetails(
            promptState.environment,
            promptState.language,
            promptState.model
        );
        setPromptState({ environmentSensoryDetails: suggestion });
        addToast(t.toastSensoryDetailsSuggested, 'success');
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsSuggestingSensoryDetails(false);
    }
}, [promptState.environment, promptState.language, promptState.model, addToast, setPromptState, t]);

const handleSuggestCharacterNuances = useCallback(async () => {
    if (!promptState.characterActions.trim() && promptState.characterMood === 'Any') {
        addToast(t.errorValidation, 'error');
        return;
    }
    setIsSuggestingCharacterNuances(true);
    try {
        const suggestion = await geminiService.suggestCharacterNuances(
            promptState.characterActions,
            promptState.characterMood,
            promptState.language,
            promptState.model
        );
        setPromptState({ characterNuances: suggestion });
        addToast(t.toastCharacterNuancesSuggested, 'success');
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsSuggestingCharacterNuances(false);
    }
}, [promptState.characterActions, promptState.characterMood, promptState.language, promptState.model, addToast, setPromptState, t]);

const handleSuggestVisualEffect = useCallback(async () => {
    const { artStyle, customArtStyle, characterMood, language, model } = promptState;
    if ((artStyle === 'Custom' && !customArtStyle.trim()) || characterMood === 'Any') {
        addToast(t.errorValidation, 'error');
        return;
    }
    setIsSuggestingEffect(true);
    try {
        const suggestion = await geminiService.suggestVisualEffect(
            artStyle,
            customArtStyle,
            characterMood,
            language,
            model,
            visualEffectOptions.map(o => o.value)
        );
        setPromptState({ visualEffect: suggestion });
        addToast(t.toastEffectSuggested, 'success');
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsSuggestingEffect(false);
    }
}, [promptState, setPromptState, addToast, t, visualEffectOptions]);

const handleSuggestAdvancedSettings = useCallback(async () => {
    if (!promptState.idea.trim()) {
        addToast(t.errorValidation, 'error');
        return;
    }
    setIsSuggestingAdvanced(true);
    try {
        const suggestions = await geminiService.suggestAdvancedSettings(
            {
                idea: promptState.idea,
                artStyle: promptState.artStyle,
                customArtStyle: promptState.customArtStyle,
                cameraMovement: promptState.cameraMovement,
                targetModel: promptState.targetModel,
            },
            promptState.language,
            promptState.model,
            {
                motionIntensity: motionIntensityOptions.map(o => o.value),
                creativityLevel: creativityLevelOptions.map(o => o.value),
            }
        );
        
        setPromptState({
            negativePrompt: suggestions.negativePrompt,
            motionIntensity: suggestions.motionIntensity,
            creativityLevel: suggestions.creativityLevel,
        });

        addToast(t.toastAdvancedSuggested, 'success');
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsSuggestingAdvanced(false);
    }
}, [promptState, motionIntensityOptions, creativityLevelOptions, addToast, setPromptState, t]);


  useEffect(() => {
    if (artStyleDebounceTimeout.current) {
      clearTimeout(artStyleDebounceTimeout.current);
    }

    if (!promptState.customArtStyle.trim() || promptState.artStyle !== 'Custom') {
      setArtStyleSuggestions([]);
      return;
    }

    artStyleDebounceTimeout.current = window.setTimeout(async () => {
      setIsSuggestingArtStyle(true);
      try {
        const suggestions = await geminiService.suggestArtStyles(
          promptState.customArtStyle,
          promptState.language,
          promptState.model
        );
        setArtStyleSuggestions(suggestions);
      } catch (error) {
        console.error("Failed to fetch art style suggestions:", error);
        addToast(getApiErrorMessage(error, t), 'error');
        setArtStyleSuggestions([]);
      } finally {
        setIsSuggestingArtStyle(false);
      }
    }, 750);

  }, [promptState.customArtStyle, promptState.language, promptState.model, promptState.artStyle, addToast, t]);

  const handleArtStyleSuggestionClick = (suggestion: string) => {
    const newValue = promptState.customArtStyle.trim()
      ? `${promptState.customArtStyle}, ${suggestion}`
      : suggestion;
    
    const fakeEvent = { target: { name: 'customArtStyle', value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
    handleInputChange(fakeEvent);
    
    setArtStyleSuggestions([]);
  };

  useEffect(() => {
    if (characterDetailsDebounceTimeout.current) {
        clearTimeout(characterDetailsDebounceTimeout.current);
    }

    if (promptState.characterArchetype === 'Any' || !promptState.environment.trim()) {
        setClothingSuggestions([]);
        setAccessorySuggestions([]);
        return;
    }

    characterDetailsDebounceTimeout.current = window.setTimeout(async () => {
        setIsSuggestingCharacterDetails(true);
        try {
            const suggestions = await geminiService.suggestCharacterDetails(
                promptState.characterArchetype,
                promptState.environment,
                promptState.language,
                promptState.model
            );
            setClothingSuggestions(suggestions.clothingSuggestions);
            setAccessorySuggestions(suggestions.accessorySuggestions);
        } catch (error) {
            addToast(getApiErrorMessage(error, t), 'error');
            setClothingSuggestions([]);
            setAccessorySuggestions([]);
        } finally {
            setIsSuggestingCharacterDetails(false);
        }
    }, 1000); // 1-second debounce

  }, [promptState.characterArchetype, promptState.environment, promptState.language, promptState.model, addToast, t]);

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
    
    // Smart default for Sora 2 emulation: switch from the generic 'Cinematic' style to 'Photorealistic'.
    if (newModel === 'sora' && promptState.artStyle === 'Cinematic') {
        updates.artStyle = 'Photorealistic';
        addToast(t.toastSoraStyleSet, 'info');
    }
    
    setPromptState(updates);
}, [promptState.artStyle, setPromptState, addToast, t]);

  const autoFillButton = (
    <button
        onClick={handleAutoFillModifiers}
        disabled={isAutoFilling || !promptState.idea}
        className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label={t.autofillButton}
        title={t.autofillButton}
        data-tutorial-id="autofill-button"
    >
        {isAutoFilling ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
    </button>
  );

  const audioSuggestButton = (
    <button
        onClick={handleSuggestFullAudioDesign}
        disabled={isSuggestingFullAudio || !promptState.idea}
        className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label={t.suggestSensoryDetailsButton}
        title={t.suggestSensoryDetailsButton}
    >
        {isSuggestingSensoryDetails ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
    </button>
  );
  
  const characterNuancesButton = (
    <button
        onClick={handleSuggestCharacterNuances}
        disabled={isSuggestingCharacterNuances || (!promptState.characterActions.trim() && promptState.characterMood === 'Any')}
        className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label={t.suggestCharacterNuancesButton}
        title={t.suggestCharacterNuancesButton}
    >
        {isSuggestingCharacterNuances ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
    </button>
  );

  const effectSuggestButton = (
    <button
        onClick={handleSuggestVisualEffect}
        disabled={isSuggestingEffect || (promptState.artStyle === 'Custom' && !promptState.customArtStyle.trim()) || promptState.characterMood === 'Any'}
        className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label={t.tooltips.suggestEffectButton}
        title={t.tooltips.suggestEffectButton}
    >
        {isSuggestingEffect ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
    </button>
  );

  const tabs = useMemo(() => {
    const advancedSuggestButton = (
        <button
            onClick={handleSuggestAdvancedSettings}
            disabled={isSuggestingAdvanced || !promptState.idea}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50"
            aria-label={t.tooltips.suggestAdvancedButton}
            title={t.tooltips.suggestAdvancedButton}
        >
            {isSuggestingAdvanced ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name="magic" className="w-4 h-4" />}
            <span>{t.suggestAdvancedButton}</span>
        </button>
    );

    return [
    {
      label: t.tabScene,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextAreaInput
                label={t.labelEnvironment}
                name="environment"
                value={promptState.environment}
                onChange={handleInputChange}
                placeholder={t.placeholderEnvironment}
                maxLength={CHARACTER_LIMITS.environment}
                rows={3}
                error={errors.environment}
                info={t.tooltips.environment}
                actionButton={environmentDetailsButton}
            />
            <TextAreaInput
                label={t.labelSensoryDetails}
                name="environmentSensoryDetails"
                value={promptState.environmentSensoryDetails}
                onChange={handleInputChange}
                placeholder={t.placeholderSensoryDetails}
                maxLength={CHARACTER_LIMITS.environmentSensoryDetails}
                rows={3}
                error={errors.environmentSensoryDetails}
                info={t.tooltips.sensoryDetails}
                actionButton={sensoryDetailsButton}
            />
            <TextAreaInput
                label={t.labelEnvironmentDynamicEvents}
                name="environmentDynamicEvents"
                value={promptState.environmentDynamicEvents}
                onChange={handleInputChange}
                placeholder={t.placeholderEnvironmentDynamicEvents}
                maxLength={CHARACTER_LIMITS.environmentDynamicEvents}
                rows={3}
                error={errors.environmentDynamicEvents}
                info={t.tooltips.environmentDynamicEvents}
            />
            <SelectInput
                label={t.labelArchitecturalStyle}
                name="architecturalStyle"
                options={architecturalStyleOptions}
                value={promptState.architecturalStyle}
                onChange={handleInputChange}
                error={errors.architecturalStyle}
                info={t.tooltips.architecturalStyle}
            />
            <SelectInput
                label={t.labelTimeOfDay}
                name="timeOfDay"
                options={timeOfDayOptions}
                value={promptState.timeOfDay}
                onChange={handleInputChange}
                error={errors.timeOfDay}
                info={t.tooltips.timeOfDay}
            />
            <SelectInput
                label={t.labelWeather}
                name="weather"
                options={weatherOptions}
                value={promptState.weather}
                onChange={handleInputChange}
                error={errors.weather}
                info={t.tooltips.weather}
            />
        </div>
      ),
    },
    {
        label: t.tabCharacter,
        content: (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 lg:col-span-3">
                    <TextAreaInput
                        label={t.labelCharacterActions}
                        name="characterActions"
                        value={promptState.characterActions}
                        onChange={handleInputChange}
                        placeholder={t.placeholderCharacterActions}
                        maxLength={CHARACTER_LIMITS.characterActions}
                        rows={3}
                        error={errors.characterActions}
                        info={t.tooltips.characterActions}
                    />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                    <TextAreaInput
                        label={t.labelCharacterObjectInteraction}
                        name="characterObjectInteraction"
                        value={promptState.characterObjectInteraction}
                        onChange={handleInputChange}
                        placeholder={t.placeholderCharacterObjectInteraction}
                        maxLength={CHARACTER_LIMITS.characterObjectInteraction}
                        rows={2}
                        error={errors.characterObjectInteraction}
                        info={t.tooltips.characterObjectInteraction}
                    />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                    <TextAreaInput
                        label={t.labelCharacterNuances}
                        name="characterNuances"
                        value={promptState.characterNuances}
                        onChange={handleInputChange}
                        placeholder={t.placeholderCharacterNuances}
                        maxLength={CHARACTER_LIMITS.characterNuances}
                        rows={2}
                        error={errors.characterNuances}
                        info={t.tooltips.characterNuances}
                        actionButton={characterNuancesButton}
                    />
                </div>
                <SelectInput label={t.labelCharacterGender} name="characterGender" options={characterGenderOptions} value={promptState.characterGender} onChange={handleInputChange} error={errors.characterGender} info={t.tooltips.characterGender} />
                <SelectInput label={t.labelCharacterEthnicity} name="characterEthnicity" options={characterEthnicityOptions} value={promptState.characterEthnicity} onChange={handleInputChange} error={errors.characterEthnicity} info={t.tooltips.characterEthnicity} />
                <SelectInput label={t.labelCharacterAge} name="characterAge" options={characterAgeOptions} value={promptState.characterAge} onChange={handleInputChange} error={errors.characterAge} info={t.tooltips.characterAge} />
                <SelectInput label={t.labelCharacterMood} name="characterMood" options={characterMoodOptions} value={promptState.characterMood} onChange={handleInputChange} error={errors.characterMood} info={t.tooltips.characterMood} />
                <SelectInput label={t.labelCharacterPose} name="characterPose" options={characterPoseOptions} value={promptState.characterPose} onChange={handleInputChange} error={errors.characterPose} info={t.tooltips.characterPose} />
                <SelectInput label={t.labelCharacterSkinTone} name="characterSkinTone" options={characterSkinToneOptions} value={promptState.characterSkinTone} onChange={handleInputChange} error={errors.characterSkinTone} info={t.tooltips.characterSkinTone} />
                <SelectInput label={t.labelCharacterArchetype} name="characterArchetype" options={characterArchetypeOptions} value={promptState.characterArchetype} onChange={handleInputChange} error={errors.characterArchetype} info={t.tooltips.characterArchetype} />
                <div className="lg:col-span-2">
                    <TextAreaInput
                        label={t.labelCharacterSpecificClothing}
                        name="characterSpecificClothing"
                        value={promptState.characterSpecificClothing}
                        onChange={handleInputChange}
                        placeholder={t.placeholderCharacterSpecificClothing}
                        maxLength={CHARACTER_LIMITS.characterSpecificClothing}
                        rows={2}
                        error={errors.characterSpecificClothing}
                        info={t.tooltips.characterSpecificClothing}
                    />
                    { (clothingSuggestions.length > 0 && !isSuggestingCharacterDetails) && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {clothingSuggestions.map((s, i) => (
                                <button key={i} onClick={() => handleCharacterSuggestionClick(s, 'characterSpecificClothing')} className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">+ {s}</button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="lg:col-span-2">
                    <TextAreaInput
                        label={t.labelCharacterAccessories}
                        name="characterAccessories"
                        value={promptState.characterAccessories}
                        onChange={handleInputChange}
                        placeholder={t.placeholderCharacterAccessories}
                        maxLength={CHARACTER_LIMITS.characterAccessories}
                        rows={2}
                        error={errors.characterAccessories}
                        info={t.tooltips.characterAccessories}
                    />
                    { (accessorySuggestions.length > 0 && !isSuggestingCharacterDetails) && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {accessorySuggestions.map((s, i) => (
                                <button key={i} onClick={() => handleCharacterSuggestionClick(s, 'characterAccessories')} className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">+ {s}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )
    },
    {
      label: t.tabStyle,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SelectInput label={t.labelArtStyle} name="artStyle" options={artStyleOptions} value={promptState.artStyle} onChange={handleInputChange} error={errors.artStyle} info={t.tooltips.artStyle} />
            {promptState.artStyle === 'Custom' && (
                <div className="md:col-span-2">
                    <TextAreaInput
                        label={t.labelCustomArtStyle}
                        name="customArtStyle"
                        value={promptState.customArtStyle}
                        onChange={handleInputChange}
                        placeholder={t.placeholderCustomArtStyle}
                        maxLength={CHARACTER_LIMITS.customArtStyle}
                        rows={2}
                        error={errors.customArtStyle}
                        info={t.tooltips.customArtStyle}
                    />
                    { (isSuggestingArtStyle || artStyleSuggestions.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {isSuggestingArtStyle 
                                ? <div className="text-xs text-slate-300 flex items-center"><Icon name="spinner" className="w-3 h-3 mr-1.5 animate-spin" /> Suggesting...</div>
                                : artStyleSuggestions.map((suggestion, i) => (
                                    <button key={i} onClick={() => handleArtStyleSuggestionClick(suggestion)} className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">+ {suggestion}</button>
                                ))
                            }
                        </div>
                    )}
                </div>
            )}
            <SelectInput
                label={t.labelLightingStyle}
                name="lightingStyle"
                options={lightingStyleOptions}
                value={promptState.lightingStyle}
                onChange={handleInputChange}
                error={errors.lightingStyle}
                info={t.tooltips.lightingStyle}
            />
            <SelectInput label={t.labelColorPalette} name="colorPalette" options={colorPaletteOptions} value={promptState.colorPalette} onChange={handleInputChange} error={errors.colorPalette} info={t.tooltips.colorPalette} />
            <SelectInput label={t.labelVisualEffect} name="visualEffect" options={visualEffectOptions} value={promptState.visualEffect} onChange={handleInputChange} error={errors.visualEffect} info={t.tooltips.visualEffect} actionButton={effectSuggestButton} />
            <SelectInput 
                label={t.labelAnimationPreset} 
                name="animationPreset" 
                options={animationPresetOptions} 
                value={promptState.animationPreset} 
                onChange={handleInputChange} 
                error={errors.animationPreset} 
                info={t.tooltips.animationPreset} 
            />
        </div>
      )
    },
    {
      label: t.tabCamera,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SelectInput label={t.labelCameraMovement} name="cameraMovement" options={cameraMovementOptions} value={promptState.cameraMovement} onChange={handleInputChange} error={errors.cameraMovement} info={t.tooltips.cameraMovement} />
            <SelectInput label={t.labelCameraDistance} name="cameraDistance" options={cameraDistanceOptions} value={promptState.cameraDistance} onChange={handleInputChange} error={errors.cameraDistance} info={t.tooltips.cameraDistance} />
            <SelectInput label={t.labelLensType} name="lensType" options={lensTypeOptions} value={promptState.lensType} onChange={handleInputChange} error={errors.lensType} info={t.tooltips.lensType} />
            <SelectInput
                label={t.labelCompositionalGuide}
                name="compositionalGuide"
                options={compositionalGuideOptions}
                value={promptState.compositionalGuide}
                onChange={handleInputChange}
                error={errors.compositionalGuide}
                info={t.tooltips.compositionalGuide}
            />
            <SelectInput label={t.labelAspectRatio} name="aspectRatio" options={aspectRatioOptions} value={promptState.aspectRatio} onChange={handleInputChange} error={errors.aspectRatio} info={t.tooltips.aspectRatio} />
            <SelectInput label={t.labelResolution} name="resolution" options={resolutionOptions} value={promptState.resolution} onChange={handleInputChange} error={errors.resolution} info={t.tooltips.resolution} />
        </div>
      )
    },
    {
      label: t.tabAudio,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <SelectInput label={t.labelVoiceStyle} name="voiceStyle" options={voiceStyleOptions} value={promptState.voiceStyle} onChange={handleInputChange} error={errors.voiceStyle} info={t.tooltips.voiceStyle} actionButton={audioSuggestButton} />
            </div>
            {promptState.voiceStyle !== 'None' && (
                <div className="md:col-span-2">
                    <TextAreaInput
                        label={t.labelVoiceOver}
                        name="voiceOver"
                        value={promptState.voiceOver}
                        onChange={handleInputChange}
                        placeholder={t.placeholderVoiceOver}
                        maxLength={CHARACTER_LIMITS.voiceOver}
                        rows={3}
                        error={errors.voiceOver}
                        info={t.tooltips.voiceOver}
                    />
                </div>
            )}
            <SelectInput label={t.labelAmbientSound} name="ambientSound" options={ambientSoundOptions} value={promptState.ambientSound} onChange={handleInputChange} error={errors.ambientSound} info={t.tooltips.ambientSound} />
            <SelectInput label={t.labelSoundEffectsIntensity} name="soundEffectsIntensity" options={soundEffectsIntensityOptions} value={promptState.soundEffectsIntensity} onChange={handleInputChange} error={errors.soundEffectsIntensity} info={t.tooltips.soundEffectsIntensity} />
        </div>
      )
    },
    {
      label: t.tabAdvanced,
      content: (
        <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-4 border-b border-slate-700 pb-2 flex justify-between items-center">
                <span>{t.subheadingAdvancedControls}</span>
                {advancedSuggestButton}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextAreaInput label={t.labelNegativePrompt} name="negativePrompt" value={promptState.negativePrompt} onChange={handleInputChange} placeholder={t.placeholderNegativePrompt} maxLength={CHARACTER_LIMITS.negativePrompt} rows={2} error={errors.negativePrompt} info={t.tooltips.negativePrompt} />
                <SelectInput label={t.labelMotionIntensity} name="motionIntensity" options={motionIntensityOptions} value={promptState.motionIntensity} onChange={handleInputChange} error={errors.motionIntensity} info={t.tooltips.motionIntensity} />
                <SelectInput label={t.labelCreativityLevel} name="creativityLevel" options={creativityLevelOptions} value={promptState.creativityLevel} onChange={handleInputChange} error={errors.creativityLevel} info={t.tooltips.creativityLevel} />
                <div className="space-y-3 md:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <CheckboxInput id="optimizeFor8Seconds" name="optimizeFor8Seconds" label={t.labelOptimizeFor8Seconds} checked={promptState.optimizeFor8Seconds} onChange={handleCheckboxChange} tooltipText={t.tooltips.optimizeFor8Seconds} />
                        <CheckboxInput id="includeOverlayText" name="includeOverlayText" label={t.labelIncludeOverlayText} checked={promptState.includeOverlayText} onChange={handleCheckboxChange} tooltipText={t.tooltips.includeOverlayText} />
                        <CheckboxInput id="useGoogleSearch" name="useGoogleSearch" label={t.labelUseGoogleSearch} checked={promptState.useGoogleSearch} onChange={handleCheckboxChange} tooltipText={t.tooltips.useGoogleSearch} />
                        <CheckboxInput id="useGoogleMaps" name="useGoogleMaps" label="Ground with Google Maps" checked={promptState.useGoogleMaps} onChange={handleCheckboxChange} tooltipText="Allows the model to use Google Maps for location-based information." />
                        <CheckboxInput id="generateAsSeries" name="generateAsSeries" label={t.labelGenerateAsSeries} checked={promptState.generateAsSeries} onChange={handleCheckboxChange} tooltipText={t.tooltips.generateAsSeries} />
                        <CheckboxInput id="thinkingMode" name="thinkingMode" label={t.labelThinkingMode} checked={promptState.thinkingMode} onChange={handleCheckboxChange} tooltipText={t.tooltips.thinkingMode} color="fuchsia" />
                    </div>
                </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-300 mb-4 mt-8 border-b border-slate-700 pb-2">External Context</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <TextAreaInput 
                    label={t.labelYoutubeUrl}
                    name="youtubeUrl"
                    value={promptState.youtubeUrl}
                    onChange={handleInputChange}
                    placeholder={t.placeholderYoutubeUrl}
                    maxLength={CHARACTER_LIMITS.youtubeUrl}
                    rows={2}
                    error={errors.youtubeUrl}
                    info={t.tooltips.youtubeUrl}
                 />
            </div>

            <h3 className="text-lg font-semibold text-slate-300 mb-4 mt-8 border-b border-slate-700 pb-2">{t.subheadingModelConfig}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectInput label={t.labelModel} name="model" options={modelOptions} value={promptState.model} onChange={handleInputChange} error={errors.model} info={t.tooltips.model} />
                <SelectInput label={t.labelVeoModel} name="veoModel" options={veoModelOptions} value={promptState.veoModel} onChange={handleInputChange} error={errors.veoModel} info={t.tooltips.veoModel} />
                <div className="md:col-span-2">
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
                </div>
            </div>
        </div>
      )
    },
  ];
}, [
    t, 
    promptState, 
    errors, 
    handleInputChange, 
    handleCheckboxChange, 
    architecturalStyleOptions, 
    timeOfDayOptions, 
    weatherOptions, 
    characterGenderOptions, 
    characterEthnicityOptions, 
    characterAgeOptions, 
    characterMoodOptions, 
    characterPoseOptions, 
    characterSkinToneOptions, 
    characterArchetypeOptions, 
    clothingSuggestions, 
    accessorySuggestions, 
    artStyleOptions, 
    artStyleSuggestions, 
    isSuggestingArtStyle, 
    lightingStyleOptions, 
    colorPaletteOptions, 
    visualEffectOptions, 
    cameraMovementOptions, 
    cameraDistanceOptions, 
    lensTypeOptions, 
    compositionalGuideOptions, 
    aspectRatioOptions, 
    resolutionOptions, 
    animationPresetOptions, 
    voiceStyleOptions, 
    ambientSoundOptions, 
    soundEffectsIntensityOptions, 
    motionIntensityOptions,
    creativityLevelOptions,
    modelOptions, 
    veoModelOptions, 
    effectSuggestButton, 
    audioSuggestButton, 
    handleTargetModelChange,
    isSuggestingAdvanced,
    handleSuggestAdvancedSettings,
]);

  const handleToggleSection = (sectionId: string) => {
    setOpenSections(prev => 
        prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  return (
    <div className={`theme-${theme} font-sans min-h-screen bg-slate-950 text-slate-200 transition-colors duration-300`}>
      <div className="absolute inset-0 bg-grid-slate-800/20 [mask-image:linear-gradient(to_bottom,white_20%,transparent_100%)]"></div>
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        ))}
      </div>

      <TutorialGuide
        isActive={isTutorialActive}
        steps={tutorialSteps}
        currentStepIndex={tutorialStep}
        onNext={handleTutorialNext}
        onPrev={handleTutorialPrev}
        onFinish={endTutorial}
        uiStrings={t.tutorial}
      />

      <div className="container mx-auto px-4 relative z-10">
        <Header 
            onShowHistory={() => setIsHistoryOpen(true)}
            onResetAll={handleResetAll}
            historyButtonText={t.historyButton}
            onShowImageStudio={() => setIsImageStudioOpen(true)}
            imageStudioButtonText={t.imageStudioButton}
            onShowSunoStudio={() => setIsSunoStudioOpen(true)}
            sunoStudioButtonText={t.sunoStudioButton}
            onShowVideoAnalysis={() => setIsVideoAnalysisOpen(true)}
            isSyncConnected={isSyncConnected}
            theme={theme}
            onThemeToggle={handleThemeToggle}
            onStartTutorial={startTutorial}
            uiStrings={t}
        />

        <main className="py-4">
            <h1 data-tutorial-id="app-title" className="text-3xl sm:text-4xl font-bold text-center text-slate-100">{t.headerTitle}</h1>
            <p className="text-center text-slate-300 mt-2">{t.headerSubtitle}</p>

            <div className="mt-8 space-y-6">
                
                {/* Examples */}
                {isExamplesVisible && (
                    <ExamplesCarousel 
                        examples={examplePrompts} 
                        onUseExample={handleUseExample} 
                        useExampleText={t.examplesCarousel.use}
                        onClose={() => setIsExamplesVisible(false)}
                        title={t.examplesCarousel.title}
                    />
                )}
                
                {/* Main Prompt Builder */}
                <CollapsibleSection 
                    title={t.sectionCoreConcept} 
                    stepNumber={1} 
                    tutorialId="core-concept"
                    isOpen={openSections.includes('core-concept')}
                    onToggle={() => handleToggleSection('core-concept')}
                >
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TextAreaInput
                            ref={ideaInputRef}
                            label={t.labelIdea}
                            name="idea"
                            value={promptState.idea}
                            onChange={handleInputChange}
                            placeholder={t.placeholderIdea}
                            maxLength={CHARACTER_LIMITS.idea}
                            rows={6}
                            error={errors.idea}
                            info={t.tooltips.idea}
                            actionButton={autoFillButton}
                        />
                         <div>
                            <ImageUploadInput 
                                label={t.imageUploadLabel}
                                placeholder={t.imageUploadPlaceholder}
                                onImageSelect={handleImageUpload}
                                onImageClear={handleImageClear}
                                uploadedImageUrl={uploadedImageUrl}
                                info={t.tooltips.imageUpload}
                            />
                            {promptState.targetModel === 'sora' && (
                                <div className="mt-2">
                                    <CheckboxInput
                                        id="useImageAsCameo"
                                        name="useImageAsCameo"
                                        label={t.labelUseImageAsCameo}
                                        checked={promptState.useImageAsCameo}
                                        onChange={handleCheckboxChange}
                                        tooltipText={t.tooltips.useImageAsCameo}
                                        disabled={!promptState.uploadedImage}
                                    />
                                </div>
                            )}
                         </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="2. Details"
                    tutorialId="details-tabs"
                    isOpen={openSections.includes('details-tabs')}
                    onToggle={() => handleToggleSection('details-tabs')}
                >
                    <div className="p-4 sm:p-6">
                         <Tabs 
                            tabs={tabs} 
                            activeTabIndex={activeTabIndex}
                            onTabChange={setActiveTabIndex}
                        />
                    </div>
                </CollapsibleSection>
                
                {!generatedPrompt ? (
                    <div className="mt-8 space-y-4 animate-fade-in-up" data-tutorial-id="action-bar">
                        <PromptBuilderSummary promptState={promptState} uiStrings={t.summary} />
                        <div className="bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-slate-700">
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
                                onSetIsEditing={setIsEditing}
                                onSetEditedPrompt={setEditedPrompt}
                                canUndoEdit={canUndoEdit}
                                onUndoEdit={undoEdit}
                                canRedoEdit={canRedoEdit}
                                onRedoEdit={redoEdit}
                                isGeneratingArt={isGeneratingArt}
                                onGenerateArt={handleGenerateArt}
                                isGeneratingVideo={isGeneratingVideo}
                                onGenerateVideo={handleGenerateVideo}
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
                            />
                        </div>
                    </div>
                 ) : null}

                {generatedPrompt && (
                    <div className="animate-fade-in-up" data-tutorial-id="output-section">
                        <PromptOutput 
                            prompt={generatedPrompt.prompt}
                            groundingChunks={generatedPrompt.groundingChunks}
                            storyboardImages={storyboardImages}
                            isEditing={isEditing}
                            editedPrompt={editedPrompt}
                            onEditChange={(val) => setEditedPrompt(val)}
                            onEditKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsEditing(false);
                                } else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    undoEdit();
                                } else if (e.key === 'y' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    redoEdit();
                                }
                            }}
                        />
                         <div className="bg-slate-950/80 backdrop-blur-md p-3 rounded-b-2xl border-x border-b border-slate-700 -mt-px">
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
                                onSetIsEditing={setIsEditing}
                                onSetEditedPrompt={setEditedPrompt}
                                canUndoEdit={canUndoEdit}
                                onUndoEdit={undoEdit}
                                canRedoEdit={canRedoEdit}
                                onRedoEdit={redoEdit}
                                isGeneratingArt={isGeneratingArt}
                                onGenerateArt={handleGenerateArt}
                                isGeneratingVideo={isGeneratingVideo}
                                onGenerateVideo={handleGenerateVideo}
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
                            />
                        </div>
                    </div>
                )}
            </div>
            
             <ChatBot />

        </main>
        
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
                onClose={() => setIsTemplatesOpen(false)}
                uiStrings={t.templates}
            />
        )}
         {isVariationsOpen && (
            <VariationsPanel
                variations={promptVariations}
                isLoading={isGeneratingVariations}
                onSelect={handleSelectVariation}
                onClose={() => setIsVariationsOpen(false)}
                uiStrings={t.variations}
                language={promptState.language}
                model={promptState.model}
                addToast={addToast}
            />
        )}
        {isImageStudioOpen && (
            <ImageStudio 
                onClose={() => setIsImageStudioOpen(false)}
                aspectRatioOptions={aspectRatioOptions}
                uiStrings={{...t.imageStudio, ...t}}
                addToast={addToast}
            />
        )}
        {isSunoStudioOpen && (
            <SunoSongStudio
                onClose={() => setIsSunoStudioOpen(false)}
                uiStrings={t.sunoStudio}
                addToast={addToast}
                language={promptState.language}
                model={promptState.model}
            />
        )}
        {isVideoAnalysisOpen && (
             <VideoAnalysisStudio 
                onClose={() => setIsVideoAnalysisOpen(false)}
                uiStrings={t.videoAnalysisStudio}
                addToast={addToast}
                onUseAnalysis={(text) => {
                    const fakeEvent = { target: { name: 'idea', value: text } } as React.ChangeEvent<HTMLTextAreaElement>;
                    handleInputChange(fakeEvent);
                }}
            />
        )}
        {isPronunciationGuideOpen && (
            <PronunciationGuide 
                guideData={pronunciationGuides[promptState.language].terms}
                onClose={() => setIsPronunciationGuideOpen(false)}
                uiStrings={t.pronunciationGuide}
            />
        )}

        {isGeneratingVideo && (
            <VideoGenerationProgress
                currentStatus={videoStatus}
                generatedVideoUrl={generatedVideoUrl}
                onClose={handleCloseVideoModal}
                uiStrings={t}
                language={promptState.language}
            />
        )}
        
        {isApiKeyModalOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900/70 backdrop-blur-xl w-full max-w-lg rounded-2xl shadow-2xl border border-slate-700/50 p-6 text-center">
                    <h2 className="text-lg font-semibold text-slate-100">API Key Required for Veo</h2>
                    <p className="text-slate-400 mt-2">Video generation with Veo 3.1 requires a valid API key associated with a project that has billing enabled.</p>
                    <p className="text-slate-400 mt-2">Please select your key to continue. For more information, please see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">billing documentation</a>.</p>
                    <div className="mt-6 flex justify-center gap-4">
                        <Button onClick={handleSelectKeyAndRetry}>Select API Key & Retry</Button>
                        <Button onClick={() => setIsApiKeyModalOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </div>
        )}

        {isSavePresetModalOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900/70 backdrop-blur-xl w-full max-w-md rounded-2xl shadow-2xl border border-slate-700/50 p-6">
                    <h2 className="text-lg font-semibold text-slate-100">{t.savePresetModal.title}</h2>
                    <p className="text-slate-400 mt-2 text-sm">Save the current settings as a reusable preset.</p>
                    <div className="mt-4">
                        <label htmlFor="preset-name" className="block text-sm font-medium text-slate-300">{t.savePresetModal.label}</label>
                        <input
                            type="text"
                            id="preset-name"
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            placeholder={t.savePresetModal.placeholder}
                            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 p-2"
                            autoFocus
                        />
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                        <button 
                            onClick={() => setIsSavePresetModalOpen(false)}
                            className="px-6 py-3 border border-slate-700 text-base font-medium rounded-md text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 transition-colors"
                        >
                            {t.savePresetModal.cancel}
                        </button>
                        <button 
                            onClick={handleSavePreset}
                            className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 transition-colors"
                        >
                            {t.savePresetModal.save}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}

export default App;