import { useEffect } from 'react';
import { useAppStore } from '@core/store/useAppStore';
import { useComposerStore } from '@core/store/useComposerStore';
import { useLocationStore } from '@core/store/useLocationStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { useProjectSaveStore } from '@core/store/useProjectSaveStore';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { projectService } from '@core/services/projectService';
import { logger } from '@core/services/loggerService';

/** Debounced canonical snapshots. Conflicts stop autosave until explicit recovery. */
export function useProjectAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let inFlight = false;
    const persist = async (id: string) => {
      if (stopped || useProjectStore.getState().currentProjectId !== id) return;
      // Loading a document updates stores before the session marks it saved. A
      // pending timer must never write that clean load and invalidate another window.
      if (useProjectSaveStore.getState().projects[id]?.status !== 'unsaved') return;
      if (inFlight) {
        schedule();
        return;
      }
      const session = useEditorSessionStore.getState();
      const project = useProjectStore.getState().projects.find((candidate) => candidate.id === id);
      if (!project || session.projectSnapshot?.id !== id) return;
      const status = useProjectSaveStore.getState().projects[id];
      if (status?.status === 'conflict' || status?.status === 'error') return;
      inFlight = true;
      try {
        const document = session.captureCurrentProjectDocument(project);
        await projectDocumentService.save(document);
        await projectService.registerDocument(document);
        // Only advance the persistence baseline, never reapply a document over live edits.
        const current = useEditorSessionStore.getState().projectSnapshot;
        if (current?.id === id)
          useEditorSessionStore.setState({
            projectSnapshot: { ...current, documentRevision: document.documentRevision },
          });
        if (useProjectSaveStore.getState().projects[id]?.status === 'unsaved') schedule();
      } catch (error) {
        logger.warn('Project autosave paused', error);
      } finally {
        inFlight = false;
      }
    };
    const schedule = () => {
      const id = useProjectStore.getState().currentProjectId;
      if (!id || useEditorSessionStore.getState().projectSnapshot?.id !== id) return;
      useProjectSaveStore.getState().markDirty(id);
      clearTimeout(timer);
      timer = setTimeout(() => void persist(id), 700);
    };
    const unsubscribeApp = useAppStore.subscribe((state, previous) => {
      if (
        state.promptState !== previous.promptState ||
        state.clips !== previous.clips ||
        state.tracks !== previous.tracks ||
        state.sbShots !== previous.sbShots ||
        state.sbGlobalContext !== previous.sbGlobalContext ||
        state.characterBank !== previous.characterBank ||
        state.visualDNA !== previous.visualDNA ||
        state.productionBible !== previous.productionBible
      )
        schedule();
    });
    const unsubscribeComposer = useComposerStore.subscribe((state, previous) => {
      if (
        state.blocks !== previous.blocks ||
        state.connections !== previous.connections ||
        state.snapshots !== previous.snapshots ||
        state.timelineLinks !== previous.timelineLinks
      )
        schedule();
    });
    const unsubscribeLocation = useLocationStore.subscribe((state, previous) => {
      if (state.locations !== previous.locations) schedule();
    });
    const unsubscribeSession = useEditorSessionStore.subscribe((state, previous) => {
      if (
        state.transitionVersion === previous.transitionVersion &&
        state.phase === previous.phase &&
        state.projectSnapshot?.id === previous.projectSnapshot?.id &&
        state.projectSnapshot?.creatorDelivery !== previous.projectSnapshot?.creatorDelivery
      )
        schedule();
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const id = useProjectStore.getState().currentProjectId;
      const status = id ? useProjectSaveStore.getState().projects[id]?.status : undefined;
      if (status && status !== 'saved') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      stopped = true;
      clearTimeout(timer);
      unsubscribeApp();
      unsubscribeComposer();
      unsubscribeLocation();
      unsubscribeSession();
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);
}
