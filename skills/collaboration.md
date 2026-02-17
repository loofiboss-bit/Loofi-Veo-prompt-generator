# Collaboration Skills

## Real-Time Multiplayer

- **Yjs CRDT sync** — Conflict-free replicated data types for concurrent editing
- **WebRTC transport** — Peer-to-peer data channel for low-latency sync
- **Presence awareness** — See who's online and where they're working
- **Cursor sharing** — See other users' cursors and selections in real-time

**Services:** `collaborationService.ts`
**Store:** `useCollaborationStore`
**Types:** `src/core/types/collaboration.ts`

## Comments & Annotations

- **Timecode comments** — Attach comments to specific timeline positions
- **Thread discussions** — Threaded reply chains on comments
- **Mention system** — @mention collaborators for notifications
- **Resolution tracking** — Mark comments as resolved/unresolved

**Services:** `commentService.ts`

## Differential Updates

- **Incremental sync** — Only transmit changed data, not full state
- **Merge strategy** — Automatic conflict resolution for concurrent edits
- **Offline support** — Queue changes while offline, sync when reconnected

**Services:** `differentialUpdateService.ts`, `diffService.ts`

## Permission Management

- **Role-based access** — Viewer, editor, admin permission levels
- **Granular permissions** — Per-feature permission controls
- **Invite system** — Share project links with permission level

**Services:** `permissionService.ts`

## Broadcast State

- **State broadcasting** — Share application state across browser tabs/windows
- **Tab synchronization** — Keep multiple open tabs in sync
- **Cross-device state** — Resume work on another device

**Hooks:** `src/shared/hooks/useBroadcastState.ts`

## Project Sharing

- **Export project bundle** — Package project for sharing with all assets
- **Import shared project** — Load shared project bundles
- **Version comparison** — Compare project versions side-by-side

**Services:** `projectBundleService.ts`
