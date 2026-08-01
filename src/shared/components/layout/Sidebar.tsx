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
  isApiConfigured = true,
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
      id: 'create',
      label: t('sidebar.create', 'Create'),
      icon: 'sparkles',
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
      className="fixed start-0 top-0 h-full bg-slate-950/90 backdrop-blur-xl border-e border-slate-700/40 transition-all duration-300 z-40 flex flex-col"
      style={{ width: isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Icon name="video" className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-100">Loofi Creator Studio</span>
          </div>
        )}
        <button
          onClick={handleToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
        <div className="p-4 border-b border-slate-700/40 bg-slate-900/35">
          <div className="text-xs text-slate-500 mb-1">{t('sidebar.currentProject')}</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm font-semibold text-slate-200 truncate">
              {currentProject.name}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeSection === item.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon name={item.icon as IconName} className="w-5 h-5 flex-shrink-0" />
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
      <div className="p-2 border-t border-slate-700/40 bg-slate-900/35">
        <button
          type="button"
          onClick={handleToggleFocusMode}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mb-1 ${
            focusMode
              ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode — hide advanced panels'}
        >
          <Icon name="zap" className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <span className="flex-1 text-left text-sm font-medium">
              {focusMode ? 'Exit Focus' : 'Focus Mode'}
            </span>
          )}
        </button>
        {!isApiConfigured && !isCollapsed && (
          <p className="px-3 py-2 text-xs text-amber-300">
            {t('sidebar.providerSetupRequired', 'Provider setup required in Settings')}
          </p>
        )}
      </div>
    </aside>
  );
};

const MemoizedSidebar = memo(Sidebar);
export { MemoizedSidebar as Sidebar };
