import { useState, useEffect } from 'react';
import {
  Project,
  ProjectMetadata,
  PromptState,
  CharacterProfile,
  VisualDNA,
  StoryboardState,
  LocationProfile,
} from '@core/types';
import { logger } from '@core/services/loggerService';
import { snapshotComposerState } from '@core/store/editorSessionAdapters';

const META_KEY = 'veo_projects_meta';
const PROJECT_PREFIX = 'veo_project_';

export const useProjectManager = () => {
  const [projectList, setProjectList] = useState<ProjectMetadata[]>([]);

  useEffect(() => {
    try {
      const meta = localStorage.getItem(META_KEY);
      if (meta) {
        setProjectList(JSON.parse(meta));
      }
    } catch (e) {
      logger.error('Failed to load project metadata', e);
    }
  }, []);

  const updateMeta = (newMeta: ProjectMetadata[]) => {
    setProjectList(newMeta);
    localStorage.setItem(META_KEY, JSON.stringify(newMeta));
  };

  const createProject = (
    name: string,
    promptState: PromptState,
    characters: CharacterProfile[],
    locations: LocationProfile[],
    dnas: VisualDNA[],
    storyboard: StoryboardState,
  ): Project => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const newProject: Project = {
      id,
      name,
      lastModified: Date.now(),
      promptState,
      characterBank: characters,
      locationBank: locations,
      visualDNA: dnas,
      storyboard,
      composer: snapshotComposerState(),
    };

    try {
      localStorage.setItem(`${PROJECT_PREFIX}${id}`, JSON.stringify(newProject));
      const newMeta = [{ id, name, lastModified: newProject.lastModified }, ...projectList];
      updateMeta(newMeta);
      return newProject;
    } catch (e) {
      logger.error('Storage full or error', e);
      throw new Error('Failed to save project. Storage might be full.');
    }
  };

  const saveProject = (
    id: string,
    name: string,
    promptState: PromptState,
    characters: CharacterProfile[],
    locations: LocationProfile[],
    dnas: VisualDNA[],
    storyboard: StoryboardState,
  ) => {
    const updatedProject: Project = {
      id,
      name,
      lastModified: Date.now(),
      promptState,
      characterBank: characters,
      locationBank: locations,
      visualDNA: dnas,
      storyboard,
      composer: snapshotComposerState(),
    };

    try {
      localStorage.setItem(`${PROJECT_PREFIX}${id}`, JSON.stringify(updatedProject));

      // Update metadata list (move to top)
      const otherMeta = projectList.filter((p) => p.id !== id);
      const newMeta = [{ id, name, lastModified: updatedProject.lastModified }, ...otherMeta];
      updateMeta(newMeta);
    } catch (e) {
      logger.error('Storage full or error', e);
      throw new Error('Failed to update project.');
    }
  };

  const loadProject = (id: string): Project | null => {
    try {
      const data = localStorage.getItem(`${PROJECT_PREFIX}${id}`);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      logger.error('Failed to load project data', e);
    }
    return null;
  };

  const deleteProject = (id: string) => {
    try {
      localStorage.removeItem(`${PROJECT_PREFIX}${id}`);
      const newMeta = projectList.filter((p) => p.id !== id);
      updateMeta(newMeta);
    } catch (e) {
      logger.error('Failed to delete project', e);
    }
  };

  const exportProject = (meta: ProjectMetadata) => {
    try {
      const data = localStorage.getItem(`${PROJECT_PREFIX}${meta.id}`);
      if (data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${meta.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      logger.error('Failed to export project', e);
    }
  };

  return {
    projectList,
    createProject,
    saveProject,
    loadProject,
    deleteProject,
    exportProject,
  };
};
