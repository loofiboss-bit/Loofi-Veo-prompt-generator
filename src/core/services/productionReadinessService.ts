import { veoGenerationService } from '@core/services/veoGenerationService';
import type { Asset, ProductionRun, ProductionShot, ProductionTake } from '@core/types';

export type ReadinessActionKind =
  | 'references'
  | 'recover'
  | 'generate'
  | 'relink'
  | 'review'
  | 'accept';
export interface ProductionNextAction {
  step: 'assets' | 'generate' | 'review' | 'export';
  shotId: number;
  kind: ReadinessActionKind;
}

export const manualReviewContext = (shot: ProductionShot, take: ProductionTake): string =>
  JSON.stringify([
    take.id,
    take.localMediaKey ?? take.providerMediaUri,
    take.request,
    shot.generationRequest,
    shot.continuitySnapshot?.snapshotHash,
  ]);

export const isTakePlayable = (take: ProductionTake): boolean =>
  ['complete', 'accepted', 'media-at-risk'].includes(take.status) &&
  Boolean(take.localMediaUrl || (take.providerMediaUri && /^https?:/.test(take.providerMediaUri)));

/** Current evidence can be shown before the separate manual acceptance confirmation. */
export const isReviewEvidenceCurrent = (shot: ProductionShot, take: ProductionTake): boolean =>
  !take.reviewInvalidated &&
  Boolean(
    take.review &&
    (!take.reviewContextIdentity ||
      take.reviewContextIdentity === manualReviewContext(shot, take)) &&
    (!shot.continuitySnapshot?.snapshotHash ||
      take.review.continuitySnapshotHash === shot.continuitySnapshot.snapshotHash),
  );

export const isTakeReviewCurrent = (shot: ProductionShot, take: ProductionTake): boolean => {
  if (take.reviewInvalidated) return false;
  const manual = take.manualReview?.contextIdentity === manualReviewContext(shot, take);
  const automated = Boolean(isReviewEvidenceCurrent(shot, take) && take.review?.source !== 'local');
  // Already accepted legacy results remain usable without inventing a review confirmation.
  const legacy =
    take.status === 'accepted' &&
    !take.manualReview &&
    !take.reviewContextIdentity &&
    (!shot.continuitySnapshot?.snapshotHash ||
      take.review?.continuitySnapshotHash === shot.continuitySnapshot.snapshotHash);
  return Boolean(manual || automated || legacy);
};

export const shotReadiness = (shot: ProductionShot, assets?: Asset[]) => {
  const request = shot.generationRequest;
  const ids = [
    request.firstFrameAssetId,
    request.lastFrameAssetId,
    ...(request.referenceAssetIds ?? []),
  ].filter((id): id is string => Boolean(id));
  const required =
    ((request.mode !== 'image-to-video' && request.mode !== 'interpolation') ||
      Boolean(request.firstFrameAssetId)) &&
    (request.mode !== 'interpolation' || Boolean(request.lastFrameAssetId)) &&
    (request.mode !== 'reference-images' || ids.length > 0) &&
    (request.mode !== 'extension' || Boolean(request.extensionArtifact?.mediaUri));
  const references =
    required &&
    (!request.modelId ||
      veoGenerationService
        .validateRequest(request)
        .every(
          (issue) =>
            ![
              'firstFrameAssetId',
              'lastFrameAssetId',
              'referenceAssetIds',
              'extensionArtifact',
            ].includes(issue.field),
        )) &&
    ids.every((id) =>
      assets?.some(
        (asset) =>
          asset.id === id &&
          asset.type === 'image' &&
          Boolean(
            asset.data ||
            asset.storageKey ||
            (asset.url && /^(blob:|data:|loofi-media:)/.test(asset.url)),
          ),
      ),
    );
  const take = shot.takes.find((item) => item.id === shot.selectedTakeId) ?? shot.takes.at(-1);
  const generated = shot.takes.some(isTakePlayable);
  const reviewed = Boolean(take && isTakePlayable(take) && isTakeReviewCurrent(shot, take));
  const deliverable = Boolean(
    take && reviewed && take.status === 'accepted' && take.localMediaKey && take.localMediaUrl,
  );
  let kind: ReadinessActionKind | null = null;
  if (!references) kind = 'references';
  else if (take && ['failed', 'recovery-required', 'media-at-risk'].includes(take.status))
    kind = 'recover';
  else if (take?.localMediaKey && !take.localMediaUrl) kind = 'relink';
  else if (!generated) kind = 'generate';
  else if (!reviewed) kind = 'review';
  else if (!deliverable) kind = 'accept';
  return { references, generated, reviewed, deliverable, take, kind };
};

export const productionReadiness = (run: ProductionRun | null, assets?: Asset[]) => {
  const shots = run?.shots.filter((shot) => shot.status !== 'skipped') ?? [];
  const states = shots.map((shot) => ({ shot, state: shotReadiness(shot, assets) }));
  const next = states.find(({ state }) => state.kind);
  const kind = next?.state.kind;
  const nextAction: ProductionNextAction | null =
    next && kind
      ? {
          shotId: next.shot.id,
          kind,
          step:
            kind === 'references'
              ? 'assets'
              : ['recover', 'generate'].includes(kind)
                ? 'generate'
                : kind === 'relink'
                  ? 'export'
                  : 'review',
        }
      : null;
  return {
    completion: {
      brief: Boolean(run?.brief.trim()),
      scenes: shots.length > 0,
      assets: shots.length > 0 && states.every(({ state }) => state.references),
      generate: shots.length > 0 && states.every(({ state }) => state.generated),
      review: shots.length > 0 && states.every(({ state }) => state.reviewed),
      export: shots.length > 0 && states.every(({ state }) => state.deliverable),
    },
    nextAction,
  };
};
