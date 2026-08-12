import { beforeEach, describe, expect, it } from 'vitest';
import type { Asset, ContinuityOverrideRecord, ProductionRun } from '@core/types';
import { productionPreflightService } from './productionPreflightService';

const run = (overrides: Partial<ProductionRun> = {}): ProductionRun =>
  ({
    id: 'run-1',
    status: 'awaiting-approval',
    brief: 'A rain-soaked pursuit.',
    assetIds: [],
    shots: [
      {
        id: 1,
        camera: 'Dolly forward',
        generationRequest: {
          mode: 'text-to-video',
          modelId: 'veo-3.1-quality',
          prompt: 'A detective walks through rain with distant sirens and tense ambience.',
          negativePrompt: 'No text, no logos.',
          aspectRatio: '16:9',
          resolution: '720p',
          durationSeconds: 8,
          referenceAssetIds: [],
        },
        takes: [],
      },
    ],
    cost: { estimatedUsd: 3.2, approvedUsd: 0, recordedUsd: 0, pricingEffectiveDate: '2026-07-11' },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }) as ProductionRun;

describe('productionPreflightService', () => {
  beforeEach(() => localStorage.clear());
  it('returns all nine reproducible actionable categories', () => {
    const first = productionPreflightService.analyze({ run: run(), assets: [] });
    const second = productionPreflightService.analyze({ run: run(), assets: [] });
    expect(first.categories.map((result) => result.category)).toEqual([
      'prompt-clarity',
      'continuity',
      'camera',
      'motion',
      'audio',
      'safety',
      'capability',
      'cost',
      'asset-readiness',
    ]);
    expect(first.reproducibilityKey).toBe(second.reproducibilityKey);
    expect(first.recommendations[0].patch).toMatchObject({
      field: 'modelId',
      value: 'veo-3.1-fast',
    });
  });

  it('blocks missing assets and cost overruns before approval', () => {
    const broken = run({
      cost: {
        estimatedUsd: 3.2,
        approvedUsd: 0.5,
        recordedUsd: 0,
        pricingEffectiveDate: '2026-07-11',
      },
    });
    broken.shots[0].generationRequest.mode = 'image-to-video';
    broken.shots[0].generationRequest.firstFrameAssetId = 'missing';
    const result = productionPreflightService.analyze({ run: broken, assets: [] });
    expect(result.canApprove).toBe(false);
    expect(
      result.categories.filter((item) => item.status === 'blocked').map((item) => item.category),
    ).toEqual(expect.arrayContaining(['cost', 'asset-readiness']));
  });

  it('applies and undoes typed local patches without submitting work', () => {
    const source = run();
    const patch = productionPreflightService.analyze({ run: source, assets: [] }).recommendations[0]
      .patch!;
    const applied = productionPreflightService.applyPatch(source, patch);
    expect(applied.shots[0].generationRequest.modelId).toBe('veo-3.1-fast');
    expect(
      productionPreflightService.undoPatch(applied, patch).shots[0].generationRequest.modelId,
    ).toBe('veo-3.1-quality');
  });

  it('tracks whether an applied recommendation improves the accepted take', () => {
    const source = run();
    source.shots[0].takes = [
      {
        id: 'baseline',
        review: { overallScore: 62 },
      } as ProductionRun['shots'][number]['takes'][number],
    ];
    const recommendation = productionPreflightService.analyze({ run: source, assets: [] })
      .recommendations[0];
    productionPreflightService.trackAppliedRecommendation(source, recommendation);
    const [impact] = productionPreflightService.recordAcceptedTakeImpact(
      source.id,
      1,
      'accepted',
      81,
    );
    expect(impact).toMatchObject({
      recommendationId: recommendation.id,
      baselineScore: 62,
      acceptedScore: 81,
      scoreDelta: 19,
      improved: true,
    });
  });

  it('reports continuity blockers, warnings, matching overrides, and lock drift', () => {
    const source = run({
      shots: [
        {
          ...run().shots[0],
          continuitySnapshot: {
            schemaVersion: 1,
            shotId: 1,
            profileVersions: { hero: 2 },
            profileIds: ['hero'],
            referenceAssetIds: ['hero-ref'],
            referenceAssetHashes: { 'hero-ref': 'hash-1' },
            lockFingerprint: 'lock-1',
            promptFragment: 'hero',
            snapshotHash: 'snapshot-1',
            createdAt: 1,
          },
          continuityReport: {
            schemaVersion: 1,
            shotId: 1,
            status: 'warning',
            issues: [
              {
                id: 'soft-drift',
                code: 'soft-drift',
                severity: 'warning',
                message: 'Wardrobe may drift.',
              },
              {
                id: 'info',
                code: 'snapshot-changed',
                severity: 'info',
                message: 'Snapshot is informational.',
              },
            ],
            candidateReferenceAssetIds: ['hero-ref'],
            selectedReferenceAssetIds: ['hero-ref'],
            snapshotHash: 'snapshot-1',
            generatedAt: 1,
          },
        },
        {
          ...run().shots[0],
          id: 2,
          continuitySnapshot: {
            schemaVersion: 1,
            shotId: 2,
            profileVersions: { location: 1 },
            profileIds: ['location'],
            referenceAssetIds: [],
            referenceAssetHashes: {},
            lockFingerprint: 'lock-2',
            promptFragment: 'location',
            snapshotHash: 'snapshot-2',
            createdAt: 1,
          },
          continuityReport: {
            schemaVersion: 1,
            shotId: 2,
            status: 'blocked',
            issues: [
              {
                id: 'missing-reference',
                code: 'reference-missing',
                severity: 'blocking',
                message: 'A locked reference is missing.',
              },
            ],
            candidateReferenceAssetIds: [],
            selectedReferenceAssetIds: [],
            snapshotHash: 'snapshot-2',
            generatedAt: 1,
          },
        },
      ],
    });
    const matchingOverride: ContinuityOverrideRecord = {
      id: 'override-1',
      shotId: 1,
      snapshotHash: 'snapshot-1',
      issueCodes: ['soft-drift'],
      reason: 'The director approved the intentional wardrobe variation.',
      createdAt: 2,
    };
    const result = productionPreflightService.analyze({
      run: source,
      assets: [{ id: 'hero-ref', type: 'image', name: 'Hero', mimeType: 'image/png' } as Asset],
      locks: { wardrobe: 'silver coat' },
      continuityOverrides: [
        matchingOverride,
        { ...matchingOverride, id: 'stale', snapshotHash: 'old-snapshot' },
      ],
    });

    expect(result.continuity.reportCount).toBe(2);
    expect(result.continuity.blockers).toEqual(['Shot 2: A locked reference is missing.']);
    expect(result.continuity.warnings).toEqual(
      expect.arrayContaining([
        'Shot 1: Wardrobe may drift.',
        'Shot 1 does not mention locked wardrobe: silver coat.',
        'Shot 2 does not mention locked wardrobe: silver coat.',
      ]),
    );
    expect(result.continuity.overrideRecords).toEqual([matchingOverride]);
    expect(result.categories.find((item) => item.category === 'continuity')).toMatchObject({
      status: 'blocked',
    });
    expect(result.canApprove).toBe(false);
  });

  it('validates continuity overrides and handles recommendation lifecycle edge cases', () => {
    const source = run({
      shots: [
        {
          ...run().shots[0],
          continuitySnapshot: {
            schemaVersion: 1,
            shotId: 1,
            profileVersions: {},
            profileIds: [],
            referenceAssetIds: [],
            referenceAssetHashes: {},
            lockFingerprint: 'lock',
            promptFragment: 'prompt',
            snapshotHash: 'snapshot',
            createdAt: 1,
          },
          continuityReport: {
            schemaVersion: 1,
            shotId: 1,
            status: 'warning',
            issues: [
              {
                id: 'soft-drift',
                code: 'soft-drift',
                severity: 'warning',
                message: 'A soft drift is accepted.',
              },
            ],
            candidateReferenceAssetIds: [],
            selectedReferenceAssetIds: [],
            snapshotHash: 'snapshot',
            generatedAt: 1,
          },
        },
      ],
    });
    expect(
      productionPreflightService.createContinuityOverride(source, 1, '  Approved by director.  '),
    ).toMatchObject({
      shotId: 1,
      snapshotHash: 'snapshot',
      issueCodes: ['soft-drift'],
      reason: 'Approved by director.',
    });
    expect(() => productionPreflightService.createContinuityOverride(run(), 1, 'reason')).toThrow(
      /snapshot is required/,
    );
    expect(() =>
      productionPreflightService.createContinuityOverride(
        { ...source, shots: [{ ...source.shots[0], continuityReport: undefined }] },
        1,
        'reason',
      ),
    ).toThrow(/snapshot is required/);
    expect(() =>
      productionPreflightService.createContinuityOverride(
        {
          ...source,
          shots: [
            {
              ...source.shots[0],
              continuityReport: { ...source.shots[0].continuityReport!, issues: [] },
            },
          ],
        },
        1,
        'reason',
      ),
    ).toThrow(/no soft continuity warning/);
    expect(() => productionPreflightService.createContinuityOverride(source, 1, '  ')).toThrow(
      /override reason is required/,
    );

    const noPatch = {
      id: 'info',
      category: 'prompt-clarity' as const,
      severity: 'info' as const,
      reason: 'No patch',
      suggestion: 'No action',
    };
    expect(productionPreflightService.trackAppliedRecommendation(source, noPatch)).toBeNull();
    expect(
      productionPreflightService.trackAppliedRecommendation(source, {
        ...noPatch,
        patch: { target: 'shot-request', shotId: 99, field: 'prompt', value: 'x' },
      }),
    ).toBeNull();
    expect(
      productionPreflightService.undoPatch(source, {
        target: 'shot-request',
        shotId: 1,
        field: 'prompt',
        value: 'new',
      }),
    ).toBe(source);
    productionPreflightService.trackAppliedRecommendation(source, {
      ...noPatch,
      id: 'tracked',
      patch: { target: 'shot-request', shotId: 1, field: 'prompt', value: 'new' },
    });
    expect(productionPreflightService.getRecommendationImpacts(source.id)).toHaveLength(1);
    productionPreflightService.discardTrackedRecommendation(source.id, 'tracked');
    expect(productionPreflightService.getRecommendationImpacts(source.id)).toHaveLength(0);
    localStorage.setItem('v8-production-recommendation-impact', '{broken');
    expect(productionPreflightService.getRecommendationImpacts(source.id)).toEqual([]);
  });

  it('keeps soft continuity warnings out of approval until a current override exists', () => {
    const source = run({
      shots: [
        {
          ...run().shots[0],
          continuitySnapshot: {
            schemaVersion: 1,
            shotId: 1,
            profileVersions: { look: 1 },
            profileIds: ['look'],
            referenceAssetIds: [],
            referenceAssetHashes: {},
            lockFingerprint: 'lock',
            promptFragment: 'Look',
            snapshotHash: 'snapshot-soft',
            createdAt: 1,
          },
          continuityReport: {
            schemaVersion: 1,
            shotId: 1,
            status: 'warning',
            issues: [
              {
                id: 'soft-drift',
                code: 'soft-drift',
                severity: 'warning',
                message: 'Lighting drift is intentional.',
              },
            ],
            candidateReferenceAssetIds: [],
            selectedReferenceAssetIds: [],
            snapshotHash: 'snapshot-soft',
            generatedAt: 1,
          },
        },
      ],
    });
    const unresolved = productionPreflightService.analyze({ run: source, assets: [] });
    expect(unresolved.canApprove).toBe(false);
    expect(unresolved.continuity.unresolvedWarnings).toEqual([
      'Shot 1: Lighting drift is intentional.',
    ]);

    const resolved = productionPreflightService.analyze({
      run: {
        ...source,
        continuityOverrides: [
          {
            id: 'override-soft',
            shotId: 1,
            snapshotHash: 'snapshot-soft',
            issueCodes: ['soft-drift'],
            reason: 'Approved by the director.',
            createdAt: 2,
          },
        ],
      },
      assets: [],
    });
    expect(resolved.canApprove).toBe(true);
    expect(resolved.continuity.unresolvedWarnings).toEqual([]);
  });

  it('records accepted impacts without scores and returns only matching records', () => {
    const source = run();
    const recommendation = productionPreflightService.analyze({ run: source, assets: [] })
      .recommendations[0];
    productionPreflightService.trackAppliedRecommendation(source, recommendation);
    expect(
      productionPreflightService.recordAcceptedTakeImpact(source.id, 1, 'accepted'),
    ).toMatchObject([{ acceptedTakeId: 'accepted', scoreDelta: undefined, improved: undefined }]);
    expect(productionPreflightService.recordAcceptedTakeImpact(source.id, 99, 'accepted')).toEqual(
      [],
    );
  });
});
