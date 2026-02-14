# Agent Memory: project-coordinator

## Version Status

- v1.1.0 Stabilization -- RELEASED 2026-02-09
- v1.2.0 Productivity Layer -- RELEASED 2026-02-16
- v1.3.0 Workflow Integration -- RELEASED 2026-02-09
- v1.4.0 UX Professionalization -- RELEASED 2026-02-10
- v1.5.0 Performance & Stability -- SKIPPED (merged into v1.6.0)
- v1.6.0 Performance & Stability -- RELEASED 2026-02-14
- v1.7.0 Arch Hardening + Intel -- RELEASED 2026-02-14
- v1.8.0 Workflow Automation -- RELEASED 2026-02-15
- v1.9.0 Platform Foundations -- PLANNING (see v1.9.0-plan.md)
- v2.0.0 Platform Transformation -- PLANNED

## Governance Hardening (v1.7.0+)

- ADR-001 established `.ai/INSTRUCTIONS.md` as canonical SSoT
- Agent configs generated from `.ai/agents/` source
- CI enforces: agent validation, blocking audit, lint ratchet
- `.agent/` pruned to runtime tracking only (ROADMAP, BUILD_STATUS, beta guides)
- Stale governance files (instructions.md, WORKFLOW.md, PRE_FLIGHT_CHECKLIST.md) deleted

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
- CI: build.yml (ubuntu+windows), validate.yml, beta-release.yml — governance + quality gates

## Key Risks

- App.tsx ~632 lines -- still large, needs decomposition
- Governance overhead — pruning in progress
- 630 ESLint warnings — lint ratchet mechanism in place to reduce

## Cost Optimization

- opus: complex multi-feature planning only
- sonnet: all implementation
- haiku: tests, docs, releases

## Links

- Canonical instructions: `.ai/INSTRUCTIONS.md`
- Workflows: `.ai/WORKFLOW.md`
- Agent specs: `.ai/AGENT_SPECS.md`
- Roadmap: `.ai/ROADMAP.md`
