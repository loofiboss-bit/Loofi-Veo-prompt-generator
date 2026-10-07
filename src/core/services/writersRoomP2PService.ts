/**
 * Writers' Room P2P Collaboration Service
 * v13.0.0 - Milestone 6: P2P Virtual Writers' Room
 *
 * Provides peer-to-peer LAN pairing utilities, WebRTC signaling configuration,
 * creative role definitions, health monitoring, and CRDT message structuring.
 */

import type {
  WritersRoomRole,
  WritersRoomRoleConfig,
  WritersRoomLANInvite,
  WritersRoomLANConfig,
  WritersRoomMessage,
  WritersRoomMessageType,
} from '@core/types';
import { logger } from './loggerService';

// ─── Default Signaling Endpoints ─────────────────────────────────────

export const DEFAULT_LAN_SIGNALING_URLS = ['ws://localhost:4444', 'ws://127.0.0.1:4444'];

export const DEFAULT_CLOUD_SIGNALING_URLS = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.herokuapp.com',
];

export const LAN_INVITE_PREFIX = 'LOOFI-ROOM-';

// ─── Creative Role Definitions ───────────────────────────────────────

export const WRITERS_ROOM_ROLES: Record<WritersRoomRole, WritersRoomRoleConfig> = {
  screenwriter: {
    id: 'screenwriter',
    label: 'Manusförfattare (Screenwriter)',
    shortLabel: 'Manus',
    icon: 'document',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Skriver och reviderar dialog, karaktärsbågar och scenanvisningar.',
    permissions: ['read', 'write', 'comment', 'export'],
  },
  director: {
    id: 'director',
    label: 'Regissör (Director)',
    shortLabel: 'Regi',
    icon: 'video',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Övergripande visuell vision, estetik, kamerarörelser och regi-noteringar.',
    permissions: ['read', 'write', 'comment', 'manage_roles', 'export'],
  },
  sound_designer: {
    id: 'sound_designer',
    label: 'Ljuddesigner (Sound Designer)',
    shortLabel: 'Ljud / SFX',
    icon: 'mic',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'Designar ljudspår, foley-cues, ljudeffekter, rumston och dynamisk ducking.',
    permissions: ['read', 'write', 'comment', 'export'],
  },
  editor: {
    id: 'editor',
    label: 'Klippare (Editor)',
    shortLabel: 'Klipp',
    icon: 'film',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Arrangerar tidslinjespår, klippning, sekvensövergångar och klipptempo.',
    permissions: ['read', 'write', 'comment', 'export'],
  },
  producer: {
    id: 'producer',
    label: 'Producent (Producer)',
    shortLabel: 'Prod',
    icon: 'folder',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: 'Projektöversikt, granskning, versionsgodkännande och delning.',
    permissions: ['read', 'write', 'comment', 'share', 'manage_roles', 'export'],
  },
  viewer: {
    id: 'viewer',
    label: 'Åskådare (Viewer)',
    shortLabel: 'Åskådare',
    icon: 'eye',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    description: 'Realtidsvisning utan redigeringsrättigheter.',
    permissions: ['read'],
  },
};

// ─── Service Class ───────────────────────────────────────────────────

export class WritersRoomP2PService {
  private static instance: WritersRoomP2PService;

  static getInstance(): WritersRoomP2PService {
    if (!WritersRoomP2PService.instance) {
      WritersRoomP2PService.instance = new WritersRoomP2PService();
    }
    return WritersRoomP2PService.instance;
  }

  /**
   * Resolves the list of signaling URLs according to the chosen mode.
   */
  getSignalingUrls(config?: Partial<WritersRoomLANConfig>): string[] {
    const mode = config?.mode ?? 'local_lan';
    switch (mode) {
      case 'local_lan':
        return DEFAULT_LAN_SIGNALING_URLS;
      case 'custom':
        return config?.customUrl?.trim() ? [config.customUrl.trim()] : DEFAULT_LAN_SIGNALING_URLS;
      case 'broadcast_channel':
        // Empty array instructs y-webrtc to only rely on BroadcastChannel within the machine
        return [];
      case 'cloud_fallback':
        return DEFAULT_CLOUD_SIGNALING_URLS;
      default:
        return DEFAULT_LAN_SIGNALING_URLS;
    }
  }

  /**
   * Encodes a LAN room invite into a portable, copyable string token.
   */
  createLanInviteCode(invite: WritersRoomLANInvite): string {
    try {
      const payloadString = JSON.stringify(invite);
      const base64 =
        typeof btoa === 'function'
          ? btoa(encodeURIComponent(payloadString))
          : Buffer.from(encodeURIComponent(payloadString)).toString('base64');
      return `${LAN_INVITE_PREFIX}${base64}`;
    } catch (error) {
      logger.error('WritersRoomP2PService', 'Failed to create LAN invite code', error);
      throw error;
    }
  }

  /**
   * Decodes and validates a portable LAN invite token.
   * Returns null if the code is invalid or corrupt.
   */
  parseLanInviteCode(code: string): WritersRoomLANInvite | null {
    if (!code || typeof code !== 'string') return null;
    const cleanCode = code.trim();
    if (!cleanCode.startsWith(LAN_INVITE_PREFIX)) return null;

    try {
      const rawBase64 = cleanCode.slice(LAN_INVITE_PREFIX.length);
      const decodedString =
        typeof atob === 'function'
          ? decodeURIComponent(atob(rawBase64))
          : decodeURIComponent(Buffer.from(rawBase64, 'base64').toString('utf8'));

      const parsed = JSON.parse(decodedString) as Partial<WritersRoomLANInvite>;

      if (
        !parsed.roomId ||
        typeof parsed.roomId !== 'string' ||
        !Array.isArray(parsed.signalingUrls)
      ) {
        return null;
      }

      return {
        version: typeof parsed.version === 'number' ? parsed.version : 1,
        roomId: parsed.roomId,
        roomName: parsed.roomName || 'Writers Room',
        projectId: parsed.projectId || 'default',
        signalingUrls: parsed.signalingUrls,
        roomPassword: parsed.roomPassword || undefined,
        hostDisplayName: parsed.hostDisplayName || 'Peer',
        createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
      };
    } catch (error) {
      logger.warn('WritersRoomP2PService', 'Invalid LAN invite code provided', error);
      return null;
    }
  }

  /**
   * Tests non-blocking connectivity against a WebSocket signaling server.
   */
  async checkSignalingHealth(
    url: string,
    timeoutMs: number = 2000,
  ): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
    if (typeof WebSocket === 'undefined') {
      return { ok: false, error: 'WebSocket is not supported in this environment' };
    }

    const start = performance.now();
    return new Promise((resolve) => {
      let resolved = false;
      let ws: WebSocket | null = null;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try {
            ws?.close();
          } catch {
            // ignore
          }
          resolve({ ok: false, error: `Connection timed out after ${timeoutMs}ms` });
        }
      }, timeoutMs);

      try {
        ws = new WebSocket(url);

        ws.onopen = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            const latencyMs = Math.round(performance.now() - start);
            try {
              ws?.close();
            } catch {
              // ignore
            }
            resolve({ ok: true, latencyMs });
          }
        };

        ws.onerror = (_evt) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({ ok: false, error: 'Signaling server unreachable' });
          }
        };
      } catch (err) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({
            ok: false,
            error: err instanceof Error ? err.message : 'Unknown connection error',
          });
        }
      }
    });
  }

  /**
   * Creates a structured Writers' Room collaborative message.
   */
  createWritersRoomMessage(params: {
    senderId: string;
    senderName: string;
    senderRole: WritersRoomRole;
    senderColor: string;
    text: string;
    type?: WritersRoomMessageType;
    targetShotId?: number;
    targetSceneTitle?: string;
  }): WritersRoomMessage {
    return {
      id: `wrm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: params.senderId,
      senderName: params.senderName,
      senderRole: params.senderRole,
      senderColor: params.senderColor,
      text: params.text.trim(),
      timestamp: Date.now(),
      type: params.type || 'chat',
      targetShotId: params.targetShotId,
      targetSceneTitle: params.targetSceneTitle,
    };
  }

  /**
   * Filters a list of messages by message type.
   */
  filterMessagesByType(
    messages: WritersRoomMessage[],
    type?: WritersRoomMessageType | 'all',
  ): WritersRoomMessage[] {
    if (!type || type === 'all') return messages;
    return messages.filter((m) => m.type === type);
  }
}

export const writersRoomP2PService = WritersRoomP2PService.getInstance();
