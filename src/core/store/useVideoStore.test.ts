import { describe, it, expect, beforeEach } from 'vitest';
import { useVideoStore } from './useVideoStore';
import type { GenerationTask } from '@core/types';

describe('useVideoStore', () => {
  const mockTask1: GenerationTask = {
    id: 'task-1',
    timestamp: Date.now(),
    status: 'Processing',
    videoUrl: null,
    proxyUrl: null,
    prompt: 'A cat walking',
    settings: { duration: 5 },
  };

  const mockTask2: GenerationTask = {
    id: 'task-2',
    timestamp: Date.now(),
    status: 'Complete',
    videoUrl: 'https://example.com/video.mp4',
    proxyUrl: 'https://example.com/proxy.mp4',
    prompt: 'A dog running',
    settings: { duration: 10 },
  };

  const mockTask3: GenerationTask = {
    id: 'task-3',
    timestamp: Date.now(),
    status: 'Error',
    videoUrl: null,
    proxyUrl: null,
    prompt: 'A bird flying',
    settings: {},
  };

  beforeEach(() => {
    // Reset store to initial state
    useVideoStore.setState({
      tasks: [],
      isGenerating: false,
    });
  });

  it('should have correct initial state', () => {
    const state = useVideoStore.getState();
    expect(state.tasks).toEqual([]);
    expect(state.isGenerating).toBe(false);
  });

  describe('setTasks', () => {
    it('should set tasks and update isGenerating when there are active tasks', () => {
      useVideoStore.getState().setTasks([mockTask1, mockTask2]);

      const state = useVideoStore.getState();
      expect(state.tasks).toEqual([mockTask1, mockTask2]);
      expect(state.isGenerating).toBe(true); // mockTask1 is 'Processing'
    });

    it('should set isGenerating to false when all tasks are complete', () => {
      useVideoStore.getState().setTasks([mockTask2, mockTask3]);

      const state = useVideoStore.getState();
      expect(state.tasks).toEqual([mockTask2, mockTask3]);
      expect(state.isGenerating).toBe(false);
    });

    it('should handle empty tasks array', () => {
      useVideoStore.setState({ tasks: [mockTask1], isGenerating: true });
      useVideoStore.getState().setTasks([]);

      const state = useVideoStore.getState();
      expect(state.tasks).toEqual([]);
      expect(state.isGenerating).toBe(false);
    });

    it('should detect Queued status as generating', () => {
      const queuedTask: GenerationTask = {
        ...mockTask1,
        status: 'Queued',
      };
      useVideoStore.getState().setTasks([queuedTask]);

      expect(useVideoStore.getState().isGenerating).toBe(true);
    });

    it('should detect Polling status as generating', () => {
      const pollingTask: GenerationTask = {
        ...mockTask1,
        status: 'Polling',
      };
      useVideoStore.getState().setTasks([pollingTask]);

      expect(useVideoStore.getState().isGenerating).toBe(true);
    });

    it('should detect Pending status as generating', () => {
      const pendingTask: GenerationTask = {
        ...mockTask1,
        status: 'Pending',
      };
      useVideoStore.getState().setTasks([pendingTask]);

      expect(useVideoStore.getState().isGenerating).toBe(true);
    });

    it('should detect Init status as generating', () => {
      const initTask: GenerationTask = {
        ...mockTask1,
        status: 'Init',
      };
      useVideoStore.getState().setTasks([initTask]);

      expect(useVideoStore.getState().isGenerating).toBe(true);
    });

    it('should detect Fetching status as generating', () => {
      const fetchingTask: GenerationTask = {
        ...mockTask1,
        status: 'Fetching',
      };
      useVideoStore.getState().setTasks([fetchingTask]);

      expect(useVideoStore.getState().isGenerating).toBe(true);
    });

    it('should handle mixed task statuses', () => {
      const tasks = [
        mockTask2, // Complete
        mockTask1, // Processing
        mockTask3, // Error
      ];
      useVideoStore.getState().setTasks(tasks);

      expect(useVideoStore.getState().isGenerating).toBe(true);
    });
  });

  describe('addTask', () => {
    it('should add a task to the beginning of the list', () => {
      useVideoStore.setState({ tasks: [mockTask2] });
      useVideoStore.getState().addTask(mockTask1);

      const state = useVideoStore.getState();
      expect(state.tasks).toEqual([mockTask1, mockTask2]);
    });

    it('should set isGenerating to true when adding a task', () => {
      useVideoStore.getState().addTask(mockTask1);

      const state = useVideoStore.getState();
      expect(state.isGenerating).toBe(true);
    });

    it('should add task to empty list', () => {
      useVideoStore.getState().addTask(mockTask1);

      const state = useVideoStore.getState();
      expect(state.tasks).toEqual([mockTask1]);
      expect(state.isGenerating).toBe(true);
    });

    it('should maintain order when adding multiple tasks', () => {
      useVideoStore.getState().addTask(mockTask1);
      useVideoStore.getState().addTask(mockTask2);
      useVideoStore.getState().addTask(mockTask3);

      const state = useVideoStore.getState();
      expect(state.tasks).toEqual([mockTask3, mockTask2, mockTask1]);
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', () => {
      useVideoStore.setState({ tasks: [mockTask1, mockTask2] });

      const updatedTask: GenerationTask = {
        ...mockTask1,
        status: 'Complete',
        videoUrl: 'https://example.com/completed.mp4',
      };

      useVideoStore.getState().updateTask(updatedTask);

      const state = useVideoStore.getState();
      expect(state.tasks[0]).toEqual(updatedTask);
      expect(state.tasks[1]).toEqual(mockTask2);
    });

    it('should update isGenerating when task completes', () => {
      useVideoStore.setState({ tasks: [mockTask1], isGenerating: true });

      const completedTask: GenerationTask = {
        ...mockTask1,
        status: 'Complete',
        videoUrl: 'https://example.com/completed.mp4',
      };

      useVideoStore.getState().updateTask(completedTask);

      expect(useVideoStore.getState().isGenerating).toBe(false);
    });

    it('should keep isGenerating true if other tasks are still active', () => {
      const activeTask: GenerationTask = {
        id: 'task-active',
        timestamp: Date.now(),
        status: 'Queued',
        videoUrl: null,
        proxyUrl: null,
        prompt: 'Test',
        settings: {},
      };

      useVideoStore.setState({ tasks: [mockTask1, activeTask] });

      const completedTask: GenerationTask = {
        ...mockTask1,
        status: 'Complete',
        videoUrl: 'https://example.com/completed.mp4',
      };

      useVideoStore.getState().updateTask(completedTask);

      expect(useVideoStore.getState().isGenerating).toBe(true);
    });

    it('should not modify other tasks when updating one', () => {
      useVideoStore.setState({ tasks: [mockTask1, mockTask2, mockTask3] });

      const updatedTask: GenerationTask = {
        ...mockTask2,
        status: 'Error',
      };

      useVideoStore.getState().updateTask(updatedTask);

      const state = useVideoStore.getState();
      expect(state.tasks[0]).toEqual(mockTask1);
      expect(state.tasks[2]).toEqual(mockTask3);
    });

    it('should handle updating nonexistent task gracefully', () => {
      useVideoStore.setState({ tasks: [mockTask1] });

      const nonexistentTask: GenerationTask = {
        id: 'nonexistent',
        timestamp: Date.now(),
        status: 'Complete',
        videoUrl: null,
        prompt: 'Test',
        settings: {},
      };

      useVideoStore.getState().updateTask(nonexistentTask);

      // Original task should remain unchanged
      expect(useVideoStore.getState().tasks).toEqual([mockTask1]);
    });

    it('should update task status from Processing to Error', () => {
      useVideoStore.setState({ tasks: [mockTask1] });

      const errorTask: GenerationTask = {
        ...mockTask1,
        status: 'Error',
      };

      useVideoStore.getState().updateTask(errorTask);

      const state = useVideoStore.getState();
      expect(state.tasks[0].status).toBe('Error');
      expect(state.isGenerating).toBe(false);
    });
  });

  describe('setIsGenerating', () => {
    it('should set isGenerating to true', () => {
      useVideoStore.getState().setIsGenerating(true);

      expect(useVideoStore.getState().isGenerating).toBe(true);
    });

    it('should set isGenerating to false', () => {
      useVideoStore.setState({ isGenerating: true });
      useVideoStore.getState().setIsGenerating(false);

      expect(useVideoStore.getState().isGenerating).toBe(false);
    });

    it('should not affect tasks', () => {
      useVideoStore.setState({ tasks: [mockTask1, mockTask2] });
      useVideoStore.getState().setIsGenerating(false);

      const state = useVideoStore.getState();
      expect(state.tasks).toEqual([mockTask1, mockTask2]);
    });
  });

  describe('edge cases', () => {
    it('should handle task with all possible active statuses', () => {
      const activeStatuses: GenerationTask['status'][] = [
        'Processing',
        'Polling',
        'Queued',
        'Pending',
        'Init',
        'Fetching',
      ];

      activeStatuses.forEach((status) => {
        const task: GenerationTask = {
          id: `task-${status}`,
          timestamp: Date.now(),
          status,
          videoUrl: null,
          prompt: 'Test',
          settings: {},
        };

        useVideoStore.getState().setTasks([task]);
        expect(useVideoStore.getState().isGenerating).toBe(true);
      });
    });

    it('should handle task with terminal statuses', () => {
      const terminalStatuses: GenerationTask['status'][] = ['Complete', 'Error'];

      terminalStatuses.forEach((status) => {
        const task: GenerationTask = {
          id: `task-${status}`,
          timestamp: Date.now(),
          status,
          videoUrl: null,
          prompt: 'Test',
          settings: {},
        };

        useVideoStore.getState().setTasks([task]);
        expect(useVideoStore.getState().isGenerating).toBe(false);
      });
    });

    it('should handle large number of tasks', () => {
      const tasks: GenerationTask[] = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        timestamp: Date.now(),
        status: (i % 2 === 0 ? 'Complete' : 'Processing') as GenerationTask['status'],
        videoUrl: null,
        prompt: `Task ${i}`,
        settings: {},
      }));

      useVideoStore.getState().setTasks(tasks);

      const state = useVideoStore.getState();
      expect(state.tasks.length).toBe(100);
      expect(state.isGenerating).toBe(true); // At least one Processing task
    });
  });
});
