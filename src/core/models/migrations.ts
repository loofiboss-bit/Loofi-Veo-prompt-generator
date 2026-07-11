import { getModel, LEGACY_MODEL_REPLACEMENTS, type CostMode } from './catalog';

export interface ModelPreference {
  requestedModelId: string;
  resolvedModelId: string;
  mode: CostMode;
  migratedFrom?: string;
}

export interface LegacyModelState {
  model?: unknown;
  veoModel?: unknown;
  modelPreference?: unknown;
}

const isModelPreference = (value: unknown): value is ModelPreference => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.requestedModelId === 'string' &&
    typeof record.resolvedModelId === 'string' &&
    typeof record.mode === 'string'
  );
};

const resolveLegacyModel = (
  modelId: string,
): { resolvedModelId: string; migratedFrom?: string } => {
  const replacement = LEGACY_MODEL_REPLACEMENTS[modelId];
  if (replacement) return { resolvedModelId: replacement, migratedFrom: modelId };
  const model = getModel(modelId);
  return { resolvedModelId: model?.id ?? modelId };
};

/**
 * Migrates persisted model settings without deleting unknown model identifiers.
 * Re-running the migration returns the existing v8 preference unchanged.
 */
export const migrateModelPreference = (state: LegacyModelState): ModelPreference => {
  if (isModelPreference(state.modelPreference)) return state.modelPreference;

  const requestedModelId = typeof state.model === 'string' ? state.model : 'gemini-3.5-flash';
  const resolved = resolveLegacyModel(requestedModelId);
  const mode: CostMode =
    state.veoModel === 'quality' ? 'quality' : state.veoModel === 'fast' ? 'fast' : 'smart';

  return {
    requestedModelId,
    resolvedModelId: resolved.resolvedModelId,
    mode,
    ...(resolved.migratedFrom ? { migratedFrom: resolved.migratedFrom } : {}),
  };
};
