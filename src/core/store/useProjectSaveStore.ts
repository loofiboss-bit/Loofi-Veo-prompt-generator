import { create } from 'zustand';
import type { Project } from '@core/types';

export interface ProjectSaveState {
  status: 'unsaved' | 'saving' | 'saved' | 'error' | 'conflict';
  error?: string;
  backupError?: string;
  remoteRevision?: number;
  conflictDocument?: Project;
}
interface ProjectSaveStore {
  projects: Record<string, ProjectSaveState>;
  setStatus: (id: string, status: ProjectSaveState) => void;
  markDirty: (id: string) => void;
  notifyRemoteChange: (id: string, revision: number) => void;
}
export const useProjectSaveStore = create<ProjectSaveStore>((set) => ({
  projects: {},
  setStatus: (id, status) => set((state) => ({ projects: { ...state.projects, [id]: status } })),
  markDirty: (id) =>
    set((state) => {
      const previous = state.projects[id];
      if (previous?.status === 'conflict' || previous?.status === 'error') return state;
      return { projects: { ...state.projects, [id]: { ...previous, status: 'unsaved' } } };
    }),
  notifyRemoteChange: (id, revision) =>
    set((state) =>
      state.projects[id]?.remoteRevision !== undefined &&
      state.projects[id].remoteRevision! >= revision
        ? state
        : {
            projects: {
              ...state.projects,
              [id]: {
                ...state.projects[id],
                status: state.projects[id]?.status ?? 'unsaved',
                remoteRevision: revision,
              },
            },
          },
    ),
}));
