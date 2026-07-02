export type VideoTarget = 'flow-veo' | 'veo-api' | 'local';

export type FlowVeoOutputMode =
  | 'single-prompt'
  | 'flow-shot-card'
  | 'flow-scene-pack'
  | 'veo-api-prompt'
  | 'timeline-sequence';

export interface FlowVeoCompatibilityScore {
  promptClarity: number;
  characterConsistency: number;
  shotControl: number;
  audioReadiness: number;
  flowReadiness: number;
  veoApiReadiness: number;
}

export interface FlowVeoShotCard {
  id: string;
  title: string;
  prompt: string;
  camera: string;
  durationSeconds: number;
  startFrameNotes: string;
  endFrameNotes: string;
  audioNotes: string;
  negativePrompt: string;
}

export interface FlowVeoScenePack {
  title: string;
  mode: FlowVeoOutputMode;
  oneShotPrompt: string;
  shotCards: FlowVeoShotCard[];
  characterContinuity: string;
  locationContinuity: string;
  styleBible: string;
  referenceChecklist: string[];
  insertObjectNotes: string;
  removeObjectNotes: string;
  extendSceneNotes: string;
  negativePrompt: string;
  compatibility: FlowVeoCompatibilityScore;
}

export interface FlowVeoBuildOptions {
  mode?: FlowVeoOutputMode;
  shots?: Array<{
    id?: string | number;
    action?: string;
    camera?: string;
    duration?: number;
    transition?: { type: string; duration: number };
  }>;
  title?: string;
}

export interface FlowVeoExportOptions {
  format: 'markdown' | 'json' | 'copy-pack';
}
