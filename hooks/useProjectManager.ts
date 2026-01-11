
import { useState, useEffect } from 'react';
import { Project, PromptState, CharacterProfile, VisualDNA, StoryboardState } from '../types';

const PROJECTS_KEY = 'veo-projects';

export const useProjectManager = () => {
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(PROJECTS_KEY);
            if (saved) {
                setProjects(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load projects", e);
        }
    }, []);

    const saveProject = (
        name: string, 
        promptState: PromptState, 
        characters: CharacterProfile[], 
        dnas: VisualDNA[], 
        storyboard: StoryboardState
    ) => {
        const newProject: Project = {
            id: Date.now().toString(),
            name,
            lastModified: Date.now(),
            promptState,
            characterBank: characters,
            visualDNA: dnas,
            storyboard
        };

        // Check if updating existing project (by name match for simplicity, or we could pass ID)
        const existingIndex = projects.findIndex(p => p.name === name);
        let updatedProjects;
        
        if (existingIndex >= 0) {
            // Update
            updatedProjects = [...projects];
            updatedProjects[existingIndex] = { ...newProject, id: projects[existingIndex].id }; // Keep ID
        } else {
            // Create
            updatedProjects = [newProject, ...projects];
        }

        setProjects(updatedProjects);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
    };

    const deleteProject = (id: string) => {
        const updatedProjects = projects.filter(p => p.id !== id);
        setProjects(updatedProjects);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
    };

    const loadProject = (id: string): Project | undefined => {
        return projects.find(p => p.id === id);
    };

    const exportProject = (project: Project) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${project.name.replace(/\s+/g, '-')}.veo.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return {
        projects,
        saveProject,
        deleteProject,
        loadProject,
        exportProject
    };
};
