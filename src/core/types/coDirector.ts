/**
 * Multimodal AI Co-Director Contracts (v13.0.0 - Milestone 4)
 *
 * Defines session state, voice interactions, tool definitions,
 * and mutation records for the real-time AI Co-Director.
 */

import type {
  CameraLensType,
  CameraAperture,
  CameraTrajectory,
  CameraHeightLevel,
  CameraMovementSpeed,
} from './spatialCamera';

export type CoDirectorStatus =
  | 'disconnected'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface CoDirectorActionRecord {
  id: string;
  toolName: string;
  summary: string;
  details: Record<string, unknown>;
  timestamp: number;
  success: boolean;
}

export interface CoDirectorMessage {
  id: string;
  sender: 'user' | 'director' | 'system';
  text: string;
  timestamp: number;
  executedActions?: CoDirectorActionRecord[];
  isInterim?: boolean;
}

export interface CoDirectorConfig {
  model: string;
  voiceName: string;
  handsFreeEnabled: boolean;
  audioOutputEnabled: boolean;
  language: string;
}

export interface CameraRigMutationParams {
  [key: string]: unknown;
  shotId?: number;
  lens?: CameraLensType;
  aperture?: CameraAperture;
  trajectory?: CameraTrajectory;
  heightLevel?: CameraHeightLevel;
  speed?: CameraMovementSpeed;
  rollAngleDegrees?: number;
  foregroundSubject?: string;
  midgroundSubject?: string;
  backgroundEnvironment?: string;
}

export interface SceneAestheticsMutationParams {
  [key: string]: unknown;
  shotId?: number;
  lighting?: string;
  mood?: string;
  colorGrade?: string;
  environment?: string;
}

export interface ShotActionMutationParams {
  [key: string]: unknown;
  shotId?: number;
  action: string;
  dialogue?: string;
  duration?: number;
  camera?: string;
}

export interface AddTimelineShotParams {
  [key: string]: unknown;
  action: string;
  camera?: string;
  duration?: number;
  dialogue?: string;
}
