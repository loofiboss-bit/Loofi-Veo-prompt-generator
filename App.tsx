import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SelectOption, PromptState, ToastMessage, VeoPromptResponse, HistoryEntry, PromptTemplate,
  GroundingChunk
} from './types';
import {
  getLanguageOptions, getModelOptions, getArtStyles, getCameraMovements, getCameraDistances,
  getLensTypes, getVisualEffects, getColorPalettes, getAspectRatios, getAnimationPresets,
  getVoiceStyles, getTimeOfDayOptions, getWeatherOptions, getMotionIntensityOptions,
  getCreativityLevelOptions, getCharacterGenders, getCharacterEthnicities,
  getCharacterClothings, getCharacterArchetypes, getAmbientSounds, getSoundEffectsIntensity,
  getStaticInspirationPrompts, RESTRICTED_KEYWORDS, CHARACTER_LIMITS
} from './constants';
import { getPromptTemplates } from './templates';
import { appUIStrings } from './translations';
import { useBroadcastState } from './hooks/useBroadcastState';
import * as geminiService from './services/geminiService';
import { GenerateVideosOperation } from '@google/genai';
import { ApiError, ApiErrorType } from './utils/apiErrors';

// Components
import Header from './components/Header';
import SelectInput from './components/SelectInput';
import TextAreaInput from './components/TextAreaInput';
import Button from './components/Button';
import PromptOutput from './components/PromptOutput';
import Toast from './components/Toast';
import HistoryPanel from './components/HistoryPanel';
import ExamplesCarousel from './components/ExamplesCarousel';
import TemplatesPanel from './components/TemplatesPanel';
import Tabs from './components/Tabs';
import CollapsibleSection from './components/CollapsibleSection';
import Icon from './components/Icon';
import VideoGenerationProgress from './components/VideoGenerationProgress';
import VariationsPanel from './components/VariationsPanel';
import PromptBuilderSummary from './components/PromptBuilderSummary';

type ValidationErrors = Partial<Record<keyof PromptState, string>>;

const initialPromptState: PromptState = {
  idea: '', environment: '', characterActions: '', characterGender: 'Any',
  characterEthnicity: 'Any', characterClothing: 'Any', characterArchetype: 'Any',
  timeOfDay: 'Any', weather: 'Any', voiceOver: '', voiceStyle: 'None',
  ambientSound: 'None', soundEffectsIntensity: 'Subtle', negativePrompt: '',
  optimizeFor8Seconds: false, artStyle: 'Cinematic', customArtStyle: '',
  cameraMovement: 'Static shot', cameraDistance: 'Wide shot', lensType: 'Standard prime lens',
  visualEffect: 'None', colorPalette: 'Vibrant and saturated', aspectRatio: '16:9',
  animationPreset: 'None', motionIntensity: 'Medium', creativityLevel: 'Balanced',
  includeOverlayText: false, useGoogleSearch: false, generateAsSeries: false,
  youtubeUrl: '', imageStudioPrompt: '', uploadedImage: null,
  language: 'en', model: 'gemini-2.5-flash',
};

