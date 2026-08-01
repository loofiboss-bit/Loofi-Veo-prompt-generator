import type { PaidCostApproval } from './production';

export type LyriaModelId = 'lyria-3-clip-preview' | 'lyria-3-pro-preview';
export type MusicOutputFormat = 'mp3' | 'wav';

export interface MusicImageInput {
  data: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface MusicGenerationRequest {
  modelId: LyriaModelId;
  prompt: string;
  lyrics?: string;
  structure?: string;
  responseFormat: MusicOutputFormat;
  images: MusicImageInput[];
}

export interface MusicGenerationTask {
  id: string;
  jobKind: 'music';
  status: 'Queued' | 'Submitting' | 'Complete' | 'Error' | 'RecoveryRequired' | 'MediaAtRisk';
  prompt: string;
  request: MusicGenerationRequest;
  costApproval: PaidCostApproval;
  localMediaKey?: string;
  localMediaUrl?: string;
  localMediaPath?: string;
  mimeType?: string;
  providerInteractionId?: string;
  generatedText?: string;
  error?: string;
  timestamp: number;
  createdAt?: number;
  updatedAt?: number;
}
