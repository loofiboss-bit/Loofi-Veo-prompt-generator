import type { ExportProfile } from '@core/config/exportProfiles';

export type DirectExportFailureReason =
  | 'unsupported_environment'
  | 'nle_not_detected'
  | 'nle_not_running'
  | 'invalid_payload'
  | 'bridge_error'
  | 'export_failed';

export interface ResolveDirectExportPayload {
  timelineName: string;
  profile: Pick<ExportProfile, 'id' | 'label' | 'container'>;
  includeWaveform: boolean;
  clipCount: number;
  totalDurationSeconds: number;
  createdAt: number;
}

export interface DirectExportResult {
  success: boolean;
  message: string;
  fallbackSuggested: boolean;
  manifestPath?: string;
  reason?: DirectExportFailureReason;
  retryable?: boolean;
}

export interface DirectExportReadinessResult {
  ready: boolean;
  message: string;
  reason?: Exclude<DirectExportFailureReason, 'invalid_payload' | 'export_failed'>;
  retryable: boolean;
}
