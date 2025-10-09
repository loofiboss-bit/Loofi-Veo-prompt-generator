

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  getArtStyles, getCameraMovements, getCameraDistances, getLensTypes, getVisualEffects,
  getColorPalettes, getAspectRatios, getAnimationPresets, getVoiceStyles, getTimeOfDayOptions,
  getWeatherOptions, getMotionIntensityOptions, getCreativityLevelOptions, getCharacterGenders,
  getCharacterEthnicities, getCharacterClothings, getAmbientSounds, getSoundEffectsIntensity, getModelOptions, getLanguageOptions, getStaticInspirationPrompts
} from './constants';
import { PromptState, HistoryEntry, PromptTemplate, ExamplePrompt, ToastMessage, GroundingChunk } from './types';
import { generateVeoPrompt, generateConceptArt, generateVeoVideo, generateStoryboard, generateExamplePrompts, generateTrendingPrompts, analyzeYouTubeVideo, generateTextToSpeech, editConceptArt } from './services/geminiService';
import { getPromptTemplates } from './templates';
import { useBroadcastState } from './hooks/useBroadcastState';
import { appUIStrings } from './translations';

import Header from './components/Header';
import SelectInput from './components/SelectInput';
import TextAreaInput from './components/TextAreaInput';
import Button from './components/Button';
import PromptOutput from './components/PromptOutput';
import Tabs from './components/Tabs';
import CollapsibleSection from './components/CollapsibleSection';
import HistoryPanel from './components/HistoryPanel';
import TemplatesPanel from './components/TemplatesPanel';
import ExamplesCarousel from './components/ExamplesCarousel';
import VideoGenerationProgress from './components/VideoGenerationProgress';
import Toast from './components/Toast';
import Icon from './components/Icon';

const initialPromptState: PromptState = {
  idea: '',
  environment: '',
  characterActions: '',
  characterGender: 'Any',
  characterEthnicity: 'Any',
  characterClothing: 'Any',
  timeOfDay: 'Any',
  weather: 'Any',
  voiceOver: '',
  voiceStyle: 'None',
  ambientSound: 'None',
  soundEffectsIntensity: 'None',
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
  language: 'en',
  model: 'gemini-2.5-flash',
};

