import { describe, it, expect } from 'vitest';
import { computeJobPayloadHash, formatJobPayloadCanonicalString } from './jobPayloadHash';

describe('jobPayloadHash', () => {
  it('formats canonical string consistently', () => {
    const canonical = formatJobPayloadCanonicalString({
      prompt: '   cinematic landscape  ',
      model: 'veo-3.1-fast',
      duration: 8,
      resolution: '720p',
      count: 1,
    });
    expect(canonical).toBe('cinematic landscape::veo-3.1-fast::8::720p::1');
  });

  it('computes deterministic SHA-256 hash across executions', async () => {
    const fields = {
      prompt: 'Neon Tokyo',
      model: 'veo-3.1-fast',
      duration: 6,
      resolution: '1080p',
      count: 2,
    };
    const hash1 = await computeJobPayloadHash(fields);
    const hash2 = await computeJobPayloadHash(fields);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('changes hash when any parameter is altered', async () => {
    const base = {
      prompt: 'Sunset over mountains',
      model: 'veo-3.1-fast',
      duration: 8,
      resolution: '720p',
      count: 1,
    };
    const baseHash = await computeJobPayloadHash(base);
    const alteredPrompt = await computeJobPayloadHash({
      ...base,
      prompt: 'Sunset over mountains.',
    });
    const alteredDuration = await computeJobPayloadHash({ ...base, duration: 4 });
    const alteredResolution = await computeJobPayloadHash({ ...base, resolution: '1080p' });
    const alteredModel = await computeJobPayloadHash({ ...base, model: 'veo-3.1-quality' });

    expect(alteredPrompt).not.toBe(baseHash);
    expect(alteredDuration).not.toBe(baseHash);
    expect(alteredResolution).not.toBe(baseHash);
    expect(alteredModel).not.toBe(baseHash);
  });
});
