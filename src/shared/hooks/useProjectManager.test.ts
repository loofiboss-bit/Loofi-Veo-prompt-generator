import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@core/services/loggerService', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Reset module state between describe blocks
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

describe('useProjectManager', () => {
  // Dynamic import to get fresh module state per test
  async function importHook() {
    const mod = await import('./useProjectManager');
    return mod.useProjectManager;
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

  // ─── Initial load ───────────────────────────────────────────────

  it('should start with empty project list', async () => {
    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());
    expect(result.current.projectList).toEqual([]);
  });

  it('should load existing metadata from localStorage', async () => {
    const meta = [{ id: '123', name: 'My Project', lastModified: Date.now() }];
    localStorage.setItem('veo_projects_meta', JSON.stringify(meta));

    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

    expect(result.current.projectList).toHaveLength(1);
    expect(result.current.projectList[0].name).toBe('My Project');
  });

  it('should handle corrupt metadata gracefully', async () => {
    localStorage.setItem('veo_projects_meta', 'NOT_JSON');

    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());
    expect(result.current.projectList).toEqual([]);
  });

  // ─── createProject ──────────────────────────────────────────────

  it('should create a project and return it', async () => {
    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

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

  it('should store project data in localStorage', async () => {
    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

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

    const stored = localStorage.getItem(`veo_project_${project!.id}`);
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored!);
    expect(parsed.name).toBe('Stored Film');
  });

  it('should throw if localStorage is full on create', async () => {
    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

    // Mock setItem to throw
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => {
      act(() => {
        result.current.createProject(
          'Full',
          mockPromptState as never,
          mockCharacters as never,
          mockLocations as never,
          mockDNAs as never,
          mockStoryboard as never,
        );
      });
    }).toThrow('Failed to save project');

    vi.restoreAllMocks();
  });

  // ─── saveProject ────────────────────────────────────────────────

  it('should update an existing project', async () => {
    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

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

    const stored = JSON.parse(localStorage.getItem(`veo_project_${project!.id}`)!);
    expect(stored.name).toBe('Updated Name');
    expect(result.current.projectList[0].name).toBe('Updated Name');
  });

  it('should move updated project to top of list', async () => {
    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

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

    // Save proj1 (should move to top)
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

  // ─── loadProject ────────────────────────────────────────────────

  it('should load a project by ID', async () => {
    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

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
    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

    expect(result.current.loadProject('nonexistent')).toBeNull();
  });

  it('should return null for corrupt project data', async () => {
    localStorage.setItem('veo_project_bad', 'CORRUPT_JSON');

    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

    expect(result.current.loadProject('bad')).toBeNull();
  });

  // ─── deleteProject ──────────────────────────────────────────────

  it('should delete a project', async () => {
    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

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

    expect(result.current.projectList).toHaveLength(0);
    expect(localStorage.getItem(`veo_project_${project!.id}`)).toBeNull();
  });

  // ─── exportProject ─────────────────────────────────────────────

  it('should create a download link for export', async () => {
    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

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

    const mockClick = vi.fn();
    const mockCreateElement = vi.spyOn(document, 'createElement');
    const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n);
    const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n);

    // Create a mock anchor that captures assignments
    const mockAnchor = document.createElement('a');
    mockAnchor.click = mockClick;
    mockCreateElement.mockReturnValueOnce(mockAnchor);

    const mockRevokeURL = vi.fn();
    globalThis.URL.revokeObjectURL = mockRevokeURL;

    act(() => {
      result.current.exportProject({
        id: project!.id,
        name: 'Export Me',
        lastModified: Date.now(),
      });
    });

    expect(mockClick).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('export_me.json');
    expect(mockRevokeURL).toHaveBeenCalled();

    mockCreateElement.mockRestore();
    mockAppendChild.mockRestore();
    mockRemoveChild.mockRestore();
  });

  it('should handle export of non-existent project', async () => {
    const useProjectManager = await importHook();
    const { result } = renderHook(() => useProjectManager());

    // Should not throw
    act(() => {
      result.current.exportProject({ id: 'nonexistent', name: 'Ghost', lastModified: 0 });
    });
  });
});
