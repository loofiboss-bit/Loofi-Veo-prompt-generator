import type { PromptState, VideoTarget } from '@core/types';

const VIDEO_TARGETS = new Set<string>(['flow-veo', 'veo-api', 'local']);

export const normalizeVideoTarget = (target: unknown): VideoTarget => {
  return typeof target === 'string' && VIDEO_TARGETS.has(target)
    ? (target as VideoTarget)
    : 'flow-veo';
};

export const migratePromptStateTarget = <T extends Partial<PromptState>>(state: T): T => {
  return {
    ...state,
    targetModel: normalizeVideoTarget((state as Record<string, unknown>).targetModel),
    flowVeoOutputMode:
      state.flowVeoOutputMode ??
      (normalizeVideoTarget((state as Record<string, unknown>).targetModel) === 'veo-api'
        ? 'veo-api-prompt'
        : 'flow-scene-pack'),
  };
};

export const migratePromptStateCollection = <T extends { params?: Partial<PromptState> }>(
  entries: T[] | undefined,
): T[] | undefined => {
  if (!entries) {
    return entries;
  }

  return entries.map((entry) => ({
    ...entry,
    params: entry.params ? migratePromptStateTarget(entry.params) : entry.params,
  }));
};
