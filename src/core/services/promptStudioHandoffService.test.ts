import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PromptArtifactV1 } from '@core/types';

const storage = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => storage.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    storage.set(key, value);
  }),
  keys: vi.fn(async () => Array.from(storage.keys())),
  createStore: vi.fn(() => ({})),
}));

vi.mock('./loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { promptStudioHandoffService } from './promptStudioHandoffService';

const artifact = {
  schemaVersion: 1,
  id: 'prompt-video-test',
  kind: 'video',
  target: 'flow-veo',
  input: {
    idea: 'A focused scene',
    mode: 'text-to-video',
    target: 'flow-veo',
    aspectRatio: '16:9',
    durationSeconds: 8,
  },
  primary: {
    label: 'Primary',
    title: 'Recommended handoff',
    prompt: 'One focused scene.',
    negativePrompt: 'text',
    settingsChecklist: ['8s'],
  },
  alternatives: [
    {
      label: 'Cinematic',
      title: 'Cinematic texture',
      prompt: 'A cinematic scene.',
      negativePrompt: 'text',
      settingsChecklist: ['8s'],
    },
    {
      label: 'Control-focused',
      title: 'Control-focused',
      prompt: 'A controlled scene.',
      negativePrompt: 'text',
      settingsChecklist: ['8s'],
    },
  ],
  validation: [],
  provenance: { provider: 'local', source: 'compiler', generatedAt: 'now', inputHash: 'hash' },
  createdAt: 'now',
} as unknown as PromptArtifactV1;

describe('promptStudioHandoffService', () => {
  beforeEach(() => storage.clear());

  it('stores a draft locally without provider execution and lists its artifact', async () => {
    const handoff = await promptStudioHandoffService.createDraft(artifact, 'production');
    expect(handoff.destination).toBe('production');
    expect(await promptStudioHandoffService.getDraft(handoff.id)).toMatchObject({
      handoff,
      artifact,
    });
    expect(await promptStudioHandoffService.listArtifacts()).toEqual([artifact]);
  });

  it('adapts a legacy SunoPack into the common artifact store', async () => {
    const migrated = await promptStudioHandoffService.importLegacySunoPack({
      title: 'Legacy song',
      style: 'cinematic pop',
      lyrics: '[Verse]\nOriginal lines',
      explanation: 'Legacy explanation',
    });
    expect(migrated.kind).toBe('music');
    expect(await promptStudioHandoffService.listArtifacts()).toContainEqual(migrated);
  });
});
