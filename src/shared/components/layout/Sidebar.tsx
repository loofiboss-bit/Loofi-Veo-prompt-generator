/**
 * Sidebar Component
 * Collapsible navigation sidebar for v1.3.0
 * v1.3.0 - Workflow Integration
 */

import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/ui/Icon';
import { useProjectStore } from '@core/store/useProjectStore';
import { useGenerationQueueStore } from '@core/store/useGenerationQueueStore';
import { IconName } from '@core/types';
import { WorkspaceSwitcher } from '@features/workspace/WorkspaceSwitcher';
import { NAVIGATION_DESTINATIONS } from '@core/config/navigation';
import { useSettingsStore } from '@core/store/useSettingsStore';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigated?: () => void;
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
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  onNavigated,
  onNavigate,
  activeSection,
  onOpenProject,
  onOpenSettings,
  onOpenAssets,
  onOpenActivity,
  onOpenWorkspaceManager,
  onOpenDirector,
}) => {
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed ?? localCollapsed;
  const { t } = useTranslation('common');
  const { currentProjectId, projects } = useProjectStore();
  const queueActiveCount = useGenerationQueueStore((s) => s.activeCount);
  const queuePendingCount = useGenerationQueueStore((s) => s.pendingCount);
  const { focusMode, updateSettings } = useSettingsStore();
  const handleToggleFocusMode = () => updateSettings({ focusMode: !focusMode });
  const handleToggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setLocalCollapsed((previous) => !previous);
  };

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const navItems: SidebarItem[] = NAVIGATION_DESTINATIONS.map((destination) => ({
    id: destination.id,
    label: t(destination.labelKey, destination.label),
    icon: destination.icon,
    onClick: () => {
      switch (destination.id) {
        case 'projects':
          onOpenProject();
          break;
        case 'assets':
          onOpenAssets?.();
          break;
        case 'activity':
          onOpenActivity?.();
          break;
        case 'settings':
          onOpenSettings();
          break;
        case 'create':
          onOpenDirector?.();
          break;
        default:
          onNavigate(destination.id);
      }
    },
    badge:
      destination.id === 'projects'
        ? projects.length
        : destination.id === 'activity'
          ? queueActiveCount + queuePendingCount || undefined
          : undefined,
  }));
  const renderItem = (item: SidebarItem) => (
    <button
      key={item.id}
      onClick={() => {
        item.onClick();
        onNavigated?.();
      }}
      aria-label={item.label}
      aria-current={activeSection === item.id ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm ${activeSection === item.id ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'}`}
      title={isCollapsed ? item.label : undefined}
    >
      <Icon name={item.icon as IconName} className="w-5 h-5 flex-shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left font-medium">{item.label}</span>
          {!!item.badge && <span className="text-xs">{item.badge}</span>}
        </>
      )}
    </button>
  );

  return (
    <aside
      className="creator-sidebar fixed start-0 top-0 h-full bg-slate-950 border-e border-slate-800/60 z-40 flex flex-col"
      style={{ width: isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/60">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 border border-white/10 flex items-center justify-center">
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
          aria-label={isCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
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
              <span className="hidden" />
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

      <nav
        className="flex-1 overflow-y-auto p-2"
        data-tour-id="app-sidebar-nav"
        aria-label={t('sidebar.navigation', 'Main navigation')}
      >
        {(['create', 'library', 'followup'] as const).map((group) => (
          <div key={group} className="mb-3">
            {!isCollapsed && (
              <div className="px-3 py-1 text-xs font-medium text-slate-500">
                {t(`sidebar.groups.${group}`)}
              </div>
            )}
            {navItems
              .filter(
                (item) =>
                  NAVIGATION_DESTINATIONS.find((destination) => destination.id === item.id)
                    ?.group === group,
              )
              .map(renderItem)}
          </div>
        ))}
      </nav>
      <div className="p-2 border-t border-slate-800/60">
        {navItems.filter((item) => item.id === 'settings').map(renderItem)}
      </div>

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
          aria-label={
            focusMode
              ? t('sidebar.exitFocus', 'Exit Focus Mode')
              : t('sidebar.focusMode', 'Focus Mode')
          }
          title={
            focusMode
              ? t('sidebar.exitFocus', 'Exit Focus Mode')
              : t('sidebar.focusMode', 'Focus Mode')
          }
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
