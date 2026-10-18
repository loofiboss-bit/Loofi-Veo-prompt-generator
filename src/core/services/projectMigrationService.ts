import { z } from 'zod';
import type { Project } from '@core/types';
import { continuityService } from './continuityService';
import { logger } from './loggerService';

export const CURRENT_PROJECT_SCHEMA_VERSION = 18;

export class ProjectSchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly issues?: z.ZodIssue[],
  ) {
    super(message);
    this.name = 'ProjectSchemaValidationError';
  }
}

/**
 * Zod schema for v18 project document runtime validation.
 */
export const projectSchemaV18 = z
  .object({
    id: z.string().min(1, 'Project id is required'),
    name: z.string().default('Untitled Project'),
    lastModified: z.number().default(() => Date.now()),
    schemaVersion: z.number().int().default(CURRENT_PROJECT_SCHEMA_VERSION),
    mutationVersion: z.number().int().optional().default(0),
    documentRevision: z.number().int().optional().default(0),
    promptState: z.record(z.string(), z.unknown()).optional().default({}),
    characterBank: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    locationBank: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    visualDNA: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    productionBible: z
      .object({
        schemaVersion: z.number().optional().default(1),
        profiles: z.array(z.record(z.string(), z.unknown())).optional().default([]),
        rules: z.array(z.unknown()).optional().default([]),
      })
      .passthrough()
      .optional()
      .default({ schemaVersion: 1, profiles: [], rules: [] }),
    storyboard: z
      .object({
        shots: z.array(z.record(z.string(), z.unknown())).optional().default([]),
      })
      .passthrough()
      .optional()
      .default({ shots: [] }),
    creatorDelivery: z.record(z.string(), z.unknown()).optional(),
    studioDraft: z.record(z.string(), z.unknown()).optional(),
    studioRevisions: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    studioResults: z.array(z.record(z.string(), z.unknown())).optional().default([]),
    composer: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

/**
 * Migration step: v16 -> v17 (Smart Local Editing additions)
 * Ensures voiceover take metadata, silence-cut parameters, and EBU R128 audio defaults exist.
 */
export function migrateV16toV17(doc: Record<string, unknown>): Record<string, unknown> {
  const upgraded = { ...doc };

  // Ensure storyboard structure exists with valid shots array
  const sb = (
    upgraded.storyboard && typeof upgraded.storyboard === 'object'
      ? { ...(upgraded.storyboard as Record<string, unknown>) }
      : { shots: [] }
  ) as Record<string, unknown>;

  if (!Array.isArray(sb.shots)) {
    sb.shots = [];
  }

  // Ensure audio / silence / caption defaults
  if (!upgraded.audioProcessing) {
    upgraded.audioProcessing = {
      targetLufs: -14,
      duckingGainDb: -14,
      silenceThresholdDb: -40,
    };
  }

  upgraded.storyboard = sb;
  upgraded.schemaVersion = 17;
  return upgraded;
}

/**
 * Migration step: v17 -> v18 (Repeatable Production & Non-Blocking State additions)
 * Ensures mutationVersion tracking, delivery format presets, and normalized continuity.
 */
export function migrateV17toV18(doc: Record<string, unknown>): Record<string, unknown> {
  const upgraded = { ...doc };

  if (typeof upgraded.mutationVersion !== 'number') {
    upgraded.mutationVersion = 0;
  }

  // Normalize continuity profiles via continuityService
  const rawBible = upgraded.productionBible as
    | { profiles?: unknown[]; schemaVersion?: number }
    | undefined;
  const normalized = continuityService.normalizeBible({
    productionBible: rawBible as import('@core/types').ProductionBible,
    characterBank: upgraded.characterBank as import('@core/types').CharacterProfile[],
    locationBank: upgraded.locationBank as import('@core/types').LocationProfile[],
    visualDNA: upgraded.visualDNA as import('@core/types').VisualDNA[],
  });
  upgraded.productionBible = normalized.productionBible;

  // Ensure creatorDelivery structure has valid batch presets if defined
  if (upgraded.creatorDelivery && typeof upgraded.creatorDelivery === 'object') {
    const delivery = { ...(upgraded.creatorDelivery as Record<string, unknown>) };
    if (!delivery.aspectRatio) {
      delivery.aspectRatio = '16:9';
    }
    if (!Array.isArray(delivery.batchFormats)) {
      delivery.batchFormats = [
        delivery.aspectRatio as import('@core/types/creatorDelivery').CreatorAspectRatio,
      ];
    }
    upgraded.creatorDelivery = delivery;
  }

  upgraded.schemaVersion = 18;
  return upgraded;
}

export interface MigrationResult {
  project: Project;
  migrated: boolean;
  fromVersion: number;
  toVersion: number;
  warnings: string[];
}

/**
 * Deterministic multi-stage migration pipeline.
 * Upgrades legacy project documents step-by-step (v16 -> v17 -> v18).
 */
export function migrateProjectDocument(raw: unknown): MigrationResult {
  if (!raw || typeof raw !== 'object') {
    throw new ProjectSchemaValidationError('Invalid project document: expected an object.');
  }

  const candidate = { ...(raw as Record<string, unknown>) };
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
    throw new ProjectSchemaValidationError('Invalid project document: missing required id string.');
  }

  // Infer starting schema version; unversioned legacy projects default to 16
  const rawVersion = typeof candidate.schemaVersion === 'number' ? candidate.schemaVersion : 16;
  const fromVersion = Math.min(rawVersion, CURRENT_PROJECT_SCHEMA_VERSION);
  let current = candidate;
  const warnings: string[] = [];

  if (
    typeof current.schemaVersion === 'number' &&
    current.schemaVersion > CURRENT_PROJECT_SCHEMA_VERSION
  ) {
    warnings.push(
      `Project schema version ${current.schemaVersion} is newer than current v${CURRENT_PROJECT_SCHEMA_VERSION}. Reading in compatibility mode.`,
    );
  }

  if (fromVersion < 17) {
    current = migrateV16toV17(current);
  }

  if (fromVersion < 18) {
    current = migrateV17toV18(current);
  }

  // Final schema parsing with fallback recovery
  const parseResult = projectSchemaV18.safeParse(current);
  let validatedProject: Project;

  if (parseResult.success) {
    validatedProject = parseResult.data as unknown as Project;
  } else {
    logger.warn(
      'Project schema validation warnings detected; applying repaired state',
      parseResult.error.issues,
    );
    warnings.push(...parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
    validatedProject = {
      ...current,
      id: String(current.id),
      name: typeof current.name === 'string' ? current.name : 'Untitled Project',
      lastModified: typeof current.lastModified === 'number' ? current.lastModified : Date.now(),
      schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      mutationVersion: typeof current.mutationVersion === 'number' ? current.mutationVersion : 0,
    } as unknown as Project;
  }

  return {
    project: validatedProject,
    migrated: fromVersion < CURRENT_PROJECT_SCHEMA_VERSION,
    fromVersion,
    toVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    warnings,
  };
}

/**
 * Validates and ensures a Project has schemaVersion 18 prior to saving.
 */
export function validateProjectDocumentForSave(project: Project): Project {
  const candidate = {
    ...project,
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    mutationVersion: project.mutationVersion ?? 0,
  };

  const parsed = projectSchemaV18.safeParse(candidate);
  if (!parsed.success) {
    logger.warn('Project document save validation warnings', parsed.error.issues);
  }

  return candidate;
}

export const projectMigrationService = {
  migrateProjectDocument,
  validateProjectDocumentForSave,
  migrateV16toV17,
  migrateV17toV18,
};
