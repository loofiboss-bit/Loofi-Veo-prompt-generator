/**
 * useComposerStore Tests
 * Tests for the Visual Composer Zustand store with temporal (undo/redo) support.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock composerService using vi.hoisted
const mockComposerService = vi.hoisted(() => ({
  snapPosition: vi.fn((pos: { x: number; y: number }, gridSize: number) => ({
    x: Math.round(pos.x / gridSize) * gridSize,
    y: Math.round(pos.y / gridSize) * gridSize,
  })),
  createBlock: vi.fn((type: string, position: { x: number; y: number }, zIndex: number) => ({
    id: `block_${Date.now()}`,
    type,
    position,
    size: { width: 200, height: 150 },
    fields: {},
    isCollapsed: false,
    isDisabled: false,
    isLocked: false,
    zIndex,
  })),
  canConnect: vi.fn(() => ({ valid: true })),
  generateConnectionId: vi.fn(() => `conn_${Date.now()}`),
  autoLayoutBlocks: vi.fn((blocks: unknown[]) => blocks),
  evaluateGraph: vi.fn(() => ({
    compiledPrompt: 'Test prompt',
    blockResults: [],
    evaluationOrder: [],
    warnings: [],
    errors: [],
    hasCycles: false,
  })),
}));

vi.mock('@core/services/composerService', () => ({
  composerService: mockComposerService,
}));

import { useComposerStore } from './useComposerStore';
import type { BlockType, Position } from '@core/types/composer';

describe('useComposerStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    const store = useComposerStore.getState();
    store.clearCanvas();
    useComposerStore.setState({
      isPanelOpen: false,
      viewport: { panX: 0, panY: 0, zoom: 1 },
      snapToGrid: true,
      gridSize: 20,
      showMinimap: false,
      autoLayout: false,
      connectionStyle: 'bezier',
      selectedBlockIds: [],
      selectedConnectionIds: [],
      draggingBlockId: null,
      pendingConnection: null,
      lastEvaluation: null,
      snapshots: [],
      timelineLinks: [],
      autoSyncTimeline: false,
      nextZIndex: 1,
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useComposerStore.getState();
      expect(state.blocks).toEqual([]);
      expect(state.connections).toEqual([]);
      expect(state.viewport).toEqual({ panX: 0, panY: 0, zoom: 1 });
      expect(state.selectedBlockIds).toEqual([]);
      expect(state.selectedConnectionIds).toEqual([]);
      expect(state.isPanelOpen).toBe(false);
      expect(state.snapToGrid).toBe(true);
      expect(state.gridSize).toBe(20);
    });
  });

  describe('panel actions', () => {
    it('should open panel', () => {
      useComposerStore.getState().openPanel();
      expect(useComposerStore.getState().isPanelOpen).toBe(true);
    });

    it('should close panel', () => {
      useComposerStore.setState({ isPanelOpen: true });
      useComposerStore.getState().closePanel();
      expect(useComposerStore.getState().isPanelOpen).toBe(false);
    });
  });

  describe('block operations', () => {
    it('should add a block with snap to grid', () => {
      const position: Position = { x: 15, y: 25 };
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, position);

      expect(blockId).toBeTruthy();
      expect(mockComposerService.snapPosition).toHaveBeenCalledWith(position, 20);
      expect(mockComposerService.createBlock).toHaveBeenCalled();

      const state = useComposerStore.getState();
      expect(state.blocks).toHaveLength(1);
      expect(state.selectedBlockIds).toEqual([blockId]);
      expect(state.nextZIndex).toBe(2);
    });

    it('should add a block without snap to grid', () => {
      useComposerStore.setState({ snapToGrid: false });
      const position: Position = { x: 15, y: 25 };
      useComposerStore.getState().addBlock('text' as BlockType, position);

      expect(mockComposerService.snapPosition).not.toHaveBeenCalled();
    });

    it('should remove a block and its connections', () => {
      // Add a block
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });

      // Add a connection involving this block
      useComposerStore.setState({
        connections: [
          {
            id: 'conn1',
            sourceBlockId: blockId!,
            sourcePortId: 'out',
            targetBlockId: 'other',
            targetPortId: 'in',
            style: 'bezier',
            isActive: true,
          },
        ],
      });

      useComposerStore.getState().removeBlock(blockId!);

      const state = useComposerStore.getState();
      expect(state.blocks).toHaveLength(0);
      expect(state.connections).toHaveLength(0);
      expect(state.selectedBlockIds).not.toContain(blockId);
    });

    it('should remove selected blocks', () => {
      const id1 = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      const id2 = useComposerStore.getState().addBlock('text' as BlockType, { x: 100, y: 100 });

      useComposerStore.setState({ selectedBlockIds: [id1!, id2!] });
      useComposerStore.getState().removeSelectedBlocks();

      expect(useComposerStore.getState().blocks).toHaveLength(0);
      expect(useComposerStore.getState().selectedBlockIds).toHaveLength(0);
    });

    it('should update block position', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      const newPos: Position = { x: 100, y: 100 };

      useComposerStore.getState().updateBlockPosition(blockId!, newPos);

      const block = useComposerStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.position.x).toBeDefined();
      expect(block?.position.y).toBeDefined();
    });

    it('should not update position for locked block', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.setState({
        blocks: useComposerStore
          .getState()
          .blocks.map((b) => (b.id === blockId ? { ...b, isLocked: true } : b)),
      });

      const originalBlock = useComposerStore.getState().blocks.find((b) => b.id === blockId);
      const originalPos = originalBlock!.position;

      useComposerStore.getState().updateBlockPosition(blockId!, { x: 999, y: 999 });

      const block = useComposerStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.position).toEqual(originalPos);
    });

    it('should update block field', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.getState().updateBlockField(blockId!, 'content', 'Hello World');

      const block = useComposerStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.fields.content).toBe('Hello World');
    });

    it('should update block label', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.getState().updateBlockLabel(blockId!, 'My Block');

      const block = useComposerStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.label).toBe('My Block');
    });

    it('should toggle block collapse', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      const originalState = useComposerStore
        .getState()
        .blocks.find((b) => b.id === blockId)?.isCollapsed;

      useComposerStore.getState().toggleBlockCollapse(blockId!);

      const block = useComposerStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.isCollapsed).toBe(!originalState);
    });

    it('should toggle block disabled', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });

      useComposerStore.getState().toggleBlockDisabled(blockId!);

      const block = useComposerStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.isDisabled).toBe(true);
    });

    it('should toggle block lock', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });

      useComposerStore.getState().toggleBlockLock(blockId!);

      const block = useComposerStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.isLocked).toBe(true);
    });

    it('should duplicate block', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.getState().updateBlockField(blockId!, 'content', 'Original');
      useComposerStore.getState().updateBlockLabel(blockId!, 'Original Label');

      const newBlockId = useComposerStore.getState().duplicateBlock(blockId!);

      expect(newBlockId).toBeTruthy();
      expect(useComposerStore.getState().blocks).toHaveLength(2);

      const newBlock = useComposerStore.getState().blocks.find((b) => b.id === newBlockId);
      expect(newBlock?.fields.content).toBe('Original');
      // Label gets '(copy)' appended by the store if original has a label
      expect(newBlock?.label).toContain('Original Label');
    });

    it('should bring block to front', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      const initialNextZ = useComposerStore.getState().nextZIndex;

      useComposerStore.getState().bringToFront(blockId!);

      const block = useComposerStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.zIndex).toBe(initialNextZ);
      expect(useComposerStore.getState().nextZIndex).toBe(initialNextZ + 1);
    });
  });

  describe('connection operations', () => {
    it('should start a connection', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });

      useComposerStore.getState().startConnection(blockId!, 'output');

      const pending = useComposerStore.getState().pendingConnection;
      expect(pending).toBeTruthy();
      expect(pending?.sourceBlockId).toBe(blockId);
      expect(pending?.sourcePortId).toBe('output');
    });

    it('should update pending connection mouse position', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.getState().startConnection(blockId!, 'output');

      const mousePos: Position = { x: 100, y: 150 };
      useComposerStore.getState().updatePendingConnection(mousePos);

      const pending = useComposerStore.getState().pendingConnection;
      expect(pending?.mousePosition).toEqual(mousePos);
    });

    it('should complete a valid connection', () => {
      const blockId1 = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      const blockId2 = useComposerStore
        .getState()
        .addBlock('text' as BlockType, { x: 200, y: 200 });

      useComposerStore.getState().startConnection(blockId1!, 'output');
      const success = useComposerStore.getState().completeConnection(blockId2!, 'input');

      expect(success).toBe(true);
      expect(mockComposerService.canConnect).toHaveBeenCalled();
      expect(useComposerStore.getState().connections).toHaveLength(1);
      expect(useComposerStore.getState().pendingConnection).toBeNull();
    });

    it('should not complete an invalid connection', () => {
      mockComposerService.canConnect.mockReturnValueOnce({ valid: false });

      const blockId1 = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      const blockId2 = useComposerStore
        .getState()
        .addBlock('text' as BlockType, { x: 200, y: 200 });

      useComposerStore.getState().startConnection(blockId1!, 'output');
      const success = useComposerStore.getState().completeConnection(blockId2!, 'input');

      expect(success).toBe(false);
      expect(useComposerStore.getState().connections).toHaveLength(0);
    });

    it('should cancel connection', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.getState().startConnection(blockId!, 'output');

      useComposerStore.getState().cancelConnection();

      expect(useComposerStore.getState().pendingConnection).toBeNull();
    });

    it('should remove connection', () => {
      useComposerStore.setState({
        connections: [
          {
            id: 'conn1',
            sourceBlockId: 'b1',
            sourcePortId: 'out',
            targetBlockId: 'b2',
            targetPortId: 'in',
            style: 'bezier',
            isActive: true,
          },
        ],
      });

      useComposerStore.getState().removeConnection('conn1');

      expect(useComposerStore.getState().connections).toHaveLength(0);
    });

    it('should remove selected connections', () => {
      useComposerStore.setState({
        connections: [
          {
            id: 'conn1',
            sourceBlockId: 'b1',
            sourcePortId: 'out',
            targetBlockId: 'b2',
            targetPortId: 'in',
            style: 'bezier',
            isActive: true,
          },
          {
            id: 'conn2',
            sourceBlockId: 'b2',
            sourcePortId: 'out',
            targetBlockId: 'b3',
            targetPortId: 'in',
            style: 'bezier',
            isActive: true,
          },
        ],
        selectedConnectionIds: ['conn1', 'conn2'],
      });

      useComposerStore.getState().removeSelectedConnections();

      expect(useComposerStore.getState().connections).toHaveLength(0);
      expect(useComposerStore.getState().selectedConnectionIds).toHaveLength(0);
    });
  });

  describe('selection', () => {
    it('should select a single block', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });

      useComposerStore.getState().selectBlock(blockId!);

      expect(useComposerStore.getState().selectedBlockIds).toEqual([blockId]);
      expect(useComposerStore.getState().selectedConnectionIds).toEqual([]);
    });

    it('should add block to selection when addToSelection is true', () => {
      // Manually create blocks in state to avoid addBlock selection side effects
      const block1 = {
        id: 'test-block-1',
        type: 'output-prompt' as BlockType,
        category: 'output' as const,
        position: { x: 0, y: 0 },
        size: { width: 200, height: 150 },
        fields: {},
        isCollapsed: false,
        isDisabled: false,
        isLocked: false,
        zIndex: 1,
      };

      const block2 = {
        id: 'test-block-2',
        type: 'output-prompt' as BlockType,
        category: 'output' as const,
        position: { x: 100, y: 100 },
        size: { width: 200, height: 150 },
        fields: {},
        isCollapsed: false,
        isDisabled: false,
        isLocked: false,
        zIndex: 2,
      };

      useComposerStore.setState({
        blocks: [block1, block2],
        selectedBlockIds: ['test-block-2'], // Start with block2 selected
      });

      // Add block1 to selection
      useComposerStore.getState().selectBlock('test-block-1', true);

      const selected = useComposerStore.getState().selectedBlockIds;
      expect(selected).toHaveLength(2);
      expect(selected).toContain('test-block-1');
      expect(selected).toContain('test-block-2');
    });

    it('should deselect block when clicking again with addToSelection', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });

      useComposerStore.getState().selectBlock(blockId!);
      useComposerStore.getState().selectBlock(blockId!, true);

      expect(useComposerStore.getState().selectedBlockIds).not.toContain(blockId);
    });

    it('should select all blocks and connections', () => {
      useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.getState().addBlock('text' as BlockType, { x: 100, y: 100 });
      useComposerStore.setState({
        connections: [
          {
            id: 'conn1',
            sourceBlockId: 'b1',
            sourcePortId: 'out',
            targetBlockId: 'b2',
            targetPortId: 'in',
            style: 'bezier',
            isActive: true,
          },
        ],
      });

      useComposerStore.getState().selectAll();

      expect(useComposerStore.getState().selectedBlockIds).toHaveLength(2);
      expect(useComposerStore.getState().selectedConnectionIds).toHaveLength(1);
    });

    it('should clear selection', () => {
      useComposerStore.setState({
        selectedBlockIds: ['b1', 'b2'],
        selectedConnectionIds: ['c1'],
      });

      useComposerStore.getState().clearSelection();

      expect(useComposerStore.getState().selectedBlockIds).toEqual([]);
      expect(useComposerStore.getState().selectedConnectionIds).toEqual([]);
    });

    it('should select blocks in rectangle', () => {
      useComposerStore.setState({
        blocks: [
          {
            id: 'b1',
            type: 'output-prompt',
            category: 'output',
            position: { x: 10, y: 10 },
            size: { width: 50, height: 50 },
            fields: {},
            isCollapsed: false,
            isDisabled: false,
            isLocked: false,
            zIndex: 1,
          },
          {
            id: 'b2',
            type: 'output-prompt',
            category: 'output',
            position: { x: 200, y: 200 },
            size: { width: 50, height: 50 },
            fields: {},
            isCollapsed: false,
            isDisabled: false,
            isLocked: false,
            zIndex: 1,
          },
        ],
      });

      useComposerStore.getState().selectBlocksInRect(0, 0, 100, 100);

      const selected = useComposerStore.getState().selectedBlockIds;
      expect(selected).toContain('b1');
      expect(selected).not.toContain('b2');
    });
  });

  describe('viewport', () => {
    it('should set viewport', () => {
      useComposerStore.getState().setViewport({ panX: 100, panY: 50, zoom: 1.5 });

      const viewport = useComposerStore.getState().viewport;
      expect(viewport.panX).toBe(100);
      expect(viewport.panY).toBe(50);
      expect(viewport.zoom).toBe(1.5);
    });

    it('should zoom in', () => {
      useComposerStore.getState().zoomIn();
      expect(useComposerStore.getState().viewport.zoom).toBeCloseTo(1.1);
    });

    it('should zoom out', () => {
      useComposerStore.getState().zoomOut();
      expect(useComposerStore.getState().viewport.zoom).toBeCloseTo(0.9);
    });

    it('should not zoom beyond max', () => {
      useComposerStore.setState({ viewport: { panX: 0, panY: 0, zoom: 3 } });
      useComposerStore.getState().zoomIn();
      expect(useComposerStore.getState().viewport.zoom).toBe(3);
    });

    it('should not zoom below min', () => {
      useComposerStore.setState({ viewport: { panX: 0, panY: 0, zoom: 0.2 } });
      useComposerStore.getState().zoomOut();
      expect(useComposerStore.getState().viewport.zoom).toBe(0.2);
    });

    it('should reset viewport', () => {
      useComposerStore.setState({ viewport: { panX: 100, panY: 200, zoom: 2 } });
      useComposerStore.getState().resetViewport();

      const viewport = useComposerStore.getState().viewport;
      expect(viewport).toEqual({ panX: 0, panY: 0, zoom: 1 });
    });

    it('should zoom to fit with no blocks', () => {
      useComposerStore.getState().zoomToFit();
      const viewport = useComposerStore.getState().viewport;
      expect(viewport).toEqual({ panX: 0, panY: 0, zoom: 1 });
    });
  });

  describe('settings', () => {
    it('should toggle snap to grid', () => {
      const initial = useComposerStore.getState().snapToGrid;
      useComposerStore.getState().toggleSnapToGrid();
      expect(useComposerStore.getState().snapToGrid).toBe(!initial);
    });

    it('should set grid size', () => {
      useComposerStore.getState().setGridSize(30);
      expect(useComposerStore.getState().gridSize).toBe(30);
    });

    it('should clamp grid size to valid range', () => {
      useComposerStore.getState().setGridSize(3);
      expect(useComposerStore.getState().gridSize).toBe(5);

      useComposerStore.getState().setGridSize(200);
      expect(useComposerStore.getState().gridSize).toBe(100);
    });

    it('should toggle minimap', () => {
      const initial = useComposerStore.getState().showMinimap;
      useComposerStore.getState().toggleMinimap();
      expect(useComposerStore.getState().showMinimap).toBe(!initial);
    });

    it('should toggle auto layout', () => {
      const initial = useComposerStore.getState().autoLayout;
      useComposerStore.getState().toggleAutoLayout();
      expect(useComposerStore.getState().autoLayout).toBe(!initial);
    });

    it('should set connection style', () => {
      useComposerStore.getState().setConnectionStyle('straight');
      expect(useComposerStore.getState().connectionStyle).toBe('straight');
    });
  });

  describe('evaluation', () => {
    it('should evaluate graph', () => {
      const result = useComposerStore.getState().evaluate({ var1: 'value1' });

      expect(mockComposerService.evaluateGraph).toHaveBeenCalled();
      expect(result.compiledPrompt).toBe('Test prompt');
      expect(useComposerStore.getState().lastEvaluation).toEqual(result);
    });
  });

  describe('snapshots', () => {
    it('should save snapshot', () => {
      useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.getState().saveSnapshot('Test Snapshot');

      const snapshots = useComposerStore.getState().snapshots;
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].name).toBe('Test Snapshot');
      expect(snapshots[0].blocks).toHaveLength(1);
    });

    it('should load snapshot', () => {
      useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.getState().saveSnapshot('Test');

      // Clear and add different data
      useComposerStore.getState().clearCanvas();
      useComposerStore.getState().addBlock('text' as BlockType, { x: 100, y: 100 });
      useComposerStore.getState().addBlock('text' as BlockType, { x: 200, y: 200 });

      // Load snapshot
      const snapshotId = useComposerStore.getState().snapshots[0].id;
      useComposerStore.getState().loadSnapshot(snapshotId);

      expect(useComposerStore.getState().blocks).toHaveLength(1);
    });

    it('should delete snapshot', () => {
      useComposerStore.getState().saveSnapshot('Test');
      const snapshotId = useComposerStore.getState().snapshots[0].id;

      useComposerStore.getState().deleteSnapshot(snapshotId);

      expect(useComposerStore.getState().snapshots).toHaveLength(0);
    });
  });

  describe('timeline integration', () => {
    it('should link block to shot', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });

      useComposerStore.getState().linkBlockToShot(blockId!, 1, 'clip1');

      const links = useComposerStore.getState().timelineLinks;
      expect(links).toHaveLength(1);
      expect(links[0].blockId).toBe(blockId);
      expect(links[0].shotId).toBe(1);
      expect(links[0].clipId).toBe('clip1');
    });

    it('should update existing link', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });

      useComposerStore.getState().linkBlockToShot(blockId!, 1, 'clip1');
      useComposerStore.getState().linkBlockToShot(blockId!, 2, 'clip2');

      const links = useComposerStore.getState().timelineLinks;
      expect(links).toHaveLength(1);
      expect(links[0].shotId).toBe(2);
      expect(links[0].clipId).toBe('clip2');
    });

    it('should unlink block', () => {
      const blockId = useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.getState().linkBlockToShot(blockId!, 1);

      useComposerStore.getState().unlinkBlock(blockId!);

      expect(useComposerStore.getState().timelineLinks).toHaveLength(0);
    });

    it('should toggle auto sync', () => {
      const initial = useComposerStore.getState().autoSyncTimeline;
      useComposerStore.getState().toggleAutoSync();
      expect(useComposerStore.getState().autoSyncTimeline).toBe(!initial);
    });
  });

  describe('bulk operations', () => {
    it('should clear canvas', () => {
      useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.setState({
        connections: [
          {
            id: 'conn1',
            sourceBlockId: 'b1',
            sourcePortId: 'out',
            targetBlockId: 'b2',
            targetPortId: 'in',
            style: 'bezier',
            isActive: true,
          },
        ],
        selectedBlockIds: ['b1'],
        lastEvaluation: {
          compiledPrompt: 'test',
          blockResults: [],
          evaluationOrder: [],
          warnings: [],
          errors: [],
          hasCycles: false,
        },
      });

      useComposerStore.getState().clearCanvas();

      const state = useComposerStore.getState();
      expect(state.blocks).toHaveLength(0);
      expect(state.connections).toHaveLength(0);
      expect(state.selectedBlockIds).toHaveLength(0);
      expect(state.lastEvaluation).toBeNull();
      expect(state.pendingConnection).toBeNull();
    });

    it('should import graph', () => {
      const blocks = [
        {
          id: 'imported1',
          type: 'output-prompt' as BlockType,
          category: 'output' as const,
          position: { x: 0, y: 0 },
          size: { width: 200, height: 150 },
          fields: {},
          isCollapsed: false,
          isDisabled: false,
          isLocked: false,
          zIndex: 5,
        },
      ];

      const connections = [
        {
          id: 'importedConn1',
          sourceBlockId: 'imported1',
          sourcePortId: 'out',
          targetBlockId: 'imported2',
          targetPortId: 'in',
          style: 'bezier' as const,
          isActive: true,
        },
      ];

      useComposerStore.getState().importGraph(blocks, connections);

      const state = useComposerStore.getState();
      expect(state.blocks).toEqual(blocks);
      expect(state.connections).toEqual(connections);
      expect(state.nextZIndex).toBe(6);
      expect(state.selectedBlockIds).toHaveLength(0);
      expect(state.lastEvaluation).toBeNull();
    });
  });

  describe('layout', () => {
    it('should apply auto layout', () => {
      useComposerStore.getState().addBlock('text' as BlockType, { x: 0, y: 0 });
      useComposerStore.getState().applyAutoLayout();

      expect(mockComposerService.autoLayoutBlocks).toHaveBeenCalled();
    });
  });
});
