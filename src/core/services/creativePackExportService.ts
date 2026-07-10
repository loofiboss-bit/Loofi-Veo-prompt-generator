import type {
  FlowVeoScenePack,
  PromptState,
  Shot,
  SunoProductionBrief,
  SunoSettings,
  SunoPack,
  ProductionRun,
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
  schemaVersion: 2;
  projectId: string;
  title: string;
  generatedAt: string;
  scenePack: FlowVeoScenePack;
  veoApiPrompt: string;
  sunoProductionBrief: SunoProductionBrief;
  musicBridge: ReturnType<typeof createSunoBriefFromFlowVeo>;
  timelineShots: CreativePackTimelineShot[];
  productionRun?: {
    id: string;
    status: ProductionRun['status'];
    planRevision: number;
    pricingEffectiveDate: string;
    approvedUsd: number;
    shots: Array<{
      id: number;
      prompt: string;
      request: ProductionRun['shots'][number]['generationRequest'];
      selectedTakeId?: string;
      reviewScore?: number;
      providerOperationName?: string;
    }>;
  };
}

interface BuildCreativePackInput {
  projectId: string;
  promptState: PromptState;
  shots?: Shot[];
  productionRun?: ProductionRun | null;
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
      schemaVersion: 2,
      projectId,
      title: scenePack.title,
      generatedAt: new Date().toISOString(),
      scenePack,
      veoApiPrompt: buildVeoApiPrompt(promptState),
      sunoProductionBrief: buildSunoProductionBrief(sunoSettings, sunoPack),
      musicBridge: createSunoBriefFromFlowVeo(scenePack),
      timelineShots: mapTimelineShots(shots),
      productionRun: productionRun
        ? {
            id: productionRun.id,
            status: productionRun.status,
            planRevision: productionRun.planRevision,
            pricingEffectiveDate: productionRun.cost.pricingEffectiveDate,
            approvedUsd: productionRun.cost.approvedUsd,
            shots: productionRun.shots.map((shot) => {
              const selectedTake = shot.takes.find((take) => take.id === shot.selectedTakeId);
              return {
                id: shot.id,
                prompt: shot.prompt,
                request: shot.generationRequest,
                selectedTakeId: shot.selectedTakeId,
                reviewScore: selectedTake?.review?.overallScore,
                providerOperationName: selectedTake?.providerArtifact?.operationName,
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

    const directorRun = pack.productionRun
      ? `## Director Run

- Run ID: ${pack.productionRun.id}
- Status: ${pack.productionRun.status}
- Plan revision: ${pack.productionRun.planRevision}
- Approved estimate: $${pack.productionRun.approvedUsd.toFixed(2)}
- Pricing effective: ${pack.productionRun.pricingEffectiveDate}

${pack.productionRun.shots
  .map(
    (shot) =>
      `- Shot ${shot.id}: ${shot.request.modelId}, ${shot.request.durationSeconds}s, ${shot.request.resolution}, review ${shot.reviewScore ?? 'not run'}`,
  )
  .join('\n')}

`
      : '';

    return `# ${pack.title}

Generated: ${pack.generatedAt}

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

${directorRun}
`;
  }
}

export const creativePackExportService = CreativePackExportService.getInstance();
