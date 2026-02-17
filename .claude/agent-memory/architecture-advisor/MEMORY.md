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
src/core/services/ → src/core/store/ → src/features/ + src/shared/components/
```

- All data flows through services → IndexedDB
- No direct DB access from components
- Stores call services, expose state + actions to components
- Services are singleton class instances

## Service Layer

Project pattern verified in `projectService.ts`: `idb-keyval` key-prefix storage, `logger` for errors, workspace linkage via `workspaceService`.

## Store Layer

- Store pattern verified in `useProjectStore.ts`: async actions delegate CRUD to services, keep UI state (`isLoading`, `error`), and persist only selected fields via `persist(...partialize...)`.

## Component Organization

- `src/features/` — Feature modules (project-level UI and workflows)
- `src/shared/components/` — Shared design-system and cross-feature UI

## Key Design Decisions

- Services are the only path to IndexedDB
- Zustand stores connect services to components
- Error boundaries per major panel
- Lazy loading for heavy studios (React.lazy + Suspense)
- Plugin architecture uses manifest.json pattern

## Roadmap Snapshot (verified 2026-02-17)

- Current released line is through `v2.9.0 (Quality & Coverage)`.
- **v3.0.0** planned: i18n full migration, CSS theme completion, settings migration service.
- **v3.1.0** planned: 37 untested services + 11 untested stores test coverage, thresholds → 45%.
- **v3.2.0** planned: Deferred features (bundle history import, plugin install, keyframes, AR/RTL).

## Gaps Identified (2026-02-17)

- i18n: Only 2/50+ components migrated to `useTranslation()`; `useUIStrings()` bridge still dominant.
- CSS: 54 `.light` selectors in `index.css` vs 1 `[data-theme='light']` in `tokens.css`.
- Tests: 37 services + 11 stores have no test files; thresholds at 20%.
- Deferred: 6 "not yet implemented" items across services (history import, plugin install, keyframes).
- Console: 3 stray `console.*` calls remain (apiExportService ×2, loggerService ×1).
