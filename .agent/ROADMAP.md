# Veo Studio — Roadmap

## Current Status

```
v1.1.0 Stabilization           ████████████████████ 100% RELEASED 2026-02-09
v1.2.0 Productivity Layer      ████████████████████ 100% RELEASED 2026-02-16
v1.3.0 Workflow Integration    ████████████████████ 100% RELEASED 2026-02-09
v1.4.0 UX Professionalization  ████████████████████ 100% RELEASED 2026-02-10
v1.5.0 Skipped/Merged            ░░░░░░░░░░░░░░░░░░░░   - SKIPPED
v1.6.0 Performance & Stability  █████████████████░░░  87% IN PROGRESS (21/24)
v1.7.0 Architecture Hardening      ░░░░░░░░░░░░░░░░░░░░   0% PLANNED
v1.8.0 Project Intelligence        ░░░░░░░░░░░░░░░░░░░░   0% PLANNED
v1.9.0 Workflow Automation         ░░░░░░░░░░░░░░░░░░░░   0% PLANNED
v2.0.0 Platform Transformation     ░░░░░░░░░░░░░░░░░░░░   0% PLANNED
```

---

## Released Versions

### v1.1.0 — Stabilization (Released 2026-02-09)

- Centralized settings store with persistence
- Structured logging system
- Enhanced error handling
- CI/CD pipeline (GitHub Actions)
- Windows + Linux builds
- Theme toggle (dark/light)

### v1.2.0 — Productivity Layer (Released 2026-02-16)

- Template system (save/edit/delete)
- Variable placeholders
- Preset management (10+ built-in)
- Autosave & recovery
- Keyboard shortcuts (20+)
- Enhanced export (JSON, PDF, CSV, MD, XML, ZIP)

### v1.3.0 — Workflow Integration (Released 2026-02-09)

- Prompt history with IndexedDB
- Diff comparison engine
- Project-based organization
- Database abstraction layer
- API export (JSON:API, HAL, OpenAPI, Postman)
- Sidebar navigation
- Search service

### v1.4.0 — UX Professionalization (Released 2026-02-10)

- Full UI polish pass
- Onboarding flow for new users
- Accessibility (WCAG 2.1 AA)
- Plugin architecture foundation
- Auto-update system
- Stable/beta release channels

---

## Planned Versions

### v1.5.0 — Skipped/Merged

_Merged into v1.6.0_

### v1.6.0 — Performance & Stability

**Target**: 2026-03-10
**Theme**: Make the system fast, reliable, and scalable
**Status**: 21/24 acceptance items complete (beta.2). 3 remaining items require manual QA / infrastructure.

#### Engineering

- [x] Strict state boundary isolation (UI state vs project state) — `partialize` in Zustand stores
- [x] Lazy loading for heavy studios (VideoAnalysis, Timeline, GenerativeCanvas) — dynamic `import()` for FFmpeg
- [x] Performance profiling baseline — `performanceService` with `performance.mark/measure`
- [x] Reduce Electron main/renderer IPC overhead — batch IPC with max window
- [x] Memory audit for Timeline + large projects — blob URL lifecycle tracking + revoke on unmount
- [x] Structured error boundary system per panel — ErrorBoundary per critical panel

#### UX

- [x] Timeline rendering performance — `ShotCard` memo + `useRafDebounce`
- [x] Safe Mode launch option (disable heavy plugins on crash) — 3-exit threshold + reset IPC

#### Bug Fix Discipline

- [x] Centralized error logging service (local file) — structured error schema with correlationId
- [x] Fix race conditions in collaborative hooks — AbortController + stale-closure guards in Yjs
- [x] Hotkey conflict resolution — RESERVED_COMBOS, modal suppression, native passthrough

#### DevOps

- [x] Build size threshold checks — CI enforces 800 KB main / 3,000 KB total
- [x] Automated changelog validation — PR CI step with docs/config exceptions
- [x] Electron hardening — `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, `sandbox: true`
- [ ] Signed Windows builds + AppImage — requires code-signing certificates (manual/infra)

#### Remaining (Manual / Environment)

- [ ] Baseline-vs-after profiling metrics comparison
- [ ] Stress test: rapid edits + collaboration join/leave
- [ ] Code-signing + release-candidate pipeline end-to-end

---

### v1.7.0 — Architecture Hardening & Plugin API v1

**Theme**: Formalize extension capability

#### Engineering

- Extract plugin interface layer
- Define StudioPlugin interface contract
- Convert studios into internal plugins (Audio, Image)
- Plugin registration lifecycle (init, mount, teardown)
- Version compatibility rules

#### UX

- Plugin Manager panel
- Enable/disable internal plugins
- Plugin crash isolation (sandbox boundary)

#### Security

- Harden preload scripts in Electron
- Strict context isolation enforcement

#### Documentation

- Plugin API documentation
- Architecture diagram v2
- Extension development guide

---

### v1.8.0 — Project Intelligence Layer

**Theme**: Make projects "aware"

#### Features

- Project health scoring
- Scene consistency validator
- Timeline integrity checker
- Dependency map visualization
- Prompt quality scoring refinement

#### Engineering

- Analysis engine service layer
- Decouple validation from UI
- Background worker for heavy analysis

#### UX

- Diagnostics tab
- Visual graph of project components
- Inline issue highlighting

---

### v1.9.0 — Workflow Automation & Batch System

**Theme**: Move from manual creation to production pipelines

#### Features

- Batch prompt generation
- Multi-scene export
- Export profiles per target model
- Project export bundles (zip + metadata)
- CLI mode for headless generation

#### Engineering

- Export service abstraction
- Job queue manager
- Background processing status panel

---

### v2.0.0 — Platform Transformation

**Theme**: Transition from application to creative platform

#### Workspace Engine

- Multi-workspace support
- Workspace-level settings
- Custom layouts per workspace

#### Visual Composer

- Drag-and-drop prompt block builder
- Timeline + prompt linked graph
- Visual dependency editing

#### Extension Marketplace

- Remote plugin registry
- Plugin signing system
- Sandbox execution model

#### Production Desktop

- Full auto-update with differential updates
- macOS signed DMG builds
- Crash reporter + opt-in telemetry

#### Testing Maturity

- Unit + integration + UI snapshot tests
- Automated smoke tests in CI
- Build reproducibility validation

---

## Governance (All Versions)

Every feature requires:

- README.md update
- CHANGELOG.md update
- Code comments where non-obvious
- Conventional commit messages
- Build passes before merge

No undocumented changes. No unversioned releases.
