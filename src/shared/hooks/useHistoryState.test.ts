import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistoryState } from './useHistoryState';

describe('useHistoryState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should initialize with the given value', () => {
    const { result } = renderHook(() => useHistoryState('initial'));
    expect(result.current.state).toBe('initial');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should update state via setState', () => {
    const { result } = renderHook(() => useHistoryState('a'));

    act(() => result.current.setState('b'));

    expect(result.current.state).toBe('b');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should undo to previous state', () => {
    const { result } = renderHook(() => useHistoryState('a'));

    act(() => result.current.setState('b'));
    act(() => result.current.undo());

    expect(result.current.state).toBe('a');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo to next state', () => {
    const { result } = renderHook(() => useHistoryState('a'));

    act(() => result.current.setState('b'));
    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.state).toBe('b');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear future on new set after undo', () => {
    const { result } = renderHook(() => useHistoryState('a'));

    act(() => result.current.setState('b'));
    act(() => result.current.setState('c'));
    act(() => result.current.undo());
    act(() => result.current.setState('d'));

    expect(result.current.state).toBe('d');
    expect(result.current.canRedo).toBe(false);
  });

  it('should not change state when setting same value', () => {
    const { result } = renderHook(() => useHistoryState('a'));

    act(() => result.current.setState('a'));

    expect(result.current.canUndo).toBe(false);
  });

  it('should group rapid keystrokes within debounce window', () => {
    const { result } = renderHook(() => useHistoryState('', 500));

    // First set — pushes to history
    act(() => result.current.setState('a'));

    // Rapid follow-ups within 500ms — should not push new history entries
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.setState('ab');
    });
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.setState('abc');
    });

    expect(result.current.state).toBe('abc');

    // Undo should go back to '' (only one undo step despite 3 sets)
    act(() => result.current.undo());
    expect(result.current.state).toBe('');
  });

  it('should create separate undo steps for slow updates', () => {
    const { result } = renderHook(() => useHistoryState('', 500));

    act(() => result.current.setState('a'));
    act(() => {
      vi.advanceTimersByTime(600);
      result.current.setState('b');
    });

    // Two separate undo steps
    act(() => result.current.undo());
    expect(result.current.state).toBe('a');

    act(() => result.current.undo());
    expect(result.current.state).toBe('');
  });

  it('should reset to a new value and clear all history', () => {
    const { result } = renderHook(() => useHistoryState('a'));

    act(() => result.current.setState('b'));
    act(() => result.current.setState('c'));
    act(() => result.current.reset('fresh'));

    expect(result.current.state).toBe('fresh');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should not throw when undoing with empty history', () => {
    const { result } = renderHook(() => useHistoryState('a'));

    act(() => result.current.undo());
    expect(result.current.state).toBe('a');
  });

  it('should not throw when redoing with empty future', () => {
    const { result } = renderHook(() => useHistoryState('a'));

    act(() => result.current.redo());
    expect(result.current.state).toBe('a');
  });

  it('should support multiple undo/redo cycles', () => {
    const { result } = renderHook(() => useHistoryState(0));

    act(() => result.current.setState(1));
    act(() => {
      vi.advanceTimersByTime(600);
      result.current.setState(2);
    });
    act(() => {
      vi.advanceTimersByTime(600);
      result.current.setState(3);
    });

    act(() => result.current.undo());
    expect(result.current.state).toBe(2);

    act(() => result.current.redo());
    expect(result.current.state).toBe(3);

    act(() => result.current.undo());
    act(() => result.current.undo());
    expect(result.current.state).toBe(1);
  });

  it('should work with complex object types', () => {
    const initial = { name: 'Alice', age: 30 };
    const { result } = renderHook(() => useHistoryState(initial));

    const updated = { name: 'Bob', age: 25 };
    act(() => result.current.setState(updated));

    expect(result.current.state).toEqual(updated);

    act(() => result.current.undo());
    expect(result.current.state).toEqual(initial);
  });
});
