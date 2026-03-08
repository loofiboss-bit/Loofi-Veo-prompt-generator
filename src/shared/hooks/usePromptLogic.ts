import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PromptState, VeoPromptResponse, ToastMessage } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import { generatePromptWithCurrentProvider } from '@core/services/promptGenerationService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { validateAllFields } from '@core/utils/validation';
import { performanceService } from '@core/services/performanceService';
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
  getCharacterArchetypes,
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
  getAnimationPresets,
  getCharacterEthnicityOptions,
} from '@core/constants';

interface UsePromptLogicProps {
  promptState: PromptState;
  setPromptState: (update: Partial<PromptState>) => void;
  addToast: (message: string, type: ToastMessage['type']) => void;
}

// Helper to safely truncate text to defined limits, preserving whole words where possible
const truncateText = (text: string, limit?: number) => {
  if (!text || !limit || text.length <= limit) return text;

  // Hard cut at limit
  const sub = text.substring(0, limit);

  // Attempt to cut at the last space to keep words intact,
  // but only if we don't lose too much text (e.g. > 15 chars)
  const lastSpace = sub.lastIndexOf(' ');
  if (lastSpace > 0 && sub.length - lastSpace < 15) {
    return sub.substring(0, lastSpace);
  }
  return sub;
};

export const usePromptLogic = ({ promptState, setPromptState, addToast }: UsePromptLogicProps) => {
  const { t, i18n } = useTranslation(['common', 'toasts', 'errors']);
  const errorsBundle = useMemo(
    () => (i18n.getResourceBundle(i18n.language, 'errors') || {}) as Record<string, string>,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i18n is a stable singleton; only language changes matter
    [i18n.language],
  );
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

  // New Loading States
  const [isSuggestingCamera, setIsSuggestingCamera] = useState(false);
  const [isSuggestingActions, setIsSuggestingActions] = useState(false);
  const [isRestructuring, setIsRestructuring] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingVisualDNA, setIsGeneratingVisualDNA] = useState(false);

  // --- Suggestion Data States ---
  const [artStyleSuggestions, setArtStyleSuggestions] = useState<string[]>([]);
  const [clothingSuggestions, setClothingSuggestions] = useState<string[]>([]);
  const [accessorySuggestions, setAccessorySuggestions] = useState<string[]>([]);
  const characterDetailsDebounceTimeout = useRef<number | null>(null);

  // --- Handlers ---

  const handleGeneratePrompt = useCallback(async () => {
    const validationErrors = validateAllFields(promptState, errorsBundle);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      addToast(t('errors:errorValidation'), 'error');
      return;
    }

    setIsLoading(true);
    setGeneratedPrompt(null);
    performanceService.startMark('prompt-generation');
    try {
      const result = await generatePromptWithCurrentProvider(promptState);
      setGeneratedPrompt(result);
      lastPromptGenTime.current = Date.now();
      addToast(t('toasts:toastPromptGenerated'), 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      performanceService.endMark('prompt-generation');
      setIsLoading(false);
    }
  }, [promptState, errorsBundle, t, addToast]);

  const handleAutoFillModifiers = useCallback(async () => {
    if (!promptState.idea.trim()) {
      addToast(t('errors:errorValidation'), 'error');
      return;
    }
    setIsAutoFilling(true);
    try {
      const lang = promptState.language;
      const suggestions = await geminiService.analyzeIdeaForModifiers(
        promptState.idea,
        promptState.language,
        {
          artStyle: getArtStyles(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'Custom'),
          cameraMovement: getCameraMovements(lang).map((o) => o.value),
          colorPalette: getColorPalettes(lang).map((o) => o.value),
          timeOfDay: getTimeOfDayOptions(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'Any'),
          weather: getWeatherOptions(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'Any'),
          visualEffect: getVisualEffects(lang).map((o) => o.value),
          cameraDistance: getCameraDistances(lang).map((o) => o.value),
          characterGender: getCharacterGenders(lang).map((o) => o.value),
          characterAge: getCharacterAges(lang).map((o) => o.value),
          characterMood: getCharacterMoods(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'Any'),
          characterPose: getCharacterPoses(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'Any'),
          characterClothing: getCharacterClothings(lang).map((o) => o.value),
          characterSkinTone: getCharacterSkinTones(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'Any'),
          characterArchetype: getCharacterArchetypes(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'Any'),
          characterEthnicity: getCharacterEthnicityOptions(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'Any'),
          ambientSound: getAmbientSounds(lang).map((o) => o.value),
          soundEffectsIntensity: getSoundEffectsIntensity(lang).map((o) => o.value),
          voiceStyle: getVoiceStyles(lang).map((o) => o.value),
          architecturalStyle: getArchitecturalStyles(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'Any'),
          lightingStyle: getLightingStyles(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'Any'),
          compositionalGuide: getCompositionalGuides(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'Any'),
          motionIntensity: getMotionIntensityOptions(lang).map((o) => o.value),
          creativityLevel: getCreativityLevelOptions(lang).map((o) => o.value),
          lensType: getLensTypes(lang).map((o) => o.value),
          aspectRatio: getAspectRatios(lang).map((o) => o.value),
          animationPreset: getAnimationPresets(lang)
            .map((o) => o.value)
            .filter((v) => v !== 'None'),
        },
        promptState.generateAsSeries,
        promptState.model,
        promptState.targetModel,
      );

      const truncatedSuggestions: Partial<PromptState> = {};
      let audioMix = { ...promptState.audioMix };
      const rawSuggestions = suggestions as Record<string, unknown>;

      for (const key in rawSuggestions) {
        if (key === 'audioMixVoice' && typeof rawSuggestions.audioMixVoice === 'number') {
          audioMix.voice = rawSuggestions.audioMixVoice;
          continue;
        }
        if (key === 'audioMixAmbient' && typeof rawSuggestions.audioMixAmbient === 'number') {
          audioMix.ambient = rawSuggestions.audioMixAmbient;
          continue;
        }
        if (key === 'audioMixSfx' && typeof rawSuggestions.audioMixSfx === 'number') {
          audioMix.sfx = rawSuggestions.audioMixSfx;
          continue;
        }

        const typedKey = key as keyof PromptState;
        const value = rawSuggestions[key];
        const limit = CHARACTER_LIMITS[typedKey as keyof typeof CHARACTER_LIMITS];

        if (typeof value === 'string') {
          (truncatedSuggestions as Record<string, unknown>)[typedKey] = truncateText(value, limit);
        } else {
          (truncatedSuggestions as Record<string, unknown>)[typedKey] = value;
        }
      }

      truncatedSuggestions.audioMix = audioMix;

      setPromptState(truncatedSuggestions);
      addToast(t('common:autofillButton') + ' Complete', 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsAutoFilling(false);
    }
  }, [
    promptState.idea,
    promptState.language,
    promptState.generateAsSeries,
    promptState.model,
    promptState.targetModel,
    promptState.audioMix,
    addToast,
    setPromptState,
    t,
    errorsBundle,
  ]);

  const handleSuggestFullAudioDesign = useCallback(async () => {
    if (!promptState.idea.trim()) {
      addToast(t('errors:errorValidation'), 'error');
      return;
    }
    setIsSuggestingFullAudio(true);
    try {
      const lang = promptState.language;
      const suggestions = await geminiService.suggestFullAudioDesign(
        {
          artStyle:
            promptState.artStyle === 'Custom' ? promptState.customArtStyle : promptState.artStyle,
          cameraMovement: promptState.cameraMovement,
          idea: promptState.idea,
          environment: promptState.environment,
          characterActions: promptState.characterActions,
          characterMood: promptState.characterMood,
          voiceStyleOptions: getVoiceStyles(lang).map((o) => o.value),
        },
        promptState.language,
        promptState.model,
        getAmbientSounds(lang).map((o) => o.value),
        getSoundEffectsIntensity(lang).map((o) => o.value),
      );

      setPromptState({
        voiceStyle: suggestions.suggestedVoiceStyle,
        voiceOver: truncateText(suggestions.suggestedVoiceOverScript, CHARACTER_LIMITS.voiceOver),
        ambientSound: suggestions.suggestedAmbientSound,
        soundEffectsIntensity: suggestions.suggestedSoundEffectsIntensity,
      });

      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.voiceStyle;
        delete newErrors.voiceOver;
        return newErrors;
      });

      addToast(t('toasts:toastAudioSuggested'), 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsSuggestingFullAudio(false);
    }
  }, [promptState, setPromptState, addToast, t, errorsBundle]);

  const handleSuggestEnvironmentDetails = useCallback(async () => {
    // Allow if either environment OR idea is present. Idea is often enough to infer environment.
    if (!promptState.environment.trim() && !promptState.idea.trim()) {
      addToast(t('errors:errorValidation'), 'error');
      return;
    }
    setIsSuggestingEnvironment(true);
    try {
      const suggestions = await geminiService.suggestEnvironmentDetails(
        promptState.environment,
        promptState.idea, // Pass idea
        promptState.language,
        promptState.model,
      );

      const updates: Partial<PromptState> = {};

      // If the AI suggests a better environment description and the current one is short/empty
      if (suggestions.environment?.trim() && promptState.environment.length < 50) {
        updates.environment = truncateText(suggestions.environment, CHARACTER_LIMITS.environment);
      }

      if (suggestions.environmentSensoryDetails?.trim()) {
        const newDetails = [
          promptState.environmentSensoryDetails,
          suggestions.environmentSensoryDetails,
        ]
          .filter(Boolean)
          .join(', ');
        updates.environmentSensoryDetails = truncateText(
          newDetails,
          CHARACTER_LIMITS.environmentSensoryDetails,
        );
      }

      if (suggestions.environmentDynamicEvents?.trim()) {
        const newEvents = [
          promptState.environmentDynamicEvents,
          suggestions.environmentDynamicEvents,
        ]
          .filter(Boolean)
          .join(', ');
        updates.environmentDynamicEvents = truncateText(
          newEvents,
          CHARACTER_LIMITS.environmentDynamicEvents,
        );
      }

      if (Object.keys(updates).length > 0) {
        setPromptState(updates);
        addToast(t('toasts:toastEnvironmentSuggested'), 'success');
      }
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsSuggestingEnvironment(false);
    }
  }, [
    promptState.environment,
    promptState.idea,
    promptState.language,
    promptState.model,
    promptState.environmentSensoryDetails,
    promptState.environmentDynamicEvents,
    addToast,
    setPromptState,
    t,
    errorsBundle,
  ]);

  const handleSuggestSensoryDetails = useCallback(async () => {
    if (!promptState.environment.trim()) {
      addToast(t('errors:errorValidation'), 'error');
      return;
    }
    setIsSuggestingSensoryDetails(true);
    try {
      const suggestion = await geminiService.suggestSensoryDetails(
        promptState.environment,
        promptState.weather,
        promptState.timeOfDay,
        promptState.language,
        promptState.model,
      );
      setPromptState({
        environmentSensoryDetails: truncateText(
          suggestion,
          CHARACTER_LIMITS.environmentSensoryDetails,
        ),
      });
      addToast(t('toasts:toastSensoryDetailsSuggested'), 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsSuggestingSensoryDetails(false);
    }
  }, [
    promptState.environment,
    promptState.weather,
    promptState.timeOfDay,
    promptState.language,
    promptState.model,
    addToast,
    setPromptState,
    t,
    errorsBundle,
  ]);

  const handleSuggestCharacterNuances = useCallback(async () => {
    if (!promptState.characterActions.trim() && promptState.characterMood === 'Any') {
      addToast(t('errors:errorValidation'), 'error');
      return;
    }
    setIsSuggestingCharacterNuances(true);
    try {
      const suggestion = await geminiService.suggestCharacterNuances(
        promptState.characterActions,
        promptState.characterMood,
        promptState.language,
        promptState.model,
      );
      setPromptState({
        characterNuances: truncateText(suggestion, CHARACTER_LIMITS.characterNuances),
      });
      addToast(t('toasts:toastCharacterNuancesSuggested'), 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsSuggestingCharacterNuances(false);
    }
  }, [
    promptState.characterActions,
    promptState.characterMood,
    promptState.language,
    promptState.model,
    addToast,
    setPromptState,
    t,
    errorsBundle,
  ]);

  const handleSuggestVisualEffect = useCallback(async () => {
    const { artStyle, customArtStyle, characterMood, language, model } = promptState;
    if (artStyle === 'Custom' && !customArtStyle.trim()) {
      addToast(t('errors:errorCustomStyleRequired'), 'error');
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
        getVisualEffects(language).map((o) => o.value),
      );
      setPromptState({ visualEffect: suggestion });
      addToast(t('toasts:toastEffectSuggested'), 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsSuggestingEffect(false);
    }
  }, [promptState, setPromptState, addToast, t, errorsBundle]);

  const handleSuggestAdvancedSettings = useCallback(async () => {
    if (!promptState.idea.trim()) {
      addToast(t('errors:errorValidation'), 'error');
      return;
    }
    setIsSuggestingAdvanced(true);
    try {
      const lang = promptState.language;
      const suggestions = await geminiService.suggestAdvancedSettings(
        {
          idea: promptState.idea,
          environment: promptState.environment, // Added for better negative prompt suggestions
          characterActions: promptState.characterActions, // Added for better motion suggestions
          artStyle: promptState.artStyle,
          customArtStyle: promptState.customArtStyle,
          cameraMovement: promptState.cameraMovement,
          targetModel: promptState.targetModel,
        },
        promptState.language,
        promptState.model,
        {
          motionIntensity: getMotionIntensityOptions(lang).map((o) => o.value),
          creativityLevel: getCreativityLevelOptions(lang).map((o) => o.value),
        },
      );

      setPromptState({
        negativePrompt: truncateText(suggestions.negativePrompt, CHARACTER_LIMITS.negativePrompt),
        motionIntensity: suggestions.motionIntensity,
        creativityLevel: suggestions.creativityLevel,
      });

      addToast(t('toasts:toastAdvancedSuggested'), 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsSuggestingAdvanced(false);
    }
  }, [promptState, addToast, setPromptState, t, errorsBundle]);

  const handleSuggestArtStyles = useCallback(async () => {
    if (!promptState.customArtStyle.trim()) {
      addToast(t('errors:errorValidation'), 'error');
      return;
    }
    setIsSuggestingArtStyle(true);
    setArtStyleSuggestions([]);
    try {
      const suggestions = await geminiService.suggestArtStyles(
        promptState.customArtStyle,
        promptState.language,
        promptState.model,
      );
      setArtStyleSuggestions(suggestions);
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsSuggestingArtStyle(false);
    }
  }, [
    promptState.customArtStyle,
    promptState.language,
    promptState.model,
    addToast,
    t,
    errorsBundle,
  ]);

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
          promptState.model,
        );

        const safeClothing = (suggestions.clothingSuggestions || []).map((s: string) =>
          truncateText(s, 100),
        );
        const safeAccessories = (suggestions.accessorySuggestions || []).map((s: string) =>
          truncateText(s, 100),
        );

        setClothingSuggestions(safeClothing);
        setAccessorySuggestions(safeAccessories);
      } catch (_error) {
        setClothingSuggestions([]);
        setAccessorySuggestions([]);
      } finally {
        setIsSuggestingCharacterDetails(false);
      }
    }, 1000);
  }, [
    promptState.characterArchetype,
    promptState.environment,
    promptState.language,
    promptState.model,
  ]);

  const handleAnalyzeAudio = useCallback(async () => {
    if (!promptState.uploadedAudio) return;
    setIsAnalyzingAudio(true);
    try {
      const description = await geminiService.analyzeAudio(
        promptState.uploadedAudio.data,
        promptState.uploadedAudio.mimeType,
      );
      setPromptState({
        ambientSound: truncateText(description, 100),
      });
      addToast(t('toasts:toastAudioAnalyzed'), 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsAnalyzingAudio(false);
    }
  }, [promptState.uploadedAudio, setPromptState, addToast, t, errorsBundle]);

  const handleSuggestCameraSetup = useCallback(async () => {
    if (!promptState.idea.trim()) {
      addToast(t('errors:errorValidation'), 'error');
      return;
    }
    setIsSuggestingCamera(true);
    try {
      const lang = promptState.language;
      const suggestions = await geminiService.suggestCameraSetup(
        {
          idea: promptState.idea,
          artStyle:
            promptState.artStyle === 'Custom' ? promptState.customArtStyle : promptState.artStyle,
          mood: promptState.characterMood,
        },
        {
          movements: getCameraMovements(lang).map((o) => o.value),
          distances: getCameraDistances(lang).map((o) => o.value),
          lenses: getLensTypes(lang).map((o) => o.value),
          guides: getCompositionalGuides(lang).map((o) => o.value),
        },
        promptState.model,
      );

      if (suggestions.cameraMovement) {
        setPromptState({
          cameraMovement: suggestions.cameraMovement,
          cameraDistance: suggestions.cameraDistance,
          lensType: suggestions.lensType,
          compositionalGuide: suggestions.compositionalGuide,
        });
        addToast(t('toasts:toastCameraSuggested'), 'success');
      }
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsSuggestingCamera(false);
    }
  }, [promptState, addToast, setPromptState, t, errorsBundle]);

  const handleSuggestCharacterActions = useCallback(async () => {
    if (!promptState.idea.trim()) {
      addToast(t('errors:errorValidation'), 'error');
      return;
    }
    setIsSuggestingActions(true);
    try {
      const actionFlow = await geminiService.suggestCharacterActionFlow(
        {
          idea: promptState.idea,
          archetype: promptState.characterArchetype,
          environment: promptState.environment,
          mood: promptState.characterMood,
        },
        promptState.model,
      );

      if (actionFlow) {
        setPromptState({
          characterActions: truncateText(actionFlow, CHARACTER_LIMITS.characterActions),
        });
        addToast(t('toasts:toastActionsSuggested'), 'success');
      }
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsSuggestingActions(false);
    }
  }, [promptState, addToast, setPromptState, t, errorsBundle]);

  const handleRefinePrompt = useCallback(
    async (basePrompt: string) => {
      setIsRefining(true);
      try {
        const refinedPrompt = await geminiService.refinePrompt(basePrompt, promptState);
        setGeneratedPrompt((prev) => {
          const currentChunks = prev?.groundingChunks || [];
          return { prompt: refinedPrompt, groundingChunks: currentChunks };
        });
        addToast(t('toasts:toastPromptRefined'), 'success');
      } catch (error) {
        addToast(getApiErrorMessage(error, errorsBundle), 'error');
      } finally {
        setIsRefining(false);
      }
    },
    [promptState, addToast, setGeneratedPrompt, t, errorsBundle],
  );

  const handleRestructurePrompt = useCallback(
    async (currentPrompt: string) => {
      setIsRestructuring(true);
      try {
        const result = await geminiService.restructurePrompt(currentPrompt, promptState.model);
        setGeneratedPrompt((prev) => {
          const currentChunks = prev?.groundingChunks || [];
          return { prompt: result, groundingChunks: currentChunks };
        });
        addToast(t('toasts:toastPromptRestructured'), 'success');
      } catch (error) {
        addToast(getApiErrorMessage(error, errorsBundle), 'error');
      } finally {
        setIsRestructuring(false);
      }
    },
    [promptState.model, addToast, setGeneratedPrompt, t, errorsBundle],
  );

  const handleGenerateVisualDNA = useCallback(async () => {
    // Requires at least a generic concept
    if (promptState.characterArchetype === 'Any' && !promptState.characterClothing.trim()) {
      addToast('Please select an archetype or describe clothing first.', 'error');
      return;
    }

    setIsGeneratingVisualDNA(true);
    try {
      const dna = await geminiService.generateCharacterDNA(
        'Character', // Generic name unless we add a name field to main prompt state
        promptState.characterArchetype,
        promptState.characterSpecificClothing || promptState.characterClothing,
      );

      setPromptState({
        characterVisualDNA: truncateText(dna, CHARACTER_LIMITS.characterVisualDNA),
      });
      addToast('Visual DNA Generated', 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
    } finally {
      setIsGeneratingVisualDNA(false);
    }
  }, [promptState, addToast, setPromptState, errorsBundle]);

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
    isSuggestingCamera,
    isSuggestingActions,
    isRestructuring,
    isRefining,
    isGeneratingVisualDNA,

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
    handleSuggestCameraSetup,
    handleSuggestCharacterActions,
    handleRefinePrompt,
    handleRestructurePrompt,
    handleGenerateVisualDNA,
  };
};
