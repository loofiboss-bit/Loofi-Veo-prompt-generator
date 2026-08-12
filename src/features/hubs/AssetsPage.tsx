import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { continuityService, fingerprintAsset } from '@core/services/continuityService';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { useAppStore } from '@core/store/useAppStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { useProjectStore } from '@core/store/useProjectStore';
import type { Asset, ContinuityProfileKind } from '@core/types';

const PROFILE_KINDS: ContinuityProfileKind[] = ['character', 'location', 'prop', 'look'];

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read local asset.'));
    reader.readAsDataURL(file);
  });

const previewUrl = (asset: Asset): string | undefined => {
  if (asset.url) return asset.url;
  if (!asset.data) return undefined;
  return asset.data.includes(',') ? asset.data : `data:${asset.mimeType};base64,${asset.data}`;
};

const extractVideoFrame = (sourceUrl: string, seconds = 0.1): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = sourceUrl;
    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('The accepted take could not be decoded locally.'));
    };
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(seconds, Math.max(0, video.duration - 0.01));
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (!canvas.width || !canvas.height) {
        cleanup();
        reject(new Error('The accepted take has no readable video dimensions.'));
        return;
      }
      const context = canvas.getContext('2d');
      if (!context) {
        cleanup();
        reject(new Error('Local frame extraction is unavailable in this browser.'));
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        cleanup();
        if (blob) resolve(blob);
        else reject(new Error('The frame could not be encoded locally.'));
      }, 'image/png');
    };
  });

