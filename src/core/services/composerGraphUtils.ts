import type { BlockConnection, BlockPort, Position, PromptBlock } from '@core/types/composer';

export function arePortsCompatible(source: BlockPort, target: BlockPort): boolean {
  if (source.dataType === 'any' || target.dataType === 'any') return true;
  if (source.dataType === target.dataType) return true;
  if (source.dataType === 'text') return true;
  return false;
}

export function wouldCreateCycle(
  connections: BlockConnection[],
  sourceBlockId: string,
  targetBlockId: string,
): boolean {
  if (sourceBlockId === targetBlockId) return true;

  const visited = new Set<string>();
  const stack = [targetBlockId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === sourceBlockId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const conn of connections) {
      if (conn.sourceBlockId === current) {
        stack.push(conn.targetBlockId);
      }
    }
  }

  return false;
}

export function topologicalSort(
  blocks: PromptBlock[],
  connections: BlockConnection[],
): string[] | null {
  if (blocks.length === 0) return [];

  const blockIds = new Set(blocks.map((block) => block.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const block of blocks) {
    inDegree.set(block.id, 0);
    adjacency.set(block.id, []);
  }

  for (const conn of connections) {
    if (!blockIds.has(conn.sourceBlockId) || !blockIds.has(conn.targetBlockId)) {
      continue;
    }

    const current = inDegree.get(conn.targetBlockId) ?? 0;
    inDegree.set(conn.targetBlockId, current + 1);
    adjacency.get(conn.sourceBlockId)?.push(conn.targetBlockId);
  }

  for (const neighbors of adjacency.values()) {
    neighbors.sort();
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }
  queue.sort();

  const enqueueSorted = (value: string) => {
    queue.push(value);
    queue.sort();
  };

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjacency.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) enqueueSorted(neighbor);
    }
  }

  if (sorted.length !== blocks.length) {
    return null;
  }

  return sorted;
}

export function autoLayoutBlocks(
  blocks: PromptBlock[],
  connections: BlockConnection[],
): PromptBlock[] {
  const order = topologicalSort(blocks, connections);
  if (!order) return blocks;

  const orderSet = new Set(order);
  const validConnections = connections.filter(
    (connection) =>
      orderSet.has(connection.sourceBlockId) && orderSet.has(connection.targetBlockId),
  );

  const depth = new Map<string, number>();
  const childrenOf = new Map<string, string[]>();

  for (const id of order) {
    childrenOf.set(id, []);
  }

  for (const conn of validConnections) {
    childrenOf.get(conn.sourceBlockId)?.push(conn.targetBlockId);
  }

  const roots = order.filter((id) => !validConnections.some((c) => c.targetBlockId === id));

  for (const root of roots) {
    depth.set(root, 0);
  }

  for (const id of order) {
    const d = depth.get(id) ?? 0;
    for (const child of childrenOf.get(id) || []) {
      const currentChildDepth = depth.get(child) ?? 0;
      depth.set(child, Math.max(currentChildDepth, d + 1));
    }
  }

  const columns = new Map<number, string[]>();
  for (const [id, d] of depth) {
    if (!columns.has(d)) columns.set(d, []);
    columns.get(d)!.push(id);
  }

  const columnGap = 300;
  const rowGap = 180;
  const startX = 100;
  const startY = 100;

  return blocks.map((block) => {
    const d = depth.get(block.id) ?? 0;
    const col = columns.get(d) || [];
    const rowIndex = col.indexOf(block.id);

    return {
      ...block,
      position: {
        x: startX + d * columnGap,
        y: startY + rowIndex * rowGap,
      },
    };
  });
}

export function snapPosition(position: Position, gridSize: number): Position {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}
