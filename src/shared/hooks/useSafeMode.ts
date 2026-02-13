/**
 * useSafeMode Hook
 *
 * Encapsulates safe mode detection and crash-loop prevention logic.
 * Extracted from App.tsx to reduce component complexity.
 */

import { useState, useEffect, useCallback } from 'react';
import { getElectron } from '@core/utils/electronBridge';

export interface SafeModeStatus {
  enabled: boolean;
  reason: 'manual' | 'crash-loop' | 'none';
  crashCount: number;
}

export interface SafeModeState {
  isSafeMode: boolean;
  safeModeStatus: SafeModeStatus | null;
  handleExitSafeMode: () => void;
}

export function useSafeMode(): SafeModeState {
  const [isSafeMode, setIsSafeMode] = useState(false);
  const [safeModeStatus, setSafeModeStatus] = useState<SafeModeStatus | null>(null);

  // Local crash-count detection
  useEffect(() => {
    const crashCount = parseInt(localStorage.getItem('veo-crash-count') || '0', 10);
    const lastCrash = parseInt(localStorage.getItem('veo-last-crash') || '0', 10);
    const now = Date.now();

    // Reset crash count if more than 60s since last crash
    if (now - lastCrash > 60000 && crashCount > 0) {
      localStorage.setItem('veo-crash-count', '0');
    }

    if (crashCount >= 3) {
      setIsSafeMode(true);
      console.warn('App running in Safe Mode due to repeated crashes.');
    }
  }, []);

  // Electron-level safe mode status
  useEffect(() => {
    const loadSafeModeStatus = async () => {
      const electron = getElectron();
      if (!electron?.getSafeModeStatus) return;

      try {
        const status = await electron.getSafeModeStatus();
        setSafeModeStatus(status);
      } catch (error) {
        console.error('Failed to read safe mode status:', error);
      }
    };

    loadSafeModeStatus();
  }, []);

  const handleExitSafeMode = useCallback(async () => {
    // Reset local crash counter
    localStorage.setItem('veo-crash-count', '0');

    // Reset Electron-level safe mode state so the next launch is clean
    const electron = getElectron();
    if (electron?.resetSafeMode) {
      try {
        await electron.resetSafeMode();
      } catch (error) {
        console.error('Failed to reset safe mode via IPC:', error);
      }
    }

    window.location.reload();
  }, []);

  return {
    isSafeMode,
    safeModeStatus,
    handleExitSafeMode,
  };
}
