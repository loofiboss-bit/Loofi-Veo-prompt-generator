/**
 * Segmentation Service Unit Tests
 * Tests for MediaPipe-based video segmentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock MediaPipe tasks-vision
const mockInteractiveSegmenter = {
  segment: vi.fn(),
};

const mockFilesetResolver = {
  forVisionTasks: vi.fn(),
};

const mockInteractiveSegmenterClass = {
  createFromOptions: vi.fn(),
};

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: mockFilesetResolver,
  InteractiveSegmenter: mockInteractiveSegmenterClass,
}));

import { generateMaskSequence } from './segmentationService';
import { logger } from '@core/services/loggerService';

describe('segmentationService', () => {
  let mockVideo: Partial<HTMLVideoElement>;
  let mockCanvas: Partial<HTMLCanvasElement>;
  let mockContext: Partial<CanvasRenderingContext2D>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock canvas context
    const mockImageData = {
      data: new Uint8ClampedArray(4), // RGBA for 1 pixel
      width: 2,
      height: 2,
      colorSpace: 'srgb' as PredefinedColorSpace,
    };

    mockContext = {
      drawImage: vi.fn(),
      createImageData: vi.fn().mockReturnValue(mockImageData),
      putImageData: vi.fn(),
      getContext: vi.fn(),
    } as unknown as Partial<CanvasRenderingContext2D>;

    mockCanvas = {
      width: 2,
      height: 2,
      getContext: vi.fn().mockReturnValue(mockContext),
      toBlob: vi.fn((callback) => {
        const blob = new Blob(['fake-image-data'], { type: 'image/png' });
        callback(blob);
      }),
    } as unknown as Partial<HTMLCanvasElement>;

    mockVideo = {
      src: '',
      crossOrigin: null,
      muted: false,
      videoWidth: 2,
      videoHeight: 2,
      duration: 0.1, // 100ms
      currentTime: 0,
      addEventListener: vi.fn((event, handler) => {
        if (event === 'seeked') {
          // Immediately trigger seeked event
          setTimeout(() => (handler as () => void)(), 0);
        }
      }),
      removeEventListener: vi.fn(),
    } as unknown as Partial<HTMLVideoElement>;

    createElementSpy = vi.spyOn(document, 'createElement');
    createElementSpy.mockImplementation((tagName: string) => {
      if (tagName === 'video') return mockVideo as HTMLVideoElement;
      if (tagName === 'canvas') return mockCanvas as HTMLCanvasElement;
      return document.createElement(tagName);
    });

    // Mock MediaPipe initialization
    mockFilesetResolver.forVisionTasks.mockResolvedValue({});
    mockInteractiveSegmenterClass.createFromOptions.mockResolvedValue(mockInteractiveSegmenter);

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('generateMaskSequence', () => {
    it('should generate mask sequence for valid video and points', async () => {
      // Mock video metadata loaded
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata(new Event('loadedmetadata'));
        }
      }, 0);

      // Mock segmentation result
      const mockCategoryMask = {
        getAsUint8Array: vi.fn().mockReturnValue(new Uint8Array([1, 0, 1, 0])),
      };

      mockInteractiveSegmenter.segment.mockResolvedValue({
        categoryMask: mockCategoryMask,
      });

      const maskUrls = await generateMaskSequence(
        'test-video.mp4',
        [{ x: 0.5, y: 0.5 }],
        (percent) => {
          expect(percent).toBeGreaterThanOrEqual(0);
          expect(percent).toBeLessThanOrEqual(100);
        },
      );

      // At 12fps and 0.1s duration, we expect ~1 frame
      expect(maskUrls.length).toBeGreaterThan(0);
      expect(mockInteractiveSegmenter.segment).toHaveBeenCalled();
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(mockCanvas.toBlob).toHaveBeenCalled();
    });

    it('should handle segmentation errors gracefully', async () => {
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata(new Event('loadedmetadata'));
        }
      }, 0);

      // Mock segmentation failure
      mockInteractiveSegmenter.segment.mockRejectedValue(new Error('Segmentation failed'));

      const maskUrls = await generateMaskSequence('test-video.mp4', [{ x: 0.5, y: 0.5 }]);

      expect(maskUrls.length).toBeGreaterThan(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Segmentation inference failed at',
        expect.any(Number),
        expect.any(Error),
      );
      // Should push empty mask or repeat previous
      expect(maskUrls.some((url) => url === '')).toBe(true);
    });

    it('should handle canvas context initialization failure', async () => {
      // Mock canvas context failure
      mockCanvas.getContext = vi.fn().mockReturnValue(null);

      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata(new Event('loadedmetadata'));
        }
      }, 0);

      await expect(generateMaskSequence('test-video.mp4', [{ x: 0.5, y: 0.5 }])).rejects.toThrow(
        'Canvas context init failed',
      );
    });

    it('should use first point as keypoint for segmentation', async () => {
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata(new Event('loadedmetadata'));
        }
      }, 0);

      const mockCategoryMask = {
        getAsUint8Array: vi.fn().mockReturnValue(new Uint8Array([1, 0, 1, 0])),
      };

      mockInteractiveSegmenter.segment.mockResolvedValue({
        categoryMask: mockCategoryMask,
      });

      await generateMaskSequence('test-video.mp4', [
        { x: 0.3, y: 0.4 },
        { x: 0.7, y: 0.8 },
      ]);

      expect(mockInteractiveSegmenter.segment).toHaveBeenCalledWith(
        mockCanvas,
        expect.objectContaining({
          keypoint: { x: 0.3, y: 0.4 },
        }),
      );
    });

    it('should handle null blob from canvas.toBlob', async () => {
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata(new Event('loadedmetadata'));
        }
      }, 0);

      const mockCategoryMask = {
        getAsUint8Array: vi.fn().mockReturnValue(new Uint8Array([1, 0, 1, 0])),
      };

      mockInteractiveSegmenter.segment.mockResolvedValue({
        categoryMask: mockCategoryMask,
      });

      // Mock toBlob returning null
      mockCanvas.toBlob = vi.fn((callback) => {
        (callback as BlobCallback)(null);
      });

      const maskUrls = await generateMaskSequence('test-video.mp4', [{ x: 0.5, y: 0.5 }]);

      expect(maskUrls.some((url) => url === '')).toBe(true);
    });

    it('should set video properties correctly', async () => {
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata(new Event('loadedmetadata'));
        }
      }, 0);

      const mockCategoryMask = {
        getAsUint8Array: vi.fn().mockReturnValue(new Uint8Array([1, 0, 1, 0])),
      };

      mockInteractiveSegmenter.segment.mockResolvedValue({
        categoryMask: mockCategoryMask,
      });

      await generateMaskSequence('https://example.com/video.mp4', [{ x: 0.5, y: 0.5 }]);

      expect(mockVideo.src).toBe('https://example.com/video.mp4');
      expect(mockVideo.crossOrigin).toBe('anonymous');
      expect(mockVideo.muted).toBe(true);
    });

    it('should create RGBA mask with white objects on transparent background', async () => {
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata(new Event('loadedmetadata'));
        }
      }, 0);

      const mockMaskData = new Uint8Array([1, 0, 1, 0]); // object, bg, object, bg
      const mockCategoryMask = {
        getAsUint8Array: vi.fn().mockReturnValue(mockMaskData),
      };

      mockInteractiveSegmenter.segment.mockResolvedValue({
        categoryMask: mockCategoryMask,
      });

      const mockImageData = {
        data: new Uint8ClampedArray(16), // 4 pixels * 4 channels
        width: 2,
        height: 2,
        colorSpace: 'srgb' as PredefinedColorSpace,
      };

      mockContext.createImageData = vi.fn().mockReturnValue(mockImageData);

      await generateMaskSequence('test-video.mp4', [{ x: 0.5, y: 0.5 }]);

      const pixels = mockImageData.data;
      // First pixel (object): white with full alpha
      expect(pixels[0]).toBe(255); // R
      expect(pixels[1]).toBe(255); // G
      expect(pixels[2]).toBe(255); // B
      expect(pixels[3]).toBe(255); // A

      // Second pixel (background): white with zero alpha
      expect(pixels[4]).toBe(255); // R
      expect(pixels[5]).toBe(255); // G
      expect(pixels[6]).toBe(255); // B
      expect(pixels[7]).toBe(0); // A

      expect(mockContext.putImageData).toHaveBeenCalledWith(mockImageData, 0, 0);
    });
  });
});
