import type {
  FlowVeoScenePack,
  PromptState,
  Shot,
  SunoProductionBrief,
  SunoSettings,
  SunoPack,
  ProductionRun,
  ProductionBible,
  ShotContinuityBinding,
  ContinuityReport,
  ContinuitySnapshot,
  ContinuityOverrideRecord,
  PromptArtifactV1,
} from '@core/types';
import {
  buildFlowVeoScenePack,
  buildVeoApiPrompt,
} from '@core/services/flowVeo/flowVeoPromptBuilder';
import { exportFlowVeoScenePack } from '@core/services/flowVeo/flowScenePackExport';
import {
  buildSunoProductionBrief,
  createSunoBriefFromFlowVeo,
} from '@core/services/suno/sunoWorkflowService';

export type CreativePackExportFormat = 'markdown' | 'json';

export interface CreativePackTimelineShot {
  id: number;
  action: string;
  camera: string;
  duration: number;
  transition: string;
}

export interface CreativePack {
  schemaVersion: 4;
  projectId: string;
  title: string;
  generatedAt: string;
  scenePack: FlowVeoScenePack;
  veoApiPrompt: string;
  sunoProductionBrief: SunoProductionBrief;
  musicBridge: ReturnType<typeof createSunoBriefFromFlowVeo>;
  timelineShots: CreativePackTimelineShot[];
  promptArtifacts?: PromptArtifactV1[];
  productionBible?: ProductionBible;
  productionRun?: {
    id: string;
    status: ProductionRun['status'];
    planRevision: number;
    pricingEffectiveDate: string;
    approvedUsd: number;
    continuityOverrides: ContinuityOverrideRecord[];
    shots: Array<{
      id: number;
      prompt: string;
      request: ProductionRun['shots'][number]['generationRequest'];
      selectedTakeId?: string;
      reviewScore?: number;
      providerOperationName?: string;
      continuitySnapshotHash?: string;
      continuityStatus?: 'ready' | 'warning' | 'blocked';
      referenceAssetIds: string[];
      continuityBinding?: ShotContinuityBinding;
      continuitySnapshot?: ContinuitySnapshot;
      continuityReport?: ContinuityReport;
      takes: Array<{
        id: string;
        status: ProductionRun['shots'][number]['takes'][number]['status'];
        continuitySnapshot?: ContinuitySnapshot;
        continuityReport?: ContinuityReport;
        review?: ProductionRun['shots'][number]['takes'][number]['review'];
      }>;
    }>;
  };
}

export type CreativePackV3 = Omit<CreativePack, 'schemaVersion' | 'promptArtifacts'> & {
  schemaVersion: 3;
};

/** Upgrade a persisted/exported Creative Pack without dropping v3 fields. */
export const migrateCreativePack = (value: CreativePack | CreativePackV3): CreativePack => {
  if (value.schemaVersion === 4) return structuredClone(value);
  return {
    ...structuredClone(value),
    schemaVersion: 4,
    promptArtifacts: [],
  };
};

interface BuildCreativePackInput {
  projectId: string;
  promptState: PromptState;
  shots?: Shot[];
  productionRun?: ProductionRun | null;
  productionBible?: ProductionBible;
  promptArtifacts?: PromptArtifactV1[];
}

const buildSunoSettings = (state: PromptState, scenePack: FlowVeoScenePack): SunoSettings => {
  const musicBridge = createSunoBriefFromFlowVeo(scenePack);
  return {
    topic: state.idea || scenePack.title,
    genre: scenePack.styleBible || 'cinematic electronic',
    mood: musicBridge.mood,
    voice: musicBridge.vocalStyle,
    tempo: musicBridge.bpm,
    structure: 'Auto',
    language: state.language,
    instruments: musicBridge.instruments.join(', '),
    isInstrumental: !state.voiceOver.trim(),
    styleInfluence: null,
  };
};

