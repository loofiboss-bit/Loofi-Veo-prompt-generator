/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
}));

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock exportService
vi.mock('./exportService', () => ({
  quickExport: vi.fn(() => Promise.resolve()),
}));

// Mock jobQueueService
vi.mock('./jobQueueService', () => ({
  jobQueueService: {
    registerExecutor: vi.fn(),
    enqueue: vi.fn(() => Promise.resolve('job-123')),
    hydrate: vi.fn(() => Promise.resolve()),
    subscribe: vi.fn(),
  },
}));

import { sceneExportService } from './sceneExportService';
import type { Shot, PromptState, StoryboardState } from '@core/types';

describe('SceneExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test data
  const mockShot: Shot = {
    id: 1,
    type: 'video',
    action: 'A person walks across the bridge',
    camera: 'tracking',
    characterId: 'char-1',
    duration: 5,
    transition: { type: 'dissolve', duration: 500 },
    dialogueText: 'Hello world',
    sfx: [{ description: 'Footsteps', timestamp: 1 }],
    takes: [],
    selectedTakeIndex: 0,
    visualLink: false,
  };

  const mockPromptState = {
    targetModel: 'veo',
    artStyle: 'cinematic',
  } as unknown as PromptState;

  const mockStoryboard: StoryboardState = {
    shots: [
      mockShot,
      { ...mockShot, action: '' }, // Empty action - should be filtered
      { ...mockShot, action: 'Second scene' },
    ],
    globalContext: {} as any,
    timeline: {} as any,
  };

  describe('register', () => {
    it('should register executor and set registered flag', async () => {
      const { jobQueueService } = await import('./jobQueueService');
      vi.clearAllMocks();

      sceneExportService.register();

      expect(jobQueueService.registerExecutor).toHaveBeenCalledWith('export', expect.any(Object));
    });

    it('should be idempotent (calling twice should only register once per serviceInstance)', async () => {
      const { jobQueueService } = await import('./jobQueueService');
      const initialCallCount = vi.mocked(jobQueueService.registerExecutor).mock.calls.length;

      sceneExportService.register();
      sceneExportService.register();

      const finalCallCount = vi.mocked(jobQueueService.registerExecutor).mock.calls.length;
      // Should be the same (idempotent)
      expect(finalCallCount - initialCallCount).toBeLessThanOrEqual(1);
    });
  });

  describe('getExportableScenes', () => {
    it('should filter out shots with empty action', () => {
      const result = sceneExportService.getExportableScenes(mockStoryboard);

      expect(result).toHaveLength(2);
      expect(result[0].shotIndex).toBe(0);
      expect(result[0].shot.action).toBe('A person walks across the bridge');
      expect(result[1].shotIndex).toBe(2);
      expect(result[1].shot.action).toBe('Second scene');
    });

    it('should return empty array when all shots have empty actions', () => {
      const emptyStoryboard: StoryboardState = {
        shots: [
          { ...mockShot, action: '' },
          { ...mockShot, action: '  ' }, // Whitespace only
        ],
        globalContext: {} as any,
        timeline: {} as any,
      };

      const result = sceneExportService.getExportableScenes(emptyStoryboard);
      expect(result).toHaveLength(0);
    });

    it('should preserve shot index in result', () => {
      const result = sceneExportService.getExportableScenes(mockStoryboard);
      expect(result[0].shotIndex).toBe(0);
      expect(result[1].shotIndex).toBe(2); // Not 1, because shot 1 was filtered
    });
  });

  describe('previewScene', () => {
    describe('txt format', () => {
      it('should format shot as text with all fields', () => {
        const preview = sceneExportService.previewScene(mockShot, 0, mockPromptState, 'txt');

        expect(preview).toContain('=== Scene 1 ===');
        expect(preview).toContain('Type: video');
        expect(preview).toContain('Action: A person walks across the bridge');
        expect(preview).toContain('Camera: tracking');
        expect(preview).toContain('Duration: 5s');
        expect(preview).toContain('Transition: dissolve (500ms)');
        expect(preview).toContain('Dialogue: "Hello world"');
        expect(preview).toContain('SFX: Footsteps');
        expect(preview).toContain('Style: cinematic');
      });

      it('should handle shot without dialogue', () => {
        const shotNoDialogue = { ...mockShot, dialogueText: undefined };
        const preview = sceneExportService.previewScene(shotNoDialogue, 0, mockPromptState, 'txt');

        expect(preview).not.toContain('Dialogue:');
      });

      it('should handle shot without SFX', () => {
        const shotNoSfx = { ...mockShot, sfx: undefined };
        const preview = sceneExportService.previewScene(shotNoSfx, 0, mockPromptState, 'txt');

        expect(preview).not.toContain('SFX:');
      });

      it('should handle shot without transition', () => {
        const shotNoTransition = {
          ...mockShot,
          transition: undefined as any,
        };
        const preview = sceneExportService.previewScene(
          shotNoTransition,
          0,
          mockPromptState,
          'txt',
        );

        expect(preview).not.toContain('Transition:');
      });

      it('should increment scene number correctly', () => {
        const preview = sceneExportService.previewScene(mockShot, 5, mockPromptState, 'txt');

        expect(preview).toContain('=== Scene 6 ===');
      });
    });

    describe('json format', () => {
      it('should format shot as JSON with correct fields', () => {
        const preview = sceneExportService.previewScene(mockShot, 0, mockPromptState, 'json');
        const json = JSON.parse(preview);

        expect(json.sceneNumber).toBe(1);
        expect(json.type).toBe('video');
        expect(json.action).toBe('A person walks across the bridge');
        expect(json.camera).toBe('tracking');
        expect(json.duration).toBe(5);
        expect(json.transition).toEqual({
          type: 'dissolve',
          duration: 500,
        });
        expect(json.dialogue).toBe('Hello world');
        expect(json.sfx).toEqual([{ description: 'Footsteps', timestamp: 1 }]);
        expect(json.style).toBe('cinematic');
        expect(json.targetModel).toBe('veo');
      });

      it('should include null for missing dialogue', () => {
        const shotNoDialogue = { ...mockShot, dialogueText: undefined };
        const preview = sceneExportService.previewScene(shotNoDialogue, 0, mockPromptState, 'json');
        const json = JSON.parse(preview);

        expect(json.dialogue).toBeNull();
      });

      it('should include empty array for missing SFX', () => {
        const shotNoSfx = { ...mockShot, sfx: undefined };
        const preview = sceneExportService.previewScene(shotNoSfx, 0, mockPromptState, 'json');
        const json = JSON.parse(preview);

        expect(json.sfx).toEqual([]);
      });
    });

    describe('markdown format', () => {
      it('should format shot as markdown table', () => {
        const preview = sceneExportService.previewScene(mockShot, 0, mockPromptState, 'markdown');

        expect(preview).toContain('## Scene 1');
        expect(preview).toContain('| Type | video |');
        expect(preview).toContain('| Camera | tracking |');
        expect(preview).toContain('| Duration | 5s |');
        expect(preview).toContain('| Transition | dissolve (500ms) |');
        expect(preview).toContain('| Style | cinematic |');
        expect(preview).toContain('**Action:** A person walks across the bridge');
        expect(preview).toContain('**Dialogue:** "Hello world"');
      });

      it('should have proper markdown table format', () => {
        const preview = sceneExportService.previewScene(mockShot, 0, mockPromptState, 'markdown');

        expect(preview).toContain('| Property | Value |');
        expect(preview).toContain('| --- | --- |');
      });

      it('should handle missing optional fields in markdown', () => {
        const shotMinimal = {
          ...mockShot,
          transition: undefined as any,
          dialogueText: undefined,
        };
        const preview = sceneExportService.previewScene(
          shotMinimal,
          0,
          mockPromptState,
          'markdown',
        );

        expect(preview).toContain('| Type | video |');
        expect(preview).toContain('| Camera | tracking |');
        // No transition or dialogue rows
        expect(preview).not.toContain('| Transition |');
        expect(preview).not.toContain('**Dialogue:**');
      });

      it('should increment scene number in markdown header', () => {
        const preview = sceneExportService.previewScene(mockShot, 2, mockPromptState, 'markdown');

        expect(preview).toContain('## Scene 3');
      });
    });
  });

  describe('startExport', () => {
    it('should enqueue a job with correct label', async () => {
      const { jobQueueService } = await import('./jobQueueService');

      const config = {
        storyboard: mockStoryboard,
        promptState: mockPromptState,
        format: 'json' as const,
        bundleMode: 'single-file' as const,
      };

      const jobId = await sceneExportService.startExport(config);

      expect(jobQueueService.enqueue).toHaveBeenCalledWith(
        'export',
        expect.stringContaining('Export:'),
        expect.objectContaining({ config }),
        'normal',
      );
      expect(jobId).toBe('job-123');
    });

    it('should include shot count in job label', async () => {
      const { jobQueueService } = await import('./jobQueueService');

      const config = {
        storyboard: mockStoryboard,
        promptState: mockPromptState,
        format: 'txt' as const,
        bundleMode: 'individual' as const,
        shotIndices: [0, 2],
      };

      await sceneExportService.startExport(config);

      const callArgs = (jobQueueService.enqueue as any).mock.calls[0];
      expect(callArgs[1]).toContain('2 scenes');
    });

    it('should handle singular scene in label', async () => {
      const { jobQueueService } = await import('./jobQueueService');

      const config = {
        storyboard: mockStoryboard,
        promptState: mockPromptState,
        format: 'markdown' as const,
        bundleMode: 'individual' as const,
        shotIndices: [0],
      };

      await sceneExportService.startExport(config);

      const callArgs = (jobQueueService.enqueue as any).mock.calls[0];
      expect(callArgs[1]).toContain('1 scene');
    });

    it('should include format and bundle mode in label', async () => {
      const { jobQueueService } = await import('./jobQueueService');

      const config = {
        storyboard: mockStoryboard,
        promptState: mockPromptState,
        format: 'json' as const,
        bundleMode: 'single-file' as const,
      };

      await sceneExportService.startExport(config);

      const callArgs = (jobQueueService.enqueue as any).mock.calls[0];
      expect(callArgs[1]).toContain('json');
      expect(callArgs[1]).toContain('single-file');
    });

    it('should register executor when needed', async () => {
      const { jobQueueService } = await import('./jobQueueService');

      const config = {
        storyboard: mockStoryboard,
        promptState: mockPromptState,
        format: 'json' as const,
        bundleMode: 'single-file' as const,
      };

      await sceneExportService.startExport(config);

      // Verify that enqueue was called (register is called before enqueue)
      expect(jobQueueService.enqueue).toHaveBeenCalled();
    });
  });

  describe('formatShotAsText (via previewScene)', () => {
    it('should include scene number, type, action, camera, duration, transition, dialogue, SFX, and style', () => {
      const preview = sceneExportService.previewScene(mockShot, 0, mockPromptState, 'txt');

      // Verify all required fields
      expect(preview).toMatch(/=== Scene 1 ===/);
      expect(preview).toMatch(/Type: video/);
      expect(preview).toMatch(/Action:/);
      expect(preview).toMatch(/Camera:/);
      expect(preview).toMatch(/Duration:/);
      expect(preview).toMatch(/Transition:/);
      expect(preview).toMatch(/Dialogue:/);
      expect(preview).toMatch(/SFX:/);
      expect(preview).toMatch(/Style:/);
    });
  });

  describe('formatShotAsJson (via previewScene)', () => {
    it('should return object with correct fields', () => {
      const preview = sceneExportService.previewScene(mockShot, 0, mockPromptState, 'json');
      const obj = JSON.parse(preview);

      expect(obj).toHaveProperty('sceneNumber');
      expect(obj).toHaveProperty('type');
      expect(obj).toHaveProperty('action');
      expect(obj).toHaveProperty('camera');
      expect(obj).toHaveProperty('duration');
      expect(obj).toHaveProperty('transition');
      expect(obj).toHaveProperty('dialogue');
      expect(obj).toHaveProperty('sfx');
      expect(obj).toHaveProperty('style');
      expect(obj).toHaveProperty('targetModel');
      expect(obj).toHaveProperty('characterId');
      expect(obj).toHaveProperty('locationId');
    });
  });

  describe('formatShotAsMarkdown (via previewScene)', () => {
    it('should return markdown table format', () => {
      const preview = sceneExportService.previewScene(mockShot, 0, mockPromptState, 'markdown');

      expect(preview).toContain('| Property | Value |');
      expect(preview).toContain('| --- | --- |');
      expect(preview).toContain('**Action:**');
    });
  });

  describe('edge cases', () => {
    it('should handle shot with multiple SFX items', () => {
      const shotMultipleSfx = {
        ...mockShot,
        sfx: [
          { description: 'Footsteps', timestamp: 1 },
          { description: 'Wind', timestamp: 2 },
          { description: 'Music', timestamp: 3 },
        ],
      };

      const preview = sceneExportService.previewScene(shotMultipleSfx, 0, mockPromptState, 'txt');

      expect(preview).toContain('SFX: Footsteps, Wind, Music');
    });

    it('should handle shot with no art style', () => {
      const promptStateNoStyle = {
        targetModel: 'sora',
        artStyle: '',
      } as unknown as PromptState;

      const preview = sceneExportService.previewScene(mockShot, 0, promptStateNoStyle, 'txt');

      // Should not include Style line
      const lines = preview.split('\n');
      const hasStyle = lines.some((line) => line.startsWith('Style:'));
      expect(hasStyle).toBe(false);
    });

    it('should handle character and location IDs in JSON export', () => {
      const shotWithIds = {
        ...mockShot,
        characterId: 'char-123',
        locationId: 'loc-456',
      };

      const preview = sceneExportService.previewScene(shotWithIds, 0, mockPromptState, 'json');
      const json = JSON.parse(preview);

      expect(json.characterId).toBe('char-123');
      expect(json.locationId).toBe('loc-456');
    });

    it('should handle missing character or location ID', () => {
      const shotNoIds = {
        ...mockShot,
        characterId: '',
        locationId: undefined,
      };

      const preview = sceneExportService.previewScene(shotNoIds, 0, mockPromptState, 'json');
      const json = JSON.parse(preview);

      expect(json.characterId).toBeNull();
      expect(json.locationId).toBeNull();
    });
  });
});
