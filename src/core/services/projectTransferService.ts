import JSZip from 'jszip';
import type {
  Asset,
  Project,
  ProductionRun,
  PromptArtifactV1,
  PromptStudioHandoff,
} from '@core/types';
import { projectService } from '@core/services/projectService';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { productionRunService } from '@core/services/productionRunService';
import { manualReviewContext } from '@core/services/productionReadinessService';
import { promptStudioHandoffService } from '@core/services/promptStudioHandoffService';
import {
  exportOtioJson,
  resolveOtioSelection,
  selectedOtioClips,
} from '@core/services/otioExportService';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { useAppStore } from '@core/store/useAppStore';
import {
  exportProjectToZip,
  importProjectFromZip,
  resolveProjectAssetBlob,
} from '@core/utils/projectArchiver';

/** Collect references from the chosen document, never from another active workspace. */
export function collectProjectAssetIds(value: unknown): Set<string> {
  const ids = new Set<string>();
  const visit = (node: unknown, key = '') => {
    if (
      typeof node === 'string' &&
      /(?:assetId|assetIds|resourceId|referenceAssetIds|localMediaKey)$/i.test(key)
    )
      ids.add(node);
    else if (Array.isArray(node)) node.forEach((item) => visit(item, key));
    else if (node && typeof node === 'object')
      Object.entries(node).forEach(([field, item]) => {
        // Text resources are caption identities, not binary media references.
        if (field === 'resourceId' && (node as { type?: string }).type === 'text') return;
        visit(item, field);
      });
  };
  visit(value);
  return ids;
}

export function downloadProjectBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  link.click();
  URL.revokeObjectURL(url);
}

export async function buildPortableProjectBundle(
  project: Project,
  extraFiles?: Record<string, string>,
): Promise<Blob> {
  const runs = await productionRunService.getRunsForProject(project.id);
  const artifacts = await promptStudioHandoffService.listArtifacts(project.id);
  const handoffs = await promptStudioHandoffService.listDrafts(project.id);
  const references = collectProjectAssetIds([project, runs, artifacts]);
  const mediaUrls = new Set<string>();
  const visitUrls = (value: unknown, field = '') => {
    if (
      typeof value === 'string' &&
      (/Url$/.test(field) || field === 'takes') &&
      /^(?:blob:|file:|https?:|data:)/.test(value)
    )
      mediaUrls.add(value);
    else if (Array.isArray(value)) value.forEach((item) => visitUrls(item, field));
    else if (value && typeof value === 'object')
      Object.entries(value).forEach(([key, item]) => visitUrls(item, key));
  };
  visitUrls(project);
  const availableAssets = useAppStore.getState().assets;
  const assets = availableAssets.filter((asset) => references.has(asset.id));
  for (const url of mediaUrls) {
    if (assets.some((asset) => asset.url === url)) continue;
    const matches = availableAssets.filter((asset) => asset.url === url);
    const candidate =
      matches.find((asset) => asset.groupId === project.id) ??
      (matches.length === 1 ? matches[0] : undefined);
    if (!candidate)
      throw new Error(
        'A storyboard media reference has no unique durable local asset. Relink it before exporting.',
      );
    assets.push(candidate);
  }
  for (const run of runs)
    for (const shot of run.shots)
      for (const take of shot.takes) {
        if (!take.localMediaKey && ['complete', 'accepted', 'media-at-risk'].includes(take.status))
          throw new Error(`Generated media is not stored locally: ${take.id}`);
        if (take.localMediaKey && !assets.some((asset) => asset.id === take.localMediaKey))
          assets.push({
            id: take.localMediaKey,
            type: 'video',
            name: `${take.id}.mp4`,
            mimeType: 'video/mp4',
            storageKey: take.localMediaKey,
            url: take.localMediaUrl ?? '',
            data: '',
          });
      }
  const available = new Set(assets.map((asset) => asset.id));
  const missing = [...references].filter((id) => !available.has(id));
  if (missing.length) throw new Error(`Referenced local media missing: ${missing.join(', ')}`);
  return exportProjectToZip(project, assets, {
    productionRuns: runs,
    productionBible: project.productionBible,
    promptArtifacts: artifacts,
    handoffs,
    migrationHistory: (
      project as Project & {
        migrationHistory?: { from: string; to: string; migratedAt: number; notes?: string[] }[];
      }
    ).migrationHistory,
    extraFiles,
  });
}

