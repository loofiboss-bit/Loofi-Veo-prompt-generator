/**
 * Zustand store for cost tracking state.
 * Bridges costTrackingService to React components.
 *
 * @module core/store/useCostStore
 */
import { create } from 'zustand';
import type { CostRecord, CostEstimate } from '@core/types';
import { costTrackingService } from '@core/services/costTrackingService';

interface CostState {
  /** Recent cost records */
  recentRecords: CostRecord[];
  /** Total lifetime cost */
  lifetimeCost: number;
  /** Monthly budget (0 = unlimited) */
  monthlyBudget: number | null;
  /** Latest cost estimate (for preview badge) */
  lastEstimate: CostEstimate | null;
  /** Whether current spending is within budget */
  withinBudget: boolean;

  // Actions
  /** Refresh state from the cost tracking service */
  refresh: () => void;
  /** Set the monthly budget */
  setMonthlyBudget: (budget: number) => void;
  /** Store a cost estimate for display */
  setLastEstimate: (estimate: CostEstimate | null) => void;
}

export const useCostStore = create<CostState>((set) => {
  const state = costTrackingService.getState();

  return {
    recentRecords: state.sessionRecords.slice(-20),
    lifetimeCost: state.lifetimeTotalUsd,
    monthlyBudget: state.monthlyBudgetUsd,
    lastEstimate: null,
    withinBudget: costTrackingService.isWithinBudget(),

    refresh: () => {
      const s = costTrackingService.getState();
      set({
        recentRecords: s.sessionRecords.slice(-20),
        lifetimeCost: s.lifetimeTotalUsd,
        monthlyBudget: s.monthlyBudgetUsd,
        withinBudget: costTrackingService.isWithinBudget(),
      });
    },

    setMonthlyBudget: (budget: number) => {
      costTrackingService.setMonthlyBudget(budget);
      set({ monthlyBudget: budget, withinBudget: costTrackingService.isWithinBudget() });
    },

    setLastEstimate: (estimate: CostEstimate | null) => {
      set({ lastEstimate: estimate });
    },
  };
});
