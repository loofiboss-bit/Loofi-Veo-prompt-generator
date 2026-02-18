/**
 * useCostStore Tests
 * Tests for cost tracking Zustand store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CostRecord, CostEstimate } from '@core/types';

// Mock costTrackingService using vi.hoisted
const mockCostTrackingService = vi.hoisted(() => ({
  getState: vi.fn(() => ({
    sessionRecords: [
      {
        id: '1',
        timestamp: Date.now(),
        costUsd: 0.05,
        model: 'gpt-4',
        tokens: 1000,
        type: 'generation' as const,
      },
      {
        id: '2',
        timestamp: Date.now(),
        costUsd: 0.03,
        model: 'gpt-4',
        tokens: 600,
        type: 'generation' as const,
      },
    ],
    lifetimeTotalUsd: 15.75,
    monthlyBudgetUsd: 50,
  })),
  isWithinBudget: vi.fn(() => true),
  setMonthlyBudget: vi.fn(),
}));

vi.mock('@core/services/costTrackingService', () => ({
  costTrackingService: mockCostTrackingService,
}));

import { useCostStore } from './useCostStore';

describe('useCostStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to default state
    mockCostTrackingService.getState.mockReturnValue({
      sessionRecords: [
        {
          id: '1',
          timestamp: Date.now(),
          costUsd: 0.05,
          model: 'gpt-4',
          tokens: 1000,
          type: 'generation' as const,
        },
        {
          id: '2',
          timestamp: Date.now(),
          costUsd: 0.03,
          model: 'gpt-4',
          tokens: 600,
          type: 'generation' as const,
        },
      ],
      lifetimeTotalUsd: 15.75,
      monthlyBudgetUsd: 50,
    });
    mockCostTrackingService.isWithinBudget.mockReturnValue(true);
  });

  describe('initial state', () => {
    it('should initialize with data from costTrackingService', () => {
      const state = useCostStore.getState();

      expect(state.recentRecords).toHaveLength(2);
      expect(state.lifetimeCost).toBe(15.75);
      expect(state.monthlyBudget).toBe(50);
      expect(state.lastEstimate).toBeNull();
      expect(state.withinBudget).toBe(true);
    });

    it('should slice recent records to last 20', () => {
      const manyRecords: CostRecord[] = Array.from({ length: 30 }, (_, i) => ({
        id: `${i}`,
        timestamp: Date.now(),
        costUsd: 0.01,
        model: 'gpt-4',
        tokens: 100,
        type: 'generation' as const,
      }));

      mockCostTrackingService.getState.mockReturnValueOnce({
        sessionRecords: manyRecords,
        lifetimeTotalUsd: 0.3,
        monthlyBudgetUsd: 50,
      });

      // Create new store instance by getting state
      const state = useCostStore.getState();
      state.refresh();

      expect(useCostStore.getState().recentRecords).toHaveLength(20);
    });
  });

  describe('refresh', () => {
    it('should update state from service', () => {
      // Change mock data
      mockCostTrackingService.getState.mockReturnValue({
        sessionRecords: [
          {
            id: '3',
            timestamp: Date.now(),
            costUsd: 0.1,
            model: 'gpt-4',
            tokens: 2000,
            type: 'generation' as const,
          },
        ],
        lifetimeTotalUsd: 20.5,
        monthlyBudgetUsd: 100,
      });
      mockCostTrackingService.isWithinBudget.mockReturnValue(false);

      useCostStore.getState().refresh();

      const state = useCostStore.getState();
      expect(state.recentRecords).toHaveLength(1);
      expect(state.recentRecords[0].id).toBe('3');
      expect(state.lifetimeCost).toBe(20.5);
      expect(state.monthlyBudget).toBe(100);
      expect(state.withinBudget).toBe(false);
    });
  });

  describe('setMonthlyBudget', () => {
    it('should update budget and call service', () => {
      useCostStore.getState().setMonthlyBudget(75);

      expect(mockCostTrackingService.setMonthlyBudget).toHaveBeenCalledWith(75);
      expect(useCostStore.getState().monthlyBudget).toBe(75);
    });

    it('should update withinBudget status', () => {
      mockCostTrackingService.isWithinBudget.mockReturnValue(false);

      useCostStore.getState().setMonthlyBudget(10);

      expect(useCostStore.getState().withinBudget).toBe(false);
    });
  });

  describe('setLastEstimate', () => {
    it('should set estimate', () => {
      const estimate: CostEstimate = {
        model: 'gpt-4',
        estimatedTokens: 1500,
        estimatedCostUsd: 0.075,
        confidence: 'medium',
      };

      useCostStore.getState().setLastEstimate(estimate);

      expect(useCostStore.getState().lastEstimate).toEqual(estimate);
    });

    it('should clear estimate when set to null', () => {
      const estimate: CostEstimate = {
        model: 'gpt-4',
        estimatedTokens: 1500,
        estimatedCostUsd: 0.075,
        confidence: 'medium',
      };

      useCostStore.getState().setLastEstimate(estimate);
      expect(useCostStore.getState().lastEstimate).not.toBeNull();

      useCostStore.getState().setLastEstimate(null);
      expect(useCostStore.getState().lastEstimate).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle zero budget', () => {
      mockCostTrackingService.getState.mockReturnValue({
        sessionRecords: [],
        lifetimeTotalUsd: 0,
        monthlyBudgetUsd: 0,
      });

      useCostStore.getState().refresh();

      expect(useCostStore.getState().monthlyBudget).toBe(0);
    });

    it('should handle empty records', () => {
      mockCostTrackingService.getState.mockReturnValue({
        sessionRecords: [],
        lifetimeTotalUsd: 0,
        monthlyBudgetUsd: 50,
      });

      useCostStore.getState().refresh();

      expect(useCostStore.getState().recentRecords).toEqual([]);
    });

    it('should handle null monthlyBudget', () => {
      mockCostTrackingService.getState.mockReturnValue({
        sessionRecords: [],
        lifetimeTotalUsd: 10,
        monthlyBudgetUsd: null,
      });

      useCostStore.getState().refresh();

      expect(useCostStore.getState().monthlyBudget).toBeNull();
    });
  });
});
