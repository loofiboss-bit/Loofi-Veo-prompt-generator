# Agent Memory: architecture-advisor

## Stack

- React 18 + TypeScript (strict) + Vite 5
- Electron 40 (desktop wrapper)
- Zustand 4.5 + Zundo 2.1 (state + undo/redo)
- IndexedDB via idb-keyval 6.2 (persistence)
- TailwindCSS 3.4 (styling)
- Yjs 13.6 + WebRTC (real-time collaboration)

## Architecture

```
src/core/services/ → src/core/store/ → src/components/ + src/features/
```

- All data flows through services → IndexedDB
- No direct DB access from components
- Stores call services, expose state + actions to components
- Services are singleton class instances

## Service Layer (38 services in src/core/services/)

Key services: promptBuilder, historyService, diffService, projectService, databaseService, apiExportService, templateManager, presetManager, autosaveService, searchService, geminiService, videoEditorService, exportService, pluginService, loggerService

## Store Layer

- useAppStore (main state + slices: asset, prompt, timeline, ui)
- useHistoryStore, useProjectStore, useSettingsStore, useLocationStore, pluginStore

## Component Organization

- `src/components/ui/` — Shared UI (Button, Input, Modal, Card)
- `src/features/` — Feature modules (onboarding, studios, project, history, etc.)
- `src/shared/` — Cross-feature shared components

## Key Design Decisions

- Services are the only path to IndexedDB
- Zustand stores connect services to components
- Error boundaries per major panel
- Lazy loading for heavy studios (React.lazy + Suspense)
- Plugin architecture uses manifest.json pattern

## Automated Workflow (2026-02-10)

- `CLAUDE.md` — Master instructions
- `.agent/WORKFLOW.md` — Pipeline definitions
- `.agent/MODEL_ROUTING.md` — Cost-optimized model selection
- All agents now reference `.agent/ROADMAP.md` instead of hardcoded version info

## Next: v1.5.0 Performance & Stability

Key architectural concerns:
- State boundary isolation (UI state vs project state)
- Lazy loading for heavy studios
- Electron IPC optimization
- Memory audit for Timeline + large projects
