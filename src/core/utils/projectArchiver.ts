import JSZip from 'jszip';
import type {
  Asset,
  ProductionBible,
  ProductionRun,
  Project,
  PromptArtifactV1,
  PromptStudioHandoff,
  PromptState,
} from '@core/types';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { logger } from '@core/services/loggerService';
import { continuityService } from '@core/services/continuityService';
import { MODEL_CATALOG } from '@core/models/catalog';
import { migrateModelPreference } from '@core/models/migrations';

export const BUNDLE_SCHEMA_VERSION = 11;

export interface ProjectArchiveOptions {
  productionRuns?: ProductionRun[];
  productionBible?: ProductionBible;
  promptArtifacts?: PromptArtifactV1[];
  handoffs?: PromptStudioHandoff[];
  resolveAssetBlob?: (asset: Asset) => Promise<Blob | null>;
  extraFiles?: Record<string, string>;
  migrationHistory?: { from: string; to: string; migratedAt: number; notes?: string[] }[];
}

interface BundleManifest {
  format: 'loofi-project';
  schemaVersion: typeof BUNDLE_SCHEMA_VERSION;
  createdAt: number;
  appVersion: string;
  projectFile: 'project.json';
  assets: { id: string; path?: string; portableReference?: string; sha256?: string }[];
  checksums: Record<string, string>;
  modelCatalogSnapshot: typeof MODEL_CATALOG;
  pricingEffectiveDates: string[];
  migrationHistory: NonNullable<ProjectArchiveOptions['migrationHistory']>;
}

interface ProjectArchiveV11 {
  schemaVersion: typeof BUNDLE_SCHEMA_VERSION;
  project: Project;
  assets: Asset[];
  promptArtifacts?: PromptArtifactV1[];
  handoffs?: PromptStudioHandoff[];
  provenance: {
    productionRuns: ProductionRun[];
    productionBible: ProductionBible;
  };
  unknown?: Record<string, unknown>;
}

interface LegacyProjectArchive {
  version: string;
  timestamp: number;
  project: Project;
  assets: Asset[];
}

type ArchiveMigration = NonNullable<ProjectArchiveOptions['migrationHistory']>[number];

const replaceMediaReferences = <T>(value: T, urls: Map<string, string>): T => {
  const visit = (node: unknown): unknown => {
    if (typeof node === 'string') return urls.get(node) ?? node;
    if (Array.isArray(node)) return node.map(visit);
    if (node && typeof node === 'object')
      return Object.fromEntries(Object.entries(node).map(([key, item]) => [key, visit(item)]));
    return node;
  };
  return visit(value) as T;
};

const stripLegacyContinuityProjections = (project: Project): Project => {
  const clone = structuredClone(project) as unknown as Record<string, unknown>;
  delete clone.characterBank;
  delete clone.locationBank;
  delete clone.visualDNA;
  return clone as unknown as Project;
};

