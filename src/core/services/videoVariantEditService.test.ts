import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { compileVideoPromptArtifact } from './promptStudioService';
import { editStudioVariant } from './promptStudioEditingService';
import { proposeVideoVariantEdit, type VideoVariantEditField } from './videoVariantEditService';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), ollama: vi.fn() }));
vi.mock('./gemini/aiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./gemini/aiClient')>();
  return {
    ...actual,
    DEFAULT_PROMPT_MODEL: 'gemini-test',
    getAiClientAsync: async () => ({ models: { generateContent: mocks.generate } }),
    getPromptModel: () => 'gemini-test',
    resilientCall: (callback: () => Promise<unknown>) => callback(),
  };
});
vi.mock('./ollamaProvider', () => ({ generatePromptWithOllama: mocks.ollama }));

const makeArtifact = () =>
  editStudioVariant(
    compileVideoPromptArtifact({
      idea: 'Original brief',
      target: 'kling',
      mode: 'text-to-video',
      durationSeconds: 8,
      aspectRatio: '16:9',
    }),
    1,
    { prompt: 'My exact manually edited alternative. “Hej!”', negativePrompt: 'unwanted signs' },
  );

describe('selected video variant proposals', () => {
  beforeEach(() => {
    mocks.generate.mockReset().mockResolvedValue({ text: '{"prompt":"A concise proposal"}' });
    mocks.ollama.mockReset().mockResolvedValue('{"prompt":"Local proposal"}');
    useSettingsStore.setState({
      promptGenerationProvider: 'gemini',
      localLlmEndpoint: 'http://localhost:11434',
      localLlmModel: 'local-editor',
    });
  });

  it('sends the actual edited alternative to Gemini and returns only a typed proposal', async () => {
    const artifact = makeArtifact();
    const original = structuredClone(artifact);
    const result = await proposeVideoVariantEdit({
      artifact,
      variantIndex: 1,
      fields: ['prompt'],
      direction: 'Shorten',
    });
    const request = mocks.generate.mock.calls[0][0];
    expect(request).toMatchObject({
      model: 'gemini-test',
      config: { responseMimeType: 'application/json' },
    });
    expect(request.contents).toContain('My exact manually edited alternative. “Hej!”');
    expect(request.contents).toContain('Original brief');
    expect(request.config.responseJsonSchema).toMatchObject({
      required: ['prompt'],
      additionalProperties: false,
    });
    expect(result).toMatchObject({
      before: {
        prompt: 'My exact manually edited alternative. “Hej!”',
        negativePrompt: 'unwanted signs',
      },
      patch: { prompt: 'A concise proposal' },
      provenance: { provider: 'gemini', source: 'optimizer' },
    });
    expect(artifact).toEqual(original);
    expect(mocks.ollama).not.toHaveBeenCalled();
  });

  it('uses the configured local Ollama model and permits explicitly clearing the negative prompt', async () => {
    useSettingsStore.setState({ promptGenerationProvider: 'ollama' });
    mocks.ollama.mockResolvedValue('{"negativePrompt":""}');
    const result = await proposeVideoVariantEdit({
      artifact: makeArtifact(),
      variantIndex: 1,
      fields: ['negativePrompt'],
      direction: 'Clear the negative prompt',
    });
    expect(mocks.ollama).toHaveBeenCalledWith(expect.stringContaining('unwanted signs'), {
      baseUrl: 'http://localhost:11434',
      model: 'local-editor',
    });
    expect(result.patch).toEqual({ negativePrompt: '' });
    expect(result.provenance.provider).toBe('ollama');
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it.each(['gemini', 'ollama'] as const)(
    'accepts JSON wrapped in markdown code fences from %s',
    async (provider) => {
      useSettingsStore.setState({ promptGenerationProvider: provider });
      const raw = '```json\n{"prompt":"A fenced proposal"}\n```';
      mocks.generate.mockResolvedValue({ text: raw });
      mocks.ollama.mockResolvedValue(raw);
      const result = await proposeVideoVariantEdit({
        artifact: makeArtifact(),
        variantIndex: 1,
        fields: ['prompt'],
        direction: 'Shorten',
      });
      expect(result.patch).toEqual({ prompt: 'A fenced proposal' });
    },
  );

  it.each(['gemini', 'ollama'] as const)(
    'rejects malformed or unrequested output from %s without changing the artifact',
    async (provider) => {
      useSettingsStore.setState({ promptGenerationProvider: provider });
      const artifact = makeArtifact();
      const original = structuredClone(artifact);
      for (const text of [
        'not JSON',
        'null',
        '[]',
        '{}',
        '{"prompt":7}',
        '{"prompt":"  "}',
        '{"prompt":"changed","negativePrompt":"unexpected"}',
      ]) {
        mocks.generate.mockResolvedValue({ text });
        mocks.ollama.mockResolvedValue(text);
        await expect(
          proposeVideoVariantEdit({
            artifact,
            variantIndex: 1,
            fields: ['prompt'],
            direction: 'Shorten',
          }),
        ).rejects.toThrow();
        expect(artifact).toEqual(original);
      }
    },
  );

  it('snapshots the source and requested fields before an asynchronous response', async () => {
    const artifact = makeArtifact();
    const fields: VideoVariantEditField[] = ['prompt'];
    let complete!: (value: { text: string }) => void;
    mocks.generate.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const pending = proposeVideoVariantEdit({
      artifact,
      variantIndex: 1,
      fields,
      direction: 'Shorten',
    });
    (artifact.alternatives[0] as { prompt: string }).prompt = 'New manual edit';
    fields.push('negativePrompt');
    await vi.waitFor(() => expect(mocks.generate).toHaveBeenCalled());
    complete({ text: '{"prompt":"Proposed before newer edits"}' });
    expect((await pending).before.prompt).toBe('My exact manually edited alternative. “Hej!”');
  });

  it('rejects missing directions or fields before calling a provider', async () => {
    const artifact = makeArtifact();
    await expect(
      proposeVideoVariantEdit({ artifact, variantIndex: 1, fields: [], direction: 'Shorten' }),
    ).rejects.toThrow(/Choose/);
    await expect(
      proposeVideoVariantEdit({ artifact, variantIndex: 1, fields: ['prompt'], direction: ' ' }),
    ).rejects.toThrow(/Describe/);
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.ollama).not.toHaveBeenCalled();
  });

  it('propagates provider errors without compiling replacement variants', async () => {
    const artifact = makeArtifact();
    const original = structuredClone(artifact);
    mocks.generate.mockRejectedValue(new Error('Provider unavailable'));
    await expect(
      proposeVideoVariantEdit({
        artifact,
        variantIndex: 1,
        fields: ['prompt'],
        direction: 'Shorten',
      }),
    ).rejects.toThrow('Provider unavailable');
    expect(artifact).toEqual(original);
  });

  describe('applyLocalPromptTransform', () => {
    it('applies clean-compact by removing filler words and cleaning commas', async () => {
      const { applyLocalPromptTransform } = await import('./videoVariantEditService');
      const artifact = makeArtifact();
      (artifact.primary as { prompt: string }).prompt =
        'A sleek sports car, highly detailed, photorealistic, 4k resolution, driving through neon city.';
      const res = applyLocalPromptTransform(artifact, 0, 'clean-compact');
      expect(res.patch.prompt).toBe('A sleek sports car, driving through neon city.');
      expect(res.provenance.provider).toBe('local');
    });

    it('formats Kling camera bracket syntax in sync-target-grammar', async () => {
      const { applyLocalPromptTransform } = await import('./videoVariantEditService');
      const artifact = makeArtifact();
      artifact.target = 'kling';
      (artifact.primary as { prompt: string }).prompt =
        'A dancer on stage, camera: Slow Pan Left, golden light';
      const res = applyLocalPromptTransform(artifact, 0, 'sync-target-grammar');
      expect(res.patch.prompt).toContain('[camera: Slow Pan Left]');
    });

    it.each([
      ['sora', 'Captured on 35mm motion picture camera'],
      ['luma-ray', 'Smooth Orbit Right trajectory'],
      ['wan-video', 'Deliberate Orbit Right cinematic move'],
      ['minimax-hailuo', 'Dynamic Orbit Right framing'],
      ['runway-gen3', 'Cinematic Orbit Right, fluid tracking'],
      ['flow-veo', 'Camera: Orbit Right'],
    ] as const)('adapts camera syntax for %s in sync-target-grammar', async (target, expected) => {
      const { applyLocalPromptTransform, hasVariantEditChanges } =
        await import('./videoVariantEditService');
      const artifact = makeArtifact();
      artifact.target = target;
      (artifact.primary as { prompt: string }).prompt =
        'A runner on a wet bridge, [camera: Orbit Right].';
      const res = applyLocalPromptTransform(artifact, 0, 'sync-target-grammar');
      expect(res.patch.prompt).toContain(expected);
      expect(hasVariantEditChanges(res)).toBe(true);
    });

    it('preserves dialogue tokens even if they match buzzword patterns in clean-compact', async () => {
      const { applyLocalPromptTransform } = await import('./videoVariantEditService');
      const artifact = makeArtifact();
      (artifact.primary as { prompt: string }).prompt =
        'Futuristic developer in a lab, 4k resolution, photorealistic. Dialogue: the speaker says: "We built this in Unreal Engine 5, trending on ArtStation!" Ambient hum.';
      const res = applyLocalPromptTransform(artifact, 0, 'clean-compact');
      expect(res.patch.prompt).toContain(
        'Dialogue: the speaker says: "We built this in Unreal Engine 5, trending on ArtStation!"',
      );
      expect(res.patch.prompt).not.toContain('4k resolution');
      expect(res.patch.prompt).not.toContain('photorealistic');
    });

    it('detects when a local transform produces no changes', async () => {
      const { applyLocalPromptTransform, hasVariantEditChanges } =
        await import('./videoVariantEditService');
      const artifact = makeArtifact();
      (artifact.primary as { prompt: string }).prompt = 'Clean concise studio shot.';
      const res = applyLocalPromptTransform(artifact, 0, 'clean-compact');
      expect(hasVariantEditChanges(res)).toBe(false);
    });

    it('hardens negative prompt without duplicating existing tokens', async () => {
      const { applyLocalPromptTransform } = await import('./videoVariantEditService');
      const artifact = makeArtifact();
      (artifact.primary as { negativePrompt: string }).negativePrompt = 'blurry, watermark';
      const res = applyLocalPromptTransform(artifact, 0, 'harden-negative');
      expect(res.patch.negativePrompt).toContain('blurry');
      expect(res.patch.negativePrompt).toContain('distorted anatomy');
      expect(res.patch.negativePrompt).toContain('deformed hands');
      // Should not repeat watermark twice
      const count = (res.patch.negativePrompt?.match(/watermark/g) || []).length;
      expect(count).toBe(1);
    });

    it('applies batch local transform across all three video variants simultaneously', async () => {
      const { applyBatchLocalPromptTransform } = await import('./videoVariantEditService');
      const artifact = makeArtifact();
      (artifact.primary as { prompt: string }).prompt = 'Shot A, 4k resolution, photorealistic.';
      (artifact.alternatives[0] as { prompt: string }).prompt =
        'Shot B, octane render, unreal engine 5.';
      (artifact.alternatives[1] as { prompt: string }).prompt = 'Shot C, trending on artstation.';
      const res = applyBatchLocalPromptTransform(artifact, 'clean-compact');
      expect(res.changed).toBe(true);
      expect((res.artifact.primary as { prompt: string }).prompt).toBe('Shot A.');
      expect((res.artifact.alternatives[0] as { prompt: string }).prompt).toBe('Shot B.');
      expect((res.artifact.alternatives[1] as { prompt: string }).prompt).toBe('Shot C.');
    });
  });

  describe('applyLocalMusicTransform', () => {
    it('normalizes section headers while preserving locked sections', async () => {
      const { compileMusicPromptArtifact } = await import('./promptStudioService');
      const { editStudioVariant } = await import('./promptStudioEditingService');
      const { applyLocalMusicTransform } = await import('./videoVariantEditService');
      const base = compileMusicPromptArtifact({
        topic: 'Midnight train',
        language: 'English',
      });
      const edited = editStudioVariant(base, 0, {
        lyrics: 'verse 1:\nWalking alone\n[Chorus]\nLocked chorus line\nbridge -\nTurning back',
      });
      const res = applyLocalMusicTransform(edited, 0, 'normalize-sections', ['[Chorus]']);
      expect(res.changed).toBe(true);
      const primary = res.artifact.primary as { lyrics: string };
      expect(primary.lyrics).toContain('[Verse 1]\nWalking alone');
      expect(primary.lyrics).toContain('[Chorus]\nLocked chorus line');
      expect(primary.lyrics).toContain('[Bridge]\nTurning back');
    });

    it('cleans style tags, removes visual diffusion terms, and caps style length at 200 chars', async () => {
      const { compileMusicPromptArtifact } = await import('./promptStudioService');
      const { editStudioVariant } = await import('./promptStudioEditingService');
      const { applyLocalMusicTransform } = await import('./videoVariantEditService');
      const base = compileMusicPromptArtifact({
        topic: 'Midnight train',
        language: 'English',
      });
      const edited = editStudioVariant(base, 0, {
        styleOfMusic:
          'synthwave, Synthwave, 4k resolution, photorealistic, warm analog pads, driving arpeggio bassline, crisp LinnDrum percussion, atmospheric reverb, vintage tape saturation, nostalgic 1980s soundtrack, wide stereo field, shimmering leads, deep sub bass',
      });
      const res = applyLocalMusicTransform(edited, 0, 'clean-style');
      expect(res.changed).toBe(true);
      const primary = res.artifact.primary as { styleOfMusic: string };
      expect(primary.styleOfMusic.length).toBeLessThanOrEqual(200);
      expect(primary.styleOfMusic.toLowerCase()).not.toContain('4k resolution');
      expect(primary.styleOfMusic.toLowerCase()).not.toContain('photorealistic');
    });

    it('applies batch local music transform across all three music variants', async () => {
      const { compileMusicPromptArtifact } = await import('./promptStudioService');
      const { editStudioVariant } = await import('./promptStudioEditingService');
      const { applyBatchLocalMusicTransform } = await import('./videoVariantEditService');
      let base = compileMusicPromptArtifact({
        topic: 'Midnight train',
        language: 'English',
      });
      base = editStudioVariant(base, 0, { styleOfMusic: 'synthwave, 4k resolution' });
      base = editStudioVariant(base, 1, { styleOfMusic: 'ambient, photorealistic' });
      base = editStudioVariant(base, 2, { styleOfMusic: 'indie pop, octane render' });
      const res = applyBatchLocalMusicTransform(base, 'strip-visual-terms');
      expect(res.changed).toBe(true);
      expect((res.artifact.primary as { styleOfMusic: string }).styleOfMusic).toBe('synthwave');
      expect((res.artifact.alternatives[0] as { styleOfMusic: string }).styleOfMusic).toBe(
        'ambient',
      );
      expect((res.artifact.alternatives[1] as { styleOfMusic: string }).styleOfMusic).toBe(
        'indie pop',
      );
    });
  });
});
