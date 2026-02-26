import type {
  CanvasViewport,
  ComposerSnapshot,
  PromptBlock,
  BlockConnection,
  TimelineLink,
} from '@core/types/composer';

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function clampGridSize(size: number): number {
  return Math.max(5, Math.min(100, size));
}

export function calculateZoomToFitViewport(blocks: PromptBlock[]): CanvasViewport {
  if (blocks.length === 0) {
    return { panX: 0, panY: 0, zoom: 1 };
  }

  const minX = Math.min(...blocks.map((b) => b.position.x));
  const maxX = Math.max(...blocks.map((b) => b.position.x + b.size.width));
  const minY = Math.min(...blocks.map((b) => b.position.y));
  const maxY = Math.max(...blocks.map((b) => b.position.y + b.size.height));

  const padding = 80;
  const graphWidth = maxX - minX + padding * 2;
  const graphHeight = maxY - minY + padding * 2;

  const zoomX = 1200 / graphWidth;
  const zoomY = 800 / graphHeight;
  const zoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.2), 2);

  return {
    panX: -(minX - padding) * zoom,
    panY: -(minY - padding) * zoom,
    zoom,
  };
}

export function buildSnapshot(
  name: string,
  blocks: PromptBlock[],
  connections: BlockConnection[],
): ComposerSnapshot {
  return {
    id: `snap_${Date.now()}`,
    name,
    timestamp: Date.now(),
    blocks: deepClone(blocks),
    connections: deepClone(connections),
  };
}

export function toggleSelectionId(ids: string[], targetId: string): string[] {
  const isSelected = ids.includes(targetId);
  return isSelected ? ids.filter((id) => id !== targetId) : [...ids, targetId];
}

export function selectBlockIdsInRect(
  blocks: PromptBlock[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string[] {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  return blocks
    .filter(
      (b) =>
        b.position.x >= minX &&
        b.position.x + b.size.width <= maxX &&
        b.position.y >= minY &&
        b.position.y + b.size.height <= maxY,
    )
    .map((b) => b.id);
}

export function removeConnectionById(
  connections: BlockConnection[],
  connectionId: string,
): BlockConnection[] {
  return connections.filter((connection) => connection.id !== connectionId);
}

export function removeBlockById(blocks: PromptBlock[], blockId: string): PromptBlock[] {
  return blocks.filter((block) => block.id !== blockId);
}

export function removeBlocksBySelectedIds(
  blocks: PromptBlock[],
  selectedBlockIds: string[],
): PromptBlock[] {
  const selectedSet = new Set(selectedBlockIds);
  return blocks.filter((block) => !selectedSet.has(block.id));
}

export function removeConnectionsByBlockId(
  connections: BlockConnection[],
  blockId: string,
): BlockConnection[] {
  return connections.filter(
    (connection) => connection.sourceBlockId !== blockId && connection.targetBlockId !== blockId,
  );
}

export function removeConnectionsBySelectedBlockIds(
  connections: BlockConnection[],
  selectedBlockIds: string[],
): BlockConnection[] {
  const selectedSet = new Set(selectedBlockIds);
  return connections.filter(
    (connection) =>
      !selectedSet.has(connection.sourceBlockId) && !selectedSet.has(connection.targetBlockId),
  );
}

export function removeConnectionsBySelectedIds(
  connections: BlockConnection[],
  selectedConnectionIds: string[],
): BlockConnection[] {
  const selectedSet = new Set(selectedConnectionIds);
  return connections.filter((connection) => !selectedSet.has(connection.id));
}

export function upsertTimelineLink(
  timelineLinks: TimelineLink[],
  nextLink: TimelineLink,
): TimelineLink[] {
  const existingIndex = timelineLinks.findIndex((link) => link.blockId === nextLink.blockId);
  if (existingIndex < 0) {
    return [...timelineLinks, nextLink];
  }

  const updated = [...timelineLinks];
  updated[existingIndex] = nextLink;
  return updated;
}

export function removeTimelineLinksByBlockId(
  timelineLinks: TimelineLink[],
  blockId: string,
): TimelineLink[] {
  return timelineLinks.filter((link) => link.blockId !== blockId);
}

export function removeTimelineLinksBySelectedBlockIds(
  timelineLinks: TimelineLink[],
  selectedBlockIds: string[],
): TimelineLink[] {
  const selectedSet = new Set(selectedBlockIds);
  return timelineLinks.filter((link) => !selectedSet.has(link.blockId));
}
