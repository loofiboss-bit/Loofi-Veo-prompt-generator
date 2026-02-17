/**
 * Collaboration Type Definitions
 * v2.6.0 - Collaboration Suite
 *
 * Types for team workflows, sharing, comments, roles,
 * presence indicators, and conflict resolution.
 */

// ─── Roles & Permissions ─────────────────────────────────────────────

/** Team workspace role levels (ascending privilege) */
export type CollaborationRole = 'viewer' | 'editor' | 'admin';

/** Permission actions that can be checked against a role */
export type PermissionAction =
  | 'read'
  | 'write'
  | 'comment'
  | 'delete'
  | 'manage_roles'
  | 'share'
  | 'export';

/** Maps roles to their allowed actions */
export const ROLE_PERMISSIONS: Record<CollaborationRole, PermissionAction[]> = {
  viewer: ['read'],
  editor: ['read', 'write', 'comment', 'export'],
  admin: ['read', 'write', 'comment', 'delete', 'manage_roles', 'share', 'export'],
};

// ─── User Identity ───────────────────────────────────────────────────

/** Local user profile for collaboration (no external auth required) */
export interface CollaborationUser {
  /** Unique user ID (generated locally, persisted in IDB) */
  id: string;
  /** Display name chosen by user */
  displayName: string;
  /** Avatar color for presence indicators */
  avatarColor: string;
  /** Optional avatar URL (for future account linking) */
  avatarUrl?: string;
  /** User's email (optional, for future account linking) */
  email?: string;
  /** When the profile was created */
  createdAt: number;
  /** When the profile was last updated */
  updatedAt: number;
}

// ─── Room & Session ──────────────────────────────────────────────────

/** A collaboration room tied to a project */
export interface CollaborationRoom {
  /** Room ID (used as Yjs room name) */
  id: string;
  /** Human-readable room name */
  name: string;
  /** Project ID this room is associated with */
  projectId: string;
  /** User who created the room */
  ownerId: string;
  /** Share code for joining (short alphanumeric) */
  shareCode: string;
  /** Whether the room allows read-only access via share link */
  isPublicReadOnly: boolean;
  /** Role assignments for users */
  members: RoomMember[];
  /** Room creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivity: number;
  /** Room status */
  status: 'active' | 'archived' | 'closed';
}

/** A member of a collaboration room */
export interface RoomMember {
  /** User ID */
  userId: string;
  /** Display name (cached for offline) */
  displayName: string;
  /** Avatar color */
  avatarColor: string;
  /** Role in this room */
  role: CollaborationRole;
  /** When user joined the room */
  joinedAt: number;
  /** Last seen timestamp */
  lastSeen: number;
}

// ─── Presence (Yjs Awareness) ────────────────────────────────────────

/** Enhanced awareness state broadcast to peers */
export interface PresenceState {
  /** Yjs client ID */
  clientId: number;
  /** User identity */
  userId: string;
  /** Display name */
  displayName: string;
  /** Avatar color */
  avatarColor: string;
  /** User's role in the room */
  role: CollaborationRole;
  /** Currently focused element (shot ID, input name, etc.) */
  focusTarget?: FocusTarget;
  /** Whether user is actively editing */
  isEditing: boolean;
  /** Cursor position (for text fields) */
  cursorPosition?: CursorPosition;
  /** Last activity timestamp */
  lastActive: number;
  /** Whether user is online */
  isOnline: boolean;
}

/** What element a user is currently focused on */
export interface FocusTarget {
  /** Type of element being focused */
  type: 'shot' | 'input' | 'timeline' | 'comment' | 'composer';
  /** ID of the focused element */
  id: string | number;
  /** Optional label for display */
  label?: string;
}

/** Cursor position in a text field */
export interface CursorPosition {
  /** Field identifier */
  fieldId: string;
  /** Cursor offset from start */
  offset: number;
  /** Selection length (0 = no selection) */
  selectionLength: number;
}

// ─── Comments ────────────────────────────────────────────────────────