export function AssetsPage() {
  const { t } = useTranslation('common');
  const assets = useAppStore((state) => state.assets);
  const productionBible = useAppStore((state) => state.productionBible);
  const setProductionBible = useAppStore((state) => state.setProductionBible);
  const removeAsset = useAppStore((state) => state.removeAsset);
  const runs = useProductionRunStore((state) => state.runs);
  const initializeRuns = useProductionRunStore((state) => state.initialize);
  const projectId = useProjectStore((state) => state.currentProjectId) ?? 'default';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileName, setProfileName] = useState('');
  const [profileKind, setProfileKind] = useState<ContinuityProfileKind>('character');
  const [profileAssetId, setProfileAssetId] = useState('');
  const [promotionAssetIds, setPromotionAssetIds] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    void initializeRuns(projectId);
  }, [initializeRuns, projectId]);

  const imageAssets = useMemo(() => assets.filter((asset) => asset.type === 'image'), [assets]);
  const assetUsage = useMemo(() => {
    const counts = new Map<string, number>();
    runs.forEach((run) =>
      run.shots.forEach((shot) => {
        [
          ...shot.generationRequest.referenceAssetIds,
          shot.generationRequest.firstFrameAssetId,
          shot.generationRequest.lastFrameAssetId,
          ...(shot.continuitySnapshot?.referenceAssetIds ?? []),
        ]
          .filter((id): id is string => Boolean(id))
          .forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
      }),
    );
    return counts;
  }, [runs]);
  const profileUsage = useMemo(() => {
    const counts = new Map<string, number>();
    runs.forEach((run) =>
      run.shots.forEach((shot) =>
        (shot.continuityBinding?.profileIds ?? []).forEach((id) =>
          counts.set(id, (counts.get(id) ?? 0) + 1),
        ),
      ),
    );
    return counts;
  }, [runs]);
  const profileReferenceUsage = useMemo(() => {
    const usage = new Map<string, string[]>();
    productionBible.profiles.forEach((profile) =>
      profile.references.forEach((reference) => {
        const names = usage.get(reference.assetId) ?? [];
        usage.set(reference.assetId, [...names, profile.name]);
      }),
    );
    return usage;
  }, [productionBible.profiles]);
  const acceptedTakes = useMemo(
    () =>
      runs.flatMap((run) =>
        run.shots.flatMap((shot) =>
          shot.takes
            .filter(
              (take) => take.status === 'accepted' && (take.localMediaUrl || take.localMediaKey),
            )
            .map((take) => ({ runId: run.id, shotId: shot.id, take })),
        ),
      ),
    [runs],
  );

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readAsDataUrl(file);
      const data = dataUrl.split(',')[1] ?? '';
      const asset: Asset = {
        id: crypto.randomUUID(),
        type: 'image',
        name: file.name,
        url: dataUrl,
        data,
        mimeType: file.type || 'image/png',
      };
      useAppStore.getState().addAsset(asset);
      setProfileAssetId(asset.id);
      setStatusMessage(t('assets.uploaded', 'Local image added to the Production Bible library.'));
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : t('assets.uploadFailed', 'Local image could not be read.'),
      );
    } finally {
      event.target.value = '';
    }
  };

  const handleCreateProfile = () => {
    const asset = imageAssets.find((item) => item.id === profileAssetId);
    if (!asset || !profileName.trim()) {
      setStatusMessage(
        t('assets.profileRequired', 'Choose an image and enter a profile name first.'),
      );
      return;
    }
    const profile = continuityService.createProfileFromAsset({
      name: profileName,
      kind: profileKind,
      assetId: asset.id,
      source: asset.tags?.includes('continuity-frame')
        ? 'extracted-frame'
        : asset.tags?.includes('accepted-take')
          ? 'accepted-take'
          : 'manual',
    });
    setProductionBible({
      ...productionBible,
      profiles: [...productionBible.profiles, profile],
      updatedAt: Date.now(),
    });
    setProfileName('');
    setStatusMessage(
      t('assets.profileCreated', 'Continuity profile created. Canonical references are unchanged.'),
    );
  };

  const handleRemoveAsset = (asset: Asset) => {
    const shotCount = assetUsage.get(asset.id) ?? 0;
    const profileNames = profileReferenceUsage.get(asset.id) ?? [];
    if (shotCount > 0 || profileNames.length > 0) {
      setStatusMessage(
        t(
          'assets.removeBlocked',
          'This asset is still a canonical reference or shot input. Remove those bindings first.',
        ),
      );
      return;
    }
    if (window.confirm(t('assets.removeConfirm', 'Remove this local asset?'))) {
      removeAsset(asset.id);
      setStatusMessage(t('assets.removed', 'Local asset removed.'));
    }
  };

  const handlePromoteReference = (profileId: string) => {
    const assetId = promotionAssetIds[profileId];
    if (!assetId) return;
    const candidateAsset = imageAssets.find((item) => item.id === assetId);
    const profile = productionBible.profiles.find((item) => item.id === profileId);
    if (
      !profile ||
      !candidateAsset ||
      profile.references.some((reference) => reference.assetId === assetId)
    ) {
      setStatusMessage(
        t('assets.referenceAlreadySelected', 'That asset is already a reference for this profile.'),
      );
      return;
    }
    const nextProfile = {
      ...profile,
      version: profile.version + 1,
      updatedAt: Date.now(),
      references: [
        ...profile.references,
        {
          assetId,
          role:
            profile.kind === 'look'
              ? ('style' as const)
              : profile.kind === 'character'
                ? ('identity' as const)
                : profile.kind,
          rank: profile.references.length,
          canonical: false,
          source: candidateAsset.tags?.includes('accepted-take')
            ? ('accepted-take' as const)
            : ('manual' as const),
          createdAt: Date.now(),
        },
      ],
    };
    setProductionBible({
      ...productionBible,
      profiles: productionBible.profiles.map((item) =>
        item.id === profileId ? nextProfile : item,
      ),
      updatedAt: Date.now(),
    });
    setStatusMessage(
      t(
        'assets.referencePromoted',
        'Reference candidate added. The canonical reference was not replaced.',
      ),
    );
  };

  const handleExtractFrame = async (
    runId: string,
    shotId: number,
    takeId: string,
    sourceUrl?: string,
    mediaKey?: string,
  ) => {
    try {
      const resolvedUrl =
        sourceUrl ?? (mediaKey ? await mediaAssetService.getObjectUrl(mediaKey) : null);
      if (!resolvedUrl) {
        setStatusMessage(
          t('assets.frameSourceMissing', 'This accepted take has no local media URL.'),
        );
        return;
      }
      const blob = await extractVideoFrame(resolvedUrl);
      const dataUrl = await readAsDataUrl(
        new File([blob], `${takeId}-frame.png`, { type: 'image/png' }),
      );
      const data = dataUrl.split(',')[1] ?? '';
      const frameAsset: Asset = {
        id: crypto.randomUUID(),
        type: 'image',
        name: `Shot ${shotId} accepted frame`,
        url: dataUrl,
        data,
        mimeType: 'image/png',
        parentId: takeId,
        groupId: `continuity-frame-${runId}`,
        tags: ['continuity-frame', 'accepted-take', `shot-${shotId}`],
      };
      useAppStore.getState().addAsset(frameAsset);
      setProfileAssetId(frameAsset.id);
      setStatusMessage(
        t(
          'assets.frameExtracted',
          'Accepted frame extracted locally. Review it before creating or promoting a profile.',
        ),
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : t('assets.frameFailed', 'Frame extraction failed.'),
      );
    }
  };

  return (
    <main id="main-content" className="min-h-full bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            {t('assets.libraryEyebrow', 'Local media library')}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">{t('sidebar.assets', 'Assets')}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {t(
              'assets.consolidatedDescription',
              'Production Bible profiles, references, and generated media for the current project.',
            )}
          </p>
        </header>

        <section
          aria-labelledby="production-bible-title"
          className="rounded-2xl border border-blue-900/70 bg-slate-900 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                {t('assets.continuityEyebrow', 'Continuity Studio')}
              </p>
              <h2 id="production-bible-title" className="mt-1 text-xl font-semibold">
                {t('assets.productionBible', 'Production Bible')}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                {t(
                  'assets.productionBibleDescription',
                  'Lock identity, places, props, and visual looks once. Every shot stores the exact profile and reference snapshot used for generation.',
                )}
              </p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
              {productionBible.profiles.length} {t('assets.profiles', 'profiles')}
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <h3 className="font-semibold">{t('assets.newProfile', 'Create profile')}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {t(
                  'assets.newProfileDescription',
                  'Use a local image or an accepted take already stored in Assets.',
                )}
              </p>
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  {t('assets.profileName', 'Profile name')}
                  <input
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                    placeholder={t(
                      'assets.profileNamePlaceholder',
                      'e.g. Mara — canonical wardrobe',
                    )}
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  {t('assets.profileType', 'Profile type')}
                  <select
                    value={profileKind}
                    onChange={(event) =>
                      setProfileKind(event.target.value as ContinuityProfileKind)
                    }
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                  >
                    {PROFILE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {t(`assets.profileKinds.${kind}`, kind)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  {t('assets.referenceImage', 'Canonical reference')}
                  <select
                    value={profileAssetId}
                    onChange={(event) => setProfileAssetId(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                  >
                    <option value="">{t('assets.selectReference', 'Select a local image')}</option>
                    {imageAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
                  >
                    {t('assets.addLocalImage', 'Add local image')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateProfile}
                    className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    {t('assets.createProfile', 'Create profile')}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
                {statusMessage && (
                  <p className="text-xs text-blue-200" role="status">
                    {statusMessage}
                  </p>
                )}
                {acceptedTakes.length > 0 && (
                  <div className="mt-4 border-t border-slate-800 pt-3">
                    <p className="text-[11px] font-semibold text-slate-300">
                      {t('assets.acceptedTakeFrames', 'Accepted take candidates')}
                    </p>
                    <div className="mt-2 space-y-2">
                      {acceptedTakes.map(({ runId, shotId, take }) => (
                        <div
                          key={take.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-slate-800 px-2 py-2"
                        >
                          <span className="truncate text-[11px] text-slate-400">
                            {t('assets.shotTake', 'Shot {{shot}} · {{take}}', {
                              shot: shotId,
                              take: take.id.slice(0, 8),
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleExtractFrame(
                                runId,
                                shotId,
                                take.id,
                                take.localMediaUrl,
                                take.localMediaKey,
                              )
                            }
                            className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-slate-500"
                          >
                            {t('assets.extractFrame', 'Extract frame')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {productionBible.profiles.length === 0 ? (
                <p className="col-span-full rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                  {t('assets.noProfiles', 'No profiles yet. Add a local image to start the Bible.')}
                </p>
              ) : (
                productionBible.profiles.map((profile) => {
                  const profileReferences = profile.references
                    .slice()
                    .sort((left, right) => left.rank - right.rank);
                  return (
                    <article
                      key={profile.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-blue-300">
                            {profile.kind}
                          </p>
                          <h3 className="mt-1 truncate font-semibold">{profile.name}</h3>
                        </div>
                        <span className="text-[11px] text-slate-500">v{profile.version}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        {profile.description || t('assets.noDescription', 'No description')}
                      </p>
                      <div className="mt-3 space-y-2">
                        {profileReferences.map((reference) => {
                          const asset = assets.find((item) => item.id === reference.assetId);
                          const usedBy = assetUsage.get(reference.assetId) ?? 0;
                          return (
                            <div
                              key={`${profile.id}-${reference.assetId}`}
                              className="flex items-center gap-2 rounded-md border border-slate-800 px-2 py-2"
                            >
                              {asset && previewUrl(asset) ? (
                                <img
                                  src={previewUrl(asset)}
                                  alt=""
                                  className="h-8 w-8 rounded object-cover"
                                />
                              ) : (
                                <span className="h-8 w-8 rounded bg-slate-800" aria-hidden="true" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-slate-200">
                                  {asset?.name ?? reference.assetId}
                                </p>
                                <p className="truncate text-[10px] text-slate-500">
                                  {asset
                                    ? `sha ${fingerprintAsset(asset)}`
                                    : t('assets.missing', 'missing')}{' '}
                                  · {reference.source}
                                </p>
                              </div>
                              {usedBy > 0 && (
                                <span className="shrink-0 text-[10px] text-amber-300">
                                  {t('assets.usedByShots', '{{count}} shots', { count: usedBy })}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <select
                          aria-label={t('assets.promoteReference', 'Promote a reference candidate')}
                          value={promotionAssetIds[profile.id] ?? ''}
                          onChange={(event) =>
                            setPromotionAssetIds((current) => ({
                              ...current,
                              [profile.id]: event.target.value,
                            }))
                          }
                          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                        >
                          <option value="">
                            {t('assets.promoteSelect', 'Promote an image candidate')}
                          </option>
                          {imageAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handlePromoteReference(profile.id)}
                          className="rounded-md border border-blue-800 px-2 py-1 text-[11px] font-semibold text-blue-200 hover:bg-blue-950"
                        >
                          {t('assets.promote', 'Promote')}
                        </button>
                      </div>
                      <p className="mt-3 text-[11px] text-slate-500">
                        {profileUsage.get(profile.id) ?? 0} {t('assets.boundShots', 'bound shots')}{' '}
                        · {profile.provenance.source}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="media-library-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="media-library-title" className="text-lg font-semibold">
              {t('assets.mediaLibrary', 'Media library')}
            </h2>
            <span className="text-xs text-slate-500">
              {assets.length} {t('assets.files', 'files')}
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assets.length === 0 ? (
              <p className="col-span-full rounded-xl border border-dashed border-slate-700 p-8 text-slate-400">
                {t(
                  'assets.empty',
                  'No assets yet. Add references or accept generated media in Create.',
                )}
              </p>
            ) : (
              assets.map((asset) => (
                <article
                  key={asset.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex items-center gap-3">
                    {asset.type === 'image' && previewUrl(asset) ? (
                      <img
                        src={previewUrl(asset)}
                        alt=""
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-800 text-[10px] uppercase text-slate-500">
                        {asset.type}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-blue-300">{asset.type}</p>
                      <h3 className="truncate font-semibold">{asset.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">{asset.mimeType}</p>
                    </div>
                  </div>
                  <p className="mt-3 truncate text-[10px] text-slate-600">
                    sha {fingerprintAsset(asset)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[10px]">
                    <span
                      className={
                        (assetUsage.get(asset.id) ?? 0) > 0 ||
                        (profileReferenceUsage.get(asset.id)?.length ?? 0) > 0
                          ? 'text-amber-300'
                          : 'text-slate-500'
                      }
                    >
                      {(assetUsage.get(asset.id) ?? 0) > 0
                        ? t('assets.removeWouldBreak', 'Used by {{count}} shot(s)', {
                            count: assetUsage.get(asset.id),
                          })
                        : (profileReferenceUsage.get(asset.id)?.length ?? 0) > 0
                          ? t('assets.removeCanonical', 'Canonical Bible reference')
                          : t('assets.removeSafe', 'No continuity bindings')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(asset)}
                      className="rounded border border-slate-700 px-2 py-1 font-semibold text-slate-300 hover:border-rose-700 hover:text-rose-200"
                    >
                      {t('assets.remove', 'Remove')}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
