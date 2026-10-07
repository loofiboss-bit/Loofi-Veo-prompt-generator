/**
 * Virtual Writers' Room & P2P Collaboration Types
 * v13.0.0 - Milestone 6: P2P Virtual Writers' Room
 *
 * Types for local-network P2P sync, creative roles (screenwriter,
 * director, sound designer, etc.), real-time writers' room feed,
 * scene focus awareness, and LAN pairing invitations.
 */

import type { PermissionAction } from './collaboration';

// ─── Creative Roles ──────────────────────────────────────────────────

/** Creative production roles for the Writers' Room */
export type WritersRoomRole =
  | 'screenwriter'
  | 'director'
  | 'sound_designer'
  | 'editor'
  | 'producer'
  | 'viewer';

/** Valid icon identifiers matching IconName in Loofi UI */
export type WritersRoomIconName =
  | 'document'
  | 'video'
  | 'mic'
  | 'film'
  | 'folder'
  | 'eye'
  | 'users'
  | 'settings'
  | 'code'
  | 'lock'
  | 'unlock';

/** Metadata and configuration for a creative role */
export interface WritersRoomRoleConfig {
  id: WritersRoomRole;
  label: string;
  shortLabel: string;
  icon: WritersRoomIconName;
  badgeColor: string;
  description: string;
  permissions: PermissionAction[];
}

// ─── LAN Signaling & Discovery ───────────────────────────────────────

/** Signaling modes for WebRTC peer discovery */
export type WritersRoomSignalingMode =
  | 'local_lan'
  | 'custom'
  | 'broadcast_channel'
  | 'cloud_fallback';

/** Configuration for local LAN and WebRTC signaling */
export interface WritersRoomLANConfig {
  mode: WritersRoomSignalingMode;
  customUrl: string;
  roomPassword: string;
  autoConnectOnLaunch?: boolean;
}

/** Payload encoded inside copyable LAN pairing codes */
export interface WritersRoomLANInvite {
  version: number;
  roomId: string;
  roomName: string;
  projectId: string;
  signalingUrls: string[];
  roomPassword?: string;
  hostDisplayName: string;
  createdAt: number;
}

// ─── Real-Time Writers' Room Feed & Notes ────────────────────────────

/** Types of collaborative messages exchanged in the room */
export type WritersRoomMessageType =
  | 'chat'
  | 'director_note'
  | 'script_revision'
  | 'audio_cue_note';

/** A real-time message or directive synchronized via Yjs */
export interface WritersRoomMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: WritersRoomRole;
  senderColor: string;
  text: string;
  timestamp: number;
  type: WritersRoomMessageType;
  targetShotId?: number;
  targetSceneTitle?: string;
}

// ─── Peer State & Focus Awareness ────────────────────────────────────

/** Enhanced peer representation in the Writers' Room mesh */
export interface WritersRoomPeer {
  clientId: number;
  userId: string;
  displayName: string;
  avatarColor: string;
  role: WritersRoomRole;
  focusSceneTitle?: string;
  focusShotId?: number;
  isEditing: boolean;
  lastActive: number;
  isOnline: boolean;
}

/** Options passed when connecting to a collaboration room */
export interface ConnectRoomOptions {
  signalingUrls?: string[];
  roomPassword?: string;
  role?: WritersRoomRole;
  filterBcConns?: boolean;
}
