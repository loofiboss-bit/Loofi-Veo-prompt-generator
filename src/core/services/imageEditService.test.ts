/**
 * Image Edit Service Unit Tests
 * Tests for outpainting preparation logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock geminiService
vi.mock('./geminiService', () => ({
  describeImage: vi.fn(),
}));

import { prepareOutpaint } from './imageEditService';
import * as geminiService from './geminiService';

describe('imageEditService', () => {
  let mockCanvas1: Partial<HTMLCanvasElement>;
  let mockCanvas2: Partial<HTMLCanvasElement>;
  let mockContext1: Partial<CanvasRenderingContext2D>;
  let mockContext2: Partial<CanvasRenderingContext2D>;
  let mockBlob: Blob;
  let canvasIndex: number;

  beforeEach(() => {
    vi.clearAllMocks();
    canvasIndex = 0;

    // Create mock blob
    mockBlob = new Blob(['fake-image'], { type: 'image/png' });

    // Setup mock contexts
    mockContext1 = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      createImageData: vi.fn(),
      putImageData: vi.fn(),
    } as unknown as Partial<CanvasRenderingContext2D>;

    mockContext2 = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      createImageData: vi.fn(),
      putImageData: vi.fn(),
    } as unknown as Partial<CanvasRenderingContext2D>;

    mockCanvas1 = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext1),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,compositeData'),
    } as unknown as Partial<HTMLCanvasElement>;

    mockCanvas2 = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext2),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,maskData'),
    } as unknown as Partial<HTMLCanvasElement>;

    // Mock createElement to return our mocked canvases
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        canvasIndex++;
        return (canvasIndex === 1 ? mockCanvas1 : mockCanvas2) as HTMLCanvasElement;
      }
      // Return real element for other tags
      return document.createElement.call(document, tagName);
    });

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

    // Mock FileReader for blobToBase64
    global.FileReader = class MockFileReader {
      result: string | null = null;
      onloadend: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL(_blob: Blob) {
        setTimeout(() => {
          this.result = 'data:image/png;base64,mockOriginalImage';
          if (this.onloadend) {
            this.onloadend(new ProgressEvent('loadend') as ProgressEvent<FileReader>);
          }
        }, 0);
      }
    } as unknown as typeof FileReader;

    // Mock geminiService.describeImage
    vi.mocked(geminiService.describeImage).mockResolvedValue(
      'A beautiful landscape with mountains',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('prepareOutpaint', () => {
    it('should create composite and mask canvases with proper dimensions', async () => {
      // Mock Image creation and loading
      const mockImg = {
        width: 1080,
        height: 1920,
        onload: null as ((this: GlobalEventHandlers, ev: Event) => unknown) | null,
        onerror: null,
        src: '',
      };

      // Mock Image as a class constructor
      global.Image = class {
        width = mockImg.width;
        height = mockImg.height;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        _src = '';
        get src() {
          return this._src;
        }
        set src(val: string) {
          this._src = val;
          setTimeout(() => this.onload?.(), 0);
        }
      } as unknown as typeof Image;

      // Trigger image load after a short delay
      const result = await prepareOutpaint(mockBlob, 16 / 9);

      expect(result.composite).toBe('compositeData');
      expect(result.mask).toBe('maskData');
      expect(result.prompt).toContain('High quality, seamless extension of the scene');
      expect(result.prompt).toContain('A beautiful landscape with mountains');
    });

    it('should call geminiService to describe image', async () => {
      const mockImg = {
        width: 1920,
        height: 1080,
        onload: null as ((this: GlobalEventHandlers, ev: Event) => unknown) | null,
        onerror: null,
        src: '',
      };

      global.Image = class {
        width = mockImg.width;
        height = mockImg.height;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        _src = '';
        get src() {
          return this._src;
        }
        set src(val: string) {
          this._src = val;
          setTimeout(() => this.onload?.(), 0);
        }
      } as unknown as typeof Image;

      const result = await prepareOutpaint(mockBlob, 16 / 9);

      expect(geminiService.describeImage).toHaveBeenCalledWith('mockOriginalImage', 'image/png');
      expect(result.prompt).toBe(
        'High quality, seamless extension of the scene: A beautiful landscape with mountains. Fill the empty space naturally matching the lighting and texture.',
      );
    });

    it('should draw image and create masks on canvases', async () => {
      const mockImg = {
        width: 1920,
        height: 1080,
        onload: null as ((this: GlobalEventHandlers, ev: Event) => unknown) | null,
        onerror: null,
        src: '',
      };

      global.Image = class {
        width = mockImg.width;
        height = mockImg.height;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        _src = '';
        get src() {
          return this._src;
        }
        set src(val: string) {
          this._src = val;
          setTimeout(() => this.onload?.(), 0);
        }
      } as unknown as typeof Image;

      await prepareOutpaint(mockBlob, 16 / 9);

      // Verify fillRect and drawImage were called
      expect(mockContext1.fillRect).toHaveBeenCalled();
      expect(mockContext1.drawImage).toHaveBeenCalled();
      expect(mockContext2.fillRect).toHaveBeenCalled();
    });

    it('should return base64 strings without data URI prefix', async () => {
      const mockImg = {
        width: 1920,
        height: 1080,
        onload: null as ((this: GlobalEventHandlers, ev: Event) => unknown) | null,
        onerror: null,
        src: '',
      };

      global.Image = class {
        width = mockImg.width;
        height = mockImg.height;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        _src = '';
        get src() {
          return this._src;
        }
        set src(val: string) {
          this._src = val;
          setTimeout(() => this.onload?.(), 0);
        }
      } as unknown as typeof Image;

      const result = await prepareOutpaint(mockBlob, 16 / 9);

      // Should be base64 without data:image/png;base64, prefix
      expect(result.composite).not.toContain('data:');
      expect(result.mask).not.toContain('data:');
    });

    it('should throw error when canvas context is null', async () => {
      // Make first canvas return null context
      mockCanvas1.getContext = vi.fn().mockReturnValue(null);

      const mockImg = {
        width: 1920,
        height: 1080,
        onload: null as ((this: GlobalEventHandlers, ev: Event) => unknown) | null,
        onerror: null,
        src: '',
      };

      global.Image = class {
        width = mockImg.width;
        height = mockImg.height;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        _src = '';
        get src() {
          return this._src;
        }
        set src(val: string) {
          this._src = val;
          setTimeout(() => this.onload?.(), 0);
        }
      } as unknown as typeof Image;

      await expect(prepareOutpaint(mockBlob, 16 / 9)).rejects.toThrow(
        'Could not get canvas context',
      );
    });

    it('should throw error when mask context is null', async () => {
      // Make second canvas return null context
      mockCanvas2.getContext = vi.fn().mockReturnValue(null);

      const mockImg = {
        width: 1920,
        height: 1080,
        onload: null as ((this: GlobalEventHandlers, ev: Event) => unknown) | null,
        onerror: null,
        src: '',
      };

      global.Image = class {
        width = mockImg.width;
        height = mockImg.height;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        _src = '';
        get src() {
          return this._src;
        }
        set src(val: string) {
          this._src = val;
          setTimeout(() => this.onload?.(), 0);
        }
      } as unknown as typeof Image;

      await expect(prepareOutpaint(mockBlob, 16 / 9)).rejects.toThrow('Could not get mask context');
    });
  });
});
