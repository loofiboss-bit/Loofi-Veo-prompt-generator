/**
 * Multimodal AI Co-Director Service (v13.0.0 - Milestone 4)
 *
 * Provides real-time bidirectional streaming direction via Gemini Live API
 * (gemini-3.8-live), natural voice camera/lighting mutations, function calling,
 * and deterministic local offline intent fallback.
 */

import { GoogleGenAI, Type, Modality } from '@google/genai';
import { getStoredApiKeyAsync } from '@core/services/apiKeyService';
import { useAppStore } from '@core/store/useAppStore';
import { logger } from '@core/services/loggerService';
import { compileSpatialCameraRig, DEFAULT_SPATIAL_CAMERA_RIG } from './spatialCameraService';
import type {
  CoDirectorStatus,
  CoDirectorMessage,
  CoDirectorActionRecord,
  CoDirectorConfig,
  CameraRigMutationParams,
  SceneAestheticsMutationParams,
  ShotActionMutationParams,
} from '@core/types/coDirector';
import type {
  SpatialCameraRig,
  CameraLensType,
  CameraTrajectory,
  CameraAperture,
  CameraHeightLevel,
} from '@core/types/spatialCamera';

export const DEFAULT_CO_DIRECTOR_CONFIG: CoDirectorConfig = {
  model: 'gemini-3.8-live',
  voiceName: 'Puck',
  handsFreeEnabled: true,
  audioOutputEnabled: true,
  language: 'sv',
};

export const CO_DIRECTOR_SYSTEM_INSTRUCTION = `
You are the AI Co-Director and Director of Photography (DoP) for Loofi Creator Studio.
Your goal is to collaborate in real-time with the human director to stage cinematic scenes, choose lenses, plan camera motion, set lighting, and refine storyboard shots.

Guidelines:
1. Speak concisely, naturally, and with professional film terminology (e.g. focal lengths, apertures, depth of field, dolly, orbit, vertigo zoom, rim light, high-key/low-key).
2. Default language is Swedish, but match the director's language (Swedish or English).
3. When the director gives creative or technical commands (e.g., "byt till 50mm objektiv", "gör scen 2 mer dramatisk", "lägg till en drönardykning"), ALWAYS invoke the corresponding tool function (setCameraRig, setSceneAesthetics, createOrModifyShot, requestGenerativeDepthMap) and briefly confirm your action in character.
4. Keep spoken responses under 2-3 sentences so the session remains fast and conversational.
`.trim();

interface LiveSession {
  close?: () => void;
  sendRealtimeInput?: (data: { text: string }) => void;
  sendToolResponse?: (data: {
    functionResponses: Array<{
      id?: string;
      response: { output: { status: string; summary: string } };
    }>;
  }) => void;
}

interface LiveServerContent {
  inputTranscription?: { text?: string };
  outputTranscription?: { text?: string };
  modelTurn?: {
    parts?: Array<{
      functionCall?: {
        name: string;
        args?: Record<string, unknown>;
        id?: string;
      };
    }>;
  };
}

export class AiCoDirectorService {
  private config: CoDirectorConfig = { ...DEFAULT_CO_DIRECTOR_CONFIG };
  private status: CoDirectorStatus = 'disconnected';
  private session: LiveSession | null = null;
  private statusListeners: Array<(status: CoDirectorStatus) => void> = [];
  private messageListeners: Array<(message: CoDirectorMessage) => void> = [];
  private actionListeners: Array<(action: CoDirectorActionRecord) => void> = [];

