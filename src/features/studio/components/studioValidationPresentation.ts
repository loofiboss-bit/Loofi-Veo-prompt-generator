import type { TFunction } from 'i18next';
import type { PromptValidationCheck } from '@core/types';

export function studioCheckLabel(check: PromptValidationCheck, t: TFunction<'studio'>): string {
  if (!check.evidence) return check.label;
  const id = check.id.replace(/^variant-\d+-/, '');
  return t(
    check.id.startsWith('provider-') ? 'providerValidation.label' : `validation.${id}.label`,
    { defaultValue: check.label },
  );
}

export function studioCheckDetail(check: PromptValidationCheck, t: TFunction<'studio'>): string {
  if (!check.evidence) return check.detail;
  const providerKeys: Record<string, string> = {
    'provider-prompt-required-prompt': 'prompt',
    'provider-model-resolution-unsupported-resolution': 'resolution',
    'provider-model-mode-unsupported-mode': 'mode',
    'provider-first-frame-required-firstFrameAssetId': check.detail.includes('Interpolation')
      ? 'bothFrames'
      : 'firstFrame',
    'provider-last-frame-requires-first-frame-lastFrameAssetId': 'lastRequiresFirst',
    'provider-reference-count-referenceAssetIds': check.detail.includes('at most')
      ? 'maximumReferences'
      : 'minimumReferences',
    'provider-references-require-eight-seconds-durationSeconds': 'referenceDuration',
    'provider-high-resolution-requires-eight-seconds-durationSeconds': 'resolutionDuration',
    'provider-extension-artifact-required-extensionArtifact': 'extensionSource',
    'provider-extension-artifact-expired-extensionArtifact': 'extensionExpired',
    'provider-extension-requires-720p-resolution': 'extensionResolution',
    'provider-incompatible-inputs-mode': 'incompatible',
    'provider-duration-unsupported-durationSeconds': 'duration',
  };
  const providerKey = providerKeys[check.id];
  const id = check.id.replace(/^variant-\d+-/, '');
  return t(
    providerKey ? `providerValidation.${providerKey}` : `validation.${id}.detail.${check.status}`,
    { defaultValue: check.detail },
  );
}
