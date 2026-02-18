/**
 * KeyframeService Unit Tests
 * Comprehensive tests for keyframe CRUD operations and interpolation.
 */

import { describe, it, expect } from 'vitest';
import { keyframeService } from './keyframeService';
import type { Keyframe, TimelineClip } from '@core/types';

// Helper function to create minimal TimelineClip for tests
const makeClip = (keyframes: Keyframe[] = []): TimelineClip => ({
  id: 'clip-1',
  resourceId: 'res-1',
  trackId: 'track-1',
  startTime: 0,
  duration: 10,
  offset: 0,
  type: 'video',
  label: 'Test Clip',
  keyframes,
  transform: { scale: 100, position: { x: 0, y: 0 }, rotation: 0, opacity: 100 },
});

// Helper function to create a keyframe
const makeKeyframe = (
  id: string,
  time: number,
  value: number,
  property: string,
  easing: string = 'linear',
): Keyframe => ({
  id,
  time,
  value,
  property,
  easing,
});

describe('KeyframeService', () => {
  describe('hasKeyframes', () => {
    it('should return false when clip has no keyframes', () => {
      const clip = makeClip([]);
      expect(keyframeService.hasKeyframes(clip, 'transform.scale')).toBe(false);
    });

    it('should return false when clip has keyframes for different property', () => {
      const clip = makeClip([makeKeyframe('kf-1', 0, 100, 'transform.rotation')]);
      expect(keyframeService.hasKeyframes(clip, 'transform.scale')).toBe(false);
    });

    it('should return true when clip has keyframes for specified property', () => {
      const clip = makeClip([makeKeyframe('kf-1', 0, 100, 'transform.scale')]);
      expect(keyframeService.hasKeyframes(clip, 'transform.scale')).toBe(true);
    });

    it('should return true when clip has multiple keyframes including specified property', () => {
      const clip = makeClip([
        makeKeyframe('kf-1', 0, 100, 'transform.scale'),
        makeKeyframe('kf-2', 1, 50, 'transform.rotation'),
        makeKeyframe('kf-3', 2, 150, 'transform.scale'),
      ]);
      expect(keyframeService.hasKeyframes(clip, 'transform.scale')).toBe(true);
    });

    it('should handle undefined keyframes array', () => {
      const clip = makeClip();
      clip.keyframes = undefined;
      expect(keyframeService.hasKeyframes(clip, 'transform.scale')).toBe(false);
    });
  });

  describe('getKeyframesForProperty', () => {
    it('should return empty array when clip has no keyframes', () => {
      const clip = makeClip([]);
      const result = keyframeService.getKeyframesForProperty(clip, 'transform.scale');
      expect(result).toEqual([]);
    });

    it('should return empty array when no keyframes match property', () => {
      const clip = makeClip([makeKeyframe('kf-1', 0, 100, 'transform.rotation')]);
      const result = keyframeService.getKeyframesForProperty(clip, 'transform.scale');
      expect(result).toEqual([]);
    });

    it('should return single keyframe for property', () => {
      const kf = makeKeyframe('kf-1', 1, 100, 'transform.scale');
      const clip = makeClip([kf]);
      const result = keyframeService.getKeyframesForProperty(clip, 'transform.scale');
      expect(result).toEqual([kf]);
    });

    it('should filter and return only keyframes for specified property', () => {
      const kf1 = makeKeyframe('kf-1', 0, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 1, 50, 'transform.rotation');
      const kf3 = makeKeyframe('kf-3', 2, 150, 'transform.scale');
      const clip = makeClip([kf1, kf2, kf3]);
      const result = keyframeService.getKeyframesForProperty(clip, 'transform.scale');
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(kf1);
      expect(result).toContainEqual(kf3);
    });

    it('should return keyframes sorted by time ascending', () => {
      const kf1 = makeKeyframe('kf-1', 5, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 1, 50, 'transform.scale');
      const kf3 = makeKeyframe('kf-3', 3, 75, 'transform.scale');
      const clip = makeClip([kf1, kf2, kf3]);
      const result = keyframeService.getKeyframesForProperty(clip, 'transform.scale');
      expect(result).toEqual([kf2, kf3, kf1]);
    });

    it('should handle undefined keyframes array', () => {
      const clip = makeClip();
      clip.keyframes = undefined;
      const result = keyframeService.getKeyframesForProperty(clip, 'transform.scale');
      expect(result).toEqual([]);
    });
  });

  describe('toggleKeyframe', () => {
    it('should add keyframe when none exists at time', () => {
      const clip = makeClip([]);
      const result = keyframeService.toggleKeyframe(clip, 'transform.scale', 2, 120, 'linear');

      expect(result).toHaveLength(1);
      expect(result[0].time).toBe(2);
      expect(result[0].value).toBe(120);
      expect(result[0].property).toBe('transform.scale');
      expect(result[0].easing).toBe('linear');
      expect(result[0].id).toMatch(/^kf-/);
    });

    it('should add keyframe with custom easing', () => {
      const clip = makeClip([]);
      const result = keyframeService.toggleKeyframe(clip, 'transform.scale', 2, 120, 'ease-in-out');

      expect(result).toHaveLength(1);
      expect(result[0].easing).toBe('ease-in-out');
    });

    it('should default to linear easing when not specified', () => {
      const clip = makeClip([]);
      const result = keyframeService.toggleKeyframe(clip, 'transform.scale', 2, 120);

      expect(result[0].easing).toBe('linear');
    });

    it('should remove keyframe when one exists at exact same time', () => {
      const kf = makeKeyframe('kf-1', 2, 100, 'transform.scale');
      const clip = makeClip([kf]);
      const result = keyframeService.toggleKeyframe(clip, 'transform.scale', 2, 120);

      expect(result).toHaveLength(0);
    });

    it('should remove keyframe when within threshold (0.05s below)', () => {
      const kf = makeKeyframe('kf-1', 2, 100, 'transform.scale');
      const clip = makeClip([kf]);
      const result = keyframeService.toggleKeyframe(clip, 'transform.scale', 1.96, 120);

      expect(result).toHaveLength(0);
    });

    it('should remove keyframe when within threshold (0.05s above)', () => {
      const kf = makeKeyframe('kf-1', 2, 100, 'transform.scale');
      const clip = makeClip([kf]);
      const result = keyframeService.toggleKeyframe(clip, 'transform.scale', 2.04, 120);

      expect(result).toHaveLength(0);
    });

    it('should add keyframe when outside threshold (0.06s away)', () => {
      const kf = makeKeyframe('kf-1', 2, 100, 'transform.scale');
      const clip = makeClip([kf]);
      const result = keyframeService.toggleKeyframe(clip, 'transform.scale', 2.06, 120);

      expect(result).toHaveLength(2);
    });

    it('should only remove keyframe matching both property and time', () => {
      const kf1 = makeKeyframe('kf-1', 2, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 2, 50, 'transform.rotation');
      const clip = makeClip([kf1, kf2]);
      const result = keyframeService.toggleKeyframe(clip, 'transform.scale', 2, 120);

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('transform.rotation');
    });

    it('should preserve existing keyframes when adding new one', () => {
      const kf1 = makeKeyframe('kf-1', 1, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 3, 150, 'transform.scale');
      const clip = makeClip([kf1, kf2]);
      const result = keyframeService.toggleKeyframe(clip, 'transform.scale', 2, 125);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual(kf1);
      expect(result).toContainEqual(kf2);
    });

    it('should handle undefined keyframes array', () => {
      const clip = makeClip();
      clip.keyframes = undefined;
      const result = keyframeService.toggleKeyframe(clip, 'transform.scale', 2, 120);

      expect(result).toHaveLength(1);
    });
  });

  describe('addKeyframe', () => {
    it('should add keyframe to empty clip', () => {
      const clip = makeClip([]);
      const result = keyframeService.addKeyframe(clip, 'transform.scale', 2, 120, 'linear');

      expect(result).toHaveLength(1);
      expect(result[0].time).toBe(2);
      expect(result[0].value).toBe(120);
      expect(result[0].property).toBe('transform.scale');
      expect(result[0].easing).toBe('linear');
      expect(result[0].id).toMatch(/^kf-/);
    });

    it('should add keyframe with ease-in easing', () => {
      const clip = makeClip([]);
      const result = keyframeService.addKeyframe(clip, 'transform.scale', 2, 120, 'ease-in');

      expect(result[0].easing).toBe('ease-in');
    });

    it('should add keyframe with ease-out easing', () => {
      const clip = makeClip([]);
      const result = keyframeService.addKeyframe(clip, 'transform.scale', 2, 120, 'ease-out');

      expect(result[0].easing).toBe('ease-out');
    });

    it('should add keyframe with ease-in-out easing', () => {
      const clip = makeClip([]);
      const result = keyframeService.addKeyframe(clip, 'transform.scale', 2, 120, 'ease-in-out');

      expect(result[0].easing).toBe('ease-in-out');
    });

    it('should default to linear easing when not specified', () => {
      const clip = makeClip([]);
      const result = keyframeService.addKeyframe(clip, 'transform.scale', 2, 120);

      expect(result[0].easing).toBe('linear');
    });

    it('should preserve existing keyframes', () => {
      const kf1 = makeKeyframe('kf-1', 1, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 3, 150, 'transform.rotation');
      const clip = makeClip([kf1, kf2]);
      const result = keyframeService.addKeyframe(clip, 'transform.opacity', 2, 80);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual(kf1);
      expect(result).toContainEqual(kf2);
    });

    it('should allow adding multiple keyframes at same time for same property', () => {
      const clip = makeClip([]);
      const result1 = keyframeService.addKeyframe(clip, 'transform.scale', 2, 100);
      const updatedClip = { ...clip, keyframes: result1 };
      const result2 = keyframeService.addKeyframe(updatedClip, 'transform.scale', 2, 120);

      expect(result2).toHaveLength(2);
      expect(
        result2.filter((kf) => kf.time === 2 && kf.property === 'transform.scale'),
      ).toHaveLength(2);
    });

    it('should generate unique IDs for each keyframe', () => {
      const clip = makeClip([]);
      const result1 = keyframeService.addKeyframe(clip, 'transform.scale', 1, 100);
      const updatedClip = { ...clip, keyframes: result1 };
      const result2 = keyframeService.addKeyframe(updatedClip, 'transform.scale', 2, 120);

      expect(result2[0].id).not.toBe(result2[1].id);
    });

    it('should handle undefined keyframes array', () => {
      const clip = makeClip();
      clip.keyframes = undefined;
      const result = keyframeService.addKeyframe(clip, 'transform.scale', 2, 120);

      expect(result).toHaveLength(1);
    });
  });

  describe('removeKeyframe', () => {
    it('should remove keyframe by ID', () => {
      const kf1 = makeKeyframe('kf-1', 1, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 2, 120, 'transform.scale');
      const clip = makeClip([kf1, kf2]);
      const result = keyframeService.removeKeyframe(clip, 'kf-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('kf-2');
    });

    it('should preserve other keyframes when removing one', () => {
      const kf1 = makeKeyframe('kf-1', 1, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 2, 120, 'transform.rotation');
      const kf3 = makeKeyframe('kf-3', 3, 80, 'transform.opacity');
      const clip = makeClip([kf1, kf2, kf3]);
      const result = keyframeService.removeKeyframe(clip, 'kf-2');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(kf1);
      expect(result).toContainEqual(kf3);
    });

    it('should return all keyframes if ID not found', () => {
      const kf1 = makeKeyframe('kf-1', 1, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 2, 120, 'transform.scale');
      const clip = makeClip([kf1, kf2]);
      const result = keyframeService.removeKeyframe(clip, 'kf-999');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(kf1);
      expect(result).toContainEqual(kf2);
    });

    it('should handle empty keyframes array', () => {
      const clip = makeClip([]);
      const result = keyframeService.removeKeyframe(clip, 'kf-1');

      expect(result).toEqual([]);
    });

    it('should handle undefined keyframes array', () => {
      const clip = makeClip();
      clip.keyframes = undefined;
      const result = keyframeService.removeKeyframe(clip, 'kf-1');

      expect(result).toEqual([]);
    });
  });

  describe('clearPropertyKeyframes', () => {
    it('should remove all keyframes for specified property', () => {
      const kf1 = makeKeyframe('kf-1', 1, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 2, 120, 'transform.scale');
      const kf3 = makeKeyframe('kf-3', 3, 50, 'transform.rotation');
      const clip = makeClip([kf1, kf2, kf3]);
      const result = keyframeService.clearPropertyKeyframes(clip, 'transform.scale');

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('transform.rotation');
    });

    it('should preserve keyframes for other properties', () => {
      const kf1 = makeKeyframe('kf-1', 1, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 2, 50, 'transform.rotation');
      const kf3 = makeKeyframe('kf-3', 3, 80, 'transform.opacity');
      const clip = makeClip([kf1, kf2, kf3]);
      const result = keyframeService.clearPropertyKeyframes(clip, 'transform.scale');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(kf2);
      expect(result).toContainEqual(kf3);
    });

    it('should return all keyframes if property not found', () => {
      const kf1 = makeKeyframe('kf-1', 1, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 2, 50, 'transform.rotation');
      const clip = makeClip([kf1, kf2]);
      const result = keyframeService.clearPropertyKeyframes(clip, 'transform.opacity');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(kf1);
      expect(result).toContainEqual(kf2);
    });

    it('should return empty array when all keyframes removed', () => {
      const kf1 = makeKeyframe('kf-1', 1, 100, 'transform.scale');
      const kf2 = makeKeyframe('kf-2', 2, 120, 'transform.scale');
      const clip = makeClip([kf1, kf2]);
      const result = keyframeService.clearPropertyKeyframes(clip, 'transform.scale');

      expect(result).toEqual([]);
    });

    it('should handle empty keyframes array', () => {
      const clip = makeClip([]);
      const result = keyframeService.clearPropertyKeyframes(clip, 'transform.scale');

      expect(result).toEqual([]);
    });

    it('should handle undefined keyframes array', () => {
      const clip = makeClip();
      clip.keyframes = undefined;
      const result = keyframeService.clearPropertyKeyframes(clip, 'transform.scale');

      expect(result).toEqual([]);
    });
  });

  describe('interpolateValue', () => {
    describe('edge cases', () => {
      it('should return fallback when no keyframes exist', () => {
        const clip = makeClip([]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 5, 100);

        expect(result).toBe(100);
      });

      it('should return single keyframe value when only one keyframe exists', () => {
        const kf = makeKeyframe('kf-1', 5, 150, 'transform.scale');
        const clip = makeClip([kf]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 7, 100);

        expect(result).toBe(150);
      });

      it('should return first keyframe value when time is before first keyframe', () => {
        const kf1 = makeKeyframe('kf-1', 2, 100, 'transform.scale');
        const kf2 = makeKeyframe('kf-2', 5, 200, 'transform.scale');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 1, 50);

        expect(result).toBe(100);
      });

      it('should return first keyframe value when time equals first keyframe', () => {
        const kf1 = makeKeyframe('kf-1', 2, 100, 'transform.scale');
        const kf2 = makeKeyframe('kf-2', 5, 200, 'transform.scale');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 2, 50);

        expect(result).toBe(100);
      });

      it('should return last keyframe value when time is after last keyframe', () => {
        const kf1 = makeKeyframe('kf-1', 2, 100, 'transform.scale');
        const kf2 = makeKeyframe('kf-2', 5, 200, 'transform.scale');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 10, 50);

        expect(result).toBe(200);
      });

      it('should return last keyframe value when time equals last keyframe', () => {
        const kf1 = makeKeyframe('kf-1', 2, 100, 'transform.scale');
        const kf2 = makeKeyframe('kf-2', 5, 200, 'transform.scale');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 5, 50);

        expect(result).toBe(200);
      });
    });

    describe('linear interpolation', () => {
      it('should interpolate linearly at midpoint', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'linear');
        const kf2 = makeKeyframe('kf-2', 10, 100, 'transform.scale', 'linear');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 5, 50);

        expect(result).toBe(50);
      });

      it('should interpolate linearly at quarter point', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'linear');
        const kf2 = makeKeyframe('kf-2', 10, 100, 'transform.scale', 'linear');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 2.5, 50);

        expect(result).toBe(25);
      });

      it('should interpolate linearly with negative values', () => {
        const kf1 = makeKeyframe('kf-1', 0, -50, 'transform.scale', 'linear');
        const kf2 = makeKeyframe('kf-2', 10, 50, 'transform.scale', 'linear');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 5, 0);

        expect(result).toBe(0);
      });

      it('should interpolate linearly between multiple keyframes (first segment)', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'linear');
        const kf2 = makeKeyframe('kf-2', 5, 100, 'transform.scale', 'linear');
        const kf3 = makeKeyframe('kf-3', 10, 50, 'transform.scale', 'linear');
        const clip = makeClip([kf1, kf2, kf3]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 2.5, 0);

        expect(result).toBe(50);
      });

      it('should interpolate linearly between multiple keyframes (second segment)', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'linear');
        const kf2 = makeKeyframe('kf-2', 5, 100, 'transform.scale', 'linear');
        const kf3 = makeKeyframe('kf-3', 10, 50, 'transform.scale', 'linear');
        const clip = makeClip([kf1, kf2, kf3]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 7.5, 0);

        expect(result).toBe(75);
      });
    });

    describe('ease-in interpolation', () => {
      it('should apply ease-in curve', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'ease-in');
        const kf2 = makeKeyframe('kf-2', 10, 100, 'transform.scale', 'ease-in');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 5, 0);

        // At t=0.5, ease-in (t*t) = 0.25, so value = 0 + 100 * 0.25 = 25
        expect(result).toBe(25);
      });

      it('should apply ease-in curve at quarter point', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'ease-in');
        const kf2 = makeKeyframe('kf-2', 10, 100, 'transform.scale', 'ease-in');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 2.5, 0);

        // At t=0.25, ease-in (t*t) = 0.0625, so value = 0 + 100 * 0.0625 = 6.25
        expect(result).toBe(6.25);
      });
    });

    describe('ease-out interpolation', () => {
      it('should apply ease-out curve', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'ease-out');
        const kf2 = makeKeyframe('kf-2', 10, 100, 'transform.scale', 'ease-out');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 5, 0);

        // At t=0.5, ease-out (t*(2-t)) = 0.5 * 1.5 = 0.75, so value = 0 + 100 * 0.75 = 75
        expect(result).toBe(75);
      });

      it('should apply ease-out curve at quarter point', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'ease-out');
        const kf2 = makeKeyframe('kf-2', 10, 100, 'transform.scale', 'ease-out');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 2.5, 0);

        // At t=0.25, ease-out (t*(2-t)) = 0.25 * 1.75 = 0.4375, so value = 0 + 100 * 0.4375 = 43.75
        expect(result).toBe(43.75);
      });
    });

    describe('ease-in-out interpolation', () => {
      it('should apply ease-in-out curve in first half', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'ease-in-out');
        const kf2 = makeKeyframe('kf-2', 10, 100, 'transform.scale', 'ease-in-out');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 2.5, 0);

        // At t=0.25, ease-in-out (2*t*t) = 2 * 0.25 * 0.25 = 0.125, so value = 0 + 100 * 0.125 = 12.5
        expect(result).toBe(12.5);
      });

      it('should apply ease-in-out curve in second half', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'ease-in-out');
        const kf2 = makeKeyframe('kf-2', 10, 100, 'transform.scale', 'ease-in-out');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 7.5, 0);

        // At t=0.75, ease-in-out (-1 + (4-2*t)*t) = -1 + 2.5 * 0.75 = 0.875, so value = 0 + 100 * 0.875 = 87.5
        expect(result).toBe(87.5);
      });

      it('should apply ease-in-out curve at midpoint', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'ease-in-out');
        const kf2 = makeKeyframe('kf-2', 10, 100, 'transform.scale', 'ease-in-out');
        const clip = makeClip([kf1, kf2]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 5, 0);

        // At t=0.5, ease-in-out (2*t*t) = 2 * 0.5 * 0.5 = 0.5, so value = 0 + 100 * 0.5 = 50
        expect(result).toBe(50);
      });
    });

    describe('property filtering', () => {
      it('should only use keyframes for specified property', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'linear');
        const kf2 = makeKeyframe('kf-2', 5, 50, 'transform.rotation', 'linear');
        const kf3 = makeKeyframe('kf-3', 10, 100, 'transform.scale', 'linear');
        const clip = makeClip([kf1, kf2, kf3]);
        const result = keyframeService.interpolateValue(clip, 'transform.scale', 5, 0);

        // Should interpolate between kf1 (0,0) and kf3 (10,100), ignoring kf2 (different property)
        expect(result).toBe(50);
      });
    });
  });

  describe('resolvePropertyValue', () => {
    describe('static values (no keyframes)', () => {
      it('should return static scale value', () => {
        const clip = makeClip([]);
        clip.transform = { scale: 150, position: { x: 0, y: 0 }, rotation: 0, opacity: 100 };
        const result = keyframeService.resolvePropertyValue(clip, 'transform.scale', 5);

        expect(result).toBe(150);
      });

      it('should return static rotation value', () => {
        const clip = makeClip([]);
        clip.transform = { scale: 100, position: { x: 0, y: 0 }, rotation: 45, opacity: 100 };
        const result = keyframeService.resolvePropertyValue(clip, 'transform.rotation', 5);

        expect(result).toBe(45);
      });

      it('should return static opacity value', () => {
        const clip = makeClip([]);
        clip.transform = { scale: 100, position: { x: 0, y: 0 }, rotation: 0, opacity: 75 };
        const result = keyframeService.resolvePropertyValue(clip, 'transform.opacity', 5);

        expect(result).toBe(75);
      });

      it('should return static position.x value', () => {
        const clip = makeClip([]);
        clip.transform = { scale: 100, position: { x: 50, y: 0 }, rotation: 0, opacity: 100 };
        const result = keyframeService.resolvePropertyValue(clip, 'transform.position.x', 5);

        expect(result).toBe(50);
      });

      it('should return static position.y value', () => {
        const clip = makeClip([]);
        clip.transform = { scale: 100, position: { x: 0, y: -25 }, rotation: 0, opacity: 100 };
        const result = keyframeService.resolvePropertyValue(clip, 'transform.position.y', 5);

        expect(result).toBe(-25);
      });

      it('should return volume value multiplied by 100', () => {
        const clip = makeClip([]);
        clip.volume = 0.75;
        const result = keyframeService.resolvePropertyValue(clip, 'volume', 5);

        expect(result).toBe(75);
      });

      it('should return 100 for volume when not specified', () => {
        const clip = makeClip([]);
        const result = keyframeService.resolvePropertyValue(clip, 'volume', 5);

        expect(result).toBe(100);
      });

      it('should return 0 for unknown property', () => {
        const clip = makeClip([]);
        const result = keyframeService.resolvePropertyValue(clip, 'unknown.property', 5);

        expect(result).toBe(0);
      });

      it('should handle missing transform object', () => {
        const clip = makeClip([]);
        clip.transform = undefined;
        const result = keyframeService.resolvePropertyValue(clip, 'transform.scale', 5);

        expect(result).toBe(100); // Default scale
      });
    });

    describe('interpolated values (with keyframes)', () => {
      it('should return interpolated value when keyframes exist', () => {
        const kf1 = makeKeyframe('kf-1', 0, 50, 'transform.scale', 'linear');
        const kf2 = makeKeyframe('kf-2', 10, 150, 'transform.scale', 'linear');
        const clip = makeClip([kf1, kf2]);
        clip.transform = { scale: 100, position: { x: 0, y: 0 }, rotation: 0, opacity: 100 };
        const result = keyframeService.resolvePropertyValue(clip, 'transform.scale', 5);

        expect(result).toBe(100); // Midpoint between 50 and 150
      });

      it('should return static value for property without keyframes', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.scale', 'linear');
        const kf2 = makeKeyframe('kf-2', 10, 100, 'transform.scale', 'linear');
        const clip = makeClip([kf1, kf2]);
        clip.transform = { scale: 100, position: { x: 0, y: 0 }, rotation: 45, opacity: 100 };
        const result = keyframeService.resolvePropertyValue(clip, 'transform.rotation', 5);

        expect(result).toBe(45); // Static value, no keyframes for rotation
      });

      it('should use static value as fallback in interpolation', () => {
        const clip = makeClip([]);
        clip.transform = { scale: 80, position: { x: 0, y: 0 }, rotation: 0, opacity: 100 };
        // No keyframes, but interpolateValue uses static value as fallback
        const result = keyframeService.resolvePropertyValue(clip, 'transform.scale', 5);

        expect(result).toBe(80);
      });

      it('should interpolate with ease-in curve', () => {
        const kf1 = makeKeyframe('kf-1', 0, 0, 'transform.opacity', 'ease-in');
        const kf2 = makeKeyframe('kf-2', 10, 100, 'transform.opacity', 'ease-in');
        const clip = makeClip([kf1, kf2]);
        clip.transform = { scale: 100, position: { x: 0, y: 0 }, rotation: 0, opacity: 50 };
        const result = keyframeService.resolvePropertyValue(clip, 'transform.opacity', 5);

        expect(result).toBe(25); // ease-in at t=0.5
      });
    });
  });
});
