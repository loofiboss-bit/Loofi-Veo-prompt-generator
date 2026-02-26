import { getElectron } from '@core/utils/electronBridge';
import { logger } from '@core/services/loggerService';
import type {
  DirectExportFailureReason,
  DirectExportReadinessResult,
  DirectExportResult,
  ResolveDirectExportPayload,
} from '@core/types/directExport';

interface FailurePolicy {
  reason: DirectExportFailureReason;
  retryable: boolean;
  fallbackMessage: string;
  keywords: readonly string[];
}

const FAILURE_POLICIES: readonly FailurePolicy[] = [
  {
    reason: 'nle_not_running',
    retryable: true,
    fallbackMessage: 'DaVinci Resolve is not running. Open it and retry, or use file export.',
    keywords: ['not running'],
  },
  {
    reason: 'nle_not_detected',
    retryable: false,
    fallbackMessage: 'DaVinci Resolve was not detected. Use standard file export.',
    keywords: ['not detected', 'not installed', 'not found'],
  },
  {
    reason: 'invalid_payload',
    retryable: false,
    fallbackMessage: 'Export payload is invalid. Review timeline data and use file export.',
    keywords: ['invalid payload', 'manifest validation', 'invalid manifest'],
  },
  {
    reason: 'bridge_error',
    retryable: true,
    fallbackMessage: 'Bridge communication failed. Retry or use standard file export.',
    keywords: ['bridge', 'ipc', 'transport', 'unreachable'],
  },
];

const DEFAULT_FAILURE_POLICY: FailurePolicy = {
  reason: 'export_failed',
  retryable: true,
  fallbackMessage: 'Direct Export failed. You can retry or use standard file export.',
  keywords: [],
};

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

function normalizeFailureReason(message: string): FailurePolicy {
  const normalized = message.trim().toLowerCase();

  for (const policy of FAILURE_POLICIES) {
    if (policy.keywords.some((keyword) => normalized.includes(keyword))) {
      return policy;
    }
  }

  return DEFAULT_FAILURE_POLICY;
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
