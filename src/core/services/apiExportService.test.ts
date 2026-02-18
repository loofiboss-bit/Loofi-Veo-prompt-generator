/**
 * API Export Service Unit Tests
 * Tests for API export format generation
 */

import { describe, it, expect } from 'vitest';
import { apiExportService } from './apiExportService';
import type { HistoryEntry } from './historyService';
import type { Project } from './projectService';
import type { APIExportOptions, ExportFormat } from './apiExportService';

describe('apiExportService', () => {
  // Mock history entry for testing
  const mockEntry: HistoryEntry = {
    id: 'entry-123',
    projectId: 'project-456',
    prompt: 'A cinematic shot of a sunset',
    timestamp: 1700000000000,
    favorite: false,
    tags: ['cinematic', 'sunset'],
    metadata: {
      style: 'cinematic',
      camera: 'wide-angle',
      duration: 5,
    },
    version: '2.7.0',
  };

  const mockProject: Project = {
    id: 'project-456',
    name: 'My Video Project',
    description: 'Test project',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  describe('exportPrompt', () => {
    it('should export as JSON:API format', async () => {
      const options: APIExportOptions = {
        format: 'json-api',
        includeMetadata: true,
        includeLinks: true,
        baseUrl: 'https://api.test.com',
      };

      const result = await apiExportService.exportPrompt(mockEntry, options);
      const parsed = JSON.parse(result);

      expect(parsed.jsonapi).toEqual({ version: '1.0' });
      expect(parsed.data.type).toBe('prompts');
      expect(parsed.data.id).toBe('entry-123');
      expect(parsed.data.attributes.prompt).toBe('A cinematic shot of a sunset');
      expect(parsed.data.relationships.project.data).toEqual({
        type: 'projects',
        id: 'project-456',
      });
      expect(parsed.links.self).toBe('https://api.test.com/v1/prompts/entry-123');
      expect(parsed.meta).toBeDefined();
      expect(parsed.meta.version).toBe('2.7.0');
    });

    it('should export as HAL format', async () => {
      const options: APIExportOptions = {
        format: 'hal',
        baseUrl: 'https://api.test.com',
      };

      const result = await apiExportService.exportPrompt(mockEntry, options);
      const parsed = JSON.parse(result);

      expect(parsed._links).toBeDefined();
      expect(parsed._links.self.href).toBe('https://api.test.com/v1/prompts/entry-123');
      expect(parsed._links.project.href).toBe('https://api.test.com/v1/projects/project-456');
      expect(parsed.id).toBe('entry-123');
      expect(parsed.prompt).toBe('A cinematic shot of a sunset');
    });

    it('should export as REST format with metadata', async () => {
      const options: APIExportOptions = {
        format: 'rest',
        includeMetadata: true,
        apiVersion: '2.0',
      };

      const result = await apiExportService.exportPrompt(mockEntry, options);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.id).toBe('entry-123');
      expect(parsed.data.prompt).toBe('A cinematic shot of a sunset');
      expect(parsed.meta.apiVersion).toBe('2.0');
      expect(parsed.meta.exportedAt).toBeDefined();
    });

    it('should export as REST format without metadata', async () => {
      const options: APIExportOptions = {
        format: 'rest',
        includeMetadata: false,
      };

      const result = await apiExportService.exportPrompt(mockEntry, options);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBeUndefined();
      expect(parsed.meta).toBeUndefined();
      expect(parsed.id).toBe('entry-123');
      expect(parsed.prompt).toBe('A cinematic shot of a sunset');
    });

    it('should export as webhook format', async () => {
      const options: APIExportOptions = {
        format: 'webhook',
      };

      const result = await apiExportService.exportPrompt(mockEntry, options);
      const parsed = JSON.parse(result);

      expect(parsed.event).toBe('prompt.created');
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.data.id).toBe('entry-123');
      expect(parsed.data.projectId).toBe('project-456');
      expect(parsed.data.prompt).toBe('A cinematic shot of a sunset');
    });

    it('should default to REST format for unknown format', async () => {
      const options: APIExportOptions = {
        format: 'unknown' as ExportFormat,
      };

      const result = await apiExportService.exportPrompt(mockEntry, options);
      const parsed = JSON.parse(result);

      expect(parsed.id).toBe('entry-123');
      expect(parsed.prompt).toBe('A cinematic shot of a sunset');
    });

    it('should exclude links when not requested', async () => {
      const options: APIExportOptions = {
        format: 'json-api',
        includeLinks: false,
      };

      const result = await apiExportService.exportPrompt(mockEntry, options);
      const parsed = JSON.parse(result);

      expect(parsed.links).toBeUndefined();
    });

    it('should use default base URL when not provided', async () => {
      const options: APIExportOptions = {
        format: 'json-api',
        includeLinks: true,
      };

      const result = await apiExportService.exportPrompt(mockEntry, options);
      const parsed = JSON.parse(result);

      expect(parsed.links.self).toContain('https://api.example.com');
    });
  });

  describe('generateOpenAPISchema', () => {
    it('should generate OpenAPI schema without project', () => {
      const result = apiExportService.generateOpenAPISchema();
      const parsed = JSON.parse(result);

      expect(parsed.openapi).toBe('3.0.0');
      expect(parsed.info.title).toBe('Veo Studio Prompts API');
      expect(parsed.info.version).toBe('1.0');
      expect(parsed.paths).toBeDefined();
      expect(parsed.paths['/prompts']).toBeDefined();
      expect(parsed.paths['/prompts/{id}']).toBeDefined();
      expect(parsed.components.schemas.Prompt).toBeDefined();
    });

    it('should generate OpenAPI schema with project name', () => {
      const result = apiExportService.generateOpenAPISchema(mockProject);
      const parsed = JSON.parse(result);

      expect(parsed.info.title).toBe('My Video Project API');
    });

    it('should include all required API paths', () => {
      const result = apiExportService.generateOpenAPISchema();
      const parsed = JSON.parse(result);

      expect(parsed.paths['/prompts'].get).toBeDefined();
      expect(parsed.paths['/prompts'].post).toBeDefined();
      expect(parsed.paths['/prompts/{id}'].get).toBeDefined();
    });

    it('should define component schemas', () => {
      const result = apiExportService.generateOpenAPISchema();
      const parsed = JSON.parse(result);

      expect(parsed.components.schemas.Prompt).toBeDefined();
      expect(parsed.components.schemas.PromptMetadata).toBeDefined();
      expect(parsed.components.schemas.PromptInput).toBeDefined();
      expect(parsed.components.schemas.PromptList).toBeDefined();
    });
  });

  describe('generateCodeSnippets', () => {
    it('should generate code snippets for all languages', () => {
      const snippets = apiExportService.generateCodeSnippets(mockEntry);

      expect(snippets).toHaveLength(4);
      expect(snippets.some((s) => s.language === 'bash')).toBe(true);
      expect(snippets.some((s) => s.language === 'python')).toBe(true);
      expect(snippets.filter((s) => s.language === 'javascript')).toHaveLength(2);
    });

    it('should include entry ID in code snippets', () => {
      const snippets = apiExportService.generateCodeSnippets(mockEntry);

      snippets.forEach((snippet) => {
        expect(snippet.code).toContain('entry-123');
      });
    });

    it('should use custom base URL', () => {
      const snippets = apiExportService.generateCodeSnippets(mockEntry, 'https://custom.api.com');

      snippets.forEach((snippet) => {
        expect(snippet.code).toContain('https://custom.api.com');
      });
    });

    it('should use default base URL when not provided', () => {
      const snippets = apiExportService.generateCodeSnippets(mockEntry);

      snippets.forEach((snippet) => {
        expect(snippet.code).toContain('https://api.example.com');
      });
    });

    it('each snippet should have description', () => {
      const snippets = apiExportService.generateCodeSnippets(mockEntry);

      snippets.forEach((snippet) => {
        expect(snippet.description).toBeDefined();
        expect(snippet.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generatePostmanCollection', () => {
    it('should generate Postman collection without project', () => {
      const result = apiExportService.generatePostmanCollection();
      const parsed = JSON.parse(result);

      expect(parsed.info.name).toBe('Veo Studio API');
      expect(parsed.info.schema).toContain('collection.json');
      expect(parsed.item).toBeDefined();
      expect(parsed.variable).toBeDefined();
    });

    it('should generate Postman collection with project name', () => {
      const result = apiExportService.generatePostmanCollection(mockProject);
      const parsed = JSON.parse(result);

      expect(parsed.info.name).toBe('My Video Project API');
    });

    it('should include all required requests', () => {
      const result = apiExportService.generatePostmanCollection();
      const parsed = JSON.parse(result);

      const promptsFolder = parsed.item.find((i: { name: string }) => i.name === 'Prompts');
      expect(promptsFolder).toBeDefined();
      expect(promptsFolder.item).toHaveLength(3);

      const requestNames = promptsFolder.item.map((i: { name: string }) => i.name);
      expect(requestNames).toContain('List Prompts');
      expect(requestNames).toContain('Get Prompt');
      expect(requestNames).toContain('Create Prompt');
    });

    it('should include environment variables', () => {
      const result = apiExportService.generatePostmanCollection();
      const parsed = JSON.parse(result);

      const varNames = parsed.variable.map((v: { key: string }) => v.key);
      expect(varNames).toContain('BASE_URL');
      expect(varNames).toContain('API_KEY');
      expect(varNames).toContain('PROJECT_ID');
      expect(varNames).toContain('PROMPT_ID');
    });
  });

  describe('batchExport', () => {
    const mockEntries: HistoryEntry[] = [
      { ...mockEntry, id: 'entry-1', prompt: 'Prompt 1' },
      { ...mockEntry, id: 'entry-2', prompt: 'Prompt 2' },
      { ...mockEntry, id: 'entry-3', prompt: 'Prompt 3' },
    ];

    it('should batch export as JSON:API with combined document', async () => {
      const options: APIExportOptions = {
        format: 'json-api',
      };

      const result = await apiExportService.batchExport(mockEntries, options);
      const parsed = JSON.parse(result);

      expect(parsed.jsonapi).toEqual({ version: '1.0' });
      expect(Array.isArray(parsed.data)).toBe(true);
      expect(parsed.data).toHaveLength(3);
      expect(parsed.data[0].id).toBe('entry-1');
      expect(parsed.data[1].id).toBe('entry-2');
      expect(parsed.data[2].id).toBe('entry-3');
    });

    it('should batch export other formats as array', async () => {
      const options: APIExportOptions = {
        format: 'rest',
      };

      const result = await apiExportService.batchExport(mockEntries, options);
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].id).toBe('entry-1');
      expect(parsed[1].id).toBe('entry-2');
      expect(parsed[2].id).toBe('entry-3');
    });

    it('should handle empty entries array', async () => {
      const options: APIExportOptions = {
        format: 'rest',
      };

      const result = await apiExportService.batchExport([], options);
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
    });
  });
});
