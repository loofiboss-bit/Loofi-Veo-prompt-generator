import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewport } from './useViewport';

describe('useViewport', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const originalDevicePixelRatio = window.devicePixelRatio;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true });
    Object.defineProperty(window, 'devicePixelRatio', {
      value: originalDevicePixelRatio,
      writable: true,
    });
  });

  function setWindowSize(width: number, height: number, dpr = 1) {
    Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
    Object.defineProperty(window, 'devicePixelRatio', { value: dpr, writable: true });
  }

  it('should return initial viewport dimensions', () => {
    setWindowSize(1920, 1080);
    const { result } = renderHook(() => useViewport());

    expect(result.current.width).toBe(1920);
    expect(result.current.height).toBe(1080);
    expect(result.current.scaleFactor).toBe(1);
  });

  it('should classify desktop viewport', () => {
    setWindowSize(1920, 1080);
    const { result } = renderHook(() => useViewport());

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isCompact).toBe(false);
    expect(result.current.isWide).toBe(true);
  });

  it('should classify mobile viewport', () => {
    setWindowSize(375, 812);
    const { result } = renderHook(() => useViewport());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isCompact).toBe(true);
  });

  it('should classify tablet viewport', () => {
    setWindowSize(768, 1024);
    const { result } = renderHook(() => useViewport());

    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isCompact).toBe(true);
  });

  it('should classify compact viewport at 1100px', () => {
    setWindowSize(1100, 900);
    const { result } = renderHook(() => useViewport());

    expect(result.current.isCompact).toBe(true);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isWide).toBe(false);
  });

  it('should classify wide viewport at 1600px', () => {
    setWindowSize(1600, 900);
    const { result } = renderHook(() => useViewport());

    expect(result.current.isWide).toBe(true);
    expect(result.current.isCompact).toBe(false);
  });

  it('should update on window resize after debounce', () => {
    setWindowSize(1920, 1080);
    const { result } = renderHook(() => useViewport(100));

    setWindowSize(375, 812);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // Before debounce — still old values
    expect(result.current.width).toBe(1920);

    // After debounce
    act(() => vi.advanceTimersByTime(100));

    expect(result.current.width).toBe(375);
    expect(result.current.isMobile).toBe(true);
  });

  it('should debounce rapid resize events', () => {
    setWindowSize(1920, 1080);
    const { result } = renderHook(() => useViewport(150));

    // Fire multiple resizes rapidly
    setWindowSize(800, 600);
    act(() => window.dispatchEvent(new Event('resize')));
    act(() => vi.advanceTimersByTime(50));

    setWindowSize(1024, 768);
    act(() => window.dispatchEvent(new Event('resize')));
    act(() => vi.advanceTimersByTime(50));

    setWindowSize(640, 480);
    act(() => window.dispatchEvent(new Event('resize')));

    // Still at original
    expect(result.current.width).toBe(1920);

    // After full debounce
    act(() => vi.advanceTimersByTime(150));

    // Only the last size applies
    expect(result.current.width).toBe(640);
  });

  it('should include device pixel ratio', () => {
    setWindowSize(1920, 1080, 2);
    const { result } = renderHook(() => useViewport());

    expect(result.current.scaleFactor).toBe(2);
  });

  it('should clean up listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    setWindowSize(1920, 1080);
    const { unmount } = renderHook(() => useViewport());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });
});
