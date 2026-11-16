/**
 * useGenerationState Hook
 *
 * Encapsulates state and handlers for AI-powered generation features:
 * prompt variations, brainstorming, concept art, and storyboard generation.
 * Extracted from App.tsx to reduce component complexity.
 */

import { useState, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import type { PromptVariation, PromptState } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { useAppStore } from '@core/store/useAppStore';

interface UseGenerationStateOptions {
  promptState?: PromptState;
  addToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export function useGenerationState({ promptState, addToast }: UseGenerationStateOptions) {
  const { t, i18n } = useTranslation(['toasts', 'errors']);
  const errorsBundle = useMemo(
    () => (i18n.getResourceBundle(i18n.language, 'errors') || {}) as Record<string, string>,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i18n is a stable singleton; only language changes matter
    [i18n.language],
  );
  const store = useAppStore(
    useShallow((state) => ({
      openModal: state.openModal,
      closeModal: state.closeModal,
    })),
  );
  const getPromptState = useCallback(
    () => promptState ?? useAppStore.getState().promptState,
    [promptState],
  );

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
        const currentPrompt = getPromptState();
        const variations = await geminiService.generatePromptVariations(
          basePrompt,
          currentPrompt.language,
          currentPrompt.model,
          currentPrompt.targetModel,
        );
        setPromptVariations(variations);
      } catch (error) {
        addToast(getApiErrorMessage(error, errorsBundle), 'error');
        store.closeModal('isVariationsOpen');
      } finally {
        setIsGeneratingVariations(false);
      }
    },
    [getPromptState, addToast, errorsBundle, store],
  );

  const handleBrainstormIdeas = useCallback(async () => {
    setIsBrainstorming(true);
    setPromptVariations([]);
    store.openModal('isVariationsOpen');
    try {
      const currentPrompt = getPromptState();
      const ideas = await geminiService.suggestPromptIdeas(
        currentPrompt.idea,
        currentPrompt.language,
        currentPrompt.model,
      );
      setPromptVariations(ideas);
    } catch (error) {
      addToast(getApiErrorMessage(error, errorsBundle), 'error');
      store.closeModal('isVariationsOpen');
    } finally {
      setIsBrainstorming(false);
    }
  }, [getPromptState, addToast, errorsBundle, store]);

  const handleGenerateArt = useCallback(
    async (prompt: string) => {
      setIsGeneratingArt(true);
      setConceptArtImage(null);
      try {
        const currentPrompt = getPromptState();
        const imageUrl = await geminiService.generateConceptArt(prompt, {
          aspectRatio: currentPrompt.aspectRatio,
        });
        setConceptArtImage(imageUrl);
        addToast(t('toasts:toastArtGenerated'), 'success');
      } catch (error) {
        addToast(getApiErrorMessage(error, errorsBundle), 'error');
      } finally {
        setIsGeneratingArt(false);
      }
    },
    [getPromptState, addToast, t, errorsBundle],
  );

  const handleGenerateStoryboard = useCallback(
    async (prompt: string) => {
      setIsGeneratingStoryboard(true);
      setStoryboardImages([]);
      try {
        const currentPrompt = getPromptState();
        const images = await geminiService.generateStoryboard(prompt, currentPrompt.aspectRatio);
        setStoryboardImages(images);
        addToast(t('toasts:toastStoryboardGenerated'), 'success');
      } catch (error) {
        addToast(getApiErrorMessage(error, errorsBundle), 'error');
      } finally {
        setIsGeneratingStoryboard(false);
      }
    },
    [getPromptState, addToast, t, errorsBundle],
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
