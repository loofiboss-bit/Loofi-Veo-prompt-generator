import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
}));

// Mock logger
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock batchPromptService
const mockTemplates = [
  {
    id: 'tpl-1',
    name: 'Var Template',
    description: 'Has variables',
    icon: 'template',
    params: { idea: 'A {{SUBJECT}} in a {{PLACE}}' },
    category: 'general',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tpl-2',
    name: 'Static Template',
    description: 'No variables',
    icon: 'template',
    params: { idea: 'A static idea' },
    category: 'general',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

vi.mock('@core/services/batchPromptService', () => ({
  batchPromptService: {
    getTemplates: vi.fn(async () => mockTemplates),
    extractVariables: vi.fn((idea: string) => {
      const regex = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
      const names = new Set<string>();
      let match: RegExpExecArray | null;
      while ((match = regex.exec(idea)) !== null) {
        names.add(match[1]);
      }
      return Array.from(names);
    }),
    createEmptyMatrix: vi.fn((names: string[], count = 1) =>
      Array.from({ length: count }, () => {
        const row: Record<string, string> = {};
        names.forEach((n: string) => {
          row[n] = '';
        });
        return row;
      }),
    ),
    startBatch: vi.fn(async () => 'job-123'),
  },
}));

import { useBatchPromptStore } from './useBatchPromptStore';

describe('useBatchPromptStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useBatchPromptStore.getState().reset();
    useBatchPromptStore.setState({ isOpen: false, templates: [], isLoading: false });
  });

  it('should have correct initial state', () => {
    const state = useBatchPromptStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.selectedTemplateId).toBeNull();
    expect(state.variableNames).toEqual([]);
    expect(state.variableMatrix).toEqual([{}]);
    expect(state.activeJobId).toBeNull();
    expect(state.lastResult).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  describe('open', () => {
    it('should set isOpen and load templates', async () => {
      await useBatchPromptStore.getState().open();
      const state = useBatchPromptStore.getState();

      expect(state.isOpen).toBe(true);
      expect(state.templates.length).toBe(2);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('close', () => {
    it('should set isOpen to false', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().close();

      expect(useBatchPromptStore.getState().isOpen).toBe(false);
    });
  });

  describe('selectTemplate', () => {
    it('should extract variables and create empty matrix', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().selectTemplate('tpl-1');

      const state = useBatchPromptStore.getState();
      expect(state.selectedTemplateId).toBe('tpl-1');
      expect(state.variableNames).toContain('SUBJECT');
      expect(state.variableNames).toContain('PLACE');
      expect(state.variableMatrix.length).toBe(1);
      expect(state.variableMatrix[0]).toEqual({ SUBJECT: '', PLACE: '' });
    });

    it('should handle template with no variables', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().selectTemplate('tpl-2');

      const state = useBatchPromptStore.getState();
      expect(state.selectedTemplateId).toBe('tpl-2');
      expect(state.variableNames).toEqual([]);
    });

    it('should ignore non-existent template', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().selectTemplate('nonexistent');

      expect(useBatchPromptStore.getState().selectedTemplateId).toBeNull();
    });

    it('should clear lastResult when selecting a new template', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.setState({
        lastResult: {
          templateName: 'old',
          totalCount: 1,
          successCount: 1,
          failedCount: 0,
          results: [],
          durationMs: 100,
        },
      });

      useBatchPromptStore.getState().selectTemplate('tpl-1');
      expect(useBatchPromptStore.getState().lastResult).toBeNull();
    });
  });

  describe('updateVariable', () => {
    it('should update a specific cell in the matrix', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().selectTemplate('tpl-1');
      useBatchPromptStore.getState().updateVariable(0, 'SUBJECT', 'cat');

      const row = useBatchPromptStore.getState().variableMatrix[0];
      expect(row.SUBJECT).toBe('cat');
      expect(row.PLACE).toBe('');
    });

    it('should ignore out-of-bounds row index', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().selectTemplate('tpl-1');

      // Should not throw
      useBatchPromptStore.getState().updateVariable(99, 'SUBJECT', 'cat');
      expect(useBatchPromptStore.getState().variableMatrix.length).toBe(1);
    });
  });

  describe('addRow', () => {
    it('should add an empty row to the matrix', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().selectTemplate('tpl-1');
      useBatchPromptStore.getState().addRow();

      const matrix = useBatchPromptStore.getState().variableMatrix;
      expect(matrix.length).toBe(2);
      expect(matrix[1]).toEqual({ SUBJECT: '', PLACE: '' });
    });
  });

  describe('removeRow', () => {
    it('should remove a row by index', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().selectTemplate('tpl-1');
      useBatchPromptStore.getState().addRow();
      useBatchPromptStore.getState().updateVariable(0, 'SUBJECT', 'cat');
      useBatchPromptStore.getState().updateVariable(1, 'SUBJECT', 'dog');

      useBatchPromptStore.getState().removeRow(0);

      const matrix = useBatchPromptStore.getState().variableMatrix;
      expect(matrix.length).toBe(1);
      expect(matrix[0].SUBJECT).toBe('dog');
    });

    it('should keep at least one row', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().selectTemplate('tpl-1');

      useBatchPromptStore.getState().removeRow(0);

      expect(useBatchPromptStore.getState().variableMatrix.length).toBe(1);
    });
  });

  describe('startBatch', () => {
    it('should return null if no template selected', async () => {
      const jobId = await useBatchPromptStore.getState().startBatch();
      expect(jobId).toBeNull();
    });

    it('should return null if all rows are empty', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().selectTemplate('tpl-1');

      const jobId = await useBatchPromptStore.getState().startBatch();
      expect(jobId).toBeNull();
    });

    it('should start batch and set activeJobId', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().selectTemplate('tpl-1');
      useBatchPromptStore.getState().updateVariable(0, 'SUBJECT', 'cat');
      useBatchPromptStore.getState().updateVariable(0, 'PLACE', 'garden');

      const jobId = await useBatchPromptStore.getState().startBatch();
      expect(jobId).toBe('job-123');
      expect(useBatchPromptStore.getState().activeJobId).toBe('job-123');
    });
  });

  describe('setLastResult', () => {
    it('should set result and clear activeJobId', () => {
      useBatchPromptStore.setState({ activeJobId: 'job-123' });
      const result = {
        templateName: 'Test',
        totalCount: 2,
        successCount: 2,
        failedCount: 0,
        results: [],
        durationMs: 500,
      };

      useBatchPromptStore.getState().setLastResult(result);

      const state = useBatchPromptStore.getState();
      expect(state.lastResult).toEqual(result);
      expect(state.activeJobId).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all fields to defaults', async () => {
      await useBatchPromptStore.getState().open();
      useBatchPromptStore.getState().selectTemplate('tpl-1');
      useBatchPromptStore.getState().updateVariable(0, 'SUBJECT', 'cat');

      useBatchPromptStore.getState().reset();

      const state = useBatchPromptStore.getState();
      expect(state.selectedTemplateId).toBeNull();
      expect(state.variableNames).toEqual([]);
      expect(state.variableMatrix).toEqual([{}]);
      expect(state.activeJobId).toBeNull();
      expect(state.lastResult).toBeNull();
    });
  });
});
