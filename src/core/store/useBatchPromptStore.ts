/**
 * Batch Prompt Store
 * UI state for the batch prompt generation feature.
 * Follows ADR-003: Zustand store pattern.
 *
 * @module useBatchPromptStore
 * @since v1.8.0
 */

import { create } from 'zustand';
import type { PromptState } from '@core/types';
import {
  batchPromptService,
  type VariableRow,
  type BatchResult,
} from '@core/services/batchPromptService';
import type { UserTemplate } from '@core/services/templateManager';

interface BatchPromptState {
  /** Whether the batch generator modal is open */
  isOpen: boolean;
  /** Available templates */
  templates: UserTemplate[];
  /** Currently selected template ID */
  selectedTemplateId: string | null;
  /** Detected variable names from the template's idea field */
  variableNames: string[];
  /** The variable matrix (rows of variable values) */
  variableMatrix: VariableRow[];
  /** Optional PromptState overrides */
  overrides: Partial<PromptState>;
  /** Active job ID (if a batch is running) */
  activeJobId: string | null;
  /** Last batch result */
  lastResult: BatchResult | null;
  /** Loading state */
  isLoading: boolean;

  // ── Actions ──────────────────────────────────────────────────────────
  open: () => Promise<void>;
  close: () => void;
  selectTemplate: (templateId: string) => void;
  updateVariable: (rowIndex: number, variableName: string, value: string) => void;
  addRow: () => void;
  removeRow: (rowIndex: number) => void;
  setOverrides: (overrides: Partial<PromptState>) => void;
  startBatch: (
    userCoords?: { latitude: number; longitude: number } | null,
  ) => Promise<string | null>;
  setLastResult: (result: BatchResult | null) => void;
  reset: () => void;
}

export const useBatchPromptStore = create<BatchPromptState>()((set, get) => ({
  isOpen: false,
  templates: [],
  selectedTemplateId: null,
  variableNames: [],
  variableMatrix: [{}],
  overrides: {},
  activeJobId: null,
  lastResult: null,
  isLoading: false,

  open: async () => {
    set({ isOpen: true, isLoading: true });
    const templates = await batchPromptService.getTemplates();
    set({ templates, isLoading: false });
  },

  close: () => {
    set({ isOpen: false });
  },

  selectTemplate: (templateId: string) => {
    const { templates } = get();
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const idea = template.params?.idea ?? '';
    const variableNames = batchPromptService.extractVariables(idea);
    const variableMatrix = batchPromptService.createEmptyMatrix(variableNames, 1);

    set({
      selectedTemplateId: templateId,
      variableNames,
      variableMatrix,
      lastResult: null,
    });
  },

  updateVariable: (rowIndex: number, variableName: string, value: string) => {
    const matrix = [...get().variableMatrix];
    if (rowIndex < matrix.length) {
      matrix[rowIndex] = { ...matrix[rowIndex], [variableName]: value };
      set({ variableMatrix: matrix });
    }
  },

  addRow: () => {
    const { variableNames, variableMatrix } = get();
    const emptyRow: VariableRow = {};
    variableNames.forEach((name) => {
      emptyRow[name] = '';
    });
    set({ variableMatrix: [...variableMatrix, emptyRow] });
  },

  removeRow: (rowIndex: number) => {
    const matrix = get().variableMatrix.filter((_, i) => i !== rowIndex);
    // Always keep at least one row
    set({ variableMatrix: matrix.length > 0 ? matrix : [{}] });
  },

  setOverrides: (overrides: Partial<PromptState>) => {
    set({ overrides });
  },

  startBatch: async (userCoords) => {
    const { selectedTemplateId, variableMatrix, overrides } = get();
    if (!selectedTemplateId) return null;

    // Filter out completely empty rows
    const filledRows = variableMatrix.filter((row) =>
      Object.values(row).some((v) => v.trim() !== ''),
    );
    if (filledRows.length === 0) return null;

    const jobId = await batchPromptService.startBatch({
      templateId: selectedTemplateId,
      variableMatrix: filledRows,
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
      userCoords,
    });

    set({ activeJobId: jobId });
    return jobId;
  },

  setLastResult: (result) => {
    set({ lastResult: result, activeJobId: null });
  },

  reset: () => {
    set({
      selectedTemplateId: null,
      variableNames: [],
      variableMatrix: [{}],
      overrides: {},
      activeJobId: null,
      lastResult: null,
    });
  },
}));
