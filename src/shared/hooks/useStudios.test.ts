import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudios, type StudioType } from './useStudios';

describe('useStudios', () => {
  it('should start with no active studio', () => {
    const { result } = renderHook(() => useStudios());
    expect(result.current.activeStudio).toBeNull();
  });

  it('should open a studio', () => {
    const { result } = renderHook(() => useStudios());

    act(() => result.current.open('image'));

    expect(result.current.activeStudio).toBe('image');
    expect(result.current.isImageOpen).toBe(true);
  });

  it('should close the active studio', () => {
    const { result } = renderHook(() => useStudios());

    act(() => result.current.open('suno'));
    act(() => result.current.close());

    expect(result.current.activeStudio).toBeNull();
    expect(result.current.isSunoOpen).toBe(false);
  });

  it('should toggle studio on', () => {
    const { result } = renderHook(() => useStudios());

    act(() => result.current.toggle('video'));

    expect(result.current.activeStudio).toBe('video');
    expect(result.current.isVideoOpen).toBe(true);
  });

  it('should toggle same studio off', () => {
    const { result } = renderHook(() => useStudios());

    act(() => result.current.toggle('video'));
    act(() => result.current.toggle('video'));

    expect(result.current.activeStudio).toBeNull();
    expect(result.current.isVideoOpen).toBe(false);
  });

  it('should toggle to a different studio', () => {
    const { result } = renderHook(() => useStudios());

    act(() => result.current.toggle('image'));
    act(() => result.current.toggle('suno'));

    expect(result.current.activeStudio).toBe('suno');
    expect(result.current.isImageOpen).toBe(false);
    expect(result.current.isSunoOpen).toBe(true);
  });

  it.each([
    ['image', 'isImageOpen'],
    ['suno', 'isSunoOpen'],
    ['video', 'isVideoOpen'],
    ['analysis', 'isAnalysisOpen'],
    ['pronunciation', 'isPronunciationOpen'],
    ['compare', 'isCompareOpen'],
    ['spatial', 'isSpatialOpen'],
    ['story', 'isStoryOpen'],
    ['script', 'isScriptOpen'],
  ] as [StudioType, string][])(
    'should set %s boolean flag when opening %s',
    (studioType, flagKey) => {
      const { result } = renderHook(() => useStudios());

      act(() => result.current.open(studioType));

      expect(result.current[flagKey as keyof typeof result.current]).toBe(true);
    },
  );

  it('should only have one boolean flag true at a time', () => {
    const { result } = renderHook(() => useStudios());

    act(() => result.current.open('image'));

    const flags = [
      result.current.isSunoOpen,
      result.current.isVideoOpen,
      result.current.isAnalysisOpen,
      result.current.isPronunciationOpen,
      result.current.isCompareOpen,
      result.current.isSpatialOpen,
      result.current.isStoryOpen,
      result.current.isScriptOpen,
    ];

    expect(result.current.isImageOpen).toBe(true);
    expect(flags.every((f) => f === false)).toBe(true);
  });
});
