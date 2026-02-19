/**
 * Scene Export Service
 * Exports storyboard shots as individual prompt documents or combined bundles.
 * Integrates with JobQueueService for background processing.
 * Follows ADR-002: Singleton pattern.
 *
 * @module sceneExportService
 * @since v1.8.0
 */

import type { Shot, StoryboardState, PromptState } from '@core/types';
import { jobQueueService, type JobExecutor, type Job } from '@core/services/jobQueueService';
import {
  quickExport,
  type ExportFormat,
  type ExportInput,
  type ExportData,
} from '@core/services/exportService';
import { logger } from '@core/services/loggerService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for exporting a single scene/shot */
export interface SceneExportItem {
  shotIndex: number;
  shot: Shot;
  /** Generated prompt text for this shot (pre-rendered) */
  promptText?: string;
}

/** Configuration for a multi-scene export run */
export interface SceneExportConfig {
  /** The storyboard containing shots to export */
  storyboard: StoryboardState;
  /** Base prompt state for context (model, style, etc.) */
  promptState: PromptState;
  /** Which shot indices to export (default: all) */
  shotIndices?: number[];
  /** Export format for each scene */
  format: ExportFormat;
  /** Whether to bundle all scenes into one file or export individually */
  bundleMode: 'single-file' | 'individual';
  /** Project name for file naming */
  projectName?: string;
}

/** Result of the multi-scene export */
export interface SceneExportResult {
  totalScenes: number;
  exportedCount: number;
  failedCount: number;
  format: ExportFormat;
  bundleMode: 'single-file' | 'individual';
  errors: Array<{ shotIndex: number; error: string }>;
}

/** Payload stored on the Job for the executor */
interface SceneExportPayload {
  config: SceneExportConfig;
}

// ---------------------------------------------------------------------------
// Scene Data Formatters
// ---------------------------------------------------------------------------

function formatShotAsText(shot: Shot, index: number, promptState: PromptState): string {
  const lines: string[] = [
    `=== Scene ${index + 1} ===`,
    `Type: ${shot.type}`,
    `Action: ${shot.action}`,
    `Camera: ${shot.camera}`,
    `Duration: ${shot.duration}s`,
  ];

  if (shot.transition?.type) {
    lines.push(`Transition: ${shot.transition.type} (${shot.transition.duration}ms)`);
  }
  if (shot.dialogueText) {
    lines.push(`Dialogue: "${shot.dialogueText}"`);
  }
  if (shot.sfx?.length) {
    lines.push(`SFX: ${shot.sfx.map((s) => s.description).join(', ')}`);
  }
  if (promptState.artStyle) {
    lines.push(`Style: ${promptState.artStyle}`);
  }

  return lines.join('\n');
}

function formatShotAsJson(shot: Shot, index: number, promptState: PromptState): ExportData {
  return {
    sceneNumber: index + 1,
    type: shot.type,
    action: shot.action,
    camera: shot.camera,
    duration: shot.duration,
    transition: shot.transition,
    dialogue: shot.dialogueText || null,
    sfx: shot.sfx || [],
    style: promptState.artStyle || null,
    targetModel: promptState.targetModel,
    characterId: shot.characterId || null,
    locationId: shot.locationId || null,
  };
}

