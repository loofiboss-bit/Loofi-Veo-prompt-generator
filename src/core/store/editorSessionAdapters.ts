import type {
  Project,
  PromptState,
  CharacterProfile,
  LocationProfile,
  VisualDNA,
  StoryboardState,
  PromptBlock,
  BlockConnection,
  CanvasViewport,
  ComposerEvaluationResult,
  ComposerSnapshot,
  ConnectionStyle,
  TimelineLink,
} from '@core/types';

import { useAppStore } from './useAppStore';
import { INITIAL_COMPOSER_STATE, useComposerStore } from './useComposerStore';
import { useLocationStore } from './useLocationStore';

export interface ProjectComposerState {
  blocks: PromptBlock[];
  connections: BlockConnection[];
  viewport: CanvasViewport;
  snapToGrid: boolean;
  gridSize: number;
  showMinimap: boolean;
  autoLayout: boolean;
  connectionStyle: ConnectionStyle;
  snapshots: ComposerSnapshot[];
  timelineLinks: TimelineLink[];
  autoSyncTimeline: boolean;
  nextZIndex: number;
  lastEvaluation: ComposerEvaluationResult | null;
}

export type EditorProjectDocument = Project & {
  composer?: ProjectComposerState;
};

interface BuildProjectDocumentInput {
  id: string;
  name: string;
  promptState: PromptState;
  characterBank: CharacterProfile[];
  locationBank: LocationProfile[];
  visualDNA: VisualDNA[];
  storyboard: StoryboardState;
  composer?: ProjectComposerState;
  lastModified?: number;
}

export function createDefaultProjectComposerState(): ProjectComposerState {
  return {
    blocks: [],
    connections: [],
    viewport: { ...INITIAL_COMPOSER_STATE.viewport },
    snapToGrid: INITIAL_COMPOSER_STATE.snapToGrid,
    gridSize: INITIAL_COMPOSER_STATE.gridSize,
    showMinimap: INITIAL_COMPOSER_STATE.showMinimap,
    autoLayout: INITIAL_COMPOSER_STATE.autoLayout,
    connectionStyle: INITIAL_COMPOSER_STATE.connectionStyle,
    snapshots: [],
    timelineLinks: [],
    autoSyncTimeline: INITIAL_COMPOSER_STATE.autoSyncTimeline,
    nextZIndex: INITIAL_COMPOSER_STATE.nextZIndex,
    lastEvaluation: null,
  };
}

export function snapshotComposerState(): ProjectComposerState {
  const state = useComposerStore.getState();

  return {
    blocks: state.blocks,
    connections: state.connections,
    viewport: state.viewport,
    snapToGrid: state.snapToGrid,
    gridSize: state.gridSize,
    showMinimap: state.showMinimap,
    autoLayout: state.autoLayout,
    connectionStyle: state.connectionStyle,
    snapshots: state.snapshots,
    timelineLinks: state.timelineLinks,
    autoSyncTimeline: state.autoSyncTimeline,
    nextZIndex: state.nextZIndex,
    lastEvaluation: state.lastEvaluation,
  };
}

export function buildProjectDocument({
  id,
  name,
  promptState,
  characterBank,
  locationBank,
  visualDNA,
  storyboard,
  composer,
  lastModified,
}: BuildProjectDocumentInput): EditorProjectDocument {
  return {
    id,
    name,
    lastModified: lastModified ?? Date.now(),
    promptState,
    characterBank,
    locationBank,
    visualDNA,
    storyboard,
    composer: composer ?? snapshotComposerState(),
  };
}

export function captureProjectDocumentFromStores(meta: {
  id: string;
  name: string;
}): EditorProjectDocument {
  const appState = useAppStore.getState();
  const { locations } = useLocationStore.getState();

  return buildProjectDocument({
    id: meta.id,
    name: meta.name,
    promptState: appState.promptState,
    characterBank: appState.characterBank,
    locationBank: locations,
    visualDNA: appState.visualDNA,
    storyboard: {
      globalContext: appState.sbGlobalContext,
      shots: appState.sbShots,
      timeline: {
        tracks: appState.tracks,
        clips: appState.clips,
        zoomLevel: appState.zoomLevel,
        currentTime: appState.currentTime,
      },
    },
    composer: snapshotComposerState(),
  });
}

export function applyProjectDocumentToStores(project: EditorProjectDocument): void {
  const appState = useAppStore.getState();
  const storyboard = project.storyboard;
  const timeline = storyboard?.timeline;
  const composer = project.composer ?? createDefaultProjectComposerState();

  appState.setFullState({
    promptState: project.promptState,
    sbGlobalContext: storyboard?.globalContext ?? appState.sbGlobalContext,
    sbShots: storyboard?.shots ?? appState.sbShots,
    tracks: timeline?.tracks ?? appState.tracks,
    clips: timeline?.clips ?? appState.clips,
    zoomLevel: timeline?.zoomLevel ?? appState.zoomLevel,
    currentTime: timeline?.currentTime ?? appState.currentTime,
    characterBank: project.characterBank,
    visualDNA: project.visualDNA,
  });

  useLocationStore.getState().setLocations(project.locationBank || []);

  useComposerStore.setState((state) => ({
    ...state,
    ...createDefaultProjectComposerState(),
    ...composer,
    viewport: composer.viewport ?? state.viewport,
    blocks: composer.blocks ?? [],
    connections: composer.connections ?? [],
    snapshots: composer.snapshots ?? [],
    timelineLinks: composer.timelineLinks ?? [],
    selectedBlockIds: [],
    selectedConnectionIds: [],
    draggingBlockId: null,
    pendingConnection: null,
    lastEvaluation: null,
    isPanelOpen: false,
  }));
}
