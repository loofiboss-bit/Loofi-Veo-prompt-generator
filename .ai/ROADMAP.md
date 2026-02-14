# Veo Studio — Roadmap

## Current Status

```
v1.1.0 Stabilization           ████████████████████ 100% RELEASED 2026-02-09
v1.2.0 Productivity Layer      ████████████████████ 100% RELEASED 2026-02-16
v1.3.0 Workflow Integration    ████████████████████ 100% RELEASED 2026-02-09
v1.4.0 UX Professionalization  ████████████████████ 100% RELEASED 2026-02-10
v1.5.0 Skipped/Merged            ░░░░░░░░░░░░░░░░░░░░   - SKIPPED
v1.6.0 Performance & Stability ████████████████████ 100% RELEASED 2026-02-14
v1.7.0 Arch Hardening + Intel   ████████████████████ 100% RELEASED 2026-02-14
v1.8.0 Workflow Automation      ████████████████████ 100% RELEASED 2026-02-15
v1.9.0 Platform Foundations    ████████████████████ 100% RELEASED 2026-02-14
v2.0.0 Platform Transformation  ████░░░░░░░░░░░░░░░░  20% IN PROGRESS
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

### v1.7.0 — Architecture Hardening, Plugin API v1 & Project Intelligence (Released 2026-02-14)

- Plugin API v1 formalized (StudioPlugin interface contract)
- Studios converted to internal plugins (Audio, Image, Video)
- Plugin crash isolation (PluginErrorBoundary + health tracking)
- Version compatibility rules (semver parser + satisfies)
- Plugin data API wired to real services
- Plugin Manager panel
- Plugin API documentation + architecture diagrams + dev guide
- Project health scoring (4 dimensions, tier system)
- Scene consistency validator (character/location refs, transitions, duration, style drift)
- Timeline integrity checker (gaps, overlaps, orphans, unlinked shots)
- Dependency map visualization (SVG radial graph)
- Prompt quality scoring refinement (5 dimensions, breakdown)
- Analysis engine service layer (projectAnalysisService)
- Background worker for heavy analysis (analysisWorker.ts)
- Diagnostics panel (3-tab modal: Issues, Health, Graph)
- Health badge in sidebar
- 26 new unit tests (202 total across 15 files)
- 0 type errors, 0 lint warnings

### v1.8.0 — Workflow Automation & Batch System (Released 2026-02-15)

- Batch prompt generation (BatchPromptService + BatchGeneratorModal)
- Multi-scene export (SceneExportService: JSON/TXT/Markdown per-scene + consolidated)
- Export profiles per target model (7 profiles: 4 Veo + 3 Sora)
- Project export bundles (ProjectBundleService: zip + metadata + manifest)
- CLI mode for headless generation (generate + export + profiles commands)
- Export service abstraction (format-agnostic pipeline)
- Job queue manager (JobQueueService: priority queue, retries, concurrent limits)
- Background processing status panel (JobsPanel in sidebar)
- 28 CLI tests, 17 batch tests, 46 scene export tests, 58 profile tests, 53 bundle tests, 24 queue tests
- 0 type errors, 0 lint warnings

### v1.9.0 — Platform Foundations (Released 2026-02-14)

- Multi-workspace support (WorkspaceService + WorkspaceStore + WorkspaceSwitcher + WorkspaceManagerModal)
- Workspace-level settings resolution (SettingsResolutionService + WorkspaceSettingsPanel + useResolvedSettings hook)
- Remote plugin registry foundation (RegistryService + RegistryStore + RegistryBrowser + RegistryEntryCard)
- Plugin signing system (Ed25519 via Web Crypto API + pluginCrypto utilities + TrustBadge)
- Registry URL configuration in settings
- ProjectService workspace integration + data migration
- PluginService signing integration with trust level tracking
- 22 new files, 13 modified files
- Full test coverage across services, stores, and crypto utilities
- 0 type errors, 0 lint warnings

---

## Planned Versions

### v2.0.0 — Platform Transformation

**Theme**: Transition from application to creative platform

#### Visual Composer ✅

- Drag-and-drop prompt block builder (28 block types across 8 categories)
- Block palette with search/filter, drag-and-drop onto canvas
- Connection system with bezier/straight/step path styles
- Canvas with pan, zoom, selection box, minimap, snap-to-grid
- Block inspector with field editing, connection list, evaluation results
- Graph evaluation engine (topological sort, cycle detection, compiled prompt output)
- Auto-layout algorithm (depth-based column positioning)
- Zustand store with Zundo undo/redo, snapshot system
- Lazy-loaded panel integrated into sidebar navigation
- 38 unit tests covering service layer

#### Extension Marketplace

- Remote plugin registry
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
