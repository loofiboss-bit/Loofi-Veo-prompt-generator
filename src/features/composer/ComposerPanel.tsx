/**
 * ComposerPanel — v2.0.0
 *
 * Full-bleed wrapper that composes the Visual Composer layout:
 *   ┌──────────────────────────────────────────────────┐
 *   │  ComposerToolbar                                 │
 *   ├────────┬────────────────────────────┬────────────┤
 *   │ Block  │       ComposerCanvas       │  Block     │
 *   │ Palette│                            │  Inspector │
 *   └────────┴────────────────────────────┴────────────┘
 */

import React from 'react';
import { ComposerCanvas } from './ComposerCanvas';
import { BlockPalette } from './BlockPalette';
import { BlockInspector } from './BlockInspector';
import { ComposerToolbar } from './ComposerToolbar';
import { useComposerStore } from '@core/store/useComposerStore';
import ErrorBoundary from '@shared/components/ErrorBoundary';

export const ComposerPanel: React.FC = () => {
  const isPanelOpen = useComposerStore((s) => s.isPanelOpen);
  const selectedBlockIds = useComposerStore((s) => s.selectedBlockIds);
  const showInspector = isPanelOpen && selectedBlockIds.length > 0;

  return (
    <div className="fixed inset-0 z-30 ml-0 lg:ml-64 flex flex-col bg-slate-950">
      {/* Toolbar */}
      <ErrorBoundary panelId="composer-toolbar">
        <ComposerToolbar />
      </ErrorBoundary>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Block Palette (left) */}
        <ErrorBoundary panelId="composer-palette">
          <BlockPalette />
        </ErrorBoundary>

        {/* Canvas (center) */}
        <ErrorBoundary panelId="composer-canvas">
          <ComposerCanvas />
        </ErrorBoundary>

        {/* Inspector (right, conditional) */}
        {showInspector && (
          <ErrorBoundary panelId="composer-inspector">
            <BlockInspector />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};
