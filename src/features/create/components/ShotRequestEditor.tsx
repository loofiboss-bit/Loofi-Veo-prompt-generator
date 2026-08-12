import { useTranslation } from 'react-i18next';

import { getModel, MODEL_CATALOG } from '@core/models/catalog';
import { veoGenerationService } from '@core/services/veoGenerationService';
import type {
  Asset,
  ProductionBible,
  ProductionShot,
  ProductionTake,
  ShotContinuityBinding,
  VeoGenerationRequest,
} from '@core/types';

interface ShotRequestEditorProps {
  shot: ProductionShot;
  imageAssets: Asset[];
  extensionTakes: ProductionTake[];
  productionBible?: ProductionBible;
  onChange: (updates: Partial<VeoGenerationRequest>) => Promise<void>;
  onBindingChange: (binding: ShotContinuityBinding) => Promise<void>;
}

export function ShotRequestEditor({
  shot,
  imageAssets,
  extensionTakes,
  productionBible,
  onChange,
  onBindingChange,
}: ShotRequestEditorProps) {
  const { t } = useTranslation('create');
  const request = shot.generationRequest;
  const bible =
    productionBible ??
    ({
      schemaVersion: 1,
      profiles: [],
      lockedDefaults: {},
      updatedAt: 0,
    } satisfies ProductionBible);
  const issues = veoGenerationService.validateRequest(request);
  const selectedModel = getModel(request.modelId);
  const videoModels = MODEL_CATALOG.filter(
    (model) => model.id.startsWith('veo-') && model.capabilities.operations.includes('video'),
  );
  const fieldClass =
    'rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200';
  const binding = shot.continuityBinding ?? {
    profileIds: [],
    explicitReferenceAssetIds: [],
    locks: {},
  };
  const profileToggle = (profileId: string) =>
    binding.profileIds.includes(profileId)
      ? binding.profileIds.filter((id) => id !== profileId)
      : [...binding.profileIds, profileId];
  const boundProfileIds = new Set(
    [
      ...binding.profileIds,
      binding.inheritedLookProfileId,
      ...(binding.inheritedLookProfileId ? [] : [bible.projectLookProfileId]),
    ].filter((id): id is string => Boolean(id)),
  );
  const referenceCandidates = Array.from(
    new Set(
      bible.profiles
        .filter((profile) => boundProfileIds.has(profile.id))
        .flatMap((profile) =>
          profile.references.slice().sort((left, right) => left.rank - right.rank),
        )
        .map((reference) => reference.assetId),
    ),
  );
  const selectedReferenceIds =
    binding.explicitReferenceAssetIds.length > 0
      ? binding.explicitReferenceAssetIds
      : referenceCandidates;

  return (
    <div className="mt-3 grid gap-3 border-t border-slate-800 pt-3 md:grid-cols-4">
      <fieldset className="rounded-md border border-blue-900/60 bg-blue-950/20 p-3 md:col-span-4">
        <legend className="px-1 text-xs font-semibold text-blue-200">
          {t('continuity.bindings', 'Assets & Continuity')}
        </legend>
        <p className="mb-2 text-[11px] text-slate-500">
          {t(
            'continuity.bindingHelp',
            'Select the profiles that must remain stable for this shot.',
          )}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {bible.profiles.map((profile) => (
            <label
              key={profile.id}
              className="flex items-start gap-2 rounded border border-slate-800 p-2 text-[11px] text-slate-300"
            >
              <input
                type="checkbox"
                aria-label={`${profile.name} (${profile.kind})`}
                checked={binding.profileIds.includes(profile.id)}
                onChange={() =>
                  void onBindingChange({ ...binding, profileIds: profileToggle(profile.id) })
                }
                className="mt-0.5 accent-blue-500"
              />
              <span>
                <span className="block font-semibold">{profile.name}</span>
                <span className="text-slate-500">
                  {profile.kind} · v{profile.version}
                </span>
              </span>
            </label>
          ))}
        </div>
        {bible.profiles.length === 0 && (
          <p className="text-[11px] text-slate-500">
            {t('continuity.noProfiles', 'Create profiles in Assets before binding a shot.')}
          </p>
        )}
        <label className="mt-3 flex max-w-md flex-col gap-1 text-[11px] text-slate-400">
          {t('continuity.inheritedLook', 'Inherited project look')}
          <select
            className={fieldClass}
            value={binding.inheritedLookProfileId ?? ''}
            onChange={(event) =>
              void onBindingChange({
                ...binding,
                inheritedLookProfileId: event.target.value || undefined,
              })
            }
          >
            <option value="">{t('continuity.noInheritedLook', 'Use the project default')}</option>
            {bible.profiles
              .filter((profile) => profile.kind === 'look')
              .map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
          </select>
        </label>
        {referenceCandidates.length > 0 && (
          <fieldset className="mt-3 rounded border border-slate-800 p-2">
            <legend className="px-1 text-[11px] font-semibold text-slate-300">
              {t('continuity.referenceSelection', 'Identity references (maximum three)')}
            </legend>
            <p className="mb-2 text-[10px] text-slate-500">
              {t(
                'continuity.referenceSelectionHelp',
                'Automatic selection follows profile order. Choose explicitly when more than three are available.',
              )}
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              {referenceCandidates.map((assetId) => {
                const asset = imageAssets.find((item) => item.id === assetId);
                return (
                  <label
                    key={assetId}
                    className="flex items-center gap-2 text-[11px] text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={selectedReferenceIds.includes(assetId)}
                      onChange={() => {
                        const next = selectedReferenceIds.includes(assetId)
                          ? selectedReferenceIds.filter((id) => id !== assetId)
                          : [...selectedReferenceIds, assetId];
                        void onBindingChange({ ...binding, explicitReferenceAssetIds: next });
                      }}
                      className="accent-blue-500"
                    />
                    <span className="truncate">{asset?.name ?? assetId}</span>
                  </label>
                );
              })}
            </div>
            {binding.explicitReferenceAssetIds.length > 0 && (
              <button
                type="button"
                onClick={() => void onBindingChange({ ...binding, explicitReferenceAssetIds: [] })}
                className="mt-2 text-[10px] font-semibold text-blue-300 hover:text-blue-200"
              >
                {t('continuity.referenceSelectionReset', 'Use automatic profile order')}
              </button>
            )}
          </fieldset>
        )}
      </fieldset>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        {t('controls.mode')}
        <select
          className={fieldClass}
          value={request.mode}
          onChange={(event) =>
            void onChange({ mode: event.target.value as VeoGenerationRequest['mode'] })
          }
        >
          <option value="text-to-video">{t('controls.modes.text-to-video')}</option>
          <option value="image-to-video">{t('controls.modes.image-to-video')}</option>
          <option value="interpolation">{t('controls.modes.interpolation')}</option>
          <option value="reference-images">{t('controls.modes.reference-images')}</option>
          <option value="extension">{t('controls.modes.extension')}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        {t('controls.model')}
        <select
          className={fieldClass}
          value={request.modelId}
          onChange={(event) =>
            void onChange({ modelId: event.target.value as VeoGenerationRequest['modelId'] })
          }
        >
          {videoModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.displayName} ({model.lifecycle})
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        {t('controls.duration')}
        <select
          className={fieldClass}
          value={request.durationSeconds}
          onChange={(event) =>
            void onChange({
              durationSeconds: Number(
                event.target.value,
              ) as VeoGenerationRequest['durationSeconds'],
            })
          }
        >
          {selectedModel?.capabilities.supportedDurationsSeconds?.map((duration) => (
            <option key={duration} value={duration}>
              {t('controls.seconds', { count: duration })}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        {t('controls.resolution')}
        <select
          className={fieldClass}
          value={request.resolution}
          onChange={(event) =>
            void onChange({ resolution: event.target.value as VeoGenerationRequest['resolution'] })
          }
        >
          {selectedModel?.capabilities.supportedResolutions?.map((resolution) => (
            <option key={resolution} value={resolution}>
              {resolution === '4k' ? '4K' : resolution}
            </option>
          ))}
        </select>
      </label>

      {(request.mode === 'image-to-video' || request.mode === 'interpolation') && (
        <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-2">
          {t('controls.firstFrame')}
          <select
            className={fieldClass}
            value={request.firstFrameAssetId ?? ''}
            onChange={(event) =>
              void onChange({ firstFrameAssetId: event.target.value || undefined })
            }
          >
            <option value="">{t('controls.selectImage')}</option>
            {imageAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {request.mode === 'interpolation' && (
        <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-2">
          {t('controls.lastFrame')}
          <select
            className={fieldClass}
            value={request.lastFrameAssetId ?? ''}
            onChange={(event) =>
              void onChange({ lastFrameAssetId: event.target.value || undefined })
            }
          >
            <option value="">{t('controls.selectImage')}</option>
            {imageAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {request.mode === 'reference-images' && (
        <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-4">
          {t('controls.referenceImages')}
          <select
            multiple
            className={`${fieldClass} min-h-24`}
            value={request.referenceAssetIds}
            onChange={(event) =>
              void onChange({
                referenceAssetIds: Array.from(event.target.selectedOptions).map(
                  (option) => option.value,
                ),
              })
            }
          >
            {imageAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {request.mode === 'extension' && (
        <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-4">
          {t('controls.sourceTake')}
          <select
            className={fieldClass}
            value={request.extensionSourceTakeId ?? ''}
            onChange={(event) => {
              const take = extensionTakes.find((item) => item.id === event.target.value);
              void onChange({
                extensionSourceTakeId: take?.id,
                extensionArtifact: take?.providerArtifact,
                resolution: '720p',
                durationSeconds: 8,
              });
            }}
          >
            <option value="">{t('controls.selectTake')}</option>
            {extensionTakes.map((take) => (
              <option key={take.id} value={take.id}>
                {take.id.slice(0, 8)} —{' '}
                {t('controls.expires', {
                  time: new Date(take.providerArtifact!.expiresAt).toLocaleString(),
                })}
              </option>
            ))}
          </select>
        </label>
      )}

      {issues.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 md:col-span-4">
          {issues.map((issue) => (
            <p key={`${issue.code}-${issue.field}`}>{t(`issues.${issue.code}`)}</p>
          ))}
        </div>
      )}
    </div>
  );
}
