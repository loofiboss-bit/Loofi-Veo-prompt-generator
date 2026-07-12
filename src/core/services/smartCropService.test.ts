/**
 * Smart Crop Service Unit Tests
 * Tests for object detection-based smart cropping
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock maintained Transformers.js package
const mockPipeline = vi.fn();
const mockDetector = vi.fn();

vi.mock('@huggingface/transformers', () => ({
  pipeline: mockPipeline,
  env: {
    allowLocalModels: false,
    useBrowserCache: true,
  },
}));

import { loadSmartCropModel, calculateSubjectCenter } from './smartCropService';
import { logger } from './loggerService';

describe('smartCropService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPipeline.mockResolvedValue(mockDetector);
  });

  describe('loadSmartCropModel', () => {
    it('should load model on first call', async () => {
      // Note: Can't fully test singleton behavior in isolation
      // as the module maintains state across tests
      mockPipeline.mockResolvedValue(mockDetector);

      const detector = await loadSmartCropModel();

      expect(detector).toBe(mockDetector);
    });

    it('should return a detector instance', async () => {
      mockPipeline.mockResolvedValue(mockDetector);

      const detector = await loadSmartCropModel();

      // Detector should be defined (may be cached from previous test)
      expect(detector).toBeDefined();
    });
  });

  describe('calculateSubjectCenter', () => {
    const mockCanvas = {
      width: 1920,
      height: 1080,
    } as HTMLCanvasElement;

    it('should return center X coordinate for detected person', async () => {
      mockDetector.mockResolvedValue([
        {
          label: 'person',
          score: 0.9,
          box: { xmin: 0.3, xmax: 0.7, ymin: 0.2, ymax: 0.8 },
        },
      ]);

      const centerX = await calculateSubjectCenter(mockCanvas);

      expect(centerX).toBe(0.5); // (0.3 + 0.7) / 2
      expect(mockDetector).toHaveBeenCalledWith(mockCanvas, {
        threshold: 0.5,
        percentage: true,
      });
    });

    it('should prioritize person with highest confidence', async () => {
      mockDetector.mockResolvedValue([
        {
          label: 'person',
          score: 0.7,
          box: { xmin: 0.1, xmax: 0.3, ymin: 0.2, ymax: 0.8 },
        },
        {
          label: 'person',
          score: 0.95,
          box: { xmin: 0.6, xmax: 0.9, ymin: 0.2, ymax: 0.8 },
        },
      ]);

      const centerX = await calculateSubjectCenter(mockCanvas);

      expect(centerX).toBe(0.75); // (0.6 + 0.9) / 2 - highest score
    });

    it('should fallback to largest object when no person detected', async () => {
      mockDetector.mockResolvedValue([
        {
          label: 'car',
          score: 0.85,
          box: { xmin: 0.1, xmax: 0.4, ymin: 0.3, ymax: 0.7 }, // area = 0.12
        },
        {
          label: 'dog',
          score: 0.9,
          box: { xmin: 0.5, xmax: 0.9, ymin: 0.2, ymax: 0.9 }, // area = 0.28 (larger)
        },
      ]);

      const centerX = await calculateSubjectCenter(mockCanvas);

      expect(centerX).toBe(0.7); // (0.5 + 0.9) / 2 - largest object
    });

    it('should return null when no objects detected', async () => {
      mockDetector.mockResolvedValue([]);

      const centerX = await calculateSubjectCenter(mockCanvas);

      expect(centerX).toBeNull();
    });

    it('should handle detection errors gracefully', async () => {
      mockDetector.mockRejectedValue(new Error('Detection failed'));

      const centerX = await calculateSubjectCenter(mockCanvas);

      expect(centerX).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Smart Crop Detection Failed', expect.any(Error));
    });

    it('should normalize pixel coordinates to 0-1 range', async () => {
      // Mock detector returning pixel coordinates instead of normalized
      mockDetector.mockResolvedValue([
        {
          label: 'person',
          score: 0.9,
          box: { xmin: 960, xmax: 1440, ymin: 200, ymax: 800 }, // pixel coords
        },
      ]);

      const centerX = await calculateSubjectCenter(mockCanvas);

      // Should normalize: (960 + 1440) / 2 / 1920 = 0.625
      expect(centerX).toBe(0.625);
    });

    it('should work with ImageBitmap input', async () => {
      const mockImageBitmap = {
        width: 1280,
        height: 720,
      } as ImageBitmap;

      mockDetector.mockResolvedValue([
        {
          label: 'person',
          score: 0.9,
          box: { xmin: 0.4, xmax: 0.6, ymin: 0.3, ymax: 0.7 },
        },
      ]);

      const centerX = await calculateSubjectCenter(mockImageBitmap);

      expect(centerX).toBe(0.5);
      expect(mockDetector).toHaveBeenCalledWith(mockImageBitmap, {
        threshold: 0.5,
        percentage: true,
      });
    });

    it('should work with HTMLImageElement input', async () => {
      const mockImage = {
        width: 800,
        height: 600,
      } as HTMLImageElement;

      mockDetector.mockResolvedValue([
        {
          label: 'person',
          score: 0.9,
          box: { xmin: 0.25, xmax: 0.75, ymin: 0.2, ymax: 0.8 },
        },
      ]);

      const centerX = await calculateSubjectCenter(mockImage);

      expect(centerX).toBe(0.5);
    });

    it('should handle normalized coordinates already in 0-1 range', async () => {
      mockDetector.mockResolvedValue([
        {
          label: 'person',
          score: 0.9,
          box: { xmin: 0.2, xmax: 0.8, ymin: 0.1, ymax: 0.9 },
        },
      ]);

      const centerX = await calculateSubjectCenter(mockCanvas);

      // When xmax <= 1.0, return centerAbsolute directly
      expect(centerX).toBe(0.5); // (0.2 + 0.8) / 2
    });

    it('should calculate area correctly for largest object selection', async () => {
      mockDetector.mockResolvedValue([
        {
          label: 'cat',
          score: 0.85,
          box: { xmin: 0.1, xmax: 0.3, ymin: 0.2, ymax: 0.4 }, // area = 0.04
        },
        {
          label: 'car',
          score: 0.8,
          box: { xmin: 0.4, xmax: 0.9, ymin: 0.1, ymax: 0.9 }, // area = 0.4 (larger)
        },
      ]);

      const centerX = await calculateSubjectCenter(mockCanvas);

      // Should select car (larger area)
      expect(centerX).toBe(0.65); // (0.4 + 0.9) / 2
    });
  });
});
