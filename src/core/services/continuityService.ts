import type {
  Asset,
  CharacterProfile,
  ContinuityIssue,
  ContinuityProfileKind,
  ContinuityProfile,
  ContinuityReference,
  ContinuityReferenceSource,
  ContinuityReport,
  ContinuitySnapshot,
  LocationProfile,
  ProductionBible,
  ProductionShot,
  ShotContinuityBinding,
  VisualDNA,
} from '@core/types';

const BIBLE_SCHEMA_VERSION = 1 as const;
const SNAPSHOT_SCHEMA_VERSION = 1 as const;
const MAX_VEO_REFERENCES = 3;
const SOFT_DRIFT_KEY =
  /(?:style|look|visual|palette|color|lighting|light|camera|lens|text|dialogue|caption|title|tone)/i;

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map(
      (key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
    )
    .join(',')}}`;
};

/** A deterministic local fingerprint; it is not a cryptographic secret or authentication token. */
export const continuityFingerprint = (value: unknown): string => {
  const input = stableStringify(value);
  let first = 0x811c9dc5;
  let second = 0x01000193;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 0x01000193);
    second ^= code + index;
    second = Math.imul(second, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0)
    .toString(16)
    .padStart(8, '0')}`;
};

export const fingerprintAsset = (asset: Asset): string =>
  continuityFingerprint({
    id: asset.id,
    mimeType: asset.mimeType,
    data: asset.data || '',
    url: asset.url || '',
    storageKey: asset.storageKey || '',
  });

const normalizeTextMap = (values: Record<string, string> | undefined): Record<string, string> =>
  Object.fromEntries(
    Object.entries(values ?? {})
      .map(([key, value]) => [key.trim(), String(value).trim()] as const)
      .filter(([key, value]) => Boolean(key && value)),
  );

const reference = (
  assetId: string,
  role: ContinuityReference['role'],
  source: ContinuityReference['source'],
  createdAt: number,
  canonical = true,
): ContinuityReference => ({
  assetId,
  role,
  rank: 0,
  canonical,
  source,
  createdAt,
});

const profileId = (kind: string, id: string): string => `continuity-${kind}-${id}`;

