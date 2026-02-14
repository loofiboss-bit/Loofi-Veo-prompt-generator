# Agent Memory: project-coordinator

## Version Status

- v1.1.0 Stabilization -- RELEASED 2026-02-09
- v1.2.0 Productivity Layer -- RELEASED 2026-02-16
- v1.3.0 Workflow Integration -- RELEASED 2026-02-09
- v1.4.0 UX Professionalization -- RELEASED 2026-02-10
- v1.5.0 Performance & Stability -- SKIPPED (merged into v1.6.0)
- v1.6.0 Performance & Stability -- RELEASED 2026-02-14
- v1.7.0 Arch Hardening + Intel -- RELEASED 2026-02-14
- v1.8.0 Workflow Automation -- PLANNED
- v1.9.0 Platform Foundations -- PLANNED
- v2.0.0 Platform Transformation -- PLANNED

## Governance Hardening (v1.7.0+)

- ADR-001 established `.ai/INSTRUCTIONS.md` as canonical SSoT
- Agent configs generated from `.ai/agents/` source
- CI enforces: agent validation, blocking audit, lint ratchet
- `.agent/` pruned to runtime tracking only (ROADMAP, BUILD_STATUS, beta guides)

## Architecture Layers

- Services: `src/core/services/` (54 files, singleton pattern)
- Stores: `src/core/store/` (useAppStore, useHistoryStore, useProjectStore, useLocationStore, useSettingsStore, pluginStore)
- Slices: `src/core/store/slices/` (uiSlice, promptSlice, timelineSlice, assetSlice)
- Components: `src/components/` + `src/features/` (11 feature dirs)
- Types: `src/core/types/` (index.ts, plugin.ts, errors.ts, diagnostics.ts)
- Electron: `electron/main.cjs`, `electron/preload.cjs`

## Key Patterns

- Service: class with singleton export (`export const x = new X()`)
- Store: Zustand + persist(idbStorage) + temporal(zundo)
- Lazy loading: React.lazy in ModalManager.tsx (21 components)
- Path aliases: @core, @features, @shared, @infrastructure
- Build: `npm run build` (web), `npm run dist` (desktop)
- CI: build.yml (ubuntu+windows), beta-release.yml

## Key Findings (2026-02-14)

- App.tsx ~632 lines (reduced from 1353, but still needs decomposition)
- CI now enforces: governance validation, blocking audit, lint ratchet, typecheck, tests, format, bundle budget
- Canonical instructions: `.ai/INSTRUCTIONS.md` (ADR-001)
- Agent configs: generated from `.ai/agents/` source

## Cost Optimization

- gpt-5: complex multi-feature planning only
- gpt-5-mini: all implementation
- gpt-5-nano: tests, docs, releases
- Batch related changes, reference file paths not content

## Active System State (2026-02-14)

- ChatGPT agent system is active and mirrors Claude workflow logic.
- Master instruction file: `CHATGPT.md` (shim → `.ai/INSTRUCTIONS.md`).
- Agent configs path: `.chatgpt/agents/`.
- Persistent memory path: `.chatgpt/agent-memory/{agent-name}/MEMORY.md`.
- Shared orchestration rules: `.ai/INSTRUCTIONS.md`, `.ai/WORKFLOW.md`. Model routing in `.ai/model-versions.json`.
- Model routing tiers: `gpt-5` (complex planning), `gpt-5-mini` (default implementation), `gpt-5-nano` (tests/docs/release).
- Switching rule: use `.claude/*` with Claude, `.chatgpt/*` with ChatGPT.
