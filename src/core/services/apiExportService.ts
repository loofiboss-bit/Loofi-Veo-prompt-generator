/**
 * API Export Service
 * Generates structured API-ready export formats
 * v1.3.0 - Workflow Integration
 */

import { logger } from './loggerService';
import type { HistoryEntry } from './historyService';
import type { Project } from './projectService';

export type ExportFormat = 'json-api' | 'hal' | 'openapi' | 'rest' | 'graphql' | 'webhook';

export interface APIExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeLinks?: boolean;
  apiVersion?: string;
  baseUrl?: string;
}

export interface JSONAPIDocument {
  jsonapi: { version: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  included?: any[];
  links?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;
}

export interface HALDocument {
  _links: Record<string, { href: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _embedded?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paths: Record<string, any>;
  components?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schemas?: Record<string, any>;
  };
}

export interface CodeSnippet {
  language: string;
  code: string;
  description: string;
}

class APIExportService {
  private readonly API_VERSION = '1.0';

  /**
   * Export prompt as API-ready format
   */
  async exportPrompt(entry: HistoryEntry, options: APIExportOptions): Promise<string> {
    try {
      switch (options.format) {
        case 'json-api':
          return this.exportAsJSONAPI(entry, options);
        case 'hal':
          return this.exportAsHAL(entry, options);
        case 'rest':
          return this.exportAsREST(entry, options);
        case 'webhook':
          return this.exportAsWebhook(entry, options);
        default:
          return this.exportAsREST(entry, options);
      }
    } catch (error) {
      logger.error('Failed to export prompt', error);
      throw error;
    }
  }

  /**
   * Export as JSON:API format
   */
  private exportAsJSONAPI(entry: HistoryEntry, options: APIExportOptions): string {
    const doc: JSONAPIDocument = {
      jsonapi: { version: '1.0' },
      data: {
        type: 'prompts',
        id: entry.id,
        attributes: {
          prompt: entry.prompt,
          timestamp: entry.timestamp,
          favorite: entry.favorite,
          tags: entry.tags,
          metadata: entry.metadata,
        },
        relationships: {
          project: {
            data: { type: 'projects', id: entry.projectId },
          },
        },
      },
    };

    if (options.includeLinks) {
      const baseUrl = options.baseUrl || 'https://api.example.com';
      doc.links = {
        self: `${baseUrl}/v1/prompts/${entry.id}`,
        project: `${baseUrl}/v1/projects/${entry.projectId}`,
      };
    }

    if (options.includeMetadata) {
      doc.meta = {
        version: entry.version,
        exportedAt: new Date().toISOString(),
      };
    }

    return JSON.stringify(doc, null, 2);
  }

  /**
   * Export as HAL (Hypertext Application Language) format
   */
  private exportAsHAL(entry: HistoryEntry, options: APIExportOptions): string {
    const baseUrl = options.baseUrl || 'https://api.example.com';

    const doc: HALDocument = {
      _links: {
        self: { href: `${baseUrl}/v1/prompts/${entry.id}` },
        project: { href: `${baseUrl}/v1/projects/${entry.projectId}` },
      },
      id: entry.id,
      prompt: entry.prompt,
      timestamp: entry.timestamp,
      favorite: entry.favorite,
      tags: entry.tags,
      metadata: entry.metadata,
    };

    return JSON.stringify(doc, null, 2);
  }

