

import { useState, useCallback, useRef, useEffect } from 'react';
import { GenerationTask, ToastMessage } from '../types';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { ApiError, ApiErrorType } from '../utils/apiErrors';

export const useVideoGeneration = (uiStrings: any, addToast: (message: string, type: ToastMessage['type']) => void) => {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const updateTask = (id: string, updates: Partial<GenerationTask>) => {
      if (!isMounted.current) return;
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const runGenerationTask = useCallback(async (taskId: string, prompt: string, settings: { aspectRatio: string; resolution: '1080p' | '720p'; veoModel: 'fast' | 'quality' }) => {
      try {
          updateTask(taskId, { status: 'Init' });
          let operation = await geminiService.generateVideo(
              prompt, 
              null, 
              settings.aspectRatio, 
              settings.resolution, 
              settings.veoModel
          );
          
          updateTask(taskId, { status: 'Processing' });
          
          while (!operation.done) {
              if(!isMounted.current) return;
              await new Promise(r => setTimeout(r, 10000));
              updateTask(taskId, { status: 'Polling' });
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
              // (Structure varies, but checking broadly for promptFeedback or simple empty state)
              throw new ApiError("Video generation completed without results. The prompt may have been blocked by safety filters.", ApiErrorType.ContentBlocked);
          }

          const downloadLink = generatedVideos[0]?.video?.uri;
          if (downloadLink) {
              updateTask(taskId, { status: 'Fetching' });
              const url = await geminiService.fetchVideo(downloadLink);
              updateTask(taskId, { status: 'Complete', videoUrl: url });
              if(isMounted.current) addToast(uiStrings.toastVideoGenerated, 'success');
          } else {
              throw new ApiError("Video generation completed, but no download link was found.", ApiErrorType.ServerError);
          }

      } catch (error) {
          if(!isMounted.current) return;
          console.error("Video Generation Error:", error);
          const msg = getApiErrorMessage(error, uiStrings);
          updateTask(taskId, { status: 'Error', error: msg });
          addToast(msg, 'error');
      }
  }, [addToast, uiStrings]);

  // Queue Processing Effect
  useEffect(() => {
      const activeTask = tasks.find(t => ['Init', 'Processing', 'Polling', 'Fetching'].includes(t.status));
      if (activeTask) return; // Busy

      const nextTask = tasks.find(t => t.status === 'Queued');
      if (nextTask && nextTask.prompt && nextTask.settings) {
          runGenerationTask(nextTask.id, nextTask.prompt, nextTask.settings);
      }
  }, [tasks, runGenerationTask]);

  const addToQueue = useCallback((prompts: string[], settings: any) => {
      const newTasks: GenerationTask[] = prompts.map(p => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          status: 'Queued',
          videoUrl: null,
          prompt: p,
          settings: settings
      }));
      setTasks(prev => [...prev, ...newTasks]);
      addToast(`Added ${prompts.length} tasks to queue`, 'info');
  }, [addToast]);

  const startGeneration = useCallback(async (prompt: string, settings: { aspectRatio: string; resolution: '1080p' | '720p'; veoModel: 'fast' | 'quality'; count?: number }) => {
    // Legacy single/multi start wrapper that pushes to queue
    const count = settings.count || 1;
    const prompts = Array(count).fill(prompt);
    addToQueue(prompts, settings);
  }, [addToQueue]);

  const isAnyGenerating = tasks.some(t => ['Init', 'Processing', 'Polling', 'Fetching', 'Queued'].includes(t.status));

  return {
      tasks,
      startGeneration,
      addToQueue,
      isAnyGenerating
  };
};
