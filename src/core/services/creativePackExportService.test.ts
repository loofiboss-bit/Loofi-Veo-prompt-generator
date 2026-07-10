import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '@core/constants';
import type { Shot } from '@core/types';
import { creativePackExportService } from './creativePackExportService';

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
    expect(pack.schemaVersion).toBe(2);
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
    const pack = creativePackExportService.buildCreativePack({
      projectId: 'project-1',
      promptState: {
        ...INITIAL_STATE,
        idea: 'Neon alley chase',
      },
      shots: [shot],
    });

    const markdown = creativePackExportService.exportCreativePack(pack, 'markdown');
    expect(markdown).toContain('## Flow/Veo Scene Pack');
    expect(markdown).toContain('## Veo API Prompt');
    expect(markdown).toContain('## Suno Production Brief');
    expect(markdown).toContain('## Timeline Shot List');

    const json = JSON.parse(creativePackExportService.exportCreativePack(pack, 'json')) as {
      projectId: string;
      timelineShots: Array<{ id: number }>;
    };
    expect(json.projectId).toBe('project-1');
    expect(json.timelineShots[0].id).toBe(1);
  });
});
