
import { useState, useCallback, useRef } from 'react';
import { PromptState, VeoPromptResponse, ToastMessage } from '../types';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { validateAllFields } from '../utils/validation';
import {
  CHARACTER_LIMITS,
  getArtStyles,
  getCameraMovements,
  getColorPalettes,
  getTimeOfDayOptions,
  getWeatherOptions,
  getVisualEffects,
  getCameraDistances,
  getCharacterGenders,
  getCharacterAges,
  getCharacterMoods,
  getCharacterPoses,
  getCharacterClothings,
  getCharacterSkinTones,
  getAmbientSounds,
  getSoundEffectsIntensity,
  getVoiceStyles,
  getArchitecturalStyles,
  getLightingStyles,
  getCompositionalGuides,
  getMotionIntensityOptions,
  getCreativityLevelOptions,
  getLensTypes,
  getAspectRatios,
} from '../constants';

interface UsePromptLogicProps {
  promptState: PromptState;
  setPromptState: (update: Partial<PromptState>) => void;
  addToast: (message: string, type: ToastMessage['type']) => void;
  userCoords: { latitude: number; longitude: number } | null;
  t: any; // Translation object
}

export const usePromptLogic = ({
  promptState,
  setPromptState,
  addToast,
  userCoords,
  t,
}: UsePromptLogicProps) => {
  // --- Core Generation State ---
  const [generatedPrompt, setGeneratedPrompt] = useState<VeoPromptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PromptState, string>>>({});
  const lastPromptGenTime = useRef<number>(0);

  // --- Suggestion Loading States ---
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isSuggestingFullAudio, setIsSuggestingFullAudio] = useState(false);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [isSuggestingArtStyle, setIsSuggestingArtStyle] = useState(false);
  const [isSuggestingCharacterDetails, setIsSuggestingCharacterDetails] = useState(false);
  const [isSuggestingEnvironment, setIsSuggestingEnvironment] = useState(false);
  const [isSuggestingSensoryDetails, setIsSuggestingSensoryDetails] = useState(false);
  const [isSuggestingCharacterNuances, setIsSuggestingCharacterNuances] = useState(false);
  const [isSuggestingEffect, setIsSuggestingEffect] = useState(false);
  const [isSuggestingAdvanced, setIsSuggestingAdvanced] = useState(false);

  // --- Suggestion Data States ---
  const [artStyleSuggestions, setArtStyleSuggestions] = useState<string[]>([]);
  const [clothingSuggestions, setClothingSuggestions] = useState<string[]>([]);
  const [accessorySuggestions, setAccessorySuggestions] = useState<string[]>([]);
  const characterDetailsDebounceTimeout = useRef<number | null>(null);

  // --- Handlers ---

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

  const handleAutoFillModifiers = useCallback(async () => {
    if (!promptState.idea.trim()) {
      addToast(t.errorValidation, 'error');
      return;
    }
    setIsAutoFilling(true);
    try {
      // Re-deriving options inside the callback to ensure they match current language if it changes
      // In a highly optimized app, these getters could be passed in or memoized externally,
      // but calling them here is safe and clean.
      const lang = promptState.language;
      const suggestions = await geminiService.analyzeIdeaForModifiers(
        promptState.idea,
        lang,
        {
          artStyles: getArtStyles(lang).map((o) => o.value).filter((v) => v !== 'Custom'),
          cameraMovements: getCameraMovements(lang).map((o) => o.value),
          colorPalettes: getColorPalettes(lang).map((o) => o.value),
          timeOfDay: getTimeOfDayOptions(lang).map((o) => o.value).filter((v) => v !== 'Any'),
          weather: getWeatherOptions(lang).map((o) => o.value).filter((v) => v !== 'Any'),
          visualEffects: getVisualEffects(lang).map((o) => o.value),
          cameraDistances: getCameraDistances(lang).map((o) => o.value),
          characterGenders: getCharacterGenders(lang).map((o) => o.value),
          characterAges: getCharacterAges(lang).map((o) => o.value),
          characterMoods: getCharacterMoods(lang).map((o) => o.value).filter((v) => v !== 'Any'),
          characterPoses: getCharacterPoses(lang).map((o) => o.value).filter((v) => v !== 'Any'),
          characterClothings: getCharacterClothings(lang).map((o) => o.value),
          characterSkinTones: getCharacterSkinTones(lang).map((o) => o.value).filter((v) => v !== 'Any'),
          ambientSounds: getAmbientSounds(lang).map((o) => o.value),
          soundEffectsIntensity: getSoundEffectsIntensity(lang).map((o) => o.value),
          voiceStyles: getVoiceStyles(lang).map((o) => o.value),
          architecturalStyles: getArchitecturalStyles(lang).map((o) => o.value).filter((v) => v !== 'Any'),
          lightingStyles: getLightingStyles(lang).map((o) => o.value).filter((v) => v !== 'Any'),
          compositionalGuides: getCompositionalGuides(lang).map((o) => o.value).filter((v) => v !== 'Any'),
          motionIntensity: getMotionIntensityOptions(lang).map((o) => o.value),
          creativityLevel: getCreativityLevelOptions(lang).map((o) => o.value),
          lensTypes: getLensTypes(lang).map((o) => o.value),
          aspectRatios: getAspectRatios(lang).map((o) => o.value),
        },
        promptState.generateAsSeries,
        promptState.model,
        promptState.targetModel
      );

      const truncatedSuggestions: Partial<PromptState> = {};
      let audioMix = { ...promptState.audioMix };

      for (const key in suggestions) {
        // Handle Audio Mix special flattening
        if (key === 'audioMixVoice' && typeof suggestions.audioMixVoice === 'number') {
            audioMix.voice = suggestions.audioMixVoice;
            continue;
        }
        if (key === 'audioMixAmbient' && typeof suggestions.audioMixAmbient === 'number') {
            audioMix.ambient = suggestions.audioMixAmbient;
            continue;
        }
        if (key === 'audioMixSfx' && typeof suggestions.audioMixSfx === 'number') {
            audioMix.sfx = suggestions.audioMixSfx;
            continue;
        }

        const typedKey = key as keyof PromptState;
        const value = (suggestions as any)[key];
        const limit = CHARACTER_LIMITS[typedKey as keyof typeof CHARACTER_LIMITS];

        if (limit && typeof value === 'string' && value.length > limit) {
          const truncatedValue = value.substring(0, limit);
          const lastSpaceIndex = truncatedValue.lastIndexOf(' ');
          (truncatedSuggestions as any)[typedKey] =
            lastSpaceIndex > 0 ? truncatedValue.substring(0, lastSpaceIndex) : truncatedValue;
        } else {
          (truncatedSuggestions as any)[typedKey] = value;
        }
      }
      
      truncatedSuggestions.audioMix = audioMix;

      setPromptState(truncatedSuggestions);
      addToast(t.autofillButton + " Complete", 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, t), 'error');
    } finally {
      setIsAutoFilling(false);
    }
  }, [promptState.idea, promptState.language, promptState.generateAsSeries, promptState.model, promptState.targetModel, promptState.audioMix, addToast, setPromptState, t]);

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
          voiceStyleOptions: getVoiceStyles(promptState.language).map((o) => o.value),
        },
        promptState.language,
        promptState.model,
        getAmbientSounds(promptState.language).map((o) => o.value),
        getSoundEffectsIntensity(promptState.language).map((o) => o.value)
      );

      setPromptState({
        voiceStyle: suggestions.suggestedVoiceStyle,
        voiceOver: suggestions.suggestedVoiceOverScript,
        ambientSound: suggestions.suggestedAmbientSound,
        soundEffectsIntensity: suggestions.suggestedSoundEffectsIntensity,
      });

      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.voiceStyle;
        delete newErrors.voiceOver;
        return newErrors;
      });

      addToast(t.toastAudioSuggested, 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, t), 'error');
    } finally {
      setIsSuggestingFullAudio(false);
    }
  }, [promptState, setPromptState, addToast, t]);

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

      if (suggestions.environmentSensoryDetails?.trim()) {
        updates.environmentSensoryDetails = [promptState.environmentSensoryDetails, suggestions.environmentSensoryDetails]
          .filter(Boolean)
          .join(', ');
      }

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
        promptState.weather,
        promptState.timeOfDay,
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
  }, [promptState.environment, promptState.weather, promptState.timeOfDay, promptState.language, promptState.model, addToast, setPromptState, t]);

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
    if (artStyle === 'Custom' && !customArtStyle.trim()) {
      addToast(t.errorCustomStyleRequired, 'error');
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
        getVisualEffects(language).map((o) => o.value)
      );
      setPromptState({ visualEffect: suggestion });
      addToast(t.toastEffectSuggested, 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, t), 'error');
    } finally {
      setIsSuggestingEffect(false);
    }
  }, [promptState, setPromptState, addToast, t]);

  const handleSuggestAdvancedSettings = useCallback(async () => {
    if (!promptState.idea.trim()) {
      addToast(t.errorValidation, 'error');
      return;
    }
    setIsSuggestingAdvanced(true);
    try {
      const lang = promptState.language;
      const suggestions = await geminiService.suggestAdvancedSettings(
        {
          idea: promptState.idea,
          artStyle: promptState.artStyle,
          customArtStyle: promptState.customArtStyle,
          cameraMovement: promptState.cameraMovement,
          targetModel: promptState.targetModel,
        },
        lang,
        promptState.model,
        {
          motionIntensity: getMotionIntensityOptions(lang).map((o) => o.value),
          creativityLevel: getCreativityLevelOptions(lang).map((o) => o.value),
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
  }, [promptState, addToast, setPromptState, t]);

  const handleSuggestArtStyles = useCallback(async () => {
    if (!promptState.customArtStyle.trim()) {
      addToast(t.errorValidation, 'error');
      return;
    }
    setIsSuggestingArtStyle(true);
    setArtStyleSuggestions([]);
    try {
      const suggestions = await geminiService.suggestArtStyles(
        promptState.customArtStyle,
        promptState.language,
        promptState.model
      );
      setArtStyleSuggestions(suggestions);
    } catch (error) {
      addToast(getApiErrorMessage(error, t), 'error');
    } finally {
      setIsSuggestingArtStyle(false);
    }
  }, [promptState.customArtStyle, promptState.language, promptState.model, addToast, t]);

  const handleTriggerCharacterDetails = useCallback(async () => {
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
            // Silently fail or log for background suggestion
            setClothingSuggestions([]);
            setAccessorySuggestions([]);
        } finally {
            setIsSuggestingCharacterDetails(false);
        }
    }, 1000);
  }, [promptState.characterArchetype, promptState.environment, promptState.language, promptState.model]);

  const handleAnalyzeAudio = useCallback(async () => {
    if (!promptState.uploadedAudio) return;
    setIsAnalyzingAudio(true);
    try {
      const description = await geminiService.analyzeAudio(
        promptState.uploadedAudio.data,
        promptState.uploadedAudio.mimeType
      );
      setPromptState({ ambientSound: description });
      addToast(t.toastAudioAnalyzed, 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, t), 'error');
    } finally {
      setIsAnalyzingAudio(false);
    }
  }, [promptState.uploadedAudio, setPromptState, addToast, t]);

  return {
    generatedPrompt,
    setGeneratedPrompt,
    isLoading,
    errors,
    setErrors,
    
    // Suggestion Loading States
    isAutoFilling,
    isSuggestingFullAudio,
    isAnalyzingAudio,
    isSuggestingArtStyle,
    isSuggestingCharacterDetails,
    isSuggestingEnvironment,
    isSuggestingSensoryDetails,
    isSuggestingCharacterNuances,
    isSuggestingEffect,
    isSuggestingAdvanced,

    // Suggestion Data
    artStyleSuggestions,
    setArtStyleSuggestions,
    clothingSuggestions,
    accessorySuggestions,

    // Handlers
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
  };
};
