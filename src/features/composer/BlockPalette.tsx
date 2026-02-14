/**
 * BlockPalette — v2.0.0
 *
 * Sidebar palette of available block types organized by category.
 * Blocks are dragged from here onto the ComposerCanvas.
 */

import React, { useState, useCallback } from 'react';
import { composerService } from '@core/services/composerService';
import Icon from '@shared/components/ui/Icon';
import type { BlockCategory, BlockDefinition } from '@core/types/composer';

export const BlockPalette: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<BlockCategory | null>('scene');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = composerService.getCategories();
  const allBlocks = composerService.getBlockDefinitions();

  const filteredBlocks = searchQuery.trim()
    ? allBlocks.filter(
        (b) =>
          b.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : null;

  const handleDragStart = useCallback((e: React.DragEvent, def: BlockDefinition) => {
    e.dataTransfer.setData('application/composer-block', def.type);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const toggleCategory = useCallback((cat: BlockCategory) => {
    setExpandedCategory((prev) => (prev === cat ? null : cat));
  }, []);

  return (
    <div className="w-56 bg-slate-900/80 border-r border-slate-700/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-slate-700/50">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Block Palette
        </h3>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search blocks..."
          className="w-full px-2.5 py-1.5 text-xs bg-slate-800/60 border border-slate-700/50 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
      </div>

      {/* Block list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredBlocks ? (
          /* Search results */
          <div className="p-2 space-y-1">
            {filteredBlocks.map((def) => (
              <PaletteBlockItem key={def.type} def={def} onDragStart={handleDragStart} />
            ))}
            {filteredBlocks.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No blocks match</p>
            )}
          </div>
        ) : (
          /* Category groups */
          categories.map((cat) => {
            const blocks = composerService.getBlocksByCategory(cat.id);
            const isExpanded = expandedCategory === cat.id;

            return (
              <div key={cat.id} className="border-b border-slate-800/50">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full px-3 py-2 flex items-center gap-2 text-xs font-medium hover:bg-slate-800/40 transition-colors"
                  style={{ color: cat.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="flex-1 text-left">{cat.label}</span>
                  <Icon
                    name={isExpanded ? 'chevron-down' : 'chevron-right'}
                    className="w-3 h-3 opacity-50"
                  />
                </button>

                {isExpanded && (
                  <div className="px-2 pb-2 space-y-1">
                    {blocks.map((def) => (
                      <PaletteBlockItem key={def.type} def={def} onDragStart={handleDragStart} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Palette Block Item ──────────────────────────────────────────────────────

interface PaletteBlockItemProps {
  def: BlockDefinition;
  onDragStart: (e: React.DragEvent, def: BlockDefinition) => void;
}

const PaletteBlockItem: React.FC<PaletteBlockItemProps> = ({ def, onDragStart }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, def)}
      className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-slate-800/40 hover:bg-slate-800/80 cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-600/50 transition-all group"
      title={def.description}
    >
      <span
        className="w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0"
        style={{ backgroundColor: `${def.color}20`, color: def.color }}
      >
        <Icon name={def.icon as never} className="w-3.5 h-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-200 truncate">{def.label}</p>
        <p className="text-[10px] text-slate-500 truncate group-hover:text-slate-400">
          {def.description}
        </p>
      </div>
    </div>
  );
};
