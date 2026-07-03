import type {
  FlowVeoScenePack,
  PromptState,
  Shot,
  SunoProductionBrief,
  SunoSettings,
  SunoPack,
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
  projectId: string;
  title: string;
  generatedAt: string;
  scenePack: FlowVeoScenePack;
  veoApiPrompt: string;
  sunoProductionBrief: SunoProductionBrief;
  musicBridge: ReturnType<typeof createSunoBriefFromFlowVeo>;
  timelineShots: CreativePackTimelineShot[];
}

interface BuildCreativePackInput {
  projectId: string;
  promptState: PromptState;
  shots?: Shot[];
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

  buildCreativePack({ projectId, promptState, shots = [] }: BuildCreativePackInput): CreativePack {
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
      projectId,
      title: scenePack.title,
      generatedAt: new Date().toISOString(),
      scenePack,
      veoApiPrompt: buildVeoApiPrompt(promptState),
      sunoProductionBrief: buildSunoProductionBrief(sunoSettings, sunoPack),
      musicBridge: createSunoBriefFromFlowVeo(scenePack),
      timelineShots: mapTimelineShots(shots),
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
`;
  }
}

export const creativePackExportService = CreativePackExportService.getInstance();
