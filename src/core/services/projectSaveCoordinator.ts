import {
  ProjectConflictError,
  projectDocumentService,
} from '@core/services/projectDocumentService';
import { projectService } from '@core/services/projectService';
import { logger } from '@core/services/loggerService';
import { useAppStore, persistAppStoreNow } from '@core/store/useAppStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { useProjectSaveStore } from '@core/store/useProjectSaveStore';
import { idbStorage } from '@core/utils/storage';

const APP_STATE_STORAGE_KEY = 'veo-prompt-state-v6';
const MAX_STABLE_SAVE_ATTEMPTS = 3;

class ProjectSaveCoordinator {
  private static instance: ProjectSaveCoordinator;
  private saves = new Map<string, Promise<void>>();

  static getInstance(): ProjectSaveCoordinator {
    if (!ProjectSaveCoordinator.instance) {
      ProjectSaveCoordinator.instance = new ProjectSaveCoordinator();
    }
    return ProjectSaveCoordinator.instance;
  }

  async saveProject(projectId: string): Promise<void> {
    const inFlight = this.saves.get(projectId);
    if (inFlight) {
      await inFlight;
      if (useProjectSaveStore.getState().projects[projectId]?.status === 'unsaved')
        return this.saveProject(projectId);
      return;
    }

    const status = useProjectSaveStore.getState().projects[projectId];
    if (status?.status === 'conflict')
      throw new Error(status.error ?? 'Resolve the project conflict before saving.');
    const pending = this.saveUntilStable(projectId);
    this.saves.set(projectId, pending);
    try {
      await pending;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const existing = useProjectSaveStore.getState().projects[projectId];
      if (existing?.status !== 'conflict' || error instanceof ProjectConflictError) {
        useProjectSaveStore.getState().setStatus(projectId, {
          status: error instanceof ProjectConflictError ? 'conflict' : 'error',
          error: message,
          conflictDocument:
            error instanceof ProjectConflictError
              ? structuredClone(error.localDocument)
              : undefined,
        });
      }
      logger.error('Project save coordinator failed', 'ProjectSaveCoordinator', error);
      throw error;
    } finally {
      if (this.saves.get(projectId) === pending) this.saves.delete(projectId);
    }
  }

  /** Rename the active editor through the same ordered save as its other edits. */
  async renameProject(projectId: string, name: string): Promise<void> {
    const session = useEditorSessionStore.getState();
    if (session.projectSnapshot?.id !== projectId)
      throw new Error('The active project changed before it could be renamed.');
    const status = useProjectSaveStore.getState().projects[projectId];
    if (status?.status === 'conflict')
      throw new Error(status.error ?? 'Resolve the project conflict before saving.');
    useEditorSessionStore.setState((state) => ({
      projectSnapshot: state.projectSnapshot
        ? { ...state.projectSnapshot, name }
        : state.projectSnapshot,
    }));
    useProjectSaveStore.getState().markDirty(projectId);
    await this.saveProject(projectId);
  }

  /** Persist the active editor before any operation changes the project identity. */
  async flushBeforeProjectChange(projectId: string | null): Promise<void> {
    if (!projectId) return;
    const session = useEditorSessionStore.getState();
    if (session.projectSnapshot?.id !== projectId) return;
    if (useProjectSaveStore.getState().projects[projectId]?.status === 'saved') return;
    await this.saveProject(projectId);
    await idbStorage.flush(APP_STATE_STORAGE_KEY);
  }

  private async saveUntilStable(projectId: string): Promise<void> {
    for (let attempt = 0; attempt < MAX_STABLE_SAVE_ATTEMPTS; attempt += 1) {
      const session = useEditorSessionStore.getState();
      const baseDocument = session.projectSnapshot;
      if (!baseDocument || baseDocument.id !== projectId)
        throw new Error('The active project changed before its edits could be saved.');

      await persistAppStoreNow();
      const postPersistSession = useEditorSessionStore.getState();
      const currentDocument = postPersistSession.projectSnapshot;
      if (!currentDocument || currentDocument.id !== projectId)
        throw new Error('The project changed while its media catalog was being saved.');
      const mutationVersion = useAppStore.getState().mutationVersion;
      const document = postPersistSession.captureCurrentProjectDocument({
        id: projectId,
        name: currentDocument.name,
      });
      const pendingStatus = useProjectSaveStore.getState().projects[projectId];
      if (pendingStatus?.status === 'conflict')
        throw new Error(pendingStatus.error ?? 'Resolve the project conflict before saving.');
      useProjectSaveStore.getState().setStatus(projectId, { status: 'saving' });

      const result = await projectDocumentService.save(document, { manageSaveStatus: false });
      if (!result.durable) throw new Error(result.error ?? 'Project storage is not durable.');

      const savedSession = useEditorSessionStore.getState();
      if (savedSession.projectSnapshot?.id === projectId) {
        useEditorSessionStore.setState((state) => ({
          projectSnapshot: state.projectSnapshot
            ? { ...state.projectSnapshot, documentRevision: document.documentRevision }
            : state.projectSnapshot,
        }));
      }
      // The document revision is already durable even if metadata registration
      // fails. Retain it so a retry does not conflict with our own write.
      await projectService.registerDocument(document);

      const currentStatus = useProjectSaveStore.getState().projects[projectId];
      if (currentStatus?.status === 'conflict')
        throw new Error(currentStatus.error ?? 'Resolve the project conflict before saving.');
      const latestSession = useEditorSessionStore.getState();
      if (latestSession.projectSnapshot?.id !== projectId)
        throw new Error('The active project changed while its edits were being saved.');
      const changedDuringSave =
        useAppStore.getState().mutationVersion !== mutationVersion ||
        currentStatus?.status === 'unsaved';
      if (changedDuringSave) {
        useProjectSaveStore.getState().markDirty(projectId);
        continue;
      }

      useProjectSaveStore.getState().setStatus(projectId, {
        status: 'saved',
        backupError: result.backupError,
      });
      return;
    }

    throw new Error(
      'The project changed repeatedly while saving. Wait for editing to stop and retry.',
    );
  }
}

export const projectSaveCoordinator = ProjectSaveCoordinator.getInstance();
