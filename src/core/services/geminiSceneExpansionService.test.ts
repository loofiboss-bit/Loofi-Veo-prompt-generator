import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  expandVideoSceneDetails,
  expandMusicDetails,
  generateVideoSceneAndPack,
  optimizeFullVideoPack,
} from './geminiSceneExpansionService';
import type {
  MusicPromptArtifactInput,
  VideoPromptArtifactInput,
} from '@core/types/promptArtifact';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), ollama: vi.fn(), provider: 'gemini' }));

vi.mock('./gemini/aiClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./gemini/aiClient')>()),
  getAiClientAsync: async () => ({ models: { generateContent: mocks.generate } }),
  getPromptModel: (requested?: string) => requested ?? 'gemini-3.8-flash',
  resilientCall: (callback: () => Promise<unknown>) => callback(),
}));
vi.mock('./promptGenerationService', () => ({
  resolvePromptGenerationProvider: () => mocks.provider,
}));
vi.mock('./ollamaProvider', () => ({ generatePromptWithOllama: mocks.ollama }));

const video: VideoPromptArtifactInput = {
  idea: 'A small fox waits for a train in the rain',
  target: 'flow-veo',
  mode: 'text-to-video',
  aspectRatio: '16:9',
  durationSeconds: 8,
};
const details = {
  subject: 'A small red fox with a canvas bag',
  action: 'Waits beneath the shelter as a train approaches',
  environment: 'A quiet rural platform in gentle rain',
  camera: 'Steady medium shot at fox eye level',
  lighting: 'Warm shelter light against cool dusk',
  style: 'Soft hand-drawn animation',
  audio: 'Rain patter and the distant train',
  dialogue: '',
  negativePrompt: '',
};
const pack = {
  primary: 'A small red fox waits under a railway shelter. Rain falls as a train approaches.',
  cinematic: 'Warm shelter light frames the waiting fox against cool rainy dusk.',
  controlFocused: 'Locked medium shot. The fox waits still as the train moves into the background.',
  negativePrompt: '',
};
const music: MusicPromptArtifactInput = {
  topic: 'Midnight train ride home through the rain',
  language: 'English',
};
const musicDetails = {
  genre: 'Indie pop',
  mood: 'Nostalgic',
  voice: 'Warm expressive vocals',
  tempo: '95 bpm',
  instruments: 'Analog synths and muted drums',
  structure: 'Pop' as const,
  lyrics: '[Verse]\nRain taps the train\n\n[Chorus]\nTake me home\n',
  mixNotes: 'Soft synth pads with clear vocals',
};
const respond = (value: unknown) =>
  mocks.generate.mockResolvedValueOnce({ text: JSON.stringify(value) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.provider = 'gemini';
});