  /**
   * Export as REST API format
   */
  private exportAsREST(entry: HistoryEntry, options: APIExportOptions): string {
    const data = {
      id: entry.id,
      projectId: entry.projectId,
      prompt: entry.prompt,
      timestamp: entry.timestamp,
      favorite: entry.favorite,
      tags: entry.tags,
      metadata: entry.metadata,
      version: entry.version,
    };

    if (options.includeMetadata) {
      return JSON.stringify(
        {
          success: true,
          data,
          meta: {
            apiVersion: options.apiVersion || this.API_VERSION,
            exportedAt: new Date().toISOString(),
          },
        },
        null,
        2,
      );
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Export as webhook payload
   */
  private exportAsWebhook(entry: HistoryEntry, _options: APIExportOptions): string {
    const payload = {
      event: 'prompt.created',
      timestamp: Date.now(),
      data: {
        id: entry.id,
        projectId: entry.projectId,
        prompt: entry.prompt,
        metadata: entry.metadata,
        tags: entry.tags,
      },
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Generate OpenAPI schema for prompts API
   */
  generateOpenAPISchema(project?: Project): string {
    const schema: OpenAPISchema = {
      openapi: '3.0.0',
      info: {
        title: project ? `${project.name} API` : 'Veo Studio Prompts API',
        version: this.API_VERSION,
        description: 'API for managing video generation prompts',
      },
      paths: {
        '/prompts': {
          get: {
            summary: 'List all prompts',
            parameters: [
              {
                name: 'projectId',
                in: 'query',
                schema: { type: 'string' },
              },
              {
                name: 'tags',
                in: 'query',
                schema: { type: 'array', items: { type: 'string' } },
              },
            ],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/PromptList',
                    },
                  },
                },
              },
            },
          },
          post: {
            summary: 'Create a new prompt',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/PromptInput',
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Prompt created',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Prompt',
                    },
                  },
                },
              },
            },
          },
        },
        '/prompts/{id}': {
          get: {
            summary: 'Get a specific prompt',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Prompt',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Prompt: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              projectId: { type: 'string' },
              prompt: { type: 'string' },
              timestamp: { type: 'number' },
              favorite: { type: 'boolean' },
              tags: { type: 'array', items: { type: 'string' } },
              metadata: { $ref: '#/components/schemas/PromptMetadata' },
            },
          },
          PromptMetadata: {
            type: 'object',
            properties: {
              style: { type: 'string' },
              camera: { type: 'string' },
              scene: { type: 'string' },
              character: { type: 'string' },
              audio: { type: 'string' },
              duration: { type: 'number' },
              aspectRatio: { type: 'string' },
              model: { type: 'string' },
            },
          },
          PromptInput: {
            type: 'object',
            required: ['prompt', 'projectId'],
            properties: {
              prompt: { type: 'string' },
              projectId: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              metadata: { $ref: '#/components/schemas/PromptMetadata' },
            },
          },
          PromptList: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/Prompt' },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  page: { type: 'number' },
                },
              },
            },
          },
        },
      },
    };

    return JSON.stringify(schema, null, 2);
  }

  /**
   * Generate code snippets for API usage
   */
  generateCodeSnippets(
    entry: HistoryEntry,
    baseUrl: string = 'https://api.example.com',
  ): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];

    // cURL
    snippets.push({
      language: 'bash',
      description: 'Fetch prompt using cURL',
      code: `curl -X GET "${baseUrl}/v1/prompts/${entry.id}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    });

    // Python
    snippets.push({
      language: 'python',
      description: 'Fetch prompt using Python requests',
      code: `import requests

url = "${baseUrl}/v1/prompts/${entry.id}"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data)`,
    });

    // JavaScript (fetch)
    snippets.push({
      language: 'javascript',
      description: 'Fetch prompt using JavaScript fetch',
      code: `const url = '${baseUrl}/v1/prompts/${entry.id}';

fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    });

    // Node.js (axios)
    snippets.push({
      language: 'javascript',
      description: 'Fetch prompt using Node.js axios',
      code: `const axios = require('axios');

const url = '${baseUrl}/v1/prompts/${entry.id}';

axios.get(url, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  }
})
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`,
    });

    return snippets;
  }

  /**
   * Generate Postman collection
   */
  generatePostmanCollection(project?: Project): string {
    const collection = {
      info: {
        name: project ? `${project.name} API` : 'Veo Studio API',
        description: 'Postman collection for Veo Studio Prompts API',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Prompts',
          item: [
            {
              name: 'List Prompts',
              request: {
                method: 'GET',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                  },
                  {
                    key: 'Authorization',
                    value: 'Bearer {{API_KEY}}',
                  },
                ],
                url: {
                  raw: '{{BASE_URL}}/v1/prompts?projectId={{PROJECT_ID}}',
                  host: ['{{BASE_URL}}'],
                  path: ['v1', 'prompts'],
                  query: [
                    {
                      key: 'projectId',
                      value: '{{PROJECT_ID}}',
                    },
                  ],
                },
              },
            },
            {
              name: 'Get Prompt',
              request: {
                method: 'GET',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                  },
                  {
                    key: 'Authorization',
                    value: 'Bearer {{API_KEY}}',
                  },
                ],
                url: {
                  raw: '{{BASE_URL}}/v1/prompts/{{PROMPT_ID}}',
                  host: ['{{BASE_URL}}'],
                  path: ['v1', 'prompts', '{{PROMPT_ID}}'],
                },
              },
            },
            {
              name: 'Create Prompt',
              request: {
                method: 'POST',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                  },
                  {
                    key: 'Authorization',
                    value: 'Bearer {{API_KEY}}',
                  },
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify(
                    {
                      prompt: 'Your prompt text here',
                      projectId: '{{PROJECT_ID}}',
                      tags: ['example', 'test'],
                      metadata: {
                        style: 'cinematic',
                        camera: 'wide-angle',
                      },
                    },
                    null,
                    2,
                  ),
                },
                url: {
                  raw: '{{BASE_URL}}/v1/prompts',
                  host: ['{{BASE_URL}}'],
                  path: ['v1', 'prompts'],
                },
              },
            },
          ],
        },
      ],
      variable: [
        {
          key: 'BASE_URL',
          value: 'https://api.example.com',
        },
        {
          key: 'API_KEY',
          value: 'your_api_key_here',
        },
        {
          key: 'PROJECT_ID',
          value: 'default',
        },
        {
          key: 'PROMPT_ID',
          value: '',
        },
      ],
    };

    return JSON.stringify(collection, null, 2);
  }

  /**
   * Batch export multiple prompts
   */
  async batchExport(entries: HistoryEntry[], options: APIExportOptions): Promise<string> {
    try {
      const exports = await Promise.all(entries.map((entry) => this.exportPrompt(entry, options)));

      if (options.format === 'json-api') {
        // Combine into single JSON:API document
        const combined: JSONAPIDocument = {
          jsonapi: { version: '1.0' },
          data: exports.map((exp) => JSON.parse(exp).data),
        };
        return JSON.stringify(combined, null, 2);
      }

      // For other formats, return array
      return JSON.stringify(
        exports.map((exp) => JSON.parse(exp)),
        null,
        2,
      );
    } catch (error) {
      logger.error('Failed to batch export', error);
      throw error;
    }
  }
}

export const apiExportService = new APIExportService();