const characterProfile = (character: CharacterProfile, now: number): ContinuityProfile => ({
  id: profileId('character', character.id),
  name: character.name,
  kind: 'character',
  version: 1,
  description: character.visualPrompt,
  lockedAttributes: normalizeTextMap({
    age: character.attributes?.age,
    gender: character.attributes?.gender,
    ethnicity: character.attributes?.ethnicity,
    bodyType: character.attributes?.bodyType,
    skinTone: character.attributes?.skinTone,
    hair: character.appearance?.hair,
    eyes: character.appearance?.eyes,
    distinguishingFeatures: character.appearance?.distinguishingFeatures,
    wardrobe: character.wardrobe,
  }),
  forbiddenDeviations: (character.negativePrompt ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  references: character.thumbnailUrl?.startsWith('asset:')
    ? [reference(character.thumbnailUrl.slice(6), 'identity', 'imported', now)]
    : [],
  provenance: {
    source: 'legacy-character-bank',
    sourceId: character.id,
    importedAt: now,
  },
  updatedAt: now,
});

const locationProfile = (location: LocationProfile, now: number): ContinuityProfile => ({
  id: profileId('location', location.id),
  name: location.name,
  kind: 'location',
  version: 1,
  description: location.description ?? '',
  lockedAttributes: normalizeTextMap({
    description: location.description,
    visualTags: (location.visualTags ?? []).join(', '),
  }),
  forbiddenDeviations: [],
  references: location.referenceImage?.startsWith('asset:')
    ? [reference(location.referenceImage.slice(6), 'location', 'imported', now)]
    : [],
  provenance: {
    source: 'legacy-location-bank',
    sourceId: location.id,
    importedAt: now,
  },
  updatedAt: now,
});

const visualDnaProfile = (dna: VisualDNA, now: number): ContinuityProfile => ({
  id: profileId('look', dna.id),
  name: dna.name,
  kind: 'look',
  version: 1,
  description: 'Imported visual DNA profile.',
  lockedAttributes: normalizeTextMap(
    Object.fromEntries(
      Object.entries(dna.styleParams ?? {}).map(([key, value]) => [key, String(value ?? '')]),
    ),
  ),
  forbiddenDeviations: [],
  references: [],
  provenance: {
    source: 'legacy-visual-dna',
    sourceId: dna.id,
    importedAt: now,
  },
  updatedAt: now,
});

const dedupeProfiles = (profiles: ContinuityProfile[]): ContinuityProfile[] => {
  const normalized = profiles.map((profile, index) => {
    const id = String(profile.id ?? '').trim() || `continuity-profile-${index + 1}`;
    const references = (Array.isArray(profile.references) ? profile.references : [])
      .filter((item) => typeof item.assetId === 'string' && item.assetId.trim())
      .map((item, referenceIndex) => ({
        ...item,
        assetId: item.assetId.trim(),
        rank: Number.isInteger(item.rank) && item.rank >= 0 ? item.rank : referenceIndex,
      }));
    return {
      ...profile,
      id,
      version: Number.isInteger(profile.version) && profile.version > 0 ? profile.version : 1,
      lockedAttributes: normalizeTextMap(profile.lockedAttributes),
      forbiddenDeviations: Array.from(new Set((profile.forbiddenDeviations ?? []).filter(Boolean))),
      references,
    };
  });
  const byId = new Map<string, ContinuityProfile>();
  normalized.forEach((profile) => {
    const previous = byId.get(profile.id);
    if (!previous) {
      byId.set(profile.id, profile);
      return;
    }
    const references = [...previous.references];
    profile.references.forEach((reference) => {
      if (!references.some((item) => item.assetId === reference.assetId))
        references.push(reference);
    });
    byId.set(profile.id, {
      ...previous,
      version: Math.max(previous.version, profile.version),
      lockedAttributes: { ...previous.lockedAttributes, ...profile.lockedAttributes },
      forbiddenDeviations: Array.from(
        new Set([...previous.forbiddenDeviations, ...profile.forbiddenDeviations]),
      ),
      references: references.map((reference, referenceIndex) => ({
        ...reference,
        rank: referenceIndex,
      })),
      updatedAt: Math.max(previous.updatedAt, profile.updatedAt),
    });
  });
  return Array.from(byId.values());
};

export interface LegacyContinuityInput {
  productionBible?: ProductionBible;
  characterBank?: CharacterProfile[];
  locationBank?: LocationProfile[];
  visualDNA?: VisualDNA[];
}

export interface ContinuityMigrationResult {
  productionBible: ProductionBible;
  changed: boolean;
  migration: { from: string; to: '10'; migratedAt: number; notes: string[] };
}

export interface CompileShotResult {
  request: ProductionShot['generationRequest'];
  snapshot: ContinuitySnapshot;
  report: ContinuityReport;
}

export interface CompileShotInput {
  shot: ProductionShot;
  bible: ProductionBible;
  assets: Asset[];
  now?: number;
}

const defaultBinding = (): ShotContinuityBinding => ({
  profileIds: [],
  explicitReferenceAssetIds: [],
  locks: {},
});

const issue = (
  code: ContinuityIssue['code'],
  severity: ContinuityIssue['severity'],
  message: string,
  extra: Partial<ContinuityIssue> = {},
): ContinuityIssue => ({
  id: `continuity-${code}-${continuityFingerprint({ code, message, ...extra })}`,
  code,
  severity,
  message,
  ...extra,
});

class ContinuityService {
  private static instance: ContinuityService;

  static getInstance(): ContinuityService {
    if (!ContinuityService.instance) ContinuityService.instance = new ContinuityService();
    return ContinuityService.instance;
  }

  createEmptyBible(now = Date.now()): ProductionBible {
    return {
      schemaVersion: BIBLE_SCHEMA_VERSION,
      profiles: [],
      lockedDefaults: {},
      updatedAt: now,
    };
  }

  normalizeBible(input: LegacyContinuityInput, now = Date.now()): ContinuityMigrationResult {
    const existing = input.productionBible;
    const legacyProfiles = dedupeProfiles([
      ...(input.characterBank ?? []).map((item) => characterProfile(item, now)),
      ...(input.locationBank ?? []).map((item) => locationProfile(item, now)),
      ...(input.visualDNA ?? []).map((item) => visualDnaProfile(item, now)),
    ]);
    if (existing && Array.isArray(existing.profiles)) {
      const existingIds = new Set(existing.profiles.map((profile) => profile.id));
      const missingLegacyProfiles = legacyProfiles.filter(
        (profile) => !existingIds.has(profile.id),
      );
      const profiles = dedupeProfiles([...existing.profiles, ...missingLegacyProfiles]);
      const projectLookProfileId =
        existing.projectLookProfileId ?? profiles.find((profile) => profile.kind === 'look')?.id;
      const productionBible: ProductionBible = {
        ...existing,
        schemaVersion: BIBLE_SCHEMA_VERSION,
        profiles,
        projectLookProfileId,
        lockedDefaults: normalizeTextMap(existing.lockedDefaults),
        migratedFrom: Array.from(
          new Set([
            ...(existing.migratedFrom ?? []),
            ...(missingLegacyProfiles.length > 0
              ? ['characterBank', 'locationBank', 'visualDNA']
              : []),
          ]),
        ),
        updatedAt: existing.updatedAt || now,
      };
      const changed = JSON.stringify(productionBible) !== JSON.stringify(existing);
      return {
        productionBible,
        changed,
        migration: {
          from: '10',
          to: '10',
          migratedAt: now,
          notes: changed
            ? [
                missingLegacyProfiles.length > 0
                  ? 'Imported missing legacy profiles without replacing canonical records.'
                  : 'Normalized Production Bible profiles and references.',
              ]
            : [],
        },
      };
    }

    const profiles = legacyProfiles;
    const look = profiles.find((profile) => profile.kind === 'look');
    return {
      productionBible: {
        schemaVersion: BIBLE_SCHEMA_VERSION,
        profiles,
        projectLookProfileId: look?.id,
        lockedDefaults: {},
        migratedFrom: ['characterBank', 'locationBank', 'visualDNA'],
        updatedAt: now,
      },
      changed: profiles.length > 0,
      migration: {
        from: '5-9',
        to: '10',
        migratedAt: now,
        notes: [
          'Imported legacy character, location, and visual DNA records.',
          'Kept legacy fields readable for compatibility; v10 writes the Production Bible.',
        ],
      },
    };
  }

  createProfileFromAsset(input: {
    id?: string;
    name: string;
    kind: ContinuityProfileKind;
    description?: string;
    assetId: string;
    source?: ContinuityReferenceSource;
    lockedAttributes?: Record<string, string>;
    now?: number;
  }): ContinuityProfile {
    const now = input.now ?? Date.now();
    return {
      id: input.id ?? `continuity-${input.kind}-${continuityFingerprint(`${input.name}-${now}`)}`,
      name: input.name.trim() || 'Untitled continuity profile',
      kind: input.kind,
      version: 1,
      description: input.description?.trim() ?? '',
      lockedAttributes: normalizeTextMap(input.lockedAttributes),
      forbiddenDeviations: [],
      references: [
        reference(
          input.assetId,
          input.kind === 'look' ? 'style' : input.kind === 'character' ? 'identity' : input.kind,
          input.source ?? 'manual',
          now,
        ),
      ],
      provenance: { source: input.source ?? 'manual', importedAt: now },
      updatedAt: now,
    };
  }

  createProfileFromCharacter(character: CharacterProfile, now = Date.now()): ContinuityProfile {
    return characterProfile(character, now);
  }

  createProfileFromLocation(location: LocationProfile, now = Date.now()): ContinuityProfile {
    return locationProfile(location, now);
  }

  createProfileFromVisualDNA(dna: VisualDNA, now = Date.now()): ContinuityProfile {
    return visualDnaProfile(dna, now);
  }

  upsertProfile(
    bible: ProductionBible,
    profile: ContinuityProfile,
    now = Date.now(),
  ): ProductionBible {
    const existing = bible.profiles.find((item) => item.id === profile.id);
    if (existing) {
      const mergedReferences = [...existing.references];
      profile.references.forEach((candidate) => {
        if (!mergedReferences.some((reference) => reference.assetId === candidate.assetId)) {
          mergedReferences.push(candidate);
        }
      });
      const candidate = {
        ...existing,
        ...profile,
        // A legacy editor may only know about its original thumbnail. Keep any
        // canonical references already promoted in Assets and append new ones.
        references: mergedReferences.map((reference, index) => ({
          ...reference,
          rank: index,
        })),
      };
      const changed =
        stableStringify({ ...existing, version: 0, updatedAt: 0 }) !==
        stableStringify({ ...candidate, version: 0, updatedAt: 0 });
      const nextProfile: ContinuityProfile = changed
        ? {
            ...candidate,
            version: Math.max(existing.version + 1, profile.version),
            updatedAt: now,
          }
        : existing;
      return this.normalizeBible(
        {
          productionBible: {
            ...bible,
            profiles: [...bible.profiles.filter((item) => item.id !== profile.id), nextProfile],
            updatedAt: changed ? now : bible.updatedAt,
          },
        },
        now,
      ).productionBible;
    }
    return this.normalizeBible(
      {
        productionBible: {
          ...bible,
          profiles: [...bible.profiles.filter((item) => item.id !== profile.id), profile],
          updatedAt: now,
        },
      },
      now,
    ).productionBible;
  }

  compileShot({ shot, bible, assets, now = Date.now() }: CompileShotInput): CompileShotResult {
    const hasBinding = Boolean(shot.continuityBinding);
    const binding = shot.continuityBinding ?? defaultBinding();
    const profileIds = Array.from(
      new Set([
        ...binding.profileIds,
        ...(binding.inheritedLookProfileId ? [binding.inheritedLookProfileId] : []),
        ...(bible.projectLookProfileId && !binding.inheritedLookProfileId
          ? [bible.projectLookProfileId]
          : []),
      ]),
    );
    const profiles = profileIds.map((id) => bible.profiles.find((profile) => profile.id === id));
    const issues: ContinuityIssue[] = [];
    profiles.forEach((profile, index) => {
      if (!profile) {
        issues.push(
          issue(
            'profile-missing',
            'blocking',
            `Continuity profile ${profileIds[index]} is missing.`,
            {
              profileId: profileIds[index],
            },
          ),
        );
      }
    });
    const validProfiles = profiles.filter((profile): profile is ContinuityProfile =>
      Boolean(profile),
    );

    const mergedLocks = new Map<string, { value: string; source: string }>();
    const addLocks = (values: Record<string, string>, source: string) => {
      Object.entries(values).forEach(([key, value]) => {
        const normalizedKey = key.trim();
        const normalizedValue = value.trim();
        if (!normalizedKey || !normalizedValue) return;
        const previous = mergedLocks.get(normalizedKey);
        if (previous && previous.value !== normalizedValue) {
          issues.push(
            issue(
              'lock-conflict',
              'blocking',
              `Continuity lock “${normalizedKey}” conflicts between ${previous.source} and ${source}.`,
              { field: normalizedKey },
            ),
          );
          return;
        }
        mergedLocks.set(normalizedKey, { value: normalizedValue, source });
      });
    };
    addLocks(bible.lockedDefaults, 'project defaults');
    validProfiles.forEach((profile) => addLocks(profile.lockedAttributes, profile.name));
    addLocks(binding.locks, 'shot binding');

    const profileReferenceAssetIds = Array.from(
      new Set(
        validProfiles
          .flatMap((profile) => profile.references.slice().sort((a, b) => a.rank - b.rank))
          .map((item) => item.assetId),
      ),
    );
    // An explicit selection is the user's deliberate resolution of an ambiguous profile set;
    // otherwise the deterministic profile order is used automatically.
    const candidateReferenceAssetIds = Array.from(
      new Set(
        binding.explicitReferenceAssetIds.length > 0
          ? binding.explicitReferenceAssetIds
          : hasBinding
            ? profileReferenceAssetIds
            : [...shot.generationRequest.referenceAssetIds, ...profileReferenceAssetIds],
      ),
    );
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    const referenceAssetHashes: Record<string, string> = {};
    const inputAssetIds = Array.from(
      new Set(
        [
          ...candidateReferenceAssetIds,
          shot.generationRequest.firstFrameAssetId,
          shot.generationRequest.lastFrameAssetId,
        ].filter((assetId): assetId is string => Boolean(assetId)),
      ),
    );
    inputAssetIds.forEach((assetId) => {
      const asset = assetMap.get(assetId);
      if (!asset) {
        issues.push(
          issue(
            'reference-missing',
            'blocking',
            `Continuity reference asset ${assetId} is missing.`,
            {
              assetId,
            },
          ),
        );
        return;
      }
      if (!asset.data && !asset.url && !asset.storageKey) {
        issues.push(
          issue(
            'reference-unreadable',
            'blocking',
            `Continuity reference asset ${asset.name} is unreadable.`,
            {
              assetId,
            },
          ),
        );
        return;
      }
      referenceAssetHashes[assetId] = fingerprintAsset(asset);
    });

    if (candidateReferenceAssetIds.length > MAX_VEO_REFERENCES) {
      issues.push(
        issue(
          'reference-capacity',
          'blocking',
          `This shot requires ${candidateReferenceAssetIds.length} reference images; Veo accepts at most ${MAX_VEO_REFERENCES}.`,
        ),
      );
    }

    const promptFragment = [
      validProfiles.length
        ? `Continuity profiles: ${validProfiles.map((profile) => profile.name).join(', ')}.`
        : '',
      ...Array.from(mergedLocks.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `Lock ${key}: ${value.value}.`),
      validProfiles.flatMap((profile) => profile.forbiddenDeviations).length
        ? `Avoid continuity deviations: ${Array.from(
            new Set(validProfiles.flatMap((profile) => profile.forbiddenDeviations)),
          ).join(', ')}.`
        : '',
    ]
      .filter(Boolean)
      .join(' ');
    const sourcePrompt = `${shot.generationRequest.prompt} ${shot.camera}`.toLowerCase();
    mergedLocks.forEach((lock, key) => {
      if (!SOFT_DRIFT_KEY.test(key) || sourcePrompt.includes(lock.value.toLowerCase())) return;
      issues.push(
        issue(
          'soft-drift',
          'warning',
          `Shot ${shot.id} may drift from locked ${key}: ${lock.value}.`,
          { field: key },
        ),
      );
    });
    const selectedReferenceAssetIds =
      candidateReferenceAssetIds.length <= MAX_VEO_REFERENCES ? candidateReferenceAssetIds : [];
    const lockFingerprint = continuityFingerprint(Object.fromEntries(mergedLocks));
    const snapshotSeed = {
      shotId: shot.id,
      profileVersions: Object.fromEntries(
        [...validProfiles]
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((profile) => [profile.id, profile.version]),
      ),
      profileIds,
      referenceAssetIds: selectedReferenceAssetIds,
      referenceAssetHashes,
      firstFrameAssetId: shot.generationRequest.firstFrameAssetId,
      lastFrameAssetId: shot.generationRequest.lastFrameAssetId,
      extensionSourceTakeId: shot.generationRequest.extensionSourceTakeId,
      lockFingerprint,
      promptFragment,
    };
    const snapshot: ContinuitySnapshot = {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      ...snapshotSeed,
      snapshotHash: continuityFingerprint(snapshotSeed),
      createdAt: now,
    };
    const compiledPrompt =
      promptFragment && shot.generationRequest.prompt.includes(promptFragment)
        ? shot.generationRequest.prompt
        : [shot.generationRequest.prompt.trim(), promptFragment].filter(Boolean).join('\n');
    const report: ContinuityReport = {
      schemaVersion: 1,
      shotId: shot.id,
      status: issues.some((item) => item.severity === 'blocking')
        ? 'blocked'
        : issues.some((item) => item.severity === 'warning')
          ? 'warning'
          : 'ready',
      issues,
      candidateReferenceAssetIds,
      selectedReferenceAssetIds,
      snapshotHash: snapshot.snapshotHash,
      generatedAt: now,
    };
    return {
      request: {
        ...shot.generationRequest,
        prompt: compiledPrompt,
        referenceAssetIds: selectedReferenceAssetIds,
      },
      snapshot,
      report,
    };
  }

  assertReady(report: ContinuityReport): void {
    const blockers = report.issues.filter((item) => item.severity === 'blocking');
    if (blockers.length > 0) {
      throw new Error(
        `Continuity preflight blocked: ${blockers.map((item) => item.message).join(' ')}`,
      );
    }
  }
}

export const continuityService = ContinuityService.getInstance();