const buildSunoPack = (state: PromptState, scenePack: FlowVeoScenePack): SunoPack => ({
  title: `${scenePack.title} Music Brief`,
  style: [scenePack.styleBible, state.ambientSound, state.soundEffectsIntensity]
    .filter((value) => value && value !== 'None')
    .join(', '),
  lyrics:
    state.voiceOver ||
    scenePack.shotCards
      .map((shot) => `[${shot.title}]\n${shot.audioNotes || shot.prompt}`)
      .join('\n\n'),
  explanation: 'Generated from the current Flow/Veo scene pack and timeline direction.',
});

const mapTimelineShots = (shots: Shot[] = []): CreativePackTimelineShot[] =>
  shots.map((shot) => ({
    id: shot.id,
    action: shot.action,
    camera: shot.camera,
    duration: shot.duration,
    transition: shot.transition.type,
  }));

class CreativePackExportService {
  private static instance: CreativePackExportService;

  static getInstance(): CreativePackExportService {
    if (!CreativePackExportService.instance) {
      CreativePackExportService.instance = new CreativePackExportService();
    }
    return CreativePackExportService.instance;
  }

  buildCreativePack({
    projectId,
    promptState,
    shots = [],
    productionRun,
    productionBible,
    promptArtifacts = [],
  }: BuildCreativePackInput): CreativePack {
    const scenePack = buildFlowVeoScenePack(promptState, {
      mode: promptState.flowVeoOutputMode ?? 'flow-scene-pack',
      shots: shots.map((shot) => ({
        id: shot.id,
        action: shot.action,
        camera: shot.camera,
        duration: shot.duration,
        transition: shot.transition,
      })),
      title: promptState.idea || 'Creative Intelligence Pack',
    });
    const sunoSettings = buildSunoSettings(promptState, scenePack);
    const sunoPack = buildSunoPack(promptState, scenePack);

    return {
      schemaVersion: 4,
      projectId,
      title: scenePack.title,
      generatedAt: new Date().toISOString(),
      scenePack,
      veoApiPrompt: buildVeoApiPrompt(promptState),
      sunoProductionBrief: buildSunoProductionBrief(sunoSettings, sunoPack),
      musicBridge: createSunoBriefFromFlowVeo(scenePack),
      timelineShots: mapTimelineShots(shots),
      promptArtifacts: structuredClone(promptArtifacts),
      productionBible,
      productionRun: productionRun
        ? {
            id: productionRun.id,
            status: productionRun.status,
            planRevision: productionRun.planRevision,
            pricingEffectiveDate: productionRun.cost.pricingEffectiveDate,
            approvedUsd: productionRun.cost.approvedUsd,
            continuityOverrides: productionRun.continuityOverrides ?? [],
            shots: productionRun.shots.map((shot) => {
              const selectedTake = shot.takes.find((take) => take.id === shot.selectedTakeId);
              return {
                id: shot.id,
                prompt: shot.prompt,
                request: shot.generationRequest,
                selectedTakeId: shot.selectedTakeId,
                reviewScore: selectedTake?.review?.overallScore,
                providerOperationName: selectedTake?.providerArtifact?.operationName,
                continuitySnapshotHash:
                  selectedTake?.continuitySnapshot?.snapshotHash ??
                  shot.continuitySnapshot?.snapshotHash,
                continuityStatus:
                  selectedTake?.continuityReport?.status ?? shot.continuityReport?.status,
                referenceAssetIds: shot.generationRequest.referenceAssetIds,
                continuityBinding: shot.continuityBinding,
                continuitySnapshot: shot.continuitySnapshot,
                continuityReport: shot.continuityReport,
                takes: shot.takes.map((take) => ({
                  id: take.id,
                  status: take.status,
                  continuitySnapshot: take.continuitySnapshot,
                  continuityReport: take.continuityReport,
                  review: take.review,
                })),
              };
            }),
          }
        : undefined,
    };
  }

