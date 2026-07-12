import { ProviderExecutionError, type ProviderFailureKind } from './types';

const readNumber = (value: unknown, key: string): number | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'number' ? candidate : undefined;
};

const readString = (value: unknown, key: string): string => {
  if (!value || typeof value !== 'object') return '';
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' ? candidate : '';
};

export const classifyProviderFailure = (error: unknown): ProviderFailureKind => {
  if (error instanceof ProviderExecutionError) return error.kind;
  const status = readNumber(error, 'status') ?? readNumber(error, 'statusCode');
  const code = readString(error, 'code').toLowerCase();
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const text = `${code} ${message}`;

  if (status === 401 || status === 403 || /api.?key|credential|unauth|permission/.test(text))
    return 'authentication';
  if (status === 429 || /rate.?limit|resource.?exhausted/.test(text)) return 'rate-limit';
  if (/quota|billing|credit/.test(text)) return 'quota';
  if (status === 404 || /model.*(not found|unavailable)|unsupported model/.test(text))
    return 'model-unavailable';
  if (status === 400 || /invalid.*(argument|capability)|not supported/.test(text))
    return 'invalid-capability';
  if (/safety|blocked|harm/.test(text)) return 'safety';
  if (/network|fetch failed|timeout|timed out|econn|enotfound/.test(text)) return 'network';
  if ((status !== undefined && status >= 500) || /service unavailable|internal server/.test(text))
    return 'provider-incident';
  return 'unknown';
};

export const isSafeSameModelRetry = (kind: ProviderFailureKind): boolean =>
  kind === 'network' || kind === 'provider-incident';

export const permitsModelFallback = (kind: ProviderFailureKind): boolean =>
  kind === 'rate-limit' || kind === 'model-unavailable';
