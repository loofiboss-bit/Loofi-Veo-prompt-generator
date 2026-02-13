# Agent Memory: project-coordinator

## Version Status

- v1.1.0 Stabilization -- RELEASED 2026-02-09
- v1.2.0 Productivity Layer -- RELEASED 2026-02-16
- v1.3.0 Workflow Integration -- RELEASED 2026-02-09
- v1.4.0 UX Professionalization -- RELEASED 2026-02-10
- v1.5.0 Performance & Stability -- IN PROGRESS (target 2026-03-10)
- v1.6.0 Architecture Hardening -- PLANNED
- v2.0.0 Platform Transformation -- PLANNED

## v1.5.0 Partial Work Already Done

- `src/core/types/errors.ts` -- COMPLETE: AppError, PanelErrorState, ErrorBoundaryProps, ErrorBoundaryState
- `src/core/services/errorLoggingService.ts` -- COMPLETE: singleton, IDB+localStorage+IPC
- Neither registered in `src/core/services/index.ts` yet
- No ErrorBoundary component exists yet
- `src/components/ui/Skeleton.tsx` exists (old path, unused for Suspense)
- `eslint.config.js` + `scripts/lint-changed-strict.sh` created but not in CI
- No `log-error` IPC handler in main.cjs (errorLoggingService expects it)

## v1.5.0 Critical Path

types (DONE) -> error logging service (DONE) -> register in index -> ErrorBoundary component -> skeletons -> panel wrapping -> Electron hardening -> CI gates -> release

## Architecture Layers

- Services: `src/core/services/` (singleton pattern)
- Stores: `src/core/store/` (useAppStore, useHistoryStore, useProjectStore, useLocationStore, useSettingsStore)
- Slices: `src/core/store/slices/` (uiSlice, promptSlice, timelineSlice, assetSlice)
- Components: `src/components/` + `src/features/`
- Types: `src/core/types/` (index.ts, plugin.ts, errors.ts)
- Electron: `electron/main.cjs`, `electron/preload.cjs` (4 IPC channels)

## Key Patterns

- Service: class with singleton export (`export const x = new X()`)
- Store: Zustand + persist(idbStorage) + temporal(zundo), NO partialize yet
- Lazy loading: React.lazy in ModalManager.tsx (21 components), SuspenseFallback (spinner)
- Path aliases: @core, @features, @shared, @infrastructure
- Build: `npm run build` (web), `npm run dist` (desktop)
- CI: build.yml (ubuntu+windows), beta-release.yml -- NO type check, lint, or bundle size

## Key Risks

- App.tsx 1343 lines -- monolithic, all state + handlers
- useAppStore persists ALL slices including UI (needs partialize)
- electron/main.cjs: webSecurity=false, openDevTools hardcoded
- preload.cjs: missing log-error IPC channel

## Cost Optimization

- opus: complex multi-feature planning only
- sonnet: all implementation
- haiku: tests, docs, releases

## Links

- [Execution plan detail](./v150-plan.md)