const App: React.FC = () => {
  const [promptState, setPromptState, isSyncConnected] = useBroadcastState<PromptState>(initialPromptState);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [generatedArt, setGeneratedArt] = useState<string | null>(null);
  
  const [isEditingArt, setIsEditingArt] = useState(false);
  const [artEditPrompt, setArtEditPrompt] = useState('');

  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);

  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboard, setStoryboard] = useState<string[]>([]);
  
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  const [isTemplatesVisible, setIsTemplatesVisible] = useState(false);
  
  const [examplePrompts, setExamplePrompts] = useState<ExamplePrompt[]>([]);
  const [trendingPrompts, setTrendingPrompts] = useState<ExamplePrompt[]>([]);
  const [isFetchingExamples, setIsFetchingExamples] = useState(false);
  const [showExamples, setShowExamples] = useState<'inspiration' | 'trending' | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);
  
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [youtubeUrlError, setYoutubeUrlError] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [activeVisualTab, setActiveVisualTab] = useState<'art' | 'storyboard' | 'video'>('video');

  const { language, model } = promptState;
  const t = useMemo(() => appUIStrings[language], [language]);

  // Memoize options to prevent re-calculating on every render
  const modelOptions = useMemo(() => getModelOptions(language), [language]);
  const languageOptions = useMemo(() => getLanguageOptions(), []);
  const artStyles = useMemo(() => getArtStyles(language), [language]);
  const cameraMovements = useMemo(() => getCameraMovements(language), [language]);
  const cameraDistances = useMemo(() => getCameraDistances(language), [language]);
  const lensTypes = useMemo(() => getLensTypes(language), [language]);
  const visualEffects = useMemo(() => getVisualEffects(language), [language]);
  const colorPalettes = useMemo(() => getColorPalettes(language), [language]);
  const aspectRatios = useMemo(() => getAspectRatios(language), [language]);
  const animationPresets = useMemo(() => getAnimationPresets(language), [language]);
  const voiceStyles = useMemo(() => getVoiceStyles(language), [language]);
  const timeOfDayOptions = useMemo(() => getTimeOfDayOptions(language), [language]);
  const weatherOptions = useMemo(() => getWeatherOptions(language), [language]);
  const motionIntensityOptions = useMemo(() => getMotionIntensityOptions(language), [language]);
  const creativityLevelOptions = useMemo(() => getCreativityLevelOptions(language), [language]);
  const characterGenders = useMemo(() => getCharacterGenders(language), [language]);
  const characterEthnicities = useMemo(() => getCharacterEthnicities(language), [language]);
  const characterClothings = useMemo(() => getCharacterClothings(language), [language]);
  const ambientSounds = useMemo(() => getAmbientSounds(language), [language]);
  const soundEffectsIntensityOptions = useMemo(() => getSoundEffectsIntensity(language), [language]);
  const templates = useMemo(() => getPromptTemplates(language), [language]);

  const addToast = useCallback((messageOrKey: string, type: ToastMessage['type'] = 'info', replacements?: Record<string, string>) => {
    const id = `toast-${toastIdRef.current++}`;
    // Fix: Broaden type to handle both translation keys and raw strings, resolving type errors.
    let message = (t as Record<string, string>)[messageOrKey] || messageOrKey;
    if (replacements) {
        Object.keys(replacements).forEach(key => {
            message = message.replace(`{${key}}`, replacements[key]);
        });
    }
    setToasts(prev => [...prev, { id, message, type }]);
  }, [t]);
  
  // Load from URL or localStorage on initial mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const promptData = urlParams.get('prompt');
    if (promptData) {
      try {
        const decodedState = decodeURIComponent(escape(atob(promptData)));
        const parsedState = JSON.parse(decodedState) as PromptState;
        if (parsedState && typeof parsedState.idea !== 'undefined') {
          setPromptState(parsedState, 'replace');
          addToast('promptLoadedFromLink', 'info');
        } else {
          throw new Error("Invalid state object from URL");
        }
      } catch (e) {
        console.error("Failed to parse shared prompt state", e);
        addToast('promptLoadError', 'error');
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else {
        try {
          const storedHistory = localStorage.getItem('veoPromptHistory');
          if (storedHistory) {
            setHistory(JSON.parse(storedHistory));
          }
        } catch (e) {
          console.error("Failed to load history from localStorage:", e);
        }
    }
  }, [setPromptState, addToast]);

  // YouTube URL Validation
  useEffect(() => {
    if (promptState.youtubeUrl) {
        try {
            // Use the URL constructor to validate. It will throw an error for invalid URLs.
            new URL(promptState.youtubeUrl);
            setYoutubeUrlError(null);
        } catch (_) {
            setYoutubeUrlError(t.invalidUrlError);
        }
    } else {
        setYoutubeUrlError(null); // Clear error if input is empty
    }
  }, [promptState.youtubeUrl, t]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checkedValue = (e.target as HTMLInputElement).checked;
    
    setPromptState({ [name]: isCheckbox ? checkedValue : value });
  }, [setPromptState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedPrompt('');
    setGroundingChunks([]);

    // Clear previous generation results
    setGeneratedArt(null);
    setGeneratedVideo(null);
    setStoryboard([]);
    setVideoStatus('');
    setGeneratedAudioUrl(null);

    try {
      const result = await generateVeoPrompt(promptState);
      setGeneratedPrompt(result.prompt);
      if(result.groundingChunks) {
        setGroundingChunks(result.groundingChunks);
      }
      
      const newHistoryEntry: HistoryEntry = {
        id: `hist-${Date.now()}`,
        timestamp: Date.now(),
        params: promptState,
        prompt: result.prompt,
        groundingChunks: result.groundingChunks,
      };

      setHistory(prev => {
          const newHistory = [newHistoryEntry, ...prev].slice(0, 50); // Keep max 50 entries
          localStorage.setItem('veoPromptHistory', JSON.stringify(newHistory));
          return newHistory;
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : t.unknownError;
      setError(message);
      // Fix: Removed incorrect type assertion. `addToast` now handles raw strings.
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateArt = async (prompt: string) => {
      setIsGeneratingArt(true);
      setActiveVisualTab('art');
      setGeneratedArt(null);
      setError(null);
      try {
          const imageBytes = await generateConceptArt(prompt);
          setGeneratedArt(`data:image/png;base64,${imageBytes}`);
      } catch(err) {
        const message = err instanceof Error ? err.message : t.artError;
        setError(message);
        // Fix: Removed incorrect type assertion. `addToast` now handles raw strings.
        addToast(message, 'error');
      } finally {
          setIsGeneratingArt(false);
      }
  };

  const handleGenerateVideo = async (prompt: string) => {
    setIsGeneratingVideo(true);
    setActiveVisualTab('video');
    setGeneratedVideo(null);
    setError(null);
    setVideoStatus('');
    try {
      const videoDataUrl = await generateVeoVideo(prompt, {
        motionIntensity: promptState.motionIntensity,
        creativityLevel: promptState.creativityLevel,
      }, setVideoStatus, language);
      setGeneratedVideo(videoDataUrl);
    } catch(err) {
      const errorMessage = err instanceof Error ? err.message : t.videoError;
      setError(errorMessage);
      // Fix: Removed incorrect type assertion. `addToast` now handles raw strings.
      addToast(errorMessage, 'error');
    } finally {
      setIsGeneratingVideo(false);
      setVideoStatus('');
    }
  };

  const handleGenerateStoryboard = async (prompt: string) => {
    setIsGeneratingStoryboard(true);
    setActiveVisualTab('storyboard');
    setStoryboard([]);
    setError(null);
    try {
      const images = await generateStoryboard(prompt, language, model);
      setStoryboard(images);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.storyboardError;
      setError(message);
      // Fix: Removed incorrect type assertion. `addToast` now handles raw strings.
      addToast(message, 'error');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };
  
  const handleAnalyzeYoutubeUrl = useCallback(async () => {
    if (!promptState.youtubeUrl || youtubeUrlError) return;
    setIsAnalyzingUrl(true);
    setError(null);
    try {
        const analysis = await analyzeYouTubeVideo(promptState.youtubeUrl, language, model);
        setPromptState({ idea: analysis });
        addToast('youtubeAnalyzed', 'success');
    } catch (err) {
        const message = err instanceof Error ? err.message : t.youtubeAnalyzeError;
        setError(message);
        // Fix: Removed incorrect type assertion. `addToast` now handles raw strings.
        addToast(message, 'error');
    } finally {
        setIsAnalyzingUrl(false);
    }
  }, [promptState.youtubeUrl, language, model, setPromptState, addToast, t, youtubeUrlError]);

  const handleGenerateAudio = useCallback(async () => {
    if (!promptState.voiceOver) return;
    setIsGeneratingAudio(true);
    setGeneratedAudioUrl(null);
    try {
        const audioDataUrl = await generateTextToSpeech(promptState.voiceOver, promptState.voiceStyle);
        setGeneratedAudioUrl(audioDataUrl);
    } catch (err) {
        const message = err instanceof Error ? err.message : t.audioError;
        // Fix: Removed incorrect type assertion. `addToast` now handles raw strings.
        addToast(message, 'error');
    } finally {
        setIsGeneratingAudio(false);
    }
  }, [promptState.voiceOver, promptState.voiceStyle, addToast, t]);
  
  const handleEditArt = useCallback(async () => {
    if (!generatedArt || !artEditPrompt) return;
    setIsEditingArt(true);
    setError(null);
    try {
        const result = await editConceptArt(generatedArt, artEditPrompt);
        setGeneratedArt(`data:${result.newMimeType};base64,${result.newImageBytes}`);
        setArtEditPrompt('');
        addToast('artRefined', 'success');
    } catch (err) {
        const message = err instanceof Error ? err.message : t.artRefineError;
        setError(message);
        // Fix: Removed incorrect type assertion. `addToast` now handles raw strings.
        addToast(message, 'error');
    } finally {
        setIsEditingArt(false);
    }
  }, [generatedArt, artEditPrompt, addToast, t]);
  
  const handleShare = useCallback(() => {
    try {
        const stateString = JSON.stringify(promptState);
        const encodedState = btoa(unescape(encodeURIComponent(stateString)));
        const url = `${window.location.origin}${window.location.pathname}?prompt=${encodedState}`;
        navigator.clipboard.writeText(url);
        addToast('shareLinkCopied', 'success');
    } catch (e) {
        console.error("Failed to create share link", e);
        addToast('shareLinkError', 'error');
    }
  }, [promptState, addToast]);

  const handleUseHistoryEntry = (entry: HistoryEntry) => {
    setPromptState(entry.params, 'replace');
    setGeneratedPrompt(entry.prompt);
    setGroundingChunks(entry.groundingChunks || []);
    setIsHistoryVisible(false);
    addToast("historyLoaded", 'info');
  };

  const handleDeleteHistoryEntry = (id: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(entry => entry.id !== id);
      localStorage.setItem('veoPromptHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('veoPromptHistory');
  };

  const handleUseTemplate = (template: PromptTemplate) => {
      // Keep language and model, but reset everything else to default before applying template
      setPromptState({ 
        ...initialPromptState, 
        language: promptState.language,
        model: promptState.model,
        ...template.params 
      }, 'replace');
      setIsTemplatesVisible(false);
      addToast('templateApplied', 'info', { templateName: template.name });
  };
  
  const handleFetchAndShowExamples = async (type: 'inspiration' | 'trending') => {
      setShowExamples(type);
      if((type === 'inspiration' && examplePrompts.length > 0) || (type === 'trending' && trendingPrompts.length > 0)) {
          return; 
      }
      setIsFetchingExamples(true);
      setError(null);
      try {
           const [dynamicExamples, trending] = await Promise.all([
               generateExamplePrompts(artStyles, cameraMovements, cameraDistances, lensTypes, visualEffects, colorPalettes, aspectRatios, animationPresets, voiceStyles, timeOfDayOptions, weatherOptions, characterGenders, characterEthnicities, characterClothings, ambientSounds, soundEffectsIntensityOptions, motionIntensityOptions, creativityLevelOptions, language, model),
               generateTrendingPrompts(artStyles, cameraMovements, cameraDistances, lensTypes, visualEffects, colorPalettes, aspectRatios, animationPresets, voiceStyles, timeOfDayOptions, weatherOptions, characterGenders, characterEthnicities, characterClothings, ambientSounds, soundEffectsIntensityOptions, motionIntensityOptions, creativityLevelOptions, language, model)
          ]);
          
          const staticExamples = getStaticInspirationPrompts(language);
          // Prepend static examples so they appear first
          const combinedExamples = [...staticExamples, ...dynamicExamples]; 
          // Deduplicate by title, preferring the static ones
          const uniqueExamples = Array.from(new Map(combinedExamples.map(item => [item.title, item])).values());
          
          setExamplePrompts(uniqueExamples);
          setTrendingPrompts(trending);
      } catch (err) {
        const message = err instanceof Error ? err.message : t.examplesFetchError;
        setError(message);
        // Fix: Removed incorrect type assertion. `addToast` now handles raw strings.
        addToast(message, 'error');
        setShowExamples(null);
      } finally {
          setIsFetchingExamples(false);
      }
  };

  const handleUseExample = (example: ExamplePrompt) => {
      const { title, idea, prompt, params } = example;
      // Keep language and model, reset everything else
      setPromptState({
          ...initialPromptState,
          language: promptState.language,
          model: promptState.model,
          ...params,
          idea,
      }, 'replace');
      setGeneratedPrompt(prompt);
      setShowExamples(null);
      addToast('exampleLoaded', 'info', { title });
  };
  
  const VisualTabButton: React.FC<{tabName: typeof activeVisualTab, label: string}> = ({tabName, label}) => (
      <button
        onClick={() => setActiveVisualTab(tabName)}
        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${activeVisualTab === tabName ? 'bg-slate-900/50 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
      >
        {label}
      </button>
  );

  const tabs = useMemo(() => [
    { label: t.sceneTab, content: <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TextAreaInput label="Environment" name="environment" value={promptState.environment} onChange={handleInputChange} placeholder="e.g., A neon-lit cyberpunk city, a serene forest..." onBlur={() => {}}/>
        <SelectInput label="Time of Day" name="timeOfDay" value={promptState.timeOfDay} onChange={handleInputChange} options={timeOfDayOptions} />
        <SelectInput label="Weather" name="weather" value={promptState.weather} onChange={handleInputChange} options={weatherOptions} />
    </div> },
    { label: t.characterTab, content: <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TextAreaInput label="Character & Actions" name="characterActions" value={promptState.characterActions} onChange={handleInputChange} placeholder="e.g., A stoic detective looking over the city, a child laughing..." onBlur={() => {}} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <SelectInput label="Gender" name="characterGender" value={promptState.characterGender} onChange={handleInputChange} options={characterGenders} />
            <SelectInput label="Ethnicity" name="characterEthnicity" value={promptState.characterEthnicity} onChange={handleInputChange} options={characterEthnicities} />
            <SelectInput label="Clothing" name="characterClothing" value={promptState.characterClothing} onChange={handleInputChange} options={characterClothings} />
        </div>
    </div> },
    { label: t.styleTab, content: <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SelectInput label="Art Style" name="artStyle" value={promptState.artStyle} onChange={handleInputChange} options={artStyles} />
        {promptState.artStyle === 'Custom' && (
            <TextAreaInput label="Custom Art Style" name="customArtStyle" value={promptState.customArtStyle} onChange={handleInputChange} placeholder="Describe your custom style in detail..." onBlur={() => {}} />
        )}
        <SelectInput label="Color Palette" name="colorPalette" value={promptState.colorPalette} onChange={handleInputChange} options={colorPalettes} />
        <SelectInput label="Visual Effect" name="visualEffect" value={promptState.visualEffect} onChange={handleInputChange} options={visualEffects} />
    </div> },
    { label: t.cameraTab, content: <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SelectInput label="Camera Movement" name="cameraMovement" value={promptState.cameraMovement} onChange={handleInputChange} options={cameraMovements} />
        <SelectInput label="Camera Distance" name="cameraDistance" value={promptState.cameraDistance} onChange={handleInputChange} options={cameraDistances} />
        <SelectInput label="Lens Type" name="lensType" value={promptState.lensType} onChange={handleInputChange} options={lensTypes} />
    </div> },
    { label: t.animationTab, content: <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SelectInput label="Animation Preset" name="animationPreset" value={promptState.animationPreset} onChange={handleInputChange} options={animationPresets} />
        <SelectInput label="Motion Intensity" name="motionIntensity" value={promptState.motionIntensity} onChange={handleInputChange} options={motionIntensityOptions} />
    </div> },
    { label: t.audioTab, content: <div className="space-y-8">
        <div className="space-y-4">
            <h3 className="text-md font-semibold text-slate-300 border-b border-slate-700 pb-2">{t.voiceTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectInput label="Voice Style" name="voiceStyle" value={promptState.voiceStyle} onChange={handleInputChange} options={voiceStyles} />
            </div>
            {promptState.voiceStyle !== 'None' && (
                <div className='space-y-4'>
                  <TextAreaInput label="Voice-over Script" name="voiceOver" value={promptState.voiceOver} onChange={handleInputChange} placeholder="The script for the narrator or character..." onBlur={() => {}} />
                  <div className='flex flex-col sm:flex-row items-center gap-4'>
                    <button
                        type="button"
                        onClick={handleGenerateAudio}
                        disabled={isGeneratingAudio || !promptState.voiceOver.trim()}
                        className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                        {isGeneratingAudio ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name="audio" className="w-4 h-4" />}
                        <span>{isGeneratingAudio ? t.loadingAudio : t.generateAudioPreview}</span>
                    </button>
                    {generatedAudioUrl && <audio controls src={generatedAudioUrl} className="w-full sm:w-auto" />}
                  </div>
                </div>
            )}
        </div>
        <div className="space-y-4">
            <h3 className="text-md font-semibold text-slate-300 border-b border-slate-700 pb-2">{t.soundscapeTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectInput label="Ambient Sound" name="ambientSound" value={promptState.ambientSound} onChange={handleInputChange} options={ambientSounds} />
                <SelectInput label="Sound Effects Intensity" name="soundEffectsIntensity" value={promptState.soundEffectsIntensity} onChange={handleInputChange} options={soundEffectsIntensityOptions} />
            </div>
        </div>
    </div> },
    { label: t.advancedTab, content: <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextAreaInput label="Negative Prompt" name="negativePrompt" value={promptState.negativePrompt} onChange={handleInputChange} placeholder="e.g., blurry, watermark, text, ugly..." onBlur={() => {}} />
        <SelectInput label="Creativity Level" name="creativityLevel" value={promptState.creativityLevel} onChange={handleInputChange} options={creativityLevelOptions} />
        <div className="space-y-4">
             <div className="flex items-center">
                <input id="optimizeFor8Seconds" name="optimizeFor8Seconds" type="checkbox" checked={promptState.optimizeFor8Seconds} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500" />
                <label htmlFor="optimizeFor8Seconds" className="ml-3 text-sm text-slate-300">Optimize for 8 seconds</label>
            </div>
             <div className="flex items-center">
                <input id="includeOverlayText" name="includeOverlayText" type="checkbox" checked={promptState.includeOverlayText} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500" />
                <label htmlFor="includeOverlayText" className="ml-3 text-sm text-slate-300">Include Overlay Text</label>
            </div>
             <div className="flex items-center">
                <input id="useGoogleSearch" name="useGoogleSearch" type="checkbox" checked={promptState.useGoogleSearch} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500" />
                <label htmlFor="useGoogleSearch" className="ml-3 text-sm text-slate-300">Use Google Search for grounding</label>
            </div>
             <div className="flex items-center">
                <input id="generateAsSeries" name="generateAsSeries" type="checkbox" checked={promptState.generateAsSeries} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500" />
                <label htmlFor="generateAsSeries" className="ml-3 text-sm text-slate-300">Generate as a 3-part series</label>
            </div>
        </div>
        <SelectInput label="Language" name="language" value={promptState.language} onChange={handleInputChange} options={languageOptions} />
    </div> },
  ], [t, promptState, handleInputChange, handleGenerateAudio, isGeneratingAudio, generatedAudioUrl, artStyles, cameraMovements, cameraDistances, lensTypes, visualEffects, colorPalettes, aspectRatios, animationPresets, voiceStyles, timeOfDayOptions, weatherOptions, motionIntensityOptions, creativityLevelOptions, characterGenders, characterEthnicities, characterClothings, ambientSounds, soundEffectsIntensityOptions, languageOptions]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased bg-grid">
      <div className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-slate-950 to-transparent z-0"></div>
      <div className="container mx-auto px-4 py-8 sm:py-12 relative z-10">
        
        <Header title={t.headerTitle} subtitle={t.headerSubtitle} onShowHistory={() => setIsHistoryVisible(true)} historyButtonText={t.historyButton} isSyncConnected={isSyncConnected} />
        
        <main className="mt-10">
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="p-4 bg-slate-900/40 rounded-lg border border-slate-800/50">
                    <label htmlFor="youtubeUrl" className="block text-sm font-medium text-slate-300 mb-2">
                      {t.youtubeLabel}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            id="youtubeUrl"
                            name="youtubeUrl"
                            type="url"
                            value={promptState.youtubeUrl}
                            onChange={handleInputChange}
                            placeholder={t.youtubePlaceholder}
                            className={`flex-grow bg-slate-900/50 backdrop-blur-sm border rounded-lg shadow-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 p-2 transition-colors ${
                                youtubeUrlError
                                ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                                : 'border-slate-700/60 focus:border-cyan-500 focus:ring-cyan-500'
                            }`}
                            aria-invalid={!!youtubeUrlError}
                            aria-describedby="youtube-url-error"
                        />
                        <button
                            type="button"
                            onClick={handleAnalyzeYoutubeUrl}
                            disabled={isAnalyzingUrl || !promptState.youtubeUrl || !!youtubeUrlError}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                        >
                            {isAnalyzingUrl ? <Icon name="spinner" className="w-4 h-4 animate-spin"/> : <Icon name="lightbulb" className="w-4 h-4" />}
                            <span>{isAnalyzingUrl ? t.loadingAnalysis : t.analyze}</span>
                        </button>
                    </div>
                    {youtubeUrlError && (
                        <p id="youtube-url-error" className="mt-2 text-sm text-red-400" role="alert">
                            {youtubeUrlError}
                        </p>
                    )}
                </div>

                <TextAreaInput 
                    label={t.coreIdeaLabel}
                    name="idea"
                    value={promptState.idea}
                    onChange={handleInputChange}
                    placeholder={t.coreIdeaPlaceholder}
                    onBlur={() => {}}
                    maxLength={300}
                />
                
                <CollapsibleSection title={t.promptModifiers} defaultOpen={true}>
                    <Tabs tabs={tabs} />
                </CollapsibleSection>

                <div className="flex flex-col sm:flex-row gap-4 items-center pt-4">
                    <Button type="submit" isLoading={isLoading} disabled={!promptState.idea.trim()}>
                        {isLoading ? t.loadingPrompt : t.generatePrompt}
                    </Button>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setIsTemplatesVisible(true)} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-slate-800 text-slate-300 hover:bg-slate-700">
                          {t.useTemplate}
                      </button>
                      <button type="button" onClick={() => handleFetchAndShowExamples('inspiration')} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-slate-800 text-slate-300 hover:bg-slate-700">
                          {t.getInspiration}
                      </button>
                       <button type="button" onClick={() => handleFetchAndShowExamples('trending')} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-slate-800 text-slate-300 hover:bg-slate-700">
                          {t.getTrending}
                      </button>
                    </div>
                </div>
            </form>

            {isFetchingExamples && <div className="mt-4 text-center text-slate-400">{showExamples === 'trending' ? t.loadingTrending : t.loadingExamples}</div>}
            
            {showExamples && (
                <div className="mt-8">
                    <ExamplesCarousel
                        examples={showExamples === 'inspiration' ? examplePrompts : trendingPrompts}
                        onUseExample={handleUseExample}
                        useExampleText={t.useThisExample}
                        onClose={() => setShowExamples(null)}
                        title={showExamples === 'inspiration' ? t.inspirationalPrompts : t.trendingPrompts}
                    />
                </div>
            )}

            {error && <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg">{error}</div>}
            
            {generatedPrompt && (
                <div className="mt-10 animate-fade-in-up">
                    <h2 className="text-2xl font-bold text-slate-100 mb-4">{t.generatedPromptTitle}</h2>
                    <PromptOutput 
                        prompt={generatedPrompt} 
                        onSave={setGeneratedPrompt}
                        copiedText={t.copied}
                        editText={t.edit}
                        saveText={t.save}
                        cancelText={t.cancel}
                        onGenerateArt={handleGenerateArt}
                        isGeneratingArt={isGeneratingArt}
                        generateArtText={t.generateArt}
                        loadingArtText={t.loadingArt}
                        onGenerateVideo={handleGenerateVideo}
                        isGeneratingVideo={isGeneratingVideo}
                        generateVideoText={t.generateVideo}
                        loadingVideoText={t.loadingVideo}
                        onGenerateStoryboard={handleGenerateStoryboard}
                        isGeneratingStoryboard={isGeneratingStoryboard}
                        generateStoryboardText={t.generateStoryboard}
                        loadingStoryboardText={t.loadingStoryboard}
                        onShare={handleShare}
                        shareText={t.share}
                    />
                </div>
            )}

            {(generatedArt || storyboard.length > 0 || isGeneratingVideo || generatedVideo) && (
              <div className="mt-8 animate-fade-in-up">
                <h3 className="text-xl font-bold text-slate-200 mb-3 text-center">{t.creativeOutputTitle}</h3>
                <div className="flex justify-center border-b border-slate-800 mb-4">
                    <VisualTabButton tabName="art" label={t.conceptArtTab} />
                    <VisualTabButton tabName="storyboard" label={t.storyboardTab} />
                    <VisualTabButton tabName="video" label={t.videoTab} />
                </div>
                <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4 min-h-[250px] flex items-center justify-center">
                    {activeVisualTab === 'art' && (
                        <div className="w-full text-center">
                            {isGeneratingArt ? <div className='flex items-center justify-center gap-2 text-slate-400'><Icon name="spinner" className="w-5 h-5 animate-spin" /> {t.generatingArt}</div> : 
                             generatedArt ? (
                                <div className='flex flex-col items-center gap-4'>
                                    <img src={generatedArt} alt="Generated concept art" className="max-w-full md:max-w-lg rounded-lg shadow-lg" />
                                    <div className='w-full max-w-lg'>
                                        <label htmlFor="artEditPrompt" className='text-sm text-slate-300 mb-2 block'>{t.refineArtLabel}</label>
                                        <div className='flex gap-2'>
                                            <input
                                                id="artEditPrompt"
                                                type="text"
                                                value={artEditPrompt}
                                                onChange={(e) => setArtEditPrompt(e.target.value)}
                                                placeholder={t.refineArtPlaceholder}
                                                className="flex-grow bg-slate-800/70 border border-slate-700 rounded-lg p-2 text-slate-200 placeholder-slate-500 focus:ring-cyan-500"
                                            />
                                            <button onClick={handleEditArt} disabled={isEditingArt || !artEditPrompt} className="px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50">
                                                {isEditingArt ? t.loadingEdit : t.refine}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                             ) : <p className="text-slate-500">{t.artPlaceholder}</p>
                            }
                        </div>
                    )}
                    {activeVisualTab === 'storyboard' && (
                        <div className="w-full text-center">
                           {isGeneratingStoryboard ? <div className='flex items-center justify-center gap-2 text-slate-400'><Icon name="spinner" className="w-5 h-5 animate-spin" /> {t.generatingStoryboard}</div> :
                            storyboard.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {storyboard.map((imgSrc, index) => (
                                        <img key={index} src={imgSrc} alt={`Storyboard frame ${index + 1}`} className="w-full rounded-lg shadow-md" />
                                    ))}
                                </div>
                            ) : <p className="text-slate-500">{t.storyboardPlaceholder}</p>
                           }
                        </div>
                    )}
                    {activeVisualTab === 'video' && (
                        <div className="w-full">
                          {isGeneratingVideo ? (
                            <VideoGenerationProgress currentStatus={videoStatus} language={language} />
                          ) : generatedVideo ? (
                            <div className="w-full max-w-md mx-auto">
                              <video controls src={generatedVideo} className="w-full rounded-lg shadow-lg" />
                              <a 
                                href={generatedVideo} 
                                download={`veo-video-${Date.now()}.mp4`}
                                className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 transition-all duration-300 ease-in-out transform hover:scale-105"
                              >
                                <Icon name="download" className="w-4 h-4" />
                                <span>{t.downloadVideo}</span>
                              </a>
                            </div>
                          ) : <p className="text-slate-500 text-center">{t.videoPlaceholder}</p>}
                        </div>
                    )}
                </div>
              </div>
            )}
        </main>
        
        {isHistoryVisible && (
            <HistoryPanel 
                history={history}
                onSelect={handleUseHistoryEntry}
                onClear={handleClearHistory}
                onDelete={handleDeleteHistoryEntry}
                onClose={() => setIsHistoryVisible(false)}
                uiStrings={{ title: t.historyTitle, clear: t.clearHistory, clearConfirm: t.clearHistoryConfirm, empty: t.emptyHistory, use: t.useHistory, delete: t.deleteHistory, deleteConfirm: t.deleteHistoryConfirm }}
                language={language}
            />
        )}
        
        {isTemplatesVisible && (
            <TemplatesPanel templates={templates} onSelect={handleUseTemplate} onClose={() => setIsTemplatesVisible(false)} uiStrings={{ title: t.templatesTitle, use: t.useTemplateButton }} />
        )}
      </div>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-3">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={() => setToasts(t => t.filter(t => t.id !== toast.id))} />
        ))}
      </div>
    </div>
  );
};

export default App;
