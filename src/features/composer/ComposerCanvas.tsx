/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- canvas interaction area requires mouse handlers */
/**
 * ComposerCanvas — v2.0.0
 *
 * Main drag-and-drop canvas for the Visual Composer.
 * Handles panning, zooming, block dragging, connection drawing,
 * and selection box.
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useComposerStore } from '@core/store/useComposerStore';
import { composerService } from '@core/services/composerService';
import { PromptBlockNode } from './PromptBlockNode';
import { ConnectionLine, PendingConnectionLine } from './ConnectionLine';
import type { BlockType, Position } from '@core/types/composer';

interface ComposerCanvasProps {
  containerRef?: React.RefObject<HTMLDivElement>;
}

export const ComposerCanvas: React.FC<ComposerCanvasProps> = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);

  const {
    blocks,
    connections,
    viewport,
    selectedConnectionIds,
    pendingConnection,
    snapToGrid,
    gridSize,
    showMinimap,
    setViewport,
    addBlock,
    updateBlockPosition,
    selectConnection,
    clearSelection,
    startConnection,
    updatePendingConnection,
    completeConnection,
    cancelConnection,
    selectBlocksInRect,
  } = useComposerStore();

  const selectedBlockIds = useComposerStore((s) => s.selectedBlockIds);

  useEffect(() => {
    if (!transformRef.current) return;

    transformRef.current.style.transform = `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`;
    transformRef.current.style.willChange = 'transform';
  }, [viewport.panX, viewport.panY, viewport.zoom]);

  // ─── Local interaction state ──────────────────────────────────────────────

  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [isSelectionBox, setIsSelectionBox] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  const [selectionStart, setSelectionStart] = useState<Position>({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState<Position>({ x: 0, y: 0 });

  // ─── Coordinate transforms ───────────────────────────────────────────────

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Position => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: screenX, y: screenY };
      return {
        x: (screenX - rect.left - viewport.panX) / viewport.zoom,
        y: (screenY - rect.top - viewport.panY) / viewport.zoom,
      };
    },
    [viewport],
  );

  // ─── Drop handler (from palette) ─────────────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const blockType = e.dataTransfer.getData('application/composer-block') as BlockType;
      if (!blockType) return;

      const pos = screenToCanvas(e.clientX, e.clientY);
      addBlock(blockType, pos);
    },
    [screenToCanvas, addBlock],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // ─── Mouse handlers ──────────────────────────────────────────────────────

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left-click on the canvas background
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;

      // Check if click is on a block (not canvas background)
      const blockEl = target.closest('[data-block-id]') as HTMLElement | null;
      if (blockEl) {
        const blockId = blockEl.getAttribute('data-block-id');
        if (blockId) {
          const block = blocks.find((b) => b.id === blockId);
          if (block && !block.isLocked) {
            setIsDraggingBlock(true);
            setDraggedBlockId(blockId);
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            setDragOffset({
              x: canvasPos.x - block.position.x,
              y: canvasPos.y - block.position.y,
            });
          }
          return;
        }
      }

      // Check if click is on a port
      const portEl = target.closest('[data-port-id]') as HTMLElement | null;
      if (portEl) return; // Port handlers take care of this

      // Clicking on canvas background
      if (e.shiftKey) {
        // Start selection box
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setIsSelectionBox(true);
        setSelectionStart(canvasPos);
        setSelectionEnd(canvasPos);
      } else {
        // Start panning
        setIsPanning(true);
        setPanStart({ x: e.clientX - viewport.panX, y: e.clientY - viewport.panY });
        clearSelection();
      }
    },
    [blocks, viewport, screenToCanvas, clearSelection],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setViewport({
          panX: e.clientX - panStart.x,
          panY: e.clientY - panStart.y,
        });
        return;
      }

      if (isDraggingBlock && draggedBlockId) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        updateBlockPosition(draggedBlockId, {
          x: canvasPos.x - dragOffset.x,
          y: canvasPos.y - dragOffset.y,
        });
        return;
      }

      if (isSelectionBox) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setSelectionEnd(canvasPos);
        return;
      }

      if (pendingConnection) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        updatePendingConnection(canvasPos);
      }
    },
    [
      isPanning,
      isDraggingBlock,
      draggedBlockId,
      isSelectionBox,
      pendingConnection,
      panStart,
      dragOffset,
      screenToCanvas,
      setViewport,
      updateBlockPosition,
      updatePendingConnection,
    ],
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (isSelectionBox) {
      selectBlocksInRect(selectionStart.x, selectionStart.y, selectionEnd.x, selectionEnd.y);
    }

    if (pendingConnection) {
      cancelConnection();
    }

    setIsPanning(false);
    setIsDraggingBlock(false);
    setIsSelectionBox(false);
    setDraggedBlockId(null);
  }, [
    isSelectionBox,
    pendingConnection,
    selectionStart,
    selectionEnd,
    selectBlocksInRect,
    cancelConnection,
  ]);

  // ─── Wheel zoom ───────────────────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const newZoom = Math.max(0.2, Math.min(3, viewport.zoom + delta));

      // Zoom towards mouse position
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomRatio = newZoom / viewport.zoom;

        setViewport({
          zoom: newZoom,
          panX: mouseX - (mouseX - viewport.panX) * zoomRatio,
          panY: mouseY - (mouseY - viewport.panY) * zoomRatio,
        });
      }
    },
    [viewport, setViewport],
  );

  // ─── Port interactions ────────────────────────────────────────────────────

  const handlePortMouseDown = useCallback(
    (blockId: string, portId: string, direction: 'input' | 'output') => {
      if (direction === 'output') {
        startConnection(blockId, portId);
      }
    },
    [startConnection],
  );

  const handlePortMouseUp = useCallback(
    (blockId: string, portId: string) => {
      if (pendingConnection) {
        completeConnection(blockId, portId);
      }
    },
    [pendingConnection, completeConnection],
  );

  // ─── Connection positions ─────────────────────────────────────────────────

  const getPortPosition = useCallback(
    (blockId: string, portId: string): Position => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return { x: 0, y: 0 };

      const def = composerService.getBlockDefinition(block.type);
      if (!def) return block.position;

      const port = def.ports.find((p) => p.id === portId);
      if (!port) return block.position;

      const isInput = port.direction === 'input';
      const portsOfSameDir = def.ports.filter((p) => p.direction === port.direction);
      const portIndex = portsOfSameDir.indexOf(port);

      const headerHeight = 36;
      const portSpacing = 28;
      const portY = block.position.y + headerHeight + portIndex * portSpacing + 14;

      return {
        x: isInput ? block.position.x : block.position.x + block.size.width,
        y: portY,
      };
    },
    [blocks],
  );

  // ─── Grid rendering ──────────────────────────────────────────────────────

  const gridPattern = useMemo(() => {
    if (!snapToGrid) return null;
    return (
      <defs>
        <pattern id="grid-pattern" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={0.5} fill="#1e293b" />
        </pattern>
      </defs>
    );
  }, [snapToGrid, gridSize]);

  // ─── Selection box ────────────────────────────────────────────────────────

  const selectionRect = useMemo(() => {
    if (!isSelectionBox) return null;
    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const w = Math.abs(selectionEnd.x - selectionStart.x);
    const h = Math.abs(selectionEnd.y - selectionStart.y);

    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="rgba(34, 211, 238, 0.05)"
        stroke="#22d3ee"
        strokeWidth={1 / viewport.zoom}
        strokeDasharray={`${4 / viewport.zoom}`}
      />
    );
  }, [isSelectionBox, selectionStart, selectionEnd, viewport.zoom]);

  // ─── Minimap ──────────────────────────────────────────────────────────────

  const minimapContent = useMemo(() => {
    if (!showMinimap || blocks.length === 0) return null;

    const padding = 20;
    const allX = blocks.map((b) => b.position.x);
    const allY = blocks.map((b) => b.position.y);
    const minX = Math.min(...allX) - padding;
    const minY = Math.min(...allY) - padding;
    const maxX = Math.max(...allX.map((x, i) => x + blocks[i].size.width)) + padding;
    const maxY = Math.max(...allY.map((y, i) => y + blocks[i].size.height)) + padding;

    const graphW = maxX - minX;
    const graphH = maxY - minY;
    const scale = Math.min(160 / graphW, 120 / graphH);

    return (
      <div className="absolute bottom-3 right-3 w-40 h-30 bg-slate-900/90 border border-slate-700/50 rounded-md overflow-hidden z-50">
        <svg width={160} height={120}>
          {blocks.map((b) => {
            const def = composerService.getBlockDefinition(b.type);
            return (
              <rect
                key={b.id}
                x={(b.position.x - minX) * scale}
                y={(b.position.y - minY) * scale}
                width={b.size.width * scale}
                height={Math.min(b.size.height, 40) * scale}
                fill={def?.color || '#64748b'}
                opacity={selectedBlockIds.includes(b.id) ? 1 : 0.5}
                rx={1}
              />
            );
          })}
        </svg>
      </div>
    );
  }, [showMinimap, blocks, selectedBlockIds]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      ref={canvasRef}
      data-tutorial="composer-canvas"
      data-tour-id="composer-canvas"
      role="application"
      aria-label="Composer canvas"
      className={`flex-1 relative overflow-hidden bg-slate-950 ${isPanning || isDraggingBlock ? 'cursor-grabbing' : 'cursor-default'}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onWheel={handleWheel}
    >
      {/* Transform wrapper for pan + zoom */}
      <div ref={transformRef} className="absolute inset-0 origin-top-left">
        {/* SVG layer for connections and grid */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        >
          {/* Grid */}
          {gridPattern}
          {snapToGrid && (
            <rect x={-10000} y={-10000} width={20000} height={20000} fill="url(#grid-pattern)" />
          )}

          {/* Connections */}
          <g className="pointer-events-auto">
            {connections.map((conn) => {
              const from = getPortPosition(conn.sourceBlockId, conn.sourcePortId);
              const to = getPortPosition(conn.targetBlockId, conn.targetPortId);
              const sourceBlock = blocks.find((b) => b.id === conn.sourceBlockId);
              const def = sourceBlock ? composerService.getBlockDefinition(sourceBlock.type) : null;

              return (
                <ConnectionLine
                  key={conn.id}
                  from={from}
                  to={to}
                  style={conn.style}
                  isSelected={selectedConnectionIds.includes(conn.id)}
                  isActive={conn.isActive}
                  color={def?.color}
                  onClick={() => selectConnection(conn.id)}
                />
              );
            })}
          </g>

          {/* Pending connection */}
          {pendingConnection && (
            <PendingConnectionLine
              from={getPortPosition(
                pendingConnection.sourceBlockId,
                pendingConnection.sourcePortId,
              )}
              to={pendingConnection.mousePosition}
            />
          )}

          {/* Selection box */}
          {selectionRect}
        </svg>

        {/* Block nodes */}
        {blocks.map((block) => (
          <PromptBlockNode
            key={block.id}
            block={block}
            isSelected={selectedBlockIds.includes(block.id)}
            zoom={viewport.zoom}
            onPortMouseDown={handlePortMouseDown}
            onPortMouseUp={handlePortMouseUp}
          />
        ))}
      </div>

      {/* Minimap */}
      {minimapContent}

      {/* Empty state */}
      {blocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">Drag blocks from the palette to start</p>
            <p className="text-xs text-slate-700">
              Connect output ports to input ports to build your prompt graph
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
