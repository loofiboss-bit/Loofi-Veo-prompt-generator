import type {
  VideoGenerationProvider,
  VideoProviderCapabilities,
  VeoCapabilityIssue,
  VeoGenerationRequest,
  VeoModelId,
  VeoResolution,
} from '@core/types';

export const VEO_PRICING_EFFECTIVE_DATE = '2026-07-10';

const VEO_PRICE_PER_SECOND: Record<VeoModelId, Record<VeoResolution, number>> = {
  'veo-3.1-generate-preview': {
    '720p': 0.4,
    '1080p': 0.4,
    '4k': 0.6,
  },
  'veo-3.1-fast-generate-preview': {
    '720p': 0.1,
    '1080p': 0.12,
    '4k': 0.3,
  },
};

class VeoGenerationService implements VideoGenerationProvider {
  private static instance: VeoGenerationService;

  readonly capabilities: VideoProviderCapabilities = {
    providerId: 'veo-3.1',
    models: ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview'],
    modes: ['text-to-video', 'image-to-video', 'interpolation', 'reference-images', 'extension'],
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'],
    maximumReferenceImages: 3,
    supportsSeed: true,
    supportsExtension: true,
    pricingEffectiveDate: VEO_PRICING_EFFECTIVE_DATE,
  };

  static getInstance(): VeoGenerationService {
    if (!VeoGenerationService.instance) {
      VeoGenerationService.instance = new VeoGenerationService();
    }
    return VeoGenerationService.instance;
  }

  validateRequest(request: VeoGenerationRequest, now = Date.now()): VeoCapabilityIssue[] {
    const issues: VeoCapabilityIssue[] = [];
    const hasFirstFrame = Boolean(request.firstFrameAssetId);
    const hasLastFrame = Boolean(request.lastFrameAssetId);
    const hasReferences = request.referenceAssetIds.length > 0;
    const hasExtension = Boolean(request.extensionSourceTakeId || request.extensionArtifact);

    if (!request.prompt.trim()) {
      issues.push({ code: 'prompt-required', field: 'prompt', message: 'Prompt is required.' });
    }

    if (request.mode === 'image-to-video' && !hasFirstFrame) {
      issues.push({
        code: 'first-frame-required',
        field: 'firstFrameAssetId',
        message: 'Image-to-video requires a first frame.',
      });
    }

    if (hasLastFrame && !hasFirstFrame) {
      issues.push({
        code: 'last-frame-requires-first-frame',
        field: 'lastFrameAssetId',
        message: 'A last frame can only be used with a first frame.',
      });
    }

    if (request.mode === 'interpolation' && (!hasFirstFrame || !hasLastFrame)) {
      issues.push({
        code: 'first-frame-required',
        field: 'firstFrameAssetId',
        message: 'Interpolation requires both first and last frames.',
      });
    }

    if (request.referenceAssetIds.length > this.capabilities.maximumReferenceImages) {
      issues.push({
        code: 'reference-count',
        field: 'referenceAssetIds',
        message: 'Veo accepts at most three reference images.',
      });
    }

    if (request.mode === 'reference-images' && !hasReferences) {
      issues.push({
        code: 'reference-count',
        field: 'referenceAssetIds',
        message: 'Reference-image mode requires at least one reference image.',
      });
    }

    if (hasReferences && request.durationSeconds !== 8) {
      issues.push({
        code: 'references-require-eight-seconds',
        field: 'durationSeconds',
        message: 'Reference-image generation requires an eight-second duration.',
      });
    }

    if (request.resolution !== '720p' && request.durationSeconds !== 8) {
      issues.push({
        code: 'high-resolution-requires-eight-seconds',
        field: 'durationSeconds',
        message: '1080p and 4K generation require an eight-second duration.',
      });
    }

    if (request.mode === 'extension') {
      if (!hasExtension || !request.extensionArtifact?.mediaUri) {
        issues.push({
          code: 'extension-artifact-required',
          field: 'extensionArtifact',
          message: 'Extension requires a previous Veo provider artifact.',
        });
      } else if (request.extensionArtifact.expiresAt <= now) {
        issues.push({
          code: 'extension-artifact-expired',
          field: 'extensionArtifact',
          message: 'The provider artifact has expired and cannot be extended.',
        });
      }

      if (request.resolution !== '720p') {
        issues.push({
          code: 'extension-requires-720p',
          field: 'resolution',
          message: 'Veo extensions are limited to 720p.',
        });
      }
    }

    const inputModeCount = [hasFirstFrame || hasLastFrame, hasReferences, hasExtension].filter(
      Boolean,
    ).length;
    if (inputModeCount > 1) {
      issues.push({
        code: 'incompatible-inputs',
        field: 'mode',
        message: 'Frame, reference-image, and extension inputs cannot be combined.',
      });
    }

    return issues;
  }

  estimateCost(request: VeoGenerationRequest): number {
    return VEO_PRICE_PER_SECOND[request.modelId][request.resolution] * request.durationSeconds;
  }
}

export const veoGenerationService = VeoGenerationService.getInstance();
