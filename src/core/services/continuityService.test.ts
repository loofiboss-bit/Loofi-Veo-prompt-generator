import { describe, expect, it } from 'vitest';

import type { Asset, CharacterProfile, ProductionBible, ProductionShot } from '@core/types';
import { continuityService, fingerprintAsset } from './continuityService';

const asset = (id: string): Asset => ({
  id,
  type: 'image',
  name: `${id}.png`,
  url: `data:image/png;base64,${id}`,
  data: id,
  mimeType: 'image/png',
});

const shot = (overrides: Partial<ProductionShot> = {}): ProductionShot => ({
  id: 1,
  title: 'Continuity test shot',
  prompt: 'A subject walks through a rain-soaked street.',
  negativePrompt: 'no flicker',
  camera: 'Slow dolly in',
  durationSeconds: 8,
  status: 'awaiting-approval',
  generationRequest: {
    mode: 'text-to-video',
    modelId: 'veo-3.1-fast',
    prompt: 'A subject walks through a rain-soaked street.',
    negativePrompt: 'no flicker',
    aspectRatio: '16:9',
    resolution: '720p',
    durationSeconds: 8,
    referenceAssetIds: [],
  },
  takes: [],
  ...overrides,
});

const migratedCharacter: CharacterProfile = {
  id: 'mara',
  name: 'Mara',
  attributes: {
    age: '30',
    gender: 'woman',
    ethnicity: 'Nordic',
    bodyType: 'athletic',
    skinTone: 'fair',
  },
  appearance: { hair: 'short black hair', eyes: 'green', distinguishingFeatures: 'scar' },
  wardrobe: 'yellow raincoat',
  visualPrompt: 'A determined detective.',
  fixedSeed: null,
  negativePrompt: 'no hat',
  thumbnailUrl: 'asset:hero-ref',
};

