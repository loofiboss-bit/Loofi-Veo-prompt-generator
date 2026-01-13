

import { useState, useCallback, useRef, useEffect } from 'react';
import { GenerationTask, ToastMessage } from '../types';
import * as geminiService from '../services/geminiService';
import { enforceLore } from '../services/promptBuilder';
import { getApiErrorMessage } from '../utils/errorHandler';
import { ApiError, ApiErrorType } from '../utils/apiErrors';
import { useAppStore } from '../store/useAppStore';

export const useVideoGeneration = (uiStrings: any, addToast: (message: string, type: ToastMessage['type']) => void) => {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const isMounted = useRef(true);
  
  // Access Series Bible from Store
  const { seriesBible } = useAppStore();

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const updateTask = (id: string, updates: Partial<GenerationTask>) => {
      if (!isMounted.current) return;
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const runGenerationTask = useCallback(async (task: GenerationTask) => {
      if (!task.prompt || !task.settings) return;
      
      try {
          updateTask(task.id, { status: 'Init' });
          
          // 1. Series Bible Logic Check (Lore Enforcement)
          let finalPrompt = task.prompt;
          if (seriesBible && seriesBible.trim()) {
              try {
                  const safePrompt = await enforceLore(task.prompt, seriesBible);
                  if (safePrompt !== task.prompt) {
                      finalPrompt = safePrompt;
                      // Update task with the corrected prompt so the user sees what was actually generated
                      updateTask(task.id, { prompt: finalPrompt }); 
                      if(isMounted.current) addToast("Lore Enforcement: Prompt auto-corrected to match Series Bible.", 'info');
                  }
              } catch (e) {
                  console.warn("Lore check skipped due to error", e);
              }
          }
          
          let operation = await geminiService.generateVideo(
              finalPrompt, 
              task.inputImage, // Pass the input image if present
              task.settings.aspectRatio, 
              task.settings.resolution, 
              task.settings.veoModel
          );
          
          updateTask(task.id, { status: 'Processing' });
          
          while (!operation.done) {
              if(!isMounted.current) return;
              await new Promise(r => setTimeout(r, 10000));
              updateTask(task.id, { status: 'Polling' });
              operation = await geminiService.pollVideoOperation(operation);
          }

          // Robust check for server-side operation errors
          if ((operation as any).error) {
              const err = (operation as any).error;
              throw new ApiError(err.message || "Video generation failed on server.", ApiErrorType.ServerError, err);
          }

          // Check for empty result or safety blocks
          const generatedVideos = operation.response?.generatedVideos;
          if (!generatedVideos || generatedVideos.length === 0) {
              // Check for safety filter block reason if available in response structure
              throw new ApiError("Video generation completed without results. The prompt may have been blocked by safety filters.", ApiErrorType.ContentBlocked);
          }

          const downloadLink = generatedVideos[0]?.video?.uri;
          if (downloadLink) {
              updateTask(task.id, { status: 'Fetching' });
              const url = await geminiService.fetchVideo(downloadLink);
              updateTask(task.id, { status: 'Complete', videoUrl: url });
              if(isMounted.current) addToast(uiStrings.toastVideoGenerated, 'success');
          } else {
              throw new ApiError("Video generation completed, but no download link was found.", ApiErrorType.ServerError);
          }

      } catch (error) {
          if(!isMounted.current) return;
          console.error("Video Generation Error:", error);
          const msg = getApiErrorMessage(error, uiStrings);
          updateTask(task.id, { status: 'Error', error: msg });
          addToast(msg, 'error');
      }
  }, [addToast, uiStrings, seriesBible]);

  // Queue Processing Effect
  useEffect(() => {
      const activeTask = tasks.find(t => ['Init', 'Processing', 'Polling', 'Fetching'].includes(t.status));
      if (activeTask) return; // Busy

      const nextTask = tasks.find(t => t.status === 'Queued');
      if (nextTask) {
          runGenerationTask(nextTask);
      }
  }, [tasks, runGenerationTask]);

  const addToQueue = useCallback((prompts: string[], settings: any, image?: { data: string; mimeType: string }) => {
      const newTasks: GenerationTask[] = prompts.map(p => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          status: 'Queued',
          videoUrl: null,
          prompt: p,
          settings: settings,
          inputImage: image
      }));
      setTasks(prev => [...prev, ...newTasks]);
      addToast(`Added ${prompts.length} tasks to queue`, 'info');
      // Return the ID of the first task created, useful for tracking in sequential logic
      return newTasks[0].id;
  }, [addToast]);

  const startGeneration = useCallback(async (
      prompt: string, 
      settings: { aspectRatio: string; resolution: '1080p' | '720p'; veoModel: 'fast' | 'quality'; count?: number },
      image?: { data: string; mimeType: string }
  ) => {
    const count = settings.count || 1;
    const prompts = Array(count).fill(prompt);
    return addToQueue(prompts, settings, image);
  }, [addToQueue]);

  const isAnyGenerating = tasks.some(t => ['Init', 'Processing', 'Polling', 'Fetching', 'Queued'].includes(t.status));

  return {
      tasks,
      startGeneration,
      addToQueue,
      isAnyGenerating
  };
};