
import { useState, useCallback } from 'react';

export type StudioType = 
  | 'image' 
  | 'suno' 
  | 'video' 
  | 'analysis' 
  | 'pronunciation' 
  | 'compare' 
  | 'spatial' 
  | 'story'
  | null;

export const useStudios = () => {
  const [activeStudio, setActiveStudio] = useState<StudioType>(null);

  const open = useCallback((type: StudioType) => {
    setActiveStudio(type);
  }, []);

  const close = useCallback(() => {
    setActiveStudio(null);
  }, []);

  const toggle = useCallback((type: StudioType) => {
    setActiveStudio(prev => prev === type ? null : type);
  }, []);

  return {
    activeStudio,
    open,
    close,
    toggle,
    // Boolean helpers for cleaner rendering logic
    isImageOpen: activeStudio === 'image',
    isSunoOpen: activeStudio === 'suno',
    isVideoOpen: activeStudio === 'video',
    isAnalysisOpen: activeStudio === 'analysis',
    isPronunciationOpen: activeStudio === 'pronunciation',
    isCompareOpen: activeStudio === 'compare',
    isSpatialOpen: activeStudio === 'spatial',
    isStoryOpen: activeStudio === 'story',
  };
};
