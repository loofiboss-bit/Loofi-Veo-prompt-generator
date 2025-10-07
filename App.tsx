import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Header from './components/Header';
import TextAreaInput from './components/TextAreaInput';
import SelectInput from './components/SelectInput';
import Button from './components/Button';
import PromptOutput from './components/PromptOutput';
import Icon from './components/Icon';
import ExamplesCarousel from './components/ExamplesCarousel';
import Tooltip from './components/Tooltip';
import HistoryPanel from './components/HistoryPanel';
import TemplatesPanel from './components/TemplatesPanel';
import Tabs from './components/Tabs';
import CollapsibleSection from './components/CollapsibleSection';
import { getArtStyles, getCameraMovements, getCameraDistances, getLensTypes, getVisualEffects, getColorPalettes, getAspectRatios, getAnimationPresets, getVoiceStyles, getTimeOfDayOptions, getWeatherOptions, getMotionIntensityOptions, getCreativityLevelOptions, getCharacterGenders, getCharacterEthnicities, getCharacterClothings, getAmbientSounds, getSoundEffectsIntensity } from './constants';
import { getPromptTemplates } from './templates';
import { generateVeoPrompt, generateConceptArt, editConceptArt, generateExamplePrompts, generateTextToSpeech, generateIdeaSuggestions, generateVeoVideo, generateTrendingPrompts, analyzeYouTubeVideo, generateStoryboard } from './services/geminiService';
import { uiStrings } from './translations';
import { PromptGenerationParams, ExamplePrompt, GroundingChunk, HistoryEntry, PromptTemplate } from './types';

type Language = 'en' | 'sv';

const IDEA_MIN_LENGTH = 10;
const IDEA_MAX_LENGTH = 500;
const TEXT_MAX_LENGTH = 1000;
const EDIT_ART_MAX_LENGTH = 500;


const getErrorMessage = (error: unknown, language: 'en' | 'sv'): string => {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('api key not valid')) {
            return uiStrings.errorApiKey[language];
        }
        if (message.includes('429') || message.includes('resource has been exhausted') || message.includes('rate limit')) {
            return uiStrings.errorRateLimit[language];
        }
        if (message.includes('safety')) {
             return uiStrings.errorSafety[language];
        }
        if (message.includes('network') || message.includes('failed to fetch')) {
             return uiStrings.errorNetwork[language];
        }
    }
    return uiStrings.errorGeneric[language];
};


