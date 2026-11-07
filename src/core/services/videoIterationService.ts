import { getModel } from '@core/models/catalog';
import { estimateMaximumModelCost } from '@core/models/cost';
import { getDesktopProviderBridge } from '@core/providers/electronBridgeAdapter';
import { mediaAssetService } from './mediaAssetService';
import { logger } from './loggerService';
import { createStore, get, set } from 'idb-keyval';
import type {
  VideoIterationMode,
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
  modelId: 'gemini-omni-1.2-flash',
  mode: 'edit',
  keepAudio: true,
};

const SUPPORTED_EDIT_DURATIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const SUPPORTED_EXTEND_DURATIONS = [3, 4, 5, 6, 7, 8, 9, 10];
const SUPPORTED_RESOLUTIONS: VideoIterationResolution[] = ['360p', '720p', '1080p', '4k'];
const SUPPORTED_ASPECTS = ['16:9', '9:16'];
const SUPPORTED_MODES: VideoIterationMode[] = ['edit', 'extend'];

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
   * Validate and enforce model boundary constraints for Gemini Omni 1.2 Flash (with 1.1 alias support).
   */
  validateSettings(settings?: Partial<VideoIterationSettings>): VideoIterationSettings {
    const mode = settings?.mode ?? DEFAULT_SETTINGS.mode ?? 'edit';
    if (!SUPPORTED_MODES.includes(mode)) {
      throw new Error(`Unsupported iteration mode: ${mode}. Choose edit or extend.`);
    }

    const modelId =
      settings?.modelId === 'gemini-omni-1.1-flash'
        ? 'gemini-omni-1.1-flash'
        : 'gemini-omni-1.2-flash';

    const duration = settings?.durationSeconds ?? DEFAULT_SETTINGS.durationSeconds;
    const allowedDurations =
      mode === 'extend' || modelId === 'gemini-omni-1.1-flash'
        ? SUPPORTED_EXTEND_DURATIONS
        : SUPPORTED_EDIT_DURATIONS;

    if (!allowedDurations.includes(duration)) {
      const maxSec = allowedDurations[allowedDurations.length - 1];
      throw new Error(`Duration must be between 3 and ${maxSec} seconds. Got ${duration}s.`);
    }

    const resolution = settings?.resolution ?? DEFAULT_SETTINGS.resolution;
    if (!SUPPORTED_RESOLUTIONS.includes(resolution)) {
      throw new Error(`Unsupported resolution: ${resolution}. Choose 360p, 720p, 1080p, or 4k.`);
    }

    const aspectRatio = settings?.aspectRatio ?? DEFAULT_SETTINGS.aspectRatio;
    if (!SUPPORTED_ASPECTS.includes(aspectRatio)) {
      throw new Error(`Unsupported aspect ratio: ${aspectRatio}. Choose 16:9 or 9:16.`);
    }

    const keepAudio = settings?.keepAudio ?? true;

    return {
      durationSeconds: duration,
      resolution,
      aspectRatio,
      modelId,
      mode,
      keepAudio,
    };
  }

  /**
   * Calculates maximum upper-bound cost in USD for the proposed video iteration turn.
   */
  estimateIterationCost(
    settings?: Partial<VideoIterationSettings>,
    promptLength = 120,
    inputCharacters = 0,
  ): {
    maximumChargeUsd: number | null;
    confidence: 'exact' | 'upper-bound';
    modelId: string;
    durationSeconds: number;
    resolution: string;
    estimatedInputTokens: number;
  } {
    const valid = this.validateSettings(settings);
    const estimatedInputTokens = Math.max(1000, Math.ceil((promptLength + inputCharacters) / 3));
    const model = getModel(valid.modelId) ?? getModel('gemini-omni-1.1-flash');
    if (!model) {
      return {
        maximumChargeUsd: null,
        confidence: 'upper-bound',
        modelId: valid.modelId,
        durationSeconds: valid.durationSeconds,
        resolution: valid.resolution,
        estimatedInputTokens,
      };
    }

    const cost = estimateMaximumModelCost(model, {
      videoDurationSeconds: valid.durationSeconds,
      videoResolution: valid.resolution,
      estimatedInputTokens,
    });

    return {
      maximumChargeUsd: cost.maximumChargeUsd,
      confidence: cost.confidence === 'exact' ? 'exact' : 'upper-bound',
      modelId: valid.modelId,
      durationSeconds: valid.durationSeconds,
      resolution: valid.resolution,
      estimatedInputTokens,
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
    mode?: string;
    keepAudio?: boolean;
  }): Promise<string> {
    const raw = JSON.stringify([
      input.instruction.trim().toLowerCase(),
      input.interactionId ?? '',
      input.durationSeconds,
      input.resolution,
      input.aspectRatio,
      input.mode ?? 'edit',
      input.keepAudio ?? true,
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
      parentVersion: undefined,
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
   * Loads an existing session from IndexedDB and refreshes transient Blob ObjectURLs,
   * or creates a new initial session if none exists.
   */
  async getOrCreateSession(params: {
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
  }): Promise<VideoIterationSession> {
    const sessionId = `iter-session-${params.artifactId}-${params.variantIndex}`;
    try {
      const existing = await this.getSession(sessionId);
      if (existing && existing.turns.length > 0 && existing.rootAssetId === params.baseAsset.id) {
        const hydratedTurns = await Promise.all(
          existing.turns.map(async (turn) => {
            const refreshedUrl = await mediaAssetService.getObjectUrl(turn.assetId);
            return {
              ...turn,
              assetUrl:
                refreshedUrl ||
                turn.assetUrl ||
                (turn.version === 1 ? params.baseAsset.url : undefined),
            };
          }),
        );
        return {
          ...existing,
          turns: hydratedTurns,
        };
      }
    } catch (error) {
      logger.warn('Failed to hydrate saved VideoIterationSession, creating fresh session', error);
    }

    const fresh = this.createInitialSession(params);
    try {
      await this.saveSession(fresh);
    } catch {
      // Ignore storage persistence errors in non-IDB environments
    }
    return fresh;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  private async base64ToBlob(base64Data: string, mimeType = 'video/mp4'): Promise<Blob> {
    try {
      if (typeof fetch === 'function') {
        const response = await fetch(`data:${mimeType};base64,${base64Data}`);
        if (response.ok) {
          return await response.blob();
        }
      }
    } catch {
      // Fallback to chunked Uint8Array decoding below
    }
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  /**
   * Resolves source video base64 for Turn-1 iterations when no interactionId is present yet.
   */
  private async resolveSourceVideoInput(
    parentTurn: VideoIterationTurn,
  ): Promise<Array<{ mimeType: string; data: string }> | undefined> {
    if (parentTurn.interactionId) {
      return undefined;
    }
    try {
      const record = await mediaAssetService.getRecord?.(parentTurn.assetId);
      if (record?.blob) {
        const data = await this.blobToBase64(record.blob);
        return [{ mimeType: record.mimeType || 'video/mp4', data }];
      }
      if (
        parentTurn.assetUrl &&
        (parentTurn.assetUrl.startsWith('blob:') ||
          parentTurn.assetUrl.startsWith('data:') ||
          parentTurn.assetUrl.startsWith('loofi-media:'))
      ) {
        const res = await fetch(parentTurn.assetUrl);
        if (res.ok) {
          const blob = await res.blob();
          const data = await this.blobToBase64(blob);
          return [{ mimeType: blob.type || 'video/mp4', data }];
        }
      }
    } catch (error) {
      logger.warn('Could not read base video bytes for Turn-1 iteration input', error);
    }
    return undefined;
  }

  /**
   * Formats instruction according to mode ('edit' vs 'extend') and audio regeneration toggle.
   */
  formatInstructionForModel(instruction: string, settings: VideoIterationSettings): string {
    let formatted = instruction.trim();
    if (settings.mode === 'extend' && !/^extend\b/i.test(formatted)) {
      formatted = `Extend this video. ${formatted}`;
    }
    if (settings.keepAudio === false) {
      formatted = `${formatted} Regenerate audio and ambient sound effects from scratch to match the updated visuals.`;
    }
    return formatted;
  }

  /**
   * Performs an AI-based video iteration using natural language instruction.
   * Leverages Gemini Omni 1.2 Flash conversational Interactions API.
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
    const session = request.session;
    if (!session) {
      throw new Error('An active VideoIterationSession is required.');
    }

    const parentTurn = session.turns.find(
      (t) => t.id === (request.parentTurnId ?? session.activeTurnId),
    );
    if (!parentTurn) {
      throw new Error('Could not find parent video version to iterate from.');
    }

    const idempotencyKey = await this.computeIdempotencyKey({
      instruction,
      interactionId: parentTurn.interactionId,
      durationSeconds: settings.durationSeconds,
      resolution: settings.resolution,
      aspectRatio: settings.aspectRatio,
      mode: settings.mode,
      keepAudio: settings.keepAudio,
    });

    if (this.pendingSubmissions.has(idempotencyKey)) {
      throw new Error('This video iteration is already being generated.');
    }
    this.pendingSubmissions.add(idempotencyKey);

    try {
      const bridge = getDesktopProviderBridge();
      let videoBytesBase64: string | null = null;
      let newInteractionId: string | undefined = undefined;

      const model = getModel(settings.modelId) ?? getModel('gemini-omni-1.1-flash');
      if (!model) throw new Error(`Model ${settings.modelId} is not available in catalog.`);

      const modelPrompt = this.formatInstructionForModel(instruction, settings);
      const inputs = await this.resolveSourceVideoInput(parentTurn);
      const inputCharacters = (inputs ?? []).reduce((sum, item) => sum + item.data.length, 0);
      const costEst = this.estimateIterationCost(settings, modelPrompt.length, inputCharacters);

      if (bridge?.executeInteraction) {
        const requestId = crypto.randomUUID();
        const config = {
          duration: settings.durationSeconds,
          resolution: settings.resolution,
          aspectRatio: settings.aspectRatio,
          mode: settings.mode ?? 'edit',
          keepAudio: settings.keepAudio !== false,
        };

        let token = approvalToken;
        if (!token) {
          token = await bridge.approveProviderCost({
            requestId,
            provider: 'gemini-api',
            providerModelId: settings.modelId,
            operation: 'video-edit',
            prompt: modelPrompt,
            inputs,
            interactionId: parentTurn.interactionId,
            config,
            costApproval: {
              maximumChargeUsd: costEst.maximumChargeUsd ?? 0.8,
              currency: 'USD',
              confidence: 'upper-bound',
              sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
              verifiedDate: '2026-10-29',
              providerModelId: settings.modelId,
              calculationInputs: {
                videoDurationSeconds: settings.durationSeconds,
                videoResolution: settings.resolution,
                estimatedInputTokens: costEst.estimatedInputTokens,
              },
            },
          });
        }

        const response = await bridge.executeInteraction({
          requestId,
          provider: 'gemini-api',
          providerModelId: settings.modelId,
          operation: 'video-edit',
          prompt: modelPrompt,
          inputs,
          interactionId: parentTurn.interactionId,
          config,
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

      const blob = await this.base64ToBlob(videoBytesBase64, 'video/mp4');
      const nextVersion = Math.max(0, ...session.turns.map((t) => t.version)) + 1;
      const assetKey = `iteration-${session.artifactId}-v${nextVersion}-${crypto.randomUUID().slice(0, 8)}`;

      let assetUrl: string | undefined;
      if (typeof window !== 'undefined' && window.electron?.importDesktopMedia) {
        try {
          const bytes = await blob.arrayBuffer();
          const stored = await window.electron.importDesktopMedia({
            key: assetKey,
            bytes,
            mimeType: 'video/mp4',
          });
          assetUrl = stored.displayUrl ?? stored.localUrl;
        } catch (err) {
          logger.warn(
            'DesktopMediaStore import failed for iteration turn, falling back to IndexedDB',
            err,
          );
        }
      }

      if (!assetUrl) {
        await mediaAssetService.storeBlob(assetKey, blob);
        assetUrl = (await mediaAssetService.getObjectUrl(assetKey)) || URL.createObjectURL(blob);
      }

      const newTurnId = crypto.randomUUID();
      const newTurn: VideoIterationTurn = {
        id: newTurnId,
        version: nextVersion,
        parentId: parentTurn.id,
        parentVersion: parentTurn.version,
        interactionId: newInteractionId,
        instruction,
        effectivePrompt: `${parentTurn.effectivePrompt} -> ${modelPrompt}`,
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
