import { getModel } from '@core/models/catalog';
import { estimateMaximumModelCost } from '@core/models/cost';
import { getDesktopProviderBridge } from '@core/providers/electronBridgeAdapter';
import { mediaAssetService } from './mediaAssetService';
import { logger } from './loggerService';
import { createStore, get, set } from 'idb-keyval';
import type {
  VideoIterationRequest,
  VideoIterationResolution,
  VideoIterationSession,
  VideoIterationSettings,
  VideoIterationTurn,
} from '@core/types/videoIteration';

const ITERATION_STORE = createStore('veo-video-iterations', 'sessions-v1');

const DEFAULT_SETTINGS: VideoIterationSettings = {
  durationSeconds: 8,
  resolution: '720p',
  aspectRatio: '16:9',
  modelId: 'gemini-omni-1.1-flash',
};

const SUPPORTED_DURATIONS = [3, 4, 5, 6, 7, 8, 9, 10];
const SUPPORTED_RESOLUTIONS: VideoIterationResolution[] = ['360p', '720p', '1080p', '4k'];
const SUPPORTED_ASPECTS = ['16:9', '9:16'];

export class VideoIterationService {
  private static instance: VideoIterationService;
  private pendingSubmissions = new Set<string>();

  static getInstance(): VideoIterationService {
    if (!VideoIterationService.instance) {
      VideoIterationService.instance = new VideoIterationService();
    }
    return VideoIterationService.instance;
  }

  /**
   * Validate and enforce model boundary constraints for Gemini Omni 1.1 Flash.
   */
  validateSettings(settings?: Partial<VideoIterationSettings>): VideoIterationSettings {
    const duration = settings?.durationSeconds ?? DEFAULT_SETTINGS.durationSeconds;
    if (!SUPPORTED_DURATIONS.includes(duration)) {
      throw new Error(`Duration must be between 3 and 10 seconds. Got ${duration}s.`);
    }

    const resolution = settings?.resolution ?? DEFAULT_SETTINGS.resolution;
    if (!SUPPORTED_RESOLUTIONS.includes(resolution)) {
      throw new Error(`Unsupported resolution: ${resolution}. Choose 360p, 720p, 1080p, or 4k.`);
    }

    const aspectRatio = settings?.aspectRatio ?? DEFAULT_SETTINGS.aspectRatio;
    if (!SUPPORTED_ASPECTS.includes(aspectRatio)) {
      throw new Error(`Unsupported aspect ratio: ${aspectRatio}. Choose 16:9 or 9:16.`);
    }

    return {
      durationSeconds: duration,
      resolution,
      aspectRatio,
      modelId: 'gemini-omni-1.1-flash',
    };
  }

  /**
   * Calculates maximum upper-bound cost in USD for the proposed video iteration turn.
   */
  estimateIterationCost(settings?: Partial<VideoIterationSettings>): {
    maximumChargeUsd: number | null;
    confidence: 'exact' | 'upper-bound';
    modelId: string;
    durationSeconds: number;
    resolution: string;
  } {
    const valid = this.validateSettings(settings);
    const model = getModel('gemini-omni-1.1-flash');
    if (!model) {
      return {
        maximumChargeUsd: null,
        confidence: 'upper-bound',
        modelId: valid.modelId,
        durationSeconds: valid.durationSeconds,
        resolution: valid.resolution,
      };
    }

    const cost = estimateMaximumModelCost(model, {
      videoDurationSeconds: valid.durationSeconds,
      videoResolution: valid.resolution,
    });

    return {
      maximumChargeUsd: cost.maximumChargeUsd,
      confidence: cost.confidence === 'exact' ? 'exact' : 'upper-bound',
      modelId: valid.modelId,
      durationSeconds: valid.durationSeconds,
      resolution: valid.resolution,
    };
  }

