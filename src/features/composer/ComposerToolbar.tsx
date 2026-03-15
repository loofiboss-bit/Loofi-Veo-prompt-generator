/**
 * ComposerToolbar — v2.0.0
 *
 * Top toolbar for the Visual Composer with zoom, layout,
 * snap-to-grid, evaluate, and snapshot controls.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@core/config/routes';
import Icon from '@shared/components/ui/Icon';
import { useComposerStore } from '@core/store/useComposerStore';
import { useOnboarding } from '@shared/contexts/OnboardingContext';

export const ComposerToolbar: React.FC = () => {
  const navigate = useNavigate();
  const { startComposerTutorial } = useOnboarding();
  const {
    viewport,
    snapToGrid,
    showMinimap,
    autoLayout,
    blocks,
    connections,
    connectionStyle,
    zoomIn,
    zoomOut,
    zoomToFit,
    resetViewport,
    toggleSnapToGrid,
    toggleMinimap,
    toggleAutoLayout,
    setConnectionStyle,
    applyAutoLayout,
    clearCanvas,
    selectAll,
    removeSelectedBlocks,
    saveSnapshot,
    evaluate,
  } = useComposerStore();

  return (
    <div
      data-tutorial="composer-toolbar"
      data-tour-id="composer-toolbar"
      className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-700/50 backdrop-blur-sm"
    >
      {/* Left: Title + Stats */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className="flex items-center gap-2 rounded-md border border-slate-700/60 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800/80 hover:text-slate-100"
          aria-label="Back to Prompt Builder"
          title="Back to Prompt Builder"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" />
          <span>Prompt Builder</span>
        </button>

        <div className="flex items-center gap-2">
          <Icon name="layers" className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Visual Composer</h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span>{blocks.length} blocks</span>
          <span>·</span>
          <span>{connections.length} connections</span>
        </div>
      </div>

      {/* Center: Tools */}
      <div className="flex items-center gap-1">
        {/* Zoom controls */}
        <ToolbarGroup dataTutorial="composer-toolbar-layout">
          <ToolbarButton
            icon="search"
            label={`${Math.round(viewport.zoom * 100)}%`}
            onClick={resetViewport}
          />
          <ToolbarButton icon="minus" tooltip="Zoom Out" onClick={zoomOut} />
          <ToolbarButton icon="plus" tooltip="Zoom In" onClick={zoomIn} />
          <ToolbarButton icon="expand" tooltip="Zoom to Fit" onClick={zoomToFit} />
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Layout */}
        <ToolbarGroup>
          <ToolbarToggle
            icon="grid-3x3"
            tooltip="Snap to Grid"
            isActive={snapToGrid}
            onClick={toggleSnapToGrid}
          />
          <ToolbarButton icon="shuffle" tooltip="Auto Layout" onClick={applyAutoLayout} />
          <ToolbarToggle
            icon="layers"
            tooltip="Auto-Layout Mode"
            isActive={autoLayout}
            onClick={toggleAutoLayout}
          />
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Connection style */}
        <ToolbarGroup>
          <ToolbarToggle
            icon="activity"
            tooltip="Bezier Curves"
            isActive={connectionStyle === 'bezier'}
            onClick={() => setConnectionStyle('bezier')}
          />
          <ToolbarToggle
            icon="minus"
            tooltip="Straight Lines"
            isActive={connectionStyle === 'straight'}
            onClick={() => setConnectionStyle('straight')}
          />
          <ToolbarToggle
            icon="list"
            tooltip="Step Lines"
            isActive={connectionStyle === 'step'}
            onClick={() => setConnectionStyle('step')}
          />
        </ToolbarGroup>

        <ToolbarDivider />

        {/* Actions */}
        <ToolbarGroup>
          <ToolbarButton
            icon="sparkles"
            tooltip="Evaluate Graph"
            onClick={evaluate}
            accent
            dataTutorial="composer-evaluate"
          />
          <ToolbarButton
            icon="save"
            tooltip="Save Snapshot"
            onClick={() => saveSnapshot(`Snapshot ${new Date().toLocaleTimeString()}`)}
          />
          <ToolbarToggle
            icon="map-pin"
            tooltip="Minimap"
            isActive={showMinimap}
            onClick={toggleMinimap}
          />
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton icon="check" tooltip="Select All" onClick={selectAll} />
          <ToolbarButton icon="trash" tooltip="Delete Selected" onClick={removeSelectedBlocks} />
          <ToolbarButton icon="eraser" tooltip="Clear Canvas" onClick={clearCanvas} />
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton
            icon="help"
            tooltip="Start Composer Tour"
            onClick={startComposerTutorial}
            label="Tour"
          />
        </ToolbarGroup>
      </div>

      {/* Right: Zoom label */}
      <span className="text-xs text-slate-500 tabular-nums">
        {Math.round(viewport.zoom * 100)}%
      </span>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const ToolbarGroup: React.FC<{ children: React.ReactNode; dataTutorial?: string }> = ({
  children,
  dataTutorial,
}) => (
  <div
    data-tutorial={dataTutorial}
    data-tour-id={dataTutorial}
    className="flex items-center gap-0.5 bg-slate-800/40 rounded-md p-0.5"
  >
    {children}
  </div>
);

const ToolbarDivider: React.FC = () => <div className="w-px h-5 bg-slate-700/50 mx-1" />;

interface ToolbarButtonProps {
  icon: string;
  label?: string;
  tooltip?: string;
  onClick: () => void;
  accent?: boolean;
  dataTutorial?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  tooltip,
  onClick,
  accent,
  dataTutorial,
}) => (
  <button
    data-tutorial={dataTutorial}
    data-tour-id={dataTutorial}
    onClick={onClick}
    title={tooltip}
    className={`
      flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors
      ${
        accent
          ? 'text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300'
          : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
      }
    `}
  >
    <Icon name={icon as never} className="w-3.5 h-3.5" />
    {label && <span>{label}</span>}
  </button>
);

interface ToolbarToggleProps {
  icon: string;
  tooltip: string;
  isActive: boolean;
  onClick: () => void;
}

const ToolbarToggle: React.FC<ToolbarToggleProps> = ({ icon, tooltip, isActive, onClick }) => (
  <button
    onClick={onClick}
    title={tooltip}
    className={`
      flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors
      ${
        isActive
          ? 'text-cyan-400 bg-cyan-500/10'
          : 'text-slate-500 hover:bg-slate-700/50 hover:text-slate-300'
      }
    `}
  >
    <Icon name={icon as never} className="w-3.5 h-3.5" />
  </button>
);
