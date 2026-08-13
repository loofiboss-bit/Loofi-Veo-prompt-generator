import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '@core/constants';
import type { ProductionRun, Shot } from '@core/types';
import { compileVideoPromptArtifact } from './promptStudioService';
import { creativePackExportService, migrateCreativePack } from './creativePackExportService';

const shot: Shot = {
  id: 1,
  type: 'video',
  action: 'A runner crosses a reflective neon alley',
  camera: 'Slow dolly in',
  characterId: 'runner',
  takes: [],
  selectedTakeIndex: 0,
  visualLink: true,
  duration: 8,
  transition: {
    type: 'cut',
    duration: 0,
  },
};

describe('creativePackExportService', () => {
  it('builds one project-aligned Flow/Veo, Veo API, Suno, and timeline pack', () => {
    const pack = creativePackExportService.buildCreativePack({
      projectId: 'project-1',
      promptState: {
        ...INITIAL_STATE,
        idea: 'Neon alley chase',
        ambientSound: 'low synth pulse',
        voiceOver: 'Keep moving through the rain.',
      },
      shots: [shot],
    });

    expect(pack.projectId).toBe('project-1');
    expect(pack.schemaVersion).toBe(4);
    expect(pack.scenePack.title).toContain('Neon alley chase');
    expect(pack.veoApiPrompt).toContain('Neon alley chase');
    expect(pack.sunoProductionBrief.songIdea).toContain('Neon alley chase');
    expect(pack.timelineShots).toEqual([
      {
        id: 1,
        action: 'A runner crosses a reflective neon alley',
        camera: 'Slow dolly in',
        duration: 8,
        transition: 'cut',
      },
    ]);
  });

  it('exports Creative Pack as Markdown and JSON', () => {
    const promptArtifact = compileVideoPromptArtifact({
      idea: 'A courier crosses a rainy street',
      mode: 'text-to-video',
      target: 'flow-veo',
      aspectRatio: '16:9',
      durationSeconds: 8,
    });
    const pack = creativePackExportService.buildCreativePack({
      projectId: 'project-1',
      promptState: {
        ...INITIAL_STATE,
        idea: 'Neon alley chase',
      },
      shots: [shot],
      promptArtifacts: [promptArtifact],
    });

    const markdown = creativePackExportService.exportCreativePack(pack, 'markdown');
    expect(markdown).toContain('## Flow/Veo Scene Pack');
    expect(markdown).toContain('## Veo API Prompt');
    expect(markdown).toContain('## Suno Production Brief');
    expect(markdown).toContain('## Timeline Shot List');
    expect(markdown).toContain('## Prompt Studio Artifacts');

    const json = JSON.parse(creativePackExportService.exportCreativePack(pack, 'json')) as {
      projectId: string;
      timelineShots: Array<{ id: number }>;
      promptArtifacts?: unknown[];
    };
    expect(json.projectId).toBe('project-1');
    expect(json.timelineShots[0].id).toBe(1);
    expect(json.promptArtifacts).toHaveLength(1);
  });

  it('migrates Creative Pack schema 3 to 4 without dropping existing fields', () => {
    const pack = creativePackExportService.buildCreativePack({
      projectId: 'project-1',
      promptState: { ...INITIAL_STATE, idea: 'Legacy pack' },
      shots: [],
    });
    const legacy = { ...pack, schemaVersion: 3 } as const;
    const migrated = migrateCreativePack(legacy);
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.promptArtifacts).toEqual([]);
    expect(migrated.title).toBe(pack.title);
  });

  it('exports continuity snapshots, reports, bindings, and take provenance', () => {
    const snapshot = {
      schemaVersion: 1 as const,
      shotId: 1,
      profileVersions: { hero: 2 },
      profileIds: ['hero'],
      referenceAssetIds: ['hero-ref'],
      referenceAssetHashes: { 'hero-ref': 'asset-hash' },
      lockFingerprint: 'lock-hash',
      promptFragment: 'Continuity profiles: Hero.',
      snapshotHash: 'snapshot-hash',
      createdAt: 1,
    };
    const report = {
      schemaVersion: 1 as const,
      shotId: 1,
      status: 'ready' as const,
      issues: [],
      candidateReferenceAssetIds: ['hero-ref'],
      selectedReferenceAssetIds: ['hero-ref'],
      snapshotHash: 'snapshot-hash',
      generatedAt: 1,
    };
    const run = {
      id: 'run-1',
      projectId: 'project-1',
      title: 'Continuity run',
      schemaVersion: 3 as const,
      status: 'complete' as const,
      brief: 'Continuity test',
      source: 'local' as const,
      planRevision: 1,
      promptSnapshot: { ...INITIAL_STATE },
      assetIds: ['hero-ref'],
      approvals: [],
      cost: {
        estimatedUsd: 0.8,
        approvedUsd: 0.8,
        recordedUsd: 0,
        pricingEffectiveDate: '2026-08-01',
      },
      createdAt: 1,
      updatedAt: 1,
      shots: [
        {
          id: 1,
          title: 'Shot 1',
          prompt: shot.action,
          negativePrompt: '',
          camera: shot.camera,
          durationSeconds: 8,
          status: 'accepted' as const,
          generationRequest: {
            mode: 'text-to-video' as const,
            modelId: 'veo-3.1-fast' as const,
            prompt: shot.action,
            aspectRatio: '16:9' as const,
            resolution: '720p' as const,
            durationSeconds: 8 as const,
            referenceAssetIds: ['hero-ref'],
          },
          takes: [
            {
              id: 'take-1',
              prompt: shot.action,
              request: {
                mode: 'text-to-video' as const,
                modelId: 'veo-3.1-fast' as const,
                prompt: shot.action,
                aspectRatio: '16:9' as const,
                resolution: '720p' as const,
                durationSeconds: 8 as const,
                referenceAssetIds: ['hero-ref'],
              },
              status: 'accepted' as const,
              provider: 'gemini-api' as const,
              apiSurface: 'google-ai-v1beta' as const,
              modelLifecycleSnapshot: 'stable' as const,
              priceDimension: {
                unit: 'video-second' as const,
                resolution: '720p' as const,
                usdPerUnit: 0.1,
              },
              continuitySnapshot: snapshot,
              continuityReport: report,
              createdAt: 1,
            },
          ],
          selectedTakeId: 'take-1',
          continuityBinding: {
            profileIds: ['hero'],
            explicitReferenceAssetIds: ['hero-ref'],
            locks: { wardrobe: 'yellow raincoat' },
          },
          continuitySnapshot: snapshot,
          continuityReport: report,
        },
      ],
    } satisfies ProductionRun;
    const pack = creativePackExportService.buildCreativePack({
      projectId: 'project-1',
      promptState: { ...INITIAL_STATE, idea: 'Continuity project' },
      shots: [shot],
      productionRun: run,
    });

    const exported = JSON.parse(creativePackExportService.exportCreativePack(pack, 'json')) as {
      productionRun: {
        shots: Array<{ continuitySnapshot: { snapshotHash: string }; takes: unknown[] }>;
      };
    };
    expect(exported.productionRun.shots[0].continuitySnapshot.snapshotHash).toBe('snapshot-hash');
    expect(exported.productionRun.shots[0].takes).toHaveLength(1);
  });
});