const migrateHistoricalProject = (
  project: Project,
  sourceVersion: string,
): {
  project: Project;
  migrations: ArchiveMigration[];
} => {
  const clone = structuredClone(project) as Project & Record<string, unknown>;
  const promptState = (clone.promptState ?? {}) as PromptState & Record<string, unknown>;
  const legacyModelState = {
    model: promptState.model ?? clone.model,
    veoModel: promptState.veoModel ?? clone.veoModel,
    modelPreference: promptState.modelPreference ?? clone.modelPreference,
  };
  clone.modelPreference = migrateModelPreference(legacyModelState);
  const runValue = clone.productionRuns;
  if (Array.isArray(runValue)) {
    clone.productionRuns = runValue.map((value) => {
      if (!value || typeof value !== 'object') return value;
      const run = value as Record<string, unknown>;
      return {
        ...run,
        schemaVersion: 3,
        provider: run.provider ?? 'gemini-api',
        apiSurface: run.apiSurface ?? 'google-ai-v1beta',
      };
    });
  }
  const migratedAt = Date.now();
  const sourceMajor = Number.parseInt(sourceVersion, 10);
  const migrations: ArchiveMigration[] = [];
  if (Number.isFinite(sourceMajor) && sourceMajor >= 5 && sourceMajor <= 9) {
    migrations.push({
      from: sourceVersion,
      to: '10',
      migratedAt,
      notes: [
        'Applied schema-10 compatibility normalization',
        'Preserved unknown fields',
        'Migrated model preference',
        'Upgraded production schema and continuity schema',
      ],
    });
    migrations.push({
      from: '10',
      to: '11',
      migratedAt,
      notes: ['Added PromptArtifactV1 storage while preserving legacy project data'],
    });
  } else {
    migrations.push({
      from: sourceVersion,
      to: '11',
      migratedAt,
      notes: [
        'Preserved unknown fields',
        'Migrated model preference',
        'Upgraded production schema and continuity schema',
        'Added PromptArtifactV1 storage while preserving legacy project data',
      ],
    });
  }
  return { project: clone, migrations };
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64.includes(',') ? (base64.split(',').pop() ?? '') : base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const sha256 = async (data: string | Uint8Array): Promise<string> => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const extensionFor = (mimeType: string): string => {
  const subtype = mimeType.split('/')[1]?.split(';')[0] || 'bin';
  return subtype === 'jpeg' ? 'jpg' : subtype.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
};

export const exportProjectToZip = async (
  project: Project,
  globalAssets: Asset[],
  options: ProjectArchiveOptions = {},
): Promise<Blob> => {
  const zip = new JSZip();
  const assetsFolder = zip.folder('assets');
  if (!assetsFolder) throw new Error('Failed to create assets folder in bundle');

  const processedAssets: Asset[] = structuredClone(globalAssets);
  const normalizedBible = continuityService.normalizeBible(
    {
      productionBible: options.productionBible ?? project.productionBible,
      characterBank: project.characterBank,
      locationBank: project.locationBank,
      visualDNA: project.visualDNA,
    },
    Date.now(),
  );
  const projectWithBible = {
    ...stripLegacyContinuityProjections(project),
    productionBible: normalizedBible.productionBible,
  };
  const manifestAssets: BundleManifest['assets'] = [];
  const checksums: Record<string, string> = {};
  const exportedPaths = new Set<string>();

  for (const asset of processedAssets) {
    const storedBlob = asset.data
      ? null
      : await (options.resolveAssetBlob ?? resolveProjectAssetBlob)(asset);
    if (asset.data || storedBlob) {
      const bytes = asset.data
        ? base64ToBytes(asset.data)
        : base64ToBytes(await blobToBase64(storedBlob!));
      const filename = `${asset.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.${extensionFor(asset.mimeType)}`;
      const archivePath = `assets/${filename}`;
      if (exportedPaths.has(archivePath))
        throw new Error(`Ambiguous archive media path: ${archivePath}`);
      exportedPaths.add(archivePath);
      assetsFolder.file(filename, bytes);
      checksums[archivePath] = await sha256(bytes);
      manifestAssets.push({ id: asset.id, path: archivePath, sha256: checksums[archivePath] });
      asset.data = '';
      asset.url = archivePath;
      delete asset.storageKey;
      delete asset.proxyUrl;
    } else {
      throw new Error(`Local media missing for complete project export: ${asset.name || asset.id}`);
    }
  }

  const archive: ProjectArchiveV11 = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    project: replaceMediaReferences(
      projectWithBible,
      new Map(globalAssets.map((asset, index) => [asset.url, processedAssets[index].url])),
    ),
    assets: processedAssets,
    promptArtifacts: structuredClone(options.promptArtifacts ?? []),
    handoffs: structuredClone(options.handoffs ?? []),
    provenance: {
      productionRuns: structuredClone(options.productionRuns ?? []),
      productionBible: structuredClone(normalizedBible.productionBible),
    },
  };
  const pathMap = new Map(processedAssets.map((asset) => [asset.id, asset.url]));
  archive.provenance.productionRuns = archive.provenance.productionRuns.map((run) => ({
    ...run,
    shots: run.shots.map((shot) => ({
      ...shot,
      takes: shot.takes.map((take) => ({
        ...take,
        localMediaUrl: pathMap.get(take.localMediaKey ?? '') ?? take.localMediaUrl,
      })),
    })),
  }));
  const projectJson = JSON.stringify(archive, null, 2);
  checksums['project.json'] = await sha256(projectJson);
  const effectiveDates = Array.from(
    new Set(MODEL_CATALOG.map((model) => model.pricing.source.effectiveDate)),
  ).sort();
  const manifest: BundleManifest = {
    format: 'loofi-project',
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    createdAt: Date.now(),
    appVersion: import.meta.env.VITE_APP_VERSION ?? '11.0.0',
    projectFile: 'project.json',
    assets: manifestAssets,
    checksums,
    modelCatalogSnapshot: MODEL_CATALOG,
    pricingEffectiveDates: effectiveDates,
    migrationHistory: [
      ...structuredClone(options.migrationHistory ?? []),
      ...(normalizedBible.changed
        ? [
            {
              ...normalizedBible.migration,
              notes: normalizedBible.migration.notes,
            },
          ]
        : []),
    ],
  };

  for (const [path, contents] of Object.entries(options.extraFiles ?? {})) {
    zip.file(path, contents);
    checksums[path] = await sha256(contents);
  }
  zip.file('project.json', projectJson);
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
};

