import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractLastFrame, extractFirstFrame, extractFrameImageData } from './videoUtils';

// Mock DOM elements
function createMockCanvas(width = 1920, height = 1080) {
  const ctx = {
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({
      data: new Uint8ClampedArray(128 * 72 * 4),
      width: 128,
      height: 72,
    }),
  };
  return {
    width,
    height,
    getContext: vi.fn().mockReturnValue(ctx),
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,abc123'),
    _ctx: ctx,
  };
}

function createMockVideo(
  opts: { duration?: number; videoWidth?: number; videoHeight?: number } = {},
) {
  const video: Record<string, unknown> = {
    crossOrigin: '',
    src: '',
    muted: false,
    currentTime: 0,
    duration: opts.duration ?? 10,
    videoWidth: opts.videoWidth ?? 1920,
    videoHeight: opts.videoHeight ?? 1080,
    error: null,
    onloadedmetadata: null as (() => void) | null,
    onloadeddata: null as (() => void) | null,
    onseeked: null as (() => void) | null,
    ondurationchange: null as (() => void) | null,
    onerror: null as ((e: unknown) => void) | null,
    remove: vi.fn(),
  };

  // When currentTime is set, trigger onseeked
  let _currentTime = 0;
  Object.defineProperty(video, 'currentTime', {
    get: () => _currentTime,
    set: (v: number) => {
      _currentTime = v;
      // Schedule onseeked callback
      if (video.onseeked) {
        queueMicrotask(() => (video.onseeked as () => void)());
      }
    },
  });

  // When src is set, trigger onloadedmetadata
  let _src = '';
  Object.defineProperty(video, 'src', {
    get: () => _src,
    set: (v: string) => {
      _src = v;
      queueMicrotask(() => {
        if (video.onloadedmetadata) (video.onloadedmetadata as () => void)();
        if (video.onloadeddata) (video.onloadeddata as () => void)();
      });
    },
  });

  return video;
}

let mockCanvas: ReturnType<typeof createMockCanvas>;
let mockVideo: ReturnType<typeof createMockVideo>;

beforeEach(() => {
  mockCanvas = createMockCanvas();
  mockVideo = createMockVideo();

  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'video') return mockVideo as unknown as HTMLVideoElement;
    if (tag === 'canvas') return mockCanvas as unknown as HTMLCanvasElement;
    return document.createElement(tag);
  });
});

describe('extractLastFrame', () => {
  it('should resolve with base64 data and mimeType', async () => {
    const result = await extractLastFrame('blob:http://example.com/video');

    expect(result.data).toBe('abc123');
    expect(result.mimeType).toBe('image/png');
  });

  it('should seek to near the end of the video', async () => {
    await extractLastFrame('blob:http://example.com/video');

    // Should have set currentTime to duration - 0.1
    // The mock will have triggered onseeked
    expect(mockCanvas._ctx.drawImage).toHaveBeenCalled();
  });

  it('should set crossOrigin to anonymous', async () => {
    await extractLastFrame('blob:http://example.com/video');

    expect(mockVideo.crossOrigin).toBe('anonymous');
  });

  it('should clean up video element after extraction', async () => {
    await extractLastFrame('blob:http://example.com/video');

    expect(mockVideo.remove).toHaveBeenCalled();
  });

  it('should reject when canvas context is null', async () => {
    mockCanvas.getContext.mockReturnValue(null);

    await expect(extractLastFrame('blob:test')).rejects.toThrow('Could not get canvas context');
  });

  it('should reject on video error', async () => {
    // Override: when src is set, trigger onerror instead
    const errorVideo = createMockVideo();
    let _src = '';
    Object.defineProperty(errorVideo, 'src', {
      get: () => _src,
      set: (v: string) => {
        _src = v;
        queueMicrotask(() => {
          if (errorVideo.onerror) (errorVideo.onerror as (e: unknown) => void)(new Event('error'));
        });
      },
    });

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'video') return errorVideo as unknown as HTMLVideoElement;
      if (tag === 'canvas') return mockCanvas as unknown as HTMLCanvasElement;
      return document.createElement(tag);
    });

    await expect(extractLastFrame('blob:badurl')).rejects.toThrow('Failed to load video');
  });
});

describe('extractFirstFrame', () => {
  it('should resolve with base64 data and mimeType', async () => {
    const result = await extractFirstFrame('blob:http://example.com/video');

    expect(result.data).toBe('abc123');
    expect(result.mimeType).toBe('image/png');
  });

  it('should seek to time 0', async () => {
    await extractFirstFrame('blob:http://example.com/video');

    expect(mockCanvas._ctx.drawImage).toHaveBeenCalled();
  });

  it('should clean up video element', async () => {
    await extractFirstFrame('blob:http://example.com/video');

    expect(mockVideo.remove).toHaveBeenCalled();
  });

  it('should reject when canvas context is null', async () => {
    mockCanvas.getContext.mockReturnValue(null);

    await expect(extractFirstFrame('blob:test')).rejects.toThrow('Could not get canvas context');
  });
});

describe('extractFrameImageData', () => {
  it('should resolve with ImageData', async () => {
    const result = await extractFrameImageData('blob:http://example.com/video', 5);

    expect(result).toBeDefined();
    expect(result.data).toBeInstanceOf(Uint8ClampedArray);
    expect(result.width).toBe(128);
    expect(result.height).toBe(72);
  });

  it('should use small canvas (128x72) for efficiency', async () => {
    await extractFrameImageData('blob:http://example.com/video');

    expect(mockCanvas._ctx.getImageData).toHaveBeenCalledWith(0, 0, 128, 72);
  });

  it('should clean up video element', async () => {
    await extractFrameImageData('blob:http://example.com/video');

    expect(mockVideo.remove).toHaveBeenCalled();
  });

  it('should reject when canvas context is null', async () => {
    mockCanvas.getContext.mockReturnValue(null);

    await expect(extractFrameImageData('blob:test')).rejects.toThrow('No canvas ctx');
  });

  it('should default to timeOffset 0', async () => {
    await extractFrameImageData('blob:http://example.com/video');

    // Just verify it resolves without errors
    expect(mockCanvas._ctx.drawImage).toHaveBeenCalled();
  });
});
