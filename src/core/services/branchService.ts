/**
 * Branch Service
 * Manages git-like prompt branching with tree/graph data structure
 * Persists branch tree to IndexedDB via idb-keyval
 */

import { get, set } from 'idb-keyval';
import { logger } from './loggerService';
import type { BranchNode, PromptBranch, BranchTree } from '@core/types';
import type { HistoryEntry } from '@core/services/historyService';

const BRANCH_TREE_KEY = 'veo-branch-tree-v1';

const BRANCH_COLORS = [
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#ec4899', // pink
  '#84cc16', // lime
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyTree(): BranchTree {
  const mainBranchId = generateId();
  const rootNodeId = generateId();

  const rootNode: BranchNode = {
    id: rootNodeId,
    entryId: '',
    parentId: null,
    childIds: [],
    branchId: mainBranchId,
    depth: 0,
    timestamp: Date.now(),
  };

  const mainBranch: PromptBranch = {
    id: mainBranchId,
    name: 'main',
    color: BRANCH_COLORS[0],
    rootNodeId,
    activeNodeId: rootNodeId,
    createdAt: Date.now(),
    parentBranchId: null,
    forkNodeId: null,
  };

  return {
    nodes: { [rootNodeId]: rootNode },
    branches: { [mainBranchId]: mainBranch },
    activeBranchId: mainBranchId,
  };
}

class BranchService {
  private static instance: BranchService;
  private tree: BranchTree | null = null;

  static getInstance(): BranchService {
    if (!BranchService.instance) BranchService.instance = new BranchService();
    return BranchService.instance;
  }

  async loadTree(): Promise<BranchTree> {
    try {
      const stored = await get<BranchTree>(BRANCH_TREE_KEY);
      this.tree = stored || createEmptyTree();
      await this.persist();
      return this.tree;
    } catch (error) {
      logger.error('Failed to load branch tree', error);
      this.tree = createEmptyTree();
      return this.tree;
    }
  }

  getTree(): BranchTree {
    if (!this.tree) {
      this.tree = createEmptyTree();
    }
    return this.tree;
  }

  private async persist(): Promise<void> {
    if (!this.tree) return;
    try {
      await set(BRANCH_TREE_KEY, this.tree);
    } catch (error) {
      logger.error('Failed to persist branch tree', error);
    }
  }

  async addNode(entry: HistoryEntry, branchId?: string): Promise<BranchNode> {
    const tree = this.getTree();
    const targetBranchId = branchId || tree.activeBranchId;
    const branch = tree.branches[targetBranchId];

    if (!branch) {
      throw new Error(`Branch ${targetBranchId} not found`);
    }

    const parentNode = tree.nodes[branch.activeNodeId];
    const nodeId = generateId();

    const newNode: BranchNode = {
      id: nodeId,
      entryId: entry.id,
      parentId: parentNode.id,
      childIds: [],
      branchId: targetBranchId,
      depth: parentNode.depth + 1,
      timestamp: entry.timestamp,
    };

    parentNode.childIds.push(nodeId);
    tree.nodes[nodeId] = newNode;
    branch.activeNodeId = nodeId;

    await this.persist();
    logger.info('Branch node added', 'BranchService', { nodeId, branchId: targetBranchId });
    return newNode;
  }

  async forkBranch(fromNodeId: string, branchName?: string): Promise<PromptBranch> {
    const tree = this.getTree();
    const sourceNode = tree.nodes[fromNodeId];

    if (!sourceNode) {
      throw new Error(`Node ${fromNodeId} not found`);
    }

    const branchCount = Object.keys(tree.branches).length;
    const color = BRANCH_COLORS[branchCount % BRANCH_COLORS.length];
    const newBranchId = generateId();
    const name = branchName || `branch-${branchCount}`;

    const newBranch: PromptBranch = {
      id: newBranchId,
      name,
      color,
      rootNodeId: fromNodeId,
      activeNodeId: fromNodeId,
      createdAt: Date.now(),
      parentBranchId: sourceNode.branchId,
      forkNodeId: fromNodeId,
    };

    tree.branches[newBranchId] = newBranch;
    tree.activeBranchId = newBranchId;

    await this.persist();
    logger.info('Branch forked', 'BranchService', { newBranchId, fromNodeId });
    return newBranch;
  }

  async switchBranch(branchId: string): Promise<void> {
    const tree = this.getTree();
    if (!tree.branches[branchId]) {
      throw new Error(`Branch ${branchId} not found`);
    }
    tree.activeBranchId = branchId;
    await this.persist();
  }

  async setActiveNode(nodeId: string): Promise<void> {
    const tree = this.getTree();
    const node = tree.nodes[nodeId];
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    const branch = tree.branches[node.branchId];
    if (branch) {
      branch.activeNodeId = nodeId;
    }
    tree.activeBranchId = node.branchId;
    await this.persist();
  }

  async renameBranch(branchId: string, newName: string): Promise<void> {
    const tree = this.getTree();
    const branch = tree.branches[branchId];
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }
    branch.name = newName;
    await this.persist();
  }

  async deleteBranch(branchId: string): Promise<void> {
    const tree = this.getTree();
    const branch = tree.branches[branchId];
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    const branchIds = Object.keys(tree.branches);
    if (branchIds.length <= 1) {
      throw new Error('Cannot delete the last branch');
    }

    const nodeIdsToRemove = Object.keys(tree.nodes).filter((id) => {
      const node = tree.nodes[id];
      return node.branchId === branchId && id !== branch.forkNodeId;
    });

    for (const nodeId of nodeIdsToRemove) {
      const node = tree.nodes[nodeId];
      if (node.parentId) {
        const parent = tree.nodes[node.parentId];
        if (parent) {
          parent.childIds = parent.childIds.filter((cid) => cid !== nodeId);
        }
      }
      delete tree.nodes[nodeId];
    }

    delete tree.branches[branchId];

    if (tree.activeBranchId === branchId) {
      tree.activeBranchId = Object.keys(tree.branches)[0];
    }

    await this.persist();
    logger.info('Branch deleted', 'BranchService', { branchId });
  }

  getAncestry(nodeId: string): BranchNode[] {
    const tree = this.getTree();
    const ancestry: BranchNode[] = [];
    let current = tree.nodes[nodeId];

    while (current) {
      ancestry.unshift(current);
      current = current.parentId ? tree.nodes[current.parentId] : (null as unknown as BranchNode);
    }

    return ancestry;
  }

  getBranchNodes(branchId: string): BranchNode[] {
    const tree = this.getTree();
    const branch = tree.branches[branchId];
    if (!branch) return [];

    return this.getAncestry(branch.activeNodeId).filter(
      (node) => node.branchId === branchId || node.id === branch.forkNodeId,
    );
  }

  getComparableBranches(
    branchIdA: string,
    branchIdB: string,
    entries: HistoryEntry[],
  ): { nodesA: HistoryEntry[]; nodesB: HistoryEntry[] } {
    const entryMap = new Map(entries.map((e) => [e.id, e]));

    const branchNodesA = this.getBranchNodes(branchIdA);
    const branchNodesB = this.getBranchNodes(branchIdB);

    const nodesA = branchNodesA
      .map((n) => entryMap.get(n.entryId))
      .filter((e): e is HistoryEntry => e !== undefined);

    const nodesB = branchNodesB
      .map((n) => entryMap.get(n.entryId))
      .filter((e): e is HistoryEntry => e !== undefined);

    return { nodesA, nodesB };
  }

  async clearTree(): Promise<void> {
    this.tree = createEmptyTree();
    await this.persist();
    logger.info('Branch tree cleared', 'BranchService');
  }

  async removeNode(nodeId: string): Promise<void> {
    const tree = this.getTree();
    const node = tree.nodes[nodeId];
    if (!node) return;

    if (node.parentId) {
      const parent = tree.nodes[node.parentId];
      if (parent) {
        parent.childIds = parent.childIds.filter((cid) => cid !== nodeId);
      }
    }

    const descendantIds = this.getDescendantIds(nodeId);
    for (const id of descendantIds) {
      delete tree.nodes[id];
    }
    delete tree.nodes[nodeId];

    for (const branch of Object.values(tree.branches)) {
      if (branch.activeNodeId === nodeId || descendantIds.includes(branch.activeNodeId)) {
        branch.activeNodeId = node.parentId || branch.rootNodeId;
      }
    }

    await this.persist();
  }

  private getDescendantIds(nodeId: string): string[] {
    const tree = this.getTree();
    const node = tree.nodes[nodeId];
    if (!node) return [];

    const descendants: string[] = [];
    for (const childId of node.childIds) {
      descendants.push(childId);
      descendants.push(...this.getDescendantIds(childId));
    }
    return descendants;
  }
}

export const branchService = BranchService.getInstance();
