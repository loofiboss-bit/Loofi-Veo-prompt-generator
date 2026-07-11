import { describe, it, expect, vi } from 'vitest';
import { streamGenerateContent } from './streaming';

// Mock the GoogleGenAI type
const createMockAI = (chunks: Array<{ text?: string }>) => {
  return {
    models: {
      generateContentStream: vi.fn().mockResolvedValue(
        (async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        })(),
      ),
    },
  } as unknown as import('@google/genai').GoogleGenAI;
};

const mockParams = {
  model: 'gemini-3.1-flash-lite',
  contents: 'test prompt',
} as unknown as import('@google/genai').GenerateContentParameters;

describe('streamGenerateContent', () => {
  it('should accumulate text from chunks', async () => {
    const ai = createMockAI([{ text: 'Hello' }, { text: ' World' }]);
    const onChunk = vi.fn();

    const result = await streamGenerateContent(ai, mockParams, { onChunk });

    expect(result.text).toBe('Hello World');
    expect(result.chunkCount).toBe(2);
    expect(result.aborted).toBe(false);
  });

  it('should call onChunk for each text chunk', async () => {
    const ai = createMockAI([{ text: 'A' }, { text: 'B' }]);
    const onChunk = vi.fn();

    await streamGenerateContent(ai, mockParams, { onChunk });

    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenCalledWith('A', 'A');
    expect(onChunk).toHaveBeenCalledWith('B', 'AB');
  });

  it('should call onComplete when stream finishes', async () => {
    const ai = createMockAI([{ text: 'done' }]);
    const onChunk = vi.fn();
    const onComplete = vi.fn();

    await streamGenerateContent(ai, mockParams, { onChunk, onComplete });

    expect(onComplete).toHaveBeenCalledWith('done');
  });

  it('should skip empty text chunks', async () => {
    const ai = createMockAI([{ text: '' }, { text: 'valid' }, { text: undefined }]);
    const onChunk = vi.fn();

    const result = await streamGenerateContent(ai, mockParams, { onChunk });

    expect(result.text).toBe('valid');
    expect(result.chunkCount).toBe(1);
  });

  it('should return early if signal is already aborted', async () => {
    const ai = createMockAI([{ text: 'should not appear' }]);
    const onChunk = vi.fn();
    const controller = new AbortController();
    controller.abort();

    const result = await streamGenerateContent(ai, mockParams, {
      onChunk,
      signal: controller.signal,
    });

    expect(result.aborted).toBe(true);
    expect(result.text).toBe('');
    expect(onChunk).not.toHaveBeenCalled();
  });

  it('should abort mid-stream when signal fires', async () => {
    const controller = new AbortController();
    const ai = {
      models: {
        generateContentStream: vi.fn().mockResolvedValue(
          (async function* () {
            yield { text: 'first' };
            controller.abort();
            yield { text: 'second' };
          })(),
        ),
      },
    } as unknown as import('@google/genai').GoogleGenAI;

    const onChunk = vi.fn();

    const result = await streamGenerateContent(ai, mockParams, {
      onChunk,
      signal: controller.signal,
    });

    expect(result.aborted).toBe(true);
    expect(result.text).toBe('first');
  });

  it('should not call onComplete when aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const ai = createMockAI([]);
    const onComplete = vi.fn();

    await streamGenerateContent(ai, mockParams, {
      onChunk: vi.fn(),
      signal: controller.signal,
      onComplete,
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('should call onError and rethrow on non-abort errors', async () => {
    const error = new Error('API failure');
    const ai = {
      models: {
        generateContentStream: vi.fn().mockRejectedValue(error),
      },
    } as unknown as import('@google/genai').GoogleGenAI;

    const onError = vi.fn();

    await expect(
      streamGenerateContent(ai, mockParams, { onChunk: vi.fn(), onError }),
    ).rejects.toThrow('API failure');

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should handle AbortError gracefully', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    const ai = {
      models: {
        generateContentStream: vi.fn().mockRejectedValue(abortError),
      },
    } as unknown as import('@google/genai').GoogleGenAI;

    const result = await streamGenerateContent(ai, mockParams, { onChunk: vi.fn() });

    expect(result.aborted).toBe(true);
  });
});
