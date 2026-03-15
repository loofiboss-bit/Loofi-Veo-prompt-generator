import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockSafeStore = new Map<string, unknown>();

vi.mock('@core/utils/safeIdbKeyval', () => ({
  createStore: vi.fn(() => ({ name: 'project-snapshots' })),
  safeGet: vi.fn((key: IDBValidKey) => Promise.resolve(mockSafeStore.get(String(key)))),
  safeSet: vi.fn((key: IDBValidKey, value: unknown) => {
    mockSafeStore.set(String(key), value);
    return Promise.resolve();
  }),
  safeDel: vi.fn((key: IDBValidKey) => {
    mockSafeStore.delete(String(key));
    return Promise.resolve();
  }),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  mockSafeStore.clear();
});

describe('useProjectManager', () => {
  async function importHook() {
    const mod = await import('./useProjectManager');
    return mod.useProjectManager;
  }

  async function renderProjectManagerHook() {
    const useProjectManager = await importHook();
    const hook = renderHook(() => useProjectManager());

    await act(async () => {
      await Promise.resolve();
    });

    return hook;
  }

  const mockPromptState = {
    mainAction: 'A person walks',
    style: 'cinematic',
    camera: 'wide',
    lighting: 'natural',
  };

  const mockCharacters = [
    {
      id: 'c1',
      name: 'Hero',
      attributes: { age: '30', gender: 'male', ethnicity: '', bodyType: '', skinTone: '' },
      appearance: {},
    },
  ];

  const mockLocations = [{ id: 'l1', name: 'Beach', description: 'Sandy beach' }];
  const mockDNAs = [{ id: 'd1', name: 'Cinematic', style: 'noir', colorGrading: 'warm' }];
  const mockStoryboard = { shots: [], scenes: [] };

  it('should start with empty project list', async () => {
    const { result } = await renderProjectManagerHook();
    expect(result.current.projectList).toEqual([]);
  });

  it('should load existing metadata from localStorage', async () => {
    const meta = [{ id: '123', name: 'My Project', lastModified: Date.now() }];
    localStorage.setItem('veo_projects_meta', JSON.stringify(meta));
    localStorage.setItem(
      'veo_project_123',
      JSON.stringify({ id: '123', name: 'My Project', lastModified: Date.now() }),
    );

    const { result } = await renderProjectManagerHook();

    expect(result.current.projectList).toHaveLength(1);
    expect(result.current.projectList[0].name).toBe('My Project');
  });

  it('should handle corrupt metadata gracefully', async () => {
    localStorage.setItem('veo_projects_meta', 'NOT_JSON');

    const { result } = await renderProjectManagerHook();

    expect(result.current.projectList).toEqual([]);
  });

  it('should create a project and return it', async () => {
    const { result } = await renderProjectManagerHook();

    let project: { id: string; name: string };
    act(() => {
      project = result.current.createProject(
        'Test Film',
        mockPromptState as never,
        mockCharacters as never,
        mockLocations as never,
        mockDNAs as never,
        mockStoryboard as never,
      );
    });

    expect(project!.name).toBe('Test Film');
    expect(project!.id).toBeDefined();
    expect(result.current.projectList).toHaveLength(1);
    expect(result.current.projectList[0].name).toBe('Test Film');
  });

  it('should store project data in safe storage', async () => {
    const { result } = await renderProjectManagerHook();

    let project: { id: string };
    act(() => {
      project = result.current.createProject(
        'Stored Film',
        mockPromptState as never,
        mockCharacters as never,
        mockLocations as never,
        mockDNAs as never,
        mockStoryboard as never,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    const stored = mockSafeStore.get(`veo_project_${project!.id}`);
    expect(stored).toBeDefined();
    const parsed = stored as { name: string };
    expect(parsed.name).toBe('Stored Film');
  });

  it('should update an existing project', async () => {
    const { result } = await renderProjectManagerHook();

    let project: { id: string };
    act(() => {
      project = result.current.createProject(
        'Original',
        mockPromptState as never,
        mockCharacters as never,
        mockLocations as never,
        mockDNAs as never,
        mockStoryboard as never,
      );
    });

    act(() => {
      result.current.saveProject(
        project!.id,
        'Updated Name',
        mockPromptState as never,
        mockCharacters as never,
        mockLocations as never,
        mockDNAs as never,
        mockStoryboard as never,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    const stored = mockSafeStore.get(`veo_project_${project!.id}`) as { name: string };
    expect(stored.name).toBe('Updated Name');
    expect(result.current.projectList[0].name).toBe('Updated Name');
  });

  it('should move updated project to top of list', async () => {
    const { result } = await renderProjectManagerHook();

    let proj1: { id: string };
    act(() => {
      proj1 = result.current.createProject(
        'First',
        mockPromptState as never,
        mockCharacters as never,
        mockLocations as never,
        mockDNAs as never,
        mockStoryboard as never,
      );
    });
    act(() => {
      result.current.createProject(
        'Second',
        mockPromptState as never,
        mockCharacters as never,
        mockLocations as never,
        mockDNAs as never,
        mockStoryboard as never,
      );
    });

    act(() => {
      result.current.saveProject(
        proj1!.id,
        'First',
        mockPromptState as never,
        mockCharacters as never,
        mockLocations as never,
        mockDNAs as never,
        mockStoryboard as never,
      );
    });

    expect(result.current.projectList[0].id).toBe(proj1!.id);
  });

  it('should load a project by ID', async () => {
    const { result } = await renderProjectManagerHook();

    let project: { id: string };
    act(() => {
      project = result.current.createProject(
        'Loadable',
        mockPromptState as never,
        mockCharacters as never,
        mockLocations as never,
        mockDNAs as never,
        mockStoryboard as never,
      );
    });

    const loaded = result.current.loadProject(project!.id);
    expect(loaded).toBeDefined();
    expect(loaded!.name).toBe('Loadable');
  });

  it('should return null for non-existent project', async () => {
    const { result } = await renderProjectManagerHook();

    expect(result.current.loadProject('nonexistent')).toBeNull();
  });

  it('should return null for corrupt project data', async () => {
    localStorage.setItem('veo_project_bad', 'CORRUPT_JSON');
    localStorage.setItem(
      'veo_projects_meta',
      JSON.stringify([{ id: 'bad', name: 'Broken', lastModified: Date.now() }]),
    );

    const { result } = await renderProjectManagerHook();

    expect(result.current.loadProject('bad')).toBeNull();
  });

  it('should delete a project', async () => {
    const { result } = await renderProjectManagerHook();

    let project: { id: string };
    act(() => {
      project = result.current.createProject(
        'Deletable',
        mockPromptState as never,
        mockCharacters as never,
        mockLocations as never,
        mockDNAs as never,
        mockStoryboard as never,
      );
    });

    expect(result.current.projectList).toHaveLength(1);

    act(() => {
      result.current.deleteProject(project!.id);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.projectList).toHaveLength(0);
    expect(mockSafeStore.get(`veo_project_${project!.id}`)).toBeUndefined();
    expect(localStorage.getItem(`veo_project_${project!.id}`)).toBeNull();
  });

  it('should create a download link for export', async () => {
    const { result } = await renderProjectManagerHook();

    let project: { id: string };
    act(() => {
      project = result.current.createProject(
        'Export Me',
        mockPromptState as never,
        mockCharacters as never,
        mockLocations as never,
        mockDNAs as never,
        mockStoryboard as never,
      );
    });

    const originalCreateElement = document.createElement.bind(document);
    const mockClick = vi.fn();
    const mockCreateElement = vi.spyOn(document, 'createElement');
    const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
    const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n);

    const mockAnchor = originalCreateElement('a');
    Object.defineProperty(mockAnchor, 'click', {
      value: mockClick,
      configurable: true,
    });
    mockCreateElement.mockReturnValueOnce(mockAnchor);

    const mockCreateObjectURL = vi.fn(() => 'blob:project-export');
    globalThis.URL.createObjectURL = mockCreateObjectURL;

    const mockRevokeURL = vi.fn();
    globalThis.URL.revokeObjectURL = mockRevokeURL;

    act(() => {
      result.current.exportProject({
        id: project!.id,
        name: 'Export Me',
        lastModified: Date.now(),
      });
    });

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
    expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor);
    expect(mockAnchor.download).toBe('export_me.json');
    expect(mockRevokeURL).toHaveBeenCalled();

    mockCreateElement.mockRestore();
    mockAppendChild.mockRestore();
    mockRemoveChild.mockRestore();
  });

  it('should handle export of non-existent project', async () => {
    const { result } = await renderProjectManagerHook();

    act(() => {
      result.current.exportProject({ id: 'nonexistent', name: 'Ghost', lastModified: 0 });
    });
  });

  it('should migrate legacy project snapshots into safe storage on hydration', async () => {
    const lastModified = Date.now();
    localStorage.setItem(
      'veo_projects_meta',
      JSON.stringify([{ id: 'legacy-1', name: 'Legacy Project', lastModified }]),
    );
    localStorage.setItem(
      'veo_project_legacy-1',
      JSON.stringify({
        id: 'legacy-1',
        name: 'Legacy Project',
        lastModified,
        promptState: mockPromptState,
        characterBank: mockCharacters,
        locationBank: mockLocations,
        visualDNA: mockDNAs,
        storyboard: mockStoryboard,
      }),
    );

    const { result } = await renderProjectManagerHook();

    expect(result.current.projectList).toHaveLength(1);
    expect(mockSafeStore.get('veo_projects_meta')).toEqual(result.current.projectList);
    expect(mockSafeStore.get('veo_project_legacy-1')).toEqual(
      expect.objectContaining({ name: 'Legacy Project' }),
    );
  });
});
