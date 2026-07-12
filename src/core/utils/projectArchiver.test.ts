import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock fns so they're available in vi.mock factory
const { mockFile, mockFolder, mockGenerateAsync, mockLoadAsync } = vi.hoisted(() => ({
  mockFile: vi.fn(),
  mockFolder: vi.fn().mockReturnValue({ file: vi.fn() }),
  mockGenerateAsync: vi.fn().mockResolvedValue(new Blob(['zip'])),
  mockLoadAsync: vi.fn(),
}));

vi.mock('jszip', () => {
  class MockJSZip {
    file = mockFile;
    folder = mockFolder;
    generateAsync = mockGenerateAsync;
    static loadAsync = mockLoadAsync;
  }
  return { default: MockJSZip };
});

vi.mock('@core/services/loggerService', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { exportProjectToZip, importProjectFromZip } from './projectArchiver';
import type { Project, Asset } from '@core/types';

describe('exportProjectToZip', () => {
  const mockProject: Partial<Project> = {
    id: 'proj-1',
    name: 'Test Project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFolder.mockReturnValue({ file: mockFile });
  });

  it('should create a zip with project.json', async () => {
    await exportProjectToZip(mockProject as Project, []);
    expect(mockFile).toHaveBeenCalledWith(
      'project.json',
      expect.stringContaining('"schemaVersion": 8'),
    );
    expect(mockFile).toHaveBeenCalledWith(
      'manifest.json',
      expect.stringContaining('loofi-project'),
    );
  });

  it('should create an assets folder', async () => {
    await exportProjectToZip(mockProject as Project, []);
    expect(mockFolder).toHaveBeenCalledWith('assets');
  });

  it('should throw if assets folder creation fails', async () => {
    mockFolder.mockReturnValueOnce(null);
    await expect(exportProjectToZip(mockProject as Project, [])).rejects.toThrow(
      'Failed to create assets folder',
    );
  });

  it('should process asset data into zip files', async () => {
    const assets: Partial<Asset>[] = [
      { id: 'a1', data: 'base64data', mimeType: 'image/png', url: 'blob:test' },
    ];
    await exportProjectToZip(mockProject as Project, assets as Asset[]);
    expect(mockFile).toHaveBeenCalled();
  });

  it('should return a Blob', async () => {
    const result = await exportProjectToZip(mockProject as Project, []);
    expect(result).toBeInstanceOf(Blob);
  });

  it('should include timestamp in archive', async () => {
    const before = Date.now();
    await exportProjectToZip(mockProject as Project, []);
    const after = Date.now();

    const manifestCall = mockFile.mock.calls.find((c: unknown[]) => c[0] === 'manifest.json');
    expect(manifestCall).toBeDefined();
    const manifest = JSON.parse(manifestCall![1] as string);
    expect(manifest.createdAt).toBeGreaterThanOrEqual(before);
    expect(manifest.createdAt).toBeLessThanOrEqual(after);
  });
});

describe('importProjectFromZip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw if project.json is missing', async () => {
    mockLoadAsync.mockResolvedValueOnce({
      file: vi.fn().mockReturnValue(null),
    });

    await expect(importProjectFromZip(new File([], 'test.veo'))).rejects.toThrow(
      'project.json missing',
    );
  });

  it('should parse project.json from zip', async () => {
    const archive = {
      version: '1.0',
      timestamp: Date.now(),
      project: { id: 'proj-1', title: 'Test' },
      assets: [],
    };

    mockLoadAsync.mockResolvedValueOnce({
      file: vi.fn((name: string) =>
        name === 'project.json'
          ? { async: vi.fn().mockResolvedValue(JSON.stringify(archive)) }
          : null,
      ),
    });

    const result = await importProjectFromZip(new File([], 'test.veo'));
    expect(result.project.id).toBe('proj-1');
    expect(result.assets).toHaveLength(0);
  });

  it('should handle legacy inline assets', async () => {
    const archive = {
      version: '1.0',
      timestamp: Date.now(),
      project: { id: 'proj-1' },
      assets: [{ id: 'a1', url: 'data:image/png;base64,abc', data: 'abc', mimeType: 'image/png' }],
    };

    mockLoadAsync.mockResolvedValueOnce({
      file: vi.fn((name: string) =>
        name === 'project.json'
          ? { async: vi.fn().mockResolvedValue(JSON.stringify(archive)) }
          : null,
      ),
    });

    const result = await importProjectFromZip(new File([], 'test.veo'));
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].url).toBe('data:image/png;base64,abc');
  });
});
