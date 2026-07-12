import { describe, expect, it, vi } from 'vitest';
import { createDesktopGeminiProxy } from './desktopGeminiProxy';

describe('desktop Gemini SDK proxy', () => {
  it('normalizes text, inline inputs, system instructions, and structured config', async () => {
    const bridge = vi.fn().mockResolvedValue({
      text: '{"ok":true}',
      rawModelId: 'gemini-3.5-flash',
    });
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

    expect(bridge).toHaveBeenCalledWith(
      expect.objectContaining({
        providerModelId: 'gemini-3.5-flash',
        operation: 'review',
        prompt: 'Review this.',
        inputs: [{ mimeType: 'image/png', data: 'aW1hZ2U=' }],
        systemInstruction: 'Return strict JSON.',
        config: expect.objectContaining({ responseMimeType: 'application/json' }),
      }),
    );
    expect(response.text).toBe('{"ok":true}');
    expect(response.candidates?.[0]?.content?.parts?.[0]).toMatchObject({ text: '{"ok":true}' });
  });

  it('maps privileged failures to classified execution errors', async () => {
    const client = createDesktopGeminiProxy(
      vi.fn().mockResolvedValue({
        rawModelId: '',
        failure: 'authentication',
        message: 'Configure Google.',
      }),
    );
    await expect(
      client.models.generateContent({ model: 'gemini-3.5-flash', contents: 'Plan.' }),
    ).rejects.toMatchObject({ kind: 'authentication', message: 'Configure Google.' });
  });
});
