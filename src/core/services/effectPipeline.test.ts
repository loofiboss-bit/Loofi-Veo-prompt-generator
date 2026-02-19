import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyEffects, applyFilmEmulation } from './effectPipeline';
import { drawGrain } from '@core/utils/filmGrain';
import type {
  VideoEffect,
  CameraShakeEffect,
  ColorGradeEffect,
  ChromaKeyEffect,
  VideoFilters,
} from '@core/types';

vi.mock('@core/utils/filmGrain', () => ({
  drawGrain: vi.fn(),
}));

const createMockContext = (pixelData?: Uint8ClampedArray): CanvasRenderingContext2D => {
  const drawImage = vi.fn();
  const putImageData = vi.fn();
  const save = vi.fn();
  const restore = vi.fn();

  const data = pixelData ?? new Uint8ClampedArray([0, 255, 0, 255]);
  const getImageData = vi.fn().mockReturnValue({
    data,
    width: 2,
    height: 1,
  } as ImageData);

  return {
    filter: 'none',
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    drawImage,
    getImageData,
    putImageData,
    save,
    restore,
    canvas: document.createElement('canvas'),
  } as unknown as CanvasRenderingContext2D;
};

describe('effectPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('applyEffects', () => {
    it('applies color filters and resets ctx.filter after draw', () => {
      const mockCtx = createMockContext();
      const mockImage = document.createElement('img');
      const effects: VideoEffect[] = [
        {
          id: 'color-1',
          type: 'color',
          isEnabled: true,
          brightness: 1.2,
          contrast: 1.1,
          saturation: 0.9,
          sepia: 0.1,
          hueRotate: 15,
        } as ColorGradeEffect,
      ];

      applyEffects(mockCtx, mockImage, effects, 1920, 1080, 1.5);

      const drawImageCalls = vi.mocked(mockCtx.drawImage).mock.calls;
      expect(drawImageCalls.length).toBe(1);
      expect(drawImageCalls[0][1]).toBeTypeOf('number');
      expect(drawImageCalls[0][2]).toBeTypeOf('number');
      expect(mockCtx.filter).toBe('none');
    });

    it('applies shake transform and optional film jitter', () => {
      const mockCtx = createMockContext();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.75);
      const mockImage = document.createElement('img');

      const shakeEffect: CameraShakeEffect = {
        id: 'shake-1',
        type: 'shake',
        isEnabled: true,
        intensity: 1,
        speed: 1,
        scale: 1.05,
      };

      applyEffects(mockCtx, mockImage, [shakeEffect], 100, 100, 2, {
        enabled: true,
        preset: 'custom',
        grainIntensity: 0,
        halationIntensity: 0,
        jitterIntensity: 50,
      });

      expect(mockCtx.drawImage).toHaveBeenCalled();
      randomSpy.mockRestore();
    });

    it('applies chroma key alpha adjustments', () => {
      const pixelData = new Uint8ClampedArray([
        // Pixel 1: exact green -> fully transparent
        0, 255, 0, 255,
        // Pixel 2: near green -> smoothed alpha
        0, 220, 0, 255,
      ]);
      const mockCtx = createMockContext(pixelData);
      const mockImage = document.createElement('img');
      const chroma: ChromaKeyEffect = {
        id: 'chroma-1',
        type: 'chroma',
        isEnabled: true,
        color: '#00ff00',
        similarity: 0.05,
        smoothness: 0.2,
        spill: 0,
      };

      applyEffects(mockCtx, mockImage, [chroma], 2, 1, 0);

      expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, 2, 1);
      expect(pixelData[3]).toBe(0);
      expect(pixelData[7]).toBeGreaterThan(0);
      expect(pixelData[7]).toBeLessThan(255);
      expect(mockCtx.putImageData).toHaveBeenCalled();
    });

    it('recognizes effect type contracts', () => {
      const shakeEffect: CameraShakeEffect = {
        id: 'shake-1',
        type: 'shake',
        isEnabled: true,
        intensity: 1,
        speed: 1,
        scale: 1.05,
      };

      const colorEffect: ColorGradeEffect = {
        id: 'color-1',
        type: 'color',
        isEnabled: true,
        brightness: 1.2,
        contrast: 1.1,
        saturation: 0.9,
        sepia: 0.3,
        hueRotate: 15,
      };

      expect(shakeEffect.type).toBe('shake');
      expect(colorEffect.type).toBe('color');
      expect(colorEffect.brightness).toBe(1.2);

      const chromaEffect: ChromaKeyEffect = {
        id: 'chroma-1',
        type: 'chroma',
        isEnabled: true,
        color: '#00ff00',
        similarity: 0.4,
        smoothness: 0.1,
        spill: 0.1,
      };

      expect(chromaEffect.type).toBe('chroma');
      expect(chromaEffect.color).toBe('#00ff00');
    });
  });

  describe('applyFilmEmulation', () => {
    it('applies halation and grain when enabled', () => {
      const mockCtx = createMockContext();
      const filmConfig: NonNullable<VideoFilters['filmConfig']> = {
        enabled: true,
        preset: 'custom',
        grainIntensity: 50,
        halationIntensity: 30,
        jitterIntensity: 20,
      };

      applyFilmEmulation(mockCtx, 1280, 720, filmConfig, 3.2, mockCtx.canvas);

      expect(mockCtx.save).toHaveBeenCalledTimes(1);
      expect(mockCtx.restore).toHaveBeenCalledTimes(1);
      expect(mockCtx.drawImage).toHaveBeenCalled();
      expect(drawGrain).toHaveBeenCalledWith(mockCtx, 1280, 720, 0.25, 3.2);
    });

    it('returns early when film emulation is disabled', () => {
      const mockCtx = createMockContext();
      const config: NonNullable<VideoFilters['filmConfig']> = {
        enabled: false,
        preset: 'custom',
        grainIntensity: 50,
        halationIntensity: 30,
        jitterIntensity: 20,
      };

      applyFilmEmulation(mockCtx, 640, 360, config, 0);

      expect(mockCtx.drawImage).not.toHaveBeenCalled();
      expect(drawGrain).not.toHaveBeenCalled();
    });
  });
});
