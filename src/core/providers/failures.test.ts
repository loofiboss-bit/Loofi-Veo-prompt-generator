import { describe, expect, it } from 'vitest';
import { classifyProviderFailure, permitsModelFallback } from './failures';

describe('provider failure classification', () => {
  it.each([
    [{ status: 401, message: 'bad key' }, 'authentication'],
    [{ status: 429, message: 'too many requests' }, 'rate-limit'],
    [{ status: 404, message: 'model not found' }, 'model-unavailable'],
    [{ status: 400, message: 'invalid argument' }, 'invalid-capability'],
    [new Error('request blocked by safety policy'), 'safety'],
    [new Error('network timeout'), 'network'],
    [{ status: 503, message: 'unavailable' }, 'provider-incident'],
  ] as const)('classifies %o as %s', (error, expected) => {
    expect(classifyProviderFailure(error)).toBe(expected);
  });

  it('only permits model fallback for availability and rate-limit failures', () => {
    expect(permitsModelFallback('model-unavailable')).toBe(true);
    expect(permitsModelFallback('rate-limit')).toBe(true);
    expect(permitsModelFallback('safety')).toBe(false);
    expect(permitsModelFallback('authentication')).toBe(false);
  });
});
