import { useEffect, useState } from 'react';
import { logger } from '@core/services/loggerService';
import { PROJECT_SAVED_EVENT } from '@core/services/projectDocumentService';
import { useProjectSaveStore } from '@core/store/useProjectSaveStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useAppStore } from '@core/store/useAppStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';

/** Broadcast identities and revisions only; another window never overwrites local work. */
export const useAppSync = () => {
  const [isConnected, setIsConnected] = useState(false);
  useEffect(() => {
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel('veo-prompt-sync');
      setIsConnected(true);
      channel.onmessage = (event: MessageEvent<unknown>) => {
        const data = event.data as { type?: string; projectId?: string; revision?: number } | null;
        if (
          data?.type !== 'PROJECT_CHANGED' ||
          typeof data.projectId !== 'string' ||
          !Number.isSafeInteger(data.revision) ||
          data.revision! < 0
        )
          return;
        const current = useEditorSessionStore.getState().projectSnapshot;
        if (current?.id === data.projectId && (current.documentRevision ?? 0) >= data.revision!)
          return;
        useProjectSaveStore.getState().notifyRemoteChange(data.projectId, data.revision!);
      };
    } catch (error) {
      logger.warn('BroadcastChannel setup failed', error);
    }
    const saved = (event: Event) => {
      const { projectId, revision } = (
        event as CustomEvent<{ projectId: string; revision: number }>
      ).detail;
      const session = useEditorSessionStore.getState();
      if (session.projectSnapshot?.id === projectId) {
        useEditorSessionStore.setState({
          projectSnapshot: { ...session.projectSnapshot, documentRevision: revision },
        });
      }
      channel?.postMessage({ type: 'PROJECT_CHANGED', projectId, revision });
    };
    window.addEventListener(PROJECT_SAVED_EVENT, saved);
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (
        state.promptState !== previous.promptState ||
        state.clips !== previous.clips ||
        state.tracks !== previous.tracks ||
        state.sbShots !== previous.sbShots ||
        state.sbGlobalContext !== previous.sbGlobalContext ||
        state.characterBank !== previous.characterBank ||
        state.visualDNA !== previous.visualDNA ||
        state.productionBible !== previous.productionBible
      ) {
        const id = useProjectStore.getState().currentProjectId;
        if (id) useProjectSaveStore.getState().markDirty(id);
      }
    });
    return () => {
      unsubscribe();
      window.removeEventListener(PROJECT_SAVED_EVENT, saved);
      channel?.close();
    };
  }, []);
  return isConnected;
};
