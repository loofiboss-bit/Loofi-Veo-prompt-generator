import { afterEach, describe, expect, it, vi } from 'vitest';
import { generatePromptWithOllama } from './ollamaProvider';

describe('generatePromptWithOllama', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the existing request shape without schema options', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'A refined prompt' } }] }),
    });
    vi.stubGlobal('fetch', fetch);

    await expect(
      generatePromptWithOllama('Make it cinematic.', {
        baseUrl: 'http://localhost:11434',
        model: 'local-test',
      }),
    ).resolves.toBe('A refined prompt');

    const init = fetch.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'local-test',
      messages: [{ role: 'user', content: 'Make it cinematic.' }],
      stream: false,
    });
  });

  it('sends an optional constrained JSON schema and user cancellation to fetch', async () => {
    const controller = new AbortController();
    const schema = {
      type: 'object',
      properties: { prompt: { type: 'string' } },
      required: ['prompt'],
      additionalProperties: false,
    };
    const fetch = vi.fn().mockImplementation(
      (_input: RequestInfo | URL, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
        }),
    );
    vi.stubGlobal('fetch', fetch);

    const request = generatePromptWithOllama('Return prompt JSON.', {
      baseUrl: 'http://localhost:11434',
      model: 'local-test',
      signal: controller.signal,
      jsonSchema: schema,
    });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const init = fetch.mock.calls[0][1] as RequestInit;
    expect(init.signal).not.toBe(controller.signal);
    expect(JSON.parse(String(init.body)).response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'structured_response', strict: true, schema },
    });
    controller.abort(new DOMException('Cancelled', 'AbortError'));
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not start fetch when the caller signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new DOMException('Cancelled', 'AbortError'));
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await expect(
      generatePromptWithOllama('Do not dispatch.', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
