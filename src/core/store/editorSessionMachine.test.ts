import { describe, expect, it } from 'vitest';

import {
  initialEditorSessionMachineState,
  reduceEditorSessionState,
  type EditorSessionMachineState,
} from './editorSessionMachine';
import type { Project } from '@core/types';

function makeProject(id: string, name: string): Project {
  return {
    id,
    name,
    lastModified: Date.now(),
    promptState: {} as Project['promptState'],
    characterBank: [],
    locationBank: [],
    visualDNA: [],
    storyboard: {
      globalContext: { style: '', character: '', setting: '' },
      shots: [],
      timeline: {
        tracks: [],
        clips: [],
        zoomLevel: 20,
        currentTime: 0,
      },
    },
  };
}

describe('editorSessionMachine', () => {
  it('hydrates into a ready state', () => {
    const hydrating = reduceEditorSessionState(initialEditorSessionMachineState, {
      type: 'HYDRATE_REQUEST',
    });

    const hydrated = reduceEditorSessionState(hydrating, {
      type: 'HYDRATE_SUCCESS',
      project: makeProject('proj-1', 'Hydrated Project'),
    });

    expect(hydrated.phase).toBe('ready');
    expect(hydrated.activeProjectId).toBe('proj-1');
    expect(hydrated.projectSnapshot?.name).toBe('Hydrated Project');
    expect(hydrated.error).toBeNull();
  });

  it('tracks load transitions without losing the previous snapshot on failure', () => {
    const readyState: EditorSessionMachineState = {
      ...initialEditorSessionMachineState,
      phase: 'ready',
      activeProjectId: 'proj-existing',
      projectSnapshot: makeProject('proj-existing', 'Existing Project'),
    };

    const loading = reduceEditorSessionState(readyState, {
      type: 'TRANSITION_START',
      operation: 'load',
      projectId: 'proj-2',
    });

    const failed = reduceEditorSessionState(loading, {
      type: 'TRANSITION_FAILURE',
      operation: 'load',
      projectId: 'proj-2',
      error: 'Load failed',
    });

    expect(loading.phase).toBe('loading');
    expect(failed.phase).toBe('error');
    expect(failed.projectSnapshot?.id).toBe('proj-existing');
    expect(failed.error).toBe('Load failed');
  });

  it('stores the loaded project snapshot on load success', () => {
    const loading = reduceEditorSessionState(initialEditorSessionMachineState, {
      type: 'TRANSITION_START',
      operation: 'load',
      projectId: 'proj-3',
    });

    const loadedProject = makeProject('proj-3', 'Loaded Project');
    const loaded = reduceEditorSessionState(loading, {
      type: 'TRANSITION_SUCCESS',
      operation: 'load',
      project: loadedProject,
      projectId: loadedProject.id,
    });

    expect(loaded.phase).toBe('ready');
    expect(loaded.activeProjectId).toBe('proj-3');
    expect(loaded.projectSnapshot).toEqual(loadedProject);
    expect(loaded.transitionVersion).toBe(1);
  });

  it('clears the active snapshot when the active project is deleted', () => {
    const readyState: EditorSessionMachineState = {
      ...initialEditorSessionMachineState,
      phase: 'ready',
      activeProjectId: 'proj-4',
      projectSnapshot: makeProject('proj-4', 'Disposable Project'),
    };

    const deleting = reduceEditorSessionState(readyState, {
      type: 'TRANSITION_START',
      operation: 'delete',
      projectId: 'proj-4',
    });

    const deleted = reduceEditorSessionState(deleting, {
      type: 'TRANSITION_SUCCESS',
      operation: 'delete',
      projectId: 'proj-4',
    });

    expect(deleted.phase).toBe('ready');
    expect(deleted.activeProjectId).toBeNull();
    expect(deleted.projectSnapshot).toBeNull();
  });
});
