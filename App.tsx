
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  PromptState,
  ToastMessage,
  HistoryEntry,
  VeoPromptResponse,
  PromptTemplate,
  CustomPreset,
  ExamplePrompt,
} from './types';
import { ApiError, ApiErrorType } from './utils/apiErrors';
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
} from './constants';
import { getPromptTemplates } from './templates';
import { appUIStrings, pronunciationGuides } from './translations';
import { validateField, validateAllFields } from './utils/validation';
import { getApiErrorMessage } from './utils/errorHandler';
import * as geminiService from './services/geminiService';

import { useBroadcastState } from './hooks/useBroadcastState';
import { useHistoryState } from './hooks/useHistoryState';

import Header from './components/Header';
import SelectInput from './components/SelectInput';
import TextAreaInput from './components/TextAreaInput';
import ActionBar from './components/ActionBar';
import PromptOutput from './components/PromptOutput';
import ExamplesCarousel from './components/ExamplesCarousel';
import HistoryPanel from './components/HistoryPanel';
import TemplatesPanel from './components/TemplatesPanel';
import VariationsPanel from './components/VariationsPanel';
import ChatBot from './components/ChatBot';
import Toast from './components/Toast';
import CollapsibleSection from './components/CollapsibleSection';
import PromptBuilderSummary from './components/PromptBuilderSummary';
import VideoGenerationProgress from './components/VideoGenerationProgress';
import TargetModelToggle from './components/TargetModelToggle';
import Icon from './components/Icon';
import CheckboxInput from './components/CheckboxInput';
import PronunciationGuide from './components/PronunciationGuide';
import ImageUploadInput from './components/ImageUploadInput';
import AudioUploadInput from './components/AudioUploadInput';
import RangeInput from './components/RangeInput';
import Button from './components/Button';
import Tabs from './components/Tabs';
import TutorialGuide from './components/TutorialGuide';

// Lazy load heavy studio components
const ImageStudio = React.lazy(() => import('./components/ImageStudio'));
const SunoSongStudio = React.lazy(() => import('./components/SunoSongStudio'));
const VideoAnalysisStudio = React.lazy(() => import('./components/VideoAnalysisStudio'));

// Memoized Components for Performance
const MemoizedPromptOutput = React.memo(PromptOutput);
const MemoizedActionBar = React.memo(ActionBar);
const MemoizedTabs = React.memo(Tabs);

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
};

const LOCAL_STORAGE_KEY = 'veo-prompt-state';
const CUSTOM_PRESETS_KEY = 'veo-custom-presets';

function getInitialState(): PromptState {
  try {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      const supported = ['en', 'sv', 'es', 'fr', 'de'];
      if (!supported.includes(parsedState.language)) {
          parsedState.language = 'en';
      }
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
        if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    } catch (error) { console.error(error); }
    return 'dark';
};

/**
 * Deep Merge Utility
 * Handles nested objects and replaces arrays.
 */
