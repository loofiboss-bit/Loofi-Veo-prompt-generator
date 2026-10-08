import { beforeEach, describe, expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('@core/services/gemini/aiClient', () => ({
  getAiClientAsync: async () => ({ models: { generateContent: client.generate } }),
  getPromptModel: () => 'gemini-test',
  cleanJson: (text: string) => text,
}));
import {
  creatorPublishingService,
  validateCreatorPublishingText,
} from './creatorPublishingService';
describe('creator publication proposals', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    null,
    {},
    { title: '', description: 'Text' },
    { title: 'Title', description: [] },
    { title: 'x'.repeat(201), description: 'Text' },
  ])('rejects malformed empty or oversized text', (value) =>
    expect(() => validateCreatorPublishingText(value)).toThrow(),
  );
  it('sends only publication text with requested language and stages a validated response', async () => {
    client.generate.mockResolvedValue({
      text: JSON.stringify({ title: 'Hej!', description: 'Ett lokalt exempel.' }),
    });
    const source = { title: 'Example', description: 'Local example.' };
    expect(await creatorPublishingService.propose(source, 'sv')).toEqual({
      title: 'Hej!',
      description: 'Ett lokalt exempel.',
    });
    const request = client.generate.mock.calls[0][0];
    expect(JSON.parse(request.contents)).toMatchObject({ source, language: 'sv' });
    expect(request.contents).not.toContain('inlineData');
    expect(source.title).toBe('Example');
  });
  it('propagates errors without retrying or returning an empty success', async () => {
    client.generate.mockRejectedValue(new Error('provider failed'));
    await expect(
      creatorPublishingService.propose({ title: 'Title', description: 'Text' }, 'en'),
    ).rejects.toThrow('provider failed');
    expect(client.generate).toHaveBeenCalledTimes(1);
  });
});
