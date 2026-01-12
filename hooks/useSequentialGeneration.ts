
import { useState, useCallback, useRef } from 'react';
import { Shot, GenerationTask } from '../types';
import { extractLastFrame } from '../utils/videoUtils';

interface UseSequentialGenerationProps {
    shots: Shot[];
    setShots: (shots: Shot[]) => void;
    tasks: GenerationTask[];
    startGeneration: (
        prompt: string, 
        settings: { aspectRatio: string; resolution: '1080p' | '720p'; veoModel: 'fast' | 'quality'; count?: number },
        image?: { data: string; mimeType: string }
    ) => Promise<string>; // Returns task ID
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const useSequentialGeneration = ({ 
    shots, setShots, tasks, startGeneration, addToast 
}: UseSequentialGenerationProps) => {
    const [isSequencing, setIsSequencing] = useState(false);
    const abortController = useRef<AbortController | null>(null);

    // Helper to find a completed task by ID and get its video URL
    const getTaskResult = (taskId: string): string | null => {
        const task = tasks.find(t => t.id === taskId);
        return (task && task.status === 'Complete') ? task.videoUrl : null;
    };

    const waitForTaskCompletion = async (taskId: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (abortController.current?.signal.aborted) {
                    clearInterval(checkInterval);
                    reject(new Error("Sequence Aborted"));
                    return;
                }

                // Look up task in the *current* state via the tasks prop reference wouldn't work 
                // because of closure staleness if we just used `tasks`.
                // However, since this is a loop inside a useEffect/callback, we need a way to peek at the latest tasks.
                // In React hooks, polling usually requires ref or dependency on `tasks`.
                // A cleaner way for this imperative flow is to rely on the external tasks array passed to the hook
                // but we can't 'poll' a prop easily in a loop without re-renders.
                
                // SOLUTION: We'll actually pass a ref to the tasks from the parent, or check the task list via a functional state update trick? No.
                // We'll trust the parent to update `tasks`. But this logic sits inside `startSequence`. 
                // To solve stale closures, we can use a ref for tasks.
            }, 1000);
        });
        // Note: Implementing a robust polling mechanism inside a hook for *another* hook's state is tricky.
        // Instead, we will break the sequence into a "useEffect" chain.
    };

    // We'll use an effect-based state machine for robustness
    const [currentShotIndex, setCurrentShotIndex] = useState<number>(-1);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [promptsList, setPromptsList] = useState<string[]>([]);
    
    const startSequence = useCallback((prompts: string[]) => {
        if (prompts.length === 0) return;
        setPromptsList(prompts);
        setCurrentShotIndex(0);
        setIsSequencing(true);
        abortController.current = new AbortController();
    }, []);

    const stopSequence = useCallback(() => {
        setIsSequencing(false);
        setCurrentShotIndex(-1);
        setCurrentTaskId(null);
        if (abortController.current) {
            abortController.current.abort();
        }
    }, []);

    // The Sequencer Effect
    // Watch tasks, currentShotIndex, and isSequencing
    React.useEffect(() => {
        if (!isSequencing || currentShotIndex === -1 || currentShotIndex >= promptsList.length) {
            if (isSequencing && currentShotIndex >= promptsList.length) {
                addToast("Sequence Generation Complete!", 'success');
                setIsSequencing(false);
            }
            return;
        }

        const processShot = async () => {
            const shot = shots[currentShotIndex];
            const prompt = promptsList[currentShotIndex];

            // If we already have a task ID for this index, check if it's done
            if (currentTaskId) {
                const task = tasks.find(t => t.id === currentTaskId);
                
                if (task) {
                    if (task.status === 'Complete' && task.videoUrl) {
                        // Task Finished!
                        // 1. Update the Shot with the video URL
                        const updatedShots = [...shots];
                        updatedShots[currentShotIndex] = { ...updatedShots[currentShotIndex], generatedVideoUrl: task.videoUrl };
                        setShots(updatedShots);

                        // 2. Move to next index
                        setCurrentTaskId(null);
                        setCurrentShotIndex(prev => prev + 1);
                    } else if (task.status === 'Error') {
                        // Stop on error
                        addToast(`Sequence failed at shot ${currentShotIndex + 1}: ${task.error}`, 'error');
                        setIsSequencing(false);
                    }
                }
                return;
            }

            // If no task ID, we need to START this shot
            try {
                let inputImage = undefined;

                // Visual Link Logic
                if (currentShotIndex > 0 && shot.visualLink) {
                    const prevShot = shots[currentShotIndex - 1];
                    if (prevShot.generatedVideoUrl) {
                        addToast(`Linking visual from Shot ${currentShotIndex}...`, 'info');
                        try {
                            inputImage = await extractLastFrame(prevShot.generatedVideoUrl);
                        } catch (e) {
                            console.warn("Failed to extract frame, continuing without link", e);
                            addToast(`Frame extraction failed for Shot ${currentShotIndex}. Proceeding without link.`, 'error');
                        }
                    } else {
                        // Previous shot finished but has no URL? Should have been caught by 'Error' check above.
                        console.warn("Previous shot has no URL for linking.");
                    }
                }

                // Start Generation
                // We assume standard settings for now, can be parameterized
                const taskId = await startGeneration(prompt, {
                    aspectRatio: '16:9', // Default, should ideally come from global config
                    resolution: '720p',
                    veoModel: 'fast',
                    count: 1
                }, inputImage);

                setCurrentTaskId(taskId);

            } catch (e) {
                console.error("Failed to start generation", e);
                setIsSequencing(false);
            }
        };

        // Poll every 1s if we are waiting for a task, or run immediately if we need to start one
        const timer = setInterval(processShot, 1000);
        return () => clearInterval(timer);

    }, [isSequencing, currentShotIndex, currentTaskId, tasks, promptsList, shots, setShots, startGeneration, addToast]);

    return {
        isSequencing,
        startSequence,
        stopSequence,
        currentShotIndex
    };
};

import React from 'react';
