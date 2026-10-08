import { ROUTES, type RoutePath } from './routes';
import type { IconName } from '@core/types';

export type NavigationGroup = 'create' | 'library' | 'followup';
export interface NavigationDestination {
  id: 'studio' | 'create' | 'timeline' | 'projects' | 'assets' | 'activity' | 'settings';
  path: RoutePath;
  labelKey: string;
  label: string;
  icon: IconName;
  group?: NavigationGroup;
}
export const NAVIGATION_DESTINATIONS: readonly NavigationDestination[] = [
  {
    id: 'studio',
    path: ROUTES.STUDIO,
    labelKey: 'sidebar.promptStudio',
    label: 'Prompt Studio',
    icon: 'sparkles',
    group: 'create',
  },
  {
    id: 'create',
    path: ROUTES.CREATE,
    labelKey: 'sidebar.production',
    label: 'Production',
    icon: 'video',
    group: 'create',
  },
  {
    id: 'timeline',
    path: ROUTES.TIMELINE,
    labelKey: 'sidebar.timeline',
    label: 'Timeline',
    icon: 'film',
    group: 'create',
  },
  {
    id: 'projects',
    path: ROUTES.PROJECTS,
    labelKey: 'sidebar.projects',
    label: 'Projects',
    icon: 'folder',
    group: 'library',
  },
  {
    id: 'assets',
    path: ROUTES.ASSETS,
    labelKey: 'sidebar.assets',
    label: 'Assets',
    icon: 'image',
    group: 'library',
  },
  {
    id: 'activity',
    path: ROUTES.ACTIVITY,
    labelKey: 'sidebar.activity',
    label: 'Activity',
    icon: 'clock',
    group: 'followup',
  },
  {
    id: 'settings',
    path: ROUTES.SETTINGS,
    labelKey: 'sidebar.settings',
    label: 'Settings',
    icon: 'settings',
  },
];
export function getNavigationDestination(pathname: string) {
  return NAVIGATION_DESTINATIONS.find(
    (destination) => destination.path === (pathname === ROUTES.DIRECTOR ? ROUTES.CREATE : pathname),
  );
}
