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
}

export async function directExportToResolve(
  payload: ResolveDirectExportPayload,
): Promise<DirectExportResult> {
  const electron = getElectron();

  if (!electron) {
    return {
      success: false,
      message: 'Direct Export is available only in the desktop app. Use standard file export.',
      fallbackSuggested: true,
    };
  }

  try {
    const status = await electron.getNleStatus('resolve');

    if (!status.available) {
      return {
        success: false,
        message: 'DaVinci Resolve was not detected. Use standard file export.',
        fallbackSuggested: true,
      };
    }

    if (!status.running) {
      return {
        success: false,
        message: 'DaVinci Resolve is not running. Open it and retry, or use file export.',
        fallbackSuggested: true,
      };
    }

    const result = await electron.directExportToNle({
      app: 'resolve',
      payload: payload as unknown as Record<string, unknown>,
    });

    return {
      success: result.success,
      message: result.message,
      fallbackSuggested: !result.success,
      manifestPath: result.manifestPath,
    };
  } catch (error) {
    logger.error('Direct export to Resolve failed', error);
    return {
      success: false,
      message: 'Direct Export failed unexpectedly. You can continue with standard file export.',
      fallbackSuggested: true,
    };
  }
}
