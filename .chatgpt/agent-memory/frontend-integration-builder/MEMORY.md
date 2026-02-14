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
<React.Suspense fallback={<SuspenseFallback message="..." />}>
```

## Path Aliases

`@` → src/, `@core` → src/core/, `@features` → src/features/, `@shared` → src/shared/

## Design System

- tokens.css — Design tokens (colors, spacing, typography)
- animations.css — Animation system
- Dark/light theme via CSS variables
- TailwindCSS for all styling

## Active System State (2026-02-10)

- ChatGPT agent system is active and mirrors Claude workflow logic.
- Master instruction file: `CHATGPT.md`.
- Agent configs path: `.chatgpt/agents/`.
- Persistent memory path: `.chatgpt/agent-memory/{agent-name}/MEMORY.md`.
- Shared orchestration rules: `.ai/INSTRUCTIONS.md`, `.ai/WORKFLOW.md`. Model routing in `.ai/model-versions.json`.
- Model routing tiers: `gpt-5` (complex planning), `gpt-5-mini` (default implementation), `gpt-5-nano` (tests/docs/release).
- Switching rule: use `.claude/*` with Claude, `.chatgpt/*` with ChatGPT.

## 2026-02-10 Loading + Safe Mode UX

- Heavy studios now use `StudioSkeleton` (`src/shared/components/ui/StudioSkeleton.tsx`) as Suspense fallback.
- `App.tsx` uses `openStudioSafely` to block heavy studios when safe mode is active and show a toast.
- `SettingsModal` can render a safe-mode status banner via optional `safeModeStatus` prop.
