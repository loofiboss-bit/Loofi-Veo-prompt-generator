/**
 * v1.5.0 Sprint 1
 * Shared schema for all centralized error log entries.
 */

export const ERROR_SCHEMA_VERSION = '1.0.0';
export const DEFAULT_ERROR_CODE = 'UNEXPECTED_ERROR';

export interface ErrorLogContext {
  source?: string;
  panelId?: string;
  operation?: string;
  [key: string]: unknown;
}

export interface StructuredErrorLogEntry {
  schemaVersion: string;
  code: string;
  message: string;
  stack?: string;
  context?: ErrorLogContext;
  correlationId: string;
  timestamp: number;
  level: 'error' | 'warning';
}

const FALLBACK_PREFIX = 'cid';

export function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
    return `${FALLBACK_PREFIX}_${Date.now()}_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return `${FALLBACK_PREFIX}_${Date.now()}_${Date.now().toString(36)}`;
}

export function sanitizeSensitiveContext(context?: ErrorLogContext): ErrorLogContext | undefined {
  if (!context) return undefined;
  const sensitiveKeys = new Set([
    'gender',
    'sex',
    'ethnicity',
    'race',
    'password',
    'token',
    'secret',
    'apikey',
    'api_key',
    'key',
    'credentials',
    'authorization',
  ]);
  const sanitized: ErrorLogContext = {};
  for (const [k, v] of Object.entries(context)) {
    if (sensitiveKeys.has(k.toLowerCase())) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      sanitized[k] = sanitizeSensitiveContext(v as ErrorLogContext);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

export function createStructuredErrorLogEntry(params: {
  level: 'error' | 'warning';
  message: string;
  code?: string;
  stack?: string;
  context?: ErrorLogContext;
  correlationId?: string;
  timestamp?: number;
}): StructuredErrorLogEntry {
  return {
    schemaVersion: ERROR_SCHEMA_VERSION,
    code: params.code || DEFAULT_ERROR_CODE,
    message: params.message,
    stack: params.stack,
    context: sanitizeSensitiveContext(params.context),
    correlationId: params.correlationId || generateCorrelationId(),
    timestamp: params.timestamp ?? Date.now(),
    level: params.level,
  };
}

export function normalizeStructuredErrorLogEntry(input: unknown): StructuredErrorLogEntry {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const rawContext = raw.context;
  const safeContext =
    typeof rawContext === 'object' && rawContext !== null
      ? (rawContext as ErrorLogContext)
      : undefined;
  const message =
    typeof raw.message === 'string' && raw.message.trim() ? raw.message : 'Unknown error';
  const code = typeof raw.code === 'string' && raw.code.trim() ? raw.code : DEFAULT_ERROR_CODE;
  const level = raw.level === 'warning' ? 'warning' : 'error';
  const correlationId =
    typeof raw.correlationId === 'string' && raw.correlationId.trim()
      ? raw.correlationId
      : generateCorrelationId();
  const timestamp =
    typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp)
      ? raw.timestamp
      : Date.now();
  const stack = typeof raw.stack === 'string' ? raw.stack : undefined;

  return {
    schemaVersion: ERROR_SCHEMA_VERSION,
    code,
    message,
    stack,
    context: safeContext,
    correlationId,
    timestamp,
    level,
  };
}
