import type { FlowVeoScenePack } from './flowVeo';

export type SunoExportMode =
  | 'simple-prompt'
  | 'custom-mode-prompt'
  | 'lyrics-only'
  | 'style-tags-only'
  | 'full-production-brief'
  | 'json';

export type SunoTargetProfile = 'suno-v5.5' | 'future-compatible';

export interface SunoRightsChecklist {
  ownsOrLicensedLyrics: boolean;
  hasVoiceConsent: boolean;
  hasTrainingReferenceRights: boolean;
  avoidsArtistImitation: boolean;
}

export interface SunoStudioHandoff {
  target: 'studio-1.2';
  alternates: string[];
  warpMarkers: { label: string; seconds: number }[];
  removeFxIntent: string;
  requestedStems: string[];
  exportFormats: Array<'WAV' | 'MIDI'>;
}

export interface SunoProductionBrief {
  targetProfile: SunoTargetProfile;
  songIdea: string;
  genreStack: string[];
  subgenre: string;
  mood: string;
  bpm: string;
  key: string;
  timeSignature: string;
  vocalStyle: string;
  vocalTexture: string;
  language: string;
  lyrics: string;
  sections: {
    intro: string;
    verse: string;
    preChorus: string;
    chorus: string;
    bridge: string;
    dropBreakdown: string;
    outro: string;
  };
  instrumentation: string;
  productionStyle: string;
  mixMasterNotes: string;
  energyCurve: string;
  sectionLengths: Record<string, number>;
  vocalRange: string;
  instrumentRoles: Record<string, string>;
  voiceNotes?: string;
  customModelNotes?: string;
  personaNotes?: string;
  tasteGuidance?: string;
  studioHandoff: SunoStudioHandoff;
  rightsChecklist: SunoRightsChecklist;
  avoidTags: string[];
  commercialUseWarning: string;
}

export interface SunoVideoBridgeBrief {
  mood: string;
  pacing: string;
  bpm: string;
  instruments: string[];
  vocalStyle: string;
  hookIdeas: string[];
  sectionStructure: string[];
  avoidTags: string[];
  timedSections: { section: string; startSeconds: number; durationSeconds: number }[];
}

export interface SunoToFlowVeoShot {
  section: string;
  visuals: string;
  cameraMovement: string;
  editRhythm: string;
  aspectRatio: string;
  transition: string;
}

export interface ShortsReelsMusicPack {
  hookFirstIdeas: string[];
  fastIntro: string;
  loopableHook: string;
  dropBreakdownOption: string;
  shortFormVideoPacing: string;
}

export interface SunoWorkflowPack {
  productionBrief: SunoProductionBrief;
  videoToSuno?: SunoVideoBridgeBrief;
  sunoToFlowVeo?: SunoToFlowVeoShot[];
  shortsReels?: ShortsReelsMusicPack;
}

export interface SunoVideoBridgeInput {
  scenePack: FlowVeoScenePack;
  language?: string;
}
