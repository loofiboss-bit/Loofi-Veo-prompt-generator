import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval before importing the service
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    mockStore.delete(key);
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

import {
  getUserTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
  createTemplateFromState,
  exportTemplates,
  importTemplates,
  searchTemplates,
  getTemplatesByCategory,
  duplicateTemplate,
} from './templateManager';
import type { PromptState } from '@core/types';

const createMockTemplate = (overrides = {}) => ({
  id: 'test-1',
  name: 'Test Template',
  description: 'A test template',
  icon: 'template' as const,
  params: { idea: 'test idea' },
  category: 'general',
  tags: ['test'],
  ...overrides,
});

describe('templateManager', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
  });

  describe('getUserTemplates', () => {
    it('should return empty array when no templates exist', async () => {
      const templates = await getUserTemplates();
      expect(templates).toEqual([]);
    });

    it('should return saved templates sorted by updatedAt desc', async () => {
      await saveTemplate(createMockTemplate({ id: 'a', name: 'Old' }));
      // Small delay to ensure different timestamps
      await saveTemplate(createMockTemplate({ id: 'b', name: 'New' }));

      const templates = await getUserTemplates();
      expect(templates.length).toBe(2);
      // Latest should come first
      expect(templates[0].updatedAt).toBeGreaterThanOrEqual(templates[1].updatedAt);
    });
  });

  describe('getTemplate', () => {
    it('should return null for non-existent template', async () => {
      const template = await getTemplate('missing');
      expect(template).toBeNull();
    });

    it('should return a saved template by ID', async () => {
      await saveTemplate(createMockTemplate({ id: 'find-me', name: 'Find Me' }));
      const template = await getTemplate('find-me');
      expect(template).not.toBeNull();
      expect(template!.name).toBe('Find Me');
    });
  });

  describe('saveTemplate', () => {
    it('should save a new template with timestamps', async () => {
      const result = await saveTemplate(createMockTemplate());
      expect(result.createdAt).toBeGreaterThan(0);
      expect(result.updatedAt).toBeGreaterThan(0);
      expect(result.isUserCreated).toBe(true);
    });

    it('should update an existing template preserving createdAt', async () => {
      const first = await saveTemplate(createMockTemplate({ id: 'update-me' }));
      const createdAt = first.createdAt;

      const updated = await saveTemplate(
        createMockTemplate({ id: 'update-me', name: 'Updated Name' }),
      );
      expect(updated.createdAt).toBe(createdAt);
      expect(updated.name).toBe('Updated Name');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(first.updatedAt);
    });

    it('should add template ID to the list', async () => {
      await saveTemplate(createMockTemplate({ id: 'listed' }));
      const list = mockStore.get('user-templates-list') as string[];
      expect(list).toContain('listed');
    });

    it('should not duplicate ID in list on update', async () => {
      await saveTemplate(createMockTemplate({ id: 'no-dup' }));
      await saveTemplate(createMockTemplate({ id: 'no-dup', name: 'Updated' }));
      const list = mockStore.get('user-templates-list') as string[];
      expect(list.filter((id) => id === 'no-dup').length).toBe(1);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template and remove from list', async () => {
      await saveTemplate(createMockTemplate({ id: 'del-me' }));
      await deleteTemplate('del-me');

      const template = await getTemplate('del-me');
      expect(template).toBeNull();

      const list = mockStore.get('user-templates-list') as string[];
      expect(list).not.toContain('del-me');
    });
  });

  describe('createTemplateFromState', () => {
    it('should create a template object from prompt state', () => {
      const state = { idea: 'sunset scene', artStyle: 'cinematic' } as PromptState;
      const result = createTemplateFromState('Sunset', 'A sunset template', state, {
        category: 'nature',
        tags: ['sunset'],
      });

      expect(result.name).toBe('Sunset');
      expect(result.description).toBe('A sunset template');
      expect(result.id).toMatch(/^custom-/);
      expect(result.category).toBe('nature');
      expect(result.tags).toEqual(['sunset']);
      expect(result.params.idea).toBe('sunset scene');
      expect(result.params.artStyle).toBe('cinematic');
    });

    it('should use default icon when none provided', () => {
      const state = {} as PromptState;
      const result = createTemplateFromState('Test', 'Desc', state);
      expect(result.icon).toBe('template');
    });
  });

  describe('exportTemplates', () => {
    it('should export all templates as JSON', async () => {
      await saveTemplate(createMockTemplate({ id: 'exp-1' }));
      const json = await exportTemplates();
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.2.0');
      expect(parsed.templates).toBeDefined();
      expect(parsed.templates.length).toBe(1);
    });

    it('should export only specified template IDs', async () => {
      await saveTemplate(createMockTemplate({ id: 'exp-a' }));
      await saveTemplate(createMockTemplate({ id: 'exp-b' }));
      const json = await exportTemplates(['exp-a']);
      const parsed = JSON.parse(json);
      expect(parsed.templates.length).toBe(1);
    });
  });

  describe('importTemplates', () => {
    it('should import templates with new IDs', async () => {
      const data = {
        version: '1.2.0',
        templates: [createMockTemplate({ id: 'orig-1', name: 'Imported' })],
      };
      const count = await importTemplates(JSON.stringify(data));
      expect(count).toBe(1);
    });

    it('should throw for invalid format', async () => {
      await expect(importTemplates('{"bad": true}')).rejects.toThrow(
        'Invalid template data format',
      );
    });

    it('should throw for invalid JSON', async () => {
      await expect(importTemplates('not-json')).rejects.toThrow();
    });
  });

  describe('searchTemplates', () => {
    it('should find templates by name', async () => {
      await saveTemplate(createMockTemplate({ id: 's1', name: 'Cinematic Sunset' }));
      await saveTemplate(createMockTemplate({ id: 's2', name: 'Abstract Art' }));

      const results = await searchTemplates('cinematic');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Cinematic Sunset');
    });

    it('should find templates by description', async () => {
      await saveTemplate(
        createMockTemplate({ id: 's3', name: 'X', description: 'Contains ocean waves' }),
      );
      const results = await searchTemplates('ocean');
      expect(results.length).toBe(1);
    });

    it('should find templates by tags', async () => {
      await saveTemplate(createMockTemplate({ id: 's4', name: 'X', tags: ['dramatic', 'noir'] }));
      const results = await searchTemplates('noir');
      expect(results.length).toBe(1);
    });

    it('should return empty when no match', async () => {
      await saveTemplate(createMockTemplate({ id: 's5' }));
      const results = await searchTemplates('xyznonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should filter templates by category', async () => {
      await saveTemplate(createMockTemplate({ id: 'c1', category: 'nature' }));
      await saveTemplate(createMockTemplate({ id: 'c2', category: 'urban' }));

      const results = await getTemplatesByCategory('nature');
      expect(results.length).toBe(1);
      expect(results[0].category).toBe('nature');
    });

    it('should return empty for non-existent category', async () => {
      const results = await getTemplatesByCategory('missing-cat');
      expect(results.length).toBe(0);
    });
  });

  describe('duplicateTemplate', () => {
    it('should create a copy with new ID and (Copy) suffix', async () => {
      await saveTemplate(createMockTemplate({ id: 'orig', name: 'Original' }));
      const copy = await duplicateTemplate('orig');
      expect(copy).not.toBeNull();
      expect(copy!.name).toBe('Original (Copy)');
      expect(copy!.id).not.toBe('orig');
      expect(copy!.id).toMatch(/^copy-/);
    });

    it('should return null for non-existent template', async () => {
      const copy = await duplicateTemplate('nope');
      expect(copy).toBeNull();
    });
  });
});
