/**
 * BlockInspector — v2.0.0
 *
 * Right-side inspector panel showing properties of the selected block(s).
 * Allows editing fields, managing connections, and linking to timeline.
 */

import React from 'react';
import { composerService } from '@core/services/composerService';
import Icon from '@shared/components/ui/Icon';
import { useComposerStore } from '@core/store/useComposerStore';
import type { PromptBlock, ComposerEvaluationResult } from '@core/types/composer';
import { getComposerColorClasses } from './composerColorClasses';

export const BlockInspector: React.FC = () => {
  const blocks = useComposerStore((s) => s.blocks);
  const selectedBlockIds = useComposerStore((s) => s.selectedBlockIds);
  const lastEvaluation = useComposerStore((s) => s.lastEvaluation);

  const selectedBlocks = blocks.filter((b) => selectedBlockIds.includes(b.id));

  if (selectedBlocks.length === 0) {
    return (
      <div className="w-60 bg-slate-900/80 border-l border-slate-700/50 flex flex-col items-center justify-center p-4">
        <Icon name="info" className="w-6 h-6 text-slate-600 mb-2" />
        <p className="text-xs text-slate-500 text-center">
          Select a block to inspect its properties
        </p>
      </div>
    );
  }

  if (selectedBlocks.length > 1) {
    return (
      <div className="w-60 bg-slate-900/80 border-l border-slate-700/50 p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Multi-Selection
        </h3>
        <p className="text-xs text-slate-500">{selectedBlocks.length} blocks selected</p>
        <div className="mt-3 space-y-1">
          {selectedBlocks.map((b) => {
            const def = composerService.getBlockDefinition(b.type);
            const colorClasses = getComposerColorClasses(def?.color);

            return (
              <div key={b.id} className="flex items-center gap-2 text-xs text-slate-400">
                <span className={`w-2 h-2 rounded-full ${colorClasses.bg}`} />
                {b.label || def?.label || b.type}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const block = selectedBlocks[0];

  return <SingleBlockInspector block={block} evaluation={lastEvaluation} />;
};

// ─── Single Block Inspector ──────────────────────────────────────────────────

interface SingleBlockInspectorProps {
  block: PromptBlock;
  evaluation: ComposerEvaluationResult | null;
}

const SingleBlockInspector: React.FC<SingleBlockInspectorProps> = ({ block, evaluation }) => {
  const {
    connections,
    updateBlockLabel,
    updateBlockField,
    toggleBlockLock,
    toggleBlockDisabled,
    linkBlockToShot: _linkBlockToShot,
    unlinkBlock,
    timelineLinks,
  } = useComposerStore();

  const def = composerService.getBlockDefinition(block.type);
  if (!def) return null;

  const colorClasses = getComposerColorClasses(def.color);

  const blockLink = timelineLinks.find((l) => l.blockId === block.id);
  const blockResult = evaluation?.blockResults.find((r) => r.blockId === block.id);
  const incomingConnections = connections.filter((c) => c.targetBlockId === block.id);
  const outgoingConnections = connections.filter((c) => c.sourceBlockId === block.id);

  return (
    <div className="w-60 bg-slate-900/80 border-l border-slate-700/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <span className={colorClasses.text}>
            <Icon name={def.icon as never} className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            value={block.label || def.label}
            onChange={(e) => updateBlockLabel(block.id, e.target.value)}
            className="flex-1 text-xs font-semibold bg-transparent text-slate-200 border-none focus:outline-none focus:ring-1 focus:ring-cyan-500/30 rounded px-1"
            aria-label="Block label"
          />
        </div>
        <p className="text-[10px] text-slate-500">{def.description}</p>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
          <span className={`px-1.5 py-0.5 rounded-full ${colorClasses.bg20} ${colorClasses.text}`}>
            {def.category}
          </span>
          <span>{def.type}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
        {/* Properties */}
        <InspectorSection title="Properties">
          <div className="space-y-2">
            {Object.entries(block.fields).map(([key, value]) => {
              const label = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (s) => s.toUpperCase())
                .trim();

              if (typeof value === 'boolean') {
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => updateBlockField(block.id, key, e.target.checked)}
                      className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/30"
                    />
                    {label}
                  </label>
                );
              }

              if (typeof value === 'number') {
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">{label}</span>
                      <span className="text-slate-400">{value}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={value}
                      onChange={(e) => updateBlockField(block.id, key, Number(e.target.value))}
                      className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                      aria-label={label}
                    />
                  </div>
                );
              }

              return (
                <div key={key} className="space-y-1">
                  <span className="text-[10px] text-slate-500">{label}</span>
                  <input
                    type="text"
                    value={String(value)}
                    onChange={(e) => updateBlockField(block.id, key, e.target.value)}
                    className="w-full px-2 py-1.5 text-[11px] bg-slate-800/60 border border-slate-700/50 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                    aria-label={label}
                  />
                </div>
              );
            })}
          </div>
        </InspectorSection>

        {/* Connections */}
        <InspectorSection title="Connections">
          <div className="space-y-2">
            {incomingConnections.length > 0 && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Incoming</span>
                {incomingConnections.map((c) => (
                  <div key={c.id} className="text-[10px] text-slate-400 pl-2 py-0.5">
                    ← {c.sourcePortId} from {c.sourceBlockId.substring(0, 8)}...
                  </div>
                ))}
              </div>
            )}
            {outgoingConnections.length > 0 && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Outgoing</span>
                {outgoingConnections.map((c) => (
                  <div key={c.id} className="text-[10px] text-slate-400 pl-2 py-0.5">
                    → {c.targetPortId} to {c.targetBlockId.substring(0, 8)}...
                  </div>
                ))}
              </div>
            )}
            {incomingConnections.length === 0 && outgoingConnections.length === 0 && (
              <p className="text-[10px] text-slate-600">No connections</p>
            )}
          </div>
        </InspectorSection>

        {/* Flags */}
        <InspectorSection title="Flags">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={block.isLocked}
                onChange={() => toggleBlockLock(block.id)}
                className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/30"
              />
              Locked Position
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={block.isDisabled}
                onChange={() => toggleBlockDisabled(block.id)}
                className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/30"
              />
              Disabled (Muted)
            </label>
          </div>
        </InspectorSection>

        {/* Timeline Link */}
        <InspectorSection title="Timeline Link">
          {blockLink ? (
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400">
                Linked to Shot #{blockLink.shotId}
                {blockLink.clipId && ` (Clip: ${blockLink.clipId.substring(0, 8)}...)`}
              </div>
              <button
                onClick={() => unlinkBlock(block.id)}
                className="text-[10px] text-red-400 hover:text-red-300"
              >
                Unlink
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-slate-600">Not linked to any timeline shot</p>
          )}
        </InspectorSection>

        {/* Evaluation Result */}
        {blockResult && (
          <InspectorSection title="Evaluation">
            <div className="space-y-2">
              {Object.entries(blockResult.outputValues).map(([key, value]) => (
                <div key={key} className="space-y-0.5">
                  <span className="text-[10px] text-slate-500">{key}</span>
                  <p className="text-[10px] text-slate-300 bg-slate-800/40 rounded px-2 py-1 break-words">
                    {value || <span className="text-slate-600">(empty)</span>}
                  </p>
                </div>
              ))}
              {blockResult.warnings.map((w, i) => (
                <div key={`w-${i}`} className="text-[10px] text-amber-400 flex items-center gap-1">
                  <Icon name="alert-triangle" className="w-2.5 h-2.5" />
                  {w}
                </div>
              ))}
              {blockResult.errors.map((e, i) => (
                <div key={`e-${i}`} className="text-[10px] text-red-400 flex items-center gap-1">
                  <Icon name="close" className="w-2.5 h-2.5" />
                  {e}
                </div>
              ))}
            </div>
          </InspectorSection>
        )}

        {/* Position info */}
        <InspectorSection title="Position">
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-slate-500">X</span>
              <span className="text-slate-400 ml-1">{Math.round(block.position.x)}</span>
            </div>
            <div>
              <span className="text-slate-500">Y</span>
              <span className="text-slate-400 ml-1">{Math.round(block.position.y)}</span>
            </div>
            <div>
              <span className="text-slate-500">W</span>
              <span className="text-slate-400 ml-1">{block.size.width}</span>
            </div>
            <div>
              <span className="text-slate-500">Z</span>
              <span className="text-slate-400 ml-1">{block.zIndex}</span>
            </div>
          </div>
        </InspectorSection>
      </div>
    </div>
  );
};

// ─── Inspector Section ───────────────────────────────────────────────────────

const InspectorSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div>
    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
      {title}
    </h4>
    {children}
  </div>
);
