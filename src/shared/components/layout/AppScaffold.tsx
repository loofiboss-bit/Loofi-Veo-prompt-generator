import React from 'react';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { PromptWorkspace } from '@features/prompt/PromptWorkspace';
import { ROUTES } from '@core/config/routes';
import Header from './Header';
import { Sidebar } from './Sidebar';
import ModalManager from './ModalManager';
import { AppOverlays } from './AppOverlays';
import { AppPanels } from './AppPanels';
import { AppBackground } from './AppBackground';
import { AppCollaborationPanels } from './AppCollaborationPanels';
import { FocusModeBanner } from './FocusModeBanner';

export interface AppScaffoldProps {
  skipToContentLabel: string;
  pathname: string;
  isChildRoute: boolean;
  activeSection: string;
  sidebarProps: React.ComponentProps<typeof Sidebar>;
  headerProps: React.ComponentProps<typeof Header>;
  promptWorkspaceProps: React.ComponentProps<typeof PromptWorkspace>;
  modalManagerProps: React.ComponentProps<typeof ModalManager>;
  collaborationPanelsProps: React.ComponentProps<typeof AppCollaborationPanels>;
  appPanelsProps: React.ComponentProps<typeof AppPanels>;
  appOverlaysProps: React.ComponentProps<typeof AppOverlays>;
}

export function AppScaffold({
  skipToContentLabel,
  pathname,
  isChildRoute,
  activeSection,
  sidebarProps,
  headerProps,
  promptWorkspaceProps,
  modalManagerProps,
  collaborationPanelsProps,
  appPanelsProps,
  appOverlaysProps,
}: AppScaffoldProps) {
  const sidebarActiveSection =
    pathname === ROUTES.COMPOSER
      ? 'composer'
      : pathname === ROUTES.TIMELINE
        ? 'timeline'
        : pathname === ROUTES.SETTINGS
          ? 'settings'
          : activeSection;

  return (
    <div className="h-full bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-100 transition-colors duration-300">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        {skipToContentLabel}
      </a>
      <AppBackground />

      <ErrorBoundary panelId="app-sidebar-panel">
        <Sidebar {...sidebarProps} activeSection={sidebarActiveSection} />
      </ErrorBoundary>

      <ErrorBoundary panelId="app-collaboration-panels-container">
        <AppCollaborationPanels {...collaborationPanelsProps} />
      </ErrorBoundary>

      {isChildRoute && (
        <div className="h-full overflow-y-auto ml-0 lg:ml-[var(--sidebar-width)] transition-all duration-300">
          <ErrorBoundary panelId="app-child-routes">
            <Outlet />
          </ErrorBoundary>
        </div>
      )}

      <div
        id="main-content"
        className={`relative z-10 h-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-6 pb-12 ml-0 lg:ml-[var(--sidebar-width)] transition-all duration-300 ${isChildRoute ? 'hidden' : ''}`}
      >
        <FocusModeBanner />
        <ErrorBoundary panelId="app-header-panel">
          <Header {...headerProps} />
        </ErrorBoundary>

        <ErrorBoundary panelId="app-prompt-workspace">
          <PromptWorkspace {...promptWorkspaceProps} />
        </ErrorBoundary>
      </div>

      <ErrorBoundary panelId="app-modal-manager-panel">
        <ModalManager {...modalManagerProps} />
      </ErrorBoundary>

      <ErrorBoundary panelId="app-panels-container">
        <AppPanels {...appPanelsProps} />
      </ErrorBoundary>

      <ErrorBoundary panelId="app-overlays-container">
        <AppOverlays {...appOverlaysProps} />
      </ErrorBoundary>
    </div>
  );
}
