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
});
