import { describe, expect, it } from 'vitest';
import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  ProjectSchemaValidationError,
  migrateProjectDocument,
  migrateV16toV17,
  migrateV17toV18,
  validateProjectDocumentForSave,
} from './projectMigrationService';
import type { Project } from '@core/types';

describe('projectMigrationService', () => {
  it('migrates unversioned legacy (v16) project to v18 deterministically', () => {
    const legacyProject = {
      id: 'legacy-proj-1',
      name: 'Old Western Feature',
      lastModified: 1700000000000,
      promptState: {
        prompt: 'A dusty desert scene',
        character: 'Sheriff Dave',
      },
      storyboard: {
        shots: [{ id: 1, action: 'Walks into tavern' }],
      },
    };

    const result = migrateProjectDocument(legacyProject);

    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(16);
    expect(result.toVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION);
    expect(result.project.schemaVersion).toBe(18);
    expect(result.project.mutationVersion).toBe(0);
    expect(result.project.productionBible).toBeDefined();
    expect(result.project.productionBible.profiles).toBeInstanceOf(Array);
    expect((result.project as Record<string, unknown>).audioProcessing).toEqual({
      targetLufs: -14,
      duckingGainDb: -14,
      silenceThresholdDb: -40,
    });
  });

  it('migrates v17 project with silence/audio to v18', () => {
    const v17Project = {
      id: 'v17-proj',
      name: 'Sci-Fi Short',
      schemaVersion: 17,
      lastModified: 1720000000000,
      audioProcessing: {
        targetLufs: -14,
        duckingGainDb: -12,
        silenceThresholdDb: -36,
      },
      creatorDelivery: {
        aspectRatio: '16:9',
        batchFormats: ['16:9', '9:16'],
      },
    };

    const result = migrateProjectDocument(v17Project);

    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(17);
    expect(result.project.schemaVersion).toBe(18);
    expect(result.project.mutationVersion).toBe(0);
    expect(result.project.creatorDelivery?.batchFormats).toEqual(['16:9', '9:16']);
  });

  it('preserves already-migrated v18 project without marking migrated', () => {
    const v18Project = {
      id: 'v18-fresh',
      name: 'Documentary',
      schemaVersion: 18,
      mutationVersion: 12,
      lastModified: 1730000000000,
      characterBank: [],
      locationBank: [],
      visualDNA: [],
      productionBible: { schemaVersion: 1, profiles: [], rules: [] },
      storyboard: { shots: [] },
    };

    const result = migrateProjectDocument(v18Project);

    expect(result.migrated).toBe(false);
    expect(result.project.schemaVersion).toBe(18);
    expect(result.project.mutationVersion).toBe(12);
  });

  it('throws ProjectSchemaValidationError when id is missing or payload is invalid', () => {
    expect(() => migrateProjectDocument(null)).toThrow(ProjectSchemaValidationError);
    expect(() => migrateProjectDocument('string')).toThrow(ProjectSchemaValidationError);
    expect(() => migrateProjectDocument({ name: 'No ID' })).toThrow(ProjectSchemaValidationError);
  });

  it('validateProjectDocumentForSave ensures schemaVersion 18', () => {
    const project = {
      id: 'save-test',
      name: 'Test Save',
      lastModified: 1730000000000,
      schemaVersion: 16,
    } as unknown as Project;

    const validated = validateProjectDocumentForSave(project);

    expect(validated.schemaVersion).toBe(18);
    expect(validated.mutationVersion).toBe(0);
  });

  it('individual migration functions v16toV17 and v17toV18 are pure and idempotent', () => {
    const v16Doc = { id: 'test', name: 'Alpha' };
    const v17Doc = migrateV16toV17(v16Doc);
    expect(v17Doc.schemaVersion).toBe(17);

    const v18Doc = migrateV17toV18(v17Doc);
    expect(v18Doc.schemaVersion).toBe(18);
    expect(v18Doc.mutationVersion).toBe(0);
  });
});
