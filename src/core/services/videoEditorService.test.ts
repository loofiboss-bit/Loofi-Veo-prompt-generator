/**
 * VideoEditorService Unit Tests
 * Tests for FFmpeg-based video editing operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock variables so they're available in vi.mock factories
const {
  mockExec,
  mockWriteFile,
  mockReadFile,
  mockDeleteFile,
  mockLoad,
  mockOn,
  mockPostMessage,
  mockAddEventListener,
  mockRemoveEventListener,
} = vi.hoisted(() => {
  const mockExec = vi.fn();
  const mockWriteFile = vi.fn();
  const mockReadFile = vi.fn();
  const mockDeleteFile = vi.fn();
  const mockLoad = vi.fn();
  const mockOn = vi.fn();
  const mockFFmpegInstance = {
    exec: mockExec,
    writeFile: mockWriteFile,
    readFile: mockReadFile,
    deleteFile: mockDeleteFile,
    load: mockLoad,
    on: mockOn,
  };
  return {
    mockExec,
    mockWriteFile,
    mockReadFile,
    mockDeleteFile,
    mockLoad,
    mockOn,
    mockFFmpegInstance,
    mockPostMessage: vi.fn(),
    mockAddEventListener: vi.fn(),
    mockRemoveEventListener: vi.fn(),
  };
});

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
}));

// Mock loggerService
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock FFmpeg dependencies
vi.mock('@ffmpeg/ffmpeg', () => {
  class MockFFmpeg {
    exec = mockExec;
    writeFile = mockWriteFile;
    readFile = mockReadFile;
    deleteFile = mockDeleteFile;
    load = mockLoad;
    on = mockOn;
  }
  return { FFmpeg: MockFFmpeg };
});

vi.mock('@ffmpeg/util', () => ({
  toBlobURL: vi.fn((_url: string) => Promise.resolve(`blob:${_url}`)),
  fetchFile: vi.fn((_url: string) => Promise.resolve(new Uint8Array([1, 2, 3, 4]))),
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as Response),
);

// Save original navigator.serviceWorker
const originalServiceWorker = {
  controller: {
    postMessage: mockPostMessage,
  },
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
};

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: originalServiceWorker,
  writable: true,
  configurable: true,
});

import { logger } from '@core/services/loggerService';
import {
  generateProxy,
  stitchVideos,
  renderTitleCard,
  renderAudioVisualizer,
  transcodeVideo,
} from './videoEditorService';

describe('videoEditorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExec.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
    mockDeleteFile.mockResolvedValue(undefined);
    // Restore navigator.serviceWorker in case a test nullified it
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: originalServiceWorker,
      writable: true,
      configurable: true,
    });
  });

  describe('generateProxy', () => {
    it('should generate a proxy video from source URL', async () => {
      const sourceUrl = 'https://example.com/video.mp4';
      const result = await generateProxy(sourceUrl);

      expect(result).toBe('blob:mock-url');
      expect(mockExec).toHaveBeenCalledWith(
        expect.arrayContaining(['-i', expect.stringContaining('input_'), '-vf', 'scale=-2:480']),
      );
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockReadFile).toHaveBeenCalled();
    });

    it('should return original URL on error', async () => {
      const sourceUrl = 'https://example.com/video.mp4';
      mockExec.mockRejectedValue(new Error('FFmpeg error'));

      const result = await generateProxy(sourceUrl);

      expect(result).toBe(sourceUrl);
      expect(logger.error).toHaveBeenCalledWith('Proxy generation failed', expect.any(Error));
    });

    it('should clean up temporary files', async () => {
      const sourceUrl = 'https://example.com/video.mp4';
      await generateProxy(sourceUrl);

      expect(mockDeleteFile).toHaveBeenCalledTimes(2);
    });

    it('should not throw if cleanup fails', async () => {
      const sourceUrl = 'https://example.com/video.mp4';
      mockDeleteFile.mockRejectedValue(new Error('Delete failed'));

      await expect(generateProxy(sourceUrl)).resolves.toBe('blob:mock-url');
    });
  });

  describe('stitchVideos', () => {
    it('should throw error if service worker is not active', async () => {
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: null,
        writable: true,
        configurable: true,
      });

      await expect(stitchVideos([])).rejects.toThrow('Service Worker not active');

      // Restore for subsequent tests
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: originalServiceWorker,
        writable: true,
        configurable: true,
      });
    });

    it('should serialize clips and dispatch to service worker', async () => {
      const clips = [
        {
          videoUrl: 'blob:video1',
          audioUrl: 'blob:audio1',
          audioVolume: 0.8,
        },
      ];

      // Setup message handler to resolve immediately
      mockAddEventListener.mockImplementation((event, handler) => {
        if (event === 'message') {
          setTimeout(() => {
            handler({
              data: {
                type: 'RENDER_COMPLETE',
                payload: new Blob(['video'], { type: 'video/mp4' }),
              },
            });
          }, 10);
        }
      });

      const promise = stitchVideos(clips, 'output.mp4');

      await expect(promise).resolves.toBe('blob:mock-url');
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RENDER_JOB',
          payload: expect.objectContaining({
            clips: expect.any(Array),
            outputName: 'output.mp4',
          }),
        }),
        expect.any(Object),
      );
    });

    it('should handle render progress messages', async () => {
      const onProgress = vi.fn();
      const clips = [{ videoUrl: 'blob:video1' }];

      mockAddEventListener.mockImplementation((event, handler) => {
        if (event === 'message') {
          setTimeout(() => {
            handler({
              data: { type: 'RENDER_PROGRESS', progress: 50, status: 'Processing' },
            });
            handler({
              data: { type: 'RENDER_COMPLETE', payload: new Blob() },
            });
          }, 10);
        }
      });

      await stitchVideos(clips, 'output.mp4', onProgress);

      expect(onProgress).toHaveBeenCalledWith('Processing (50%)');
    });

    it('should reject on render error', async () => {
      const clips = [{ videoUrl: 'blob:video1' }];

      mockAddEventListener.mockImplementation((event, handler) => {
        if (event === 'message') {
          setTimeout(() => {
            handler({
              data: { type: 'RENDER_ERROR', payload: 'Render failed' },
            });
          }, 10);
        }
      });

      await expect(stitchVideos(clips)).rejects.toThrow('Render failed');
    });

    it('should fetch and serialize background music', async () => {
      const clips = [{ videoUrl: 'blob:video1' }];
      const bgMusicUrl = 'blob:music';

      mockAddEventListener.mockImplementation((event, handler) => {
        if (event === 'message') {
          setTimeout(() => {
            handler({
              data: { type: 'RENDER_COMPLETE', payload: new Blob() },
            });
          }, 10);
        }
      });

      await stitchVideos(clips, 'output.mp4', undefined, undefined, undefined, bgMusicUrl);

      expect(global.fetch).toHaveBeenCalledWith(bgMusicUrl);
    });
  });

  describe('renderTitleCard', () => {
    it('should render a title card with default duration', async () => {
      const styles = { background: '#000000', color: '#ffffff', fontSize: 48 };

      const result = await renderTitleCard('Test Title', 3, styles);

      expect(result).toBe('blob:mock-url');
      expect(mockExec).toHaveBeenCalledWith(
        expect.arrayContaining([
          '-f',
          'lavfi',
          '-i',
          expect.stringContaining('color=c=0x000000'),
          expect.stringContaining('-t'),
          '3',
        ]),
      );
    });

    it('should escape special characters in title text', async () => {
      const styles = { background: '#000000', color: '#ffffff', fontSize: 48 };

      await renderTitleCard("Test: Title's", 3, styles);

      const execCall = mockExec.mock.calls[0][0];
      const vfArg = execCall.find((arg: string) => arg.includes('drawtext'));
      expect(vfArg).toContain("\\'");
      expect(vfArg).toContain('\\:');
    });

    it('should call progress callback', async () => {
      const onProgress = vi.fn();
      const styles = { background: '#000000', color: '#ffffff', fontSize: 48 };

      await renderTitleCard('Test', 3, styles, onProgress);

      expect(onProgress).toHaveBeenCalledWith('Rendering Title Card...');
    });

    it('should clean up output file', async () => {
      const styles = { background: '#000000', color: '#ffffff', fontSize: 48 };

      await renderTitleCard('Test', 3, styles);

      expect(mockDeleteFile).toHaveBeenCalled();
    });

    it('should use custom duration', async () => {
      const styles = { background: '#000000', color: '#ffffff', fontSize: 48 };

      await renderTitleCard('Test', 5, styles);

      expect(mockExec).toHaveBeenCalledWith(expect.arrayContaining(['-t', '5']));
    });
  });

  describe('renderAudioVisualizer', () => {
    it('should render audio visualizer with line style', async () => {
      const audioBlob = new Blob(['audio'], { type: 'audio/wav' });
      const bgImage = new Blob(['image'], { type: 'image/png' });

      const result = await renderAudioVisualizer(audioBlob, bgImage, 'line');

      expect(result).toBeInstanceOf(Blob);
      expect(mockExec).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('showwaves')]),
      );
    });

    it('should render audio visualizer with circle style', async () => {
      const audioBlob = new Blob(['audio'], { type: 'audio/wav' });
      const bgImage = new Blob(['image'], { type: 'image/png' });

      await renderAudioVisualizer(audioBlob, bgImage, 'circle');

      const execCall = mockExec.mock.calls[0][0];
      const filterArg = execCall.find((arg: string) => arg.includes('showwaves'));
      expect(filterArg).toContain('cline');
    });

    it('should clean up temporary files', async () => {
      const audioBlob = new Blob(['audio'], { type: 'audio/wav' });
      const bgImage = new Blob(['image'], { type: 'image/png' });

      await renderAudioVisualizer(audioBlob, bgImage, 'line');

      expect(mockDeleteFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('transcodeVideo', () => {
    it('should transcode video with export profile', async () => {
      const profile = {
        id: 'export-profile',
        label: 'MP4',
        container: 'mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        mimeType: 'video/mp4',
        estimatedBitrateMbps: 5,
        description: 'Export profile',
        args: ['-preset', 'fast'],
      };

      const result = await transcodeVideo('blob:source', profile);

      expect(result).toBe('blob:mock-url');
      expect(mockExec).toHaveBeenCalledWith(
        expect.arrayContaining(['-i', 'input_transcode.mp4', '-c:v', 'libx264', '-c:a', 'aac']),
      );
    });

    it('should handle GIF export with palette generation', async () => {
      const profile = {
        id: 'export-profile',
        label: 'GIF',
        container: 'gif',
        videoCodec: '',
        mimeType: 'image/gif',
        estimatedBitrateMbps: 5,
        description: 'Export profile',
        args: [],
      };

      await transcodeVideo('blob:source', profile);

      const execCall = mockExec.mock.calls[0][0];
      const vfArg = execCall.find((arg: string) => arg.includes('palettegen'));
      expect(vfArg).toBeDefined();
    });

    it('should call progress callback during transcode', async () => {
      const onProgress = vi.fn();
      const profile = {
        id: 'export-profile',
        label: 'MP4',
        container: 'mp4',
        videoCodec: 'libx264',
        mimeType: 'video/mp4',
        estimatedBitrateMbps: 5,
        description: 'Export profile',
        args: [],
      };

      await transcodeVideo('blob:source', profile, onProgress);

      expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('MP4'));
    });

    it('should clean up input and output files', async () => {
      const profile = {
        id: 'export-profile',
        label: 'MP4',
        container: 'mp4',
        videoCodec: 'libx264',
        mimeType: 'video/mp4',
        estimatedBitrateMbps: 5,
        description: 'Export profile',
        args: [],
      };

      await transcodeVideo('blob:source', profile);

      expect(mockDeleteFile).toHaveBeenCalledTimes(2);
    });

    it('should handle profiles without audio codec', async () => {
      const profile = {
        id: 'export-profile',
        label: 'Video Only',
        container: 'mp4',
        videoCodec: 'libx264',
        audioCodec: undefined,
        mimeType: 'video/mp4',
        estimatedBitrateMbps: 5,
        description: 'Export profile',
        args: [],
      };

      await transcodeVideo('blob:source', profile);

      expect(mockExec).toHaveBeenCalledWith(expect.arrayContaining(['-an']));
    });
  });
});
