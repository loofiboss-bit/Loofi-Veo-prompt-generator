# Veo Studio — Roadmap

## Current Status

```
v1.1.0 Stabilization           ████████████████████ 100% RELEASED 2026-02-09
v1.2.0 Productivity Layer      ████████████████████ 100% RELEASED 2026-02-16
v1.3.0 Workflow Integration    ████████████████████ 100% RELEASED 2026-02-09
v1.4.0 UX Professionalization  ████████████████████ 100% RELEASED 2026-02-10
v1.5.0 Skipped/Merged            ░░░░░░░░░░░░░░░░░░░░   - SKIPPED
v1.6.0 Performance & Stability ████████████████████ 100% RELEASED 2026-02-14
v1.7.0 Architecture Hardening   ████░░░░░░░░░░░░░░░░  20% IN PROGRESS (Sprint 1)
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

### v1.5.0 — Skipped/Merged

_Merged into v1.6.0_

### v1.6.0 — Performance & Stability (Released 2026-02-14)

- 60% bundle size reduction (1,595 KB → 655 KB)
- Performance instrumentation (mark/measure)
- Strict state boundary isolation (partialize)
- Lazy loading for heavy studios (FFmpeg, MediaPipe, Transformers)
- Memory audit: blob URL lifecycle tracking + revoke on unmount
- Structured error boundary system per panel
- Timeline rendering optimization (ShotCard + useRafDebounce)
- Safe Mode with crash-loop detection and reset IPC
- Centralized error logging with correlationId
- Race condition fixes in collaborative hooks (AbortController + stale-closure guards)
- Hotkey conflict resolution (RESERVED_COMBOS, modal suppression)
- Build size threshold checks in CI
- Automated changelog validation
- Electron hardening (contextIsolation, sandbox, webSecurity)
- Plugin API v1 foundation (StudioPlugin interface, health tracking, semver compat)
- App.tsx decomposition (1,456 → ~612 lines)
- Test coverage: 44 → 176 unit tests + 9 E2E tests
- 0 lint warnings, 0 type errors

---

## Planned Versions

### v1.7.0 — Architecture Hardening & Plugin API v1

**Theme**: Formalize extension capability

#### Engineering

- [x] Extract plugin interface layer
- [x] Define StudioPlugin interface contract
- [x] Convert studios into internal plugins (Audio, Image, Video)
- [x] Plugin registration lifecycle (activate, deactivate, dispose)
- [x] Version compatibility rules (semver parser + satisfies)
- [x] Wire plugin data API to real services (projects, history, templates)

#### UX

- [x] Plugin Manager panel
- [x] Enable/disable internal plugins
- [x] Plugin crash isolation (PluginErrorBoundary + health tracking)

#### Security

- [x] Harden preload scripts in Electron (v1.6.0)
- [x] Strict context isolation enforcement (v1.6.0)

#### Documentation

- [ ] Plugin API documentation
- [ ] Architecture diagram v2
- [ ] Extension development guide

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
