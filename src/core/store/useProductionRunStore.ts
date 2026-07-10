import { create } from 'zustand';
import { temporal } from 'zundo';

import { directorPlanningService } from '@core/services/directorPlanningService';
import { productionRunService } from '@core/services/productionRunService';
import { veoGenerationService } from '@core/services/veoGenerationService';
import type { BuildProductionPlanInput, ProductionRun, ProductionShot } from '@core/types';

interface ProductionRunStoreState {
  runs: ProductionRun[];
  activeRun: ProductionRun | null;
  selectedShotIds: number[];
  hydratedProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  initialize: (projectId: string) => Promise<void>;
  createLocalPlan: (input: BuildProductionPlanInput) => Promise<ProductionRun>;
  selectRun: (runId: string) => void;
  toggleShotSelection: (shotId: number) => void;
  selectAllPendingShots: () => void;
  approveSelectedShots: () => Promise<void>;
  updateShotRequest: (
    shotId: number,
    updates: Partial<ProductionShot['generationRequest']>,
  ) => Promise<void>;
  splitLongShot: (shotId: number) => Promise<void>;
  refreshActiveRun: () => Promise<void>;
  clearError: () => void;
}

export const useProductionRunStore = create<ProductionRunStoreState>()(
  temporal(
    (set, get) => ({
      runs: [],
      activeRun: null,
      selectedShotIds: [],
      hydratedProjectId: null,
      isLoading: false,
      error: null,

      initialize: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
          const runs = await productionRunService.getRunsForProject(projectId);
          set({
            runs,
            activeRun: runs[0] ?? null,
            selectedShotIds: [],
            hydratedProjectId: projectId,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load production runs.',
          });
        }
      },

      createLocalPlan: async (input) => {
        set({ isLoading: true, error: null });
        try {
          const run = directorPlanningService.buildLocalPlan(input);
          const saved = await productionRunService.createRun(run);
          set((state) => ({
            runs: [saved, ...state.runs.filter((item) => item.id !== saved.id)],
            activeRun: saved,
            selectedShotIds: saved.shots.map((shot) => shot.id),
            isLoading: false,
          }));
          return saved;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to create production plan.';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      selectRun: (runId) =>
        set((state) => ({
          activeRun: state.runs.find((run) => run.id === runId) ?? state.activeRun,
          selectedShotIds: [],
        })),

      toggleShotSelection: (shotId) =>
        set((state) => ({
          selectedShotIds: state.selectedShotIds.includes(shotId)
            ? state.selectedShotIds.filter((id) => id !== shotId)
            : [...state.selectedShotIds, shotId],
        })),

      selectAllPendingShots: () =>
        set((state) => ({
          selectedShotIds:
            state.activeRun?.shots
              .filter((shot) => shot.status === 'awaiting-approval')
              .map((shot) => shot.id) ?? [],
        })),

      approveSelectedShots: async () => {
        const { activeRun, selectedShotIds } = get();
        if (!activeRun) throw new Error('No active production run.');
        const selectedShots = activeRun.shots.filter((shot) => selectedShotIds.includes(shot.id));
        const maximumCostUsd = selectedShots.reduce(
          (sum, shot) => sum + veoGenerationService.estimateCost(shot.generationRequest),
          0,
        );
        await productionRunService.approveShots(activeRun.id, selectedShotIds, maximumCostUsd);
        await get().refreshActiveRun();
        set({ selectedShotIds: [] });
      },

      updateShotRequest: async (shotId, updates) => {
        const activeRun = get().activeRun;
        if (!activeRun) throw new Error('No active production run.');
        const shots = activeRun.shots.map((shot) =>
          shot.id === shotId
            ? { ...shot, generationRequest: { ...shot.generationRequest, ...updates } }
            : shot,
        );
        const estimatedCostUsd = shots.reduce(
          (sum, shot) => sum + veoGenerationService.estimateCost(shot.generationRequest),
          0,
        );
        await productionRunService.updateShotRequest(
          activeRun.id,
          shotId,
          updates,
          estimatedCostUsd,
        );
        await get().refreshActiveRun();
      },

      splitLongShot: async (shotId) => {
        const activeRun = get().activeRun;
        if (!activeRun) throw new Error('No active production run.');
        await productionRunService.splitLongShot(activeRun.id, shotId);
        await get().refreshActiveRun();
        get().selectAllPendingShots();
      },

      refreshActiveRun: async () => {
        const activeRunId = get().activeRun?.id;
        if (!activeRunId) return;
        const activeRun = await productionRunService.getRun(activeRunId);
        if (!activeRun) return;
        set((state) => ({
          activeRun,
          runs: state.runs.map((run) => (run.id === activeRun.id ? activeRun : run)),
        }));
      },

      clearError: () => set({ error: null }),
    }),
    {
      partialize: (state) => ({
        selectedShotIds: state.selectedShotIds,
      }),
    },
  ),
);
