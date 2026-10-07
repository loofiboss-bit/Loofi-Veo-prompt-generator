/**
 * Automated Foley & SFX Audio Pipeline Contracts (v13.0.0 - Milestone 5)
 *
 * Defines audio cue extraction, multi-track timeline routing (A2 Dialogue, A3 Foley/SFX, A5 Ambience),
 * dynamic ducking curves, and batch synthesis configurations.
 */

export type AudioCueCategory = 'dialogue' | 'foley' | 'sfx' | 'ambience';

export interface AudioEventCue {
  id: string;
  shotId?: number;
  timeOffsetSeconds: number;
  durationSeconds: number;
  category: AudioCueCategory;
  targetTrackId: 'audio_dialogue' | 'audio_sfx' | 'audio_ambience';
  label: string;
  prompt: string;
  volume: number; // 0.0 to 1.0
  duckingIntensity?: number; // 0.0 to 1.0 (amount to duck music/ambience)
  status: 'pending' | 'synthesizing' | 'ready' | 'error';
  audioBlob?: Blob;
  audioUrl?: string;
  assetId?: string;
  error?: string;
}

export interface AudioDuckingCurvePoint {
  timeSeconds: number;
  targetVolume: number; // 0.0 to 1.0
}

export interface AudioPipelineConfig {
  autoDuckMusic: boolean;
  duckDepthDb: number; // e.g. -14 dB (~0.2 linear gain)
  attackTimeSeconds: number; // e.g. 0.2s
  releaseTimeSeconds: number; // e.g. 0.4s
  ttsVoice: string; // e.g. 'Kore' or 'Fenrir'
  autoGenerateAmbience: boolean;
}

export interface AudioPipelineDetectionResult {
  cues: AudioEventCue[];
  totalCues: number;
  estimatedDurationSeconds: number;
}