const deepMerge = (target: any, source: any): any => {
  if (Array.isArray(source)) {
    return [...source]; 
  }
  if (typeof target !== 'object' || target === null) {
    return source;
  }
  if (typeof source !== 'object' || source === null) {
    return target;
  }
  
  const output = { ...target };
  Object.keys(source).forEach(key => {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!(key in target)) {
        try {
            // Deep clone to avoid reference issues
            output[key] = JSON.parse(JSON.stringify(source[key])); 
        } catch (e) {
            output[key] = source[key];
        }
      } else {
        output[key] = deepMerge(target[key], source[key]);
      }
    } else {
      output[key] = source[key];
    }
  });
  return output;
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
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [isExamplesVisible, setIsExamplesVisible] = useState(true);
  
  const [artStyleSuggestions, setArtStyleSuggestions] = useState<string[]>([]);
  const [isSuggestingArtStyle, setIsSuggestingArtStyle] = useState(false);
  
  const [clothingSuggestions, setClothingSuggestions] = useState<string[]>([]);
  const [accessorySuggestions, setAccessorySuggestions] = useState<string[]>([]);
  const [isSuggestingCharacterDetails, setIsSuggestingCharacterDetails] = useState(false);

  const [isSuggestingEnvironment, setIsSuggestingEnvironment] = useState(false);
  const [isSuggestingSensoryDetails, setIsSuggestingSensoryDetails] = useState(false);
  const [isSuggestingCharacterActions, setIsSuggestingCharacterActions] = useState(false);
  const [isSuggestingCharacterNuances, setIsSuggestingCharacterNuances] = useState(false);
  const [isSuggestingEffect, setIsSuggestingEffect] = useState(false);
  const [isSuggestingAdvanced, setIsSuggestingAdvanced] = useState(false);
  const [isSuggestingCamera, setIsSuggestingCamera] = useState(false);
  
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

  const safeLanguage = useMemo(() => {
    const supported = ['en', 'sv', 'es', 'fr', 'de'];
    return supported.includes(promptState.language) ? promptState.language : 'en';
  }, [promptState.language]);

  const t = useMemo(() => {
      // Defensive coding: verify appUIStrings exists and has 'en' key
      if (!appUIStrings || !appUIStrings['en']) {
          console.error("Translation strings (en) missing. App may be unstable.");
          // Minimal fallback
          return { 
              tutorial: { steps: [] }, 
              tooltips: {}, 
              history: {}, 
              templates: {}, 
              imageStudio: {}, 
              sunoStudio: {}, 
              videoAnalysisStudio: {},
              pronunciationGuide: {} 
          };
      }

      const en = appUIStrings['en'];
      const target = (appUIStrings[safeLanguage]) ? appUIStrings[safeLanguage] : {};
      
      // Deep merge target language over English fallback
      const merged = deepMerge(en, target); 

      // Ensure critical objects exist to prevent crashes if keys are accidentally deleted
      merged.tutorial = merged.tutorial || { steps: [] };
      merged.history = merged.history || {};
      merged.templates = merged.templates || {};
      merged.tooltips = merged.tooltips || {};
      merged.imageStudio = merged.imageStudio || {};
      merged.sunoStudio = merged.sunoStudio || {};
      merged.videoAnalysisStudio = merged.videoAnalysisStudio || {};
      merged.pronunciationGuide = merged.pronunciationGuide || {};

      return merged;
  }, [safeLanguage]);
  
  // Hard fallback for tutorial steps to guarantee the array map method works
  const tutorialSteps = useMemo(() => {
      const steps = Array.isArray(t.tutorial?.steps) ? t.tutorial.steps : [];
      if (steps.length === 0) {
          // Fallback steps if translation file is corrupted
          return [{ targetId: 'app-title', title: 'Welcome', text: 'Welcome to Veo Prompt Generator', position: 'bottom' }];
      }
      return steps.map((step: any) => ({
        ...step,
        text: step.text ? step.text.replace('{GENERATE_BUTTON}', t.generateButton || 'Generate') : ''
      }));
  }, [t]);

  const startTutorial = () => {
    setTutorialStep(0);
    setIsTutorialActive(true);
  };
  
  const endTutorial = () => setIsTutorialActive(false);
  
  const handleTutorialNext = () => setTutorialStep(prev => Math.min(prev + 1, tutorialSteps.length - 1));
  const handleTutorialPrev = () => setTutorialStep(prev => Math.max(prev - 1, 0));
  
  // Tutorial UI automation
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
          setActiveTabIndex(0); 
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
  
  const handleAudioClear = useCallback(() => {
    setPromptState({ uploadedAudio: null });
  }, [setPromptState]);

  const handleResetAll = useCallback(() => {
    setPromptState(INITIAL_STATE, 'replace');
    setGeneratedPrompt(null);
    setErrors({});
    setStoryboardImages([]);
    handleImageClear();
    handleAudioClear();
    setIsEditing(false);
    resetEditHistory('');
    setPromptVariations([]);
    setIsGeneratingVideo(false);
    setVideoStatus('');
    if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
    setGeneratedVideoUrl(null);
    addToast('All fields have been reset.', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setPromptState, addToast, handleImageClear, handleAudioClear, resetEditHistory, generatedVideoUrl]);

  const handleThemeToggle = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    try { localStorage.setItem('veo-theme', theme); } catch (e) {}
    if (theme === 'light') document.body.classList.add('light');
    else document.body.classList.remove('light');
  }, [theme]);

  // Load history & presets
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('veo-prompt-history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      const savedPresets = localStorage.getItem(CUSTOM_PRESETS_KEY);
      if (savedPresets) setCustomPresets(JSON.parse(savedPresets));
    } catch (e) { console.error(e); }
  }, []);
  
  // Save state
  useEffect(() => {
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(promptState)); } catch (e) {}
  }, [promptState]);

  useEffect(() => {
    if (generatedPrompt && !isEditing) resetEditHistory(generatedPrompt.prompt);
  }, [generatedPrompt, isEditing, resetEditHistory]);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const key = name as keyof PromptState;
    const newStateUpdate: Partial<PromptState> = { [key]: value };

    if (key === 'voiceStyle' && value === 'None') newStateUpdate.voiceOver = '';
    
    setPromptState(newStateUpdate);
    
    const updatedState = { ...promptState, ...newStateUpdate };
    const newErrors = { ...errors };
    const currentFieldError = validateField(key, value, updatedState, t);
    if (currentFieldError) newErrors[key] = currentFieldError;
    else delete newErrors[key];
    
    // Dependent field validation
    if (key === 'artStyle') {
        const err = validateField('customArtStyle', updatedState.customArtStyle, updatedState, t);
        if (err) newErrors.customArtStyle = err; else delete newErrors.customArtStyle;
    }
    if (key === 'voiceStyle') {
        const err = validateField('voiceOver', updatedState.voiceOver, updatedState, t);
        if (err) newErrors.voiceOver = err; else delete newErrors.voiceOver;
    }
    if (key === 'characterActions' || key === 'characterClothing') {
        const err = validateField('characterSpecificClothing', updatedState.characterSpecificClothing, updatedState, t);
        if (err) newErrors.characterSpecificClothing = err; else delete newErrors.characterSpecificClothing;
    }
    setErrors(newErrors);
  }, [promptState, setPromptState, t, errors]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setPromptState({ [name as keyof PromptState]: checked });

    if (name === 'useGoogleMaps' && checked && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                addToast(t.toastLocationAcquired, 'info');
            },
            () => addToast(t.toastLocationError, 'error')
        );
    }
  }, [setPromptState, addToast, t]);

  const handleAudioMixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const mixKey = name.replace('audioMix.', '') as keyof PromptState['audioMix'];
    setPromptState({
      audioMix: { ...promptState.audioMix, [mixKey]: parseInt(value, 10) }
    });
  }, [promptState.audioMix, setPromptState]);
  
  const handleImageUpload = useCallback((image: { data: string; mimeType: string; url: string; }) => {
      setPromptState({ uploadedImage: { data: image.data, mimeType: image.mimeType } });
      setUploadedImageUrl(image.url);
  }, [setPromptState]);
  
  const handleAudioUpload = useCallback((audio: { data: string; mimeType: string; name: string; }) => {
      setPromptState({ uploadedAudio: audio });
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
    handleAudioClear();
    setIsEditing(false);
    resetEditHistory('');
    setPromptVariations([]);
    addToast('Ready for a new prompt!', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setPromptState, addToast, handleImageClear, handleAudioClear, resetEditHistory]);
  
  const handleSavePrompt = useCallback((newPrompt: string) => {
    if (!generatedPrompt) return;
    setGeneratedPrompt({ ...generatedPrompt, prompt: newPrompt });
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
    const updatedHistory = [newEntry, ...history.slice(0, 49)];
    setHistory(updatedHistory);
    localStorage.setItem('veo-prompt-history', JSON.stringify(updatedHistory));
    addToast(t.toastHistorySaved, 'success');
  }, [promptState, generatedPrompt, history, addToast, t]);

  const handleUseHistoryEntry = useCallback((entry: HistoryEntry) => {
    const mergedParams = {
        ...INITIAL_STATE,
        ...entry.params,
        audioMix: { ...INITIAL_STATE.audioMix, ...(entry.params.audioMix || {}) }
    };
    if (!['en', 'sv', 'es', 'fr', 'de'].includes(mergedParams.language)) mergedParams.language = 'en';

    setPromptState(mergedParams, 'replace');
    setGeneratedPrompt({ prompt: entry.prompt, groundingChunks: entry.groundingChunks });
    setIsHistoryOpen(false);
    addToast(t.toastHistoryLoaded, 'info');
  }, [setPromptState, addToast, t]);

  const handleDeleteHistoryEntry = useCallback((id: string) => {
    const updatedHistory = history.filter(entry => entry.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('veo-prompt-history', JSON.stringify(updatedHistory));
  }, [history]);
  
  const handleClearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('veo-prompt-history');
  }, []);

  const handleUsePresetOrTemplate = useCallback((preset: PromptTemplate | CustomPreset) => {
    setPromptState({ ...INITIAL_STATE, language: promptState.language, ...preset.params }, 'replace');
    setGeneratedPrompt(null);
    setErrors({});
    setIsTemplatesOpen(false);
    addToast(t.toastTemplateApplied, 'info');
    ideaInputRef.current?.focus();
  }, [promptState.language, setPromptState, addToast, t]);

  const handleOpenSavePresetModal = useCallback(() => {
    setNewPresetName('');
    setIsSavePresetModalOpen(true);
  }, []);
  
  const handleSavePreset = useCallback(() => {
    if (!newPresetName.trim()) {
        addToast(t.errorPresetNameRequired, 'error');
        return;
    }
    const newPreset: CustomPreset = { id: Date.now().toString(), name: newPresetName.trim(), params: promptState };
    const updatedPresets = [newPreset, ...customPresets];
    setCustomPresets(updatedPresets);
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updatedPresets));
    addToast(t.toastPresetSaved, 'success');
    setIsSavePresetModalOpen(false);
  }, [newPresetName, customPresets, promptState, addToast, t]);

  const handleDeletePreset = useCallback((id: string) => {
    const updatedPresets = customPresets.filter(p => p.id !== id);
    setCustomPresets(updatedPresets);
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updatedPresets));
    addToast(t.toastPresetDeleted, 'success');
  }, [customPresets, addToast, t]);

  const handleUseExample = useCallback((example: ExamplePrompt) => {
    setPromptState({ ...INITIAL_STATE, language: promptState.language, ...example.params }, 'replace');
    setGeneratedPrompt({ prompt: example.prompt, groundingChunks: example.groundingChunks });
    setErrors({});
    addToast(t.toastTemplateApplied, 'info');
    ideaInputRef.current?.focus();
  }, [promptState.language, setPromptState, addToast, t]);

  const handleGenerateVariations = useCallback(async (basePrompt: string) => {
    setIsGeneratingVariations(true);
    setPromptVariations([]);
    setIsVariationsOpen(true);
    try {
        const variations = await geminiService.generatePromptVariations(basePrompt, safeLanguage, promptState.model, promptState.targetModel);
        setPromptVariations(variations);
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
        setIsVariationsOpen(false);
    } finally {
        setIsGeneratingVariations(false);
    }
  }, [safeLanguage, promptState.model, promptState.targetModel, addToast, t]);

  const handleRefinePrompt = useCallback(async (basePrompt: string) => {
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
  }, [promptState, addToast, t]);

  const handleSelectVariation = useCallback((variation: string) => {
    handleSavePrompt(variation);
    setIsVariationsOpen(false);
  }, [handleSavePrompt]);
  
  const handleGenerateArt = useCallback(async (prompt: string) => {
    setIsGeneratingArt(true);
    try {
      const imageUrl = await geminiService.generateConceptArt(prompt, promptState.aspectRatio);
      console.log("Generated Art URL:", imageUrl);
      addToast(t.toastArtGenerated, 'success');
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsGeneratingArt(false);
    }
  }, [promptState.aspectRatio, addToast, t]);

  const handleGenerateStoryboard = useCallback(async (prompt: string) => {
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
  }, [promptState.aspectRatio, addToast, t]);

  const handleGenerateVideo = useCallback(async (prompt: string) => {
    if (Date.now() - lastPromptGenTime.current < 500) return;
    promptToRetry.current = prompt;

    if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) { setIsApiKeyModalOpen(true); return; }
    }

    if (promptState.aspectRatio !== '16:9' && promptState.aspectRatio !== '9:16') {
      addToast(t.errorInvalidAspectRatioForVeo, 'error');
      return;
    }
    
    setIsGeneratingVideo(true);
    setVideoStatus('Init');
    setGeneratedVideoUrl(null);

    try {
      let operation = await geminiService.generateVideo(prompt, promptState.uploadedImage, promptState.aspectRatio, promptState.resolution, promptState.veoModel);
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
      const apiErrorMessage = getApiErrorMessage(error, t);
      if (error instanceof ApiError && error.type === ApiErrorType.InvalidApiKey) setIsApiKeyModalOpen(true);
      addToast(apiErrorMessage, 'error');
      setVideoStatus('Error');
    }
  }, [promptState, t, addToast]);
  
  const handleSelectKeyAndRetry = useCallback(async () => {
    if (typeof (window as any).aistudio?.openSelectKey !== 'function') return;
    await (window as any).aistudio.openSelectKey();
    setIsApiKeyModalOpen(false);
    if (promptToRetry.current) {
        setTimeout(() => handleGenerateVideo(promptToRetry.current!), 250);
    }
  }, [handleGenerateVideo]);

  const handleCloseVideoModal = useCallback(() => {
    setIsGeneratingVideo(false);
    setVideoStatus('');
    if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
    setGeneratedVideoUrl(null);
  }, [generatedVideoUrl]);

  const handleDownloadPrompt = useCallback((promptText: string) => {
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
  }, [addToast, t]);

  const handleShare = useCallback(() => {
    const url = new URL(window.location.href);
    const stateToShare = { ...promptState, generatedPrompt: generatedPrompt };
    const encodedState = btoa(JSON.stringify(stateToShare));
    url.searchParams.set('state', encodedState);
    navigator.clipboard.writeText(url.toString());
    addToast(t.toastShareLink, 'success');
  }, [promptState, generatedPrompt, addToast, t]);
  
  const handleAnalyzeAudio = useCallback(async () => {
      if (!promptState.uploadedAudio) return;
      setIsAnalyzingAudio(true);
      try {
          const description = await geminiService.analyzeAudio(promptState.uploadedAudio.data, promptState.uploadedAudio.mimeType);
          setPromptState({ ambientSound: description });
          addToast(t.toastAudioAnalyzed, 'success');
      } catch (error) {
          addToast(getApiErrorMessage(error, t), 'error');
      } finally {
          setIsAnalyzingAudio(false);
      }
  }, [promptState.uploadedAudio, setPromptState, addToast, t]);

  const languageOptions = useMemo(() => getLanguageOptions(), []);
  const modelOptions = useMemo(() => getModelOptions(safeLanguage), [safeLanguage]);
  const veoModelOptions = useMemo(() => getVeoModelOptions(safeLanguage), [safeLanguage]);
  const artStyleOptions = useMemo(() => getArtStyles(safeLanguage), [safeLanguage]);
  const cameraMovementOptions = useMemo(() => getCameraMovements(safeLanguage), [safeLanguage]);
  const cameraDistanceOptions = useMemo(() => getCameraDistances(safeLanguage), [safeLanguage]);
  const lensTypeOptions = useMemo(() => getLensTypes(safeLanguage), [safeLanguage]);
  const visualEffectOptions = useMemo(() => getVisualEffects(safeLanguage), [safeLanguage]);
  const colorPaletteOptions = useMemo(() => getColorPalettes(safeLanguage), [safeLanguage]);
  const aspectRatioOptions = useMemo(() => getAspectRatios(safeLanguage), [safeLanguage]);
  const resolutionOptions = useMemo(() => getResolutionOptions(safeLanguage), [safeLanguage]);
  const animationPresetOptions = useMemo(() => getAnimationPresets(safeLanguage), [safeLanguage]);
  const voiceStyleOptions = useMemo(() => getVoiceStyles(safeLanguage), [safeLanguage]);
  const timeOfDayOptions = useMemo(() => getTimeOfDayOptions(safeLanguage), [safeLanguage]);
  const weatherOptions = useMemo(() => getWeatherOptions(safeLanguage), [safeLanguage]);
  const motionIntensityOptions = useMemo(() => getMotionIntensityOptions(safeLanguage), [safeLanguage]);
  const creativityLevelOptions = useMemo(() => getCreativityLevelOptions(safeLanguage), [safeLanguage]);
  const characterGenderOptions = useMemo(() => getCharacterGenders(safeLanguage), [safeLanguage]);
  const characterEthnicityOptions = useMemo(() => getCharacterEthnicities(safeLanguage), [safeLanguage]);
  const characterClothingOptions = useMemo(() => getCharacterClothings(safeLanguage), [safeLanguage]);
  const characterArchetypeOptions = useMemo(() => getCharacterArchetypes(safeLanguage), [safeLanguage]);
  const characterAgeOptions = useMemo(() => getCharacterAges(safeLanguage), [safeLanguage]);
  const characterMoodOptions = useMemo(() => getCharacterMoods(safeLanguage), [safeLanguage]);
  const characterPoseOptions = useMemo(() => getCharacterPoses(safeLanguage), [safeLanguage]);
  const characterSkinToneOptions = useMemo(() => getCharacterSkinTones(safeLanguage), [safeLanguage]);
  const ambientSoundOptions = useMemo(() => getAmbientSounds(safeLanguage), [safeLanguage]);
  const soundEffectsIntensityOptions = useMemo(() => getSoundEffectsIntensity(safeLanguage), [safeLanguage]);
  const architecturalStyleOptions = useMemo(() => getArchitecturalStyles(safeLanguage), [safeLanguage]);
  const lightingStyleOptions = useMemo(() => getLightingStyles(safeLanguage), [safeLanguage]);
  const compositionalGuideOptions = useMemo(() => getCompositionalGuides(safeLanguage), [safeLanguage]);
  const examplePrompts = useMemo(() => getStaticInspirationPrompts(safeLanguage), [safeLanguage]);

  const handleAutoFillModifiers = useCallback(async () => {
    if (!promptState.idea.trim()) { addToast(t.errorValidation, 'error'); return; }
    setIsAutoFilling(true);
    try {
        const suggestions = await geminiService.analyzeIdeaForModifiers(
            promptState.idea, safeLanguage,
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
                motionIntensity: motionIntensityOptions.map(o => o.value),
                creativityLevel: creativityLevelOptions.map(o => o.value),
            },
            promptState.generateAsSeries, promptState.model, promptState.targetModel
        );
        
        const truncatedSuggestions: Partial<PromptState> = {};
        for (const key in suggestions) {
            const typedKey = key as keyof PromptState;
            const value = suggestions[typedKey];
            const limit = CHARACTER_LIMITS[typedKey as keyof typeof CHARACTER_LIMITS];
            if (limit && typeof value === 'string' && value.length > limit) {
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
  }, [promptState.idea, safeLanguage, promptState.generateAsSeries, promptState.model, promptState.targetModel, addToast, setPromptState, t]);
  
  const handleSuggestFullAudioDesign = useCallback(async () => {
    if (!promptState.idea.trim()) { addToast(t.errorValidation, 'error'); return; }
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
            safeLanguage, promptState.model, ambientSoundOptions.map(o => o.value), soundEffectsIntensityOptions.map(o => o.value)
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
}, [promptState, setPromptState, addToast, t, voiceStyleOptions, ambientSoundOptions, soundEffectsIntensityOptions, errors, safeLanguage]);

  const handleSuggestSensoryDetails = useCallback(async () => {
        if (!promptState.environment.trim() && !promptState.idea.trim()) { addToast(t.errorValidation, 'error'); return; }
        setIsSuggestingSensoryDetails(true);
        try {
            // Fallback to idea if environment is empty, but prioritize environment if present
            const context = promptState.environment.trim() || promptState.idea; 
            const details = await geminiService.suggestSensoryDetails(context, safeLanguage, promptState.model);
            setPromptState({ environmentSensoryDetails: details });
            addToast(t.toastSensoryDetailsSuggested, 'success');
        } catch (error) { addToast(getApiErrorMessage(error, t), 'error'); } finally { setIsSuggestingSensoryDetails(false); }
    }, [promptState.environment, promptState.idea, safeLanguage, promptState.model, addToast, setPromptState, t]);

    const handleSuggestEnvironmentDetails = useCallback(async () => {
        if (!promptState.environment.trim() && !promptState.idea.trim()) { addToast(t.errorValidation, 'error'); return; }
        setIsSuggestingEnvironment(true);
        try {
            const suggestions = await geminiService.suggestEnvironmentDetails(promptState.environment, promptState.idea, safeLanguage, promptState.model);
            // If the suggestion service returns a new 'environment' text (because the original was empty), use it.
            const updates: Partial<PromptState> = { 
                environmentSensoryDetails: suggestions.environmentSensoryDetails,
                environmentDynamicEvents: suggestions.environmentDynamicEvents
            };
            if (suggestions.environment) updates.environment = suggestions.environment;
            
            setPromptState(updates);
            addToast(t.toastEnvironmentSuggested, 'success');
        } catch (error) { addToast(getApiErrorMessage(error, t), 'error'); } finally { setIsSuggestingEnvironment(false); }
    }, [promptState.environment, promptState.idea, safeLanguage, promptState.model, addToast, setPromptState, t]);

    const handleSuggestCharacterNuances = useCallback(async () => {
        if (!promptState.characterActions.trim()) { addToast(t.errorValidation, 'error'); return; }
        setIsSuggestingCharacterNuances(true);
        try {
            const nuances = await geminiService.suggestCharacterNuances(promptState.characterActions, promptState.characterMood, safeLanguage, promptState.model);
            setPromptState({ characterNuances: nuances });
            addToast(t.toastCharacterNuancesSuggested, 'success');
        } catch (error) { addToast(getApiErrorMessage(error, t), 'error'); } finally { setIsSuggestingCharacterNuances(false); }
    }, [promptState.characterActions, promptState.characterMood, safeLanguage, promptState.model, addToast, setPromptState, t]);

    const handleSuggestCharacterActions = useCallback(async () => {
        if (!promptState.idea.trim() && !promptState.characterArchetype && !promptState.characterMood) { addToast(t.errorValidation, 'error'); return; }
        setIsSuggestingCharacterActions(true);
        try {
            const actions = await geminiService.suggestCharacterActions(
                promptState.characterArchetype, 
                promptState.characterMood, 
                promptState.environment, 
                promptState.idea,
                safeLanguage, 
                promptState.model
            );
            setPromptState({ characterActions: actions });
            addToast(t.toastCharacterActionsSuggested || "Actions suggested!", 'success');
        } catch (error) { addToast(getApiErrorMessage(error, t), 'error'); } finally { setIsSuggestingCharacterActions(false); }
    }, [promptState.characterArchetype, promptState.characterMood, promptState.environment, promptState.idea, safeLanguage, promptState.model, addToast, setPromptState, t]);

    const handleSuggestVisualEffect = useCallback(async () => {
        if (!promptState.idea && !promptState.environment) {
            addToast("Please describe your core idea or environment first to get relevant suggestions.", 'error');
            return;
        }
        setIsSuggestingEffect(true);
        try {
            const effect = await geminiService.suggestVisualEffect(
                promptState.idea,
                promptState.environment,
                promptState.artStyle, 
                promptState.customArtStyle, 
                promptState.characterMood, 
                safeLanguage, 
                promptState.model, 
                visualEffectOptions.map(o => o.value)
            );
            setPromptState({ visualEffect: effect });
            addToast(t.toastEffectSuggested, 'success');
        } catch (error) { addToast(getApiErrorMessage(error, t), 'error'); } finally { setIsSuggestingEffect(false); }
    }, [promptState.idea, promptState.environment, promptState.artStyle, promptState.customArtStyle, promptState.characterMood, safeLanguage, promptState.model, visualEffectOptions, addToast, setPromptState, t]);

    const handleSuggestAdvancedSettings = useCallback(async () => {
        if (!promptState.idea) { addToast(t.errorValidation, 'error'); return; }
        setIsSuggestingAdvanced(true);
        try {
            const settings = await geminiService.suggestAdvancedSettings(promptState, safeLanguage, promptState.model, {
                motionIntensityOptions: motionIntensityOptions.map(o => o.value),
                creativityLevelOptions: creativityLevelOptions.map(o => o.value)
            });
            setPromptState(settings);
            addToast(t.toastAdvancedSuggested, 'success');
        } catch (error) { addToast(getApiErrorMessage(error, t), 'error'); } finally { setIsSuggestingAdvanced(false); }
    }, [promptState, safeLanguage, promptState.model, motionIntensityOptions, creativityLevelOptions, addToast, setPromptState, t]);

    const handleSuggestCharacterDetails = useCallback(async () => {
        if (promptState.characterArchetype === 'Any') { addToast("Please select an archetype first.", 'error'); return; }
        setIsSuggestingCharacterDetails(true);
        try {
            const { clothingSuggestions, accessorySuggestions } = await geminiService.suggestCharacterDetails(
                promptState.characterArchetype, promptState.environment, safeLanguage, promptState.model
            );
            setClothingSuggestions(clothingSuggestions);
            setAccessorySuggestions(accessorySuggestions);
        } catch (error) { addToast(getApiErrorMessage(error, t), 'error'); } finally { setIsSuggestingCharacterDetails(false); }
    }, [promptState.characterArchetype, promptState.environment, safeLanguage, promptState.model, addToast, t]);

    const handleSuggestCameraDetails = useCallback(async () => {
        if (!promptState.idea.trim()) { addToast(t.errorValidation, 'error'); return; }
        setIsSuggestingCamera(true);
        try {
            const suggestions = await geminiService.suggestCameraDetails(
                {
                    idea: promptState.idea,
                    environment: promptState.environment,
                    mood: promptState.characterMood,
                    artStyle: promptState.artStyle === 'Custom' ? promptState.customArtStyle : promptState.artStyle
                },
                safeLanguage,
                promptState.model,
                {
                    movements: cameraMovementOptions.map(o => o.value),
                    distances: cameraDistanceOptions.map(o => o.value),
                    lenses: lensTypeOptions.map(o => o.value),
                    guides: compositionalGuideOptions.map(o => o.value)
                }
            );
            setPromptState(suggestions);
            addToast(t.toastCameraDetailsSuggested, 'success');
        } catch (error) {
            addToast(getApiErrorMessage(error, t), 'error');
        } finally {
            setIsSuggestingCamera(false);
        }
    }, [promptState, safeLanguage, cameraMovementOptions, cameraDistanceOptions, lensTypeOptions, compositionalGuideOptions, addToast, setPromptState, t]);


  const handleTargetModelChange = useCallback((newModel: 'veo' | 'sora') => {
    const updates: Partial<PromptState> = { targetModel: newModel };
    if (newModel === 'sora' && promptState.artStyle === 'Cinematic') {
        updates.artStyle = 'Photorealistic';
        addToast(t.toastSoraStyleSet, 'info');
    }
    setPromptState(updates);
}, [promptState.artStyle, setPromptState, addToast, t]);

  const autoFillButton = useMemo(() => (
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
  ), [isAutoFilling, promptState.idea, handleAutoFillModifiers, t]);

  // Reusable helper for suggestion buttons within inputs
  const renderSuggestionButton = (onClick: () => void, isLoading: boolean, disabled: boolean, label: string) => (
        <button
            onClick={onClick}
            disabled={isLoading || disabled}
            className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={label}
            title={label}
            data-tutorial-id="environment-ai-button"
        >
            {isLoading ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
        </button>
  );

  const tabs = useMemo(() => [
    {
      label: t.tabScene,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextAreaInput label={t.labelEnvironment} name="environment" value={promptState.environment} onChange={handleInputChange} placeholder={t.placeholderEnvironment} maxLength={CHARACTER_LIMITS.environment} rows={3} error={errors.environment} info={t.tooltips.environment} actionButton={renderSuggestionButton(handleSuggestEnvironmentDetails, isSuggestingEnvironment, !promptState.environment && !promptState.idea, t.suggestEnvironmentButton)} />
            <TextAreaInput label={t.labelSensoryDetails} name="environmentSensoryDetails" value={promptState.environmentSensoryDetails} onChange={handleInputChange} placeholder={t.placeholderSensoryDetails} maxLength={CHARACTER_LIMITS.environmentSensoryDetails} rows={3} error={errors.environmentSensoryDetails} info={t.tooltips.sensoryDetails} actionButton={renderSuggestionButton(handleSuggestSensoryDetails, isSuggestingSensoryDetails, !promptState.environment && !promptState.idea, t.suggestSensoryDetailsButton)} />
            <TextAreaInput label={t.labelEnvironmentDynamicEvents} name="environmentDynamicEvents" value={promptState.environmentDynamicEvents} onChange={handleInputChange} placeholder={t.placeholderEnvironmentDynamicEvents} maxLength={CHARACTER_LIMITS.environmentDynamicEvents} rows={3} error={errors.environmentDynamicEvents} info={t.tooltips.environmentDynamicEvents} />
            <SelectInput label={t.labelArchitecturalStyle} name="architecturalStyle" options={architecturalStyleOptions} value={promptState.architecturalStyle} onChange={handleInputChange} error={errors.architecturalStyle} info={t.tooltips.architecturalStyle} />
            <SelectInput label={t.labelTimeOfDay} name="timeOfDay" options={timeOfDayOptions} value={promptState.timeOfDay} onChange={handleInputChange} error={errors.timeOfDay} info={t.tooltips.timeOfDay} />
            <SelectInput label={t.labelWeather} name="weather" options={weatherOptions} value={promptState.weather} onChange={handleInputChange} error={errors.weather} info={t.tooltips.weather} />
        </div>
      ),
    },
    {
      label: t.tabCharacter,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2 lg:col-span-3">
                <TextAreaInput label={t.labelCharacterActions} name="characterActions" value={promptState.characterActions} onChange={handleInputChange} placeholder={t.placeholderCharacterActions} maxLength={CHARACTER_LIMITS.characterActions} rows={3} error={errors.characterActions} info={t.tooltips.characterActions} actionButton={renderSuggestionButton(handleSuggestCharacterActions, isSuggestingCharacterActions, !promptState.idea, t.suggestCharacterActionsButton)} />
            </div>
            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextAreaInput label={t.labelCharacterNuances} name="characterNuances" value={promptState.characterNuances} onChange={handleInputChange} placeholder={t.placeholderCharacterNuances} maxLength={CHARACTER_LIMITS.characterNuances} rows={3} error={errors.characterNuances} info={t.tooltips.characterNuances} actionButton={renderSuggestionButton(handleSuggestCharacterNuances, isSuggestingCharacterNuances, !promptState.characterActions, t.suggestCharacterNuancesButton)} />
                <TextAreaInput label={t.labelCharacterObjectInteraction} name="characterObjectInteraction" value={promptState.characterObjectInteraction} onChange={handleInputChange} placeholder={t.placeholderCharacterObjectInteraction} maxLength={CHARACTER_LIMITS.characterObjectInteraction} rows={3} error={errors.characterObjectInteraction} info={t.tooltips.characterObjectInteraction} />
            </div>
            <SelectInput label={t.labelCharacterGender} name="characterGender" options={characterGenderOptions} value={promptState.characterGender} onChange={handleInputChange} info={t.tooltips.characterGender} />
            <SelectInput label={t.labelCharacterEthnicity} name="characterEthnicity" options={characterEthnicityOptions} value={promptState.characterEthnicity} onChange={handleInputChange} info={t.tooltips.characterEthnicity} />
            <SelectInput label={t.labelCharacterAge} name="characterAge" options={characterAgeOptions} value={promptState.characterAge} onChange={handleInputChange} info={t.tooltips.characterAge} />
            <SelectInput label={t.labelCharacterSkinTone} name="characterSkinTone" options={characterSkinToneOptions} value={promptState.characterSkinTone} onChange={handleInputChange} info={t.tooltips.characterSkinTone} />
            <SelectInput label={t.labelCharacterArchetype} name="characterArchetype" options={characterArchetypeOptions} value={promptState.characterArchetype} onChange={handleInputChange} info={t.tooltips.characterArchetype} />
            <SelectInput label={t.labelCharacterMood} name="characterMood" options={characterMoodOptions} value={promptState.characterMood} onChange={handleInputChange} info={t.tooltips.characterMood} />
            <SelectInput label={t.labelCharacterPose} name="characterPose" options={characterPoseOptions} value={promptState.characterPose} onChange={handleInputChange} info={t.tooltips.characterPose} />
            <SelectInput label={t.labelCharacterClothing} name="characterClothing" options={characterClothingOptions} value={promptState.characterClothing} onChange={handleInputChange} info={t.tooltips.characterSpecificClothing} actionButton={renderSuggestionButton(handleSuggestCharacterDetails, isSuggestingCharacterDetails, promptState.characterArchetype === 'Any', "Suggest details")} />
            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextAreaInput label={t.labelCharacterSpecificClothing} name="characterSpecificClothing" value={promptState.characterSpecificClothing} onChange={handleInputChange} placeholder={t.placeholderCharacterSpecificClothing} maxLength={CHARACTER_LIMITS.characterSpecificClothing} rows={2} error={errors.characterSpecificClothing} info={t.tooltips.characterSpecificClothing} />
                <TextAreaInput label={t.labelCharacterAccessories} name="characterAccessories" value={promptState.characterAccessories} onChange={handleInputChange} placeholder={t.placeholderCharacterAccessories} maxLength={CHARACTER_LIMITS.characterAccessories} rows={2} error={errors.characterAccessories} info={t.tooltips.characterAccessories} />
            </div>
        </div>
      ),
    },
    {
      label: t.tabStyle,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput label={t.labelArtStyle} name="artStyle" options={artStyleOptions} value={promptState.artStyle} onChange={handleInputChange} error={errors.artStyle} info={t.tooltips.artStyle} />
            {promptState.artStyle === 'Custom' && (
                <TextAreaInput label={t.labelCustomArtStyle} name="customArtStyle" value={promptState.customArtStyle} onChange={handleInputChange} placeholder={t.placeholderCustomArtStyle} maxLength={CHARACTER_LIMITS.customArtStyle} rows={2} error={errors.customArtStyle} info={t.tooltips.customArtStyle} />
            )}
            <SelectInput label={t.labelLightingStyle} name="lightingStyle" options={lightingStyleOptions} value={promptState.lightingStyle} onChange={handleInputChange} info={t.tooltips.lightingStyle} />
            <SelectInput label={t.labelColorPalette} name="colorPalette" options={colorPaletteOptions} value={promptState.colorPalette} onChange={handleInputChange} info={t.tooltips.colorPalette} />
            <SelectInput label={t.labelVisualEffect} name="visualEffect" options={visualEffectOptions} value={promptState.visualEffect} onChange={handleInputChange} info={t.tooltips.visualEffect} actionButton={renderSuggestionButton(handleSuggestVisualEffect, isSuggestingEffect, !promptState.idea && !promptState.environment, t.suggestEffectButton)} />
        </div>
      ),
    },
    {
        label: t.tabCamera,
        content: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectInput 
                    label={t.labelCameraMovement} 
                    name="cameraMovement" 
                    options={cameraMovementOptions} 
                    value={promptState.cameraMovement} 
                    onChange={handleInputChange} 
                    info={t.tooltips.cameraMovement} 
                    actionButton={renderSuggestionButton(handleSuggestCameraDetails, isSuggestingCamera, !promptState.idea, t.suggestCameraDetailsButton)}
                />
                <SelectInput label={t.labelCameraDistance} name="cameraDistance" options={cameraDistanceOptions} value={promptState.cameraDistance} onChange={handleInputChange} info={t.tooltips.cameraDistance} />
                <SelectInput label={t.labelLensType} name="lensType" options={lensTypeOptions} value={promptState.lensType} onChange={handleInputChange} info={t.tooltips.lensType} />
                <SelectInput label={t.labelCompositionalGuide} name="compositionalGuide" options={compositionalGuideOptions} value={promptState.compositionalGuide} onChange={handleInputChange} info={t.tooltips.compositionalGuide} />
                <SelectInput label={t.labelAspectRatio} name="aspectRatio" options={aspectRatioOptions} value={promptState.aspectRatio} onChange={handleInputChange} info={t.tooltips.aspectRatio} />
                <SelectInput label={t.labelResolution} name="resolution" options={resolutionOptions} value={promptState.resolution} onChange={handleInputChange} info={t.tooltips.resolution} />
                <SelectInput label={t.labelAnimationPreset} name="animationPreset" options={animationPresetOptions} value={promptState.animationPreset} onChange={handleInputChange} info={t.tooltips.animationPreset} />
            </div>
        )
    },
    {
        label: t.tabAudio,
        content: (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{t.subheadingAudioDesign}</h3>
                    <button onClick={handleSuggestFullAudioDesign} disabled={isSuggestingFullAudio} className="flex items-center text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50">
                        {isSuggestingFullAudio ? <Icon name="spinner" className="w-4 h-4 animate-spin mr-1" /> : <Icon name="magic" className="w-4 h-4 mr-1" />}
                        {t.suggestAudio}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectInput label={t.labelVoiceStyle} name="voiceStyle" options={voiceStyleOptions} value={promptState.voiceStyle} onChange={handleInputChange} error={errors.voiceStyle} info={t.tooltips.voiceStyle} />
                    {promptState.voiceStyle !== 'None' && (
                        <TextAreaInput label={t.labelVoiceOver} name="voiceOver" value={promptState.voiceOver} onChange={handleInputChange} placeholder={t.placeholderVoiceOver} maxLength={CHARACTER_LIMITS.voiceOver} rows={3} error={errors.voiceOver} info={t.tooltips.voiceOver} />
                    )}
                    <SelectInput label={t.labelAmbientSound} name="ambientSound" options={ambientSoundOptions} value={promptState.ambientSound} onChange={handleInputChange} info={t.tooltips.ambientSound} />
                    <SelectInput label={t.labelSoundEffectsIntensity} name="soundEffectsIntensity" options={soundEffectsIntensityOptions} value={promptState.soundEffectsIntensity} onChange={handleInputChange} info={t.tooltips.soundEffectsIntensity} />
                </div>
                
                <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700">
                    <label className="block text-sm font-medium text-slate-300 mb-3">{t.labelAudioMix}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <RangeInput label={t.labelVoiceVolume} name="audioMix.voice" value={promptState.audioMix.voice} onChange={handleAudioMixChange} info={t.tooltips.audioMixVoice} disabled={promptState.voiceStyle === 'None'} />
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
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextAreaInput label={t.labelNegativePrompt} name="negativePrompt" value={promptState.negativePrompt} onChange={handleInputChange} placeholder={t.placeholderNegativePrompt} maxLength={CHARACTER_LIMITS.negativePrompt} rows={2} info={t.tooltips.negativePrompt} actionButton={renderSuggestionButton(handleSuggestAdvancedSettings, isSuggestingAdvanced, !promptState.idea, t.suggestAdvancedButton)} />
                    <div className="space-y-4">
                        <SelectInput label={t.labelMotionIntensity} name="motionIntensity" options={motionIntensityOptions} value={promptState.motionIntensity} onChange={handleInputChange} info={t.tooltips.motionIntensity} />
                        <SelectInput label={t.labelCreativityLevel} name="creativityLevel" options={creativityLevelOptions} value={promptState.creativityLevel} onChange={handleInputChange} info={t.tooltips.creativityLevel} />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <CheckboxInput id="optimizeFor8Seconds" name="optimizeFor8Seconds" label={promptState.targetModel === 'sora' ? t.labelOptimizeFor15Seconds : t.labelOptimizeFor8Seconds} checked={promptState.optimizeFor8Seconds} onChange={handleCheckboxChange} tooltipText={promptState.targetModel === 'sora' ? t.tooltips.optimizeFor15Seconds : t.tooltips.optimizeFor8Seconds} />
                    <CheckboxInput id="includeOverlayText" name="includeOverlayText" label={t.labelIncludeOverlayText} checked={promptState.includeOverlayText} onChange={handleCheckboxChange} tooltipText={t.tooltips.includeOverlayText} />
                    <CheckboxInput id="useGoogleSearch" name="useGoogleSearch" label={t.labelUseGoogleSearch} checked={promptState.useGoogleSearch} onChange={handleCheckboxChange} tooltipText={t.tooltips.useGoogleSearch} />
                    <CheckboxInput id="useGoogleMaps" name="useGoogleMaps" label="Ground with Google Maps" checked={promptState.useGoogleMaps} onChange={handleCheckboxChange} />
                    <CheckboxInput id="generateAsSeries" name="generateAsSeries" label={t.labelGenerateAsSeries} checked={promptState.generateAsSeries} onChange={handleCheckboxChange} tooltipText={t.tooltips.generateAsSeries} />
                    <CheckboxInput id="thinkingMode" name="thinkingMode" label={t.labelThinkingMode} checked={promptState.thinkingMode} onChange={handleCheckboxChange} tooltipText={t.tooltips.thinkingMode} disabled={!promptState.model.includes('pro')} />
                </div>

                <TextAreaInput label={t.labelYoutubeUrl} name="youtubeUrl" value={promptState.youtubeUrl} onChange={handleInputChange} placeholder={t.placeholderYoutubeUrl} maxLength={CHARACTER_LIMITS.youtubeUrl} rows={1} error={errors.youtubeUrl} info={t.tooltips.youtubeUrl} />
                
                <div className="pt-4 border-t border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">{t.subheadingModelConfig}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <TargetModelToggle value={promptState.targetModel} onChange={handleTargetModelChange} uiStrings={{ label: t.labelTargetModel, veoLabel: t.toggleVeoLabel, veoDescription: t.toggleVeoDescription, soraLabel: t.toggleSoraLabel, soraDescription: t.toggleSoraDescription }} info={t.tooltips.targetModel} />
                        <div className="space-y-4">
                            <SelectInput label={t.labelModel} name="model" options={modelOptions} value={promptState.model} onChange={handleInputChange} info={t.tooltips.model} />
                            <SelectInput label={t.labelVeoModel} name="veoModel" options={veoModelOptions} value={promptState.veoModel} onChange={handleInputChange} info={t.tooltips.veoModel} />
                            <div className="flex items-center justify-between">
                                <label htmlFor="language-select" className="block text-sm font-medium text-slate-300">{t.language}</label>
                                <div className="relative">
                                    <select id="language-select" name="language" value={promptState.language} onChange={handleInputChange} className="block w-32 bg-slate-800 border border-slate-700 text-slate-200 py-1 px-2 rounded-md text-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500">
                                        {languageOptions.map(lang => (<option key={lang.value} value={lang.value}>{lang.label}</option>))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
  ], [t, promptState, errors, handleInputChange, architecturalStyleOptions, timeOfDayOptions, weatherOptions, characterGenderOptions, characterEthnicityOptions, characterAgeOptions, characterSkinToneOptions, characterArchetypeOptions, characterMoodOptions, characterPoseOptions, characterClothingOptions, artStyleOptions, lightingStyleOptions, colorPaletteOptions, visualEffectOptions, cameraMovementOptions, cameraDistanceOptions, lensTypeOptions, compositionalGuideOptions, aspectRatioOptions, resolutionOptions, animationPresetOptions, voiceStyleOptions, ambientSoundOptions, soundEffectsIntensityOptions, motionIntensityOptions, creativityLevelOptions, languageOptions, modelOptions, veoModelOptions, handleSuggestEnvironmentDetails, handleSuggestSensoryDetails, handleSuggestCharacterActions, handleSuggestCharacterNuances, handleSuggestCharacterDetails, handleSuggestVisualEffect, handleSuggestAdvancedSettings, handleSuggestFullAudioDesign, handleSuggestCameraDetails, handleAudioMixChange, handleAudioUpload, handleAudioClear, handleAnalyzeAudio, handleCheckboxChange, handleTargetModelChange, isSuggestingEnvironment, isSuggestingSensoryDetails, isSuggestingCharacterActions, isSuggestingCharacterNuances, isSuggestingCharacterDetails, isSuggestingEffect, isSuggestingAdvanced, isSuggestingFullAudio, isSuggestingCamera, isAnalyzingAudio]);

  const LoadingFallback = (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50">
      <Icon name="spinner" className="w-12 h-12 animate-spin text-cyan-400" />
    </div>
  );

  return (
    <div className={`theme-${theme} font-sans min-h-screen bg-slate-950 text-slate-200 transition-colors duration-300`}>
      <div className="absolute inset-0 bg-grid-slate-800/20 [mask-image:linear-gradient(to_bottom,white_20%,transparent_100%)]"></div>
      
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
                {isExamplesVisible && (
                    <ExamplesCarousel 
                        examples={examplePrompts} 
                        onUseExample={handleUseExample} 
                        useExampleText={t.examplesCarousel.use}
                        onClose={() => setIsExamplesVisible(false)}
                        title={t.examplesCarousel.title}
                    />
                )}
                
                <CollapsibleSection 
                    title={t.sectionCoreConcept} 
                    stepNumber={1} 
                    tutorialId="core-concept"
                    isOpen={openSections.includes('core-concept')}
                    onToggle={() => setOpenSections(prev => prev.includes('core-concept') ? prev.filter(id => id !== 'core-concept') : [...prev, 'core-concept'])}
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
                            
                            <div className="mt-2 space-y-2">
                                <CheckboxInput
                                    id="useImageAsCameo"
                                    name="useImageAsCameo"
                                    label={t.labelUseImageAsCameo}
                                    checked={promptState.useImageAsCameo}
                                    onChange={handleCheckboxChange}
                                    tooltipText={t.tooltips.useImageAsCameo}
                                />
                                {promptState.useImageAsCameo && (
                                    <div className="animate-fade-in-up pl-4 border-l-2 border-cyan-500/30">
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
                                    </div>
                                )}
                            </div>
                         </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="2. Details"
                    tutorialId="details-tabs"
                    isOpen={openSections.includes('details-tabs')}
                    onToggle={() => setOpenSections(prev => prev.includes('details-tabs') ? prev.filter(id => id !== 'details-tabs') : [...prev, 'details-tabs'])}
                >
                    <div className="p-4 sm:p-6">
                         <MemoizedTabs 
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
                            <MemoizedActionBar
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
                        <MemoizedPromptOutput 
                            prompt={generatedPrompt.prompt}
                            groundingChunks={generatedPrompt.groundingChunks}
                            storyboardImages={storyboardImages}
                            isEditing={isEditing}
                            editedPrompt={editedPrompt}
                            onEditChange={(val) => setEditedPrompt(val)}
                            onEditKeyDown={(e) => {
                                if (e.key === 'Escape') setIsEditing(false);
                                else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); undoEdit(); }
                                else if (e.key === 'y' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); redoEdit(); }
                            }}
                        />
                         <div className="bg-slate-950/80 backdrop-blur-md p-3 rounded-b-2xl border-x border-b border-slate-700 -mt-px">
                            <MemoizedActionBar
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
        
        {isHistoryOpen && <HistoryPanel history={history} onSelect={handleUseHistoryEntry} onClear={handleClearHistory} onDelete={handleDeleteHistoryEntry} onClose={() => setIsHistoryOpen(false)} uiStrings={t.history} language={safeLanguage} />}
        {isTemplatesOpen && <TemplatesPanel builtInTemplates={getPromptTemplates(safeLanguage)} customPresets={customPresets} onSelect={handleUsePresetOrTemplate} onDeletePreset={handleDeletePreset} onClose={() => setIsTemplatesOpen(false)} uiStrings={t.templates} />}
        {isVariationsOpen && <VariationsPanel variations={promptVariations} isLoading={isGeneratingVariations} onSelect={handleSelectVariation} onClose={() => setIsVariationsOpen(false)} uiStrings={t.variations} language={safeLanguage} model={promptState.model} addToast={addToast} targetModel={promptState.targetModel} />}
        {isImageStudioOpen && <React.Suspense fallback={LoadingFallback}><ImageStudio onClose={() => setIsImageStudioOpen(false)} aspectRatioOptions={aspectRatioOptions} uiStrings={{...t.imageStudio, ...t}} addToast={addToast} /></React.Suspense>}
        {isSunoStudioOpen && <React.Suspense fallback={LoadingFallback}><SunoSongStudio onClose={() => setIsSunoStudioOpen(false)} uiStrings={{...t.sunoStudio, ...t}} addToast={addToast} language={safeLanguage} model={promptState.model} /></React.Suspense>}
        {isVideoAnalysisOpen && <React.Suspense fallback={LoadingFallback}><VideoAnalysisStudio onClose={() => setIsVideoAnalysisOpen(false)} uiStrings={{...t.videoAnalysisStudio, ...t}} addToast={addToast} onUseAnalysis={(text) => { const fakeEvent = { target: { name: 'idea', value: text } } as React.ChangeEvent<HTMLTextAreaElement>; handleInputChange(fakeEvent); }} /></React.Suspense>}
        {isPronunciationGuideOpen && <PronunciationGuide guideData={pronunciationGuides[safeLanguage]?.terms || []} onClose={() => setIsPronunciationGuideOpen(false)} uiStrings={t.pronunciationGuide} />}

        {isGeneratingVideo && <VideoGenerationProgress currentStatus={videoStatus} generatedVideoUrl={generatedVideoUrl} onClose={handleCloseVideoModal} uiStrings={t} language={safeLanguage} />}
        
        {isApiKeyModalOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900/70 backdrop-blur-xl w-full max-w-lg rounded-2xl shadow-2xl border border-slate-700/50 p-6 text-center">
                    <h2 className="text-lg font-semibold text-slate-100">API Key Required for Veo</h2>
                    <p className="text-slate-400 mt-2">Veo 3.1 requires a valid API key with billing.</p>
                    <div className="mt-6 flex justify-center gap-4"><Button onClick={handleSelectKeyAndRetry}>Select API Key & Retry</Button><Button onClick={() => setIsApiKeyModalOpen(false)}>Cancel</Button></div>
                </div>
            </div>
        )}

        {isSavePresetModalOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900/70 backdrop-blur-xl w-full max-w-md rounded-2xl shadow-2xl border border-slate-700/50 p-6">
                    <h2 className="text-lg font-semibold text-slate-100">{t.savePresetModal.title}</h2>
                    <input type="text" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} placeholder={t.savePresetModal.placeholder} className="mt-4 w-full bg-slate-800 border border-slate-700 rounded-lg text-slate-200 p-2" autoFocus />
                    <div className="mt-6 flex justify-end gap-4"><button onClick={() => setIsSavePresetModalOpen(false)} className="px-6 py-2 rounded-md text-slate-300 bg-slate-800">{t.savePresetModal.cancel}</button><button onClick={handleSavePreset} className="px-6 py-2 rounded-md text-white bg-cyan-600">{t.savePresetModal.save}</button></div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
