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
    return `${FALLBACK_PREFIX}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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
        context: params.context,
        correlationId: params.correlationId || generateCorrelationId(),
        timestamp: params.timestamp ?? Date.now(),
        level: params.level,
    };
}

export function normalizeStructuredErrorLogEntry(input: unknown): StructuredErrorLogEntry {
    const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
    const rawContext = raw.context;
    const safeContext = typeof rawContext === 'object' && rawContext !== null
        ? rawContext as ErrorLogContext
        : undefined;
    const message = typeof raw.message === 'string' && raw.message.trim()
        ? raw.message
        : 'Unknown error';
    const code = typeof raw.code === 'string' && raw.code.trim()
        ? raw.code
        : DEFAULT_ERROR_CODE;
    const level = raw.level === 'warning' ? 'warning' : 'error';
    const correlationId = typeof raw.correlationId === 'string' && raw.correlationId.trim()
        ? raw.correlationId
        : generateCorrelationId();
    const timestamp = typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp)
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
