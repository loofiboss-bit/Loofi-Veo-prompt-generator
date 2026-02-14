/**
 * Visual Composer Types — v2.0.0
 *
 * Defines the type system for the drag-and-drop prompt block builder,
 * timeline-prompt linked graph, and visual dependency editing.
 */

// ─── Block Categories ───────────────────────────────────────────────────────

export type BlockCategory =
  | 'scene'
  | 'character'
  | 'camera'
  | 'style'
  | 'audio'
  | 'effect'
  | 'logic'
  | 'output';

export type BlockType =
  // Scene blocks
  | 'scene-environment'
  | 'scene-lighting'
  | 'scene-weather'
  | 'scene-time'
  // Character blocks
  | 'character-action'
  | 'character-dialogue'
  | 'character-emotion'
  | 'character-appearance'
  // Camera blocks
  | 'camera-movement'
  | 'camera-angle'
  | 'camera-lens'
  | 'camera-composition'
  // Style blocks
  | 'style-art'
  | 'style-color'
  | 'style-mood'
  | 'style-reference'
  // Audio blocks
  | 'audio-ambient'
  | 'audio-music'
  | 'audio-sfx'
  | 'audio-voiceover'
  // Effect blocks
  | 'effect-transition'
  | 'effect-visual'
  | 'effect-motion'
  // Logic blocks
  | 'logic-condition'
  | 'logic-loop'
  | 'logic-variable'
  // Output blocks
  | 'output-prompt'
  | 'output-shot';

// ─── Port System ─────────────────────────────────────────────────────────────

export type PortDirection = 'input' | 'output';
export type PortDataType = 'text' | 'number' | 'style' | 'camera' | 'audio' | 'any';

export interface BlockPort {
  id: string;
  label: string;
  direction: PortDirection;
  dataType: PortDataType;
  /** Maximum connections allowed (0 = unlimited) */
  maxConnections: number;
  /** Current value if statically set (not connected) */
  defaultValue?: string;
}

// ─── Block Definition ────────────────────────────────────────────────────────

export interface BlockDefinition {
  type: BlockType;
  category: BlockCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  ports: BlockPort[];
  /** Default field values when block is created */
  defaultFields: Record<string, string | number | boolean>;
}

// ─── Block Instance (on canvas) ─────────────────────────────────────────────

export interface Position {
  x: number;
  y: number;
}

export interface BlockSize {
  width: number;
  height: number;
}

export interface PromptBlock {
  id: string;
  type: BlockType;
  category: BlockCategory;
  position: Position;
  size: BlockSize;
  /** User-editable field values */
  fields: Record<string, string | number | boolean>;
  /** Whether block is collapsed in the UI */
  isCollapsed: boolean;
  /** Whether the block is currently disabled/muted */
  isDisabled: boolean;
  /** User-assigned label override */
  label?: string;
  /** Lock position to prevent accidental moves */
  isLocked: boolean;
  /** Linked shot ID (for timeline integration) */
  linkedShotId?: number;
  /** Linked timeline clip ID */
  linkedClipId?: string;
  /** Z-index for layering on canvas */
  zIndex: number;
}

// ─── Connections ─────────────────────────────────────────────────────────────

export interface BlockConnection {
  id: string;
  sourceBlockId: string;
  sourcePortId: string;
  targetBlockId: string;
  targetPortId: string;
  /** Visual style for the connection line */
  style: ConnectionStyle;
  /** Whether connection is currently active (data flowing) */
  isActive: boolean;
}

export type ConnectionStyle = 'bezier' | 'straight' | 'step';

// ─── Canvas State ────────────────────────────────────────────────────────────

export interface CanvasViewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface ComposerSnapshot {
  id: string;
  name: string;
  timestamp: number;
  blocks: PromptBlock[];
  connections: BlockConnection[];
}

// ─── Composer State ──────────────────────────────────────────────────────────

export interface ComposerState {
  /** All blocks on the canvas */
  blocks: PromptBlock[];
  /** All connections between blocks */
  connections: BlockConnection[];
  /** Camera/viewport state */
  viewport: CanvasViewport;
  /** Currently selected block IDs */
  selectedBlockIds: string[];
  /** Currently selected connection IDs */
  selectedConnectionIds: string[];
  /** Block being dragged (null if none) */
  draggingBlockId: string | null;
  /** Connection being drawn (partial) */
  pendingConnection: PendingConnection | null;
  /** Grid snap enabled */
  snapToGrid: boolean;
  /** Grid size in pixels */
  gridSize: number;
  /** Show minimap */
  showMinimap: boolean;
  /** Auto-layout mode */
  autoLayout: boolean;
  /** Named snapshots for undo/versioning */
  snapshots: ComposerSnapshot[];
  /** Next z-index counter */
  nextZIndex: number;
}

export interface PendingConnection {
  sourceBlockId: string;
  sourcePortId: string;
  /** Current mouse position while drawing */
  mousePosition: Position;
}

// ─── Evaluation (prompt compilation) ─────────────────────────────────────────

export interface BlockEvaluationResult {
  blockId: string;
  outputValues: Record<string, string>;
  warnings: string[];
  errors: string[];
}

export interface ComposerEvaluationResult {
  /** Final compiled prompt text */
  compiledPrompt: string;
  /** Per-block results */
  blockResults: BlockEvaluationResult[];
  /** Blocks in evaluation order */
  evaluationOrder: string[];
  /** Total warnings */
  warnings: string[];
  /** Total errors */
  errors: string[];
  /** Whether the graph has cycles */
  hasCycles: boolean;
}

// ─── Timeline Integration ────────────────────────────────────────────────────

export interface TimelineLink {
  blockId: string;
  shotId: number;
  clipId?: string;
  /** Sync direction */
  syncMode: 'block-to-shot' | 'shot-to-block' | 'bidirectional';
}

export interface ComposerTimelineState {
  links: TimelineLink[];
  /** Whether to auto-sync changes */
  autoSync: boolean;
}