export async function exportPortableProject(projectId: string): Promise<Blob> {
  const project = await projectDocumentService.load(projectId);
  if (!project) throw new Error('Project document not found. Save the project first.');
  return buildPortableProjectBundle(project);
}

/** Remap identity/reference fields while retaining unknown document content verbatim. */
export function remapImportedReferences<T>(value: T, ids: Map<string, string>): T {
  const visit = (node: unknown, key = ''): unknown => {
    if (typeof node === 'string')
      return /(?:^id$|Id$|Ids$|localMediaKey$)/.test(key) ? (ids.get(node) ?? node) : node;
    if (Array.isArray(node)) return node.map((item) => visit(item, key));
    if (node && typeof node === 'object')
      return Object.fromEntries(
        Object.entries(node).map(([field, item]) => [ids.get(field) ?? field, visit(item, field)]),
      );
    return node;
  };
  return visit(value) as T;
}

export async function importPortableProject(file: File): Promise<Project> {
  const imported = await importProjectFromZip(file);
  for (const asset of imported.assets)
    if (!asset.data) throw new Error(`Imported archive is missing local bytes: ${asset.name}`);
  const inventory = await projectService.createProject({
    name: `${imported.project.name} (Imported)`,
  });
  const ids = new Map<string, string>([[imported.project.id, inventory.id]]);
  const runs = imported.provenance?.productionRuns ?? [];
  const artifacts = imported.promptArtifacts ?? [];
  const handoffs = imported.handoffs ?? [];
  const collect = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(collect);
    else if (node && typeof node === 'object')
      for (const [key, item] of Object.entries(node)) {
        if (key === 'id' && typeof item === 'string' && !ids.has(item))
          ids.set(item, crypto.randomUUID());
        else collect(item);
      }
  };
  collect([imported.project, imported.assets, runs, artifacts, handoffs]);
  for (const asset of imported.assets)
    if (asset.storageKey) ids.set(asset.storageKey, `import:${crypto.randomUUID()}`);
  const restoredAssets: Asset[] = [];
  for (const asset of imported.assets) {
    if (!asset.data) throw new Error(`Imported archive is missing local bytes: ${asset.name}`);
    const key = ids.get(asset.id)!;
    const bytes = Uint8Array.from(atob(asset.data), (character) => character.charCodeAt(0));
    const blob = new Blob([bytes], { type: asset.mimeType });
    const desktop = window.electron?.importDesktopMedia;
    let url: string;
    if (desktop)
      url = (await desktop({ key, bytes: bytes.buffer, mimeType: asset.mimeType })).localUrl;
    else {
      await mediaAssetService.storeBlob(key, blob);
      url = (await mediaAssetService.getObjectUrl(key))!;
    }
    restoredAssets.push({
      ...remapImportedReferences(asset, ids),
      id: key,
      storageKey: key,
      url,
      data: asset.type === 'image' ? asset.data : '',
    });
  }
  const importedUrls = new Map(
    imported.assets.map((asset, index) => [asset.url, restoredAssets[index].url]),
  );
  const replaceUrls = <T>(value: T): T => {
    const visit = (node: unknown): unknown => {
      if (typeof node === 'string') return importedUrls.get(node) ?? node;
      if (Array.isArray(node)) return node.map(visit);
      if (node && typeof node === 'object')
        return Object.fromEntries(
          Object.entries(node).map(([field, item]) => [field, visit(item)]),
        );
      return node;
    };
    return visit(value) as T;
  };
  const restoredRuns = remapImportedReferences<ProductionRun[]>(runs, ids).map((run, runIndex) => ({
    ...run,
    projectId: inventory.id,
    status: run.status === 'complete' ? ('complete' as const) : ('paused' as const),
    approvals: (run.approvals ?? []).map((approval) => ({
      ...approval,
      status: approval.status === 'active' ? ('revoked' as const) : approval.status,
    })),
    shots: run.shots.map((shot, shotIndex) => ({
      ...shot,
      takes: shot.takes.map((take, takeIndex) => {
        const asset = restoredAssets.find((entry) => entry.id === take.localMediaKey);
        const originalShot = runs[runIndex].shots[shotIndex];
        const originalTake = originalShot.takes[takeIndex];
        const validManual =
          originalTake.manualReview &&
          originalTake.manualReview.contextIdentity ===
            manualReviewContext(originalShot, originalTake);
        return {
          ...take,
          taskId: undefined,
          costApproval: undefined,
          localMediaUrl: asset?.url,
          reviewContextIdentity:
            originalTake.reviewContextIdentity === manualReviewContext(originalShot, originalTake)
              ? manualReviewContext(shot, take)
              : take.reviewContextIdentity,
          manualReview:
            validManual && take.manualReview
              ? {
                  ...take.manualReview,
                  contextIdentity: manualReviewContext(shot, take),
                }
              : take.manualReview,
          status: ['queued', 'approved', 'submitting', 'generating'].includes(take.status)
            ? ('recovery-required' as const)
            : take.status,
        };
      }),
    })),
  }));
  const document = {
    ...replaceUrls(remapImportedReferences(imported.project, ids)),
    id: inventory.id,
    documentRevision: 0,
    name: inventory.name,
    migrationHistory: imported.migrationHistory,
  };
  await projectDocumentService.save(document);
  for (const run of restoredRuns) await productionRunService.saveRun(run);
  await promptStudioHandoffService.saveArtifacts(
    remapImportedReferences<PromptArtifactV1[]>(artifacts, ids).map((artifact) => ({
      ...artifact,
      projectId: inventory.id,
    })),
  );
  const restoredArtifacts = remapImportedReferences<PromptArtifactV1[]>(artifacts, ids);
  for (const handoff of remapImportedReferences<PromptStudioHandoff[]>(handoffs, ids)) {
    const artifact = restoredArtifacts.find((candidate) => candidate.id === handoff.artifactId);
    if (!artifact) throw new Error(`Imported handoff artifact missing: ${handoff.artifactId}`);
    await promptStudioHandoffService.saveDraft(
      { ...handoff, projectId: inventory.id },
      { ...artifact, projectId: inventory.id },
    );
  }
  for (const asset of restoredAssets) useAppStore.getState().addAsset(asset);
  return document;
}