const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const ideaInputRef = useRef<HTMLTextAreaElement>(null);

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

  const [idea, setIdea] = useState<string>('');
  const [environment, setEnvironment] = useState<string>('');
  const [characterActions, setCharacterActions] = useState<string>('');
  const [characterGender, setCharacterGender] = useState<string>(characterGenders[0].value);
  const [characterEthnicity, setCharacterEthnicity] = useState<string>(characterEthnicities[0].value);
  const [characterClothing, setCharacterClothing] = useState<string>(characterClothings[0].value);
  const [timeOfDay, setTimeOfDay] = useState<string>(timeOfDayOptions[0].value);
  const [weather, setWeather] = useState<string>(weatherOptions[0].value);
  const [voiceOver, setVoiceOver] = useState<string>('');
  const [voiceStyle, setVoiceStyle] = useState<string>(voiceStyles[0].value);
  const [ambientSound, setAmbientSound] = useState<string>(ambientSounds[0].value);
  const [soundEffectsIntensity, setSoundEffectsIntensity] = useState<string>(soundEffectsIntensityOptions[0].value);
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [optimizeFor8Seconds, setOptimizeFor8Seconds] = useState<boolean>(false);
  const [artStyle, setArtStyle] = useState<string>(artStyles[0].value);
  const [customArtStyle, setCustomArtStyle] = useState<string>('');
  const [cameraMovement, setCameraMovement] = useState<string>(cameraMovements[0].value);
  const [cameraDistance, setCameraDistance] = useState<string>(cameraDistances[0].value);
  const [lensType, setLensType] = useState<string>(lensTypes[0].value);
  const [visualEffect, setVisualEffect] = useState<string>(visualEffects[0].value);
  const [colorPalette, setColorPalette] = useState<string>(colorPalettes[0].value);
  const [aspectRatio, setAspectRatio] = useState<string>(aspectRatios[0].value);
  const [animationPreset, setAnimationPreset] = useState<string>(animationPresets[0].value);
  const [motionIntensity, setMotionIntensity] = useState<string>('Medium');
  const [creativityLevel, setCreativityLevel] = useState<string>('Balanced');
  const [includeOverlayText, setIncludeOverlayText] = useState<boolean>(false);
  const [useGoogleSearch, setUseGoogleSearch] = useState<boolean>(false);
  const [generateAsSeries, setGenerateAsSeries] = useState<boolean>(false);
  
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string | null }>({});

  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [conceptArtUrl, setConceptArtUrl] = useState<string | null>(null);
  const [isGeneratingArt, setIsGeneratingArt] = useState<boolean>(false);
  const [artError, setArtError] = useState<string | null>(null);

  const [artEditPrompt, setArtEditPrompt] = useState<string>('');
  const [isEditingArt, setIsEditingArt] = useState<boolean>(false);
  const [editArtError, setEditArtError] = useState<string | null>(null);

  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoGenerationStatus, setVideoGenerationStatus] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [storyboardUrls, setStoryboardUrls] = useState<string[]>([]);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState<boolean>(false);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);

  const [examplePrompts, setExamplePrompts] = useState<ExamplePrompt[]>([]);
  const [isLoadingExamples, setIsLoadingExamples] = useState<boolean>(false);
  const [exampleError, setExampleError] = useState<string | null>(null);

  const [trendingPrompts, setTrendingPrompts] = useState<ExamplePrompt[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState<boolean>(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState<boolean>(false);
  const [isTemplatesVisible, setIsTemplatesVisible] = useState<boolean>(false);
  
  const [ideaSuggestions, setIdeaSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState<boolean>(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState<boolean>(false);
  const [videoAnalysisError, setVideoAnalysisError] = useState<string | null>(null);

  const [shareStatus, setShareStatus] = useState<{ message: string; isError: boolean } | null>(null);

  const resetFormFields = useCallback(() => {
    setIdea('');
    setYoutubeUrl('');
    setVideoAnalysisError(null);
    setEnvironment('');
    setCharacterActions('');
    setCharacterGender(characterGenders[0].value);
    setCharacterEthnicity(characterEthnicities[0].value);
    setCharacterClothing(characterClothings[0].value);
    setTimeOfDay(timeOfDayOptions[0].value);
    setWeather(weatherOptions[0].value);
    setVoiceOver('');
    setVoiceStyle(voiceStyles[0].value);
    setAmbientSound(ambientSounds[0].value);
    setSoundEffectsIntensity(soundEffectsIntensityOptions[0].value);
    setOptimizeFor8Seconds(false);
    setArtStyle(artStyles[0].value);
    setCustomArtStyle('');
    setCameraMovement(cameraMovements[0].value);
    setCameraDistance(cameraDistances[0].value);
    setLensType(lensTypes[0].value);
    setVisualEffect(visualEffects[0].value);
    setColorPalette(colorPalettes[0].value);
    setAspectRatio(aspectRatios[0].value);
    setAnimationPreset(animationPresets[0].value);
    setMotionIntensity('Medium');
    setCreativityLevel('Balanced');
    setNegativePrompt('');
    setIncludeOverlayText(false);
    setUseGoogleSearch(false);
    setGenerateAsSeries(false);
    setGeneratedPrompt('');
    setGroundingChunks([]);
    setConceptArtUrl(null);
    setAudioUrl(null);
    setAudioError(null);
    setVideoUrl(null);
    setVideoGenerationStatus(null);
    setVideoError(null);
    setStoryboardUrls([]);
    setStoryboardError(null);
    setIdeaSuggestions([]);
    setSuggestionError(null);
    setValidationErrors({});
  }, [artStyles, cameraMovements, cameraDistances, lensTypes, visualEffects, colorPalettes, aspectRatios, animationPresets, voiceStyles, timeOfDayOptions, weatherOptions, characterGenders, characterEthnicities, characterClothings, ambientSounds, soundEffectsIntensityOptions]);


  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('veo-prompt-history');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      localStorage.removeItem('veo-prompt-history');
    }
  }, []);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('prompt');

    if (sharedData) {
        try {
            const jsonString = decodeURIComponent(escape(atob(sharedData)));
            const data: Partial<PromptGenerationParams> = JSON.parse(jsonString);

            resetFormFields();

            if (data.idea !== undefined) setIdea(data.idea);
            if (data.environment !== undefined) setEnvironment(data.environment);
            if (data.characterActions !== undefined) setCharacterActions(data.characterActions);
            if (data.characterGender !== undefined) setCharacterGender(data.characterGender);
            if (data.characterEthnicity !== undefined) setCharacterEthnicity(data.characterEthnicity);
            if (data.characterClothing !== undefined) setCharacterClothing(data.characterClothing);
            if (data.timeOfDay !== undefined) setTimeOfDay(data.timeOfDay);
            if (data.weather !== undefined) setWeather(data.weather);
            if (data.voiceOver !== undefined) setVoiceOver(data.voiceOver);
            if (data.voiceStyle !== undefined) setVoiceStyle(data.voiceStyle);
            if (data.ambientSound !== undefined) setAmbientSound(data.ambientSound);
            if (data.soundEffectsIntensity !== undefined) setSoundEffectsIntensity(data.soundEffectsIntensity);
            if (data.negativePrompt !== undefined) setNegativePrompt(data.negativePrompt);
            if (data.optimizeFor8Seconds !== undefined) setOptimizeFor8Seconds(data.optimizeFor8Seconds);
            if (data.artStyle !== undefined) setArtStyle(data.artStyle);
            if (data.customArtStyle !== undefined) setCustomArtStyle(data.customArtStyle);
            if (data.cameraMovement !== undefined) setCameraMovement(data.cameraMovement);
            if (data.cameraDistance !== undefined) setCameraDistance(data.cameraDistance);
            if (data.lensType !== undefined) setLensType(data.lensType);
            if (data.visualEffect !== undefined) setVisualEffect(data.visualEffect);
            if (data.colorPalette !== undefined) setColorPalette(data.colorPalette);
            if (data.aspectRatio !== undefined) setAspectRatio(data.aspectRatio);
            if (data.animationPreset !== undefined) setAnimationPreset(data.animationPreset);
            if (data.motionIntensity !== undefined) setMotionIntensity(data.motionIntensity);
            if (data.creativityLevel !== undefined) setCreativityLevel(data.creativityLevel);
            if (data.includeOverlayText !== undefined) setIncludeOverlayText(data.includeOverlayText);
            if (data.useGoogleSearch !== undefined) setUseGoogleSearch(data.useGoogleSearch);
            if (data.generateAsSeries !== undefined) setGenerateAsSeries(data.generateAsSeries);
            if (data.language !== undefined) setLanguage(data.language);
            
            window.history.replaceState({}, document.title, window.location.pathname);
            ideaInputRef.current?.focus();
        } catch (e) {
            console.error("Failed to parse shared prompt data", e);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
  }, [resetFormFields]);


  useEffect(() => {
    if (!useGoogleSearch) {
      setGenerateAsSeries(false);
    }
  }, [useGoogleSearch]);

  useEffect(() => {
    if (voiceStyle === 'None') {
        setVoiceOver('');
    }
  }, [voiceStyle]);

  const validate = useCallback((name: string, value: string): string | null => {
    switch (name) {
        case 'idea':
            if (!value.trim()) return uiStrings.validationRequired[language];
            if (value.trim().length < IDEA_MIN_LENGTH) return uiStrings.validationMinLength[language].replace('{min}', IDEA_MIN_LENGTH.toString());
            if (value.length > IDEA_MAX_LENGTH) return uiStrings.validationMaxLength[language].replace('{max}', IDEA_MAX_LENGTH.toString());
            break;
        case 'environment':
        case 'characterActions':
        case 'voiceOver':
        case 'customArtStyle':
             if (value.length > TEXT_MAX_LENGTH) return uiStrings.validationMaxLength[language].replace('{max}', TEXT_MAX_LENGTH.toString());
            break;
        case 'negativePrompt': {
            if (value.length > TEXT_MAX_LENGTH) return uiStrings.validationMaxLength[language].replace('{max}', TEXT_MAX_LENGTH.toString());
            
            const words = value.split(/\s+/);
            const longWordThreshold = 25;
            if (words.some(word => word.length > longWordThreshold)) {
                return uiStrings.validationNegativePromptLongWord[language];
            }

            const unhelpfulTerms = ['bad', 'ugly', 'poor quality', 'boring', 'low resolution'];
            if (unhelpfulTerms.some(term => value.toLowerCase().includes(term))) {
                return uiStrings.validationNegativePromptUnhelpful[language];
            }
            break;
        }
        case 'artEditPrompt':
             if (value.length > EDIT_ART_MAX_LENGTH) return uiStrings.validationMaxLength[language].replace('{max}', EDIT_ART_MAX_LENGTH.toString());
            break;
    }
    return null;
  }, [language]);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    const error = validate(name, value);
    setValidationErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (setter: React.Dispatch<React.SetStateAction<string>>, name: string) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const { value } = e.target;
      setter(value);
      if (name === 'idea' && ideaSuggestions.length > 0) {
        setIdeaSuggestions([]);
      }
      if (validationErrors[name]) {
           setValidationErrors(prev => ({ ...prev, [name]: null }));
      }
  };
  
  const handleGenerateSuggestions = useCallback(async () => {
    if (idea.trim().length < IDEA_MIN_LENGTH) return;
    setIsGeneratingSuggestions(true);
    setSuggestionError(null);
    setIdeaSuggestions([]);
    try {
      const suggestions = await generateIdeaSuggestions(idea, language);
      setIdeaSuggestions(suggestions);
    } catch (err) {
      setSuggestionError(getErrorMessage(err, language));
      console.error(err);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [idea, language]);

  const handleAnalyzeVideo = useCallback(async () => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (!youtubeUrl.trim() || !youtubeRegex.test(youtubeUrl)) {
        setVideoAnalysisError(uiStrings.errorInvalidUrl[language]);
        return;
    }
    setIsAnalyzingVideo(true);
    setVideoAnalysisError(null);
    try {
        const description = await analyzeYouTubeVideo(youtubeUrl, language);
        setIdea(description);
        setYoutubeUrl('');
    } catch (err) {
        setVideoAnalysisError(getErrorMessage(err, language));
        console.error(err);
    } finally {
        setIsAnalyzingVideo(false);
    }
  }, [youtubeUrl, language]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    const fieldsToValidate: { [key: string]: string } = { idea, environment, characterActions, voiceOver, negativePrompt };
    if (artStyle === 'Custom') {
        fieldsToValidate.customArtStyle = customArtStyle;
    }

    const newErrors: { [key: string]: string | null } = {};
    for (const fieldName in fieldsToValidate) {
        const error = validate(fieldName, fieldsToValidate[fieldName]);
        if (error) {
            newErrors[fieldName] = error;
        }
    }
    
    if (Object.keys(newErrors).length > 0) {
        setValidationErrors(newErrors);
        setError(uiStrings.errorValidation[language]);
        return;
    }

    setIsLoading(true);
    setGeneratedPrompt('');
    setGroundingChunks([]);
    setConceptArtUrl(null);
    setArtError(null);
    setArtEditPrompt('');
    setEditArtError(null);
    setAudioUrl(null);
    setAudioError(null);
    setVideoUrl(null);
    setVideoGenerationStatus(null);
    setVideoError(null);
    setStoryboardUrls([]);
    setStoryboardError(null);
    setIdeaSuggestions([]);
    setSuggestionError(null);

    try {
      const params: PromptGenerationParams = {
        idea,
        // Scene
        environment,
        timeOfDay,
        weather,
        // Character
        characterActions,
        characterGender,
        characterEthnicity,
        characterClothing,
        // Style
        artStyle,
        customArtStyle,
        colorPalette,
        visualEffect,
        // Camera
        cameraMovement,
        cameraDistance,
        lensType,
        aspectRatio,
        // Animation
        animationPreset,
        motionIntensity,
        // Audio
        voiceStyle,
        voiceOver,
        ambientSound,
        soundEffectsIntensity,
        // Advanced
        creativityLevel,
        negativePrompt,
        optimizeFor8Seconds,
        includeOverlayText,
        useGoogleSearch,
        generateAsSeries,
        // Meta
        language,
      };
      const result = await generateVeoPrompt(params);
      setGeneratedPrompt(result.prompt);
      if (result.groundingChunks) {
        setGroundingChunks(result.groundingChunks);
      }

      // Save to history
      const newHistoryEntry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        params,
        prompt: result.prompt,
        groundingChunks: result.groundingChunks,
      };
      setHistory(prevHistory => {
        const updatedHistory = [newHistoryEntry, ...prevHistory].slice(0, 20); // Keep last 20
        try {
          localStorage.setItem('veo-prompt-history', JSON.stringify(updatedHistory));
        } catch (e) {
          console.error("Failed to save history to localStorage", e);
        }
        return updatedHistory;
      });

    } catch (err) {
      setError(getErrorMessage(err, language));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [idea, environment, characterActions, characterGender, characterEthnicity, characterClothing, timeOfDay, weather, artStyle, customArtStyle, cameraMovement, cameraDistance, lensType, visualEffect, colorPalette, aspectRatio, animationPreset, motionIntensity, creativityLevel, voiceStyle, ambientSound, soundEffectsIntensity, voiceOver, negativePrompt, optimizeFor8Seconds, includeOverlayText, useGoogleSearch, generateAsSeries, language, validate]);
  
  const handleSaveEditedPrompt = (newPrompt: string) => {
    setGeneratedPrompt(newPrompt);
  };
  
  const handleGenerateArt = useCallback(async (promptForArt: string) => {
    setIsGeneratingArt(true);
    setArtError(null);
    setConceptArtUrl(null);
    try {
        const imageBytes = await generateConceptArt(promptForArt);
        const imageUrl = `data:image/png;base64,${imageBytes}`;
        setConceptArtUrl(imageUrl);
    } catch (err) {
        setArtError(getErrorMessage(err, language));
        console.error(err);
    } finally {
        setIsGeneratingArt(false);
    }
  }, [language]);
  
  const handleEditArt = useCallback(async () => {
    const editPromptError = validate('artEditPrompt', artEditPrompt);
    if (!conceptArtUrl || !artEditPrompt.trim() || editPromptError) {
      setValidationErrors(prev => ({ ...prev, artEditPrompt: editPromptError || (artEditPrompt.trim() ? null : uiStrings.validationRequired[language]) }));
      return;
    }
    setIsEditingArt(true);
    setEditArtError(null);
    try {
        const { newMimeType, newImageBytes } = await editConceptArt(conceptArtUrl, artEditPrompt);
        const newImageUrl = `data:${newMimeType};base64,${newImageBytes}`;
        setConceptArtUrl(newImageUrl);
        setArtEditPrompt('');
    } catch (err) {
        setEditArtError(getErrorMessage(err, language));
        console.error(err);
    } finally {
        setIsEditingArt(false);
    }
  }, [conceptArtUrl, artEditPrompt, language, validate]);
  
  const handleGenerateAudio = useCallback(async () => {
    if (!voiceOver.trim()) {
        setAudioError(uiStrings.errorAudioGeneration[language]);
        return;
    }
    setIsGeneratingAudio(true);
    setAudioUrl(null);
    setAudioError(null);
    try {
        const audioDataUrl = await generateTextToSpeech(voiceOver, voiceStyle);
        setAudioUrl(audioDataUrl);
    } catch (err) {
        setAudioError(getErrorMessage(err, language));
        console.error(err);
    } finally {
        setIsGeneratingAudio(false);
    }
  }, [voiceOver, voiceStyle, language]);

  const handleGenerateVideo = useCallback(async (promptForVideo: string) => {
    setIsGeneratingVideo(true);
    setVideoGenerationStatus(null);
    setVideoUrl(null);
    setVideoError(null);
    try {
        const resultUrl = await generateVeoVideo(promptForVideo, { motionIntensity, creativityLevel }, (status: string) => {
            setVideoGenerationStatus(status);
        });
        setVideoUrl(resultUrl);
    } catch (err) {
        setVideoError(getErrorMessage(err, language));
        console.error(err);
    } finally {
        setIsGeneratingVideo(false);
        setVideoGenerationStatus(null);
    }
  }, [language, motionIntensity, creativityLevel]);

  const handleGenerateStoryboard = useCallback(async (promptForStoryboard: string) => {
    setIsGeneratingStoryboard(true);
    setStoryboardError(null);
    setStoryboardUrls([]);
    try {
      const urls = await generateStoryboard(promptForStoryboard, language);
      setStoryboardUrls(urls);
    } catch (err) {
      setStoryboardError(getErrorMessage(err, language));
      console.error(err);
    } finally {
      setIsGeneratingStoryboard(false);
    }
  }, [language]);

  const handleGenerateExamples = useCallback(async () => {
    setIsLoadingExamples(true);
    setExampleError(null);
    setTrendingPrompts([]);
    setTrendingError(null);
    try {
        const examples = await generateExamplePrompts(
            artStyles,
            cameraMovements,
            cameraDistances,
            lensTypes,
            visualEffects,
            colorPalettes,
            aspectRatios,
            animationPresets,
            voiceStyles,
            timeOfDayOptions,
            weatherOptions,
            characterGenders,
            characterEthnicities,
            characterClothings,
            ambientSounds,
            soundEffectsIntensityOptions,
            motionIntensityOptions,
            creativityLevelOptions,
            language
        );
        setExamplePrompts(examples);
    } catch (err) {
        setExampleError(getErrorMessage(err, language));
        console.error(err);
    } finally {
        setIsLoadingExamples(false);
    }
  }, [language, artStyles, cameraMovements, cameraDistances, lensTypes, visualEffects, colorPalettes, aspectRatios, animationPresets, voiceStyles, timeOfDayOptions, weatherOptions, characterGenders, characterEthnicities, characterClothings, ambientSounds, soundEffectsIntensityOptions, motionIntensityOptions, creativityLevelOptions]);

  const handleGenerateTrending = useCallback(async () => {
    setIsLoadingTrending(true);
    setTrendingError(null);
    setExamplePrompts([]);
    setExampleError(null);
    try {
        const examples = await generateTrendingPrompts(
            artStyles,
            cameraMovements,
            cameraDistances,
            lensTypes,
            visualEffects,
            colorPalettes,
            aspectRatios,
            animationPresets,
            voiceStyles,
            timeOfDayOptions,
            weatherOptions,
            characterGenders,
            characterEthnicities,
            characterClothings,
            ambientSounds,
            soundEffectsIntensityOptions,
            motionIntensityOptions,
            creativityLevelOptions,
            language
        );
        setTrendingPrompts(examples);
    } catch (err) {
        setTrendingError(getErrorMessage(err, language));
        console.error(err);
    } finally {
        setIsLoadingTrending(false);
    }
  }, [language, artStyles, cameraMovements, cameraDistances, lensTypes, visualEffects, colorPalettes, aspectRatios, animationPresets, voiceStyles, timeOfDayOptions, weatherOptions, characterGenders, characterEthnicities, characterClothings, ambientSounds, soundEffectsIntensityOptions, motionIntensityOptions, creativityLevelOptions]);


  const handleUseExample = (example: ExamplePrompt) => {
    setIdea(example.idea);
    setEnvironment(example.params.environment || '');
    setCharacterActions(example.params.characterActions || '');
    setCharacterGender(example.params.characterGender || characterGenders[0].value);
    setCharacterEthnicity(example.params.characterEthnicity || characterEthnicities[0].value);
    setCharacterClothing(example.params.characterClothing || characterClothings[0].value);
    setTimeOfDay(example.params.timeOfDay || timeOfDayOptions[0].value);
    setWeather(example.params.weather || weatherOptions[0].value);
    setArtStyle(example.params.artStyle);
    setCustomArtStyle(example.params.customArtStyle || '');
    setCameraMovement(example.params.cameraMovement);
    setCameraDistance(example.params.cameraDistance || cameraDistances[0].value);
    setLensType(example.params.lensType || lensTypes[0].value);
    setVisualEffect(example.params.visualEffect);
    setColorPalette(example.params.colorPalette);
    setAspectRatio(example.params.aspectRatio);
    setAnimationPreset(example.params.animationPreset);
    setVoiceStyle(example.params.voiceStyle || voiceStyles[0].value);
    setAmbientSound(example.params.ambientSound || ambientSounds[0].value);
    setSoundEffectsIntensity(example.params.soundEffectsIntensity || soundEffectsIntensityOptions[0].value);
    setMotionIntensity(example.params.motionIntensity || 'Medium');
    setCreativityLevel(example.params.creativityLevel || 'Balanced');
    setNegativePrompt(example.params.negativePrompt || '');
    
    setVoiceOver('');
    setOptimizeFor8Seconds(false);
    setIncludeOverlayText(false);
    setUseGoogleSearch(false);
    setGenerateAsSeries(false);
    setGeneratedPrompt('');
    setGroundingChunks([]);
    setConceptArtUrl(null);
    setExamplePrompts([]);
    setTrendingPrompts([]);
    setAudioUrl(null);
    setAudioError(null);
    setVideoUrl(null);
    setVideoGenerationStatus(null);
    setVideoError(null);
    setStoryboardUrls([]);
    setStoryboardError(null);
    setIdeaSuggestions([]);
    setSuggestionError(null);
    setValidationErrors({});

    window.scrollTo({ top: 0, behavior: 'smooth' });
    ideaInputRef.current?.focus();
  };

  const handleUseHistoryItem = (entry: HistoryEntry) => {
    const { params, prompt, groundingChunks } = entry;
    setIdea(params.idea);
    setEnvironment(params.environment || '');
    setCharacterActions(params.characterActions || '');
    setCharacterGender(params.characterGender || characterGenders[0].value);
    setCharacterEthnicity(params.characterEthnicity || characterEthnicities[0].value);
    setCharacterClothing(params.characterClothing || characterClothings[0].value);
    setTimeOfDay(params.timeOfDay || timeOfDayOptions[0].value);
    setWeather(params.weather || weatherOptions[0].value);
    setVoiceOver(params.voiceOver);
    setVoiceStyle(params.voiceStyle || voiceStyles[0].value);
    setAmbientSound(params.ambientSound || ambientSounds[0].value);
    setSoundEffectsIntensity(params.soundEffectsIntensity || soundEffectsIntensityOptions[0].value);
    setNegativePrompt(params.negativePrompt || '');
    setOptimizeFor8Seconds(params.optimizeFor8Seconds);
    setArtStyle(params.artStyle);
    setCustomArtStyle(params.customArtStyle || '');
    setCameraMovement(params.cameraMovement);
    setCameraDistance(params.cameraDistance || cameraDistances[0].value);
    setLensType(params.lensType || lensTypes[0].value);
    setVisualEffect(params.visualEffect);
    setColorPalette(params.colorPalette);
    setAspectRatio(params.aspectRatio);
    setAnimationPreset(params.animationPreset);
    setMotionIntensity(params.motionIntensity || 'Medium');
    setCreativityLevel(params.creativityLevel || 'Balanced');
    setIncludeOverlayText(params.includeOverlayText);
    setUseGoogleSearch(params.useGoogleSearch);
    setGenerateAsSeries(params.generateAsSeries);
    setLanguage(params.language);
    
    setGeneratedPrompt(prompt);
    setGroundingChunks(groundingChunks || []);
    
    setConceptArtUrl(null);
    setExamplePrompts([]);
    setError(null);
    setAudioUrl(null);
    setAudioError(null);
    setVideoUrl(null);
    setVideoGenerationStatus(null);
    setVideoError(null);
    setStoryboardUrls([]);
    setStoryboardError(null);
    setIdeaSuggestions([]);
    setSuggestionError(null);
    setValidationErrors({});
    
    setIsHistoryVisible(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    ideaInputRef.current?.focus();
  };

  const handleClearHistory = () => {
    if (window.confirm(uiStrings.historyClearConfirm[language])) {
      setHistory([]);
      try {
        localStorage.removeItem('veo-prompt-history');
      } catch (e) {
        console.error("Failed to clear history from localStorage", e);
      }
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prevHistory => {
        const updatedHistory = prevHistory.filter(item => item.id !== id);
        try {
            localStorage.setItem('veo-prompt-history', JSON.stringify(updatedHistory));
        } catch (e) {
            console.error("Failed to update history in localStorage", e);
        }
        return updatedHistory;
    });
  };

  const handleUseTemplate = useCallback((template: PromptTemplate) => {
    resetFormFields();
    const { params } = template;
    if (params.idea) setIdea(params.idea);
    if (params.environment) setEnvironment(params.environment);
    if (params.characterActions) setCharacterActions(params.characterActions);
    if (params.characterGender) setCharacterGender(params.characterGender);
    if (params.characterEthnicity) setCharacterEthnicity(params.characterEthnicity);
    if (params.characterClothing) setCharacterClothing(params.characterClothing);
    if (params.timeOfDay) setTimeOfDay(params.timeOfDay);
    if (params.weather) setWeather(params.weather);
    if (params.voiceOver) setVoiceOver(params.voiceOver);
    if (params.voiceStyle) setVoiceStyle(params.voiceStyle);
    if (params.ambientSound) setAmbientSound(params.ambientSound);
    if (params.soundEffectsIntensity) setSoundEffectsIntensity(params.soundEffectsIntensity);
    if (params.negativePrompt) setNegativePrompt(params.negativePrompt);
    if (params.optimizeFor8Seconds) setOptimizeFor8Seconds(params.optimizeFor8Seconds);
    if (params.artStyle) setArtStyle(params.artStyle);
    if (params.customArtStyle) setCustomArtStyle(params.customArtStyle);
    if (params.cameraMovement) setCameraMovement(params.cameraMovement);
    if (params.cameraDistance) setCameraDistance(params.cameraDistance);
    if (params.lensType) setLensType(params.lensType);
    if (params.visualEffect) setVisualEffect(params.visualEffect);
    if (params.colorPalette) setColorPalette(params.colorPalette);
    if (params.aspectRatio) setAspectRatio(params.aspectRatio);
    if (params.animationPreset) setAnimationPreset(params.animationPreset);
    if (params.motionIntensity) setMotionIntensity(params.motionIntensity);
    if (params.creativityLevel) setCreativityLevel(params.creativityLevel);
    if (params.includeOverlayText) setIncludeOverlayText(params.includeOverlayText);
    if (params.useGoogleSearch) setUseGoogleSearch(params.useGoogleSearch);
    if (params.generateAsSeries) setGenerateAsSeries(params.generateAsSeries);
    
    setIsTemplatesVisible(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    ideaInputRef.current?.focus();
  }, [resetFormFields]);

  const handleShare = useCallback(() => {
    const stateToShare: PromptGenerationParams = {
        idea, environment, timeOfDay, weather, characterActions, characterGender,
        characterEthnicity, characterClothing, artStyle, customArtStyle, colorPalette,
        visualEffect, cameraMovement, cameraDistance, lensType, aspectRatio,
        animationPreset, motionIntensity, voiceStyle, voiceOver, ambientSound,
        soundEffectsIntensity, creativityLevel, negativePrompt, optimizeFor8Seconds,
        includeOverlayText, useGoogleSearch, generateAsSeries, language
    };

    try {
        const jsonString = JSON.stringify(stateToShare);
        const base64String = btoa(unescape(encodeURIComponent(jsonString)));
        
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('prompt', base64String);
        
        navigator.clipboard.writeText(url.toString()).then(() => {
            setShareStatus({ message: uiStrings.shareConfirmation[language], isError: false });
            setTimeout(() => setShareStatus(null), 3000);
        }).catch(err => {
            console.error('Could not copy text: ', err);
            setShareStatus({ message: uiStrings.shareError[language], isError: true });
            setTimeout(() => setShareStatus(null), 3000);
        });
        
    } catch (e) {
        console.error("Failed to create share link", e);
        setShareStatus({ message: uiStrings.shareError[language], isError: true });
        setTimeout(() => setShareStatus(null), 3000);
    }
  }, [
      idea, environment, timeOfDay, weather, characterActions, characterGender,
      characterEthnicity, characterClothing, artStyle, customArtStyle, colorPalette,
      visualEffect, cameraMovement, cameraDistance, lensType, aspectRatio,
      animationPreset, motionIntensity, voiceStyle, voiceOver, ambientSound,
      soundEffectsIntensity, creativityLevel, negativePrompt, optimizeFor8Seconds,
      includeOverlayText, useGoogleSearch, generateAsSeries, language
  ]);


  const LanguageSwitcher: React.FC = () => (
    <div className="flex justify-center items-center space-x-4">
        <button 
          onClick={() => setLanguage('en')} 
          className={`px-3 py-1 text-sm rounded-md transition ${language === 'en' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          aria-pressed={language === 'en'}
        >
            English
        </button>
        <button 
          onClick={() => setLanguage('sv')} 
          className={`px-3 py-1 text-sm rounded-md transition ${language === 'sv' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          aria-pressed={language === 'sv'}
        >
            Svenska
        </button>
    </div>
  );

  const formTabs = useMemo(() => [
    {
      label: uiStrings.tabScene[language],
      content: (
        <div className="space-y-6">
          <div>
            <TextAreaInput
              name="idea"
              label={uiStrings.coreIdeaLabel[language]}
              placeholder={uiStrings.coreIdeaPlaceholder[language]}
              value={idea}
              onChange={handleChange(setIdea, 'idea')}
              onBlur={handleBlur}
              error={validationErrors.idea}
              maxLength={IDEA_MAX_LENGTH}
              ref={ideaInputRef}
              rows={5}
            />
            <div className="mt-2 text-right">
                <button
                    onClick={handleGenerateSuggestions}
                    disabled={isGeneratingSuggestions || isLoading || isAnalyzingVideo || idea.trim().length < IDEA_MIN_LENGTH}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-purple-300 bg-purple-900/50 hover:bg-purple-900/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isGeneratingSuggestions ? (
                        <Icon name="spinner" className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    ) : (
                        <Icon name="lightbulb" className="-ml-1 mr-2 h-4 w-4" />
                    )}
                    {isGeneratingSuggestions ? uiStrings.suggestingRefinementsButton[language] : uiStrings.suggestRefinementsButton[language]}
                </button>
            </div>
            {suggestionError && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-3 py-2 rounded-lg mt-4 text-sm" role="alert">
                    <p>{suggestionError}</p>
                </div>
            )}
            {ideaSuggestions.length > 0 && !isGeneratingSuggestions && (
                <div className="mt-4 space-y-3 p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-100 mb-2">{uiStrings.suggestionsTitle[language]}</h4>
                    {ideaSuggestions.map((suggestion, index) => (
                        <div key={index} className="bg-gray-800/50 p-3 rounded-md flex items-center justify-between gap-4">
                            <p className="text-sm text-gray-300 flex-1">
                                <span className="font-semibold text-purple-400 mr-2">→</span>
                                {suggestion}
                            </p>
                            <button
                                onClick={() => {
                                    setIdea(suggestion);
                                    setIdeaSuggestions([]);
                                    if (validationErrors.idea) {
                                        setValidationErrors(prev => ({...prev, idea: null}));
                                    }
                                }}
                                className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors bg-purple-600 text-white hover:bg-purple-700"
                            >
                                {uiStrings.useSuggestionButton[language]}
                            </button>
                        </div>
                    ))}
                </div>
            )}
          </div>
            <div className="p-4 bg-gray-900/30 rounded-lg border border-gray-700 space-y-3">
                 <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-300">
                    {uiStrings.youtubeUrlLabel[language]}
                </label>
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        id="youtube-url"
                        name="youtubeUrl"
                        placeholder={uiStrings.youtubeUrlPlaceholder[language]}
                        value={youtubeUrl}
                        onChange={(e) => {
                            setYoutubeUrl(e.target.value);
                            if (videoAnalysisError) setVideoAnalysisError(null);
                        }}
                        className="w-full bg-gray-900/50 border rounded-lg shadow-sm text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-150 ease-in-out p-2 border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                        />
                    <button
                        onClick={handleAnalyzeVideo}
                        disabled={isAnalyzingVideo || !youtubeUrl.trim()}
                        className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-purple-500 text-sm font-medium rounded-md text-purple-300 bg-gray-800/60 hover:bg-gray-800/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                        {isAnalyzingVideo ? (
                            <Icon name="spinner" className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        ) : (
                             <Icon name="video" className="-ml-1 mr-2 h-4 w-4" />
                        )}
                        {isAnalyzingVideo ? uiStrings.analyzingVideoButton[language] : uiStrings.analyzeVideoButton[language]}
                    </button>
                </div>
                 {videoAnalysisError && (
                    <div className="text-red-400 text-sm" role="alert">
                        {videoAnalysisError}
                    </div>
                )}
            </div>

          <TextAreaInput
            name="environment"
            label={uiStrings.environmentLabel[language]}
            placeholder={uiStrings.environmentPlaceholder[language]}
            value={environment}
            onChange={handleChange(setEnvironment, 'environment')}
            onBlur={handleBlur}
            error={validationErrors.environment}
            maxLength={TEXT_MAX_LENGTH}
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectInput
              label={uiStrings.timeOfDayLabel[language]}
              options={timeOfDayOptions}
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
            <SelectInput
              label={uiStrings.weatherLabel[language]}
              options={weatherOptions}
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
            />
          </div>
          <TextAreaInput
            name="characterActions"
            label={uiStrings.characterActionsLabel[language]}
            placeholder={uiStrings.characterActionsPlaceholder[language]}
            value={characterActions}
            onChange={handleChange(setCharacterActions, 'characterActions')}
            onBlur={handleBlur}
            error={validationErrors.characterActions}
            maxLength={TEXT_MAX_LENGTH}
            rows={3}
          />
          <CollapsibleSection title={uiStrings.characterDetailsTitle[language]}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SelectInput
                label={uiStrings.characterGenderLabel[language]}
                options={characterGenders}
                value={characterGender}
                onChange={(e) => setCharacterGender(e.target.value)}
              />
              <SelectInput
                label={uiStrings.characterEthnicityLabel[language]}
                options={characterEthnicities}
                value={characterEthnicity}
                onChange={(e) => setCharacterEthnicity(e.target.value)}
              />
              <SelectInput
                label={uiStrings.characterClothingLabel[language]}
                options={characterClothings}
                value={characterClothing}
                onChange={(e) => setCharacterClothing(e.target.value)}
              />
            </div>
          </CollapsibleSection>
        </div>
      )
    },
    {
      label: uiStrings.tabStyle[language],
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SelectInput
              label={uiStrings.artStyleLabel[language]}
              options={artStyles}
              value={artStyle}
              onChange={(e) => setArtStyle(e.target.value)}
            />
            {artStyle === 'Custom' && (
              <div className="mt-4">
                <TextAreaInput
                  name="customArtStyle"
                  label={uiStrings.customArtStyleLabel[language]}
                  placeholder={uiStrings.customArtStylePlaceholder[language]}
                  value={customArtStyle}
                  onChange={handleChange(setCustomArtStyle, 'customArtStyle')}
                  onBlur={handleBlur}
                  error={validationErrors.customArtStyle}
                  maxLength={TEXT_MAX_LENGTH}
                  rows={2}
                />
              </div>
            )}
          </div>
          <SelectInput
            label={uiStrings.colorPaletteLabel[language]}
            options={colorPalettes}
            value={colorPalette}
            onChange={(e) => setColorPalette(e.target.value)}
          />
          <SelectInput
            label={uiStrings.visualEffectLabel[language]}
            options={visualEffects}
            value={visualEffect}
            onChange={(e) => setVisualEffect(e.target.value)}
          />
        </div>
      )
    },
    {
      label: uiStrings.tabCameraAudio[language],
      content: (
        <div className="space-y-6">
            <CollapsibleSection title={uiStrings.cameraControlsTitle[language]}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SelectInput
                        label={uiStrings.cameraMovementLabel[language]}
                        options={cameraMovements}
                        value={cameraMovement}
                        onChange={(e) => setCameraMovement(e.target.value)}
                    />
                    <SelectInput
                        label={uiStrings.cameraDistanceLabel[language]}
                        options={cameraDistances}
                        value={cameraDistance}
                        onChange={(e) => setCameraDistance(e.target.value)}
                    />
                    <SelectInput
                        label={uiStrings.lensTypeLabel[language]}
                        options={lensTypes}
                        value={lensType}
                        onChange={(e) => setLensType(e.target.value)}
                    />
                    <SelectInput
                        label={uiStrings.aspectRatioLabel[language]}
                        options={aspectRatios}
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                    />
                </div>
            </CollapsibleSection>
            
            <SelectInput
              label={uiStrings.animationPresetLabel[language]}
              options={animationPresets}
              value={animationPreset}
              onChange={(e) => setAnimationPreset(e.target.value)}
            />

            <CollapsibleSection title={uiStrings.soundDesignTitle[language]}>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SelectInput
                            label={uiStrings.ambientSoundLabel[language]}
                            options={ambientSounds}
                            value={ambientSound}
                            onChange={(e) => setAmbientSound(e.target.value)}
                        />
                        <SelectInput
                            label={uiStrings.soundEffectsIntensityLabel[language]}
                            options={soundEffectsIntensityOptions}
                            value={soundEffectsIntensity}
                            onChange={(e) => setSoundEffectsIntensity(e.target.value)}
                        />
                         <SelectInput
                            label={uiStrings.voiceStyleLabel[language]}
                            options={voiceStyles}
                            value={voiceStyle}
                            onChange={(e) => setVoiceStyle(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <TextAreaInput
                            name="voiceOver"
                            label={uiStrings.voiceOverLabel[language]}
                            placeholder={uiStrings.voiceOverPlaceholder[language]}
                            value={voiceOver}
                            onChange={handleChange(setVoiceOver, 'voiceOver')}
                            onBlur={handleBlur}
                            error={validationErrors.voiceOver}
                            maxLength={TEXT_MAX_LENGTH}
                            rows={4}
                            disabled={voiceStyle === 'None'}
                        />
                        <div className="mt-4">
                            <Button
                                onClick={handleGenerateAudio}
                                isLoading={isGeneratingAudio}
                                disabled={isGeneratingAudio || !voiceOver.trim() || isLoading || voiceStyle === 'None'}
                            >
                                <Icon name="audio" className="-ml-1 mr-2 h-5 w-5" />
                                {isGeneratingAudio ? uiStrings.generatingAudioButton[language] : uiStrings.generateAudioButton[language]}
                            </Button>
                        </div>
                        {audioError && (
                            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mt-4" role="alert">
                                <p>{audioError}</p>
                            </div>
                        )}
                        {audioUrl && !isGeneratingAudio && (
                            <div className="mt-4">
                                <h4 className="text-md font-semibold text-gray-100 mb-2">{uiStrings.audioOutputTitle[language]}</h4>
                                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                                <audio controls src={audioUrl} className="w-full">
                                    {uiStrings.audioUnsupported[language]}
                                </audio>
                                <a
                                    href={audioUrl}
                                    download="veo_prompt_audio.wav"
                                    className="mt-3 inline-block text-sm text-purple-400 hover:text-purple-300 transition-colors underline"
                                >
                                    <Icon name="download" className="inline-block -mt-1 mr-1 h-4 w-4" />
                                    {uiStrings.downloadAudio[language]}
                                </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CollapsibleSection>
        </div>
      )
    },
    {
      label: uiStrings.tabAdvanced[language],
      content: (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Tooltip text={uiStrings.motionIntensityTooltip[language]}>
                    <div className="flex-grow">
                        <SelectInput
                            label={uiStrings.motionIntensityLabel[language]}
                            options={motionIntensityOptions}
                            value={motionIntensity}
                            onChange={(e) => setMotionIntensity(e.target.value)}
                        />
                    </div>
                </Tooltip>
                <Tooltip text={uiStrings.creativityLevelTooltip[language]}>
                    <div className="flex-grow">
                        <SelectInput
                            label={uiStrings.creativityLevelLabel[language]}
                            options={creativityLevelOptions}
                            value={creativityLevel}
                            onChange={(e) => setCreativityLevel(e.target.value)}
                        />
                    </div>
                </Tooltip>
            </div>

            <Tooltip text={uiStrings.negativePromptTooltip[language]}>
                <div className="flex-grow">
                    <TextAreaInput
                        name="negativePrompt"
                        label={uiStrings.negativePromptLabel[language]}
                        placeholder={uiStrings.negativePromptPlaceholder[language]}
                        value={negativePrompt}
                        onChange={handleChange(setNegativePrompt, 'negativePrompt')}
                        onBlur={handleBlur}
                        error={validationErrors.negativePrompt}
                        maxLength={TEXT_MAX_LENGTH}
                        rows={2}
                    />
                </div>
            </Tooltip>
            
            <div className="space-y-4 pt-4 border-t border-gray-700">
                <Tooltip text={uiStrings.optimizeTooltip[language]}>
                    <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700/50">
                    <input
                        type="checkbox"
                        id="optimize-8s"
                        checked={optimizeFor8Seconds}
                        onChange={(e) => setOptimizeFor8Seconds(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="optimize-8s" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                        {uiStrings.optimizeLabel[language]}
                    </label>
                    </div>
                </Tooltip>
                <Tooltip text={uiStrings.overlayTooltip[language]}>
                    <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700/50">
                        <input
                            type="checkbox"
                            id="overlay-text"
                            checked={includeOverlayText}
                            onChange={(e) => setIncludeOverlayText(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <label htmlFor="overlay-text" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                            {uiStrings.overlayLabel[language]}
                        </label>
                    </div>
                </Tooltip>
                <Tooltip text={uiStrings.googleSearchTooltip[language]}>
                    <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700/50">
                        <input
                            type="checkbox"
                            id="google-search"
                            checked={useGoogleSearch}
                            onChange={(e) => setUseGoogleSearch(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <label htmlFor="google-search" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                            {uiStrings.googleSearchLabel[language]}
                        </label>
                    </div>
                </Tooltip>
                <Tooltip text={uiStrings.generateAsSeriesTooltip[language]}>
                    <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700/50">
                        <input
                            type="checkbox"
                            id="generate-series"
                            checked={generateAsSeries}
                            onChange={(e) => setGenerateAsSeries(e.target.checked)}
                            disabled={!useGoogleSearch}
                            className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-purple-600 focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <label htmlFor="generate-series" className={`text-sm font-medium select-none transition-colors ${!useGoogleSearch ? 'text-gray-500 cursor-not-allowed' : 'text-gray-300 cursor-pointer'}`}>
                            {uiStrings.generateAsSeriesLabel[language]}
                        </label>
                    </div>
                </Tooltip>
            </div>
        </div>
      )
    },
  ], [language, idea, environment, timeOfDay, timeOfDayOptions, weather, weatherOptions, characterActions, characterGender, characterGenders, characterEthnicity, characterEthnicities, characterClothing, characterClothings, voiceOver, voiceStyle, voiceStyles, ambientSound, ambientSounds, soundEffectsIntensity, soundEffectsIntensityOptions, artStyle, artStyles, customArtStyle, colorPalette, colorPalettes, visualEffect, visualEffects, cameraMovement, cameraMovements, cameraDistance, cameraDistances, lensType, lensTypes, aspectRatio, aspectRatios, animationPreset, animationPresets, motionIntensity, motionIntensityOptions, creativityLevel, creativityLevelOptions, negativePrompt, optimizeFor8Seconds, includeOverlayText, useGoogleSearch, generateAsSeries, isGeneratingAudio, audioUrl, audioError, validationErrors, handleChange, handleBlur, handleGenerateSuggestions, isGeneratingSuggestions, ideaSuggestions, suggestionError, youtubeUrl, isAnalyzingVideo, videoAnalysisError, handleAnalyzeVideo]);

  const hasValidationErrors = Object.values(validationErrors).some(error => error !== null);
  const isSecondaryActionLoading = isLoadingExamples || isGeneratingAudio || isGeneratingArt || isGeneratingVideo || isLoadingTrending || isAnalyzingVideo || isGeneratingStoryboard;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl">
        <Header 
            title={uiStrings.headerTitle[language]}
            subtitle={uiStrings.headerSubtitle[language]}
            onShowHistory={() => setIsHistoryVisible(true)}
            historyButtonText={uiStrings.historyButtonLabel[language]}
        />

        <main className="mt-8 bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700">
            <fieldset disabled={isLoading || isGeneratingArt || isGeneratingVideo || isAnalyzingVideo}>
                <Tabs tabs={formTabs} />
            </fieldset>
            
            <div className="pt-8 space-y-4">
              <Button
                onClick={handleGenerate}
                isLoading={isLoading}
                disabled={isLoading || hasValidationErrors || isSecondaryActionLoading}
              >
                {isLoading ? uiStrings.generatingButton[language] : uiStrings.generateButton[language]}
              </Button>
               <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <button
                        onClick={() => setIsTemplatesVisible(true)}
                        disabled={isLoading || isSecondaryActionLoading}
                        className="w-full flex items-center justify-center px-4 py-3 border border-purple-500 text-base font-medium rounded-md text-purple-300 bg-gray-800/60 hover:bg-gray-800/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                       <Icon name="template" className="mr-2 h-5 w-5" />
                       {uiStrings.templatesButtonLabel[language]}
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={isLoading || isSecondaryActionLoading}
                        className="w-full flex items-center justify-center px-4 py-3 border border-purple-500 text-base font-medium rounded-md text-purple-300 bg-gray-800/60 hover:bg-gray-800/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                       <Icon name="share" className="mr-2 h-5 w-5" />
                       {uiStrings.shareButtonLabel[language]}
                    </button>
                    <button
                        onClick={examplePrompts.length > 0 ? () => setExamplePrompts([]) : handleGenerateExamples}
                        disabled={isLoading || isSecondaryActionLoading}
                        className="w-full flex items-center justify-center px-4 py-3 border border-purple-500 text-base font-medium rounded-md text-purple-300 bg-gray-800/60 hover:bg-gray-800/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoadingExamples ? (
                            <>
                                <Icon name="spinner" className="animate-spin -ml-1 mr-3 h-5 w-5" />
                                {uiStrings.showingExamplesButton[language]}
                            </>
                        ) : (
                             examplePrompts.length > 0 ? uiStrings.hideExamplesButton[language] : uiStrings.showExamplesButton[language]
                        )}
                    </button>
                     <button
                        onClick={trendingPrompts.length > 0 ? () => setTrendingPrompts([]) : handleGenerateTrending}
                        disabled={isLoading || isSecondaryActionLoading}
                        className="w-full flex items-center justify-center px-4 py-3 border border-purple-500 text-base font-medium rounded-md text-purple-300 bg-gray-800/60 hover:bg-gray-800/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoadingTrending ? (
                            <>
                                <Icon name="spinner" className="animate-spin -ml-1 mr-3 h-5 w-5" />
                                {uiStrings.showingTrendingButton[language]}
                            </>
                        ) : (
                             trendingPrompts.length > 0 ? uiStrings.hideTrendingButton[language] : uiStrings.showTrendingButton[language]
                        )}
                    </button>
               </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mt-6" role="alert">
                <p>{error}</p>
              </div>
            )}
            
            {exampleError && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mt-6" role="alert">
                <p>{exampleError}</p>
              </div>
            )}

            {trendingError && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mt-6" role="alert">
                <p>{trendingError}</p>
              </div>
            )}

            {examplePrompts.length > 0 && !isLoadingExamples && (
                <div className="mt-6">
                    <ExamplesCarousel
                        title={uiStrings.examplesTitle[language]}
                        examples={examplePrompts}
                        onUseExample={handleUseExample}
                        useExampleText={uiStrings.useExampleButton[language]}
                        onClose={() => setExamplePrompts([])}
                    />
                </div>
            )}

            {trendingPrompts.length > 0 && !isLoadingTrending && (
                <div className="mt-6">
                    <ExamplesCarousel
                        title={uiStrings.trendingTitle[language]}
                        examples={trendingPrompts}
                        onUseExample={handleUseExample}
                        useExampleText={uiStrings.useExampleButton[language]}
                        onClose={() => setTrendingPrompts([])}
                    />
                </div>
            )}

            {generatedPrompt && !isLoading && (
              <div className="mt-8 space-y-6">
                <div>
                    <h3 className="text-xl font-semibold text-gray-100 mb-3">{uiStrings.promptOutputTitle[language]}</h3>
                    <PromptOutput 
                        prompt={generatedPrompt}
                        onSave={handleSaveEditedPrompt}
                        copiedText={uiStrings.promptOutputCopied[language]}
                        editText={uiStrings.promptOutputEdit[language]}
                        saveText={uiStrings.promptOutputSave[language]}
                        cancelText={uiStrings.promptOutputCancel[language]}
                        onGenerateArt={handleGenerateArt}
                        isGeneratingArt={isGeneratingArt}
                        generateArtText={isGeneratingArt ? uiStrings.generatingArt[language] : uiStrings.promptOutputGenerateArt[language]}
                        onGenerateVideo={handleGenerateVideo}
                        isGeneratingVideo={isGeneratingVideo}
                        generateVideoText={isGeneratingVideo ? uiStrings.generatingVideoButton[language] : uiStrings.generateVideoButton[language]}
                        onGenerateStoryboard={handleGenerateStoryboard}
                        isGeneratingStoryboard={isGeneratingStoryboard}
                        generateStoryboardText={isGeneratingStoryboard ? uiStrings.generatingStoryboardButton[language] : uiStrings.generateStoryboardButton[language]}
                    />
                </div>
                
                {groundingChunks.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-gray-100 mb-3">{uiStrings.sourcesTitle[language]}</h3>
                    <div className="bg-gray-900/70 rounded-lg border border-gray-700 p-4">
                      <ul className="space-y-2">
                        {groundingChunks.map((chunk, index) => (
                          chunk.web && chunk.web.uri && (
                            <li key={index} className="flex items-start text-sm">
                              <span className="text-purple-400 mr-2 mt-1">&#8226;</span>
                              <a 
                                href={chunk.web.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-gray-300 hover:text-purple-400 transition-colors underline break-all"
                              >
                                {chunk.web.title || chunk.web.uri}
                              </a>
                            </li>
                          )
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {(isGeneratingVideo || videoUrl || videoError) && (
                    <div className="mt-6">
                        <h3 className="text-xl font-semibold text-gray-100 mb-3">{uiStrings.videoOutputTitle[language]}</h3>
                        <div className="bg-gray-900/70 rounded-lg border border-gray-700 p-4">
                            {isGeneratingVideo && (
                                <div className="flex items-center space-x-3">
                                    <Icon name="spinner" className="animate-spin h-5 w-5 text-purple-400" />
                                    <span className="text-gray-300">{videoGenerationStatus || '...'}</span>
                                </div>
                            )}
                            {videoError && !isGeneratingVideo && (
                                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                                    <p>{videoError}</p>
                                </div>
                            )}
                            {videoUrl && !isGeneratingVideo && (
                                <div>
                                    <video controls src={videoUrl} className="w-full rounded-md" >
                                        {uiStrings.videoUnsupported[language]}
                                    </video>
                                    <a
                                        href={videoUrl}
                                        download="veo_generated_video.mp4"
                                        className="mt-3 inline-block text-sm text-purple-400 hover:text-purple-300 transition-colors underline"
                                    >
                                        <Icon name="download" className="inline-block -mt-1 mr-1 h-4 w-4" />
                                        {uiStrings.downloadVideo[language]}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}


                {isGeneratingArt && (
                    <div className="flex justify-center items-center space-x-3 bg-gray-900/50 p-4 rounded-lg">
                        <Icon name="spinner" className="animate-spin h-5 w-5 text-purple-400" />
                        <span className="text-gray-300">{uiStrings.generatingArt[language]}</span>
                    </div>
                )}
                
                {artError && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                        <p>{artError}</p>
                    </div>
                )}

                {isGeneratingStoryboard && (
                    <div className="mt-6 flex justify-center items-center space-x-3 bg-gray-900/50 p-4 rounded-lg">
                        <Icon name="spinner" className="animate-spin h-5 w-5 text-purple-400" />
                        <span className="text-gray-300">{uiStrings.generatingStoryboardButton[language]}</span>
                    </div>
                )}

                {storyboardError && (
                    <div className="mt-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                        <p>{storyboardError}</p>
                    </div>
                )}

                {storyboardUrls.length > 0 && !isGeneratingStoryboard && (
                    <div className="mt-6">
                        <h3 className="text-xl font-semibold text-gray-100 mb-3">{uiStrings.storyboardTitle[language]}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {storyboardUrls.map((url, index) => (
                                <div key={index} className="bg-gray-900/70 p-2 rounded-lg border border-gray-700">
                                    <img src={url} alt={`Storyboard frame ${index + 1}`} className="rounded-md w-full aspect-video object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {conceptArtUrl && (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-100 mb-3">{uiStrings.conceptArtTitle[language]}</h3>
                        <div className="bg-gray-900/70 rounded-lg border border-gray-700 p-2">
                            <img src={conceptArtUrl} alt="Generated concept art" className="rounded-md w-full" />
                        </div>
                        
                        <fieldset disabled={isGeneratingVideo}>
                            <div className="mt-4 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                                <div className="space-y-4">
                                    <TextAreaInput
                                    name="artEditPrompt"
                                    label={uiStrings.editArtLabel[language]}
                                    placeholder={uiStrings.editArtPlaceholder[language]}
                                    value={artEditPrompt}
                                    onChange={handleChange(setArtEditPrompt, 'artEditPrompt')}
                                    onBlur={handleBlur}
                                    error={validationErrors.artEditPrompt}
                                    maxLength={EDIT_ART_MAX_LENGTH}
                                    rows={2}
                                    />
                                    <div>
                                    <Button
                                        onClick={handleEditArt}
                                        isLoading={isEditingArt}
                                        disabled={isEditingArt || !artEditPrompt.trim() || !!validationErrors.artEditPrompt}
                                    >
                                        <Icon name="magic" className="-ml-1 mr-2 h-5 w-5" />
                                        {isEditingArt ? uiStrings.editingArtButton[language] : uiStrings.editArtButton[language]}
                                    </Button>
                                    </div>
                                    {editArtError && (
                                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                                        <p>{editArtError}</p>
                                    </div>
                                    )}
                                </div>
                            </div>
                        </fieldset>
                    </div>
                )}
              </div>
            )}
        </main>
        <footer className="text-center mt-8 text-gray-400 text-sm space-y-4">
            <LanguageSwitcher />
            <p>{uiStrings.footerText[language]}</p>
        </footer>
      </div>
      {isHistoryVisible && (
        <HistoryPanel
          history={history}
          onSelect={handleUseHistoryItem}
          onClear={handleClearHistory}
          onDelete={handleDeleteHistoryItem}
          onClose={() => setIsHistoryVisible(false)}
          uiStrings={{
            title: uiStrings.historyPanelTitle[language],
            clear: uiStrings.historyClearButton[language],
            empty: uiStrings.historyEmpty[language],
            use: uiStrings.historyUseButton[language],
            delete: uiStrings.historyDeleteButtonLabel[language],
            deleteConfirm: uiStrings.historyDeleteConfirm[language],
          }}
          language={language}
        />
      )}
      {isTemplatesVisible && (
        <TemplatesPanel
          templates={templates}
          onSelect={handleUseTemplate}
          onClose={() => setIsTemplatesVisible(false)}
          uiStrings={{
            title: uiStrings.templatesPanelTitle[language],
            use: uiStrings.templateUseButton[language],
          }}
        />
      )}
      {shareStatus && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 ${shareStatus.isError ? 'bg-red-700/90' : 'bg-green-600/90'} text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300`} role="status">
            {shareStatus.message}
        </div>
      )}
    </div>
  );
};

export default App;