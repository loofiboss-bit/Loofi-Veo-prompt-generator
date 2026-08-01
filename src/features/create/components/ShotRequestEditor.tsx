import { useTranslation } from 'react-i18next';

import { getModel, MODEL_CATALOG } from '@core/models/catalog';
import { veoGenerationService } from '@core/services/veoGenerationService';
import type { Asset, ProductionShot, ProductionTake, VeoGenerationRequest } from '@core/types';

interface ShotRequestEditorProps {
  shot: ProductionShot;
  imageAssets: Asset[];
  extensionTakes: ProductionTake[];
  onChange: (updates: Partial<VeoGenerationRequest>) => Promise<void>;
}

export function ShotRequestEditor({
  shot,
  imageAssets,
  extensionTakes,
  onChange,
}: ShotRequestEditorProps) {
  const { t } = useTranslation('create');
  const request = shot.generationRequest;
  const issues = veoGenerationService.validateRequest(request);
  const selectedModel = getModel(request.modelId);
  const videoModels = MODEL_CATALOG.filter(
    (model) => model.id.startsWith('veo-') && model.capabilities.operations.includes('video'),
  );
  const fieldClass =
    'rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200';

  return (
    <div className="mt-3 grid gap-3 border-t border-slate-800 pt-3 md:grid-cols-4">
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
