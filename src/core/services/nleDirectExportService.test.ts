import { describe, it, expect, vi, beforeEach } from 'vitest';
import { directExportToResolve, getResolveDirectExportReadiness } from './nleDirectExportService';

vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('nleDirectExportService', () => {
  const payload = {
    timelineName: 'NLE Timeline',
    profile: { id: 'master_prores', label: 'Master', container: 'mov' },
    includeWaveform: false,
    clipCount: 3,
    totalDurationSeconds: 18,
    createdAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'electron', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('returns fallback result when Electron bridge is unavailable', async () => {
    const result = await directExportToResolve(payload);

    expect(result.success).toBe(false);
    expect(result.fallbackSuggested).toBe(true);
    expect(result.message).toContain('desktop app');
    expect(result.reason).toBe('unsupported_environment');
  });

  it('returns invalid payload result for empty timeline names', async () => {
    const result = await directExportToResolve({
      ...payload,
      timelineName: '   ',
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('invalid_payload');
    expect(result.retryable).toBe(false);
  });

  it('returns fallback result when Resolve is not installed', async () => {
    Object.defineProperty(window, 'electron', {
      value: {
        getNleStatus: vi.fn().mockResolvedValue({
          app: 'resolve',
          available: false,
          running: false,
        }),
        directExportToNle: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    const result = await directExportToResolve(payload);

    expect(result.success).toBe(false);
    expect(result.fallbackSuggested).toBe(true);
    expect(result.message).toContain('not detected');
  });

  it('returns fallback result when Resolve is not running', async () => {
    Object.defineProperty(window, 'electron', {
      value: {
        getNleStatus: vi.fn().mockResolvedValue({
          app: 'resolve',
          available: true,
          running: false,
        }),
        directExportToNle: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    const result = await directExportToResolve(payload);

    expect(result.success).toBe(false);
    expect(result.fallbackSuggested).toBe(true);
    expect(result.message).toContain('not running');
    expect(result.reason).toBe('nle_not_running');
    expect(result.retryable).toBe(true);
  });

  it('returns readiness state for direct export preflight checks', async () => {
    Object.defineProperty(window, 'electron', {
      value: {
        getNleStatus: vi.fn().mockResolvedValue({
          app: 'resolve',
          available: true,
          running: true,
        }),
        directExportToNle: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    const readiness = await getResolveDirectExportReadiness();

    expect(readiness.ready).toBe(true);
    expect(readiness.retryable).toBe(true);
  });

  it('returns success when bridge operation succeeds', async () => {
    const directExportToNle = vi.fn().mockResolvedValue({
      success: true,
      message: 'Direct export manifest sent to DaVinci Resolve bridge.',
      manifestPath: '/tmp/resolve-export-123.json',
    });

    Object.defineProperty(window, 'electron', {
      value: {
        getNleStatus: vi.fn().mockResolvedValue({
          app: 'resolve',
          available: true,
          running: true,
        }),
        directExportToNle,
      },
      writable: true,
      configurable: true,
    });

    const result = await directExportToResolve(payload);

    expect(result.success).toBe(true);
    expect(result.fallbackSuggested).toBe(false);
    expect(result.manifestPath).toContain('resolve-export-123.json');
    expect(directExportToNle).toHaveBeenCalledWith({
      app: 'resolve',
      payload: expect.objectContaining({
        timelineName: 'NLE Timeline',
      }),
    });
  });
});
