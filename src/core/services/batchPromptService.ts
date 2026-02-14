/**
 * Batch Prompt Service
 * Generates multiple prompts from a template by applying a variable matrix.
 * Integrates with JobQueueService for background processing.
 * Follows ADR-002: Singleton pattern.
 *
 * @module batchPromptService
 * @since v1.8.0
 */

import { PromptState, VeoPromptResponse } from '@core/types';
import { generateVeoPrompt } from '@core/services/geminiService';
import { getUserTemplates, type UserTemplate } from '@core/services/templateManager';
import { jobQueueService, type JobExecutor, type Job } from '@core/services/jobQueueService';
import { logger } from '@core/services/loggerService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single row in the variable matrix — maps variable names to values */
export type VariableRow = Record<string, string>;

/** Configuration for a batch prompt generation run */
export interface BatchConfig {
  /** Template to use as base (its `params` field provides the PromptState) */
  templateId: string;
  /** Each row is a set of {{KEY}} → value overrides applied to the template's idea field */
  variableMatrix: VariableRow[];
  /** Optional: override specific PromptState fields for ALL rows */
  overrides?: Partial<PromptState>;
  /** Optional user coordinates for location-aware generation */
  userCoords?: { latitude: number; longitude: number } | null;
}

/** Result of a single prompt generation within a batch */
export interface BatchPromptResult {
  index: number;
  variables: VariableRow;
  response: VeoPromptResponse | null;
  error?: string;
}

/** Result of the entire batch run */
export interface BatchResult {
  templateName: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  results: BatchPromptResult[];
  durationMs: number;
}

/** Payload stored on the Job for the executor */
interface BatchJobPayload {
  config: BatchConfig;
  templateName: string;
}

// ---------------------------------------------------------------------------
// Variable Interpolation (reuses project convention: {{KEY}})
// ---------------------------------------------------------------------------

function interpolateIdea(idea: string, variables: VariableRow): string {
  if (!idea) return '';
  return idea.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return variables[key] ?? variables[key.toUpperCase()] ?? _match;
  });
}

// ---------------------------------------------------------------------------
// Batch Executor (plugs into JobQueueService)
// ---------------------------------------------------------------------------

const batchPromptExecutor: JobExecutor<BatchResult> = {
  async execute(job: Job<BatchResult>, onProgress, signal): Promise<BatchResult> {
    const { config, templateName } = job.payload as BatchJobPayload;
    const template = await getTemplateById(config.templateId);
    if (!template) {
      throw new Error(`Template not found: ${config.templateId}`);
    }

    const baseState: PromptState = {
      ...getDefaultPromptState(),
      ...template.params,
      ...config.overrides,
    } as PromptState;

    const results: BatchPromptResult[] = [];
    const total = config.variableMatrix.length;
    const startTime = Date.now();

    for (let i = 0; i < total; i++) {
      if (signal.aborted) throw new DOMException('Batch cancelled', 'AbortError');

      const variables = config.variableMatrix[i];
      const stateWithVars: PromptState = {
        ...baseState,
        idea: interpolateIdea(baseState.idea, variables),
      };

      try {
        const response = await generateVeoPrompt(stateWithVars, config.userCoords ?? null);
        results.push({ index: i, variables, response });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.push({ index: i, variables, response: null, error: errorMsg });
        logger.warn(`Batch item ${i + 1}/${total} failed: ${errorMsg}`);
      }

      onProgress(Math.round(((i + 1) / total) * 100));
    }

    const successCount = results.filter((r) => r.response !== null).length;
    return {
      templateName,
      totalCount: total,
      successCount,
      failedCount: total - successCount,
      results,
      durationMs: Date.now() - startTime,
    };
  },
};

// ---------------------------------------------------------------------------
// Service Class
// ---------------------------------------------------------------------------

class BatchPromptService {
  private static instance: BatchPromptService;
  private registered = false;

  private constructor() {
    // Intentionally empty
  }

  static getInstance(): BatchPromptService {
    if (!BatchPromptService.instance) {
      BatchPromptService.instance = new BatchPromptService();
    }
    return BatchPromptService.instance;
  }

  /** Register the batch-prompt executor with the job queue. Call once at app init. */
  register(): void {
    if (this.registered) return;
    jobQueueService.registerExecutor('batch-prompt', batchPromptExecutor);
    this.registered = true;
    logger.debug('BatchPromptService executor registered');
  }

  /**
   * Start a batch prompt generation run.
   * Returns the job ID for tracking.
   */
  async startBatch(config: BatchConfig): Promise<string> {
    this.register();

    const template = await getTemplateById(config.templateId);
    const templateName = template?.name ?? 'Unknown template';
    const count = config.variableMatrix.length;

    const label = `Batch: ${templateName} (${count} variation${count !== 1 ? 's' : ''})`;
    const payload: BatchJobPayload = { config, templateName };

    return jobQueueService.enqueue<BatchResult>('batch-prompt', label, payload, 'normal');
  }

  /** Get available templates for the batch UI */
  async getTemplates(): Promise<UserTemplate[]> {
    return getUserTemplates();
  }

  /**
   * Extract variable names from a template's idea field.
   * Returns unique variable names found as {{KEY}} placeholders.
   */
  extractVariables(idea: string): string[] {
    const regex = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
    const names = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(idea)) !== null) {
      names.add(match[1]);
    }
    return Array.from(names);
  }

  /**
   * Create an empty variable matrix from extracted variable names.
   * Useful for initializing the UI grid.
   */
  createEmptyMatrix(variableNames: string[], rowCount: number = 1): VariableRow[] {
    return Array.from({ length: rowCount }, () => {
      const row: VariableRow = {};
      variableNames.forEach((name) => {
        row[name] = '';
      });
      return row;
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getTemplateById(id: string): Promise<UserTemplate | null> {
  const templates = await getUserTemplates();
  return templates.find((t) => t.id === id) ?? null;
}

/** Minimal default PromptState for batch generation (fields not covered by template) */
function getDefaultPromptState(): Partial<PromptState> {
  return {
    idea: '',
    language: 'en',
    model: 'gemini-3-pro-preview',
    targetModel: 'veo',
    artStyle: '',
    cameraMovement: '',
    environment: '',
    aspectRatio: '16:9',
  };
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const batchPromptService = BatchPromptService.getInstance();