export interface MissingTimelineMedia {
  mediaKey: string;
  clipId?: string;
  clipLabel: string;
  shotId?: number;
  assetId?: string;
}

export class OtioExportPreflightError extends Error {
  constructor(public readonly missingMedia: MissingTimelineMedia[]) {
    super(`Local timeline media missing: ${missingMedia.map((item) => item.clipLabel).join(', ')}`);
    this.name = 'OtioExportPreflightError';
  }
}

const deliveryPath = (asset: Asset) => {
  const extension = asset.mimeType.split('/')[1]?.split(';')[0] ?? 'bin';
  return `assets/${asset.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.${extension === 'jpeg' ? 'jpg' : extension.replace(/[^a-zA-Z0-9]/g, '') || 'bin'}`;
};

async function prepareOtioDelivery(project: Project, run?: ProductionRun | null) {
  if (run && run.projectId !== project.id)
    throw new Error('Production run belongs to another project.');
  const options = {
    projectId: project.id,
    projectName: project.name,
    shots: project.storyboard?.shots ?? [],
    timeline: project.storyboard?.timeline,
    productionRun: run,
  };
  const selected = selectedOtioClips(options);
  if (!selected.length) throw new Error('Timeline has no exportable media clips.');
  const available = useAppStore.getState().assets;
  const media = new Map<string, { asset: Asset; blob: Blob }>();
  const paths: Record<string, string> = {};
  const missingMedia: MissingTimelineMedia[] = [];
  const provenance: unknown[] = [];
  for (const clip of selected) {
    const { shot, take, mediaKey } = resolveOtioSelection(
      clip.resourceId,
      clip.selectedTakeId,
      run,
      clip.type,
    );
    if (shot && (!take || !take.localMediaKey)) {
      missingMedia.push({ mediaKey, clipId: clip.id, clipLabel: clip.label, shotId: shot.id });
      continue;
    }
    const storyboardShot =
      typeof clip.resourceId === 'number'
        ? project.storyboard?.shots.find((item) => item.id === clip.resourceId)
        : undefined;
    const url =
      clip.type === 'audio'
        ? clip.trackId === 'audio_sfx' || clip.id.startsWith('sfx_')
          ? undefined
          : storyboardShot?.audioUrl
        : (take?.localMediaUrl ??
          storyboardShot?.generatedVideoUrl ??
          storyboardShot?.takes?.[storyboardShot.selectedTakeIndex]);
    const matches = available.filter((asset) => asset.type === clip.type && asset.url === url);
    let asset =
      available.find((item) => item.id === mediaKey && item.type === clip.type) ??
      matches.find((item) => item.groupId === project.id) ??
      (matches.length === 1 ? matches[0] : undefined);
    if (!asset && take?.localMediaKey)
      asset = {
        id: take.localMediaKey,
        storageKey: take.localMediaKey,
        name: `${take.id}.mp4`,
        mimeType: 'video/mp4',
        type: 'video',
        url: take.localMediaUrl ?? '',
        data: '',
      };
    let blob = asset ? media.get(asset.id)?.blob : undefined;
    if (asset && !blob) {
      try {
        blob = asset.data
          ? new Blob(
              [
                Uint8Array.from(
                  atob(asset.data.includes(',') ? asset.data.split(',').pop()! : asset.data),
                  (value) => value.charCodeAt(0),
                ),
              ],
              { type: asset.mimeType },
            )
          : ((await resolveProjectAssetBlob(asset)) ?? undefined);
      } catch {
        // A failed local read is a relinkable missing-media entry, never a remote fetch.
        blob = undefined;
      }
    }
    if (!asset || !blob || blob.size === 0) {
      missingMedia.push({
        mediaKey,
        clipId: clip.id,
        clipLabel: clip.label,
        shotId: shot?.id ?? storyboardShot?.id,
        assetId: asset?.id,
      });
      continue;
    }
    media.set(asset.id, { asset, blob });
    paths[mediaKey] = deliveryPath(asset);
    provenance.push({
      clipId: clip.id,
      shotId: shot?.id ?? storyboardShot?.id,
      assetId: asset.id,
      take: take
        ? {
            id: take.id,
            prompt: take.prompt,
            request: take.request,
            review: take.review,
            manualReview: take.manualReview,
            sourceArtifactId: take.sourceArtifactId,
            sourceVariantIndex: take.sourceVariantIndex,
            continuitySnapshot: take.continuitySnapshot,
            localMediaKey: asset.id,
          }
        : undefined,
    });
  }
  return { options, media, paths, missingMedia, provenance };
}

