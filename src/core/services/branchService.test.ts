/**
 * Branch Service Tests
 * Tests for git-like prompt branching with tree/graph data structure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HistoryEntry } from '@core/services/historyService';
import type { PromptState } from '@core/types';

const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

function makeEntry(id: string): HistoryEntry {
  return {
    id,
    projectId: 'test-project',
    prompt: `Prompt for ${id}`,
    timestamp: Date.now(),
    params: {
      idea: `Idea ${id}`,
      artStyle: 'Cinematic',
      targetModel: 'veo',
    } as PromptState,
    metadata: {},
    tags: [],
    favorite: false,
    version: '1.0.0',
  } as HistoryEntry;
}

describe('BranchService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockStore.clear();
    vi.resetModules();
  });

  async function getService() {
    const mod = await import('./branchService');
    return mod.branchService;
  }

  // ─── loadTree ──────────────────────────────────────────────────

  describe('loadTree', () => {
    it('should create a new tree when none exists in storage', async () => {
      const service = await getService();
      const tree = await service.loadTree();

      expect(tree).toBeDefined();
      expect(tree.activeBranchId).toBeTruthy();
      expect(Object.keys(tree.branches)).toHaveLength(1);
      expect(Object.keys(tree.nodes).length).toBeGreaterThanOrEqual(1);

      const mainBranch = tree.branches[tree.activeBranchId];
      expect(mainBranch.name).toBe('main');
      expect(mainBranch.parentBranchId).toBeNull();
    });

    it('should restore existing tree from storage', async () => {
      const service = await getService();
      const originalTree = await service.loadTree();
      const branchId = originalTree.activeBranchId;

      vi.resetModules();
      const service2 = await getService();
      const restoredTree = await service2.loadTree();

      expect(restoredTree.activeBranchId).toBe(branchId);
    });

    it('should recover gracefully if storage read fails', async () => {
      const idbKeyval = await import('idb-keyval');
      vi.mocked(idbKeyval.get).mockRejectedValueOnce(new Error('IDB failure'));

      const service = await getService();
      const tree = await service.loadTree();

      expect(tree).toBeDefined();
      expect(Object.keys(tree.branches)).toHaveLength(1);
    });
  });

  // ─── getTree ──────────────────────────────────────────────────

  describe('getTree', () => {
    it('should return a default tree if loadTree was not called', async () => {
      const service = await getService();
      const tree = service.getTree();

      expect(tree).toBeDefined();
      expect(Object.keys(tree.branches)).toHaveLength(1);
    });
  });

  // ─── addNode ──────────────────────────────────────────────────

  describe('addNode', () => {
    it('should add a node to the active branch', async () => {
      const service = await getService();
      await service.loadTree();
      const entry = makeEntry('e1');

      const node = await service.addNode(entry);

      expect(node.entryId).toBe('e1');
      expect(node.branchId).toBeTruthy();
      expect(node.depth).toBe(1);
      expect(node.parentId).toBeTruthy();
    });

    it('should chain nodes sequentially', async () => {
      const service = await getService();
      await service.loadTree();

      const node1 = await service.addNode(makeEntry('e1'));
      const node2 = await service.addNode(makeEntry('e2'));

      expect(node2.parentId).toBe(node1.id);
      expect(node2.depth).toBe(2);
    });

    it('should add a node to a specific branch', async () => {
      const service = await getService();
      const tree = await service.loadTree();

      const branchId = tree.activeBranchId;
      const node = await service.addNode(makeEntry('e1'), branchId);

      expect(node.branchId).toBe(branchId);
    });

    it('should throw when targeting a non-existent branch', async () => {
      const service = await getService();
      await service.loadTree();

      await expect(service.addNode(makeEntry('e1'), 'non-existent')).rejects.toThrow(
        'Branch non-existent not found',
      );
    });
  });

  // ─── forkBranch ──────────────────────────────────────────────

  describe('forkBranch', () => {
    it('should create a new branch from a node', async () => {
      const service = await getService();
      await service.loadTree();
      const node1 = await service.addNode(makeEntry('e1'));

      const newBranch = await service.forkBranch(node1.id, 'experiment');

      expect(newBranch.name).toBe('experiment');
      expect(newBranch.forkNodeId).toBe(node1.id);
      expect(newBranch.parentBranchId).toBe(node1.branchId);
    });

    it('should switch active branch to the new fork', async () => {
      const service = await getService();
      await service.loadTree();
      const node1 = await service.addNode(makeEntry('e1'));

      const newBranch = await service.forkBranch(node1.id);
      const tree = service.getTree();

      expect(tree.activeBranchId).toBe(newBranch.id);
    });

    it('should assign a default name with branch count', async () => {
      const service = await getService();
      await service.loadTree();
      const node1 = await service.addNode(makeEntry('e1'));

      const newBranch = await service.forkBranch(node1.id);

      expect(newBranch.name).toMatch(/^branch-\d+$/);
    });

    it('should cycle colors for new branches', async () => {
      const service = await getService();
      await service.loadTree();
      const node1 = await service.addNode(makeEntry('e1'));

      const branch1 = await service.forkBranch(node1.id, 'b1');

      expect(branch1.color).toBeTruthy();
      expect(branch1.color).not.toBe('');
    });

    it('should throw if forking from a non-existent node', async () => {
      const service = await getService();
      await service.loadTree();

      await expect(service.forkBranch('non-existent')).rejects.toThrow(
        'Node non-existent not found',
      );
    });
  });

  // ─── switchBranch ─────────────────────────────────────────────

  describe('switchBranch', () => {
    it('should switch the active branch', async () => {
      const service = await getService();
      const tree = await service.loadTree();
      const originalBranchId = tree.activeBranchId;
      const node1 = await service.addNode(makeEntry('e1'));

      const newBranch = await service.forkBranch(node1.id);
      expect(service.getTree().activeBranchId).toBe(newBranch.id);

      await service.switchBranch(originalBranchId);
      expect(service.getTree().activeBranchId).toBe(originalBranchId);
    });

    it('should throw when switching to a non-existent branch', async () => {
      const service = await getService();
      await service.loadTree();

      await expect(service.switchBranch('non-existent')).rejects.toThrow(
        'Branch non-existent not found',
      );
    });
  });

  // ─── setActiveNode ────────────────────────────────────────────

  describe('setActiveNode', () => {
    it('should set active node and update branch pointer', async () => {
      const service = await getService();
      await service.loadTree();
      const node1 = await service.addNode(makeEntry('e1'));
      await service.addNode(makeEntry('e2'));

      await service.setActiveNode(node1.id);

      const tree = service.getTree();
      const branch = tree.branches[node1.branchId];
      expect(branch.activeNodeId).toBe(node1.id);
    });

    it('should switch to the branch containing the node', async () => {
      const service = await getService();
      const tree = await service.loadTree();
      const mainBranchId = tree.activeBranchId;
      const node1 = await service.addNode(makeEntry('e1'));

      await service.forkBranch(node1.id);
      await service.addNode(makeEntry('e2'));

      await service.setActiveNode(node1.id);
      expect(service.getTree().activeBranchId).toBe(mainBranchId);
    });

    it('should throw when setting a non-existent node', async () => {
      const service = await getService();
      await service.loadTree();

      await expect(service.setActiveNode('non-existent')).rejects.toThrow(
        'Node non-existent not found',
      );
    });
  });

  // ─── renameBranch ─────────────────────────────────────────────

  describe('renameBranch', () => {
    it('should rename an existing branch', async () => {
      const service = await getService();
      const tree = await service.loadTree();

      await service.renameBranch(tree.activeBranchId, 'primary');

      const updated = service.getTree();
      expect(updated.branches[tree.activeBranchId].name).toBe('primary');
    });

    it('should throw when renaming a non-existent branch', async () => {
      const service = await getService();
      await service.loadTree();

      await expect(service.renameBranch('non-existent', 'name')).rejects.toThrow(
        'Branch non-existent not found',
      );
    });
  });

  // ─── deleteBranch ─────────────────────────────────────────────

  describe('deleteBranch', () => {
    it('should delete a branch and its exclusive nodes', async () => {
      const service = await getService();
      await service.loadTree();
      const node1 = await service.addNode(makeEntry('e1'));
      const mainBranchId = service.getTree().activeBranchId;

      const forked = await service.forkBranch(node1.id, 'temp');
      await service.addNode(makeEntry('e2'));

      await service.deleteBranch(forked.id);

      const tree = service.getTree();
      expect(tree.branches[forked.id]).toBeUndefined();
      expect(tree.activeBranchId).toBe(mainBranchId);
    });

    it('should not delete the last remaining branch', async () => {
      const service = await getService();
      const tree = await service.loadTree();

      await expect(service.deleteBranch(tree.activeBranchId)).rejects.toThrow(
        'Cannot delete the last branch',
      );
    });

    it('should throw when deleting a non-existent branch', async () => {
      const service = await getService();
      await service.loadTree();

      await expect(service.deleteBranch('non-existent')).rejects.toThrow(
        'Branch non-existent not found',
      );
    });

    it('should fallback active branch when deleting the active one', async () => {
      const service = await getService();
      await service.loadTree();
      const node1 = await service.addNode(makeEntry('e1'));

      const forked = await service.forkBranch(node1.id, 'doomed');
      expect(service.getTree().activeBranchId).toBe(forked.id);

      await service.deleteBranch(forked.id);
      expect(service.getTree().activeBranchId).not.toBe(forked.id);
    });
  });

  // ─── getAncestry ─────────────────────────────────────────────

  describe('getAncestry', () => {
    it('should return the lineage from root to the target node', async () => {
      const service = await getService();
      const tree = await service.loadTree();
      const rootNodeId = tree.branches[tree.activeBranchId].rootNodeId;
      const node1 = await service.addNode(makeEntry('e1'));
      const node2 = await service.addNode(makeEntry('e2'));

      const ancestry = service.getAncestry(node2.id);

      expect(ancestry).toHaveLength(3);
      expect(ancestry[0].id).toBe(rootNodeId);
      expect(ancestry[1].id).toBe(node1.id);
      expect(ancestry[2].id).toBe(node2.id);
    });

    it('should return single element for root node', async () => {
      const service = await getService();
      const tree = await service.loadTree();
      const rootNodeId = tree.branches[tree.activeBranchId].rootNodeId;

      const ancestry = service.getAncestry(rootNodeId);
      expect(ancestry).toHaveLength(1);
    });
  });

  // ─── getBranchNodes ───────────────────────────────────────────

  describe('getBranchNodes', () => {
    it('should return nodes belonging to a branch', async () => {
      const service = await getService();
      const tree = await service.loadTree();
      await service.addNode(makeEntry('e1'));
      await service.addNode(makeEntry('e2'));

      const nodes = service.getBranchNodes(tree.activeBranchId);

      expect(nodes.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for non-existent branch', async () => {
      const service = await getService();
      await service.loadTree();

      const nodes = service.getBranchNodes('non-existent');
      expect(nodes).toEqual([]);
    });

    it('should include fork point in forked branch nodes', async () => {
      const service = await getService();
      await service.loadTree();
      const node1 = await service.addNode(makeEntry('e1'));

      const forked = await service.forkBranch(node1.id, 'side');
      await service.addNode(makeEntry('e2'));

      const nodes = service.getBranchNodes(forked.id);
      const nodeIds = nodes.map((n) => n.id);
      expect(nodeIds).toContain(node1.id);
    });
  });

  // ─── getComparableBranches ────────────────────────────────────

  describe('getComparableBranches', () => {
    it('should return entries grouped by branch', async () => {
      const service = await getService();
      const tree = await service.loadTree();
      const mainBranchId = tree.activeBranchId;

      const entryE1 = makeEntry('e1');
      const node1 = await service.addNode(entryE1);

      const forked = await service.forkBranch(node1.id, 'alt');
      const entryE2 = makeEntry('e2');
      await service.addNode(entryE2);

      const { nodesA, nodesB } = service.getComparableBranches(mainBranchId, forked.id, [
        entryE1,
        entryE2,
      ]);

      expect(nodesA.length).toBeGreaterThanOrEqual(1);
      expect(nodesB.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── clearTree ────────────────────────────────────────────────

  describe('clearTree', () => {
    it('should reset to a fresh tree', async () => {
      const service = await getService();
      await service.loadTree();
      await service.addNode(makeEntry('e1'));
      await service.addNode(makeEntry('e2'));

      await service.clearTree();

      const tree = service.getTree();
      expect(Object.keys(tree.nodes)).toHaveLength(1);
      expect(Object.keys(tree.branches)).toHaveLength(1);
    });
  });

  // ─── removeNode ───────────────────────────────────────────────

  describe('removeNode', () => {
    it('should remove a leaf node and update parent', async () => {
      const service = await getService();
      await service.loadTree();
      const node1 = await service.addNode(makeEntry('e1'));
      const node2 = await service.addNode(makeEntry('e2'));

      await service.removeNode(node2.id);

      const tree = service.getTree();
      expect(tree.nodes[node2.id]).toBeUndefined();

      const parent = tree.nodes[node1.id];
      expect(parent.childIds).not.toContain(node2.id);
    });

    it('should remove a node and all its descendants', async () => {
      const service = await getService();
      await service.loadTree();
      const node1 = await service.addNode(makeEntry('e1'));
      const node2 = await service.addNode(makeEntry('e2'));
      const node3 = await service.addNode(makeEntry('e3'));

      await service.removeNode(node1.id);

      const tree = service.getTree();
      expect(tree.nodes[node1.id]).toBeUndefined();
      expect(tree.nodes[node2.id]).toBeUndefined();
      expect(tree.nodes[node3.id]).toBeUndefined();
    });

    it('should reset branch active node if removed', async () => {
      const service = await getService();
      await service.loadTree();
      const node1 = await service.addNode(makeEntry('e1'));
      const node2 = await service.addNode(makeEntry('e2'));

      await service.removeNode(node2.id);

      const tree = service.getTree();
      const branch = tree.branches[node1.branchId];
      expect(branch.activeNodeId).not.toBe(node2.id);
    });

    it('should no-op for non-existent node', async () => {
      const service = await getService();
      await service.loadTree();

      await expect(service.removeNode('non-existent')).resolves.not.toThrow();
    });
  });
});
