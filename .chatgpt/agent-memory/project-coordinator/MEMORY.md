# Agent Memory: project-coordinator

## Version Status

- v1.1.0 Stabilization -- RELEASED 2026-02-09
- v1.2.0 Productivity Layer -- RELEASED 2026-02-16
- v1.3.0 Workflow Integration -- RELEASED 2026-02-09
- v1.4.0 UX Professionalization -- RELEASED 2026-02-10
- v1.5.0 Performance & Stability -- PLANNED (target 2026-03-10), plan complete (20 tasks, 5 sprints)
- v1.6.0 Architecture Hardening -- PLANNED
- v2.0.0 Platform Transformation -- PLANNED

## v1.5.0 Plan Summary

Critical path: types -> error logging -> ErrorBoundary -> skeletons -> panel wrapping -> integration -> release.
Independent tasks (run anytime): state boundary isolation, race condition fix, hotkey conflicts, all CI tasks.
See conversation output for full task breakdown.

## Architecture Layers

- Services: `src/core/services/` (35 files, singleton pattern)
- Stores: `src/core/store/` (useAppStore, useHistoryStore, useProjectStore, useLocationStore, useSettingsStore, pluginStore)
- Slices: `src/core/store/slices/` (uiSlice, promptSlice, timelineSlice, assetSlice)
- Components: `src/components/` + `src/features/` (10 feature dirs)
- Types: `src/core/types/` (index.ts, plugin.ts)
- Electron: `electron/main.cjs`, `electron/preload.cjs`

## Key Patterns

- Service: class with singleton export (`export const x = new X()`)
- Store: Zustand + persist(idbStorage) + temporal(zundo)
- Lazy loading: React.lazy in ModalManager.tsx (21 components)
- Path aliases: @core, @features, @shared, @infrastructure
- Build: `npm run build` (web), `npm run dist` (desktop)
- CI: build.yml (ubuntu+windows), beta-release.yml

## Key Findings (2026-02-10)

- No ErrorBoundary anywhere in codebase
- Skeleton.tsx exists but not used for Suspense fallbacks
- SuspenseFallback.tsx uses spinner only
- App.tsx is 1353 lines (monolithic)
- useAppStore persists ALL slices including UI (needs partialize fix)
- electron/main.cjs: webSecurity=false, openDevTools hardcoded
- loggerService: in-memory + console only, no file output
- CI: no type checking, no bundle size checks

## Cost Optimization

- gpt-5: complex multi-feature planning only
- gpt-5-mini: all implementation
- gpt-5-nano: tests, docs, releases
- Batch related changes, reference file paths not content

## Active System State (2026-02-10)

- ChatGPT agent system is active and mirrors Claude workflow logic.
- Master instruction file: `CHATGPT.md`.
- Agent configs path: `.chatgpt/agents/`.
- Persistent memory path: `.chatgpt/agent-memory/{agent-name}/MEMORY.md`.
- Shared orchestration rules: `.agent/instructions.md`, `.agent/WORKFLOW.md`, `.agent/MODEL_ROUTING.md`.
- Model routing tiers: `gpt-5` (complex planning), `gpt-5-mini` (default implementation), `gpt-5-nano` (tests/docs/release).
- Switching rule: use `.claude/*` with Claude, `.chatgpt/*` with ChatGPT.
