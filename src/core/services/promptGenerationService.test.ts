import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateGeminiPrompt = vi.fn();
const mockGenerateOllamaPrompt = vi.fn();
const mockGetSettingsState = vi.fn();

vi.mock('@core/services/gemini/geminiPromptService', () => ({
  generateVeoPrompt: (...args: unknown[]) => mockGenerateGeminiPrompt(...args),
}));

vi.mock('@core/services/ollamaProvider', () => ({
  generateVeoPromptWithOllama: (...args: unknown[]) => mockGenerateOllamaPrompt(...args),
}));

vi.mock('@core/store/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => mockGetSettingsState(),
  },
}));

import {
  generatePromptWithCurrentProvider,
  resolvePromptGenerationProvider,
} from './promptGenerationService';

describe('promptGenerationService', () => {
  const promptState = {
    idea: 'A neon city street in rain',
    targetModel: 'veo',
  } as Parameters<typeof generatePromptWithCurrentProvider>[0];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettingsState.mockReturnValue({
      promptGenerationProvider: 'gemini',
      localLlmEnabled: false,
      localLlmEndpoint: 'http://localhost:11434',
      localLlmModel: 'llama3',
    });
  });

  it('resolves Gemini as the default provider', () => {
    expect(resolvePromptGenerationProvider()).toBe('gemini');
  });

  it('falls back to Ollama when older settings only enabled local LLM', () => {
    expect(
      resolvePromptGenerationProvider({
        localLlmEnabled: true,
        localLlmEndpoint: 'http://localhost:11434',
        localLlmModel: 'llama3',
      }),
    ).toBe('ollama');
  });

  it('routes prompt generation through Gemini when Gemini is selected', async () => {
    mockGenerateGeminiPrompt.mockResolvedValue({
      prompt: 'Gemini prompt',
      groundingChunks: [],
    });

    const result = await generatePromptWithCurrentProvider(promptState);

    expect(result.prompt).toBe('Gemini prompt');
    expect(mockGenerateGeminiPrompt).toHaveBeenCalledWith(promptState);
    expect(mockGenerateOllamaPrompt).not.toHaveBeenCalled();
  });

  it('routes prompt generation through Ollama when Ollama is selected', async () => {
    mockGetSettingsState.mockReturnValue({
      promptGenerationProvider: 'ollama',
      localLlmEnabled: true,
      localLlmEndpoint: 'http://127.0.0.1:11434',
      localLlmModel: 'qwen2.5-coder:14b',
    });
    mockGenerateOllamaPrompt.mockResolvedValue({
      prompt: 'Ollama prompt',
    });

    const result = await generatePromptWithCurrentProvider(promptState);

    expect(result.prompt).toBe('Ollama prompt');
    expect(mockGenerateOllamaPrompt).toHaveBeenCalledWith(promptState, {
      baseUrl: 'http://127.0.0.1:11434',
      model: 'qwen2.5-coder:14b',
    });
    expect(mockGenerateGeminiPrompt).not.toHaveBeenCalled();
  });

  it('surfaces unreachable Ollama errors without falling back silently', async () => {
    mockGetSettingsState.mockReturnValue({
      promptGenerationProvider: 'ollama',
      localLlmEnabled: true,
      localLlmEndpoint: 'http://localhost:11434',
      localLlmModel: 'llama3',
    });
    mockGenerateOllamaPrompt.mockRejectedValue(
      new Error('Ollama request failed: 503 Service Unavailable'),
    );

    await expect(generatePromptWithCurrentProvider(promptState)).rejects.toThrow(
      'Ollama request failed: 503 Service Unavailable',
    );

    expect(mockGenerateGeminiPrompt).not.toHaveBeenCalled();
  });
});