  /**
   * Computes SHA-256 idempotency key to prevent accidental duplicate execution.
   */
  async computeIdempotencyKey(input: {
    instruction: string;
    interactionId?: string;
    durationSeconds: number;
    resolution: string;
    aspectRatio: string;
  }): Promise<string> {
    const raw = JSON.stringify([
      input.instruction.trim().toLowerCase(),
      input.interactionId ?? '',
      input.durationSeconds,
      input.resolution,
      input.aspectRatio,
    ]);
    const buffer = new TextEncoder().encode(raw);
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Creates initial session starting from an imported or generated base video (Version 1).
   */
  createInitialSession(params: {
    projectId: string;
    artifactId: string;
    variantIndex: 0 | 1 | 2;
    baseAsset: {
      id: string;
      url?: string;
      name?: string;
      durationSeconds?: number;
    };
    initialPrompt: string;
    interactionId?: string;
    settings?: Partial<VideoIterationSettings>;
  }): VideoIterationSession {
    const settings = this.validateSettings(params.settings);
    const initialTurnId = crypto.randomUUID();
    const sessionId = `iter-session-${params.artifactId}-${params.variantIndex}`;

    const turn1: VideoIterationTurn = {
      id: initialTurnId,
      version: 1,
      parentId: null,
      interactionId: params.interactionId,
      instruction: 'Initial generation',
      effectivePrompt: params.initialPrompt,
      assetId: params.baseAsset.id,
      assetUrl: params.baseAsset.url,
      settings,
      costEstimateUsd: 0,
      createdAt: Date.now(),
    };

    return {
      id: sessionId,
      projectId: params.projectId,
      artifactId: params.artifactId,
      variantIndex: params.variantIndex,
      rootAssetId: params.baseAsset.id,
      activeTurnId: initialTurnId,
      turns: [turn1],
      updatedAt: Date.now(),
    };
  }

  /**
   * Performs an AI-based video iteration using natural language instruction.
   * Leverages Gemini Omni 1.1 Flash conversational Interactions API.
   */
  async iterateVideo(
    request: VideoIterationRequest,
    approvalToken?: string,
  ): Promise<{ session: VideoIterationSession; turn: VideoIterationTurn }> {
    const instruction = request.instruction.trim();
    if (!instruction) {
      throw new Error('Please enter instructions for what to change in the video.');
    }

    const settings = this.validateSettings(request.settings);
    let session = request.session;
    if (!session) {
      throw new Error('An active VideoIterationSession is required.');
    }

    const parentTurn = session.turns.find(
      (t) => t.id === (request.parentTurnId ?? session?.activeTurnId),
    );
    if (!parentTurn) {
      throw new Error('Could not find parent video version to iterate from.');
    }

    // Idempotency check
    const idempotencyKey = await this.computeIdempotencyKey({
      instruction,
      interactionId: parentTurn.interactionId,
      durationSeconds: settings.durationSeconds,
      resolution: settings.resolution,
      aspectRatio: settings.aspectRatio,
    });

    if (this.pendingSubmissions.has(idempotencyKey)) {
      throw new Error('This video iteration is already being generated.');
    }
    this.pendingSubmissions.add(idempotencyKey);

    try {
      const bridge = getDesktopProviderBridge();
      let videoBytesBase64: string | null = null;
      let newInteractionId: string | undefined = undefined;

      const model = getModel('gemini-omni-1.1-flash');
      if (!model) throw new Error('Model gemini-omni-1.1-flash is not available in catalog.');

      const costEst = this.estimateIterationCost(settings);

      if (bridge?.executeInteraction) {
        let token = approvalToken;
        if (!token) {
          token = await bridge.approveProviderCost({
            provider: 'gemini-api',
            providerModelId: 'gemini-omni-1.1-flash',
            operation: 'video-edit',
            prompt: instruction,
            interactionId: parentTurn.interactionId,
            costApproval: {
              maximumChargeUsd: costEst.maximumChargeUsd ?? 0.8,
              currency: 'USD',
              confidence: 'upper-bound',
              sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
              verifiedDate: '2026-08-01',
              providerModelId: 'gemini-omni-1.1-flash',
              calculationInputs: {
                videoDurationSeconds: settings.durationSeconds,
                videoResolution: settings.resolution,
              },
            },
          });
        }

        const response = await bridge.executeInteraction({
          requestId: crypto.randomUUID(),
          provider: 'gemini-api',
          providerModelId: 'gemini-omni-1.1-flash',
          operation: 'video-edit',
          prompt: instruction,
          interactionId: parentTurn.interactionId,
          config: {
            duration: settings.durationSeconds,
            resolution: settings.resolution,
            aspectRatio: settings.aspectRatio,
          },
          approvalToken: token,
        });

        if (response.failure) {
          throw new Error(response.message || `Iteration failed: ${response.failure}`);
        }

        newInteractionId = response.interactionId;
        const videoMedia = response.media?.find((m) => m.mimeType.startsWith('video/'));
        if (videoMedia?.data) {
          videoBytesBase64 = videoMedia.data;
        }
      } else {
        // Fallback for tests or web sandbox without native desktop bridge
        logger.info('Simulating video iteration in web preview environment');
        videoBytesBase64 = 'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE='; // Minimal MP4 header
        newInteractionId = `mock-interaction-${crypto.randomUUID()}`;
      }

      if (!videoBytesBase64) {
        throw new Error('No video data received from the AI model.');
      }

      // Convert base64 to Blob and persist in media asset store
      const binaryString = atob(videoBytesBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'video/mp4' });

      const assetKey = `iteration-${session.artifactId}-v${parentTurn.version + 1}-${crypto.randomUUID().slice(0, 8)}`;
      await mediaAssetService.storeBlob(assetKey, blob);
      const assetUrl =
        (await mediaAssetService.getObjectUrl(assetKey)) || URL.createObjectURL(blob);

      const newTurnId = crypto.randomUUID();
      const newTurn: VideoIterationTurn = {
        id: newTurnId,
        version: parentTurn.version + 1,
        parentId: parentTurn.id,
        interactionId: newInteractionId,
        instruction,
        effectivePrompt: `${parentTurn.effectivePrompt} -> ${instruction}`,
        assetId: assetKey,
        assetUrl,
        settings,
        costEstimateUsd: costEst.maximumChargeUsd ?? 0,
        createdAt: Date.now(),
      };

      const updatedSession: VideoIterationSession = {
        ...session,
        activeTurnId: newTurnId,
        turns: [...session.turns, newTurn],
        updatedAt: Date.now(),
      };

      await this.saveSession(updatedSession);
      return { session: updatedSession, turn: newTurn };
    } finally {
      this.pendingSubmissions.delete(idempotencyKey);
    }
  }

  async getSession(id: string): Promise<VideoIterationSession | null> {
    return (await get<VideoIterationSession>(id, ITERATION_STORE)) ?? null;
  }

  async saveSession(session: VideoIterationSession): Promise<void> {
    await set(session.id, session, ITERATION_STORE);
  }
}

export const videoIterationService = VideoIterationService.getInstance();