  constructor(config?: Partial<CoDirectorConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  public getStatus(): CoDirectorStatus {
    return this.status;
  }

  public getConfig(): CoDirectorConfig {
    return { ...this.config };
  }

  public setConfig(patch: Partial<CoDirectorConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  public onStatusChange(callback: (status: CoDirectorStatus) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  public onMessage(callback: (message: CoDirectorMessage) => void): () => void {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter((cb) => cb !== callback);
    };
  }

  public onAction(callback: (action: CoDirectorActionRecord) => void): () => void {
    this.actionListeners.push(callback);
    return () => {
      this.actionListeners = this.actionListeners.filter((cb) => cb !== callback);
    };
  }

  private setStatus(status: CoDirectorStatus): void {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  private emitMessage(message: CoDirectorMessage): void {
    this.messageListeners.forEach((cb) => cb(message));
  }

  private emitAction(action: CoDirectorActionRecord): void {
    this.actionListeners.forEach((cb) => cb(action));
  }

  /**
   * Connects to the Gemini Live session, with graceful offline fallback.
   */
  public async connect(): Promise<boolean> {
    this.setStatus('connecting');

    const apiKey = await getStoredApiKeyAsync();
    if (!apiKey) {
      // Local offline engine ready
      this.setStatus('listening');
      this.emitMessage({
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: 'AI Co-Director ansluten i lokalt direktörsläge (offline intent engine). Redo för röst- och textregi!',
        timestamp: Date.now(),
      });
      return true;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      if (ai.live?.connect) {
        const session = await ai.live.connect({
          model: this.config.model,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: { parts: [{ text: CO_DIRECTOR_SYSTEM_INSTRUCTION }] },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: 'setCameraRig',
                    description: 'Updates 3D camera lens, aperture, height, and trajectory motion.',
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        shotId: { type: Type.NUMBER, description: 'Shot ID to modify' },
                        lens: {
                          type: Type.STRING,
                          enum: [
                            '16mm-ultra-wide',
                            '24mm-wide',
                            '35mm-cinematic',
                            '50mm-natural',
                            '85mm-portrait',
                            '135mm-telephoto',
                            'anamorphic-2.39',
                          ],
                        },
                        aperture: {
                          type: Type.STRING,
                          enum: ['f/1.2', 'f/1.8', 'f/2.8', 'f/4', 'f/8', 'f/16'],
                        },
                        trajectory: {
                          type: Type.STRING,
                          enum: [
                            'static',
                            'push-in',
                            'pull-out',
                            'pan-left',
                            'pan-right',
                            'tilt-up',
                            'tilt-down',
                            'crane-up',
                            'crane-down',
                            'orbit-clockwise',
                            'orbit-counter-clockwise',
                            'dolly-zoom-vertigo',
                            'fpv-drone-dive',
                            'dutch-angle-tracking',
                            'steadicam-follow',
                          ],
                        },
                        heightLevel: {
                          type: Type.STRING,
                          enum: [
                            'ground-level',
                            'knee-level',
                            'waist-level',
                            'eye-level',
                            'high-angle',
                            'birds-eye',
                            'aerial-drone',
                          ],
                        },
                      },
                    },
                  },
                  {
                    name: 'setSceneAesthetics',
                    description: 'Updates lighting style, mood, and environment ambiance.',
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        shotId: { type: Type.NUMBER },
                        lighting: { type: Type.STRING },
                        mood: { type: Type.STRING },
                        environment: { type: Type.STRING },
                      },
                    },
                  },
                  {
                    name: 'createOrModifyShot',
                    description: 'Creates a new shot or modifies action and dialogue on a shot.',
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        action: { type: Type.STRING },
                        shotId: { type: Type.NUMBER },
                        camera: { type: Type.STRING },
                        duration: { type: Type.NUMBER },
                        dialogue: { type: Type.STRING },
                      },
                      required: ['action'],
                    },
                  },
                ],
              },
            ],
          },
          callbacks: {
            onopen: () => {
              this.setStatus('listening');
            },
            onmessage: (msg: unknown) => {
              this.handleLiveMessage(msg as Record<string, unknown>);
            },
            onerror: (err: unknown) => {
              logger.warn('Gemini Live connection warning, falling back to local NLP:', err);
              this.setStatus('listening');
            },
            onclose: () => {
              this.setStatus('disconnected');
            },
          },
        });

        this.session = session;
        this.setStatus('listening');
        return true;
      }
    } catch (error) {
      logger.warn('Could not initialize Gemini Live WebSocket session:', error);
    }

    // Graceful local engine activation
    this.setStatus('listening');
    return true;
  }

  public disconnect(): void {
    if (this.session) {
      try {
        this.session.close?.();
      } catch {
        // Ignore close error
      }
      this.session = null;
    }
    this.setStatus('disconnected');
  }

  /**
   * Handles incoming WebSocket messages from Gemini Live server.
   */
  private handleLiveMessage(msg: Record<string, unknown>): void {
    const serverContent = msg.serverContent as LiveServerContent | undefined;
    if (!serverContent) return;

    // Transcription updates
    if (serverContent.inputTranscription?.text) {
      this.emitMessage({
        id: `user-${Date.now()}`,
        sender: 'user',
        text: serverContent.inputTranscription.text,
        timestamp: Date.now(),
      });
    }

    if (serverContent.outputTranscription?.text) {
      this.emitMessage({
        id: `dir-${Date.now()}`,
        sender: 'director',
        text: serverContent.outputTranscription.text,
        timestamp: Date.now(),
      });
    }

    // Tool function calls
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.functionCall) {
          const { name, args, id } = part.functionCall;
          const result = this.dispatchToolCall(name, args || {});
          if (this.session?.sendToolResponse) {
            this.session.sendToolResponse({
              functionResponses: [{ id, response: { output: result } }],
            });
          }
        }
      }
    }
  }

  /**
   * Dispatches a structured tool call directly into application state.
   */
  public dispatchToolCall(
    toolName: string,
    args: Record<string, unknown>,
  ): { status: string; summary: string } {
    const store = useAppStore.getState();
    let actionRecord: CoDirectorActionRecord;

    switch (toolName) {
      case 'setCameraRig': {
        const params = args as CameraRigMutationParams;
        const currentRig = store.promptState.spatialCamera || DEFAULT_SPATIAL_CAMERA_RIG;
        const updatedRig: SpatialCameraRig = {
          ...currentRig,
          lens: (params.lens as CameraLensType) || currentRig.lens,
          aperture: (params.aperture as CameraAperture) || currentRig.aperture,
          trajectory: (params.trajectory as CameraTrajectory) || currentRig.trajectory,
          heightLevel: (params.heightLevel as CameraHeightLevel) || currentRig.heightLevel,
          spatialGrid: {
            ...currentRig.spatialGrid,
            foregroundSubject: params.foregroundSubject ?? currentRig.spatialGrid.foregroundSubject,
            midgroundSubject: params.midgroundSubject ?? currentRig.spatialGrid.midgroundSubject,
            backgroundEnvironment:
              params.backgroundEnvironment ?? currentRig.spatialGrid.backgroundEnvironment,
          },
        };

        const compiled = compileSpatialCameraRig(updatedRig);
        store.setPromptState({
          spatialCamera: updatedRig,
          cameraMovement: updatedRig.trajectory,
          lensType: updatedRig.lens,
        });

        // Also update shot on timeline if shotId provided or shots exist
        const targetShotId = params.shotId ?? store.sbShots[0]?.id;
        if (targetShotId) {
          store.updateShot(targetShotId, 'camera', compiled.promptFragment);
          store.updateShot(targetShotId, 'spatialCamera', updatedRig);
        }

        actionRecord = {
          id: `act-${Date.now()}`,
          toolName: 'setCameraRig',
          summary: `Kamerarigg uppdaterad till ${updatedRig.lens}, ${updatedRig.trajectory}, ${updatedRig.aperture}`,
          details: { updatedRig, shotId: targetShotId },
          timestamp: Date.now(),
          success: true,
        };
        break;
      }

      case 'setSceneAesthetics': {
        const params = args as SceneAestheticsMutationParams;
        const updates: Record<string, string> = {};
        if (params.lighting) {
          updates.lightingStyle = params.lighting;
          updates.lighting = params.lighting;
        }
        if (params.mood) {
          updates.characterMood = params.mood;
          updates.mood = params.mood;
        }
        if (params.environment) updates.environment = params.environment;

        store.setPromptState(updates);
        const targetShotId = params.shotId ?? store.sbShots[0]?.id;
        if (targetShotId && params.lighting) {
          store.updateShot(targetShotId, 'lighting', params.lighting);
        }

        actionRecord = {
          id: `act-${Date.now()}`,
          toolName: 'setSceneAesthetics',
          summary: `Estetik uppdaterad: ${params.lighting || params.mood || params.environment}`,
          details: params,
          timestamp: Date.now(),
          success: true,
        };
        break;
      }

      case 'createOrModifyShot': {
        const params = args as ShotActionMutationParams;
        if (params.shotId) {
          store.updateShot(params.shotId, 'action', params.action);
          if (params.dialogue) store.updateShot(params.shotId, 'dialogue', params.dialogue);
          if (params.duration) store.updateShot(params.shotId, 'duration', params.duration);
          if (params.camera) store.updateShot(params.shotId, 'camera', params.camera);
        } else {
          store.addShot('video');
          const lastShot =
            useAppStore.getState().sbShots[useAppStore.getState().sbShots.length - 1];
          if (lastShot) {
            store.updateShot(lastShot.id, 'action', params.action);
            if (params.dialogue) store.updateShot(lastShot.id, 'dialogue', params.dialogue);
            if (params.duration) store.updateShot(lastShot.id, 'duration', params.duration);
          }
        }

        actionRecord = {
          id: `act-${Date.now()}`,
          toolName: 'createOrModifyShot',
          summary: `Tagning ${params.shotId || 'ny'} uppdaterad: "${params.action}"`,
          details: params,
          timestamp: Date.now(),
          success: true,
        };
        break;
      }

      default: {
        actionRecord = {
          id: `act-${Date.now()}`,
          toolName,
          summary: `Åtgärd utförd: ${toolName}`,
          details: args,
          timestamp: Date.now(),
          success: true,
        };
      }
    }

    this.emitAction(actionRecord);
    return { status: 'success', summary: actionRecord.summary };
  }

  /**
   * Process a voice or text directive through the Co-Director engine.
   * If connected to Gemini Live, sends realtime input; otherwise executes via deterministic local NLP.
   */
  public async sendDirective(directiveText: string): Promise<CoDirectorMessage> {
    const trimmed = directiveText.trim();
    if (!trimmed) {
      throw new Error('Directive cannot be empty');
    }

    // Emit user turn message
    const userMsg: CoDirectorMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };
    this.emitMessage(userMsg);

    this.setStatus('thinking');

    // If active Gemini Live session exists, send realtime input
    if (this.session?.sendRealtimeInput) {
      try {
        this.session.sendRealtimeInput({ text: trimmed });
        this.setStatus('listening');
        return userMsg;
      } catch (err) {
        logger.warn('Failed to send text to Gemini Live session, using local NLP:', err);
      }
    }

    // Deterministic Local NLP / Intent Engine Fallback
    const localResult = this.processLocalDirective(trimmed);
    this.setStatus('speaking');

    const replyMsg: CoDirectorMessage = {
      id: `dir-${Date.now()}`,
      sender: 'director',
      text: localResult.responseSpeech,
      timestamp: Date.now(),
      executedActions: localResult.actions,
    };

    setTimeout(() => {
      this.emitMessage(replyMsg);
      this.setStatus('listening');
    }, 150);

    return replyMsg;
  }

  /**
   * Intelligent local rule-based intent dispatcher.
   */
  public processLocalDirective(text: string): {
    responseSpeech: string;
    actions: CoDirectorActionRecord[];
  } {
    const lower = text.toLowerCase();
    const actions: CoDirectorActionRecord[] = [];
    const speechFragments: string[] = [];

    // Lens Intent
    let detectedLens: CameraLensType | null = null;
    if (lower.includes('16mm') || lower.includes('ultra-wide') || lower.includes('ultravid')) {
      detectedLens = '16mm-ultra-wide';
    } else if (lower.includes('24mm') || lower.includes('vidvinkel')) {
      detectedLens = '24mm-wide';
    } else if (lower.includes('35mm') || lower.includes('cinema')) {
      detectedLens = '35mm-cinematic';
    } else if (lower.includes('50mm') || lower.includes('normal')) {
      detectedLens = '50mm-natural';
    } else if (lower.includes('85mm') || lower.includes('porträtt')) {
      detectedLens = '85mm-portrait';
    } else if (lower.includes('135mm') || lower.includes('tele')) {
      detectedLens = '135mm-telephoto';
    } else if (lower.includes('anamorf') || lower.includes('2.39')) {
      detectedLens = 'anamorphic-2.39';
    }

    // Aperture Intent
    let detectedAperture: CameraAperture | null = null;
    if (lower.includes('f/1.2') || lower.includes('1.2')) detectedAperture = 'f/1.2';
    else if (lower.includes('f/1.8') || lower.includes('1.8')) detectedAperture = 'f/1.8';
    else if (lower.includes('f/2.8') || lower.includes('2.8')) detectedAperture = 'f/2.8';
    else if (lower.includes('f/4') || lower.includes('f4')) detectedAperture = 'f/4';
    else if (lower.includes('f/8') || lower.includes('f8')) detectedAperture = 'f/8';
    else if (lower.includes('f/16') || lower.includes('f16')) detectedAperture = 'f/16';

    // Trajectory Intent
    let detectedTrajectory: CameraTrajectory | null = null;
    if (lower.includes('orbit') || lower.includes('snurra') || lower.includes('cirkla')) {
      detectedTrajectory = 'orbit-clockwise';
    } else if (lower.includes('drönare') || lower.includes('drone') || lower.includes('dyk')) {
      detectedTrajectory = 'fpv-drone-dive';
    } else if (
      lower.includes('vertigo') ||
      lower.includes('dolly zoom') ||
      lower.includes('dolly-zoom')
    ) {
      detectedTrajectory = 'dolly-zoom-vertigo';
    } else if (lower.includes('kran') || lower.includes('crane')) {
      detectedTrajectory = 'crane-up';
    } else if (lower.includes('push in') || lower.includes('åk in') || lower.includes('närma')) {
      detectedTrajectory = 'push-in';
    } else if (
      lower.includes('pull out') ||
      lower.includes('backa') ||
      lower.includes('dra tillbaka')
    ) {
      detectedTrajectory = 'pull-out';
    } else if (lower.includes('dutch') || lower.includes('lutad') || lower.includes('sned')) {
      detectedTrajectory = 'dutch-angle-tracking';
    } else if (lower.includes('steadicam') || lower.includes('följ')) {
      detectedTrajectory = 'steadicam-follow';
    }

    // Lighting Intent
    let detectedLighting: string | null = null;
    let speechLighting: string | null = null;
    if (lower.includes('motljus') || lower.includes('backlight') || lower.includes('rim light')) {
      detectedLighting = 'cinematic backlight and sharp rim lighting';
      speechLighting = 'motljus och skarp rim-belysning';
    } else if (lower.includes('neon') || lower.includes('cyberpunk')) {
      detectedLighting =
        'cool cyan and magenta neon practical lighting with wet street reflections';
      speechLighting = 'neonbelysning och våta reflektioner';
    } else if (
      lower.includes('golden hour') ||
      lower.includes('solnedgång') ||
      lower.includes('gyllene')
    ) {
      detectedLighting = 'warm golden hour directional sunlight with long soft shadows';
      speechLighting = 'varm golden hour med mjuka skuggor';
    } else if (lower.includes('dramatisk') || lower.includes('noir') || lower.includes('skuggor')) {
      detectedLighting = 'dramatic low-key chiaroscuro lighting with deep shadows';
      speechLighting = 'dramatisk ljussättning med djupa skuggor';
    }

    // Apply Camera Rig updates
    if (detectedLens || detectedAperture || detectedTrajectory) {
      const toolRes = this.dispatchToolCall('setCameraRig', {
        lens: detectedLens || undefined,
        aperture: detectedAperture || undefined,
        trajectory: detectedTrajectory || undefined,
      });
      speechFragments.push(
        `Kameran är riggad med ${detectedLens || 'befintligt objektiv'}${
          detectedTrajectory ? ` och en ${detectedTrajectory}-åkning` : ''
        }${detectedAperture ? ` vid ${detectedAperture}` : ''}.`,
      );
      actions.push({
        id: `act-${Date.now()}-cam`,
        toolName: 'setCameraRig',
        summary: toolRes.summary,
        details: { lens: detectedLens, aperture: detectedAperture, trajectory: detectedTrajectory },
        timestamp: Date.now(),
        success: true,
      });
    }

    // Apply Lighting updates
    if (detectedLighting) {
      const toolRes = this.dispatchToolCall('setSceneAesthetics', {
        lighting: detectedLighting,
      });
      speechFragments.push(
        `Jag har ställt in ljussättningen till ${speechLighting || detectedLighting}.`,
      );
      actions.push({
        id: `act-${Date.now()}-lit`,
        toolName: 'setSceneAesthetics',
        summary: toolRes.summary,
        details: { lighting: detectedLighting },
        timestamp: Date.now(),
        success: true,
      });
    }

    // New Shot creation Intent
    if (
      lower.includes('ny tagning') ||
      lower.includes('lägg till scen') ||
      lower.includes('add shot')
    ) {
      const toolRes = this.dispatchToolCall('createOrModifyShot', {
        action:
          text.replace(/ny tagning|lägg till scen|add shot/gi, '').trim() ||
          'Fortsättning på scenen',
      });
      speechFragments.push('En ny tagning har lagts till i tidslinjen.');
      actions.push({
        id: `act-${Date.now()}-shot`,
        toolName: 'createOrModifyShot',
        summary: toolRes.summary,
        details: {},
        timestamp: Date.now(),
        success: true,
      });
    }

    // Fallback creative dialogue if no technical keywords matched
    if (speechFragments.length === 0) {
      speechFragments.push(
        `Uppfattat regissören. Jag har antecknat din vision: "${text}". Vill du att vi testar ett 50mm objektiv eller lägger till dramatisk kontrast?`,
      );
    }

    return {
      responseSpeech: speechFragments.join(' '),
      actions,
    };
  }
}

export const aiCoDirectorService = new AiCoDirectorService();