  exportCreativePack(pack: CreativePack, format: CreativePackExportFormat): string {
    if (format === 'json') {
      return JSON.stringify(pack, null, 2);
    }

    const timeline = pack.timelineShots.length
      ? pack.timelineShots
          .map(
            (shot) =>
              `- Shot ${shot.id}: ${shot.action || 'No action set'} | ${shot.camera || 'No camera set'} | ${shot.duration}s | ${shot.transition}`,
          )
          .join('\n')
      : '- No timeline shots yet';

    const continuityBible = pack.productionBible
      ? `## Production Bible

${pack.productionBible.profiles
  .map(
    (profile) =>
      `- ${profile.kind}: ${profile.name} (v${profile.version}) — ${profile.description || 'No description'}; references: ${profile.references.map((reference) => reference.assetId).join(', ') || 'none'}`,
  )
  .join('\n')}

`
      : '';

    const directorRun = pack.productionRun
      ? `## Director Run

- Run ID: ${pack.productionRun.id}
- Status: ${pack.productionRun.status}
- Plan revision: ${pack.productionRun.planRevision}
- Approved estimate: $${pack.productionRun.approvedUsd.toFixed(2)}
- Pricing effective: ${pack.productionRun.pricingEffectiveDate}
- Continuity overrides: ${pack.productionRun.continuityOverrides.length}

${pack.productionRun.shots
  .map(
    (shot) =>
      `- Shot ${shot.id}: ${shot.request.modelId}, ${shot.request.durationSeconds}s, ${shot.request.resolution}, review ${shot.reviewScore ?? 'not run'}, continuity ${shot.continuityStatus ?? 'not compiled'} (${shot.continuitySnapshotHash ?? 'no snapshot'}), profiles ${shot.continuityBinding?.profileIds.join(', ') || 'none'}, references ${shot.referenceAssetIds.join(', ') || 'none'}, takes ${shot.takes.length}\n  - Snapshot asset hashes: ${
        Object.entries(shot.continuitySnapshot?.referenceAssetHashes ?? {})
          .map(([assetId, hash]) => `${assetId}=${hash}`)
          .join(', ') || 'none'
      }\n  - Continuity issues: ${shot.continuityReport?.issues.map((issue) => `${issue.severity}: ${issue.message}`).join(' | ') || 'none'}`,
  )
  .join('\n')}

`
      : '';

    const promptStudioArtifacts = pack.promptArtifacts?.length
      ? `## Prompt Studio Artifacts\n\n${pack.promptArtifacts
          .map((artifact) => {
            return `### ${artifact.kind} / ${artifact.target}: ${artifact.primary.title}\n\nArtifact: ${artifact.id}\n\n\`\`\`text\n${artifact.primary.copyAll}\n\`\`\``;
          })
          .join('\n\n')}\n\n`
      : '';

    return `# ${pack.title}

Generated: ${pack.generatedAt}

${continuityBible}

## Flow/Veo Scene Pack

${exportFlowVeoScenePack(pack.scenePack, { format: 'markdown' })}

## Veo API Prompt

${pack.veoApiPrompt}

## Suno Production Brief

- Idea: ${pack.sunoProductionBrief.songIdea}
- Mood: ${pack.sunoProductionBrief.mood}
- BPM: ${pack.sunoProductionBrief.bpm}
- Vocal: ${pack.sunoProductionBrief.vocalStyle}
- Instrumentation: ${pack.sunoProductionBrief.instrumentation}
- Avoid: ${pack.sunoProductionBrief.avoidTags.join(', ')}

## Music Bridge

- Pacing: ${pack.musicBridge.pacing}
- Instruments: ${pack.musicBridge.instruments.join(', ')}
- Hooks: ${pack.musicBridge.hookIdeas.join(', ')}

## Timeline Shot List

${timeline}

${promptStudioArtifacts}
${directorRun}
`;
  }
}

export const creativePackExportService = CreativePackExportService.getInstance();
