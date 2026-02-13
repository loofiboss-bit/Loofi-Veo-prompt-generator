# Agent Memory: frontend-integration-builder

## Component Structure

- UI components: `src/components/ui/` (Button, Input, Modal, Card)
- Feature components: `src/features/` (organized by feature area)
- Shared components: `src/shared/components/`
- Layout: `src/shared/components/layout/ModalManager.tsx` — Central modal/studio renderer

## Store Pattern

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useStore = create<State>()(
  persist(
    (set) => ({
      /* state + actions */
    }),
    { name: 'store-name' },
  ),
);
```

## Existing Stores

useAppStore (slices: asset, prompt, timeline, ui), useHistoryStore, useProjectStore, useSettingsStore, useLocationStore, pluginStore

## Feature Areas in src/features/

onboarding, studios (Audio/Video/Image/Canvas), project, history, export, timeline, settings, plugins, help, prompt

## Lazy Loading Pattern

```typescript
const Component = React.lazy(() => import('@features/path/Component'));
// Use skeleton variants, not SuspenseFallback, for all Suspense fallbacks in ModalManager:
<React.Suspense fallback={<ModalSkeleton />}>      // modals/panels
<React.Suspense fallback={<StudioSkeleton />}>     // full-screen studios
<React.Suspense fallback={<TimelineSkeleton />}>   // storyboard/timeline
```

## Suspense Fallback Classification (ModalManager.tsx)

- `StudioSkeleton`: full-screen studios — `image`, `suno`, `analysis`, `video`, `script`
- `TimelineSkeleton`: timeline/storyboard — `story`
- `ModalSkeleton`: all dialog-style modals/panels — `pronunciation`, `compare`, `spatial`, history, templates, DNA, character bank, locations, project manager, series bible, wizard, variations, search, variables, new project wizard
- Import: `import { StudioSkeleton, ModalSkeleton, TimelineSkeleton } from '@shared/components/ui/Skeleton';`
- Remove `SuspenseFallback` import when all fallbacks are skeleton-based

## Path Aliases

`@` → src/, `@core` → src/core/, `@features` → src/features/, `@shared` → src/shared/

## Design System

- tokens.css — Design tokens (colors, spacing, typography)
- animations.css — Animation system
- Dark/light theme via CSS variables
- TailwindCSS for all styling

## Skeleton Component

- Canonical location: `src/shared/components/ui/Skeleton.tsx`
- Old location `src/components/ui/Skeleton.tsx` is now a re-export shim (backwards compat)
- Panel presets: `StudioSkeleton`, `ModalSkeleton`, `TimelineSkeleton`
- `SuspenseFallback` uses `ModalSkeleton` (no spinner); pass `message` prop to show text-only fallback
- All exported from `src/shared/components/ui/index.ts`

## ErrorBoundary

- Location: `src/shared/components/ErrorBoundary.tsx` (class component, not inside `ui/`)
- Exported from `src/shared/components/ui/index.ts` as `{ ErrorBoundary }` via `'../ErrorBoundary'`
- `errorLoggingService.logError(error, context?)` confirmed API from `@core/services`
- Tracks Safe Mode crash data in localStorage: keys `veo-crash-count` and `veo-last-crash`
- Props: `panelId: string`, `children: ReactNode`, `fallback?: ReactNode`
- Unused `ErrorInfo` arg in `componentDidCatch` named `_info` to satisfy noUnusedLocals

## Barrel Export Notes

- No `src/shared/components/index.ts` exists; `ui/index.ts` also re-exports non-ui shared components
- Cross-directory exports inside `ui/index.ts` use relative `'../ComponentName'` paths
