import { getModel } from '@core/models/catalog';
import { estimateMaximumModelCost } from '@core/models/cost';
import { routeModel } from '@core/models/router';
import type { VeoGenerationRequest } from '@core/types';

export function ModelDecision({ request }: { request: VeoGenerationRequest }) {
  const model = getModel(request.modelId);
  if (!model) return <p role="alert">Unknown model: {request.modelId}</p>;
  const maximumCost = estimateMaximumModelCost(model, {
    approvedCeilingUsd: Number.POSITIVE_INFINITY,
    videoDurationSeconds: request.durationSeconds,
    videoResolution: request.resolution,
  });
  const decision = routeModel({
    operation: 'video',
    mode: model.id.includes('quality') ? 'quality' : model.id.includes('lite') ? 'economy' : 'fast',
    requiresReferenceImages: request.referenceAssetIds.length > 0,
    requiresFirstLastFrame: Boolean(request.firstFrameAssetId || request.lastFrameAssetId),
    requiresExtension: request.mode === 'extension',
    requires4k: request.resolution === '4k',
  });
  const fallback = decision.model.id === model.id ? decision.fallback : undefined;
  const constraints = [
    `${model.capabilities.supportedDurationsSeconds?.join('/')}s`,
    model.capabilities.supportedAspectRatios?.join(', '),
    model.capabilities.supportedResolutions?.join(', '),
    model.capabilities.supportsReferenceImages ? 'references' : 'no references',
  ].filter(Boolean);
  return (
    <aside
      aria-label="Model decision"
      className="mt-3 rounded-md border border-violet-500/30 bg-violet-950/20 p-3 text-xs"
    >
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-violet-100">{model.displayName}</strong>
        <span className="rounded bg-violet-500/20 px-2 py-0.5 uppercase text-violet-200">
          {model.lifecycle}
        </span>
        <span className="text-emerald-300">maximum ${maximumCost.toFixed(2)}</span>
      </div>
      <p className="mt-1 text-slate-400">
        {decision.model.id === model.id
          ? decision.reason
          : 'Explicitly selected because it supports this shot’s requested controls.'}
      </p>
      <p className="mt-1 text-slate-500">Capabilities: {constraints.join(' · ')}</p>
      <p className="mt-1 text-slate-500">
        Fallback: {fallback?.displayName ?? 'none compatible'}; never silently substitutes controls
        and must remain inside the approved ceiling.
      </p>
    </aside>
  );
}