const App: React.FC = () => {
  const [promptState, setPromptState, isSyncConnected] = useBroadcastState<PromptState>(initialPromptState);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [conceptArt, setConceptArt] = useState<string | null>(null);
  const [storyboard, setStoryboard] = useState<string[]>([]);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [videoStatus, setVideoStatus] = useState('');
  const [videoOperation, setVideoOperation] = useState<GenerateVideosOperation | null>(null);
  const [showVideoProgress, setShowVideoProgress] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [variations, setVariations] = useState<string[]>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [showVariationsPanel, setShowVariationsPanel] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'art' | 'storyboard'>('art');

  const t = appUIStrings[promptState.language];

  const getApiErrorMessage = (error: unknown): string => {
    if (error instanceof ApiError) {
      switch (error.type) {
        case ApiErrorType.InvalidApiKey:
          return t.errorApiKeyInvalid;
        case ApiErrorType.RateLimitExceeded:
          return t.errorRateLimit;
        case ApiErrorType.ContentBlocked:
          return t.errorSafety;
        case ApiErrorType.BadRequest:
          return t.errorBadRequest;
        case ApiErrorType.ServerError:
          return t.errorServerError;
        case ApiErrorType.NetworkError:
          return t.errorNetwork;
        default:
          return t.errorGeneric;
      }
    }
    return t.errorGeneric;
  };

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('veoPromptHistory');
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
    }
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (videoOperation && !videoOperation.done) {
      setVideoStatus('Polling');
      const poll = async () => {
        try {
          const updatedOp = await geminiService.getVideosOperation(videoOperation);
          setVideoOperation(updatedOp);
          if (updatedOp.done) {
            setVideoStatus('Fetching');
            const uri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
            if (uri) {
                const videoBlob = await geminiService.downloadVideo(uri);
                handleDownloadBlob(videoBlob, `veo-video-${Date.now()}.mp4`);
                addToast(t.videoGeneratedSuccess, 'success');
            } else {
                throw new Error("Video URI not found in response.");
            }
            setVideoStatus('Complete');
            setTimeout(() => {
              setShowVideoProgress(false);
              setIsGeneratingVideo(false);
            }, 2000);
          } else {
            timeoutId = setTimeout(poll, 10000);
          }
        } catch (error) {
          addToast(getApiErrorMessage(error), 'error');
          setIsGeneratingVideo(false);
          setShowVideoProgress(false);
        }
      };
      timeoutId = setTimeout(poll, 10000);
    }
    return () => clearTimeout(timeoutId);
  }, [videoOperation, t]);
  
  const addToast = (message: string, type: ToastMessage['type']) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const { name, value, type } = target;
    const isCheckbox = type === 'checkbox' && target instanceof HTMLInputElement;
    setPromptState({ [name]: isCheckbox ? target.checked : value });
    if (validationErrors[name as keyof PromptState]) {
      setValidationErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const validateField = (name: keyof PromptState, value: any, state: PromptState): string | undefined => {
    const limit = CHARACTER_LIMITS[name as keyof typeof CHARACTER_LIMITS];
    if (limit && typeof value === 'string' && value.length > limit) {
      return t.errorTooLong;
    }
    if (typeof value === 'string' && RESTRICTED_KEYWORDS.some(k => value.toLowerCase().includes(k))) {
      return t.errorRestricted;
    }
    if (name === 'youtubeUrl' && value && !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(value)) {
        return t.errorInvalidUrl;
    }
    if (name === 'customArtStyle' && state.artStyle === 'Custom' && (!value || !value.trim())) {
      return t.errorCustomStyleRequired;
    }
    if (name === 'voiceOver' && state.voiceStyle !== 'None' && (!value || !value.trim())) {
      return t.errorVoiceOverRequired;
    }
    return undefined;
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const key = name as keyof PromptState;

    const currentValues = { ...promptState, [key]: value };

    const newErrors: ValidationErrors = { ...validationErrors };

    newErrors[key] = validateField(key, value, currentValues);

    if (key === 'artStyle') {
      newErrors.customArtStyle = validateField('customArtStyle', currentValues.customArtStyle, currentValues);
    }
    if (key === 'voiceStyle') {
      newErrors.voiceOver = validateField('voiceOver', currentValues.voiceOver, currentValues);
    }

    setValidationErrors(newErrors);
  };
  
  const updateHistory = (newEntry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const entry: HistoryEntry = { ...newEntry, id: `hist-${Date.now()}`, timestamp: Date.now() };
    const newHistory = [entry, ...history.slice(0, 49)];
    setHistory(newHistory);
    localStorage.setItem('veoPromptHistory', JSON.stringify(newHistory));
  };

  const handleGeneratePrompt = async () => {
    if (!process.env.API_KEY) {
      addToast(t.errorApiKey, 'error');
      return;
    }
    
    const errors: ValidationErrors = {};
    Object.keys(promptState).forEach(key => {
        const error = validateField(key as keyof PromptState, promptState[key as keyof PromptState], promptState);
        if (error) errors[key as keyof PromptState] = error;
    });

    if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        addToast(t.errorGeneric, 'error');
        return;
    }

    setIsLoading(true);
    setGeneratedPrompt('');
    setGroundingChunks([]);
    setConceptArt(null);
    setStoryboard([]);

    try {
      const response: VeoPromptResponse = await geminiService.generateVeoPrompt(promptState);
      setGeneratedPrompt(response.prompt);
      setGroundingChunks(response.groundingChunks || []);
      addToast(t.promptGeneratedSuccess, 'success');
      updateHistory({ params: promptState, prompt: response.prompt, groundingChunks: response.groundingChunks });
    } catch (error) {
      addToast(getApiErrorMessage(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDataUrl = (dataUrl: string, filename: string) => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
  };

  const handleGenerateArt = async (prompt: string) => {
      setIsGeneratingArt(true);
      setConceptArt(null);
      try {
          const images = await geminiService.generateArt(prompt, promptState.aspectRatio, 1);
          setConceptArt(`data:image/jpeg;base64,${images[0]}`);
          addToast(t.artGeneratedSuccess, 'success');
      } catch (error) {
          addToast(getApiErrorMessage(error), 'error');
      } finally {
          setIsGeneratingArt(false);
      }
  };

  const handleGenerateVideo = async (prompt: string) => {
      setIsGeneratingVideo(true);
      setShowVideoProgress(true);
      setVideoStatus('Init');
      try {
          const op = await geminiService.generateVideo(prompt);
          setVideoOperation(op);
          setVideoStatus('Processing');
          addToast(t.videoRequestSuccess, 'info');
      } catch(error) {
          addToast(getApiErrorMessage(error), 'error');
          setIsGeneratingVideo(false);
          setShowVideoProgress(false);
      }
  };
  
  const handleGenerateStoryboard = async (prompt: string) => {
    setIsGeneratingStoryboard(true);
    setStoryboard([]);
     try {
          const images = await geminiService.generateArt(prompt, promptState.aspectRatio, 4);
          setStoryboard(images.map(img => `data:image/jpeg;base64,${img}`));
          addToast(t.storyboardGeneratedSuccess, 'success');
      } catch (error) {
          addToast(getApiErrorMessage(error), 'error');
      } finally {
          setIsGeneratingStoryboard(false);
      }
  };
  
  const handleGenerateVariations = async (basePrompt: string) => {
    setIsGeneratingVariations(true);
    setShowVariationsPanel(true);
    setVariations([]);
    try {
        const result = await geminiService.generatePromptVariations(basePrompt, promptState.language);
        setVariations(result);
    } catch (error) {
        addToast(getApiErrorMessage(error), 'error');
        setShowVariationsPanel(false);
    } finally {
        setIsGeneratingVariations(false);
    }
  };

  const handleSelectVariation = (variation: string) => {
    setGeneratedPrompt(variation);
    setShowVariationsPanel(false);
    addToast(t.variationAppliedSuccess, 'success');
  };

  const handleUseExample = (example: any) => {
      setPromptState({ ...initialPromptState, language: promptState.language, idea: example.idea, ...example.params }, 'replace');
      setShowExamples(false);
      addToast('Example loaded!', 'info');
  };

  const handleUseTemplate = (template: PromptTemplate) => {
      setPromptState({ ...initialPromptState, language: promptState.language, ...template.params }, 'replace');
      setShowTemplates(false);
      addToast(`Template '${template.name}' applied!`, 'info');
  };

  const handleSelectHistory = (entry: HistoryEntry) => {
      setPromptState(entry.params, 'replace');
      setGeneratedPrompt(entry.prompt);
      setGroundingChunks(entry.groundingChunks || []);
      setShowHistory(false);
  };

  const handleClearHistory = () => {
      setHistory([]);
      localStorage.removeItem('veoPromptHistory');
      addToast(t.historyCleared, 'info');
  };
  
  const handleDeleteHistory = (id: string) => {
      const newHistory = history.filter(entry => entry.id !== id);
      setHistory(newHistory);
      localStorage.setItem('veoPromptHistory', JSON.stringify(newHistory));
      addToast(t.historyEntryDeleted, 'info');
  };

  const onSavePrompt = (newPrompt: string) => {
    setGeneratedPrompt(newPrompt);
    addToast(t.promptSaved, 'success');
  }

  const handleAnalyzeYoutubeUrl = async () => {
    const error = validateField('youtubeUrl', promptState.youtubeUrl, promptState);
    if(error) {
        setValidationErrors(prev => ({...prev, youtubeUrl: error}));
        return;
    }
    setIsAnalyzingUrl(true);
    try {
        const idea = await geminiService.analyzeYouTubeVideo(promptState.youtubeUrl, promptState.language);
        setPromptState({ idea });
        addToast(t.youtubeSuccess, 'success');
    } catch(error) {
        addToast(getApiErrorMessage(error), 'error');
    } finally {
        setIsAnalyzingUrl(false);
    }
  };

  const handleAutoFillModifiers = async () => {
    if (!promptState.idea) return;
    setIsAutoFilling(true);
    try {
        const suggestions = await geminiService.analyzeIdeaForModifiers(promptState.idea, promptState.language, {
            timeOfDayOptions: memoizedOptions.timeOfDayOptions,
            weatherOptions: memoizedOptions.weatherOptions,
            artStyles: memoizedOptions.artStyles,
            colorPalettes: memoizedOptions.colorPalettes,
            cameraMovements: memoizedOptions.cameraMovements,
        });
        setPromptState(suggestions);
        addToast(t.autofillSuccess, 'success');
    } catch(error) {
        addToast(getApiErrorMessage(error), 'error');
    } finally {
        setIsAutoFilling(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result?.toString().split(',')[1];
        if (base64String) {
          setPromptState({ uploadedImage: { data: base64String, mimeType: file.type } });
          addToast(t.imageUploaded, 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImage = async () => {
      if (!promptState.uploadedImage || !promptState.imageStudioPrompt) return;
      setIsEditingImage(true);
      try {
          const result = await geminiService.editImage(promptState.uploadedImage.data, promptState.uploadedImage.mimeType, promptState.imageStudioPrompt);
          setPromptState({ uploadedImage: { data: result.newImageBytes, mimeType: result.newMimeType }, imageStudioPrompt: '' });
          addToast(t.imageEdited, 'success');
      } catch(error) {
          addToast(getApiErrorMessage(error), 'error');
      } finally {
          setIsEditingImage(false);
      }
  };

  const memoizedOptions = useMemo(() => ({
    languageOptions: getLanguageOptions(),
    modelOptions: getModelOptions(promptState.language),
    artStyles: getArtStyles(promptState.language),
    cameraMovements: getCameraMovements(promptState.language),
    cameraDistances: getCameraDistances(promptState.language),
    lensTypes: getLensTypes(promptState.language),
    visualEffects: getVisualEffects(promptState.language),
    colorPalettes: getColorPalettes(promptState.language),
    aspectRatios: getAspectRatios(promptState.language),
    animationPresets: getAnimationPresets(promptState.language),
    voiceStyles: getVoiceStyles(promptState.language),
    timeOfDayOptions: getTimeOfDayOptions(promptState.language),
    weatherOptions: getWeatherOptions(promptState.language),
    motionIntensityOptions: getMotionIntensityOptions(promptState.language),
    creativityLevelOptions: getCreativityLevelOptions(promptState.language),
    characterGenders: getCharacterGenders(promptState.language),
    characterEthnicities: getCharacterEthnicities(promptState.language),
    characterClothings: getCharacterClothings(promptState.language),
    characterArchetypes: getCharacterArchetypes(promptState.language),
    ambientSounds: getAmbientSounds(promptState.language),
    soundEffectsIntensity: getSoundEffectsIntensity(promptState.language),
    inspirationPrompts: getStaticInspirationPrompts(promptState.language),
    promptTemplates: getPromptTemplates(promptState.language),
  }), [promptState.language]);

  const isFormInvalid = Object.values(validationErrors).some(error => !!error);

  const tabs = [
    { label: t.tabScene, content: (
        <div className="space-y-4">
            <CollapsibleSection title={t.sectionIdea} defaultOpen>
                <TextAreaInput 
                    label={t.ideaLabel} name="idea" value={promptState.idea} onChange={handleInputChange} 
                    onBlur={handleBlur} error={validationErrors.idea} placeholder={t.ideaPlaceholder}
                    maxLength={CHARACTER_LIMITS.idea} tooltipText={t.contentGuidelineTooltip} rows={3}
                    actionButton={
                        <button onClick={handleAutoFillModifiers} disabled={!promptState.idea || isAutoFilling} className="p-1 rounded-full text-cyan-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title={t.autofillButton}>
                            {isAutoFilling ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
                        </button>
                    }
                />
            </CollapsibleSection>
            <CollapsibleSection title={t.sectionEnvironment}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SelectInput label={t.timeOfDay} name="timeOfDay" options={memoizedOptions.timeOfDayOptions} value={promptState.timeOfDay} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.timeOfDay} />
                    <SelectInput label={t.weather} name="weather" options={memoizedOptions.weatherOptions} value={promptState.weather} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.weather} />
                </div>
                 <div className="mt-4">
                    <TextAreaInput label={t.environmentLabel} name="environment" value={promptState.environment} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.environment} placeholder={t.environmentPlaceholder} maxLength={CHARACTER_LIMITS.environment} tooltipText={t.contentGuidelineTooltip} />
                </div>
            </CollapsibleSection>
        </div>
    )},
    { label: t.tabCharacter, content: (
        <CollapsibleSection title={t.sectionCharacter}>
            <div className="space-y-4">
                <TextAreaInput label={t.characterActionsLabel} name="characterActions" value={promptState.characterActions} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.characterActions} placeholder={t.characterActionsPlaceholder} maxLength={CHARACTER_LIMITS.characterActions} tooltipText={t.contentGuidelineTooltip}/>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SelectInput label="Gender" name="characterGender" options={memoizedOptions.characterGenders} value={promptState.characterGender} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.characterGender} />
                    <SelectInput label="Ethnicity" name="characterEthnicity" options={memoizedOptions.characterEthnicities} value={promptState.characterEthnicity} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.characterEthnicity} />
                    <SelectInput label="Clothing" name="characterClothing" options={memoizedOptions.characterClothings} value={promptState.characterClothing} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.characterClothing} />
                    <SelectInput label="Archetype" name="characterArchetype" options={memoizedOptions.characterArchetypes} value={promptState.characterArchetype} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.characterArchetype} />
                </div>
            </div>
        </CollapsibleSection>
    )},
    { label: t.tabStyle, content: (
        <CollapsibleSection title={t.sectionArtStyle}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                 <SelectInput label="Art Style" name="artStyle" options={memoizedOptions.artStyles} value={promptState.artStyle} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.artStyle} />
                 {promptState.artStyle === 'Custom' && (
                     <div className="md:col-span-2">
                        <TextAreaInput label={t.customArtStyleLabel} name="customArtStyle" value={promptState.customArtStyle} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.customArtStyle} placeholder={t.customArtStylePlaceholder} maxLength={CHARACTER_LIMITS.customArtStyle} tooltipText={t.customArtStyleTooltip} rows={1} />
                     </div>
                 )}
                 <SelectInput label="Color Palette" name="colorPalette" options={memoizedOptions.colorPalettes} value={promptState.colorPalette} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.colorPalette} />
                 <SelectInput label="Visual Effect" name="visualEffect" options={memoizedOptions.visualEffects} value={promptState.visualEffect} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.visualEffect} />
            </div>
        </CollapsibleSection>
    )},
     { label: t.tabCamera, content: (
        <CollapsibleSection title={t.sectionCameraWork}>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <SelectInput label="Camera Movement" name="cameraMovement" options={memoizedOptions.cameraMovements} value={promptState.cameraMovement} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.cameraMovement} />
                 <SelectInput label="Camera Distance" name="cameraDistance" options={memoizedOptions.cameraDistances} value={promptState.cameraDistance} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.cameraDistance} />
                 <SelectInput label="Lens Type" name="lensType" options={memoizedOptions.lensTypes} value={promptState.lensType} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.lensType} />
                 <SelectInput label="Aspect Ratio" name="aspectRatio" options={memoizedOptions.aspectRatios} value={promptState.aspectRatio} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.aspectRatio} />
            </div>
        </CollapsibleSection>
    )},
    { label: t.tabAnimation, content: (
        <CollapsibleSection title={t.sectionAnimation}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <SelectInput label="Animation Preset" name="animationPreset" options={memoizedOptions.animationPresets} value={promptState.animationPreset} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.animationPreset} />
                 <SelectInput label="Motion Intensity" name="motionIntensity" options={memoizedOptions.motionIntensityOptions} value={promptState.motionIntensity} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.motionIntensity} />
            </div>
        </CollapsibleSection>
    )},
    { label: t.tabAudio, content: (
         <CollapsibleSection title={t.sectionAudioDesign}>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SelectInput label="Voice-over Style" name="voiceStyle" options={memoizedOptions.voiceStyles} value={promptState.voiceStyle} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.voiceStyle} />
                    <SelectInput label="Ambient Sound" name="ambientSound" options={memoizedOptions.ambientSounds} value={promptState.ambientSound} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.ambientSound} />
                    <SelectInput label="Sound Effects" name="soundEffectsIntensity" options={memoizedOptions.soundEffectsIntensity} value={promptState.soundEffectsIntensity} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.soundEffectsIntensity} />
                </div>
                {promptState.voiceStyle !== 'None' && (
                    <TextAreaInput label={t.voiceOverLabel} name="voiceOver" value={promptState.voiceOver} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.voiceOver} placeholder={t.voiceOverPlaceholder} maxLength={CHARACTER_LIMITS.voiceOver} rows={3} />
                )}
            </div>
        </CollapsibleSection>
    )},
    { label: t.tabAdvanced, content: (
        <CollapsibleSection title={t.sectionAdvanced}>
            <div className="space-y-4">
                <SelectInput label="Creativity Level" name="creativityLevel" options={memoizedOptions.creativityLevelOptions} value={promptState.creativityLevel} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.creativityLevel} />
                <TextAreaInput label={t.negativePromptLabel} name="negativePrompt" value={promptState.negativePrompt} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.negativePrompt} placeholder={t.negativePromptPlaceholder} maxLength={CHARACTER_LIMITS.negativePrompt} tooltipText={t.negativePromptTooltip} />
                 <div className="space-y-3 pt-2">
                    <div className="flex items-center">
                        <input id="optimizeFor8Seconds" name="optimizeFor8Seconds" type="checkbox" checked={promptState.optimizeFor8Seconds} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 bg-slate-700" />
                        <label htmlFor="optimizeFor8Seconds" className="ml-3 block text-sm text-slate-300">{t.optimizeFor8sLabel}</label>
                    </div>
                     <div className="flex items-center">
                        <input id="includeOverlayText" name="includeOverlayText" type="checkbox" checked={promptState.includeOverlayText} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 bg-slate-700" />
                        <label htmlFor="includeOverlayText" className="ml-3 block text-sm text-slate-300">{t.includeOverlayTextLabel}</label>
                    </div>
                     <div className="flex items-center">
                        <input id="useGoogleSearch" name="useGoogleSearch" type="checkbox" checked={promptState.useGoogleSearch} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 bg-slate-700" />
                        <label htmlFor="useGoogleSearch" className="ml-3 block text-sm text-slate-300">{t.useGoogleSearchLabel}</label>
                    </div>
                     <div className="flex items-center">
                        <input id="generateAsSeries" name="generateAsSeries" type="checkbox" checked={promptState.generateAsSeries} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 bg-slate-700" />
                        <label htmlFor="generateAsSeries" className="ml-3 block text-sm text-slate-300">{t.generateAsSeriesLabel}</label>
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    )},
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="fixed top-4 right-4 z-[60] space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>

      {showHistory && <HistoryPanel history={history} onSelect={handleSelectHistory} onClear={handleClearHistory} onDelete={handleDeleteHistory} onClose={() => setShowHistory(false)} uiStrings={{ title: t.historyTitle, clear: t.historyClear, clearConfirm: t.historyClearConfirm, empty: t.historyEmpty, use: t.historyUse, delete: t.historyDelete, deleteConfirm: t.historyDeleteConfirm }} language={promptState.language} />}
      {showTemplates && <TemplatesPanel templates={memoizedOptions.promptTemplates} onSelect={handleUseTemplate} onClose={() => setShowTemplates(false)} uiStrings={{title: t.templatesTitle, use: t.templatesUse}} />}
      
      {showVariationsPanel && (
        <VariationsPanel
          variations={variations}
          isLoading={isGeneratingVariations}
          onSelect={handleSelectVariation}
          onClose={() => setShowVariationsPanel(false)}
          uiStrings={{
              title: t.variationsPanelTitle,
              use: t.variationsUseButton,
              loading: t.variationsLoading,
              empty: t.variationsEmpty,
          }}
        />
       )}

      {showVideoProgress && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
           <div className="bg-slate-900/70 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col p-8 items-center">
                <h2 className="text-xl font-semibold mb-6">{t.videoGenerationModalTitle}</h2>
                <VideoGenerationProgress currentStatus={videoStatus} language={promptState.language} />
                {videoStatus === 'Complete' && 
                    <button onClick={() => setShowVideoProgress(false)} className="mt-6 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500">{t.videoGenerationModalClose}</button>
                }
           </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <Header title={t.title} subtitle={t.subtitle} onShowHistory={() => setShowHistory(true)} historyButtonText={t.historyButton} isSyncConnected={isSyncConnected} />

        <main className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-6 bg-slate-900/60 backdrop-blur-lg p-4 sm:p-6 rounded-2xl border border-slate-700 shadow-2xl shadow-black/30">
                     <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center space-x-4">
                          <button onClick={() => setShowTemplates(true)} className="flex items-center space-x-2 text-sm text-cyan-400 hover:text-cyan-300">
                            <Icon name="template" className="w-5 h-5" />
                            <span>{t.templatesTitle}</span>
                          </button>
                        </div>
                        <SelectInput label="" name="language" options={memoizedOptions.languageOptions} value={promptState.language} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.language}/>
                    </div>
                    
                    <CollapsibleSection title={t.sectionInspiration}>
                        <div className="flex flex-col space-y-4">
                            <label className="text-sm font-medium text-slate-300">{t.youtubeUrlLabel}</label>
                            <div className="flex items-center space-x-2">
                                <input type="url" name="youtubeUrl" value={promptState.youtubeUrl} onChange={handleInputChange} onBlur={handleBlur} placeholder={t.youtubeUrlPlaceholder} className={`flex-grow bg-slate-900/50 border rounded-lg p-2 text-sm placeholder-slate-500 focus:ring-cyan-500 transition ${validationErrors.youtubeUrl ? 'border-red-500' : 'border-slate-700 focus:border-cyan-500'}`} />
                                <Button onClick={handleAnalyzeYoutubeUrl} isLoading={isAnalyzingUrl} disabled={!promptState.youtubeUrl || !!validationErrors.youtubeUrl} className="!w-auto !px-4 !py-2 !text-sm">{isAnalyzingUrl ? t.analyzingButton : t.analyzeButton}</Button>
                            </div>
                             {validationErrors.youtubeUrl && <p className="text-sm text-red-400 mt-1">{validationErrors.youtubeUrl}</p>}
                        </div>
                    </CollapsibleSection>

                    {showExamples && (
                        <ExamplesCarousel examples={memoizedOptions.inspirationPrompts} onUseExample={handleUseExample} useExampleText={t.examplesUse} onClose={() => setShowExamples(false)} title={t.examplesTitle} />
                    )}

                    <Tabs tabs={tabs} />

                    <div className="pt-4">
                        <Button onClick={handleGeneratePrompt} isLoading={isLoading} disabled={isFormInvalid}>
                        {isLoading ? t.generatingButton : t.generateButton}
                        </Button>
                    </div>
                </div>

                <div className="space-y-6 sticky top-8">
                    {!generatedPrompt ? (
                        <PromptBuilderSummary 
                            promptState={promptState} 
                            uiStrings={{
                                title: t.summaryTitle,
                                ideaLabel: t.ideaLabel,
                                styleLabel: t.styleLabel,
                                cameraLabel: t.cameraLabel,
                                cta: t.summaryCta
                            }}
                        />
                    ) : (
                        <>
                            <div>
                                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                    <span>{t.promptOutputTitle}</span>
                                    {groundingChunks.length > 0 && (
                                        <span title={t.groundingActiveTooltip} className="cursor-help">
                                            <Icon name="globe" className="w-5 h-5 text-cyan-400" />
                                        </span>
                                    )}
                                </h2>
                                <PromptOutput 
                                    prompt={generatedPrompt} onSave={onSavePrompt} copiedText={t.copiedButton}
                                    editText={t.editButton} saveText={t.saveButton} cancelText={t.cancelButton}
                                    onGenerateArt={handleGenerateArt} isGeneratingArt={isGeneratingArt} generateArtText={t.generateArtButton} loadingArtText={t.loadingArtButton}
                                    onGenerateVideo={handleGenerateVideo} isGeneratingVideo={isGeneratingVideo} generateVideoText={t.generateVideoButton} loadingVideoText={t.loadingVideoButton}
                                    onGenerateStoryboard={handleGenerateStoryboard} isGeneratingStoryboard={isGeneratingStoryboard} generateStoryboardText={t.generateStoryboardButton} loadingStoryboardText={t.loadingStoryboardButton}
                                    onGenerateVariations={handleGenerateVariations} isGeneratingVariations={isGeneratingVariations} generateVariationsText={t.generateVariationsButton} loadingVariationsText={t.generatingVariationsButton}
                                    onShare={() => { addToast('Share feature coming soon!', 'info')}} shareText={t.shareButton}
                                    onDownload={(p) => handleDownloadBlob(new Blob([p], { type: 'text/plain' }), 'veo-prompt.txt')}
                                />
                                 {groundingChunks.length > 0 && (
                                    <div className="mt-4 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                        <h3 className="font-semibold text-slate-300 mb-2">{t.groundingTitle}</h3>
                                        <ul className="list-disc list-inside space-y-1">
                                            {groundingChunks.map((chunk, index) => chunk.web && (
                                                <li key={index} className="text-sm">
                                                    <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{chunk.web.title || chunk.web.uri}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            
                            {(conceptArt || storyboard.length > 0) && (
                                <CollapsibleSection title={t.sectionGeneratedMedia} defaultOpen>
                                    <div className="space-y-4">
                                        {conceptArt && storyboard.length > 0 && (
                                            <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg">
                                                <button onClick={() => setActiveMediaTab('art')} className={`w-1/2 py-1.5 text-sm font-medium rounded-md transition-colors ${activeMediaTab === 'art' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>{t.conceptArtTitle}</button>
                                                <button onClick={() => setActiveMediaTab('storyboard')} className={`w-1/2 py-1.5 text-sm font-medium rounded-md transition-colors ${activeMediaTab === 'storyboard' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>{t.storyboardTitle}</button>
                                            </div>
                                        )}

                                        {conceptArt && (!storyboard.length || activeMediaTab === 'art') && (
                                            <div className="animate-fade-in-up">
                                                {storyboard.length === 0 && <h3 className="text-lg font-semibold mb-2">{t.conceptArtTitle}</h3>}
                                                <img src={conceptArt} alt="Generated concept art" className="rounded-lg border border-slate-700" />
                                                <div className="mt-2 text-right">
                                                    <button onClick={() => handleDownloadDataUrl(conceptArt, 'concept-art.jpg')} className="text-sm flex items-center gap-2 text-cyan-400 hover:text-cyan-300">
                                                        <Icon name="download" className="w-4 h-4"/>{t.downloadArt}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {storyboard.length > 0 && (!conceptArt || activeMediaTab === 'storyboard') && (
                                            <div className="animate-fade-in-up">
                                                {conceptArt === null && <h3 className="text-lg font-semibold mb-2">{t.storyboardTitle}</h3>}
                                                <div className="grid grid-cols-2 gap-2">
                                                {storyboard.map((frame, index) => (
                                                    <div key={index} className="relative group">
                                                        <img src={frame} alt={`Storyboard frame ${index + 1}`} className="rounded-lg border border-slate-700" />
                                                        <button onClick={() => handleDownloadDataUrl(frame, `storyboard-frame-${index + 1}.jpg`)} className="absolute bottom-1 right-1 bg-slate-900/50 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity" title={t.downloadFrame}>
                                                            <Icon name="download" className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CollapsibleSection>
                            )}
                        </>
                    )}

                    <CollapsibleSection title={t.sectionImageStudio} defaultOpen>
                        {!promptState.uploadedImage ? (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Icon name="upload" className="w-8 h-8 mb-2 text-slate-400" />
                                    <p className="mb-1 text-sm text-slate-400">{t.imageStudioUploadTitle}</p>
                                    <p className="text-xs text-slate-500">{t.imageStudioUploadText}</p>
                                </div>
                                <input type="file" className="hidden" onChange={handleImageUpload} accept="image/png, image/jpeg, image/webp" />
                            </label>
                        ) : (
                            <div className="space-y-4">
                                <img src={`data:${promptState.uploadedImage.mimeType};base64,${promptState.uploadedImage.data}`} alt="Uploaded preview" className="rounded-lg max-h-60 w-auto mx-auto border border-slate-700" />
                                <TextAreaInput label={t.imageStudioPromptLabel} name="imageStudioPrompt" value={promptState.imageStudioPrompt} onChange={handleInputChange} onBlur={handleBlur} error={validationErrors.imageStudioPrompt} placeholder={t.imageStudioPromptPlaceholder} maxLength={CHARACTER_LIMITS.imageStudioPrompt} rows={2} />
                                <Button onClick={handleEditImage} isLoading={isEditingImage} disabled={!promptState.imageStudioPrompt}>
                                    {isEditingImage ? t.imageStudioGeneratingButton : t.imageStudioGenerateButton}
                                </Button>
                            </div>
                        )}
                    </CollapsibleSection>
                </div>
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;