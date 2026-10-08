import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get, update } from 'idb-keyval';
import type { PromptStudioDraftV1 } from '@core/types/promptStudioDraft';
import type { UserTemplate } from './templateManager';
import { getUserTemplatesStrict } from './templateManager';
import {
  adaptLegacyStudioTemplate,
  sanitizeStudioTemplate,
  studioTemplateService,
} from './studioTemplateService';

const data = vi.hoisted(() => new Map<string, unknown>());
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => data.get(key)),
  update: vi.fn(async (key: string, updater: (value: unknown) => unknown) => {
    data.set(key, updater(data.get(key)));
  }),
}));
vi.mock('./templateManager', () => ({ getUserTemplatesStrict: vi.fn(async () => []) }));
vi.mock('./loggerService', () => ({ logger: { error: vi.fn() } }));

const draft = (mode: 'video' | 'music' = 'video'): PromptStudioDraftV1 => ({
  schemaVersion: 1,
  projectId: 'project-a',
  mode,
  video: {
    idea: 'A quiet forest',
    target: 'kling',
    mode: 'first-last-frames',
    aspectRatio: '9:16',
    durationSeconds: 6,
    firstFrameAssetId: 'private-asset',
    lastFrameAssetId: 'private-last',
    referenceAssetIds: ['private-ref'],
    extensionSourceTakeId: 'private-take',
    startFrame: '/home/private/start.png',
    endFrame: 'file:///private/end.png',
    previousClip: '/private/video.mp4',
    referenceRoles: 'Lead character',
  },
  music: { topic: 'Home', language: 'Swedish', lyrics: '[Verse]\nOriginal lyrics', genre: 'Folk' },
  lockedSections: ['Verse'],
  artifact: null,
  selectedVariant: 0,
  revision: 1,
  updatedAt: '2026-10-08T00:00:00Z',
});

beforeEach(() => {
  data.clear();
  vi.clearAllMocks();
  vi.mocked(getUserTemplatesStrict).mockResolvedValue([]);
});

describe('Studio templates', () => {
  it('creates, updates and deletes complete global inputs without project media', async () => {
    const saved = await studioTemplateService.create(' Forest ', ' Vertical ', draft());
    expect(saved.name).toBe('Forest');
    expect(saved).toMatchObject({
      kind: 'video',
      input: {
        target: 'kling',
        aspectRatio: '9:16',
        durationSeconds: 6,
        referenceRoles: 'Lead character',
      },
    });
    expect(saved.input).not.toHaveProperty('firstFrameAssetId');
    expect(saved.input).not.toHaveProperty('lastFrameAssetId');
    expect(saved.input).not.toHaveProperty('referenceAssetIds');
    expect(saved.input).not.toHaveProperty('extensionSourceTakeId');
    expect(saved.input).not.toHaveProperty('startFrame');
    expect(saved.input).not.toHaveProperty('endFrame');
    expect(saved.input).not.toHaveProperty('previousClip');
    expect(saved).not.toHaveProperty('projectId');
    const secondProject = { ...draft(), projectId: 'project-b' };
    secondProject.video.idea = 'A city';
    const changed = await studioTemplateService.update(saved.id, 'City', 'Updated', secondProject);
    expect(changed.createdAt).toBe(saved.createdAt);
    expect((await studioTemplateService.list())[0]).toEqual(changed);
    await studioTemplateService.remove(saved.id);
    expect(await studioTemplateService.list()).toEqual([]);
  });

  it('retains independent music lyrics and section locks', async () => {
    const source = draft('music');
    const saved = await studioTemplateService.create('Song', '', source);
    source.music.lyrics = 'Changed';
    source.lockedSections.push('Chorus');
    expect(saved).toMatchObject({
      kind: 'music',
      input: { lyrics: '[Verse]\nOriginal lyrics' },
      lockedSections: ['Verse'],
    });
    expect(saved).not.toHaveProperty('video');
  });

  it('adapts legacy templates only to video and refuses legacy mutation', async () => {
    const legacy: UserTemplate = {
      id: 'old',
      name: 'Old',
      description: 'Legacy',
      icon: 'template',
      createdAt: 1,
      updatedAt: 2,
      isUserCreated: true,
      params: { idea: 'Scene', targetModel: 'veo-api', aspectRatio: '9:16' },
    };
    vi.mocked(getUserTemplatesStrict).mockResolvedValue([legacy]);
    const adapted = adaptLegacyStudioTemplate(legacy);
    expect(adapted).toMatchObject({
      kind: 'video',
      source: 'legacy',
      input: { target: 'veo-api', idea: 'Scene' },
    });
    expect(await studioTemplateService.list()).toEqual([adapted]);
    await expect(studioTemplateService.remove(adapted.id)).rejects.toThrow();
    await expect(studioTemplateService.update(adapted.id, 'X', '', draft())).rejects.toThrow();
    expect(await studioTemplateService.list()).toEqual([adapted]);
  });

  it('fails visibly on storage reads and writes instead of returning successful empty results', async () => {
    vi.mocked(get).mockRejectedValueOnce(new Error('Read denied'));
    await expect(studioTemplateService.list()).rejects.toThrow('Read denied');
    vi.mocked(getUserTemplatesStrict).mockRejectedValueOnce(new Error('Legacy denied'));
    await expect(studioTemplateService.list()).rejects.toThrow('Legacy denied');
    vi.mocked(update).mockRejectedValueOnce(new Error('Quota'));
    await expect(studioTemplateService.create('Test', '', draft())).rejects.toThrow('Quota');
  });

  it('validates names and rejects cross-workspace updates', async () => {
    await expect(studioTemplateService.create(' ', '', draft())).rejects.toThrow('name');
    const saved = await studioTemplateService.create('Video', '', draft());
    await expect(
      studioTemplateService.update(saved.id, 'Music', '', draft('music')),
    ).rejects.toThrow('workspace');
    expect((await studioTemplateService.list())[0]).toEqual(saved);
  });

  it('sanitizes foreign media even in a template passed directly to apply', async () => {
    const saved = await studioTemplateService.create('Video', '', draft());
    if (saved.kind !== 'video') throw new Error('Expected video');
    saved.input.firstFrameAssetId = 'foreign';
    expect(sanitizeStudioTemplate(saved).input).not.toHaveProperty('firstFrameAssetId');
  });
});
