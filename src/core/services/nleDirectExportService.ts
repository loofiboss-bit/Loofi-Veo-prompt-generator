import type { ExportProfile } from '@core/config/exportProfiles';
import { getElectron } from '@core/utils/electronBridge';
import { logger } from '@core/services/loggerService';

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
  reason?:
    | 'unsupported_environment'
    | 'nle_not_detected'
    | 'nle_not_running'
    | 'invalid_payload'
    | 'bridge_error'
    | 'export_failed';
  retryable?: boolean;
}

export interface DirectExportReadinessResult {
  ready: boolean;
  message: string;
  reason?: 'unsupported_environment' | 'nle_not_detected' | 'nle_not_running' | 'bridge_error';
  retryable: boolean;
}

function validateResolvePayload(payload: ResolveDirectExportPayload): string | undefined {
  if (!payload.timelineName.trim()) {
    return 'Timeline name is required before direct export.';
  }

  if (payload.clipCount <= 0) {
    return 'At least one clip is required before direct export.';
  }

  if (payload.totalDurationSeconds <= 0) {
    return 'Timeline duration must be greater than 0 seconds.';
  }

  return undefined;
}

function normalizeFailureReason(message: string): {
  reason: NonNullable<DirectExportResult['reason']>;
  retryable: boolean;
  fallbackMessage: string;
} {
  const normalized = message.toLowerCase();

  if (normalized.includes('not running')) {
    return {
      reason: 'nle_not_running',
      retryable: true,
      fallbackMessage: 'DaVinci Resolve is not running. Open it and retry, or use file export.',
    };
  }

  if (
    normalized.includes('not detected') ||
    normalized.includes('not installed') ||
    normalized.includes('not found')
  ) {
    return {
      reason: 'nle_not_detected',
      retryable: false,
      fallbackMessage: 'DaVinci Resolve was not detected. Use standard file export.',
    };
  }

  if (
    normalized.includes('invalid payload') ||
    normalized.includes('manifest validation') ||
    normalized.includes('invalid manifest')
  ) {
    return {
      reason: 'invalid_payload',
      retryable: false,
      fallbackMessage: 'Export payload is invalid. Review timeline data and use file export.',
    };
  }

  if (
    normalized.includes('bridge') ||
    normalized.includes('ipc') ||
    normalized.includes('transport') ||
    normalized.includes('unreachable')
  ) {
    return {
      reason: 'bridge_error',
      retryable: true,
      fallbackMessage: 'Bridge communication failed. Retry or use standard file export.',
    };
  }

  return {
    reason: 'export_failed',
    retryable: true,
    fallbackMessage: 'Direct Export failed. You can retry or use standard file export.',
  };
}

export async function getResolveDirectExportReadiness(): Promise<DirectExportReadinessResult> {
  const electron = getElectron();

  if (!electron) {
    return {
      ready: false,
      message: 'Direct Export is available only in the desktop app. Use standard file export.',
      reason: 'unsupported_environment',
      retryable: false,
    };
  }

  try {
    const status = await electron.getNleStatus('resolve');

    if (!status.available) {
      return {
        ready: false,
        message: 'DaVinci Resolve was not detected. Use standard file export.',
        reason: 'nle_not_detected',
        retryable: false,
      };
    }

    if (!status.running) {
      return {
        ready: false,
        message: 'DaVinci Resolve is not running. Open it and retry, or use file export.',
        reason: 'nle_not_running',
        retryable: true,
      };
    }

    return {
      ready: true,
      message: 'DaVinci Resolve is ready for direct export.',
      retryable: true,
    };
  } catch (error) {
    logger.error('Resolve direct export readiness check failed', error);
    return {
      ready: false,
      message: 'Unable to verify DaVinci Resolve status. You can retry or use file export.',
      reason: 'bridge_error',
      retryable: true,
    };
  }
}

export async function directExportToResolve(
  payload: ResolveDirectExportPayload,
): Promise<DirectExportResult> {
  const payloadValidationError = validateResolvePayload(payload);
  if (payloadValidationError) {
    return {
      success: false,
      message: payloadValidationError,
      fallbackSuggested: true,
      reason: 'invalid_payload',
      retryable: false,
    };
  }

  const readiness = await getResolveDirectExportReadiness();
  if (!readiness.ready) {
    return {
      success: false,
      message: readiness.message,
      fallbackSuggested: true,
      reason: readiness.reason,
      retryable: readiness.retryable,
    };
  }

  const electron = getElectron();
  if (!electron) {
    return {
      success: false,
      message: 'Direct Export is available only in the desktop app. Use standard file export.',
      fallbackSuggested: true,
      reason: 'unsupported_environment',
      retryable: false,
    };
  }

  try {
    const result = await electron.directExportToNle({
      app: 'resolve',
      payload: payload as unknown as Record<string, unknown>,
    });

    if (!result.success) {
      const normalizedFailure = normalizeFailureReason(result.message ?? '');

      return {
        success: false,
        message: result.message || normalizedFailure.fallbackMessage,
        fallbackSuggested: result.fallbackSuggested ?? true,
        manifestPath: result.manifestPath,
        reason: normalizedFailure.reason,
        retryable: normalizedFailure.retryable,
      };
    }

    return {
      success: true,
      message: result.message,
      fallbackSuggested: false,
      manifestPath: result.manifestPath,
    };
  } catch (error) {
    logger.error('Direct export to Resolve failed', error);
    return {
      success: false,
      message: 'Direct Export failed unexpectedly. You can continue with standard file export.',
      fallbackSuggested: true,
      reason: 'bridge_error',
      retryable: true,
    };
  }
}