describe('continuityService', () => {
  it('migrates legacy banks once and preserves the canonical Bible on restart', () => {
    const first = continuityService.normalizeBible(
      { characterBank: [migratedCharacter], locationBank: [], visualDNA: [] },
      100,
    );
    const second = continuityService.normalizeBible(
      { productionBible: first.productionBible, characterBank: [migratedCharacter] },
      200,
    );

    expect(first.productionBible.profiles).toHaveLength(1);
    expect(first.productionBible.profiles[0]).toMatchObject({
      id: 'continuity-character-mara',
      name: 'Mara',
      references: [{ assetId: 'hero-ref', role: 'identity' }],
    });
    expect(second.changed).toBe(false);
    expect(second.productionBible).toEqual(first.productionBible);
  });

  it('adds a legacy location that is missing from an already populated Bible without replacing it', () => {
    const existing = continuityService.normalizeBible(
      { characterBank: [migratedCharacter] },
      100,
    ).productionBible;
    const merged = continuityService.normalizeBible(
      {
        productionBible: existing,
        locationBank: [
          { id: 'market', name: 'Night market', description: 'Wet lights', visualTags: ['rain'] },
        ],
      },
      200,
    );

    expect(merged.productionBible.profiles.map((profile) => profile.id)).toEqual([
      'continuity-character-mara',
      'continuity-location-market',
    ]);
    expect(merged.productionBible.profiles[0].description).toBe('A determined detective.');
  });

  it('bumps profile versions and preserves promoted references when a profile is edited', () => {
    const initial = continuityService.createProfileFromAsset({
      name: 'Hero',
      kind: 'character',
      assetId: 'hero-canonical',
      now: 100,
    });
    const bible = continuityService.upsertProfile(
      continuityService.createEmptyBible(100),
      initial,
      100,
    );
    const updated = continuityService.upsertProfile(
      bible,
      {
        ...initial,
        description: 'Updated wardrobe and expression.',
        references: [
          ...initial.references,
          {
            assetId: 'hero-candidate',
            role: 'identity',
            rank: 1,
            canonical: false,
            source: 'accepted-take',
            createdAt: 200,
          },
        ],
      },
      200,
    );

    expect(updated.profiles[0]).toMatchObject({
      version: 2,
      description: 'Updated wardrobe and expression.',
    });
    expect(updated.profiles[0].references.map((reference) => reference.assetId)).toEqual([
      'hero-canonical',
      'hero-candidate',
    ]);
    expect(
      continuityService.upsertProfile(updated, { ...updated.profiles[0] }, 300).profiles[0].version,
    ).toBe(2);
  });

  it('compiles a deterministic snapshot and keeps frame inputs separate from identity references', () => {
    const referenceAsset = asset('hero-ref');
    const bible: ProductionBible = {
      schemaVersion: 1,
      profiles: [
        {
          id: 'hero',
          name: 'Hero',
          kind: 'character',
          version: 3,
          description: 'Canonical hero',
          lockedAttributes: { wardrobe: 'yellow raincoat' },
          forbiddenDeviations: ['no hat'],
          references: [
            {
              assetId: referenceAsset.id,
              role: 'identity',
              rank: 0,
              canonical: true,
              source: 'manual',
              createdAt: 1,
            },
          ],
          provenance: { source: 'manual', importedAt: 1 },
          updatedAt: 1,
        },
      ],
      lockedDefaults: {},
      updatedAt: 1,
    };
    const boundShot = shot({
      generationRequest: {
        ...shot().generationRequest,
        firstFrameAssetId: 'first-frame',
      },
      continuityBinding: { profileIds: ['hero'], explicitReferenceAssetIds: [], locks: {} },
    });
    const firstFrameAsset = asset('first-frame');
    const first = continuityService.compileShot({
      shot: boundShot,
      bible,
      assets: [referenceAsset, firstFrameAsset],
      now: 42,
    });
    const second = continuityService.compileShot({
      shot: boundShot,
      bible,
      assets: [referenceAsset, firstFrameAsset],
      now: 99,
    });

    expect(first.report.status).toBe('ready');
    expect(first.request.firstFrameAssetId).toBe('first-frame');
    expect(first.request.referenceAssetIds).toEqual(['hero-ref']);
    expect(first.snapshot.snapshotHash).toBe(second.snapshot.snapshotHash);
    expect(first.request.prompt).toBe(second.request.prompt);
    expect(fingerprintAsset(referenceAsset)).toBe(first.snapshot.referenceAssetHashes['hero-ref']);
  });

  it('blocks a binding when a required reference is missing or unreadable', () => {
    const bible: ProductionBible = {
      schemaVersion: 1,
      profiles: [
        {
          id: 'hero',
          name: 'Hero',
          kind: 'character',
          version: 1,
          description: '',
          lockedAttributes: {},
          forbiddenDeviations: [],
          references: [
            {
              assetId: 'missing-ref',
              role: 'identity',
              rank: 0,
              canonical: true,
              source: 'manual',
              createdAt: 1,
            },
          ],
          provenance: { source: 'manual', importedAt: 1 },
          updatedAt: 1,
        },
      ],
      lockedDefaults: {},
      updatedAt: 1,
    };
    const result = continuityService.compileShot({
      shot: shot({
        continuityBinding: { profileIds: ['hero'], explicitReferenceAssetIds: [], locks: {} },
      }),
      bible,
      assets: [],
      now: 42,
    });

    expect(result.report.status).toBe('blocked');
    expect(result.report.issues.map((item) => item.code)).toContain('reference-missing');
  });

  it('blocks ambiguous reference capacity instead of dropping references', () => {
    const assets = ['one', 'two', 'three', 'four'].map(asset);
    const bible: ProductionBible = {
      schemaVersion: 1,
      profiles: assets.map((item, index) => ({
        id: `profile-${index}`,
        name: `Profile ${index}`,
        kind: 'prop' as const,
        version: 1,
        description: '',
        lockedAttributes: {},
        forbiddenDeviations: [],
        references: [
          {
            assetId: item.id,
            role: 'prop' as const,
            rank: 0,
            canonical: true,
            source: 'manual' as const,
            createdAt: 1,
          },
        ],
        provenance: { source: 'manual' as const, importedAt: 1 },
        updatedAt: 1,
      })),
      lockedDefaults: {},
      updatedAt: 1,
    };
    const result = continuityService.compileShot({
      shot: shot({
        continuityBinding: {
          profileIds: bible.profiles.map((profile) => profile.id),
          explicitReferenceAssetIds: [],
          locks: {},
        },
      }),
      bible,
      assets,
      now: 42,
    });

    expect(result.report.status).toBe('blocked');
    expect(result.report.issues.map((item) => item.code)).toContain('reference-capacity');
    expect(result.request.referenceAssetIds).toEqual([]);
    expect(result.report.candidateReferenceAssetIds).toHaveLength(4);
  });

  it('uses an explicit reference selection to resolve an ambiguous profile set', () => {
    const assets = ['one', 'two', 'three', 'four'].map(asset);
    const bible: ProductionBible = {
      schemaVersion: 1,
      profiles: [
        {
          id: 'props',
          name: 'Props',
          kind: 'prop',
          version: 1,
          description: '',
          lockedAttributes: {},
          forbiddenDeviations: [],
          references: assets.map((item, index) => ({
            assetId: item.id,
            role: 'prop' as const,
            rank: index,
            canonical: index === 0,
            source: 'manual' as const,
            createdAt: 1,
          })),
          provenance: { source: 'manual', importedAt: 1 },
          updatedAt: 1,
        },
      ],
      lockedDefaults: {},
      updatedAt: 1,
    };
    const result = continuityService.compileShot({
      shot: shot({
        continuityBinding: {
          profileIds: ['props'],
          explicitReferenceAssetIds: ['one', 'two', 'three'],
          locks: {},
        },
      }),
      bible,
      assets,
      now: 42,
    });

    expect(result.report.status).toBe('ready');
    expect(result.request.referenceAssetIds).toEqual(['one', 'two', 'three']);
  });

  it('preserves legacy request references when no continuity binding exists', () => {
    const legacyReference = asset('legacy-ref');
    const result = continuityService.compileShot({
      shot: shot({
        generationRequest: {
          ...shot().generationRequest,
          referenceAssetIds: [legacyReference.id],
        },
      }),
      bible: continuityService.createEmptyBible(1),
      assets: [legacyReference],
      now: 42,
    });

    expect(result.report.status).toBe('ready');
    expect(result.request.referenceAssetIds).toEqual(['legacy-ref']);
  });

  it('blocks contradictory locks before paid approval', () => {
    const bible: ProductionBible = {
      schemaVersion: 1,
      profiles: [
        {
          id: 'hero',
          name: 'Hero',
          kind: 'character',
          version: 1,
          description: '',
          lockedAttributes: { wardrobe: 'yellow coat' },
          forbiddenDeviations: [],
          references: [],
          provenance: { source: 'manual', importedAt: 1 },
          updatedAt: 1,
        },
      ],
      lockedDefaults: { wardrobe: 'blue coat' },
      updatedAt: 1,
    };
    const result = continuityService.compileShot({
      shot: shot({
        continuityBinding: { profileIds: ['hero'], explicitReferenceAssetIds: [], locks: {} },
      }),
      bible,
      assets: [],
      now: 42,
    });

    expect(result.report.status).toBe('blocked');
    expect(result.report.issues.map((item) => item.code)).toContain('lock-conflict');
  });

  it('reports soft style and lighting drift without blocking compilation', () => {
    const result = continuityService.compileShot({
      shot: shot({
        continuityBinding: {
          profileIds: ['look'],
          explicitReferenceAssetIds: [],
          locks: { lighting: 'soft blue moonlight' },
        },
      }),
      bible: {
        schemaVersion: 1,
        profiles: [
          {
            id: 'look',
            name: 'Night look',
            kind: 'look',
            version: 1,
            description: 'Cool night palette',
            lockedAttributes: { style: '35mm film grain' },
            forbiddenDeviations: [],
            references: [],
            provenance: { source: 'manual', importedAt: 1 },
            updatedAt: 1,
          },
        ],
        lockedDefaults: {},
        updatedAt: 1,
      },
      assets: [],
      now: 42,
    });

    expect(result.report.status).toBe('warning');
    expect(result.report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'soft-drift', severity: 'warning', field: 'style' }),
        expect.objectContaining({ code: 'soft-drift', severity: 'warning', field: 'lighting' }),
      ]),
    );
  });
});
