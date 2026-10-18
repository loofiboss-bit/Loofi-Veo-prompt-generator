import { describe, expect, it, vi } from 'vitest';
import { createDesktopGeminiProxy } from './desktopGeminiProxy';
import { streamGenerateContent } from '@core/utils/streaming';

describe('desktop Gemini SDK proxy', () => {
  it('normalizes text, inline inputs, system instructions, and structured config', async () => {
    const approveProviderCost = vi.fn().mockResolvedValue('approval-1');
    const executeProvider = vi.fn().mockResolvedValue({
      text: '{"ok":true}',
      rawModelId: 'gemini-3.5-flash',
    });
    const bridge = {
      approveProviderCost,
      executeProvider,
      testProviderConnection: vi.fn(),
    };
    const client = createDesktopGeminiProxy(bridge);
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { text: 'Review this.' },
        { inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } },
      ],
      config: {
        systemInstruction: 'Return strict JSON.',
        responseMimeType: 'application/json',
      },
    });

    expect(approveProviderCost).toHaveBeenCalledWith(
      expect.objectContaining({
        providerModelId: 'gemini-3.5-flash',
        operation: 'review',
        prompt: 'Review this.',
        inputs: [{ mimeType: 'image/png', data: 'aW1hZ2U=' }],
        systemInstruction: 'Return strict JSON.',
        config: expect.objectContaining({ responseMimeType: 'application/json' }),
      }),
    );
    expect(executeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalToken: 'approval-1',
        inputs: [{ mimeType: 'image/png', data: 'aW1hZ2U=' }],
      }),
    );
    expect(response.text).toBe('{"ok":true}');
    expect(response.candidates?.[0]?.content?.parts?.[0]).toMatchObject({ text: '{"ok":true}' });
  });

  it('maps privileged failures to classified execution errors', async () => {
    const client = createDesktopGeminiProxy({
      approveProviderCost: vi.fn().mockResolvedValue('approval-1'),
      testProviderConnection: vi.fn(),
      executeProvider: vi.fn().mockResolvedValue({
        rawModelId: '',
        failure: 'authentication',
        message: 'Configure Google.',
      }),
    });
    await expect(
      client.models.generateContent({ model: 'gemini-3.5-flash', contents: 'Plan.' }),
    ).rejects.toMatchObject({ kind: 'authentication', message: 'Configure Google.' });
  });

  it('provides a working chat facade over the same approved provider path', async () => {
    const executeProvider = vi.fn().mockResolvedValue({
      text: 'Hello from the director.',
      rawModelId: 'gemini-3.5-flash',
    });
    const client = createDesktopGeminiProxy({
      approveProviderCost: vi.fn().mockResolvedValue('approval-1'),
      executeProvider,
      testProviderConnection: vi.fn(),
    });

    const chat = client.chats.create({ model: 'gemini-3.5-flash' });
    const response = await chat.sendMessage({ message: 'Hello' });

    expect(response.text).toBe('Hello from the director.');
    expect(executeProvider).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'User: Hello' }),
    );
  });

  it('implements generateContentStream delegating to approved generateContent and yielding response', async () => {
    const approveProviderCost = vi.fn().mockResolvedValue('approval-stream-1');
    const executeProvider = vi.fn().mockResolvedValue({
      text: 'Streaming content response.',
      rawModelId: 'gemini-3.5-flash',
    });
    const client = createDesktopGeminiProxy({
      approveProviderCost,
      executeProvider,
      testProviderConnection: vi.fn(),
    });

    const stream = await client.models.generateContentStream({
      model: 'gemini-3.5-flash',
      contents: 'Generate text.',
    });

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(approveProviderCost).toHaveBeenCalledWith(
      expect.objectContaining({
        providerModelId: 'gemini-3.5-flash',
        operation: 'plan',
        prompt: 'Generate text.',
      }),
    );
    expect(executeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalToken: 'approval-stream-1',
        prompt: 'Generate text.',
      }),
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe('Streaming content response.');
    expect(chunks[0].candidates?.[0]?.content?.parts?.[0]).toMatchObject({
      text: 'Streaming content response.',
    });
  });

  it('integrates seamlessly with streamGenerateContent helper', async () => {
    const client = createDesktopGeminiProxy({
      approveProviderCost: vi.fn().mockResolvedValue('approval-stream-2'),
      executeProvider: vi.fn().mockResolvedValue({
        text: 'Streamed through helper.',
        rawModelId: 'gemini-3.5-flash',
      }),
      testProviderConnection: vi.fn(),
    });

    const onChunk = vi.fn();
    const onComplete = vi.fn();
    const result = await streamGenerateContent(
      client,
      {
        model: 'gemini-3.5-flash',
        contents: 'Stream via helper.',
      },
      {
        onChunk,
        onComplete,
      },
    );

    expect(onChunk).toHaveBeenCalledWith('Streamed through helper.', 'Streamed through helper.');
    expect(onComplete).toHaveBeenCalledWith('Streamed through helper.');
    expect(result).toEqual({
      text: 'Streamed through helper.',
      aborted: false,
      chunkCount: 1,
    });
  });

  it('propagates errors thrown during generateContentStream', async () => {
    const client = createDesktopGeminiProxy({
      approveProviderCost: vi.fn().mockRejectedValue(new Error('User denied cost approval')),
      executeProvider: vi.fn(),
      testProviderConnection: vi.fn(),
    });

    await expect(async () => {
      const stream = await client.models.generateContentStream({
        model: 'gemini-3.5-flash',
        contents: 'Will fail.',
      });
      for await (const chunk of stream) {
        void chunk;
      }
    }).rejects.toThrow('User denied cost approval');
  });
});
