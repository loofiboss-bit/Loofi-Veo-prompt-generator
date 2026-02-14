/**
 * Composer Store — v2.0.0
 *
 * Zustand store with Zundo (temporal) for the Visual Composer.
 * Manages blocks, connections, viewport, selection, and evaluation.
 */

import { create } from 'zustand';
import { temporal } from 'zundo';
import { composerService } from '@core/services/composerService';
import type {
  PromptBlock,
  BlockConnection,
  BlockType,
  CanvasViewport,
  ComposerEvaluationResult,
  ComposerSnapshot,
  ConnectionStyle,
  PendingConnection,
  Position,
  TimelineLink,
} from '@core/types/composer';

// ─── State Interface ─────────────────────────────────────────────────────────

interface ComposerStoreState {
  // Canvas data
  blocks: PromptBlock[];
  connections: BlockConnection[];
  viewport: CanvasViewport;

  // Selection
  selectedBlockIds: string[];
  selectedConnectionIds: string[];

  // Interaction state
  draggingBlockId: string | null;
  pendingConnection: PendingConnection | null;

  // Settings
  snapToGrid: boolean;
  gridSize: number;
  showMinimap: boolean;
  autoLayout: boolean;
  connectionStyle: ConnectionStyle;

  // Evaluation
  lastEvaluation: ComposerEvaluationResult | null;

  // Snapshots
  snapshots: ComposerSnapshot[];

  // Timeline integration
  timelineLinks: TimelineLink[];
  autoSyncTimeline: boolean;

  // Z-index counter
  nextZIndex: number;

  // Panel visibility
  isPanelOpen: boolean;
}

// ─── Actions Interface ───────────────────────────────────────────────────────

interface ComposerStoreActions {
  // Panel
  openPanel: () => void;
  closePanel: () => void;

  // Block operations
  addBlock: (type: BlockType, position: Position) => string | null;
  removeBlock: (blockId: string) => void;
  removeSelectedBlocks: () => void;
  updateBlockPosition: (blockId: string, position: Position) => void;
  updateBlockField: (blockId: string, field: string, value: string | number | boolean) => void;
  updateBlockLabel: (blockId: string, label: string) => void;
  toggleBlockCollapse: (blockId: string) => void;
  toggleBlockDisabled: (blockId: string) => void;
  toggleBlockLock: (blockId: string) => void;
  duplicateBlock: (blockId: string) => string | null;
  bringToFront: (blockId: string) => void;

  // Connection operations
  startConnection: (sourceBlockId: string, sourcePortId: string) => void;
  updatePendingConnection: (mousePosition: Position) => void;
  completeConnection: (targetBlockId: string, targetPortId: string) => boolean;
  cancelConnection: () => void;
  removeConnection: (connectionId: string) => void;
  removeSelectedConnections: () => void;

