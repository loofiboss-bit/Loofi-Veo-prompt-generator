import { describe, expect, it } from 'vitest';
import {
    ERROR_SCHEMA_VERSION,
    createStructuredErrorLogEntry,
    normalizeStructuredErrorLogEntry,
} from './errorSchema';

describe('errorSchema', () => {
    it('creates versioned structured entries', () => {
        const entry = createStructuredErrorLogEntry({
            level: 'error',
            code: 'TEST_ERROR',
            message: 'boom',
            stack: 'stack',
            context: { source: 'test' },
            correlationId: 'cid-1',
            timestamp: 123,
        });

        expect(entry.schemaVersion).toBe(ERROR_SCHEMA_VERSION);
        expect(entry.code).toBe('TEST_ERROR');
        expect(entry.message).toBe('boom');
        expect(entry.stack).toBe('stack');
        expect(entry.context).toEqual({ source: 'test' });
        expect(entry.correlationId).toBe('cid-1');
        expect(entry.timestamp).toBe(123);
    });

    it('normalizes malformed payloads to a safe schema entry', () => {
        const entry = normalizeStructuredErrorLogEntry({
            level: 'warning',
            message: '',
            code: '',
            context: 'invalid',
            timestamp: 'invalid',
        });

        expect(entry.schemaVersion).toBe(ERROR_SCHEMA_VERSION);
        expect(entry.level).toBe('warning');
        expect(entry.message).toBe('Unknown error');
        expect(entry.code).toBe('UNEXPECTED_ERROR');
        expect(entry.context).toBeUndefined();
        expect(typeof entry.correlationId).toBe('string');
        expect(typeof entry.timestamp).toBe('number');
    });
});
