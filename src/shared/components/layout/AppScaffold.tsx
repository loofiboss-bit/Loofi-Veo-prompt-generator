import { ProjectSaveStatus } from '@features/project/ProjectSaveStatus';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useViewport } from '@shared/hooks/useViewport';
import { useProjectStore } from '@core/store/useProjectStore';
import { getNavigationDestination } from '@core/config/navigation';
import Icon from '@shared/components/ui/Icon';
import { Outlet } from 'react-router';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { PromptWorkspace } from '@features/prompt/PromptWorkspace';
import Header from './Header';
import { Sidebar } from './Sidebar';
import ModalManager from './ModalManager';
import { AppOverlays } from './AppOverlays';
import { AppPanels } from './AppPanels';
import { AppBackground } from './AppBackground';
import { AppCollaborationPanels } from './AppCollaborationPanels';

export interface AppScaffoldProps {
  onOpenCommandPalette?: () => void;
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
  onOpenCommandPalette,
  skipToContentLabel,
  pathname,
  activeSection,
  sidebarProps,
  modalManagerProps,
  collaborationPanelsProps,
  appPanelsProps,
  appOverlaysProps,
}: AppScaffoldProps) {
  const { t } = useTranslation('common');
  const { isMobile, isCompact } = useViewport();
  const category = isMobile ? 'mobile' : isCompact ? 'compact' : 'wide';
  const [menuState, setMenuState] = useState<{
    category: string;
    collapsed: boolean;
    open: boolean;
  }>({ category, collapsed: isCompact, open: false });
  const collapsed = menuState.category === category ? menuState.collapsed : isCompact;
  const drawerOpen = menuState.category === category && menuState.open;
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { projects, currentProjectId } = useProjectStore();
  const currentProject = projects.find((project) => project.id === currentProjectId);
  const sidebarActiveSection = getNavigationDestination(pathname)?.id ?? activeSection;
  const sidebarWidth = isMobile
    ? '0px'
    : collapsed
      ? 'var(--sidebar-width-collapsed)'
      : 'var(--sidebar-width)';
  useEffect(() => {
    setMenuState({ category, collapsed: isCompact, open: false });
  }, [category, isCompact]);
  useEffect(() => {
    setMenuState((previous) => ({ ...previous, open: false }));
    const content = contentRef.current;
    if (!content) return;
    content.scrollTop = 0;
    // Lazy pages may mount after the route changes; observe until their title exists.
    const focusTitle = () => {
      const title = content.querySelector<HTMLElement>('h1');
      if (!title) return false;
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
      return true;
    };
    const observer = new MutationObserver(() => {
      if (focusTitle()) observer.disconnect();
    });
    const frame = requestAnimationFrame(() => {
      if (!focusTitle()) observer.observe(content, { childList: true, subtree: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const drawer = drawerRef.current;
    const focusable = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>('button, a[href], input, select, [tabindex="0"]') ??
          [],
      );
    focusable()[0]?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      if (event.key === 'Escape') setMenuState((previous) => ({ ...previous, open: false }));
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      previousFocus?.focus();
    };
  }, [drawerOpen]);

  return (
    <div className="creator-shell h-full bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-100 transition-colors duration-300">
      <a
        href="#app-route-content"
        onClick={(event) => {
          event.preventDefault();
          contentRef.current?.focus({ preventScroll: true });
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        {skipToContentLabel}
      </a>
      <AppBackground />

      {(!isMobile || drawerOpen) && (
        <>
          {isMobile && (
            <button
              type="button"
              className="fixed inset-0 bg-black/40 z-30"
              aria-label={t('sidebar.closeNavigation', 'Close navigation')}
              onClick={() => setMenuState((previous) => ({ ...previous, open: false }))}
            />
          )}
          <div
            ref={drawerRef}
            role={isMobile ? 'dialog' : undefined}
            aria-modal={isMobile ? true : undefined}
            aria-label={isMobile ? t('sidebar.navigation', 'Main navigation') : undefined}
          >
            <ErrorBoundary panelId="app-sidebar-panel">
              <Sidebar
                {...sidebarProps}
                activeSection={sidebarActiveSection}
                isCollapsed={isMobile ? false : collapsed}
                onNavigated={() => setMenuState((previous) => ({ ...previous, open: false }))}
                onToggleCollapse={() =>
                  setMenuState({
                    category,
                    collapsed: !collapsed,
                    open: isMobile ? false : drawerOpen,
                  })
                }
              />
            </ErrorBoundary>
          </div>
        </>
      )}

      <ErrorBoundary panelId="app-collaboration-panels-container">
        <AppCollaborationPanels {...collaborationPanelsProps} />
      </ErrorBoundary>

      <div
        id="app-route-content"
        ref={contentRef}
        role="main"
        aria-label={t('sidebar.workspaceContent', 'Workspace content')}
        tabIndex={-1}
        style={{ marginInlineStart: sidebarWidth }}
        className="relative z-10 h-full overflow-y-auto overflow-x-hidden "
      >
        <div className="creator-context-row flex items-center gap-3 px-4 py-2 border-b border-slate-800/60 bg-slate-950">
          {isMobile && (
            <button
              type="button"
              aria-label={t('sidebar.openNavigation', 'Open navigation')}
              aria-expanded={drawerOpen}
              onClick={() => setMenuState({ category, collapsed: false, open: true })}
              className="p-2 rounded-lg hover:bg-slate-800"
            >
              <Icon name="menu" className="w-5 h-5" />
            </button>
          )}
          <span className="flex-1 truncate text-sm text-slate-400">
            {t('sidebar.currentProject')}:{' '}
            <span className="text-slate-200">
              {currentProject?.name ?? t('sidebar.noProject', 'No project selected')}
            </span>
          </span>
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
          >
            {t('sidebar.quickNavigation', 'Quick navigation')}
          </button>
        </div>
        <ProjectSaveStatus />
        <ErrorBoundary panelId="app-routes">
          <Outlet />
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
