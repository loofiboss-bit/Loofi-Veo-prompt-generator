
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { Project, PromptState, CharacterProfile, VisualDNA, StoryboardState, ProjectMetadata } from '../types';
import { useProjectManager } from '../hooks/useProjectManager';

interface ProjectManagerProps {
    isOpen: boolean;
    onClose: () => void;
    uiStrings: any;
    // Current App State to Save
    currentPromptState: PromptState;
    currentCharacters: CharacterProfile[];
    currentDNAs: VisualDNA[];
    currentStoryboard: StoryboardState;
    // Load Handler
    onLoadProject: (project: Project) => void;
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ 
    isOpen, onClose, uiStrings, 
    currentPromptState, currentCharacters, currentDNAs, currentStoryboard,
    onLoadProject, addToast 
}) => {
    const t = uiStrings.projectManager;
    const { projectList, createProject, loadProject, deleteProject, exportProject } = useProjectManager();
    const [projectName, setProjectName] = useState('');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSave = () => {
        if (!projectName.trim()) {
            addToast("Please enter a project name.", 'error');
            return;
        }
        createProject(projectName, currentPromptState, currentCharacters, currentDNAs, currentStoryboard);
        setProjectName('');
        addToast("Project saved successfully.", 'success');
    };

    const handleLoad = (meta: ProjectMetadata) => {
        if (confirm(t.loadConfirm)) {
            const project = loadProject(meta.id);
            if (project) {
                onLoadProject(project);
                onClose();
                addToast(`Loaded project: ${project.name}`, 'success');
            } else {
                addToast("Failed to load project data.", 'error');
            }
        }
    };

    const handleDelete = (id: string) => {
        if (confirm(t.deleteConfirm)) {
            deleteProject(id);
            addToast("Project deleted.", 'success');
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[90] p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-slate-900/80 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[85vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <Icon name="folder" className="w-6 h-6 text-cyan-400" />
                            {t.title}
                        </h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-grow p-6 overflow-y-auto">
                    {/* Save Section */}
                    <div className="mb-8 p-6 bg-slate-800/40 rounded-xl border border-slate-700/50">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">{t.saveCurrentButton}</h3>
                        <div className="flex gap-3">
                            <input 
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder={t.namePlaceholder}
                                className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                            />
                            <button 
                                onClick={handleSave}
                                disabled={!projectName.trim()}
                                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center gap-2">
                                    <Icon name="save" className="w-4 h-4" />
                                    <span>Save</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* List Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">{t.savedProjectsTitle}</h3>
                        {projectList.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                                <Icon name="folder" className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>{t.empty}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {projectList.map(meta => (
                                    <div key={meta.id} className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-slate-200 text-lg">{meta.name}</h4>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Last modified: {new Date(meta.lastModified).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => exportProject(meta)}
                                                    className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
                                                    title={t.exportButton}
                                                >
                                                    <Icon name="download" className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(meta.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                                                    title={t.deleteButton}
                                                >
                                                    <Icon name="trash" className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleLoad(meta)}
                                            className="w-full py-2 bg-slate-700 hover:bg-cyan-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Icon name="upload" className="w-4 h-4" />
                                            {t.loadButton}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectManager;