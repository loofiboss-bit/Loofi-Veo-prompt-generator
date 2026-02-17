/**
 * useGenerationState Hook
 *
 * Encapsulates state and handlers for AI-powered generation features:
 * prompt variations, brainstorming, concept art, and storyboard generation.
 * Extracted from App.tsx to reduce component complexity.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PromptVariation, PromptState } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { useAppStore } from '@core/store/useAppStore';

interface UseGenerationStateOptions {
  promptState: PromptState;
  addToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export function useGenerationState({ promptState, addToast }: UseGenerationStateOptions) {
  const { t, i18n } = useTranslation(['toasts', 'errors']);
  const errorsBundle = useMemo(
    () =>
      (i18n.getResourceBundle(i18n.language, 'errors') || {}) as Record<
        string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any
      >,
    [i18n],
  );
  const store = useAppStore();

  const [promptVariations, setPromptVariations] = useState<PromptVariation[]>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [isBrainstorming, setIsBrainstorming] = useState(false);

  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [conceptArtImage, setConceptArtImage] = useState<string | null>(null);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboardImages, setStoryboardImages] = useState<string[]>([]);

  const handleGenerateVariations = useCallback(
    async (basePrompt: string) => {
      setIsGeneratingVariations(true);
      setIsBrainstorming(false);
      setPromptVariations([]);
      store.openModal('isVariationsOpen');
      try {
        const variations = await geminiService.generatePromptVariations(
          basePrompt,
          promptState.language,
          promptState.model,
          promptState.targetModel,
        );
        setPromptVariations(variations);
      } catch (error) {
        addToast(getApiErrorMessage(error, errorsBundle), 'error');
        store.closeModal('isVariationsOpen');
      } finally {
        setIsGeneratingVariations(false);
      }
    },
    [
      promptState.language,
      promptState.model,
      promptState.targetModel,
      addToast,
      errorsBundle,
      store,
    ],
  );

  const handleBrainstormIdeas = useCallback(async () => {
    setIsBrainstorming(true);
    setPromptVariations([]);
    store.openModal('isVariationsOpen');
    try {
      const ideas = await geminiService.suggestPromptIdeas(
        promptState.idea,
        promptState.language,
        promptState.model,
      );
      setPromptVariations(ideas);
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
      store.closeModal('isVariationsOpen');
    } finally {
      setIsBrainstorming(false);
    }
  }, [promptState.idea, promptState.language, promptState.model, addToast, errorsBundle, store]);

  const handleGenerateArt = useCallback(
    async (prompt: string) => {
      setIsGeneratingArt(true);
      setConceptArtImage(null);
      try {
        const imageUrl = await geminiService.generateConceptArt(prompt, {
          aspectRatio: promptState.aspectRatio,
        });
        setConceptArtImage(imageUrl);
        addToast(t('toasts:toastArtGenerated'), 'success');
      } catch (error) {
        addToast(getApiErrorMessage(error, errorsBundle), 'error');
      } finally {
        setIsGeneratingArt(false);
      }
    },
    [promptState.aspectRatio, addToast, t, errorsBundle],
  );

  const handleGenerateStoryboard = useCallback(
    async (prompt: string) => {
      setIsGeneratingStoryboard(true);
      setStoryboardImages([]);
      try {
        const images = await geminiService.generateStoryboard(prompt, promptState.aspectRatio);
        setStoryboardImages(images);
        addToast(t('toasts:toastStoryboardGenerated'), 'success');
      } catch (error) {
        addToast(getApiErrorMessage(error, errorsBundle), 'error');
      } finally {
        setIsGeneratingStoryboard(false);
      }
    },
    [promptState.aspectRatio, addToast, t, errorsBundle],
  );

  const resetGenerationState = useCallback(() => {
    setPromptVariations([]);
    setConceptArtImage(null);
    setStoryboardImages([]);
  }, []);

  return {
    promptVariations,
    setPromptVariations,
    isGeneratingVariations,
    isBrainstorming,
    isGeneratingArt,
    conceptArtImage,
    setConceptArtImage,
    isGeneratingStoryboard,
    storyboardImages,
    setStoryboardImages,
    handleGenerateVariations,
    handleBrainstormIdeas,
    handleGenerateArt,
    handleGenerateStoryboard,
    resetGenerationState,
  };
}
