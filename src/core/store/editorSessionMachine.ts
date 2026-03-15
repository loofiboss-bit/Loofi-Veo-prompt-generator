import type { EditorProjectDocument } from './editorSessionAdapters';

export type EditorSessionOperation = 'create' | 'load' | 'save' | 'delete';
export type EditorSessionPhase =
  | 'idle'
  | 'hydrating'
  | 'ready'
  | 'creating'
  | 'loading'
  | 'saving'
  | 'deleting'
  | 'error';

export interface EditorSessionMachineState {
  phase: EditorSessionPhase;
  activeProjectId: string | null;
  projectSnapshot: EditorProjectDocument | null;
  lastOperation: EditorSessionOperation | null;
  error: string | null;
  transitionVersion: number;
}

export const initialEditorSessionMachineState: EditorSessionMachineState = {
  phase: 'idle',
  activeProjectId: null,
  projectSnapshot: null,
  lastOperation: null,
  error: null,
  transitionVersion: 0,
};

export type EditorSessionMachineEvent =
  | { type: 'HYDRATE_REQUEST' }
  | { type: 'HYDRATE_SUCCESS'; project: EditorProjectDocument | null }
  | {
      type: 'TRANSITION_START';
      operation: EditorSessionOperation;
      projectId?: string | null;
    }
  | {
      type: 'TRANSITION_SUCCESS';
      operation: EditorSessionOperation;
      project?: EditorProjectDocument | null;
      projectId?: string | null;
    }
  | {
      type: 'TRANSITION_FAILURE';
      operation: EditorSessionOperation;
      error: string;
      projectId?: string | null;
    };

const phaseByOperation: Record<EditorSessionOperation, EditorSessionPhase> = {
  create: 'creating',
  load: 'loading',
  save: 'saving',
  delete: 'deleting',
};

export function reduceEditorSessionState(
  state: EditorSessionMachineState,
  event: EditorSessionMachineEvent,
): EditorSessionMachineState {
  switch (event.type) {
    case 'HYDRATE_REQUEST':
      return {
        ...state,
        phase: 'hydrating',
        error: null,
      };

    case 'HYDRATE_SUCCESS':
      return {
        ...state,
        phase: 'ready',
        activeProjectId: event.project?.id ?? null,
        projectSnapshot: event.project,
        error: null,
        transitionVersion: state.transitionVersion + 1,
      };

    case 'TRANSITION_START':
      return {
        ...state,
        phase: phaseByOperation[event.operation],
        lastOperation: event.operation,
        error: null,
        activeProjectId:
          event.operation === 'delete'
            ? state.activeProjectId
            : (event.projectId ?? state.activeProjectId),
      };

    case 'TRANSITION_SUCCESS': {
      if (event.operation === 'delete') {
        const deletedProjectId = event.projectId ?? state.activeProjectId;
        const shouldClearActiveProject = deletedProjectId === state.activeProjectId;

        return {
          ...state,
          phase: 'ready',
          activeProjectId: shouldClearActiveProject ? null : state.activeProjectId,
          projectSnapshot: shouldClearActiveProject ? null : state.projectSnapshot,
          error: null,
          transitionVersion: state.transitionVersion + 1,
        };
      }

      const nextProject = event.project ?? state.projectSnapshot;

      return {
        ...state,
        phase: 'ready',
        activeProjectId: nextProject?.id ?? event.projectId ?? state.activeProjectId,
        projectSnapshot: nextProject,
        error: null,
        transitionVersion: state.transitionVersion + 1,
      };
    }

    case 'TRANSITION_FAILURE':
      return {
        ...state,
        phase: 'error',
        lastOperation: event.operation,
        activeProjectId: event.projectId ?? state.activeProjectId,
        error: event.error,
      };

    default:
      return state;
  }
}
