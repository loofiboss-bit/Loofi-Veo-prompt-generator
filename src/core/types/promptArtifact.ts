/**
 * Prompt Studio domain contracts.
 *
 * These types intentionally describe the copy/paste artifact rather than a
 * provider request. Provider execution remains behind the existing approval
 * and production-run boundaries.
 */

export type PromptArtifactKind = 'video' | 'music';

export type PromptArtifactTarget = 'flow-veo' | 'veo-api' | 'suno';

export type VideoPromptMode =
  | 'text-to-video'
  | 'image-to-video'
  | 'first-last-frames'
  | 'ingredients'
  | 'extend';

export type PromptArtifactProvider = 'local' | 'gemini' | 'ollama';

export type PromptValidationStatus = 'pass' | 'warning' | 'blocked';

export interface PromptValidationCheck {
  id: string;
  label: string;
  status: PromptValidationStatus;
  detail: string;
}

export interface PromptArtifactProvenance {
  provider: PromptArtifactProvider;
  source: 'compiler' | 'optimizer';
  generatedAt: string;
  inputHash: string;
}

export interface VideoPromptVariant {
  label: 'Primary' | 'Cinematic' | 'Control-focused';
  title: string;
  prompt: string;
  negativePrompt: string;
  settingsChecklist: string[];
  copyPrompt: string;
  copyNegativePrompt: string;
  copySettingsChecklist: string;
  copyAll: string;
}

export interface MusicPromptVariant {
  label: 'Primary' | 'Hook-forward' | 'Atmospheric';
  title: string;
  styleOfMusic: string;
  lyrics: string;
  productionNotes: string[];
  copyStyle: string;
  copyLyrics: string;
  copyAll: string;
}

export interface VideoPromptArtifactInput {
  idea: string;
  mode: VideoPromptMode;
  target: Extract<PromptArtifactTarget, 'flow-veo' | 'veo-api'>;
  aspectRatio: '16:9' | '9:16';
  durationSeconds: 4 | 6 | 8 | 10;
  subject?: string;
  action?: string;
  environment?: string;
  camera?: string;
  lighting?: string;
  style?: string;
  audio?: string;
  dialogue?: string;
  negativePrompt?: string;
  startFrame?: string;
  endFrame?: string;
  previousClip?: string;
  referenceRoles?: string;
}

export interface MusicPromptArtifactInput {
  topic: string;
  language: string;
  genre?: string;
  mood?: string;
  voice?: string;
  tempo?: string;
  instruments?: string;
  structure?: 'Auto' | 'Standard' | 'Pop' | 'Rap' | 'Ambient' | 'Custom';
  lyrics?: string;
  instrumental?: boolean;
  styleInfluence?: number | null;
  targetProfile?: 'suno-v5.5' | 'future-compatible';
  key?: string;
  timeSignature?: string;
  energyCurve?: string;
  vocalRange?: string;
  voiceNotes?: string;
  customModelNotes?: string;
  personaNotes?: string;
  tasteGuidance?: string;
  mixNotes?: string;
  rightsChecklist?: {
    ownsOrLicensedLyrics: boolean;
    hasVoiceConsent: boolean;
    hasTrainingReferenceRights: boolean;
    avoidsArtistImitation: boolean;
  };
}

export interface PromptArtifactV1 {
  schemaVersion: 1;
  id: string;
  kind: PromptArtifactKind;
  target: PromptArtifactTarget;
  input: VideoPromptArtifactInput | MusicPromptArtifactInput;
  primary: VideoPromptVariant | MusicPromptVariant;
  alternatives: [VideoPromptVariant | MusicPromptVariant, VideoPromptVariant | MusicPromptVariant];
  validation: PromptValidationCheck[];
  provenance: PromptArtifactProvenance;
  createdAt: string;
}

export interface PromptStudioHandoff {
  id: string;
  artifactId: string;
  destination: 'production' | 'lyria';
  createdAt: string;
  status: 'draft';
}

export const isVideoPromptArtifact = (
  artifact: PromptArtifactV1,
): artifact is PromptArtifactV1 & {
  kind: 'video';
  primary: VideoPromptVariant;
  alternatives: [VideoPromptVariant, VideoPromptVariant];
} => artifact.kind === 'video';

export const isMusicPromptArtifact = (
  artifact: PromptArtifactV1,
): artifact is PromptArtifactV1 & {
  kind: 'music';
  primary: MusicPromptVariant;
  alternatives: [MusicPromptVariant, MusicPromptVariant];
} => artifact.kind === 'music';
