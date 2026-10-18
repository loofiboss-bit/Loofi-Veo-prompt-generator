/**
 * Job Payload Hashing Utility — Phase 4.2
 *
 * Deterministically binds cost approval tokens to exact job parameters
 * (prompt + model + duration + resolution + count).
 */

export interface JobPayloadFields {
  prompt: string;
  model: string;
  duration?: number;
  resolution?: string;
  count?: number;
}

export function formatJobPayloadCanonicalString(fields: JobPayloadFields): string {
  return [
    fields.prompt.trim(),
    fields.model.trim(),
    Number.isFinite(fields.duration) ? Number(fields.duration) : 0,
    (fields.resolution || '').trim(),
    Number.isFinite(fields.count) ? Number(fields.count) : 1,
  ].join('::');
}

export async function computeJobPayloadHash(fields: JobPayloadFields): Promise<string> {
  const canonical = formatJobPayloadCanonicalString(fields);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
