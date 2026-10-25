import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { compileMusicPromptArtifact, compileVideoPromptArtifact } from './promptStudioService';
import { editStudioVariant } from './promptStudioEditingService';
import {
  proposeMusicVariantEdit,
  proposeVideoVariantEdit,
  type MusicVariantEditField,
  type VideoVariantEditField,
} from './videoVariantEditService';
import { segmentPromptText } from './promptTextSegments';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  ollama: vi.fn(),
  retryOptions: undefined as unknown,
}));
vi.mock('./gemini/aiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./gemini/aiClient')>();
  return {
    ...actual,
    DEFAULT_PROMPT_MODEL: 'gemini-test',
    getAiClientAsync: async () => ({ models: { generateContent: mocks.generate } }),
    getPromptModel: () => 'gemini-test',
    resilientCall: (callback: () => Promise<unknown>, options: unknown) => {
      mocks.retryOptions = options;
      return callback();
    },
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

const makeMusicArtifact = (
  instrumental = false,
  lyrics = '[Verse 1]\nOriginal verse\n\n[Chorus]\nOriginal chorus\n\n[Chorus]\nLocked chorus',
) =>
  editStudioVariant(
    compileMusicPromptArtifact({
      topic: 'Night train',
      language: 'Swedish',
      genre: 'folk',
      instrumental,
      lyrics: instrumental ? '[Instrumental]' : lyrics,
    }),
    1,
    {
      styleOfMusic: 'My manually edited Nordic folk style',
      lyrics: instrumental ? '[Instrumental]' : lyrics,
    },
  );

describe('selected video variant proposals', () => {
  beforeEach(() => {
    mocks.generate
      .mockReset()
      .mockResolvedValue({ text: '{"prompt":"A concise proposal. “Hej!”"}' });
    mocks.ollama.mockReset().mockResolvedValue('{"prompt":"Local proposal. “Hej!”"}');
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
      patch: { prompt: 'A concise proposal. “Hej!”' },
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
      signal: undefined,
      jsonSchema: {
        type: 'object',
        properties: { negativePrompt: { type: 'string' } },
        required: ['negativePrompt'],
        additionalProperties: false,
      },
    });
    expect(result.patch).toEqual({ negativePrompt: '' });
    expect(result.provenance.provider).toBe('ollama');
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('passes the cancellation signal through Gemini and discards a late response', async () => {
    const controller = new AbortController();
    let complete!: (value: { text: string }) => void;
    mocks.generate.mockReturnValue(new Promise((resolve) => (complete = resolve)));
    const pending = proposeVideoVariantEdit({
      artifact: makeArtifact(),
      variantIndex: 1,
      fields: ['prompt'],
      direction: 'Shorten',
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(mocks.generate).toHaveBeenCalled());
    expect(mocks.generate.mock.calls[0][0].config.abortSignal).toBe(controller.signal);
    expect(mocks.retryOptions).toMatchObject({ signal: controller.signal });
    controller.abort();
    complete({ text: '{"prompt":"Late result. “Hej!”"}' });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it.each(['gemini', 'ollama'] as const)(
    'accepts JSON wrapped in markdown code fences from %s',
    async (provider) => {
      useSettingsStore.setState({ promptGenerationProvider: provider });
      const raw = '```json\n{"prompt":"A fenced proposal. “Hej!”"}\n```';
      mocks.generate.mockResolvedValue({ text: raw });
      mocks.ollama.mockResolvedValue(raw);
      const result = await proposeVideoVariantEdit({
        artifact: makeArtifact(),
        variantIndex: 1,
        fields: ['prompt'],
        direction: 'Shorten',
      });
      expect(result.patch).toEqual({ prompt: 'A fenced proposal. “Hej!”' });
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
    complete({ text: '{"prompt":"Proposed before newer edits. “Hej!”"}' });
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

  it.each([
    { fields: ['styleOfMusic'] as MusicVariantEditField[], key: 'styleOfMusic' },
    { fields: ['lyrics'] as MusicVariantEditField[], key: 'lyrics' },
  ])('proposes only the requested edited music field: $key', async ({ fields, key }) => {
    const artifact = makeMusicArtifact();
    const original = structuredClone(artifact);
    const value = key === 'styleOfMusic' ? 'Nordic guitar, brushed drums' : '[Verse 1]\nNew';
    mocks.generate.mockResolvedValue({ text: JSON.stringify({ [key]: value }) });

    const result = await proposeMusicVariantEdit({
      artifact,
      variantIndex: 1,
      fields,
      direction: 'Make this warmer',
    });

    expect(mocks.generate.mock.calls[0][0].contents).toContain(
      'My manually edited Nordic folk style',
    );
    expect(mocks.generate.mock.calls[0][0].contents).toContain('Original chorus');
    expect(mocks.generate.mock.calls[0][0].config.responseJsonSchema).toMatchObject({
      required: fields,
      additionalProperties: false,
    });
    expect(result.before.styleOfMusic).toBe('My manually edited Nordic folk style');
    expect(result.patch).toEqual({ [key]: value });
    expect(artifact).toEqual(original);
    expect(mocks.ollama).not.toHaveBeenCalled();
  });

  it('proposes both music fields and leaves style limits to local validation', async () => {
    const artifact = makeMusicArtifact();
    mocks.generate.mockResolvedValue({
      text: JSON.stringify({ styleOfMusic: 'Acoustic folk', lyrics: '[Chorus]\nA new hook' }),
    });
    const result = await proposeMusicVariantEdit({
      artifact,
      variantIndex: 1,
      fields: ['styleOfMusic', 'lyrics'],
      direction: 'Make this more intimate',
      lockedSections: [],
    });
    expect(result.patch).toEqual({ styleOfMusic: 'Acoustic folk', lyrics: '[Chorus]\nA new hook' });
    expect(mocks.generate.mock.calls[0][0].config.responseJsonSchema.required).toEqual([
      'styleOfMusic',
      'lyrics',
    ]);
  });

  it('preserves only the locked repeated lyric occurrence exactly', async () => {
    const artifact = makeMusicArtifact();
    const proposed =
      '[Verse 1]\nChanged verse\n\n[Chorus]\nChanged first\n\n[Chorus]\nWrong locked text';
    mocks.generate.mockResolvedValue({ text: JSON.stringify({ lyrics: proposed }) });
    const result = await proposeMusicVariantEdit({
      artifact,
      variantIndex: 1,
      fields: ['lyrics'],
      direction: 'Rewrite around the locked hook',
      lockedSections: ['[Chorus] #2'],
    });
    expect(result.patch.lyrics).toBe(
      '[Verse 1]\nChanged verse\n\n[Chorus]\nChanged first\n\n[Chorus]\nLocked chorus',
    );
  });

  it('rejects a lyric response that changes the structure around a lock', async () => {
    mocks.generate.mockResolvedValue({
      text: JSON.stringify({ lyrics: '[Verse 1]\nChanged verse\n\n[Chorus]\nChanged hook' }),
    });
    await expect(
      proposeMusicVariantEdit({
        artifact: makeMusicArtifact(),
        variantIndex: 1,
        fields: ['lyrics'],
        direction: 'Rewrite',
        lockedSections: ['[Chorus] #2'],
      }),
    ).rejects.toThrow(/section order or count/);
  });

  it('blocks lyric edits in instrumental mode before invoking a provider', async () => {
    await expect(
      proposeMusicVariantEdit({
        artifact: makeMusicArtifact(true),
        variantIndex: 1,
        fields: ['lyrics'],
        direction: 'Add words',
      }),
    ).rejects.toThrow(/instrumental mode/);
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.ollama).not.toHaveBeenCalled();
  });

  it('uses Ollama structured output for a music variant without provider fallback', async () => {
    useSettingsStore.setState({ promptGenerationProvider: 'ollama' });
    mocks.ollama.mockResolvedValue(JSON.stringify({ styleOfMusic: 'Acoustic' }));
    const artifact = makeMusicArtifact();
    const result = await proposeMusicVariantEdit({
      artifact,
      variantIndex: 1,
      fields: ['styleOfMusic'],
      direction: 'Simplify the arrangement',
    });
    expect(mocks.ollama).toHaveBeenCalledWith(
      expect.stringContaining('current Suno music variant'),
      {
        baseUrl: 'http://localhost:11434',
        model: 'local-editor',
        signal: undefined,
        jsonSchema: {
          type: 'object',
          properties: { styleOfMusic: { type: 'string' } },
          required: ['styleOfMusic'],
          additionalProperties: false,
        },
      },
    );
    expect(result.patch).toEqual({ styleOfMusic: 'Acoustic' });
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('rejects malformed, unrequested, or overlong music output', async () => {
    const artifact = makeMusicArtifact();
    for (const text of [
      'not JSON',
      JSON.stringify({ styleOfMusic: 'ok', lyrics: 'unexpected' }),
      JSON.stringify({ styleOfMusic: 'x'.repeat(201) }),
    ]) {
      mocks.generate.mockResolvedValue({ text });
      await expect(
        proposeMusicVariantEdit({
          artifact,
          variantIndex: 1,
          fields: ['styleOfMusic'],
          direction: 'Simplify the arrangement',
        }),
      ).rejects.toThrow();
    }
  });

  it.each([
    ['changed', 'A runner says “changed line one” and “line two”.'],
    ['omitted', 'A runner says “line one”.'],
    ['reordered', 'A runner says “line two” and “line one”.'],
  ])('rejects %s protected dialogue changes in AI output', async (_case, proposed) => {
    const artifact = editStudioVariant(
      compileVideoPromptArtifact({
        idea: 'A runner',
        target: 'runway-gen3',
        mode: 'text-to-video',
        durationSeconds: 8,
        aspectRatio: '16:9',
      }),
      1,
      { prompt: 'A runner says “line one” and “line two”.' },
    );
    mocks.generate.mockResolvedValue({ text: JSON.stringify({ prompt: proposed }) });
    await expect(
      proposeVideoVariantEdit({
        artifact,
        variantIndex: 1,
        fields: ['prompt'],
        direction: 'Shorten',
      }),
    ).rejects.toThrow(/protected dialogue/);
  });

  it('allows a dialogue rewrite only after explicit opt-in', async () => {
    const artifact = makeArtifact();
    mocks.generate.mockResolvedValue({ text: '{"prompt":"Rewritten dialogue."}' });
    const result = await proposeVideoVariantEdit({
      artifact,
      variantIndex: 1,
      fields: ['prompt'],
      direction: 'Rewrite the dialogue',
      allowDialogueRewrite: true,
    });
    expect(result.patch.prompt).toBe('Rewritten dialogue.');
  });

  it.each([
    'flow-veo',
    'veo-api',
    'kling',
    'runway-gen3',
    'sora',
    'luma-ray',
    'wan-video',
    'minimax-hailuo',
  ] as const)(
    'keeps quoted and supplied dialogue byte-exact for local %s grammar',
    async (target) => {
      const dialogue = 'The camera is moving. It says "Camera moves" and "slowly panning".';
      const artifact = editStudioVariant(
        compileVideoPromptArtifact({
          idea: 'A runner, the camera is moving outside, camera: Orbit Right.',
          dialogue,
          audio: 'The camera is moving after dialogue.',
          target,
          mode: 'text-to-video',
          durationSeconds: 8,
          aspectRatio: '16:9',
        }),
        0,
        {
          prompt: `A runner, the camera is moving outside, camera: Orbit Right. Dialogue: the speaker says: ${dialogue}. Audio: room tone.`,
        },
      );
      const selected = artifact.primary as { prompt: string };
      const withQuotedCameraWords = `${selected.prompt} "Camera: slowly panning".`;
      const edited = editStudioVariant(artifact, 0, { prompt: withQuotedCameraWords });
      const result = await import('./videoVariantEditService').then(
        ({ applyLocalPromptTransform }) =>
          applyLocalPromptTransform(edited, 0, 'sync-target-grammar'),
      );
      const protectedSegments = segmentPromptText(withQuotedCameraWords, dialogue)
        .filter((segment) => segment.protected)
        .map((segment) => segment.text);
      let cursor = 0;
      for (const protectedSegment of protectedSegments) {
        const found = result.patch.prompt!.indexOf(protectedSegment, cursor);
        expect(found).toBeGreaterThanOrEqual(0);
        cursor = found + protectedSegment.length;
      }
      expect(result.patch.prompt).toContain(dialogue);
      expect(result.patch.prompt).toContain('"Camera: slowly panning"');
    },
  );

  describe('applyLocalPromptTransform', () => {
    it.each(['flow-veo', 'veo-api'] as const)(
      'preserves quoted sentence spacing and adds no fallback for %s',
      async (target) => {
        const { applyLocalPromptTransform } = await import('./videoVariantEditService');
        const artifact = makeArtifact();
        artifact.target = target;
        (artifact.primary as { prompt: string }).prompt = 'A runner says "Hello" outside.';

        const result = applyLocalPromptTransform(artifact, 0, 'sync-target-grammar');

        expect(result.patch.prompt).toBe('A runner says "Hello" outside.');
      },
    );

    it('adds one target fallback after the whole prompt without disturbing dialogue spaces', async () => {
      const { applyLocalPromptTransform } = await import('./videoVariantEditService');
      const artifact = makeArtifact();
      artifact.target = 'kling';
      (artifact.primary as { prompt: string }).prompt = 'A runner says "Hello" outside.';

      const result = applyLocalPromptTransform(artifact, 0, 'sync-target-grammar');

      expect(result.patch.prompt).toBe(
        'A runner says "Hello" outside. [camera: smooth dynamic tracking]',
      );
      expect(result.patch.prompt!.match(/\[camera:/g)).toHaveLength(1);
    });

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
      expect(primary.lyrics).toContain('[Chorus]\nLocked chorus line\nbridge -\nTurning back');
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

describe('full dialogue segment preservation', () => {
  it.each([
    'We use 4k resolution. Our city is photorealistic. Unreal Engine 5 is our subject.',
    'Dr. Clara paid 4.50. She said: "Keep 8k resolution, please." Then we left.',
    'First sentence. Second sentence with trending on artstation. Third sentence!',
  ])('keeps all spoken sentences byte-identical: %s', async (dialogue) => {
    const { compileVideoPromptArtifact } = await import('./promptStudioService');
    const { applyLocalPromptTransform } = await import('./videoVariantEditService');
    const artifact = compileVideoPromptArtifact({
      idea: 'photorealistic stage',
      mode: 'text-to-video',
      target: 'flow-veo',
      aspectRatio: '16:9',
      durationSeconds: 8,
      dialogue,
      audio: 'photorealistic room tone',
    });
    const result = applyLocalPromptTransform(artifact, 0, 'clean-compact');
    expect(result.patch.prompt).toContain(dialogue);
    expect(result.patch.prompt).not.toContain('photorealistic stage');
    expect(result.patch.prompt).not.toContain('photorealistic room tone');
  });
  it('protects edited dialogue, escaped quotes and literal placeholder-looking text without substitution', async () => {
    const { compileVideoPromptArtifact } = await import('./promptStudioService');
    const { editStudioVariant } = await import('./promptStudioEditingService');
    const { applyLocalPromptTransform } = await import('./videoVariantEditService');
    const spoken =
      'Dialogue: the speaker says: First sentence. Second says photorealistic. __DIALOGUE_SPAN_0__';
    const artifact = editStudioVariant(
      compileVideoPromptArtifact({
        idea: 'A stage',
        mode: 'text-to-video',
        target: 'flow-veo',
        aspectRatio: '16:9',
        durationSeconds: 8,
      }),
      0,
      { prompt: '4k resolution. ' + spoken },
    );
    expect(applyLocalPromptTransform(artifact, 0, 'clean-compact').patch.prompt).toContain(spoken);
  });
});
