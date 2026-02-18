/**
 * Keyframe Service
 * Manages keyframe CRUD operations and interpolation for timeline clips.
 * Uses the existing Keyframe type from @core/types.
 */

import type { Keyframe, TimelineClip } from '@core/types';

/** Supported easing functions for keyframe interpolation. */
export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

/** Generates a short unique ID for keyframes. */
function generateKeyframeId(): string {
  return `kf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * KeyframeService — singleton for keyframe operations.
 *
 * Provides CRUD for keyframes on a clip, value interpolation at a given time,
 * and helpers for the InspectorPanel integration.
 */
class KeyframeService {
  private static instance: KeyframeService;

  static getInstance(): KeyframeService {
    if (!KeyframeService.instance) KeyframeService.instance = new KeyframeService();
    return KeyframeService.instance;
  }

  /** Check if a property has any keyframes on the given clip. */
  hasKeyframes(clip: TimelineClip, property: string): boolean {
    return (clip.keyframes ?? []).some((kf) => kf.property === property);
  }

  /** Get all keyframes for a specific property, sorted by time. */
  getKeyframesForProperty(clip: TimelineClip, property: string): Keyframe[] {
    return (clip.keyframes ?? [])
      .filter((kf) => kf.property === property)
      .sort((a, b) => a.time - b.time);
  }

  /**
   * Toggle a keyframe at the given time for a property.
   * If a keyframe exists within ±0.05s of the time, remove it.
   * Otherwise, add a new keyframe with the current value.
   */
  toggleKeyframe(
    clip: TimelineClip,
    property: string,
    time: number,
    currentValue: number,
    easing: EasingType = 'linear',
  ): Keyframe[] {
    const existing = [...(clip.keyframes ?? [])];
    const threshold = 0.05;
    const matchIndex = existing.findIndex(
      (kf) => kf.property === property && Math.abs(kf.time - time) < threshold,
    );

    if (matchIndex >= 0) {
      existing.splice(matchIndex, 1);
    } else {
      existing.push({
        id: generateKeyframeId(),
        time,
        value: currentValue,
        property,
        easing,
      });
    }

    return existing;
  }

  /** Add a keyframe. Returns the updated keyframes array. */
  addKeyframe(
    clip: TimelineClip,
    property: string,
    time: number,
    value: number,
    easing: EasingType = 'linear',
  ): Keyframe[] {
    return [
      ...(clip.keyframes ?? []),
      {
        id: generateKeyframeId(),
        time,
        value,
        property,
        easing,
      },
    ];
  }

  /** Remove a keyframe by ID. Returns the updated keyframes array. */
  removeKeyframe(clip: TimelineClip, keyframeId: string): Keyframe[] {
    return (clip.keyframes ?? []).filter((kf) => kf.id !== keyframeId);
  }

  /** Remove all keyframes for a property. Returns the updated keyframes array. */
  clearPropertyKeyframes(clip: TimelineClip, property: string): Keyframe[] {
    return (clip.keyframes ?? []).filter((kf) => kf.property !== property);
  }

  /**
   * Interpolate the value of a property at a given time.
   * Returns the interpolated value, or `fallback` if no keyframes exist.
   */
  interpolateValue(clip: TimelineClip, property: string, time: number, fallback: number): number {
    const keyframes = this.getKeyframesForProperty(clip, property);
    if (keyframes.length === 0) return fallback;
    if (keyframes.length === 1) return keyframes[0].value;

    // Before first keyframe
    if (time <= keyframes[0].time) return keyframes[0].value;

    // After last keyframe
    if (time >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;

    // Find surrounding keyframes
    for (let i = 0; i < keyframes.length - 1; i++) {
      const a = keyframes[i];
      const b = keyframes[i + 1];
      if (time >= a.time && time <= b.time) {
        const t = (time - a.time) / (b.time - a.time);
        return a.value + (b.value - a.value) * this.applyEasing(t, b.easing as EasingType);
      }
    }

    return fallback;
  }

  /** Apply easing curve to a normalized [0,1] value. */
  private applyEasing(t: number, easing: EasingType): number {
    switch (easing) {
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'linear':
      default:
        return t;
    }
  }

  /**
   * Resolve the current value of a property, considering keyframes.
   * Maps property keys to their static values from the clip.
   */
  resolvePropertyValue(clip: TimelineClip, property: string, time: number): number {
    const staticValue = this.getStaticValue(clip, property);
    if (!this.hasKeyframes(clip, property)) return staticValue;
    return this.interpolateValue(clip, property, time, staticValue);
  }

  /** Get the static (non-keyframed) value for a property key. */
  private getStaticValue(clip: TimelineClip, property: string): number {
    const transform = clip.transform ?? {
      scale: 100,
      position: { x: 0, y: 0 },
      rotation: 0,
      opacity: 100,
    };

    switch (property) {
      case 'transform.scale':
        return transform.scale;
      case 'transform.rotation':
        return transform.rotation;
      case 'transform.opacity':
        return transform.opacity;
      case 'transform.position.x':
        return transform.position.x;
      case 'transform.position.y':
        return transform.position.y;
      case 'volume':
        return (clip.volume ?? 1) * 100;
      default:
        return 0;
    }
  }
}

export const keyframeService = KeyframeService.getInstance();
