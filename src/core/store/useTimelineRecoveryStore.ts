import { create } from 'zustand';
import type { MissingTimelineMedia } from '@core/services/projectTransferService';
import type { ProductionRun } from '@core/types';
import type { useAppStore } from '@core/store/useAppStore';

type AppSnapshot = ReturnType<typeof useAppStore.getState>;

interface TimelineRecovery {
  projectId: string;
  mutationVersion: number;
  run: ProductionRun | null;
  clips: AppSnapshot['clips'];
  assets: AppSnapshot['assets'];
  shots: AppSnapshot['sbShots'];
  missingMedia: MissingTimelineMedia[];
}

interface TimelineRecoveryStore {
  recovery: TimelineRecovery | null;
  setRecovery: (recovery: TimelineRecovery | null) => void;
}

/** Ephemeral results only: a changed edit or production run invalidates the observation. */
export const useTimelineRecoveryStore = create<TimelineRecoveryStore>((set) => ({
  recovery: null,
  setRecovery: (recovery) => set({ recovery }),
}));
