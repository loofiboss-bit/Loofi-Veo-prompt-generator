
import { useState, useCallback, useRef, useEffect } from 'react';
import { GenerationTask, ToastMessage } from '../types';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';

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

          const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
          if (downloadLink) {
              updateTask(taskId, { status: 'Fetching' });
              const url = await geminiService.fetchVideo(downloadLink);
              updateTask(taskId, { status: 'Complete', videoUrl: url });
              if(isMounted.current) addToast(uiStrings.toastVideoGenerated, 'success');
          } else {
              throw new Error("Video generation completed, but no download link was found.");
          }

      } catch (error) {
          if(!isMounted.current) return;
          const msg = getApiErrorMessage(error, uiStrings);
          updateTask(taskId, { status: 'Error', error: msg });
          addToast(msg, 'error');
      }
  };

  const startGeneration = useCallback(async (prompt: string, settings: { aspectRatio: string; resolution: '1080p' | '720p'; veoModel: 'fast' | 'quality'; count?: number }) => {
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
  }, [uiStrings]);

  const isAnyGenerating = tasks.some(t => ['Init', 'Processing', 'Polling', 'Fetching', 'Pending'].includes(t.status));

  return {
      tasks,
      startGeneration,
      isAnyGenerating
  };
};
