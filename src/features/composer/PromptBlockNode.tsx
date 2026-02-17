/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- block nodes require mouse handlers for drag interactions */
/**
 * PromptBlockNode — v2.0.0
 *
 * Renders a single block on the composer canvas with ports, fields, and controls.
 * Supports drag-to-move, port click for connections, and inline field editing.
 */

import React, { useCallback, useRef, useMemo } from 'react';
import { composerService } from '@core/services/composerService';
import Icon from '@shared/components/ui/Icon';
import { useComposerStore } from '@core/store/useComposerStore';
import type { PromptBlock, BlockPort } from '@core/types/composer';

interface PromptBlockNodeProps {
  block: PromptBlock;
  isSelected: boolean;
  zoom?: number;
  onPortMouseDown: (blockId: string, portId: string, direction: 'input' | 'output') => void;
  onPortMouseUp: (blockId: string, portId: string) => void;
}

export const PromptBlockNode: React.FC<PromptBlockNodeProps> = ({
  block,
  isSelected,
  zoom: _zoom,
  onPortMouseDown,
  onPortMouseUp,
}) => {
  const def = useMemo(() => composerService.getBlockDefinition(block.type), [block.type]);
  const nodeRef = useRef<HTMLDivElement>(null);

  const {
    updateBlockField,
    toggleBlockCollapse,
    toggleBlockDisabled,
    removeBlock,
    duplicateBlock,
    selectBlock,
    bringToFront,
  } = useComposerStore();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectBlock(block.id, e.shiftKey || e.ctrlKey);
      bringToFront(block.id);
    },
    [block.id, selectBlock, bringToFront],
  );

  if (!def) return null;

  const inputPorts = def.ports.filter((p) => p.direction === 'input');
  const outputPorts = def.ports.filter((p) => p.direction === 'output');

  return (
    <div
      role="group"
      aria-label={`Block: ${block.label || def.label}`}
      ref={nodeRef}
      data-block-id={block.id}
      className={`
        absolute select-none rounded-lg border-2 shadow-lg transition-shadow
        ${isSelected ? 'ring-2 ring-cyan-400/60 shadow-cyan-500/20' : 'shadow-black/30'}
        ${block.isDisabled ? 'opacity-40' : ''}
        ${block.isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
      `}
      style={{
        left: block.position.x,
        top: block.position.y,
        width: block.size.width,
        zIndex: block.zIndex,
        borderColor: `${def.color}60`,
        backgroundColor: 'rgb(15 23 42 / 0.95)',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
        style={{ backgroundColor: `${def.color}15` }}
      >
        <span style={{ color: def.color }}>
          <Icon name={def.icon as never} className="w-3.5 h-3.5" />
        </span>
        <span className="flex-1 text-xs font-semibold text-slate-200 truncate">
          {block.label || def.label}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBlockDisabled(block.id);
            }}
            className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
            title={block.isDisabled ? 'Enable' : 'Disable'}
          >
            <Icon name={block.isDisabled ? 'eye-off' : 'eye'} className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBlockCollapse(block.id);
            }}
            className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
            title={block.isCollapsed ? 'Expand' : 'Collapse'}
          >
            <Icon name={block.isCollapsed ? 'chevron-right' : 'chevron-down'} className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateBlock(block.id);
            }}
            className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
            title="Duplicate"
          >
            <Icon name="copy" className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeBlock(block.id);
            }}
            className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-red-400"
            title="Delete"
          >
            <Icon name="trash" className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body (ports + fields) */}
      {!block.isCollapsed && (
        <div className="px-3 py-2 space-y-2">
          {/* Ports */}
          <div className="flex justify-between gap-4">
            {/* Input Ports */}
            <div className="space-y-1.5">
              {inputPorts.map((port) => (
                <PortHandle
                  key={port.id}
                  port={port}
                  blockId={block.id}
                  side="left"
                  color={def.color}
                  onMouseDown={onPortMouseDown}
                  onMouseUp={onPortMouseUp}
                />
              ))}
            </div>

            {/* Output Ports */}
            <div className="space-y-1.5">
              {outputPorts.map((port) => (
                <PortHandle
                  key={port.id}
                  port={port}
                  blockId={block.id}
                  side="right"
                  color={def.color}
                  onMouseDown={onPortMouseDown}
                  onMouseUp={onPortMouseUp}
                />
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/50">
            {Object.entries(block.fields).map(([key, value]) => (
              <BlockField
                key={key}
                fieldKey={key}
                value={value}
                blockId={block.id}
                onChange={updateBlockField}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category indicator stripe */}
      <div className="h-0.5 rounded-b-lg" style={{ backgroundColor: def.color }} />
    </div>
  );
};

// ─── Port Handle ─────────────────────────────────────────────────────────────

interface PortHandleProps {
  port: BlockPort;
  blockId: string;
  side: 'left' | 'right';
  color: string;
  onMouseDown: (blockId: string, portId: string, direction: 'input' | 'output') => void;
  onMouseUp: (blockId: string, portId: string) => void;
}

const PORT_TYPE_COLORS: Record<string, string> = {
  text: '#94a3b8',
  number: '#60a5fa',
  style: '#f472b6',
  camera: '#22d3ee',
  audio: '#34d399',
  any: '#fbbf24',
};

const PortHandle: React.FC<PortHandleProps> = ({
  port,
  blockId,
  side,
  color,
  onMouseDown,
  onMouseUp,
}) => {
  const dotColor = PORT_TYPE_COLORS[port.dataType] || color;

  return (
    <div
      data-port-id={port.id}
      data-port-direction={port.direction}
      data-block-id={blockId}
      className={`flex items-center gap-1.5 ${side === 'right' ? 'flex-row-reverse' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${port.label} port`}
        className="w-3 h-3 rounded-full border-2 cursor-crosshair hover:scale-125 transition-transform flex-shrink-0"
        style={{
          borderColor: dotColor,
          backgroundColor: `${dotColor}40`,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(blockId, port.id, port.direction);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          onMouseUp(blockId, port.id);
        }}
      />
      <span className="text-[10px] text-slate-400 whitespace-nowrap">{port.label}</span>
    </div>
  );
};

// ─── Block Field ─────────────────────────────────────────────────────────────

interface BlockFieldProps {
  fieldKey: string;
  value: string | number | boolean;
  blockId: string;
  onChange: (blockId: string, field: string, value: string | number | boolean) => void;
}

const BlockField: React.FC<BlockFieldProps> = ({ fieldKey, value, blockId, onChange }) => {
  const label = fieldKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

  if (typeof value === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(blockId, fieldKey, e.target.checked)}
          className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/30"
          onClick={(e) => e.stopPropagation()}
        />
        {label}
      </label>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className="space-y-0.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-500">{label}</span>
          <span className="text-slate-400">{value}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(blockId, fieldKey, Number(e.target.value))}
          className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
          onClick={(e) => e.stopPropagation()}
          aria-label={label}
        />
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <span className="text-[10px] text-slate-500">{label}</span>
      <input
        type="text"
        value={String(value)}
        onChange={(e) => onChange(blockId, fieldKey, e.target.value)}
        className="w-full px-2 py-1 text-[11px] bg-slate-800/60 border border-slate-700/50 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label={label}
      />
    </div>
  );
};
