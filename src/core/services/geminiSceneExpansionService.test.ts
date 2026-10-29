import { describe, expect, it, vi } from 'vitest';
import {
  expandVideoSceneDetails,
  expandMusicDetails,
  optimizeFullVideoPack,
} from './geminiSceneExpansionService';
import type {
  MusicPromptArtifactInput,
  VideoPromptArtifactInput,
} from '@core/types/promptArtifact';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  ollama: vi.fn(),
}));

vi.mock('./gemini/aiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./gemini/aiClient')>();
  return {
    ...actual,
    getAiClientAsync: async () => ({ models: { generateContent: mocks.generate } }),
    getPromptModel: () => 'gemini-3.8-flash',
    resilientCall: (callback: () => Promise<unknown>) => callback(),
  };
});

vi.mock('./promptGenerationService', () => ({
  resolvePromptGenerationProvider: () => 'gemini',
}));

describe('geminiSceneExpansionService', () => {
  const baseVideoInput: VideoPromptArtifactInput = {
    idea: 'A developer gets rejected because he vibecoded everything',
    target: 'flow-veo',
    mode: 'text-to-video',
    aspectRatio: '16:9',
    durationSeconds: 8,
  };

  it('expands empty video scene details with smart merge by default', async () => {
    mocks.generate.mockResolvedValueOnce({
      text: JSON.stringify({
        subject: 'A stressed junior programmer across a glass desk',
        action: 'Looks down awkwardly as interviewer gestures at code on screen',
        environment: 'Sleek corporate tech boardroom with city skyline view',
        camera: 'Slow push-in from medium shot to close-up, 35mm lens',
        lighting: 'Cool blue fluorescent light blended with warm window glow',
        style: '35mm cinematic texture, subtle grain, shallow depth of field',
        audio: 'Keyboard clicks, distant city hum, uncomfortable silence',
        dialogue: 'Did you actually write any of these functions?',
        negativePrompt: 'blurry, cartoonish, distorted faces, jitter',
      }),
    });

    const result = await expandVideoSceneDetails(baseVideoInput);

    expect(result.subject).toContain('stressed junior programmer');
    expect(result.action).toContain('Looks down awkwardly');
    expect(result.environment).toContain('Sleek corporate');
    expect(result.camera).toContain('Slow push-in');
    expect(result.audio).toContain('uncomfortable silence');
    expect(result.dialogue).toBe('Did you actually write any of these functions?');
  });

  it('preserves existing manual fields when overwriteAll is false', async () => {
    const inputWithCustomCamera: VideoPromptArtifactInput = {
      ...baseVideoInput,
      camera: 'Handheld 50mm documentary style camera',
      environment: 'Vintage startup garage',
    };

    mocks.generate.mockResolvedValueOnce({
      text: JSON.stringify({
        subject: 'An exhausted coder',
        action: 'Scratches head while staring at error log',
        environment: 'Modern shiny high-rise office', // Should NOT overwrite existing
        camera: 'Crane shot sweeping from above', // Should NOT overwrite existing
        lighting: 'Moody neon rim lighting',
        style: 'Cinematic realism',
        audio: 'Heavy keyboard clatter',
        negativePrompt: 'low quality, blurry',
      }),
    });

    const result = await expandVideoSceneDetails(inputWithCustomCamera, {
      overwriteAll: false,
    });

    // Retained user manual fields
    expect(result.camera).toBe('Handheld 50mm documentary style camera');
    expect(result.environment).toBe('Vintage startup garage');
    // Filled in missing fields
    expect(result.subject).toBe('An exhausted coder');
    expect(result.lighting).toBe('Moody neon rim lighting');
  });

  it('overwrites all fields when overwriteAll is true', async () => {
    const inputWithCustomCamera: VideoPromptArtifactInput = {
      ...baseVideoInput,
      camera: 'Handheld 50mm',
    };

    mocks.generate.mockResolvedValueOnce({
      text: JSON.stringify({
        subject: 'New AI subject',
        action: 'New AI action',
        environment: 'New AI environment',
        camera: 'Dolly zoom vertigo shot',
        lighting: 'Dramatic chiaroscuro',
        style: 'Noir',
        audio: 'Clock ticking',
        negativePrompt: 'jitter',
      }),
    });

    const result = await expandVideoSceneDetails(inputWithCustomCamera, {
      overwriteAll: true,
    });

    expect(result.camera).toBe('Dolly zoom vertigo shot');
    expect(result.subject).toBe('New AI subject');
  });

  it('expands music details into complete Suno structure and lyrics', async () => {
    const musicInput: MusicPromptArtifactInput = {
      topic: 'Midnight train ride home through the rain',
      language: 'English',
    };

    mocks.generate.mockResolvedValueOnce({
      text: JSON.stringify({
        genre: 'Synthwave, Indie pop',
        mood: 'Nostalgic, Melancholy',
        voice: 'Warm emotive male vocals',
        tempo: '95 bpm',
        instruments: 'Analog synths, gentle electric guitar, muted drums',
        structure: 'Pop',
        lyrics:
          '[Intro]\n(rain on train windows)\n\n[Verse 1]\nRolling past the streetlights...\n\n[Chorus]\nTake me home tonight...',
        mixNotes: 'Wide stereo synth pads, punchy low-end',
      }),
    });

    const result = await expandMusicDetails(musicInput);

    expect(result.genre).toBe('Synthwave, Indie pop');
    expect(result.mood).toBe('Nostalgic, Melancholy');
    expect(result.lyrics).toContain('[Chorus]');
  });

  it('optimizes full video pack into 3 5-pillar cinematic variants', async () => {
    mocks.generate.mockResolvedValueOnce({
      text: JSON.stringify({
        primary: 'A tense corporate interview in a glass boardroom. Anchor shot 35mm.',
        cinematic:
          'Cinematic texture with 40mm anamorphic lens, shallow depth of field, warm rim light.',
        controlFocused:
          'Locked dolly movement on slider, perfectly stabilized motion for 8 seconds.',
        negativePrompt: 'morphing, jitter, blurry, unnatural motion',
      }),
    });

    const result = await optimizeFullVideoPack(baseVideoInput);

    expect(result.primary).toContain('A tense corporate interview');
    expect(result.cinematic).toContain('40mm anamorphic lens');
    expect(result.controlFocused).toContain('Locked dolly movement');
    expect(result.negativePrompt).toContain('morphing, jitter');
  });
});
