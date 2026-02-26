import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHelpPanel } from './useHelpPanel';

describe('useHelpPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with panel hidden', () => {
    const { result } = renderHook(() => useHelpPanel());

    expect(result.current.showHelpPanel).toBe(false);
    expect(result.current.helpPanelTopic).toBeUndefined();
    expect(result.current.helpPanelCategory).toBeUndefined();
  });

  it('should open help panel without topic', () => {
    const { result } = renderHook(() => useHelpPanel());

    act(() => result.current.openHelpPanel());

    expect(result.current.showHelpPanel).toBe(true);
    expect(result.current.helpPanelTopic).toBeUndefined();
    expect(result.current.helpPanelCategory).toBeUndefined();
  });

  it('should open help panel with topic and category', () => {
    const { result } = renderHook(() => useHelpPanel());

    act(() => result.current.openHelpPanel('getting-started', 'basics'));

    expect(result.current.showHelpPanel).toBe(true);
    expect(result.current.helpPanelTopic).toBe('getting-started');
    expect(result.current.helpPanelCategory).toBe('basics');
  });

  it('should close help panel immediately', () => {
    const { result } = renderHook(() => useHelpPanel());

    act(() => result.current.openHelpPanel('topic', 'category'));
    act(() => result.current.closeHelpPanel());

    expect(result.current.showHelpPanel).toBe(false);
  });

  it('should clear topic and category after 300ms animation delay', () => {
    const { result } = renderHook(() => useHelpPanel());

    act(() => result.current.openHelpPanel('topic', 'category'));
    act(() => result.current.closeHelpPanel());

    // Topic/category should still be set during animation
    expect(result.current.helpPanelTopic).toBe('topic');

    // After 300ms cleanup delay
    act(() => vi.advanceTimersByTime(300));

    expect(result.current.helpPanelTopic).toBeUndefined();
    expect(result.current.helpPanelCategory).toBeUndefined();
  });

  it('should handle open-close-open cycle', () => {
    const { result } = renderHook(() => useHelpPanel());

    act(() => result.current.openHelpPanel('first-topic'));
    act(() => result.current.closeHelpPanel());
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.openHelpPanel('second-topic', 'new-category'));

    expect(result.current.showHelpPanel).toBe(true);
    expect(result.current.helpPanelTopic).toBe('second-topic');
    expect(result.current.helpPanelCategory).toBe('new-category');
  });

  it('should overwrite topic when opening while already open', () => {
    const { result } = renderHook(() => useHelpPanel());

    act(() => result.current.openHelpPanel('first'));
    act(() => result.current.openHelpPanel('second'));

    expect(result.current.showHelpPanel).toBe(true);
    expect(result.current.helpPanelTopic).toBe('second');
  });
});
