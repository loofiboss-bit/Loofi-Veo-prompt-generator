import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  hydrate: vi.fn(),
  refresh: vi.fn().mockResolvedValue(undefined),
  profiles: vi.fn().mockResolvedValue([]),
  projects: Array.from({ length: 100 }, (_, index) => ({
    id: `p${index}`,
    name: `Project ${index}`,
    status: index === 99 ? 'archived' : 'active',
    modifiedAt: index,
  })),
}));
vi.mock('@core/services/projectDocumentService', () => ({
  projectDocumentService: { load: mocks.load },
}));
vi.mock('@core/services/projectTransferService', () => ({ hydrateProjectMedia: mocks.hydrate }));
vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: {
    getState: () => ({ projects: mocks.projects, refreshProjects: mocks.refresh }),
  },
}));
vi.mock('@core/services/creatorStyleService', () => ({
  creatorStyleService: { list: mocks.profiles },
  validateCreatorStyle: vi.fn(),
}));
vi.mock('@core/services/creatorRecipeService', () => ({ creatorRecipeService: {} }));
vi.mock('@core/services/mediaAssetService', () => ({ mediaAssetService: {} }));
vi.mock('@core/store/usePromptStudioDraftStore', () => ({
  usePromptStudioDraftStore: { getState: () => ({}) },
}));
vi.mock('@core/store/useEditorSessionStore', () => ({
  useEditorSessionStore: { getState: () => ({}) },
}));
vi.mock('@core/store/useAppStore', () => ({ useAppStore: { getState: () => ({}) } }));
import { useCreatorStore } from './useCreatorStore';
describe('metadata-first Creator Start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCreatorStore.setState({ busy: false, recent: [] });
  });
  it('lists six recent active projects from 100 metadata rows without loading any document or media', async () => {
    await useCreatorStore.getState().initialize();
    const recent = useCreatorStore.getState().recent;
    expect(recent).toHaveLength(6);
    expect(recent[0].project.id).toBe('p98');
    expect(recent.at(-1)?.project.id).toBe('p93');
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.hydrate).not.toHaveBeenCalled();
    expect(recent[0].project).not.toHaveProperty('storyboard');
  });
});