describe('scene expansion', () => {
  it('develops coherent scene fields without imposing a style or inventing dialogue', async () => {
    respond({ ...details, dialogue: 'An unsolicited spoken line' });
    const result = await expandVideoSceneDetails(video);
    expect(result.subject).toBe(details.subject);
    expect(result.style).toBe(details.style);
    expect(result.dialogue).toBeUndefined();
    expect(mocks.generate.mock.calls[0][0].contents).toContain('do not impose a cinematic');
  });

  it('preserves the original manual value byte-for-byte', async () => {
    respond({ ...details, camera: 'A crane shot', environment: 'A city' });
    const result = await expandVideoSceneDetails({
      ...video,
      camera: '  Handheld 50mm\n',
      environment: '  Quiet platform  ',
    });
    expect(result.camera).toBe('  Handheld 50mm\n');
    expect(result.environment).toBe('  Quiet platform  ');
  });

  it('replaces only an explicitly selected field', async () => {
    respond({ camera: 'A gentle pan along the platform' });
    const source = { ...video, ...details };
    const result = await expandVideoSceneDetails(source, { editableFields: ['camera'] });
    expect(result).toEqual({ ...source, camera: 'A gentle pan along the platform' });
  });

  it('allows generating dialogue when the user explicitly selects that field', async () => {
    respond({ dialogue: 'The train is here' });
    const result = await expandVideoSceneDetails(video, { editableFields: ['dialogue'] });
    expect(result.dialogue).toBe('The train is here');
    expect(result.subject).toBeUndefined();
  });

  it('rejects unrequested keys during selected-field regeneration', async () => {
    respond({ camera: 'New pan', lighting: 'New light' });
    await expect(expandVideoSceneDetails(video, { editableFields: ['camera'] })).rejects.toThrow(
      'invalid fields',
    );
  });

  it('does not make a provider request when no fields may change', async () => {
    expect(await expandVideoSceneDetails(video, { editableFields: [] })).toEqual(video);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('supports the explicitly requested legacy overwrite option', async () => {
    respond(details);
    const result = await expandVideoSceneDetails(
      { ...video, camera: 'Manual camera' },
      { overwriteAll: true },
    );
    expect(result.camera).toBe(details.camera);
  });

  it.each([
    ['null', null],
    ['array', []],
    ['wrong field type', { ...details, camera: 42 }],
    ['missing field', { ...details, subject: undefined }],
    ['unexpected field', { ...details, model: 'other-model' }],
  ])('rejects %s without issuing another provider request', async (_label, value) => {
    respond(value);
    await expect(expandVideoSceneDetails(video)).rejects.toThrow('invalid fields');
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed JSON with a useful error', async () => {
    mocks.generate.mockResolvedValueOnce({ text: '{"subject":' });
    await expect(expandVideoSceneDetails(video)).rejects.toThrow('malformed JSON');
  });
});

describe('one-request scene and prompt generation', () => {
  it('returns editable details, three variants and actual routed model from one call', async () => {
    respond({
      details,
      ...pack,
      creativeDetails: { lensType: '35mm', weather: 'rain' },
      recommendations: ['Try portrait framing for a social clip.'],
    });
    const result = await generateVideoSceneAndPack(video, { model: 'gemini-4-argon' });
    expect(result.input.subject).toBe(details.subject);
    expect(result.input.creativeDetails).toEqual({ lensType: '35mm', weather: 'rain' });
    expect(result.pack).toEqual(pack);
    expect(result.modelId).toBe('gemini-4-argon');
    expect(result.recommendations).toHaveLength(1);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.generate.mock.calls[0][0].contents).toContain('flow-veo');
  });

  it('preserves manual fields and creative details in the combined result', async () => {
    const input = {
      ...video,
      camera: '  Locked frame\n',
      creativeDetails: { characterVisualDNA: 'Amber eyes; white-tipped tail' },
    };
    respond({
      details: { ...details, camera: input.camera },
      ...pack,
      creativeDetails: {
        characterVisualDNA: input.creativeDetails.characterVisualDNA,
        lensType: '50mm',
      },
      recommendations: [],
    });
    const result = await generateVideoSceneAndPack(input);
    expect(result.input.camera).toBe(input.camera);
    expect(result.input.creativeDetails?.characterVisualDNA).toBe(
      input.creativeDetails.characterVisualDNA,
    );
  });

  it('rejects a combined response that contradicts a protected manual field', async () => {
    respond({ details, ...pack, recommendations: [] });
    await expect(
      generateVideoSceneAndPack({ ...video, camera: 'A locked wide shot' }),
    ).rejects.toThrow('protected scene field: camera');
  });

  it('does not let the combined response fill a field outside the allowlist', async () => {
    respond({ details, ...pack, recommendations: [] });
    await expect(generateVideoSceneAndPack(video, { editableFields: ['camera'] })).rejects.toThrow(
      'protected scene field: subject',
    );
  });

  it('propagates a provider failure without a hidden fallback request', async () => {
    mocks.generate.mockRejectedValueOnce(new Error('API key rejected'));
    await expect(generateVideoSceneAndPack(video)).rejects.toThrow('API key rejected');
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.ollama).not.toHaveBeenCalled();
  });

  it('rejects a combined response that changes protected character identity', async () => {
    respond({
      details,
      ...pack,
      creativeDetails: { characterVisualDNA: 'Blue eyes' },
      recommendations: [],
    });
    await expect(
      generateVideoSceneAndPack({
        ...video,
        creativeDetails: { characterVisualDNA: 'Amber eyes' },
      }),
    ).rejects.toThrow('protected creative detail');
  });

  it('rejects invented speech rather than saving a contradictory pack', async () => {
    respond({ details: { ...details, dialogue: 'Hello there' }, ...pack, recommendations: [] });
    await expect(generateVideoSceneAndPack(video)).rejects.toThrow('invented dialogue');
  });

  it('accepts dialogue explicitly requested in the idea', async () => {
    const spoken = 'The train is here';
    respond({
      details: { ...details, dialogue: spoken },
      primary: spoken,
      cinematic: spoken,
      controlFocused: spoken,
      negativePrompt: '',
      recommendations: [],
    });
    expect(
      (await generateVideoSceneAndPack({ ...video, idea: 'A fox says the train is here' })).input
        .dialogue,
    ).toBe(spoken);
  });

  it.each(['sora', 'veo-api'] as const)(
    'blocks retired target %s before a provider call',
    async (target) => {
      await expect(generateVideoSceneAndPack({ ...video, target })).rejects.toThrow('retired');
      expect(mocks.generate).not.toHaveBeenCalled();
    },
  );

  it.each([
    { durationSeconds: 30 },
    { aspectRatio: '2.39:1' as const },
    { target: 'runway-gen3' as const, mode: 'ingredients' as const },
  ])('rejects unsupported profile settings before contacting the provider', async (updates) => {
    await expect(generateVideoSceneAndPack({ ...video, ...updates })).rejects.toThrow(
      'does not support',
    );
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('does not send project media IDs or provider handles in the scene context', async () => {
    respond({ details, ...pack, recommendations: [] });
    await generateVideoSceneAndPack({
      ...video,
      firstFrameAssetId: 'private-asset-id',
      referenceAssetIds: ['private-reference-id'],
      extensionSourceTakeId: 'private-take-id',
    });
    const prompt = mocks.generate.mock.calls[0][0].contents;
    expect(prompt).not.toContain('private-asset-id');
    expect(prompt).not.toContain('private-reference-id');
    expect(prompt).not.toContain('private-take-id');
  });

  it('rejects an incomplete pack and does not silently make a fallback call', async () => {
    respond({ details, ...pack, primary: '  ', recommendations: [] });
    await expect(generateVideoSceneAndPack(video)).rejects.toThrow('incomplete prompt variants');
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it('rejects an already cancelled operation without contacting a provider', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      generateVideoSceneAndPack(video, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('rejects a response received after cancellation', async () => {
    const controller = new AbortController();
    mocks.generate.mockImplementationOnce(async () => {
      controller.abort();
      return { text: JSON.stringify({ details, ...pack, recommendations: [] }) };
    });
    await expect(
      generateVideoSceneAndPack(video, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
});

describe('target-aware prompt variants', () => {
  it('uses distinct target rules and removes unsupported negative output', async () => {
    respond(pack);
    respond({ ...pack, negativePrompt: 'no blur' });
    await optimizeFullVideoPack({ ...video, target: 'kling' });
    const runway = await optimizeFullVideoPack({
      ...video,
      target: 'runway-gen3',
      mode: 'image-to-video',
    });
    const [klingCall, runwayCall] = mocks.generate.mock.calls;
    expect(klingCall[0].contents).toContain('kling');
    expect(runwayCall[0].contents).toContain('runway-gen3');
    expect(runwayCall[0].contents).toContain('image-to-video');
    expect(klingCall[0].contents).not.toBe(runwayCall[0].contents);
    expect(runway.negativePrompt).toBe('');
  });

  it('requires every native-audio variant to retain the exact spoken text', async () => {
    respond(pack);
    await expect(optimizeFullVideoPack({ ...video, dialogue: 'My exact line' })).rejects.toThrow(
      'protected dialogue',
    );
  });

  it('validates prompt string types instead of coercing provider data', async () => {
    respond({ ...pack, cinematic: { text: 'Invalid shape' } });
    await expect(optimizeFullVideoPack(video)).rejects.toThrow('invalid fields');
  });
});

describe('music expansion', () => {
  it('develops placeholders while preserving explicit manual values exactly', async () => {
    respond(musicDetails);
    const result = await expandMusicDetails({
      ...music,
      voice: 'Any',
      tempo: 'Any',
      structure: 'Auto',
      mood: '  Joyful\n',
    });
    expect(result.voice).toBe(musicDetails.voice);
    expect(result.tempo).toBe('95 bpm');
    expect(result.structure).toBe('Pop');
    expect(result.mood).toBe('  Joyful\n');
  });

  it('rejects an unknown song structure', async () => {
    respond({ ...musicDetails, structure: 'Invalid' });
    await expect(expandMusicDetails(music)).rejects.toThrow('invalid fields');
  });

  it('preserves locked lyric section bytes even during full overwrite', async () => {
    const original = '[Verse]\nOriginal verse\n\n[Chorus]\n  My locked hook  \n';
    respond({ ...musicDetails, lyrics: '[Verse]\nNew verse\n\n[Chorus]\nChanged hook\n' });
    const result = await expandMusicDetails(
      { ...music, lyrics: original },
      { overwriteAll: true, lockedSections: ['[Chorus]'] },
    );
    expect(result.lyrics).toBe('[Verse]\nNew verse\n\n[Chorus]\n  My locked hook  \n');
  });

  it('rejects rewritten lyric structures when a section is locked', async () => {
    respond({ ...musicDetails, lyrics: '[Verse]\nOnly a verse\n' });
    await expect(
      expandMusicDetails(
        { ...music, lyrics: '[Verse]\nOriginal\n[Chorus]\nHook\n' },
        { overwriteAll: true, lockedSections: ['[Chorus]'] },
      ),
    ).rejects.toThrow('section order or count');
  });

  it('keeps instrumental output free of invented lyrics', async () => {
    respond(musicDetails);
    expect((await expandMusicDetails({ ...music, instrumental: true })).lyrics).toBe(
      '[Instrumental]',
    );
  });

  it('uses the selected local provider without starting a Gemini call', async () => {
    mocks.provider = 'ollama';
    mocks.ollama.mockResolvedValueOnce(JSON.stringify(musicDetails));
    expect((await expandMusicDetails(music)).genre).toBe('Indie pop');
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.ollama).toHaveBeenCalledTimes(1);
  });
});