/** Check durable bytes for the actual edit without reading revision or unselected media. */
export async function preflightProjectOtioExport(project: Project, run?: ProductionRun | null) {
  const { missingMedia } = await prepareOtioDelivery(project, run);
  return { missingMedia };
}

export async function exportProjectOtioBundle(
  project: Project,
  run?: ProductionRun | null,
): Promise<Blob> {
  const prepared = await prepareOtioDelivery(project, run);
  if (prepared.missingMedia.length) throw new OtioExportPreflightError(prepared.missingMedia);
  const otio = exportOtioJson({
    ...prepared.options,
    mediaPaths: prepared.paths,
    requireMedia: true,
  });
  const zip = new JSZip();
  const checksums: Record<string, string> = {};
  const add = async (path: string, bytes: Uint8Array) => {
    if (zip.file(path)) throw new Error(`Ambiguous archive media path: ${path}`);
    zip.file(path, Uint8Array.from(bytes));
    const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
    checksums[path] = Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, '0'),
    ).join('');
  };
  for (const { asset, blob } of prepared.media.values())
    await add(deliveryPath(asset), new Uint8Array(await blob.arrayBuffer()));
  await add('timeline.otio', new TextEncoder().encode(otio));
  const selectedIds = new Set(prepared.media.keys());
  const externalResults = project.studioResults ?? [];
  await add(
    'provenance.json',
    new TextEncoder().encode(
      JSON.stringify(
        {
          projectId: project.id,
          clips: prepared.provenance,
          studioResults: externalResults.filter((result) => selectedIds.has(result.assetId)),
        },
        null,
        2,
      ),
    ),
  );
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        format: 'loofi-delivery',
        schemaVersion: 1,
        createdAt: Date.now(),
        checksums,
      },
      null,
      2,
    ),
  );
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function hydrateProjectMedia(project: Project): Promise<void> {
  const urls = new Map<string, string>();
  const ids = collectProjectAssetIds(project);
  const serializedDocument = JSON.stringify(project);
  for (const asset of useAppStore.getState().assets) {
    if (
      (!ids.has(asset.id) && !serializedDocument.includes(JSON.stringify(asset.url))) ||
      !asset.storageKey
    )
      continue;
    const desktop = await window.electron?.readDesktopMedia?.(asset.storageKey);
    const url = desktop?.localUrl ?? (await mediaAssetService.getObjectUrl(asset.storageKey));
    if (url) {
      urls.set(asset.url, url);
      useAppStore.getState().updateAsset(asset.id, { url });
    }
  }
  const visit = (value: unknown): unknown => {
    if (typeof value === 'string') return urls.get(value) ?? value;
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, visit(item)]));
    return value;
  };
  Object.assign(project, visit(project));
}
