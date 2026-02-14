import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
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

// Mock geminiService
vi.mock('./geminiService', () => ({
  generateVeoPrompt: vi.fn(async () => ({
    prompt: 'Generated prompt text',
    metadata: { model: 'test' },
  })),
}));

// Mock templateManager
const mockTemplates = [
  {
    id: 'tpl-1',
    name: 'Test Template',
    description: 'Template with variables',
    icon: 'template',
    params: { idea: 'A {{SUBJECT}} walking through a {{PLACE}}' },
    category: 'general',
    tags: ['test'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tpl-2',
    name: 'No Variables',
    description: 'Static template',
    icon: 'template',
    params: { idea: 'A static scene' },
    category: 'general',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

vi.mock('./templateManager', () => ({
  getUserTemplates: vi.fn(async () => mockTemplates),
}));

import { batchPromptService } from './batchPromptService';
import type { BatchConfig } from './batchPromptService';

describe('batchPromptService', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
  });

  it('should be a singleton', () => {
    expect(batchPromptService).toBeDefined();
  });

  describe('extractVariables', () => {
    it('should extract {{KEY}} placeholders', () => {
      const vars = batchPromptService.extractVariables('A {{SUBJECT}} in a {{PLACE}}');
      expect(vars).toContain('SUBJECT');
      expect(vars).toContain('PLACE');
      expect(vars.length).toBe(2);
    });

    it('should handle spaces in braces', () => {
      const vars = batchPromptService.extractVariables('{{ NAME }} likes {{ COLOR }}');
      expect(vars).toContain('NAME');
      expect(vars).toContain('COLOR');
    });

    it('should return empty array for no variables', () => {
      const vars = batchPromptService.extractVariables('Just a plain string');
      expect(vars).toEqual([]);
    });

    it('should return unique variable names', () => {
      const vars = batchPromptService.extractVariables('{{A}} and {{A}} again');
      expect(vars).toEqual(['A']);
    });

    it('should handle empty string', () => {
      const vars = batchPromptService.extractVariables('');
      expect(vars).toEqual([]);
    });

    it('should handle alphanumeric and underscore in names', () => {
      const vars = batchPromptService.extractVariables('{{var_1}} {{MY_VAR_2}}');
      expect(vars).toContain('var_1');
      expect(vars).toContain('MY_VAR_2');
    });
  });

  describe('createEmptyMatrix', () => {
    it('should create a matrix with correct shape', () => {
      const matrix = batchPromptService.createEmptyMatrix(['SUBJECT', 'PLACE'], 3);
      expect(matrix.length).toBe(3);
      expect(matrix[0]).toEqual({ SUBJECT: '', PLACE: '' });
      expect(matrix[2]).toEqual({ SUBJECT: '', PLACE: '' });
    });

    it('should default to 1 row', () => {
      const matrix = batchPromptService.createEmptyMatrix(['FOO']);
      expect(matrix.length).toBe(1);
      expect(matrix[0]).toEqual({ FOO: '' });
    });

    it('should handle empty variable names', () => {
      const matrix = batchPromptService.createEmptyMatrix([], 2);
      expect(matrix.length).toBe(2);
      expect(matrix[0]).toEqual({});
    });

    it('should create independent row objects', () => {
      const matrix = batchPromptService.createEmptyMatrix(['X'], 2);
      matrix[0]['X'] = 'modified';
      expect(matrix[1]['X']).toBe(''); // Other row unaffected
    });
  });

  describe('getTemplates', () => {
    it('should return templates from templateManager', async () => {
      const templates = await batchPromptService.getTemplates();
      expect(templates.length).toBe(2);
      expect(templates[0].name).toBe('Test Template');
    });
  });

  describe('startBatch', () => {
    it('should enqueue a batch job and return job id', async () => {
      const config: BatchConfig = {
        templateId: 'tpl-1',
        variableMatrix: [
          { SUBJECT: 'cat', PLACE: 'garden' },
          { SUBJECT: 'dog', PLACE: 'park' },
        ],
      };

      const jobId = await batchPromptService.startBatch(config);
      expect(typeof jobId).toBe('string');
      expect(jobId.startsWith('job-')).toBe(true);
    });

    it('should include template name in job label', async () => {
      const config: BatchConfig = {
        templateId: 'tpl-1',
        variableMatrix: [{ SUBJECT: 'cat', PLACE: 'garden' }],
      };

      const { jobQueueService } = await import('./jobQueueService');
      const jobId = await batchPromptService.startBatch(config);
      const job = jobQueueService.getJob(jobId);

      expect(job?.label).toContain('Test Template');
      expect(job?.label).toContain('1 variation');
    });

    it('should pluralize variations count', async () => {
      const config: BatchConfig = {
        templateId: 'tpl-1',
        variableMatrix: [
          { SUBJECT: 'a', PLACE: 'b' },
          { SUBJECT: 'c', PLACE: 'd' },
        ],
      };

      const { jobQueueService } = await import('./jobQueueService');
      const jobId = await batchPromptService.startBatch(config);
      const job = jobQueueService.getJob(jobId);

      expect(job?.label).toContain('2 variations');
    });

    it('should handle unknown template gracefully', async () => {
      const config: BatchConfig = {
        templateId: 'nonexistent',
        variableMatrix: [{ X: 'val' }],
      };

      const { jobQueueService } = await import('./jobQueueService');
      const jobId = await batchPromptService.startBatch(config);
      const job = jobQueueService.getJob(jobId);

      expect(job?.label).toContain('Unknown template');
    });
  });

  describe('register', () => {
    it('should be idempotent (safe to call multiple times)', () => {
      // register() is already called internally by startBatch
      // Calling it again should not throw
      expect(() => batchPromptService.register()).not.toThrow();
    });
  });
});
