import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PromptState,
  SelectOption,
  ToastMessage,
  HistoryEntry,
  VeoPromptResponse,
  PromptTemplate,
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
  getCharacterEthnicities,
  getCharacterClothings,
  getCharacterArchetypes,
  getAmbientSounds,
  getSoundEffectsIntensity,
  getStaticInspirationPrompts,
  CHARACTER_LIMITS,
} from './constants';
import { getPromptTemplates } from './templates';
import { appUIStrings } from './translations';
import { validateField, validateAllFields } from './utils/validation';
import { getApiErrorMessage } from './utils/errorHandler';
import * as geminiService from './services/geminiService';

import { useBroadcastState } from './hooks/useBroadcastState';

import Header from './components/Header';
import SelectInput from './components/SelectInput';
import TextAreaInput from './components/TextAreaInput';
import Button from './components/Button';
import PromptOutput from './components/PromptOutput';
import ExamplesCarousel from './components/ExamplesCarousel';
import HistoryPanel from './components/HistoryPanel';
import TemplatesPanel from './components/TemplatesPanel';
import VariationsPanel from './components/VariationsPanel';
import ImageStudio from './components/ImageStudio';
import Toast from './components/Toast';
import Tabs from './components/Tabs';
import CollapsibleSection from './components/CollapsibleSection';
import Tooltip from './components/Tooltip';
import PromptBuilderSummary from './components/PromptBuilderSummary';
import VideoGenerationProgress from './components/VideoGenerationProgress';
import TargetModelToggle from './components/TargetModelToggle';
import Icon from './components/Icon';


const INITIAL_STATE: PromptState = {
  idea: '',
  environment: '',
  characterActions: '',
  characterGender: 'Any',
  characterEthnicity: 'Any',
  characterClothing: 'Any',
  characterArchetype: 'Any',
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
  cameraMovement: 'Static shot',
  cameraDistance: 'Medium shot',
  lensType: 'Standard prime lens',
  visualEffect: 'None',
  colorPalette: 'Vibrant and saturated',
  aspectRatio: '16:9',
  animationPreset: 'None',
  motionIntensity: 'Medium',
  creativityLevel: 'Balanced',
  includeOverlayText: false,
  useGoogleSearch: false,
  generateAsSeries: false,
  youtubeUrl: '',
  imageStudioPrompt: '',
  uploadedImage: null,
  language: 'en',
  model: 'gemini-2.5-flash',
  targetModel: 'veo',
};

