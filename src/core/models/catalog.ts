/**
 * Minimal model lifecycle catalog.
 *
 * v8 expands this into the capability and pricing registry. Keeping lifecycle
 * data in one typed module now prevents retired endpoints from slipping back
 * into an executable fallback path during the v7.0.1 stabilization release.
 */
export type ModelLifecycleStatus = 'stable' | 'preview' | 'deprecated' | 'shut-down';

export interface ModelLifecycleEntry {
  id: string;
  status: ModelLifecycleStatus;
  replacementModelId?: string;
}

export const MODEL_LIFECYCLE_CATALOG: readonly ModelLifecycleEntry[] = [
  { id: 'gemini-3.5-flash', status: 'stable' },
  { id: 'gemini-3.1-pro-preview', status: 'preview' },
  { id: 'gemini-3.1-flash-lite', status: 'stable' },
  { id: 'gemini-3.1-flash-tts-preview', status: 'preview' },
  {
    id: 'gemini-2.5-flash-preview-tts',
    status: 'deprecated',
    replacementModelId: 'gemini-3.1-flash-tts-preview',
  },
  { id: 'veo-3.1-generate-preview', status: 'preview' },
  { id: 'veo-3.1-fast-generate-preview', status: 'preview' },
] as const;

export const getModelLifecycle = (modelId: string): ModelLifecycleEntry | undefined =>
  MODEL_LIFECYCLE_CATALOG.find((entry) => entry.id === modelId);

export const isShutdownModel = (modelId: string): boolean =>
  getModelLifecycle(modelId)?.status === 'shut-down';

export const LEGACY_MODEL_REPLACEMENTS: Readonly<Record<string, string>> = {
  'gemini-3-pro-preview': 'gemini-3.5-flash',
  'gemini-2.0-flash': 'gemini-3.1-flash-lite',
};
