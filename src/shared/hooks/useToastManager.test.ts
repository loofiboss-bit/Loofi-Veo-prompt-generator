import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToastManager } from './useToastManager';

describe('useToastManager', () => {
  it('should start with empty toasts', () => {
    const { result } = renderHook(() => useToastManager());
    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast with default info type', () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.addToast('Hello world');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Hello world');
    expect(result.current.toasts[0].type).toBe('info');
  });

  it('should add a toast with explicit type', () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.addToast('Success!', 'success');
    });

    expect(result.current.toasts[0].type).toBe('success');
  });

  it('should add multiple toasts', () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.addToast('First');
      result.current.addToast('Second', 'error');
      result.current.addToast('Third', 'warning');
    });

    expect(result.current.toasts).toHaveLength(3);
  });

  it('should dismiss a specific toast', () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.addToast('Keep');
      result.current.addToast('Remove');
    });

    const idToRemove = result.current.toasts[1].id;

    act(() => {
      result.current.dismissToast(idToRemove);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Keep');
  });

  it('should clear all toasts', () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.addToast('Toast 1');
      result.current.addToast('Toast 2');
    });

    act(() => {
      result.current.clearToasts();
    });

    expect(result.current.toasts).toEqual([]);
  });

  it('should generate unique IDs for toasts', () => {
    const { result } = renderHook(() => useToastManager());

    act(() => {
      result.current.addToast('A');
      result.current.addToast('B');
    });

    const ids = result.current.toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