function App() {
  const [promptState, setPromptState, isSyncConnected] = useBroadcastState<PromptState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof PromptState, string>>>({});
  const [generatedPrompt, setGeneratedPrompt] = useState<VeoPromptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isVariationsOpen, setIsVariationsOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [promptVariations, setPromptVariations] = useState<string[]>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  
  const t = useMemo(() => appUIStrings[promptState.language], [promptState.language]);

  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('veo-prompt-history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
    }
  }, []);
  
  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const key = name as keyof PromptState;

    setPromptState({ [key]: value });

    const errorMessage = validateField(key, value, promptState, t);
    setErrors(prev => ({ ...prev, [key]: errorMessage }));
  }, [promptState, setPromptState, t]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setPromptState({ [name as keyof PromptState]: checked });
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
    try {
      const result = await geminiService.generateVeoPrompt(promptState);
      setGeneratedPrompt(result);
      addToast(t.toastPromptGenerated, 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, t), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [promptState, t, addToast]);
  
  const handleSavePrompt = useCallback((newPrompt: string) => {
    if (!generatedPrompt) return;
    const updatedPrompt = { ...generatedPrompt, prompt: newPrompt };
    setGeneratedPrompt(updatedPrompt);
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

  const handleUseTemplate = (template: PromptTemplate) => {
    setPromptState({ ...INITIAL_STATE, language: promptState.language, ...template.params }, 'replace');
    setGeneratedPrompt(null);
    setErrors({});
    setIsTemplatesOpen(false);
    addToast(t.toastTemplateApplied, 'info');
  };

  const handleGenerateVariations = async (basePrompt: string) => {
    setIsGeneratingVariations(true);
    setPromptVariations([]);
    setIsVariationsOpen(true);
    try {
        const variations = await geminiService.generatePromptVariations(basePrompt, promptState.language);
        setPromptVariations(variations);
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
        setIsVariationsOpen(false); // Close panel on error
    } finally {
        setIsGeneratingVariations(false);
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

  const handleGenerateVideo = async (prompt: string) => {
    setIsGeneratingVideo(true);
    setVideoStatus('Init');
    setGeneratedVideoUrl(null);

    try {
      let operation = await geminiService.generateVideo(prompt, promptState.uploadedImage);
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
      addToast(getApiErrorMessage(error, t), 'error');
      setVideoStatus('Error');
    } finally {
      // Don't set isGeneratingVideo to false until the user closes the modal or it times out
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
  const artStyleOptions = useMemo(() => getArtStyles(promptState.language), [promptState.language]);
  const cameraMovementOptions = useMemo(() => getCameraMovements(promptState.language), [promptState.language]);
  const cameraDistanceOptions = useMemo(() => getCameraDistances(promptState.language), [promptState.language]);
  const lensTypeOptions = useMemo(() => getLensTypes(promptState.language), [promptState.language]);
  const visualEffectOptions = useMemo(() => getVisualEffects(promptState.language), [promptState.language]);
  const colorPaletteOptions = useMemo(() => getColorPalettes(promptState.language), [promptState.language]);
  const aspectRatioOptions = useMemo(() => getAspectRatios(promptState.language), [promptState.language]);
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
  const ambientSoundOptions = useMemo(() => getAmbientSounds(promptState.language), [promptState.language]);
  const soundEffectsIntensityOptions = useMemo(() => getSoundEffectsIntensity(promptState.language), [promptState.language]);

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
            }
        );
        setPromptState(suggestions);
        addToast(t.autofillSuccess, 'success');
    } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
    } finally {
        setIsAutoFilling(false);
    }
  }, [promptState.idea, promptState.language, addToast, setPromptState, t, artStyleOptions, cameraMovementOptions, colorPaletteOptions]);

  const tabs = [
    { label: t.tabScene, content: (
      <div className="space-y-6">
        <CollapsibleSection title={t.sectionEnvironment} defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextAreaInput label={t.labelEnvironment} name="environment" value={promptState.environment} onChange={handleInputChange} maxLength={CHARACTER_LIMITS.environment} error={errors.environment} placeholder={t.placeholderEnvironment} />
            <div className="space-y-4">
              <SelectInput label={t.labelTimeOfDay} name="timeOfDay" options={timeOfDayOptions} value={promptState.timeOfDay} onChange={handleInputChange} />
              <SelectInput label={t.labelWeather} name="weather" options={weatherOptions} value={promptState.weather} onChange={handleInputChange} />
            </div>
          </div>
        </CollapsibleSection>
      </div>
    )},
    { label: t.tabCharacter, content: (
      <CollapsibleSection title={t.sectionCharacter} defaultOpen>
          <div className="space-y-4">
              <TextAreaInput label={t.labelCharacterActions} name="characterActions" value={promptState.characterActions} onChange={handleInputChange} maxLength={CHARACTER_LIMITS.characterActions} error={errors.characterActions} placeholder={t.placeholderCharacterActions} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SelectInput label={t.labelCharacterGender} name="characterGender" options={characterGenderOptions} value={promptState.characterGender} onChange={handleInputChange} />
                  <SelectInput label={t.labelCharacterEthnicity} name="characterEthnicity" options={characterEthnicityOptions} value={promptState.characterEthnicity} onChange={handleInputChange} />
                  <SelectInput label={t.labelCharacterClothing} name="characterClothing" options={characterClothingOptions} value={promptState.characterClothing} onChange={handleInputChange} />
                  <SelectInput label={t.labelCharacterArchetype} name="characterArchetype" options={characterArchetypeOptions} value={promptState.characterArchetype} onChange={handleInputChange} />
              </div>
          </div>
      </CollapsibleSection>
    )},
    { label: t.tabStyle, content: (
      <CollapsibleSection title={t.sectionStyle} defaultOpen>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput label={t.labelArtStyle} name="artStyle" options={artStyleOptions} value={promptState.artStyle} onChange={handleInputChange} />
          {promptState.artStyle === 'Custom' && (
            <TextAreaInput label={t.labelCustomArtStyle} name="customArtStyle" value={promptState.customArtStyle} onChange={handleInputChange} maxLength={CHARACTER_LIMITS.customArtStyle} error={errors.customArtStyle} placeholder={t.placeholderCustomArtStyle} />
          )}
          <SelectInput label={t.labelVisualEffect} name="visualEffect" options={visualEffectOptions} value={promptState.visualEffect} onChange={handleInputChange} />
          <SelectInput label={t.labelColorPalette} name="colorPalette" options={colorPaletteOptions} value={promptState.colorPalette} onChange={handleInputChange} />
        </div>
      </CollapsibleSection>
    )},
    { label: t.tabCamera, content: (
      <CollapsibleSection title={t.sectionCamera} defaultOpen>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput label={t.labelCameraMovement} name="cameraMovement" options={cameraMovementOptions} value={promptState.cameraMovement} onChange={handleInputChange} />
          <SelectInput label={t.labelCameraDistance} name="cameraDistance" options={cameraDistanceOptions} value={promptState.cameraDistance} onChange={handleInputChange} />
          <SelectInput label={t.labelLensType} name="lensType" options={lensTypeOptions} value={promptState.lensType} onChange={handleInputChange} />
          <SelectInput label={t.labelAspectRatio} name="aspectRatio" options={aspectRatioOptions} value={promptState.aspectRatio} onChange={handleInputChange} />
        </div>
      </CollapsibleSection>
    )},
    { label: t.tabAudio, content: (
      <CollapsibleSection title={t.sectionAudio} defaultOpen>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput label={t.labelVoiceStyle} name="voiceStyle" options={voiceStyleOptions} value={promptState.voiceStyle} onChange={handleInputChange} />
            {promptState.voiceStyle !== 'None' && (
              <TextAreaInput label={t.labelVoiceOver} name="voiceOver" value={promptState.voiceOver} onChange={handleInputChange} maxLength={CHARACTER_LIMITS.voiceOver} error={errors.voiceOver} placeholder={t.placeholderVoiceOver} />
            )}
            <SelectInput label={t.labelAmbientSound} name="ambientSound" options={ambientSoundOptions} value={promptState.ambientSound} onChange={handleInputChange} />
            <SelectInput label={t.labelSoundEffectsIntensity} name="soundEffectsIntensity" options={soundEffectsIntensityOptions} value={promptState.soundEffectsIntensity} onChange={handleInputChange} />
        </div>
      </CollapsibleSection>
    )},
    { label: t.tabAdvanced, content: (
      <div className="space-y-6">
        <CollapsibleSection title={t.sectionAdvanced} defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectInput label={t.labelMotionIntensity} name="motionIntensity" options={motionIntensityOptions} value={promptState.motionIntensity} onChange={handleInputChange} />
              <SelectInput label={t.labelCreativityLevel} name="creativityLevel" options={creativityLevelOptions} value={promptState.creativityLevel} onChange={handleInputChange} />
              <TextAreaInput label={t.labelNegativePrompt} name="negativePrompt" value={promptState.negativePrompt} onChange={handleInputChange} maxLength={CHARACTER_LIMITS.negativePrompt} error={errors.negativePrompt} placeholder={t.placeholderNegativePrompt} />
              <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                    <input id="optimizeFor8Seconds" name="optimizeFor8Seconds" type="checkbox" checked={promptState.optimizeFor8Seconds} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500" />
                    <label htmlFor="optimizeFor8Seconds" className="text-sm font-medium text-slate-300">{t.labelOptimizeFor8Seconds}</label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                    <input id="includeOverlayText" name="includeOverlayText" type="checkbox" checked={promptState.includeOverlayText} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500" />
                    <label htmlFor="includeOverlayText" className="text-sm font-medium text-slate-300">{t.labelIncludeOverlayText}</label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                      <input id="useGoogleSearch" name="useGoogleSearch" type="checkbox" checked={promptState.useGoogleSearch} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500" />
                      <label htmlFor="useGoogleSearch" className="text-sm font-medium text-slate-300">{t.labelUseGoogleSearch}</label>
                  </div>
                   <div className="flex items-center space-x-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
                      <input id="generateAsSeries" name="generateAsSeries" type="checkbox" checked={promptState.generateAsSeries} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500" />
                      <label htmlFor="generateAsSeries" className="text-sm font-medium text-slate-300">{t.labelGenerateAsSeries}</label>
                  </div>
              </div>
          </div>
        </CollapsibleSection>
        <CollapsibleSection title={t.sectionModel}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput label={t.labelModel} name="model" options={modelOptions} value={promptState.model} onChange={handleInputChange} />
            <TargetModelToggle label={t.labelTargetModel} value={promptState.targetModel} onChange={(model) => setPromptState({ targetModel: model })} />
          </div>
        </CollapsibleSection>
      </div>
    )},
  ];

  const autoFillButton = (
    <button
        onClick={handleAutoFillModifiers}
        disabled={isAutoFilling || !promptState.idea}
        className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label={t.autofillButton}
        title={t.autofillButton}
    >
        {isAutoFilling ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <Header 
          title={t.headerTitle}
          subtitle={t.headerSubtitle}
          onShowHistory={() => setIsHistoryOpen(true)}
          historyButtonText={t.historyButton}
          onShowImageStudio={() => setIsImageStudioOpen(true)}
          imageStudioButtonText={t.imageStudioButton}
          isSyncConnected={isSyncConnected}
        />

        <div className="mt-10 max-w-5xl mx-auto space-y-8">
            <section aria-labelledby="idea-section">
              <h2 id="idea-section" className="sr-only">Core Idea</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <TextAreaInput
                        label={t.labelIdea}
                        name="idea"
                        value={promptState.idea}
                        onChange={handleInputChange}
                        maxLength={CHARACTER_LIMITS.idea}
                        error={errors.idea}
                        placeholder={t.placeholderIdea}
                        rows={5}
                        actionButton={autoFillButton}
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                      <button onClick={() => setIsTemplatesOpen(true)} className="flex-1 w-full bg-slate-800/60 hover:bg-slate-700/80 text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors border border-slate-700">{t.templatesButton}</button>
                      <SelectInput label={t.language} name="language" options={languageOptions} value={promptState.language} onChange={handleInputChange} />
                  </div>
              </div>
            </section>
            
            <section aria-labelledby="prompt-builder-section">
              <h2 id="prompt-builder-section" className="sr-only">Prompt Builder Details</h2>
              <div className="bg-slate-900/60 backdrop-blur-lg rounded-2xl border border-slate-700 shadow-2xl shadow-black/30 p-4 sm:p-6">
                <Tabs tabs={tabs} />
              </div>
            </section>

            <div className="flex justify-center">
              <Button onClick={handleGeneratePrompt} isLoading={isLoading} disabled={isLoading || !!errors.idea || !promptState.idea}>
                {t.generateButton}
              </Button>
            </div>
            
            {generatedPrompt ? (
              <section aria-labelledby="output-section">
                <h2 id="output-section" className="sr-only">Generated Prompt</h2>
                <PromptOutput
                  prompt={generatedPrompt.prompt}
                  onSave={handleSavePrompt}
                  copiedText={t.copied}
                  editText={t.editButton}
                  saveText={t.saveButton}
                  cancelText={t.cancelButton}
                  onSaveToHistory={saveToHistory}
                  saveToHistoryText={t.saveToHistoryButton}
                  onGenerateArt={handleGenerateArt}
                  isGeneratingArt={isGeneratingArt}
                  generateArtText={t.generateArtButton}
                  loadingArtText={t.loadingArtButton}
                  onGenerateVideo={handleGenerateVideo}
                  isGeneratingVideo={isGeneratingVideo}
                  generateVideoText={t.generateVideoButton}
                  loadingVideoText={t.loadingVideoButton}
                  onGenerateStoryboard={() => {}} // Placeholder
                  isGeneratingStoryboard={false} // Placeholder
                  generateStoryboardText={t.generateStoryboardButton}
                  loadingStoryboardText={t.loadingStoryboardButton}
                  onGenerateVariations={handleGenerateVariations}
                  isGeneratingVariations={isGeneratingVariations}
                  generateVariationsText={t.generateVariationsButton}
                  loadingVariationsText={t.loadingVariationsButton}
                  onShare={handleShare}
                  shareText={t.shareButton}
                  onDownload={handleDownloadPrompt}
                />
              </section>
            ) : !isLoading && (
              <PromptBuilderSummary promptState={promptState} uiStrings={t.summary} />
            )}
        </div>
      </main>
      
      {/* Modals and Overlays */}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        ))}
      </div>
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
          templates={getPromptTemplates(promptState.language)}
          onSelect={handleUseTemplate}
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
        />
      )}
       {isImageStudioOpen && (
        <ImageStudio
          onClose={() => setIsImageStudioOpen(false)}
          aspectRatioOptions={aspectRatioOptions}
          uiStrings={t.imageStudio}
          addToast={addToast}
        />
      )}
    </div>
  );
}

export default App;