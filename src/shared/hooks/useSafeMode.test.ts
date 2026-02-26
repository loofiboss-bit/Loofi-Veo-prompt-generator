import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockGetElectron = vi.fn();
vi.mock('@core/utils/electronBridge', () => ({
  getElectron: () => mockGetElectron(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { useSafeMode } from './useSafeMode';

describe('useSafeMode', () => {
  let localStorageData: Record<string, string>;
  const reloadMock = vi.fn();

  beforeEach(() => {
    localStorageData = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => localStorageData[key] ?? null,
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      localStorageData[key] = value;
    });

    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    mockGetElectron.mockReturnValue(null);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not be in safe mode by default', () => {
    const { result } = renderHook(() => useSafeMode());

    expect(result.current.isSafeMode).toBe(false);
    expect(result.current.safeModeStatus).toBeNull();
  });

  it('should activate safe mode when crash count >= 3 within 60s', () => {
    localStorageData['veo-crash-count'] = '3';
    localStorageData['veo-last-crash'] = String(Date.now() - 10000);

    const { result } = renderHook(() => useSafeMode());

    expect(result.current.isSafeMode).toBe(true);
    expect(result.current.safeModeStatus).toEqual({
      enabled: true,
      reason: 'crash-loop',
      crashCount: 3,
    });
  });

  it('should reset crash count if last crash was > 60s ago', () => {
    localStorageData['veo-crash-count'] = '5';
    localStorageData['veo-last-crash'] = String(Date.now() - 120000);

    const { result } = renderHook(() => useSafeMode());

    expect(result.current.isSafeMode).toBe(false);
    expect(localStorageData['veo-crash-count']).toBe('0');
  });

  it('should not activate safe mode with fewer than 3 crashes', () => {
    localStorageData['veo-crash-count'] = '2';
    localStorageData['veo-last-crash'] = String(Date.now() - 5000);

    const { result } = renderHook(() => useSafeMode());

    expect(result.current.isSafeMode).toBe(false);
  });

  it('should handle missing localStorage gracefully', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Private browsing');
    });

    const { result } = renderHook(() => useSafeMode());

    expect(result.current.isSafeMode).toBe(false);
  });

  it('should reset counter and reload on exit safe mode', async () => {
    localStorageData['veo-crash-count'] = '5';
    localStorageData['veo-last-crash'] = String(Date.now() - 10000);

    const { result } = renderHook(() => useSafeMode());

    await act(async () => {
      result.current.handleExitSafeMode();
    });

    expect(localStorageData['veo-crash-count']).toBe('0');
    expect(reloadMock).toHaveBeenCalled();
  });

  it('should use Electron safe mode status when available', async () => {
    const electronStatus = { enabled: true, reason: 'manual' as const, crashCount: 0 };
    const mockResetSafeMode = vi.fn();
    mockGetElectron.mockReturnValue({
      getSafeModeStatus: vi.fn().mockResolvedValue(electronStatus),
      resetSafeMode: mockResetSafeMode,
    });

    const { result } = renderHook(() => useSafeMode());

    // Wait for async Electron status to load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.safeModeStatus).toEqual(electronStatus);
  });

  it('should call Electron resetSafeMode on exit when available', async () => {
    const mockResetSafeMode = vi.fn().mockResolvedValue(undefined);
    mockGetElectron.mockReturnValue({
      getSafeModeStatus: vi.fn().mockResolvedValue(null),
      resetSafeMode: mockResetSafeMode,
    });

    const { result } = renderHook(() => useSafeMode());

    await act(async () => {
      result.current.handleExitSafeMode();
    });

    expect(mockResetSafeMode).toHaveBeenCalled();
  });

  it('should handle Electron getSafeModeStatus error gracefully', async () => {
    mockGetElectron.mockReturnValue({
      getSafeModeStatus: vi.fn().mockRejectedValue(new Error('IPC failed')),
    });

    const { result } = renderHook(() => useSafeMode());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.safeModeStatus).toBeNull();
  });
});
