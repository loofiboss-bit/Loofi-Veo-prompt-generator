/**
 * useGenerationState Hook
 *
 * Encapsulates state and handlers for AI-powered generation features:
 * prompt variations, brainstorming, concept art, and storyboard generation.
 * Extracted from App.tsx to reduce component complexity.
 */

import { useState, useCallback } from 'react';
import type { PromptVariation, PromptState } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { useAppStore } from '@core/store/useAppStore';

interface UseGenerationStateOptions {
  promptState: PromptState;
  addToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  t: Record<string, string | any>;
}

export function useGenerationState({ promptState, addToast, t }: UseGenerationStateOptions) {
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
        addToast(getApiErrorMessage(error, t), 'error');
        store.closeModal('isVariationsOpen');
      } finally {
        setIsGeneratingVariations(false);
      }
    },
    [promptState.language, promptState.model, promptState.targetModel, addToast, t, store],
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
      addToast(getApiErrorMessage(error, t), 'error');
      store.closeModal('isVariationsOpen');
    } finally {
      setIsBrainstorming(false);
    }
  }, [promptState.idea, promptState.language, promptState.model, addToast, t, store]);

  const handleGenerateArt = useCallback(
    async (prompt: string) => {
      setIsGeneratingArt(true);
      setConceptArtImage(null);
      try {
        const imageUrl = await geminiService.generateConceptArt(prompt, {
          aspectRatio: promptState.aspectRatio,
        });
        setConceptArtImage(imageUrl);
        addToast(t.toastArtGenerated, 'success');
      } catch (error) {
        addToast(getApiErrorMessage(error, t), 'error');
      } finally {
        setIsGeneratingArt(false);
      }
    },
    [promptState.aspectRatio, addToast, t],
  );

  const handleGenerateStoryboard = useCallback(
    async (prompt: string) => {
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
    },
    [promptState.aspectRatio, addToast, t],
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
