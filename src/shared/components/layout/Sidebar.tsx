/**
 * Sidebar Component
 * Collapsible navigation sidebar for v1.3.0
 * v1.3.0 - Workflow Integration
 */

import React, { memo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/ui/Icon';
import { useProjectStore } from '@core/store/useProjectStore';
import { useGenerationQueueStore } from '@core/store/useGenerationQueueStore';
import { IconName } from '@core/types';
import { WorkspaceSwitcher } from '@features/workspace/WorkspaceSwitcher';
import { useViewport } from '@shared/hooks/useViewport';
import { useSettingsStore } from '@core/store/useSettingsStore';

interface SidebarProps {
  onNavigate: (section: string) => void;
  activeSection?: string;
  onOpenProject: () => void;
  onOpenHistory: () => void;
  onOpenTemplates: () => void;
  onOpenPlugins: () => void;
  onOpenSettings: () => void;
  onOpenAssets?: () => void;
  onOpenActivity?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenBatchGenerator?: () => void;
  onOpenJobsPanel?: () => void;
  onOpenWorkspaceManager?: () => void;
  onOpenQueue?: () => void;
  onOpenHelpPanel?: () => void;
  onOpenOptimize?: () => void;
  onOpenDirector?: () => void;
  onOpenCollaborate?: () => void;
  onOpenComments?: () => void;
  onOpenRoles?: () => void;
  diagnosticIssueCount?: number;
  pendingJobCount?: number;
  isApiConfigured?: boolean;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  badge?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  onNavigate,
  activeSection,
  onOpenProject,
  onOpenSettings,
  onOpenAssets,
  onOpenActivity,
  onOpenWorkspaceManager,
  onOpenDirector,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userOverride, setUserOverride] = useState(false);
  const { isCompact } = useViewport();
  const { t } = useTranslation('common');
  const { currentProjectId, projects } = useProjectStore();
  const queueActiveCount = useGenerationQueueStore((s) => s.activeCount);
  const queuePendingCount = useGenerationQueueStore((s) => s.pendingCount);
  const { focusMode, updateSettings } = useSettingsStore();
  const handleToggleFocusMode = () => updateSettings({ focusMode: !focusMode });

  // Auto-collapse on compact viewports unless user manually expanded
  useEffect(() => {
    if (!userOverride) {
      setIsCollapsed(isCompact);
    }
  }, [isCompact, userOverride]);

  // Reset override when viewport changes category
  useEffect(() => {
    setUserOverride(false);
  }, [isCompact]);

  const handleToggleCollapse = () => {
    setUserOverride(true);
    setIsCollapsed((prev) => !prev);
  };

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const navItems: SidebarItem[] = [
    {
      id: 'studio',
      label: t('sidebar.promptStudio', 'Prompt Studio'),
      icon: 'sparkles',
      onClick: () => onNavigate('studio'),
    },
    {
      id: 'create',
      label: t('sidebar.production', 'Production'),
      icon: 'video',
      onClick: () => onOpenDirector?.(),
    },
    {
      id: 'projects',
      label: t('sidebar.projects'),
      icon: 'folder',
      onClick: onOpenProject,
      badge: projects.length,
    },
    {
      id: 'assets',
      label: t('sidebar.assets', 'Assets'),
      icon: 'image',
      onClick: () => onOpenAssets?.(),
    },
    {
      id: 'timeline',
      label: t('sidebar.timeline'),
      icon: 'timeline',
      onClick: () => onNavigate('timeline'),
    },
    {
      id: 'activity',
      label: t('sidebar.activity', 'Activity'),
      icon: 'clock',
      onClick: () => onOpenActivity?.(),
      badge: queueActiveCount + queuePendingCount || undefined,
    },
    {
      id: 'settings',
      label: t('sidebar.settings'),
      icon: 'settings',
      onClick: onOpenSettings,
    },
  ];

  return (
    <aside
      className="fixed start-0 top-0 h-full bg-slate-950/85 backdrop-blur-xl border-e border-slate-800/60 shadow-2xl transition-all duration-300 z-40 flex flex-col"
      style={{ width: isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/60">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 shadow-md shadow-blue-500/25 border border-white/10 flex items-center justify-center">
              <Icon name="video" className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-slate-100 tracking-tight text-sm">
              Loofi Creator Studio
            </span>
          </div>
        )}
        <button
          onClick={handleToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700/50 transition-all"
          title={isCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
        >
          <Icon name={isCollapsed ? 'menu' : 'cancel'} className="w-5 h-5" />
        </button>
      </div>

      {/* Workspace Switcher */}
      <WorkspaceSwitcher
        isCollapsed={isCollapsed}
        onOpenManager={() => onOpenWorkspaceManager?.()}
      />

      {/* Current Project */}
      {!isCollapsed && currentProject && (
        <div
          className="mx-2.5 my-2 p-3 rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm shadow-sm"
          style={{ background: 'var(--color-bg-secondary)' }}
        >
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
            {t('sidebar.currentProject')}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2 items-center justify-center flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </div>
            <span className="text-sm font-semibold text-slate-200 truncate">
              {currentProject.name}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t('sidebar.localProject', 'Local project')}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2" data-tour-id="app-sidebar-nav">
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`relative group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                activeSection === item.id
                  ? 'bg-gradient-to-r from-blue-600/20 via-indigo-600/15 to-transparent text-blue-100 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.12)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/40'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              {activeSection === item.id && (
                <span
                  className="absolute start-0 top-2 bottom-2 w-1 rounded-e-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                  aria-hidden="true"
                />
              )}
              <Icon
                name={item.icon as IconName}
                className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105 ${activeSection === item.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold rounded-full">
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
      <div
        className="p-2 border-t border-slate-800/60"
        style={{ background: 'var(--color-bg-secondary)' }}
      >
        <button
          type="button"
          onClick={handleToggleFocusMode}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1 ${
            focusMode
              ? 'bg-blue-600/25 text-blue-200 border border-blue-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
          }`}
          title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode — hide advanced panels'}
        >
          <Icon
            name="zap"
            className={`w-5 h-5 flex-shrink-0 ${focusMode ? 'text-blue-400' : 'text-slate-400'}`}
          />
          {!isCollapsed && (
            <span className="flex-1 text-left text-sm font-medium">
              {focusMode ? 'Exit Focus' : 'Focus Mode'}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

const MemoizedSidebar = memo(Sidebar);
export { MemoizedSidebar as Sidebar };
