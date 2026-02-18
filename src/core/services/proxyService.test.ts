/**
 * Proxy Service Unit Tests
 * Tests for FFmpeg-based proxy video generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock FFmpeg dependencies
const mockFetchFile = vi.fn();
const mockWriteFile = vi.fn();
const mockExec = vi.fn();
const mockReadFile = vi.fn();
const mockDeleteFile = vi.fn();
const mockLoad = vi.fn();
const mockOn = vi.fn();

const mockFFmpegInstance = {
  on: mockOn,
  load: mockLoad,
  writeFile: mockWriteFile,
  exec: mockExec,
  readFile: mockReadFile,
  deleteFile: mockDeleteFile,
};

vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: vi.fn(function () {
    return mockFFmpegInstance;
  }),
}));

vi.mock('@ffmpeg/util', () => ({
  toBlobURL: vi.fn((url: string) => Promise.resolve(`blob:${url}`)),
  fetchFile: mockFetchFile,
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn((_blob: Blob) => `blob:mock-url-${Date.now()}`);

import { generateProxy } from './proxyService';

describe('proxyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnValue(undefined);
    mockLoad.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockExec.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
    mockDeleteFile.mockResolvedValue(undefined);
    mockFetchFile.mockResolvedValue(new Uint8Array([5, 6, 7, 8]));
  });

  describe('generateProxy', () => {
    it('should generate proxy video successfully', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });

      const result = await generateProxy(mockFile);

      expect(result).toMatch(/^blob:mock-url-/);
      expect(mockLoad).toHaveBeenCalledTimes(1);
      expect(mockFetchFile).toHaveBeenCalledWith(mockFile);
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockExec).toHaveBeenCalledWith(
        expect.arrayContaining([
          '-i',
          expect.stringContaining('input_'),
          '-vf',
          'scale=-2:360',
          '-c:v',
          'libx264',
          '-profile:v',
          'baseline',
          '-preset',
          'ultrafast',
          '-crf',
          '35',
          '-c:a',
          'aac',
          '-b:a',
          '96k',
          '-r',
          '24',
          expect.stringContaining('proxy_'),
        ]),
      );
      expect(mockReadFile).toHaveBeenCalled();
    });

    it('should cleanup input and output files after success', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });

      await generateProxy(mockFile);

      expect(mockDeleteFile).toHaveBeenCalledTimes(2);
    });

    it('should return original file URL on FFmpeg error', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      mockExec.mockRejectedValue(new Error('FFmpeg processing failed'));

      const result = await generateProxy(mockFile);

      expect(result).toMatch(/^blob:mock-url-/);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile);
    });

    it('should not throw when cleanup fails', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      mockDeleteFile.mockRejectedValue(new Error('Cleanup failed'));

      const result = await generateProxy(mockFile);

      expect(result).toMatch(/^blob:mock-url-/);
      // Should not throw despite cleanup failure
    });

    it('should reuse FFmpeg instance on subsequent calls', async () => {
      const mockFile1 = new File(['test1'], 'test1.mp4', { type: 'video/mp4' });
      const mockFile2 = new File(['test2'], 'test2.mp4', { type: 'video/mp4' });

      await generateProxy(mockFile1);
      mockLoad.mockClear(); // Clear to check if it's called again
      await generateProxy(mockFile2);

      // Load should not be called on the second invocation
      expect(mockLoad).toHaveBeenCalledTimes(0);
    });

    it('should work with Blob input', async () => {
      const mockBlob = new Blob(['test'], { type: 'video/mp4' });

      const result = await generateProxy(mockBlob);

      expect(result).toMatch(/^blob:mock-url-/);
      expect(mockFetchFile).toHaveBeenCalledWith(mockBlob);
    });

    it('should handle writeFile error gracefully', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      mockWriteFile.mockRejectedValue(new Error('Write failed'));

      const result = await generateProxy(mockFile);

      expect(result).toMatch(/^blob:mock-url-/);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile);
    });

    it('should handle readFile error gracefully', async () => {
      const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      mockReadFile.mockRejectedValue(new Error('Read failed'));

      const result = await generateProxy(mockFile);

      expect(result).toMatch(/^blob:mock-url-/);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile);
    });
  });
});