function formatShotAsMarkdown(shot: Shot, index: number, promptState: PromptState): string {
  const lines: string[] = [
    `## Scene ${index + 1}`,
    '',
    `| Property | Value |`,
    `| --- | --- |`,
    `| Type | ${shot.type} |`,
    `| Camera | ${shot.camera} |`,
    `| Duration | ${shot.duration}s |`,
  ];

  if (shot.transition?.type) {
    lines.push(`| Transition | ${shot.transition.type} (${shot.transition.duration}ms) |`);
  }
  if (promptState.artStyle) {
    lines.push(`| Style | ${promptState.artStyle} |`);
  }

  lines.push('', `**Action:** ${shot.action}`);

  if (shot.dialogueText) {
    lines.push('', `**Dialogue:** "${shot.dialogueText}"`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Executor (plugs into JobQueueService)
// ---------------------------------------------------------------------------

const sceneExportExecutor: JobExecutor<SceneExportResult> = {
  async execute(job: Job<SceneExportResult>, onProgress, signal): Promise<SceneExportResult> {
    const { config } = job.payload as SceneExportPayload;
    const { storyboard, promptState, format, bundleMode, projectName } = config;

    // Determine which shots to export
    const indices = config.shotIndices ?? storyboard.shots.map((_, i) => i);
    const shots = indices
      .map((i) => ({ index: i, shot: storyboard.shots[i] }))
      .filter((s) => s.shot);

    const total = shots.length;
    const errors: Array<{ shotIndex: number; error: string }> = [];
    let exportedCount = 0;

    if (bundleMode === 'single-file') {
      // Combine all scenes into one document
      if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');

      const filename = `${projectName || 'storyboard'}_scenes.${getExtension(format)}`;

      try {
        const combined = combineScenesForFormat(shots, promptState, format, projectName);
        await quickExport(combined, format, filename);
        exportedCount = total;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ shotIndex: -1, error: msg });
        logger.error(`Multi-scene bundle export failed: ${msg}`);
      }

      onProgress(100);
    } else {
      // Export each scene individually
      for (let i = 0; i < shots.length; i++) {
        if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');

        const { index, shot } = shots[i];
        const filename = `${projectName || 'scene'}_${String(index + 1).padStart(3, '0')}.${getExtension(format)}`;

        try {
          const data = formatForExport(shot, index, promptState, format);
          await quickExport(data, format, filename);
          exportedCount++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ shotIndex: index, error: msg });
          logger.warn(`Scene ${index + 1} export failed: ${msg}`);
        }

        onProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    return {
      totalScenes: total,
      exportedCount,
      failedCount: errors.length,
      format,
      bundleMode,
      errors,
    };
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatForExport(
  shot: Shot,
  index: number,
  promptState: PromptState,
  format: ExportFormat,
): ExportInput {
  switch (format) {
    case 'json':
      return formatShotAsJson(shot, index, promptState);
    case 'markdown':
      return formatShotAsMarkdown(shot, index, promptState);
    case 'txt':
      return formatShotAsText(shot, index, promptState);
    case 'csv':
      return [formatShotAsJson(shot, index, promptState)];
    default:
      return formatShotAsText(shot, index, promptState);
  }
}

function combineScenesForFormat(
  shots: Array<{ index: number; shot: Shot }>,
  promptState: PromptState,
  format: ExportFormat,
  projectName?: string,
): ExportInput {
  switch (format) {
    case 'json':
      return {
        project: projectName || 'Untitled',
        exportedAt: new Date().toISOString(),
        targetModel: promptState.targetModel,
        scenes: shots.map(({ index, shot }) => formatShotAsJson(shot, index, promptState)),
      };
    case 'markdown': {
      const header = `# ${projectName || 'Storyboard'} — Scene Export\n\n*Exported: ${new Date().toLocaleString()}*\n*Model: ${promptState.targetModel}*\n\n---\n\n`;
      const body = shots
        .map(({ index, shot }) => formatShotAsMarkdown(shot, index, promptState))
        .join('\n\n---\n\n');
      return header + body;
    }
    case 'txt': {
      const header = `${projectName || 'Storyboard'} — Scene Export\nExported: ${new Date().toLocaleString()}\nModel: ${promptState.targetModel}\n${'='.repeat(40)}\n\n`;
      const body = shots
        .map(({ index, shot }) => formatShotAsText(shot, index, promptState))
        .join('\n\n');
      return header + body;
    }
    case 'csv':
      return shots.map(({ index, shot }) => formatShotAsJson(shot, index, promptState));
    default:
      return shots
        .map(({ index, shot }) => formatShotAsText(shot, index, promptState))
        .join('\n\n');
  }
}

function getExtension(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return 'json';
    case 'markdown':
      return 'md';
    case 'csv':
      return 'csv';
    case 'xml':
      return 'xml';
    case 'pdf':
      return 'pdf';
    case 'zip':
      return 'zip';
    default:
      return 'txt';
  }
}

// ---------------------------------------------------------------------------
// Service Class
// ---------------------------------------------------------------------------

class SceneExportService {
  private static instance: SceneExportService;
  private registered = false;

  private constructor() {
    // Intentionally empty
  }

  static getInstance(): SceneExportService {
    if (!SceneExportService.instance) {
      SceneExportService.instance = new SceneExportService();
    }
    return SceneExportService.instance;
  }

  /** Register the scene-export executor with the job queue. Call once at app init. */
  register(): void {
    if (this.registered) return;
    jobQueueService.registerExecutor('export', sceneExportExecutor);
    this.registered = true;
    logger.debug('SceneExportService executor registered');
  }

  /**
   * Start a multi-scene export.
   * Returns the job ID for tracking.
   */
  async startExport(config: SceneExportConfig): Promise<string> {
    this.register();

    const shotCount = config.shotIndices?.length ?? config.storyboard.shots.length;
    const label = `Export: ${shotCount} scene${shotCount !== 1 ? 's' : ''} (${config.format}, ${config.bundleMode})`;
    const payload: SceneExportPayload = { config };

    return jobQueueService.enqueue<SceneExportResult>('export', label, payload, 'normal');
  }

  /**
   * Extract exportable scenes from a storyboard.
   * Returns scenes with their indices (filters out blank/empty shots).
   */
  getExportableScenes(storyboard: StoryboardState): SceneExportItem[] {
    return storyboard.shots
      .map((shot, index) => ({ shotIndex: index, shot }))
      .filter(({ shot }) => shot.action?.trim());
  }

  /**
   * Preview how a single scene would look in a given format.
   */
  previewScene(shot: Shot, index: number, promptState: PromptState, format: ExportFormat): string {
    switch (format) {
      case 'json':
        return JSON.stringify(formatShotAsJson(shot, index, promptState), null, 2);
      case 'markdown':
        return formatShotAsMarkdown(shot, index, promptState);
      default:
        return formatShotAsText(shot, index, promptState);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const sceneExportService = SceneExportService.getInstance();
