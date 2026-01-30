

import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { Project, ProjectMetadata, PromptState, CharacterProfile, VisualDNA, StoryboardState, GlobalStyle } from '../types';
import { useProjectManager } from '../hooks/useProjectManager';
import { useLocationStore } from '../store/useLocationStore';
import { useAppStore } from '../store/useAppStore'; // Access global assets
import { exportProjectToZip, importProjectFromZip } from '../utils/projectArchiver';
import TextAreaInput from './TextAreaInput';
import RangeInput from './RangeInput';

interface ProjectManagerProps {
    isOpen: boolean;
    onClose: () => void;
    uiStrings: any;
    // Current State for Saving
    currentPromptState: PromptState;
    currentCharacters: CharacterProfile[];
    currentDNAs: VisualDNA[];
    currentStoryboard: StoryboardState;
    // Load Handler
    onLoadProject: (project: Project) => void;
    onResetWorkspace: () => void; // Passed from ModalManager
    onUpdateProjectMeta: (id: string, name: string) => void; // Passed from ModalManager
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    // Update Handler
    onUpdateGlobalStyle?: (style: Partial<GlobalStyle>) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ 
    isOpen, onClose, uiStrings, 
    currentPromptState, currentCharacters, currentDNAs, currentStoryboard,
    onLoadProject, onResetWorkspace, onUpdateProjectMeta, addToast, onUpdateGlobalStyle
}) => {
    const t = uiStrings.projectManager;
    const { projectList, createProject, saveProject, loadProject, deleteProject, exportProject: exportJson } = useProjectManager();
    const { locations } = useLocationStore();
    const { assets, addAsset } = useAppStore(); // Access global assets
    
    const [projectName, setProjectName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Global Style State (Local mirroring for instant feedback in UI)
    const globalStyle = currentPromptState.globalStyle || { description: '', strength: 100, isLocked: false };

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
        createProject(projectName, currentPromptState, currentCharacters, locations, currentDNAs, currentStoryboard);
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

    // Full Archive Export (Zip)
    const handleBackup = async (meta: ProjectMetadata) => {
        setIsProcessing(true);
        try {
            const project = loadProject(meta.id);
            if (!project) throw new Error("Project data not found");

            // Filter assets used in this project is complex, for now we export ALL global assets
            // to ensure nothing is missing. A smarter implementation would filter by usage.
            const blob = await exportProjectToZip(project, assets);
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.veo`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            addToast("Project archived successfully!", 'success');
        } catch (e) {
            console.error(e);
            addToast("Failed to archive project.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Restore from Zip
    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const { project, assets: restoredAssets } = await importProjectFromZip(file);
            
            // 1. Save Project to LocalStorage
            // We create a new project entry to avoid ID collisions with existing
            const newName = `${project.name} (Restored)`;
            // We re-use createProject to handle the ID generation and meta list update
            createProject(
                newName, 
                project.promptState, 
                project.characterBank, 
                project.locationBank, 
                project.visualDNA, 
                project.storyboard
            );

            // 2. Merge Assets into Store (avoid duplicates by ID)
            let addedCount = 0;
            restoredAssets.forEach(asset => {
                if (!assets.some(existing => existing.id === asset.id)) {
                    addAsset(asset);
                    addedCount++;
                }
            });

            addToast(`Restored "${newName}" with ${addedCount} assets.`, 'success');
            
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (error) {
            console.error(error);
            addToast("Failed to restore project. Invalid file format.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStyleUpdate = (updates: Partial<GlobalStyle>) => {
        if (onUpdateGlobalStyle) {
            onUpdateGlobalStyle(updates);
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
                    <div className="flex gap-2">
                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleRestoreFile} 
                            accept=".veo,.zip" 
                            className="hidden" 
                        />
                        <button 
                            onClick={handleRestoreClick}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 rounded-lg transition-colors"
                            title="Import .veo file"
                        >
                            <Icon name="upload" className="w-3.5 h-3.5" />
                            Import Backup
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                            <Icon name="cancel" className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <div className="flex-grow p-6 overflow-y-auto">
                    
                    {/* Project Look Card */}
                    <div className="mb-6 p-6 bg-indigo-900/20 rounded-xl border border-indigo-500/30 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                             <Icon name="palette" className="w-24 h-24 text-indigo-400" />
                        </div>
                        
                        <div className="flex justify-between items-center mb-4 relative z-10">
                            <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                                <Icon name="magic" className="w-4 h-4" />
                                Project Look (Global Style)
                            </h3>
                            <button
                                onClick={() => handleStyleUpdate({ isLocked: !globalStyle.isLocked })}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                    globalStyle.isLocked 
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-indigo-300'
                                }`}
                            >
                                <Icon name={globalStyle.isLocked ? "lock" : "unlock"} className="w-3 h-3" />
                                {globalStyle.isLocked ? "Look Locked" : "Lock Look"}
                            </button>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <TextAreaInput 
                                label="Global Style Description"
                                name="globalStyleDesc"
                                value={globalStyle.description}
                                onChange={(e) => handleStyleUpdate({ description: e.target.value })}
                                placeholder="e.g. Wes Anderson aesthetic, symmetrical composition, pastel colors, soft lighting..."
                                rows={2}
                                disabled={!onUpdateGlobalStyle}
                                info="This description will be enforced across all generated clips in this project."
                            />
                            
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-indigo-500/20">
                                <RangeInput 
                                    label="Enforcement Strength"
                                    name="styleStrength"
                                    value={globalStyle.strength}
                                    onChange={(e) => handleStyleUpdate({ strength: parseInt(e.target.value) })}
                                    min={0}
                                    max={100}
                                    disabled={!onUpdateGlobalStyle}
                                />
                            </div>
                        </div>
                    </div>

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
                                                    onClick={() => handleBackup(meta)}
                                                    className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
                                                    title="Archive Project (.veo)"
                                                    disabled={isProcessing}
                                                >
                                                    {isProcessing ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name="download" className="w-4 h-4" />}
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
