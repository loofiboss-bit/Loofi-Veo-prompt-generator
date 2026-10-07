import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  writersRoomP2PService,
  DEFAULT_LAN_SIGNALING_URLS,
  DEFAULT_CLOUD_SIGNALING_URLS,
  LAN_INVITE_PREFIX,
  WRITERS_ROOM_ROLES,
} from './writersRoomP2PService';
import type { WritersRoomLANInvite, WritersRoomMessage } from '@core/types';

describe('writersRoomP2PService', () => {
  const sampleInvite: WritersRoomLANInvite = {
    version: 1,
    roomId: 'room-writers-alpha',
    roomName: 'Cyberpunk Pilot Writers Room',
    projectId: 'proj-cyber-1',
    signalingUrls: ['ws://192.168.1.100:4444'],
    roomPassword: 'secure-passphrase-123',
    hostDisplayName: 'Director Nova',
    createdAt: 1775550000000,
  };

  describe('LAN Invite Code generation & decoding', () => {
    it('creates a valid invite string starting with LOOFI-ROOM-', () => {
      const code = writersRoomP2PService.createLanInviteCode(sampleInvite);
      expect(code).toBeDefined();
      expect(code.startsWith(LAN_INVITE_PREFIX)).toBe(true);
    });

    it('roundtrips LAN invite payloads faithfully', () => {
      const code = writersRoomP2PService.createLanInviteCode(sampleInvite);
      const parsed = writersRoomP2PService.parseLanInviteCode(code);

      expect(parsed).not.toBeNull();
      expect(parsed?.roomId).toBe(sampleInvite.roomId);
      expect(parsed?.roomName).toBe(sampleInvite.roomName);
      expect(parsed?.projectId).toBe(sampleInvite.projectId);
      expect(parsed?.signalingUrls).toEqual(sampleInvite.signalingUrls);
      expect(parsed?.roomPassword).toBe(sampleInvite.roomPassword);
      expect(parsed?.hostDisplayName).toBe(sampleInvite.hostDisplayName);
      expect(parsed?.createdAt).toBe(sampleInvite.createdAt);
    });

    it('handles UTF-8 and Swedish characters in room and host names', () => {
      const utf8Invite: WritersRoomLANInvite = {
        ...sampleInvite,
        roomName: 'Manusrum för Årets Stora Film & TV-serie',
        hostDisplayName: 'Regissör Örjan Ström',
      };
      const code = writersRoomP2PService.createLanInviteCode(utf8Invite);
      const parsed = writersRoomP2PService.parseLanInviteCode(code);

      expect(parsed?.roomName).toBe('Manusrum för Årets Stora Film & TV-serie');
      expect(parsed?.hostDisplayName).toBe('Regissör Örjan Ström');
    });

    it('returns null for empty, invalid, or corrupted invite codes', () => {
      expect(writersRoomP2PService.parseLanInviteCode('')).toBeNull();
      expect(writersRoomP2PService.parseLanInviteCode('INVALID_CODE')).toBeNull();
      expect(
        writersRoomP2PService.parseLanInviteCode(`${LAN_INVITE_PREFIX}bad-base64-###`),
      ).toBeNull();
      expect(writersRoomP2PService.parseLanInviteCode(`${LAN_INVITE_PREFIX}e30=`)).toBeNull(); // empty object {}
    });
  });

  describe('Signaling URL resolution', () => {
    it('resolves local_lan to default LAN endpoints', () => {
      const urls = writersRoomP2PService.getSignalingUrls({
        mode: 'local_lan',
        customUrl: '',
        roomPassword: '',
      });
      expect(urls).toEqual(DEFAULT_LAN_SIGNALING_URLS);
    });

    it('resolves custom mode to custom URL when specified', () => {
      const urls = writersRoomP2PService.getSignalingUrls({
        mode: 'custom',
        customUrl: 'ws://192.168.0.55:9000',
        roomPassword: '',
      });
      expect(urls).toEqual(['ws://192.168.0.55:9000']);
    });

    it('falls back to default LAN endpoints when custom mode has empty URL', () => {
      const urls = writersRoomP2PService.getSignalingUrls({
        mode: 'custom',
        customUrl: '   ',
        roomPassword: '',
      });
      expect(urls).toEqual(DEFAULT_LAN_SIGNALING_URLS);
    });

    it('resolves broadcast_channel to empty array for zero-network mode', () => {
      const urls = writersRoomP2PService.getSignalingUrls({
        mode: 'broadcast_channel',
        customUrl: '',
        roomPassword: '',
      });
      expect(urls).toEqual([]);
    });

    it('resolves cloud_fallback to default cloud endpoints', () => {
      const urls = writersRoomP2PService.getSignalingUrls({
        mode: 'cloud_fallback',
        customUrl: '',
        roomPassword: '',
      });
      expect(urls).toEqual(DEFAULT_CLOUD_SIGNALING_URLS);
    });
  });

  describe('Writers Room Roles definitions', () => {
    it('defines all 6 standard creative roles with correct labels and permissions', () => {
      const expectedRoles = [
        'screenwriter',
        'director',
        'sound_designer',
        'editor',
        'producer',
        'viewer',
      ] as const;

      for (const role of expectedRoles) {
        expect(WRITERS_ROOM_ROLES[role]).toBeDefined();
        expect(WRITERS_ROOM_ROLES[role].id).toBe(role);
        expect(WRITERS_ROOM_ROLES[role].label).toBeTruthy();
        expect(WRITERS_ROOM_ROLES[role].shortLabel).toBeTruthy();
        expect(WRITERS_ROOM_ROLES[role].badgeColor).toBeTruthy();
        expect(WRITERS_ROOM_ROLES[role].permissions.length).toBeGreaterThan(0);
      }

      // Specific role checks
      expect(WRITERS_ROOM_ROLES.director.permissions).toContain('manage_roles');
      expect(WRITERS_ROOM_ROLES.producer.permissions).toContain('share');
      expect(WRITERS_ROOM_ROLES.viewer.permissions).toEqual(['read']);
    });
  });

  describe('Collaborative messages', () => {
    it('creates structured messages with unique IDs and timestamps', () => {
      const msg = writersRoomP2PService.createWritersRoomMessage({
        senderId: 'user-director-1',
        senderName: 'Director Lisa',
        senderRole: 'director',
        senderColor: '#f59e0b',
        text: 'Öka kontrasten i nästa scen',
        type: 'director_note',
        targetShotId: 3,
        targetSceneTitle: 'INT. SAFE HOUSE',
      });

      expect(msg.id.startsWith('wrm_')).toBe(true);
      expect(msg.senderName).toBe('Director Lisa');
      expect(msg.senderRole).toBe('director');
      expect(msg.type).toBe('director_note');
      expect(msg.text).toBe('Öka kontrasten i nästa scen');
      expect(msg.targetShotId).toBe(3);
      expect(msg.targetSceneTitle).toBe('INT. SAFE HOUSE');
      expect(typeof msg.timestamp).toBe('number');
    });

    it('filters messages by type accurately', () => {
      const messages: WritersRoomMessage[] = [
        writersRoomP2PService.createWritersRoomMessage({
          senderId: '1',
          senderName: 'A',
          senderRole: 'screenwriter',
          senderColor: '#fff',
          text: 'Hi all',
          type: 'chat',
        }),
        writersRoomP2PService.createWritersRoomMessage({
          senderId: '2',
          senderName: 'B',
          senderRole: 'director',
          senderColor: '#fff',
          text: 'Fix shot 2',
          type: 'director_note',
        }),
        writersRoomP2PService.createWritersRoomMessage({
          senderId: '3',
          senderName: 'C',
          senderRole: 'sound_designer',
          senderColor: '#fff',
          text: 'Added footsteps foley',
          type: 'audio_cue_note',
        }),
      ];

      expect(writersRoomP2PService.filterMessagesByType(messages, 'all').length).toBe(3);
      expect(writersRoomP2PService.filterMessagesByType(messages, 'director_note').length).toBe(1);
      expect(writersRoomP2PService.filterMessagesByType(messages, 'audio_cue_note').length).toBe(1);
      expect(writersRoomP2PService.filterMessagesByType(messages, 'script_revision').length).toBe(
        0,
      );
    });
  });

  describe('Signaling server health check', () => {
    let originalWebSocket: typeof WebSocket | undefined;

    beforeEach(() => {
      originalWebSocket = globalThis.WebSocket;
    });

    afterEach(() => {
      globalThis.WebSocket = originalWebSocket as typeof WebSocket;
    });

    it('returns ok: true when WebSocket connection succeeds', async () => {
      // Mock successful WebSocket
      class MockSuccessWS {
        onopen: (() => void) | null = null;
        onerror: (() => void) | null = null;
        close = vi.fn();
        constructor() {
          setTimeout(() => this.onopen?.(), 10);
        }
      }
      globalThis.WebSocket = MockSuccessWS as unknown as typeof WebSocket;

      const result = await writersRoomP2PService.checkSignalingHealth('ws://localhost:4444', 500);
      expect(result.ok).toBe(true);
      expect(typeof result.latencyMs).toBe('number');
    });

    it('returns ok: false when WebSocket connection fails', async () => {
      class MockErrorWS {
        onopen: (() => void) | null = null;
        onerror: (() => void) | null = null;
        close = vi.fn();
        constructor() {
          setTimeout(() => this.onerror?.(), 10);
        }
      }
      globalThis.WebSocket = MockErrorWS as unknown as typeof WebSocket;

      const result = await writersRoomP2PService.checkSignalingHealth('ws://localhost:9999', 500);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Signaling server unreachable');
    });

    it('returns error when WebSocket is not supported', async () => {
      // @ts-expect-error intentionally removing WebSocket
      delete globalThis.WebSocket;

      const result = await writersRoomP2PService.checkSignalingHealth('ws://localhost:4444');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('not supported');
    });
  });
});
