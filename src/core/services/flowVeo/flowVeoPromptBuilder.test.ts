import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '@core/constants';
import type { PromptState } from '@core/types';
import { exportFlowVeoScenePack } from './flowScenePackExport';
import { buildFlowVeoScenePack, buildVeoApiPrompt } from './flowVeoPromptBuilder';

const state: PromptState = {
  ...INITIAL_STATE,
  idea: 'A rain-soaked cyberpunk detective finds a glowing flower',
  environment: 'Neon alley with reflective pavement',
  characterVisualDNA: 'Detective in a dark coat with silver hair',
  voiceOver: 'The city still remembers.',
  ambientSound: 'Rain and distant traffic',
};

describe('flowVeoPromptBuilder', () => {
  it('builds a Flow scene pack with continuity and scores', () => {
    const pack = buildFlowVeoScenePack(state, {
      shots: [
        { action: 'Detective enters the alley', camera: 'slow push-in', duration: 4 },
        { action: 'Flower illuminates the rain', camera: 'macro insert', duration: 4 },
      ],
    });

    expect(pack.shotCards).toHaveLength(2);
    expect(pack.characterContinuity).toContain('Detective');
    expect(pack.compatibility.flowReadiness).toBeGreaterThan(0);
  });

  it('exports Markdown and JSON scene packs', () => {
    const pack = buildFlowVeoScenePack(state);

    expect(exportFlowVeoScenePack(pack, { format: 'markdown' })).toContain('## One-Shot Prompt');
    expect(JSON.parse(exportFlowVeoScenePack(pack, { format: 'json' })).title).toBe(pack.title);
  });

  it('builds a Veo API prompt with format details', () => {
    const prompt = buildVeoApiPrompt({ ...state, targetModel: 'veo-api' });

    expect(prompt).toContain('Duration:');
    expect(prompt).toContain('Aspect ratio:');
    expect(prompt).toContain('Reference image notes:');
  });
});