/** A comment on a timeline shot or project element */
export interface ShotComment {
  /** Unique comment ID */
  id: string;
  /** ID of the shot this comment is attached to */
  shotId: number;
  /** Author user ID */
  authorId: string;
  /** Author display name (cached) */
  authorName: string;
  /** Author avatar color (cached) */
  authorColor: string;
  /** Comment text content */
  content: string;
  /** Timestamp of creation */
  createdAt: number;
  /** Timestamp of last edit (null if never edited) */
  editedAt: number | null;
  /** Whether the comment is resolved */
  isResolved: boolean;
  /** ID of parent comment (for threading) */
  parentId: string | null;
  /** Reactions on this comment */
  reactions: CommentReaction[];
}

/** A reaction on a comment */
export interface CommentReaction {
  /** Emoji character */
  emoji: string;
  /** User IDs who reacted with this emoji */
  userIds: string[];
}

/** Thread of comments (a root comment + replies) */
export interface CommentThread {
  /** Root comment */
  root: ShotComment;
  /** Reply comments (ordered by createdAt) */
  replies: ShotComment[];
  /** Total count including root */
  totalCount: number;
}

// ─── Conflict Resolution ─────────────────────────────────────────────

/** Represents a detected CRDT merge conflict for user review */
export interface ConflictEvent {
  /** Unique conflict ID */
  id: string;
  /** Type of data that conflicted */
  dataType: 'shot' | 'prompt' | 'timeline' | 'globalContext';
  /** ID of the conflicting element */
  elementId: string | number;
  /** Description of what changed */
  description: string;
  /** The local value before merge */
  localValue: string;
  /** The remote value that was merged */
  remoteValue: string;
  /** The resolved/merged value (CRDT auto-merge result) */
  mergedValue: string;
  /** User who made the remote change */
  remoteUserId: string;
  /** Remote user display name */
  remoteUserName: string;
  /** When the conflict occurred */
  timestamp: number;
  /** Resolution status */
  status: 'pending' | 'accepted' | 'reverted' | 'custom';
}

// ─── Shareable Links ─────────────────────────────────────────────────

/** A shareable link for a project */
export interface ShareableLink {
  /** Link ID */
  id: string;
  /** Room ID this link is for */
  roomId: string;
  /** Share code (short, user-friendly) */
  shareCode: string;
  /** Default role for users joining via this link */
  defaultRole: CollaborationRole;
  /** Whether link is currently active */
  isActive: boolean;
  /** Optional expiration timestamp */
  expiresAt: number | null;
  /** Maximum number of users who can join */
  maxUsers: number | null;
  /** Number of users who have joined via this link */
  usedCount: number;
  /** When the link was created */
  createdAt: number;
}

// ─── Collaboration Store State ───────────────────────────────────────

/** State shape for the collaboration Zustand store */
export interface CollaborationState {
  /** Current user profile */
  currentUser: CollaborationUser | null;
  /** Active room the user is in */
  activeRoom: CollaborationRoom | null;
  /** Connected peers' presence */
  peers: PresenceState[];
  /** Comments for the current project */
  comments: ShotComment[];
  /** Pending conflict events */
  conflicts: ConflictEvent[];
  /** Connection status */
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  /** Whether the user has set up their profile */
  isProfileSetUp: boolean;
  /** Share links for the current room */
  shareLinks: ShareableLink[];

  // ── Actions ──
  setCurrentUser: (user: CollaborationUser) => void;
  setActiveRoom: (room: CollaborationRoom | null) => void;
  setPeers: (peers: PresenceState[]) => void;
  addComment: (comment: ShotComment) => void;
  updateComment: (commentId: string, updates: Partial<ShotComment>) => void;
  removeComment: (commentId: string) => void;
  resolveComment: (commentId: string) => void;
  addConflict: (conflict: ConflictEvent) => void;
  resolveConflict: (conflictId: string, status: ConflictEvent['status']) => void;
  clearResolvedConflicts: () => void;
  setConnectionStatus: (status: CollaborationState['connectionStatus']) => void;
  setShareLinks: (links: ShareableLink[]) => void;
  reset: () => void;
}
