
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

  const runGenerationTask = async (taskId: string, prompt: string, settings: { aspectRatio: string; resolution: '1080p' | '720p'; veoModel: 'fast' | 'quality' }) => {
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
  };

  const startGeneration = useCallback(async (prompt: string, settings: { aspectRatio: string; resolution: '1080p' | '720p'; veoModel: 'fast' | 'quality'; count?: number }) => {
    addToast(uiStrings.videoStatusProcessing || "Generation started...", 'info');
    
    const count = settings.count || 1;
    const newTasks: GenerationTask[] = Array.from({ length: count }).map(() => ({
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      status: 'Pending',
      videoUrl: null,
    }));

    setTasks(prev => [...newTasks, ...prev]);

    // Stagger starts slightly to avoid hitting immediate rate limits if calling concurrently
    newTasks.forEach((task, index) => {
        setTimeout(() => {
            runGenerationTask(task.id, prompt, settings);
        }, index * 500);
    });
  }, [uiStrings, addToast]);

  const isAnyGenerating = tasks.some(t => ['Init', 'Processing', 'Polling', 'Fetching', 'Pending'].includes(t.status));

  return {
      tasks,
      startGeneration,
      isAnyGenerating
  };
};
