import { describe, expect, it } from 'vitest';
import type { FlowVeoScenePack, SunoPack, SunoSettings } from '@core/types';
import {
  buildSunoProductionBrief,
  createFlowVeoShotsFromLyrics,
  createSunoBriefFromFlowVeo,
  exportSunoPack,
} from './sunoWorkflowService';

const settings: SunoSettings = {
  topic: 'A neon city chase',
  genre: 'synthwave, cinematic pop',
  mood: 'urgent',
  voice: 'Female',
  tempo: '128 BPM',
  structure: 'Pop',
  language: 'English',
  instruments: 'analog synth, gated drums',
  isInstrumental: false,
  styleInfluence: 75,
};

const pack: SunoPack = {
  title: 'Neon Chase',
  style: 'urgent, synthwave, analog synth, Female Vocals, 128 BPM',
  lyrics: '[Verse]\nRunning through the rain\n\n[Chorus]\nNeon keeps calling',
  explanation: 'A hook-first synthwave brief.',
};

describe('sunoWorkflowService', () => {
  it('builds a full production brief', () => {
    const brief = buildSunoProductionBrief(settings, pack);

    expect(brief.songIdea).toBe(settings.topic);
    expect(brief.sections.chorus).toContain('Neon');
    expect(brief.commercialUseWarning).toContain('descriptive style terms');
  });

  it('exports all required modes', () => {
    expect(exportSunoPack(settings, pack, 'simple-prompt')).toContain('Neon Chase');
    expect(exportSunoPack(settings, pack, 'custom-mode-prompt')).toContain('Style of Music');
    expect(exportSunoPack(settings, pack, 'lyrics-only')).toContain('[Verse]');
    expect(exportSunoPack(settings, pack, 'style-tags-only')).toBe(pack.style);
    expect(exportSunoPack(settings, pack, 'full-production-brief')).toContain('Production Brief');
    expect(JSON.parse(exportSunoPack(settings, pack, 'json')).songIdea).toBe(settings.topic);
  });

  it('creates a music brief from a Flow/Veo scene pack', () => {
    const brief = createSunoBriefFromFlowVeo({
      title: 'Scene',
      styleBible: 'noir, neon',
      shotCards: [{ title: 'Shot 1' }, { title: 'Shot 2' }],
    } as FlowVeoScenePack);

    expect(brief.mood).toBe('noir, neon');
    expect(brief.hookIdeas).toEqual(['Shot 1', 'Shot 2']);
  });

  it('creates Flow/Veo shots from lyric sections', () => {
    const shots = createFlowVeoShotsFromLyrics(pack.lyrics, '9:16');

    expect(shots).toHaveLength(2);
    expect(shots[0].aspectRatio).toBe('9:16');
  });
});
