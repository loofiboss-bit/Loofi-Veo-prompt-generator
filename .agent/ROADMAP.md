# Veo Studio — Roadmap

## Current Status

```
v1.1.0 Stabilization           ████████████████████ 100% RELEASED 2026-02-09
v1.2.0 Productivity Layer      ████████████████████ 100% RELEASED 2026-02-16
v1.3.0 Workflow Integration    ████████████████████ 100% RELEASED 2026-02-09
v1.4.0 UX Professionalization  ████████████████████ 100% RELEASED 2026-02-10
v1.5.0 Skipped/Merged            ░░░░░░░░░░░░░░░░░░░░   - SKIPPED
v1.6.0 Performance & Stability ████████████████████ 100% RELEASED 2026-02-14
v1.7.0 Arch Hardening + Intel  ████████████████████ 100% RELEASED 2026-02-14
v1.8.0 Workflow Automation     ████████████████████ 100% RELEASED 2026-02-14
v1.9.0 Platform Foundations    ████████████████████ 100% RELEASED 2026-02-14
v2.0.0 Platform Transformation ████████████████████ 100% RELEASED 2026-02-15
v2.1.0 Production Pipeline     ████████████████████ 100% RELEASED 2026-02-15
v2.2.0 Current                 ████████████████████ 100% CURRENT
v2.3.0 DX & Testing Maturity  ��������������������  85% IN PROGRESS
v2.4.0 i18n & Routing          ░░░░░░░░░░░░░░░░░░░░   0% PLANNED
v2.5.0 AI Pipeline Resilience  ████████████████████ 100% RELEASED 2026-02-20
v2.6.0 Collaboration Suite     ████████████████████ 100% CURRENT
v3.0.0 Full Platform           ░░░░░░░░░░░░░░░░░░░░   0% PLANNED
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

---

## Released Versions (v1.8+)

### v1.8.0 — Workflow Automation & Batch System (Released 2026-02-14)

- Batch prompt generation
- Multi-scene export
- Export profiles per target model
- Project export bundles (zip + metadata)
- CLI mode for headless generation

### v1.9.0 — Platform Foundations (Released 2026-02-14)

- Multi-workspace support
- Workspace-level settings
- Remote plugin registry foundation
- Plugin signing system

### v2.0.0 — Platform Transformation (Released 2026-02-15)

- Visual Composer (drag-and-drop prompt block builder)
- Extension Marketplace (remote plugin registry, sandbox execution)
- Production Desktop (auto-update, macOS DMG, crash reporting, opt-in telemetry)

### v2.1.0 — Production Pipeline (Released 2026-02-15)

- Script breakdown → shot-list AI pipeline
- Bridge video generation (Veo image-to-video)
- Auto-blocking from script text
- Foley wizard (video-frame SFX detection)
- Color grade matching and generation
- Camera path interpretation

### v2.2.0 — Current Release

- Additional refinements and stability improvements

---

## Planned Versions

### v2.3.0 — DX & Testing Maturity (IN PROGRESS)

**Theme**: Developer experience, code health, and test coverage

#### Engineering

- **Split `geminiService.ts` into domain modules** ✅ Done
- **E2E test expansion (9 → 37 scenarios)** ✅ Done
- **Integration test suites for AI pipeline** ✅ Done (prompt, vision, audio, production services)
- **Coverage threshold ramp (19% → 21% lines)** ✅ Done — 965 tests across 55 files
- **Eliminate core `as any` casts** ✅ 8 removed from `geminiPromptService.ts`
- **Reusable `EmptyState` component** ✅ Done
- **Visual regression tests** ? Initial Playwright screenshot suite added
- Continue raising coverage toward 60% branch

#### UX

- **Visual Composer onboarding (step-by-step walkthrough)** ? Dedicated composer tutorial flow + toolbar tour trigger
- **Empty state improvements** ✅ EmptyState component created, adopted in StoryBoard
- **Progressive adoption of EmptyState in remaining panels** ? Expanded to History, Variations, Script Breakdown, Project Manager, Location Manager

#### Documentation

- **Update ROADMAP.md** ✅ Done
- **Create PRIVACY.md** ✅ Done
- **Fix README version inconsistencies** ✅ Done

---

### v2.4.0 — i18n & Routing

**Theme**: International support and navigation architecture

#### Features

- `react-i18next` integration with EN/ES/FR/JP/AR
- `react-router` with deep-linkable views
- Settings restructure (from modal → dedicated page)
- Theme system expansion (accent colors, presets)

#### Engineering

- Translation pipeline
- Route-based code splitting
- Settings migration utility

---

### v2.5.0 — AI Pipeline Resilience

**Theme**: Reliable, offline-friendly AI workflows

#### Features

- Offline generation queue with IndexedDB
- Circuit-breaker for API calls
- Streaming response support
- Model fallback chains
- Per-call cost estimate display

#### Engineering

- Generation queue service
- API health monitor
- Cost tracking service
- Enhanced retry with exponential backoff

---

### v2.6.0 — Collaboration Suite

**Theme**: Team workflows and sharing

#### Features

- ✅ Shareable project read-only links
- ✅ Comment system on timeline shots
- ✅ Presence indicators (Yjs awareness)
- ✅ Conflict resolution UI for CRDT merges
- ✅ Team workspace roles (viewer/editor/admin)
- ✅ User profile setup for collaboration identity

#### Engineering

- ✅ Auth layer (local identity, optional sign-in)
- ✅ Permission middleware (client-side role enforcement)
- ✅ Collaboration store (Zustand)
- ✅ Room management service (IDB-backed)
- ✅ Comment service with threading & reactions
- ✅ 119 unit tests (4 test suites)

---

### v3.0.0 — Full Platform

**Theme**: Cloud-native creative operating system

#### Features

- Cloud project storage and sync
- Marketplace monetization (paid plugins)
- Mobile-responsive PWA companion
- External model adapters (Runway, Kling, Luma)
- Per-project billing dashboard

#### Engineering

- Backend API (Node/Deno)
- Plugin payment flow
- CDN for generated assets
- Mobile layout system

---

## Governance (All Versions)

Every feature requires:

- README.md update
- CHANGELOG.md update
- Code comments where non-obvious
- Conventional commit messages
- Build passes before merge

No undocumented changes. No unversioned releases.