export const importProjectFromZip = async (
  file: File,
): Promise<{
  project: Project;
  assets: Asset[];
  provenance?: ProjectArchiveV11['provenance'];
  promptArtifacts?: PromptArtifactV1[];
  handoffs?: PromptStudioHandoff[];
  migrationHistory?: BundleManifest['migrationHistory'];
}> => {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error('Invalid .loofi-project bundle: corrupt ZIP container');
  }
  const projectFile = zip.file('project.json');
  if (!projectFile) throw new Error('Invalid .loofi-project bundle: project.json missing');
  const projectJson = await projectFile.async('string');
  let archive: ProjectArchiveV11 | LegacyProjectArchive;
  try {
    archive = JSON.parse(projectJson) as ProjectArchiveV11 | LegacyProjectArchive;
  } catch {
    throw new Error('Invalid .loofi-project bundle: project.json contains malformed JSON');
  }

  const manifestFile = zip.file('manifest.json');
  let manifest: BundleManifest | undefined;
  if (manifestFile) {
    manifest = JSON.parse(await manifestFile.async('string')) as BundleManifest;
    if (manifest.format !== 'loofi-project' || manifest.schemaVersion > BUNDLE_SCHEMA_VERSION) {
      throw new Error(`Unsupported .loofi-project schema: ${manifest.schemaVersion}`);
    }
    if ((await sha256(projectJson)) !== manifest.checksums['project.json']) {
      throw new Error('Project bundle checksum mismatch: project.json');
    }
  }

  const restoredAssets: Asset[] = [];
  for (const asset of Array.isArray(archive.assets) ? archive.assets : []) {
    if (typeof asset.url === 'string' && asset.url.startsWith('assets/')) {
      if (asset.url.split('/').includes('..')) throw new Error('Invalid bundle asset path');
      const assetFile = zip.file(asset.url);
      if (!assetFile) throw new Error(`Project bundle asset missing: ${asset.url}`);
      const bytes = await assetFile.async('uint8array');
      const expectedHash = manifest?.checksums[asset.url];
      if (expectedHash && (await sha256(bytes)) !== expectedHash) {
        throw new Error(`Project bundle checksum mismatch: ${asset.url}`);
      }
      const blob = new Blob([bytes as BlobPart], { type: asset.mimeType });
      restoredAssets.push({
        ...asset,
        url: URL.createObjectURL(blob),
        data: await blobToBase64(blob),
      });
    } else {
      restoredAssets.push(asset);
    }
  }

  if (!archive.project || typeof archive.project.id !== 'string')
    throw new Error('Invalid project document');
  const restoredUrls = new Map(
    (archive.assets ?? []).map((asset, index) => [
      asset.url,
      restoredAssets[index]?.url ?? asset.url,
    ]),
  );
  let restoredProject = replaceMediaReferences(archive.project, restoredUrls);
  let migrationHistory = manifest?.migrationHistory ?? [];
  if (manifest && manifest.schemaVersion < BUNDLE_SCHEMA_VERSION) {
    const migrated = migrateHistoricalProject(restoredProject, String(manifest.schemaVersion));
    restoredProject = migrated.project;
    migrationHistory = [...migrationHistory, ...migrated.migrations];
  }
  if (!manifest) {
    const sourceVersion = 'version' in archive ? String(archive.version).split('.')[0] : 'unknown';
    const migrated = migrateHistoricalProject(restoredProject, sourceVersion);
    restoredProject = migrated.project;
    migrationHistory = migrated.migrations;
    logger.info(`Imported legacy v${sourceVersion} project archive; migrated to v11.`);
  }
  const normalizedBible = continuityService.normalizeBible({
    productionBible:
      restoredProject.productionBible ??
      ('provenance' in archive ? archive.provenance.productionBible : undefined),
    characterBank: restoredProject.characterBank,
    locationBank: restoredProject.locationBank,
    visualDNA: restoredProject.visualDNA,
  });
  restoredProject = {
    ...restoredProject,
    productionBible: normalizedBible.productionBible,
  };
  if (normalizedBible.changed) {
    migrationHistory = [
      ...migrationHistory,
      { ...normalizedBible.migration, notes: normalizedBible.migration.notes },
    ];
  }
  return {
    project: restoredProject,
    handoffs: 'handoffs' in archive ? structuredClone(archive.handoffs ?? []) : [],
    assets: restoredAssets,
    provenance:
      'provenance' in archive
        ? replaceMediaReferences(archive.provenance, restoredUrls)
        : undefined,
    promptArtifacts:
      'promptArtifacts' in archive ? structuredClone(archive.promptArtifacts ?? []) : [],
    migrationHistory,
  };
};

/** Resolve only durable local media. Export must never contact a provider. */
export async function resolveProjectAssetBlob(asset: Asset): Promise<Blob | null> {
  const key = asset.storageKey ?? asset.url;
  if (!key) return null;
  const desktop = window.electron as unknown as
    | {
        readDesktopMedia?: (
          key: string,
        ) => Promise<{ bytes: ArrayBuffer; mimeType: string } | null>;
      }
    | undefined;
  if (desktop?.readDesktopMedia) {
    const record = await desktop.readDesktopMedia(key);
    if (record) return new Blob([record.bytes], { type: record.mimeType });
  }
  return asset.storageKey
    ? ((await mediaAssetService.getRecord(asset.storageKey))?.blob ?? null)
    : null;
}
