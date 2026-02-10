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
    persist((set) => ({ /* state + actions */ }), { name: 'store-name' })
);
```

## Existing Stores

useAppStore (slices: asset, prompt, timeline, ui), useHistoryStore, useProjectStore, useSettingsStore, useLocationStore, pluginStore

## Feature Areas in src/features/

onboarding, studios (Audio/Video/Image/Canvas), project, history, export, timeline, settings, plugins, help, prompt

## Lazy Loading Pattern

```typescript
const Component = React.lazy(() => import('@features/path/Component'));
<React.Suspense fallback={<SuspenseFallback message="..." />}>
```

## Path Aliases

`@` → src/, `@core` → src/core/, `@features` → src/features/, `@shared` → src/shared/

## Design System

- tokens.css — Design tokens (colors, spacing, typography)
- animations.css — Animation system
- Dark/light theme via CSS variables
- TailwindCSS for all styling
