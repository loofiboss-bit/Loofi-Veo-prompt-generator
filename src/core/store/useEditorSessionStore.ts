import { create } from 'zustand';
import { logger } from '@core/services/loggerService';

import {
  type EditorSessionMachineEvent,
  type EditorSessionMachineState,
  type EditorSessionOperation,
  initialEditorSessionMachineState,
  reduceEditorSessionState,
} from './editorSessionMachine';
import {
  applyProjectDocumentToStores,
  captureProjectDocumentFromStores,
  type EditorProjectDocument,
} from './editorSessionAdapters';

interface EditorSessionStore extends EditorSessionMachineState {
  dispatch: (event: EditorSessionMachineEvent) => void;
  hydrateFromCurrentStores: (projectMeta: { id: string; name: string } | null) => void;
  captureCurrentProjectDocument: (projectMeta: {
    id: string;
    name: string;
  }) => EditorProjectDocument;
  commitProjectDocument: (
    project: EditorProjectDocument,
    operation: Exclude<EditorSessionOperation, 'delete'>,
  ) => void;
  clearProjectDocument: (projectId: string) => void;
  failTransition: (
    operation: EditorSessionOperation,
    error: unknown,
    projectId?: string | null,
  ) => void;
}

export const useEditorSessionStore = create<EditorSessionStore>((set, get) => ({
  ...initialEditorSessionMachineState,

  dispatch: (event) => set((state) => reduceEditorSessionState(state, event)),

  hydrateFromCurrentStores: (projectMeta) => {
    get().dispatch({ type: 'HYDRATE_REQUEST' });

    if (!projectMeta) {
      get().dispatch({ type: 'HYDRATE_SUCCESS', project: null });
      return;
    }

    try {
      const project = captureProjectDocumentFromStores(projectMeta);
      get().dispatch({ type: 'HYDRATE_SUCCESS', project });
    } catch (error) {
      get().failTransition('load', error, projectMeta.id);
    }
  },

  captureCurrentProjectDocument: (projectMeta) => captureProjectDocumentFromStores(projectMeta),

  commitProjectDocument: (project, operation) => {
    get().dispatch({
      type: 'TRANSITION_START',
      operation,
      projectId: project.id,
    });

    try {
      if (operation === 'load') {
        applyProjectDocumentToStores(project);
      }

      get().dispatch({
        type: 'TRANSITION_SUCCESS',
        operation,
        project,
        projectId: project.id,
      });
    } catch (error) {
      get().failTransition(operation, error, project.id);
    }
  },

  clearProjectDocument: (projectId) => {
    get().dispatch({
      type: 'TRANSITION_START',
      operation: 'delete',
      projectId,
    });

    get().dispatch({
      type: 'TRANSITION_SUCCESS',
      operation: 'delete',
      projectId,
    });
  },

  failTransition: (operation, error, projectId) => {
    const message = error instanceof Error ? error.message : 'Unknown editor session error';
    logger.error('Editor session transition failed', undefined, {
      operation,
      projectId,
      message,
      cause: error,
    });

    get().dispatch({
      type: 'TRANSITION_FAILURE',
      operation,
      error: message,
      projectId,
    });
  },
}));
