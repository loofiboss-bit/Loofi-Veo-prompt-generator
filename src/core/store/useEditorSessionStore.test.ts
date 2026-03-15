import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  createStore: vi.fn(),
  update: vi.fn(),
}));

import type { EditorProjectDocument } from './editorSessionAdapters';
import { INITIAL_COMPOSER_STATE, useComposerStore } from './useComposerStore';
import { useAppStore } from './useAppStore';
import { useEditorSessionStore } from './useEditorSessionStore';
import { useLocationStore } from './useLocationStore';

function makeProject(): EditorProjectDocument {
  return {
    id: 'proj-load',
    name: 'Loaded Session',
    lastModified: Date.now(),
    promptState: {
      ...useAppStore.getState().promptState,
      idea: 'Loaded idea',
      aspectRatio: '9:16',
    },
    characterBank: [],
    locationBank: [{ id: 'loc-1', name: 'Roof', description: 'Night rooftop', visualTags: [] }],
    visualDNA: [],
    storyboard: {
      globalContext: { style: 'Neo-noir', character: 'Detective', setting: 'Rainy city' },
      shots: [
        {
          id: 7,
          type: 'video',
          action: 'Pan across skyline',
          camera: 'Slow pan',
          characterId: '',
          takes: [],
          selectedTakeIndex: 0,
          visualLink: false,
          duration: 6,
          transition: { type: 'dissolve', duration: 1 },
        },
      ],
      timeline: {
        tracks: useAppStore.getState().tracks,
        clips: [
          {
            id: 'video_7',
            resourceId: 7,
            trackId: 'video_main',
            startTime: 0,
            duration: 6,
            offset: 0,
            type: 'video',
            label: 'Pan across skyline',
          },
        ],
        zoomLevel: 48,
        currentTime: 2.5,
      },
    },
    composer: {
      blocks: [],
      connections: [],
      viewport: { panX: 12, panY: 24, zoom: 1.25 },
      snapToGrid: true,
      gridSize: 24,
      showMinimap: true,
      autoLayout: false,
      connectionStyle: 'straight',
      snapshots: [],
      timelineLinks: [{ blockId: 'b1', shotId: 7, clipId: 'video_7', syncMode: 'bidirectional' }],
      autoSyncTimeline: true,
      nextZIndex: 3,
      lastEvaluation: null,
    },
  };
}

describe('useEditorSessionStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      promptState: { ...useAppStore.getState().promptState, idea: '' },
      sbGlobalContext: { style: '', character: '', setting: '' },
      sbShots: [],
      clips: [],
      zoomLevel: 20,
      currentTime: 0,
      characterBank: [],
      visualDNA: [],
    });
    useLocationStore.setState({ locations: [] });
    useComposerStore.setState({
      ...INITIAL_COMPOSER_STATE,
      selectedBlockIds: ['stale-selection'],
      selectedConnectionIds: ['stale-connection'],
      isPanelOpen: true,
    });
    useEditorSessionStore.setState({
      ...useEditorSessionStore.getInitialState(),
    });
  });

  it('applies a loaded project document to app, location, and composer stores', () => {
    const project = makeProject();

    useEditorSessionStore.getState().commitProjectDocument(project, 'load');

    expect(useAppStore.getState().promptState.idea).toBe('Loaded idea');
    expect(useAppStore.getState().zoomLevel).toBe(48);
    expect(useAppStore.getState().currentTime).toBe(2.5);
    expect(useLocationStore.getState().locations).toEqual(project.locationBank);
    expect(useComposerStore.getState().viewport).toEqual(project.composer?.viewport);
    expect(useComposerStore.getState().timelineLinks).toEqual(project.composer?.timelineLinks);
    expect(useComposerStore.getState().selectedBlockIds).toEqual([]);
    expect(useComposerStore.getState().isPanelOpen).toBe(false);
    expect(useEditorSessionStore.getState().activeProjectId).toBe('proj-load');
    expect(useEditorSessionStore.getState().phase).toBe('ready');
  });
});
