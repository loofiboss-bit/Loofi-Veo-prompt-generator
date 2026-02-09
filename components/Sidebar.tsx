/**
 * Sidebar Component
 * Collapsible navigation sidebar for v1.3.0
 * v1.3.0 - Workflow Integration
 */

import React, { useState } from 'react';
import Icon from './Icon';
import { useProjectStore } from '../store/useProjectStore';
import { useHistoryStore } from '../store/useHistoryStore';

interface SidebarProps {
    onNavigate: (section: string) => void;
    activeSection?: string;
    onOpenProject: () => void;
    onOpenHistory: () => void;
    onOpenTemplates: () => void;
    onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    onNavigate,
    activeSection,
    onOpenProject,
    onOpenHistory,
    onOpenTemplates,
    onOpenSettings,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { currentProjectId, projects } = useProjectStore();
    const { stats } = useHistoryStore();

    const currentProject = projects.find((p) => p.id === currentProjectId);

    const navItems = [
        {
            id: 'prompt',
            label: 'Prompt Builder',
            icon: 'edit',
            onClick: () => onNavigate('prompt'),
        },
        {
            id: 'history',
            label: 'History',
            icon: 'history',
            onClick: onOpenHistory,
            badge: stats?.totalEntries || 0,
        },
        {
            id: 'projects',
            label: 'Projects',
            icon: 'folder',
            onClick: onOpenProject,
            badge: projects.length,
        },
        {
            id: 'templates',
            label: 'Templates',
            icon: 'template',
            onClick: onOpenTemplates,
        },
        {
            id: 'storyboard',
            label: 'Storyboard',
            icon: 'film',
            onClick: () => onNavigate('storyboard'),
        },
        {
            id: 'timeline',
            label: 'Timeline',
            icon: 'timeline',
            onClick: () => onNavigate('timeline'),
        },
    ];

    const bottomItems = [
        {
            id: 'settings',
            label: 'Settings',
            icon: 'settings',
            onClick: onOpenSettings,
        },
    ];

    return (
        <aside
            className={`fixed left-0 top-0 h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 transition-all duration-300 z-40 flex flex-col ${isCollapsed ? 'w-16' : 'w-64'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <Icon name="video" className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-slate-100">Veo Studio</span>
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <Icon name={isCollapsed ? 'menu' : 'cancel'} className="w-5 h-5" />
                </button>
            </div>

            {/* Current Project */}
            {!isCollapsed && currentProject && (
                <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
                    <div className="text-xs text-slate-500 mb-1">Current Project</div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                        <span className="text-sm font-semibold text-slate-200 truncate">
                            {currentProject.name}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {stats?.totalEntries || 0} prompts
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={item.onClick}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeSection === item.id
                                    ? 'bg-cyan-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <Icon name={item.icon as any} className="w-5 h-5 flex-shrink-0" />
                            {!isCollapsed && (
                                <>
                                    <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className="px-2 py-0.5 bg-slate-700 text-xs font-bold rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Bottom Items */}
            <div className="p-2 border-t border-slate-700/50">
                {bottomItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={item.onClick}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                        title={isCollapsed ? item.label : undefined}
                    >
                        <Icon name={item.icon as any} className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="flex-1 text-left text-sm font-medium">{item.label}</span>}
                    </button>
                ))}
            </div>

            {/* Collapse Indicator */}
            {isCollapsed && (
                <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2">
                    <div className="w-6 h-12 bg-slate-800 border border-slate-700 rounded-r-lg flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors"
                        onClick={() => setIsCollapsed(false)}
                    >
                        <Icon name="arrow-right" className="w-3 h-3 text-slate-400" />
                    </div>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