  // Selection
  selectBlock: (blockId: string, addToSelection?: boolean) => void;
  selectConnection: (connectionId: string, addToSelection?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  selectBlocksInRect: (x1: number, y1: number, x2: number, y2: number) => void;

  // Viewport
  setViewport: (viewport: Partial<CanvasViewport>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetViewport: () => void;

  // Settings
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  toggleMinimap: () => void;
  toggleAutoLayout: () => void;
  setConnectionStyle: (style: ConnectionStyle) => void;

  // Layout
  applyAutoLayout: () => void;

  // Evaluation
  evaluate: (variables?: Record<string, string>) => ComposerEvaluationResult;

  // Snapshots
  saveSnapshot: (name: string) => void;
  loadSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;

  // Timeline integration
  linkBlockToShot: (blockId: string, shotId: number, clipId?: string) => void;
  unlinkBlock: (blockId: string) => void;
  toggleAutoSync: () => void;

  // Bulk operations
  clearCanvas: () => void;
  importGraph: (blocks: PromptBlock[], connections: BlockConnection[]) => void;
}

export type ComposerStore = ComposerStoreState & ComposerStoreActions;

// ─── Initial State ───────────────────────────────────────────────────────────

const INITIAL_COMPOSER_STATE: ComposerStoreState = {
  blocks: [],
  connections: [],
  viewport: { panX: 0, panY: 0, zoom: 1 },
  selectedBlockIds: [],
  selectedConnectionIds: [],
  draggingBlockId: null,
  pendingConnection: null,
  snapToGrid: true,
  gridSize: 20,
  showMinimap: false,
  autoLayout: false,
  connectionStyle: 'bezier',
  lastEvaluation: null,
  snapshots: [],
  timelineLinks: [],
  autoSyncTimeline: false,
  nextZIndex: 1,
  isPanelOpen: false,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useComposerStore = create<ComposerStore>()(
  temporal(
    (set, get) => ({
      ...INITIAL_COMPOSER_STATE,

      // ── Panel ──

      openPanel: () => set({ isPanelOpen: true }),
      closePanel: () => set({ isPanelOpen: false }),

      // ── Block Operations ──

      addBlock: (type, position) => {
        const state = get();
        const pos = state.snapToGrid
          ? composerService.snapPosition(position, state.gridSize)
          : position;

        const block = composerService.createBlock(type, pos, state.nextZIndex);
        if (!block) return null;

        set({
          blocks: [...state.blocks, block],
          nextZIndex: state.nextZIndex + 1,
          selectedBlockIds: [block.id],
          selectedConnectionIds: [],
        });

        return block.id;
      },

      removeBlock: (blockId) => {
        const state = get();
        set({
          blocks: state.blocks.filter((b) => b.id !== blockId),
          connections: state.connections.filter(
            (c) => c.sourceBlockId !== blockId && c.targetBlockId !== blockId,
          ),
          selectedBlockIds: state.selectedBlockIds.filter((id) => id !== blockId),
          timelineLinks: state.timelineLinks.filter((l) => l.blockId !== blockId),
        });
      },

      removeSelectedBlocks: () => {
        const state = get();
        const selected = new Set(state.selectedBlockIds);
        set({
          blocks: state.blocks.filter((b) => !selected.has(b.id)),
          connections: state.connections.filter(
            (c) => !selected.has(c.sourceBlockId) && !selected.has(c.targetBlockId),
          ),
          selectedBlockIds: [],
          timelineLinks: state.timelineLinks.filter((l) => !selected.has(l.blockId)),
        });
      },

      updateBlockPosition: (blockId, position) => {
        const state = get();
        const block = state.blocks.find((b) => b.id === blockId);
        if (!block || block.isLocked) return;

        const pos = state.snapToGrid
          ? composerService.snapPosition(position, state.gridSize)
          : position;

        set({
          blocks: state.blocks.map((b) => (b.id === blockId ? { ...b, position: pos } : b)),
        });
      },

      updateBlockField: (blockId, field, value) => {
        set({
          blocks: get().blocks.map((b) =>
            b.id === blockId ? { ...b, fields: { ...b.fields, [field]: value } } : b,
          ),
        });
      },

      updateBlockLabel: (blockId, label) => {
        set({
          blocks: get().blocks.map((b) => (b.id === blockId ? { ...b, label } : b)),
        });
      },

      toggleBlockCollapse: (blockId) => {
        set({
          blocks: get().blocks.map((b) =>
            b.id === blockId ? { ...b, isCollapsed: !b.isCollapsed } : b,
          ),
        });
      },

      toggleBlockDisabled: (blockId) => {
        set({
          blocks: get().blocks.map((b) =>
            b.id === blockId ? { ...b, isDisabled: !b.isDisabled } : b,
          ),
        });
      },

      toggleBlockLock: (blockId) => {
        set({
          blocks: get().blocks.map((b) => (b.id === blockId ? { ...b, isLocked: !b.isLocked } : b)),
        });
      },

      duplicateBlock: (blockId) => {
        const state = get();
        const original = state.blocks.find((b) => b.id === blockId);
        if (!original) return null;

        const newBlock = composerService.createBlock(
          original.type,
          { x: original.position.x + 40, y: original.position.y + 40 },
          state.nextZIndex,
        );
        if (!newBlock) return null;

        // Copy field values from original
        newBlock.fields = { ...original.fields };
        newBlock.label = original.label ? `${original.label} (copy)` : undefined;

        set({
          blocks: [...state.blocks, newBlock],
          nextZIndex: state.nextZIndex + 1,
          selectedBlockIds: [newBlock.id],
        });

        return newBlock.id;
      },

      bringToFront: (blockId) => {
        const state = get();
        set({
          blocks: state.blocks.map((b) =>
            b.id === blockId ? { ...b, zIndex: state.nextZIndex } : b,
          ),
          nextZIndex: state.nextZIndex + 1,
        });
      },

      // ── Connection Operations ──

      startConnection: (sourceBlockId, sourcePortId) => {
        const block = get().blocks.find((b) => b.id === sourceBlockId);
        if (!block) return;
        set({
          pendingConnection: {
            sourceBlockId,
            sourcePortId,
            mousePosition: block.position,
          },
        });
      },

      updatePendingConnection: (mousePosition) => {
        const pending = get().pendingConnection;
        if (!pending) return;
        set({
          pendingConnection: { ...pending, mousePosition },
        });
      },

      completeConnection: (targetBlockId, targetPortId) => {
        const state = get();
        const pending = state.pendingConnection;
        if (!pending) return false;

        const validation = composerService.canConnect(
          state.blocks,
          state.connections,
          pending.sourceBlockId,
          pending.sourcePortId,
          targetBlockId,
          targetPortId,
        );

        if (!validation.valid) {
          set({ pendingConnection: null });
          return false;
        }

        const newConnection: BlockConnection = {
          id: composerService.generateConnectionId(),
          sourceBlockId: pending.sourceBlockId,
          sourcePortId: pending.sourcePortId,
          targetBlockId,
          targetPortId,
          style: state.connectionStyle,
          isActive: true,
        };

        set({
          connections: [...state.connections, newConnection],
          pendingConnection: null,
        });

        return true;
      },

      cancelConnection: () => {
        set({ pendingConnection: null });
      },

      removeConnection: (connectionId) => {
        set({
          connections: get().connections.filter((c) => c.id !== connectionId),
          selectedConnectionIds: get().selectedConnectionIds.filter((id) => id !== connectionId),
        });
      },

      removeSelectedConnections: () => {
        const selected = new Set(get().selectedConnectionIds);
        set({
          connections: get().connections.filter((c) => !selected.has(c.id)),
          selectedConnectionIds: [],
        });
      },

      // ── Selection ──

      selectBlock: (blockId, addToSelection = false) => {
        const state = get();
        if (addToSelection) {
          const isSelected = state.selectedBlockIds.includes(blockId);
          set({
            selectedBlockIds: isSelected
              ? state.selectedBlockIds.filter((id) => id !== blockId)
              : [...state.selectedBlockIds, blockId],
          });
        } else {
          set({
            selectedBlockIds: [blockId],
            selectedConnectionIds: [],
          });
        }
      },

      selectConnection: (connectionId, addToSelection = false) => {
        const state = get();
        if (addToSelection) {
          const isSelected = state.selectedConnectionIds.includes(connectionId);
          set({
            selectedConnectionIds: isSelected
              ? state.selectedConnectionIds.filter((id) => id !== connectionId)
              : [...state.selectedConnectionIds, connectionId],
          });
        } else {
          set({
            selectedConnectionIds: [connectionId],
            selectedBlockIds: [],
          });
        }
      },

      selectAll: () => {
        const state = get();
        set({
          selectedBlockIds: state.blocks.map((b) => b.id),
          selectedConnectionIds: state.connections.map((c) => c.id),
        });
      },

      clearSelection: () => {
        set({ selectedBlockIds: [], selectedConnectionIds: [] });
      },

      selectBlocksInRect: (x1, y1, x2, y2) => {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        const state = get();
        const selected = state.blocks
          .filter(
            (b) =>
              b.position.x >= minX &&
              b.position.x + b.size.width <= maxX &&
              b.position.y >= minY &&
              b.position.y + b.size.height <= maxY,
          )
          .map((b) => b.id);

        set({ selectedBlockIds: selected });
      },

      // ── Viewport ──

      setViewport: (viewport) => {
        set({ viewport: { ...get().viewport, ...viewport } });
      },

      zoomIn: () => {
        const zoom = Math.min(get().viewport.zoom + 0.1, 3);
        set({ viewport: { ...get().viewport, zoom } });
      },

      zoomOut: () => {
        const zoom = Math.max(get().viewport.zoom - 0.1, 0.2);
        set({ viewport: { ...get().viewport, zoom } });
      },

      zoomToFit: () => {
        const blocks = get().blocks;
        if (blocks.length === 0) {
          set({ viewport: { panX: 0, panY: 0, zoom: 1 } });
          return;
        }

        const minX = Math.min(...blocks.map((b) => b.position.x));
        const maxX = Math.max(...blocks.map((b) => b.position.x + b.size.width));
        const minY = Math.min(...blocks.map((b) => b.position.y));
        const maxY = Math.max(...blocks.map((b) => b.position.y + b.size.height));

        const padding = 80;
        const graphWidth = maxX - minX + padding * 2;
        const graphHeight = maxY - minY + padding * 2;

        // Assume canvas is ~1200x800, zoom to fit
        const zoomX = 1200 / graphWidth;
        const zoomY = 800 / graphHeight;
        const zoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.2), 2);

        set({
          viewport: {
            panX: -(minX - padding) * zoom,
            panY: -(minY - padding) * zoom,
            zoom,
          },
        });
      },

      resetViewport: () => {
        set({ viewport: { panX: 0, panY: 0, zoom: 1 } });
      },

      // ── Settings ──

      toggleSnapToGrid: () => set({ snapToGrid: !get().snapToGrid }),
      setGridSize: (size) => set({ gridSize: Math.max(5, Math.min(100, size)) }),
      toggleMinimap: () => set({ showMinimap: !get().showMinimap }),
      toggleAutoLayout: () => set({ autoLayout: !get().autoLayout }),
      setConnectionStyle: (style) => set({ connectionStyle: style }),

      // ── Layout ──

      applyAutoLayout: () => {
        const state = get();
        const layouted = composerService.autoLayoutBlocks(state.blocks, state.connections);
        set({ blocks: layouted });
      },

      // ── Evaluation ──

      evaluate: (variables = {}) => {
        const state = get();
        const result = composerService.evaluateGraph(state.blocks, state.connections, variables);
        set({ lastEvaluation: result });
        return result;
      },

      // ── Snapshots ──

      saveSnapshot: (name) => {
        const state = get();
        const snapshot: ComposerSnapshot = {
          id: `snap_${Date.now()}`,
          name,
          timestamp: Date.now(),
          blocks: JSON.parse(JSON.stringify(state.blocks)),
          connections: JSON.parse(JSON.stringify(state.connections)),
        };
        set({ snapshots: [...state.snapshots, snapshot] });
      },

      loadSnapshot: (snapshotId) => {
        const snapshot = get().snapshots.find((s) => s.id === snapshotId);
        if (!snapshot) return;
        set({
          blocks: JSON.parse(JSON.stringify(snapshot.blocks)),
          connections: JSON.parse(JSON.stringify(snapshot.connections)),
          selectedBlockIds: [],
          selectedConnectionIds: [],
          lastEvaluation: null,
        });
      },

      deleteSnapshot: (snapshotId) => {
        set({ snapshots: get().snapshots.filter((s) => s.id !== snapshotId) });
      },

      // ── Timeline Integration ──

      linkBlockToShot: (blockId, shotId, clipId) => {
        const state = get();
        const existing = state.timelineLinks.findIndex((l) => l.blockId === blockId);
        const link: TimelineLink = { blockId, shotId, clipId, syncMode: 'bidirectional' };

        if (existing >= 0) {
          const newLinks = [...state.timelineLinks];
          newLinks[existing] = link;
          set({ timelineLinks: newLinks });
        } else {
          set({ timelineLinks: [...state.timelineLinks, link] });
        }
      },

      unlinkBlock: (blockId) => {
        set({
          timelineLinks: get().timelineLinks.filter((l) => l.blockId !== blockId),
        });
      },

      toggleAutoSync: () => set({ autoSyncTimeline: !get().autoSyncTimeline }),

      // ── Bulk ──

      clearCanvas: () => {
        set({
          blocks: [],
          connections: [],
          selectedBlockIds: [],
          selectedConnectionIds: [],
          pendingConnection: null,
          lastEvaluation: null,
          timelineLinks: [],
          nextZIndex: 1,
        });
      },

      importGraph: (blocks, connections) => {
        const maxZ = blocks.reduce((max, b) => Math.max(max, b.zIndex), 0);
        set({
          blocks,
          connections,
          selectedBlockIds: [],
          selectedConnectionIds: [],
          lastEvaluation: null,
          nextZIndex: maxZ + 1,
        });
      },
    }),
    {
      partialize: (state) => ({
        blocks: state.blocks,
        connections: state.connections,
        snapToGrid: state.snapToGrid,
        gridSize: state.gridSize,
        connectionStyle: state.connectionStyle,
        timelineLinks: state.timelineLinks,
      }),
    },
  ),
);
