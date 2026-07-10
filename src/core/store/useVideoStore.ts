import { create } from 'zustand';
import { GenerationTask } from '@core/types';

interface VideoState {
  tasks: GenerationTask[];
  isGenerating: boolean;

  // Actions
  setTasks: (tasks: GenerationTask[]) => void;
  addTask: (task: GenerationTask) => void;
  updateTask: (task: GenerationTask) => void;
  setIsGenerating: (isGenerating: boolean) => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  tasks: [],
  isGenerating: false,

  setTasks: (tasks) =>
    set({
      tasks,
      isGenerating: tasks.some((t) =>
        ['Processing', 'Polling', 'Queued', 'Pending', 'Init', 'Fetching', 'Submitting'].includes(
          t.status,
        ),
      ),
    }),

  addTask: (task) =>
    set((state) => {
      const newTasks = [task, ...state.tasks];
      return {
        tasks: newTasks,
        isGenerating: true,
      };
    }),

  updateTask: (updatedTask) =>
    set((state) => {
      const newTasks = state.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      return {
        tasks: newTasks,
        isGenerating: newTasks.some((t) =>
          ['Processing', 'Polling', 'Queued', 'Pending', 'Init', 'Fetching', 'Submitting'].includes(
            t.status,
          ),
        ),
      };
    }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),
}));
