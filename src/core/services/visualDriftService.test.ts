import { describe, it, expect } from 'vitest';
import {
  calculatePerceptualHash,
  comparePerceptualHashes,
  evaluateVisualDrift,
} from './visualDriftService';
import type { ContinuityProfile } from '@core/types/continuity';

describe('visualDriftService', () => {
  it('calculates and compares perceptual hashes accurately', () => {
    const pixelsA = new Array(64).fill(128);
    const pixelsB = new Array(64).fill(128);
    const hashA = calculatePerceptualHash(pixelsA);
    const hashB = calculatePerceptualHash(pixelsB);

    expect(hashA.length).toBe(16);
    expect(comparePerceptualHashes(hashA, hashB)).toBe(1.0);
  });

  it('evaluates visual drift correctly with high similarity', () => {
    const mockProfile: ContinuityProfile = {
      id: 'char-1',
      name: 'Kai',
      kind: 'character',
      version: 1,
      description: 'Protagonist',
      lockedAttributes: {},
      forbiddenDeviations: [],
      references: [
        {
          assetId: 'asset-1',
          role: 'identity',
          rank: 1,
          canonical: true,
          source: 'manual',
          assetHash: 'ffff0000ffff0000',
          createdAt: Date.now(),
        },
      ],
      provenance: {
        source: 'manual',
        importedAt: Date.now(),
      },
      updatedAt: Date.now(),
    };

    const assessment = evaluateVisualDrift(1, mockProfile, {
      pHash: 'ffff0000ffff0000',
    });

    expect(assessment.confidenceScore).toBeGreaterThanOrEqual(80);
    expect(assessment.driftStatus).toBe('in-character');
    expect(assessment.detectedDeviations.length).toBe(0);
  });
});
