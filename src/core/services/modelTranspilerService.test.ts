import { describe, it, expect } from 'vitest';
import { transpilePrompt, TARGET_MODEL_PROFILES } from './modelTranspilerService';
import type { UniversalPromptInput } from '@core/types/modelTranspiler';

const BASE_INPUT: UniversalPromptInput = {
  idea: 'A lonely astronaut walking across a neon-lit alien wasteland',
  mode: 'text-to-video',
  target: 'flow-veo',
  aspectRatio: '16:9',
  durationSeconds: 8,
  subject: 'An astronaut in a weather-beaten gold visor helmet',
  action: 'slowly trudges forward through glowing volcanic ash',
  environment: 'a desolate extraterrestrial plain beneath twin moons',
  lighting: 'dramatic volumetric cyan and magenta neon edge light',
  style: 'cinematic 70mm sci-fi thriller',
  spatialCamera: {
    lens: '35mm-cinematic',
    aperture: 'f/2.8',
    shutterAngle: '180deg',
    heightLevel: 'eye-level',
    trajectory: 'push-in',
    trajectorySpeed: 'smooth-cinematic',
    rollAngleDegrees: 0,
    spatialGrid: { focalDepthTarget: 'foreground' },
  },
};

describe('modelTranspilerService', () => {
  it('exposes profiles for all supported target engines', () => {
    expect(TARGET_MODEL_PROFILES['flow-veo']).toBeDefined();
    expect(TARGET_MODEL_PROFILES['kling']).toBeDefined();
    expect(TARGET_MODEL_PROFILES['runway-gen3']).toBeDefined();
    expect(TARGET_MODEL_PROFILES['sora']).toBeDefined();
    expect(TARGET_MODEL_PROFILES['luma-ray']).toBeDefined();
  });

  describe('Google Flow / Veo 3.1 Target', () => {
    it('generates natural photographic and spatial prompt directives', () => {
      const result = transpilePrompt(BASE_INPUT, 'flow-veo');
      expect(result.target).toBe('flow-veo');
      expect(result.targetDisplayName).toBe('Google Flow / Veo 3.1');
      expect(result.variants).toHaveLength(3);

      const [primary, cinematic, control] = result.variants;
      expect(primary.prompt).toContain('astronaut in a weather-beaten gold visor helmet');
      expect(primary.prompt).toContain('push-in');
      expect(cinematic.prompt).toContain('Rich cinematic staging');
      expect(control.prompt).toContain('One continuous unbroken shot for 8s');
      expect(primary.negativePrompt).toContain('unintended text');
      expect(primary.copyAll).toContain('Negative prompt:');
    });
  });

  describe('Kling 1.5 / 2.0 Target', () => {
    it('formats camera directives using structured bracket notation and Kling artifacts', () => {
      const result = transpilePrompt(BASE_INPUT, 'kling');
      expect(result.target).toBe('kling');
      expect(result.targetDisplayName).toBe('Kling 1.5 / 2.0');

      const primary = result.variants[0];
      expect(primary.prompt).toContain('[camera: push in]');
      expect(primary.negativePrompt).toContain('morphing');
      expect(primary.negativePrompt).toContain('flickering');
      expect(primary.negativePrompt).toContain('motion jitter');
      expect(primary.settingsChecklist.some((item) => item.includes('motion intensity'))).toBe(
        true,
      );
    });
  });

  describe('Runway Gen-3 / Gen-4 Target', () => {
    it('formats camera directives as motion vectors and includes Runway-specific checks', () => {
      const result = transpilePrompt(BASE_INPUT, 'runway-gen3');
      expect(result.target).toBe('runway-gen3');
      expect(result.targetDisplayName).toBe('Runway Gen-3 / Gen-4');

      const primary = result.variants[0];
      expect(primary.prompt).toContain('Cinematic push in motion');
      expect(primary.prompt).toContain('fluid tracking');
      expect(primary.negativePrompt).toContain('motion smearing');
      expect(primary.settingsChecklist.some((item) => item.includes('Camera Move + Subject'))).toBe(
        true,
      );
    });
  });

  describe('OpenAI Sora Target', () => {
    it('formats camera directives with photochemical realism and authentic optical depth', () => {
      const result = transpilePrompt(BASE_INPUT, 'sora');
      expect(result.target).toBe('sora');
      expect(result.targetDisplayName).toBe('OpenAI Sora');

      const primary = result.variants[0];
      expect(primary.prompt).toContain('Captured on 35mm motion picture camera');
      expect(primary.prompt).toContain('realistic physical camera weight');
      expect(primary.negativePrompt).toContain('temporal discontinuity');
      expect(primary.negativePrompt).toContain('unnatural physics');
    });
  });

  describe('Luma Dream Machine Ray-2 Target', () => {
    it('formats dynamic trajectory anchors and perspective continuity', () => {
      const result = transpilePrompt(BASE_INPUT, 'luma-ray');
      expect(result.target).toBe('luma-ray');
      expect(result.targetDisplayName).toBe('Luma Dream Machine Ray-2');

      const primary = result.variants[0];
      expect(primary.prompt).toContain('Smooth push in trajectory');
      expect(primary.prompt).toContain('consistent depth of field');
      expect(primary.negativePrompt).toContain('frame warping');
      expect(primary.negativePrompt).toContain('geometry distortion');
    });
  });

  describe('Image-to-Video Mode', () => {
    it('compiles motion-only directives without redescribing the static image', () => {
      const imageInput: UniversalPromptInput = {
        ...BASE_INPUT,
        mode: 'image-to-video',
      };

      const result = transpilePrompt(imageInput, 'kling');
      const primary = result.variants[0];

      expect(primary.prompt).toContain('[mode: animate]');
      expect(primary.prompt).toContain('Subject motion: slowly trudges forward');
      expect(result.recommendations.some((r) => r.includes('motion directives'))).toBe(true);
    });
  });

  describe('Custom Negative Prompts', () => {
    it('appends user negative tokens to model-specific defaults', () => {
      const customNegInput: UniversalPromptInput = {
        ...BASE_INPUT,
        negativePrompt: 'harsh strobing, green tint',
      };

      const result = transpilePrompt(customNegInput, 'sora');
      expect(result.variants[0].negativePrompt).toContain('harsh strobing, green tint');
      expect(result.variants[0].negativePrompt).toContain('temporal discontinuity');
    });
  });
});
