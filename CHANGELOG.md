# Changelog

All notable changes to Veo Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-14

**Theme**: Platform Transformation

### Added

#### Visual Composer (Drag-and-Drop Prompt Block Builder)

- **Composer Types** (`src/core/types/composer.ts`) — `BlockType` (28 types), `BlockCategory` (8 categories), `BlockPort`, `BlockDefinition`, `PromptBlock`, `BlockConnection`, `CanvasViewport`, `ComposerState`, `PendingConnection`, `ComposerEvaluationResult`, `BlockEvaluationResult`, `TimelineLink`, `ComposerSnapshot`, `Position`, `BlockSize`, `ConnectionStyle`, `PortDataType`
- **ComposerService** (`src/core/services/composerService.ts`) — Singleton service with 28 block definitions across 8 categories (scene, character, camera, style, audio, effect, logic, output), block factory, connection validation, cycle detection (DFS), topological sort (Kahn's algorithm), graph evaluation with compiled prompt output, auto-layout algorithm, snap-to-grid
- **Composer Store** (`src/core/store/useComposerStore.ts`) — Zustand + Zundo temporal store for blocks, connections, viewport, selection, snapshots, timeline links, evaluation state, undo/redo history
- **ComposerCanvas** (`src/features/composer/ComposerCanvas.tsx`) — Main canvas with pan/zoom, drag-and-drop block placement, connection drawing, selection box, grid pattern, minimap overlay
- **BlockPalette** (`src/features/composer/BlockPalette.tsx`) — Searchable/filterable block palette with collapsible categories, drag-to-canvas initiation
- **PromptBlockNode** (`src/features/composer/PromptBlockNode.tsx`) — Block node renderer with header, port handles, inline field editing, collapse/disable/lock controls
- **ConnectionLine** (`src/features/composer/ConnectionLine.tsx`) — SVG connection rendering with bezier/straight/step path styles, selected state glow, active animation, inactive dashed style
- **ComposerToolbar** (`src/features/composer/ComposerToolbar.tsx`) — Toolbar with zoom controls, snap-to-grid toggle, auto-layout, connection style selector, evaluate, snapshot save, minimap toggle, select all, delete, clear canvas
- **BlockInspector** (`src/features/composer/BlockInspector.tsx`) — Inspector panel with field editing, connection list, timeline link management, evaluation results display
- **ComposerPanel** (`src/features/composer/ComposerPanel.tsx`) — Layout wrapper composing toolbar + palette + canvas + inspector with error boundaries
- **App.tsx Integration** — Lazy-loaded ComposerPanel with React.Suspense, conditional render on activeSection
- **Sidebar Integration** — 'Visual Composer' nav item with layers icon
- **38 unit tests** covering block registry, factory, connection validation, cycle detection, topological sort, graph evaluation, auto-layout, snap position

#### Extension Marketplace (Remote Plugin Install/Uninstall with Sandbox Execution)

- **Marketplace Types** (`src/core/types/marketplace.ts`) — `InstallState` (9 states), `InstallProgress`, `InstallResult`, `InstalledPluginBundle` (IDB-persisted), `SandboxMode` (worker|restricted|direct), `SandboxConfig`, `SandboxState`, `SandboxInfo`, `SandboxError`, `SandboxInMessage` (5 variants), `SandboxOutMessage` (7 variants), `PluginUpdateInfo`, `MarketplaceView`, `MarketplaceState`, `PendingConfirmation`
- **PluginSandboxService** (`src/core/services/pluginSandboxService.ts`) — Singleton service with Web Worker isolation (Blob URL worker, restricted globals, message protocol), restricted in-process mode, permission-gated API proxy, rate limiting, memory limits, sandbox lifecycle (create/activate/deactivate/destroy)
- **PluginInstallService** (`src/core/services/pluginInstallService.ts`) — Singleton service with 6-step install pipeline (download → SHA-256 checksum verification → manifest extraction → Ed25519 signature verification → IDB storage → sandbox activation), uninstall with cleanup, update checking, version comparison
- **Marketplace Store** (`src/core/store/useMarketplaceStore.ts`) — Zustand store with install progress tracking, installed bundles management, available updates, confirmation dialog flow (Promise-based), sandbox monitoring, error handling
- **MarketplacePanel** (`src/features/plugins/components/MarketplacePanel.tsx`) — Full marketplace UI with Browse/Installed/Updates tabbed views, search/category/sort filters, paginated results grid, entry detail with stats and install button, installed plugins list with uninstall, updates list with progress bars and new-permission warnings
- **InstallConfirmDialog** (`src/features/plugins/components/InstallConfirmDialog.tsx`) — Modal confirmation with trust badge, permission list with risk-level color coding (low/medium/high), sandbox notice for untrusted plugins, uninstall warning mode
- **SettingsModal Integration** — "Marketplace" tab replaces old "Registry" tab, rendering full MarketplacePanel

#### Production Desktop (Auto-Update, Crash Reporter, Telemetry, macOS Builds)

- **Desktop Production Types** (`src/core/types/desktopProduction.ts`) — `CrashSeverity`, `CrashSource`, `CrashReportState`, `CrashReport` (15-field interface), `CrashReporterConfig`, `CrashReporterState`, `TelemetryCategory` (7 values), `TelemetryEvent`, `TelemetryConfig`, `TelemetryState`, `UpdateStrategy`, `DiffUpdateState` (12 states), `BlockRange`, `Blockmap`, `DiffUpdateProgress`, `DiffUpdateConfig`, `RollbackSnapshot`, `DiffUpdateState_Full`, `DesktopHealthStatus`
- **CrashReporterService** (`src/core/services/crashReporterService.ts`) — Singleton service with global error/rejection handlers, rate-limited crash recording (30/min), IDB persistence, React ErrorBoundary integration, plugin crash isolation, PII sanitization, optional endpoint submission with retry logic, Electron main process forwarding
- **TelemetryService** (`src/core/services/telemetryService.ts`) — Privacy-first opt-in analytics (disabled by default), category-filtered event tracking, convenience methods (trackPerformance, trackFeature, trackPlugin, trackExport, trackUpdate), batch sync to endpoint, auto-sync timer, PII key stripping, IDB persistence
- **DifferentialUpdateService** (`src/core/services/differentialUpdateService.ts`) — Blockmap-based delta downloads, block-level diff calculation, selective block download with HTTP Range requests, SHA-256 checksum verification via crypto.subtle, staged install for next restart, rollback snapshot management, auto/differential/full strategy selection, fallback to full download
- **DesktopSettings** (`src/features/settings/desktop/components/DesktopSettings.tsx`) — Settings panel with 3 sub-tabs (Crash Reporting, Privacy & Telemetry, Update Strategy), crash report viewer with severity/source/timestamp, telemetry toggle with privacy notice, update strategy selector (auto/differential/full), rollback snapshot list, staged update banner
- **SettingsModal Integration** — New "Desktop" tab with monitor icon, fixed duplicate UpdateSettings rendering bug
- **Electron Main Process** (`electron/main.cjs`) — `crashReporter.start()` for native crash collection, `send-telemetry` IPC for NDJSON telemetry logging, `download-blockmap` IPC for blockmap JSON fetch, `download-block-range` IPC for HTTP Range block downloads, `create-rollback-snapshot` IPC for snapshot management, `get-crash-reports` IPC for native crash report access
- **Electron Preload** (`electron/preload.cjs`) — Exposed IPC channels: `sendTelemetry`, `downloadBlockmap`, `downloadBlockRange`, `createRollbackSnapshot`, `getCrashReports`
- **electron-builder Config** — Added GitHub publish provider, macOS DMG target (x64 + arm64) with hardened runtime and entitlements, macOS entitlements plist (`build/entitlements.mac.plist`)

#### Testing Maturity (Unit + Integration + CI Coverage + E2E + Build Reproducibility)

- **Global Test Setup** (`src/test-setup.ts`) — Centralized browser API mocks (matchMedia, crypto.subtle, URL.createObjectURL, AbortSignal.timeout), afterEach cleanup, guarded for non-jsdom environments
- **Coverage Thresholds** — Enforced in `vite.config.ts`: statements 30%, branches 25%, functions 25%, lines 30%; json-summary reporter for CI validation
- **CrashReporterService Tests** (`src/core/services/crashReporterService.test.ts`) — 30+ tests covering initialization, crash reporting, error boundary, unhandled rejection, plugin crash, submission, query, configuration, cleanup, subscription, rate limiting
- **TelemetryService Tests** (`src/core/services/telemetryService.test.ts`) — 35+ tests covering initialization, event tracking, convenience trackers, sync, query, configuration, cleanup, subscription, event pruning, session end
- **DifferentialUpdateService Tests** (`src/core/services/differentialUpdateService.test.ts`) — 20+ tests covering initialization, progress, config, staged updates, update strategies, cancellation, rollback, subscription
- **PluginInstallService Tests** (`src/core/services/pluginInstallService.test.ts`) — 20+ tests covering singleton, install pipeline (already installed, engine incompatible, download flow, failure), uninstall, update checking, query, progress, events
- **PluginSandboxService Tests** (`src/core/services/pluginSandboxService.test.ts`) — 28 tests covering sandbox modes (direct, restricted, worker), creation, activation, deactivation, destruction, permission checking (direct match, wildcard domain), subscription, destroyAll
- **useSettingsStore Tests** (`src/core/store/useSettingsStore.test.ts`) — 10+ tests covering defaults, partial updates, reset, persistence partialize (apiKey excluded), storage key
- **useMarketplaceStore Tests** (`src/core/store/useMarketplaceStore.test.ts`) — 20+ tests covering initial state, views, initialization, install with confirmation, uninstall, update checking, isInstalled, progress, confirmation flow, error clearing, sandbox refresh
- **CI: Coverage Enforcement** — validate.yml and build.yml run `vitest --coverage` and validate json-summary against thresholds
- **CI: E2E Smoke Tests** — New `e2e` job in validate.yml running Playwright chromium tests with artifact upload on failure
- **CI: Build Reproducibility** — build.yml double-build hash comparison (SHA-256 of all production JS/CSS assets)
- **App Initialization** — CrashReporterService, TelemetryService, DifferentialUpdateService initialized at app startup in `index.tsx`
- **Settings Store Wiring** — `enableAnalytics` and `enableCrashReporting` now connected to real service backends

## [1.9.0] - 2026-02-14

**Theme**: Platform Foundations

### Added

#### Multi-Workspace Support

- **Workspace Types** (`src/core/types/workspace.ts`) — `Workspace`, `WorkspaceMetadata`, `WorkspaceSettings`, `WorkspaceSettingsOverrides`, `CreateWorkspaceData`, `ResolvedSetting`, `SettingSource` interfaces
- **WorkspaceService** — Singleton service for workspace CRUD, project grouping, default workspace migration, idb-keyval storage with `workspace_` prefix
- **Workspace Store** (`useWorkspaceStore`) — Zustand store with persist middleware for workspace state management (create, update, delete, switch, search)
- **WorkspaceSwitcher** — Sidebar dropdown with workspace list, inline create, color-coded dots, collapsed mode support, keyboard navigation
- **WorkspaceManagerModal** — Full CRUD modal with list/create/settings views, inline rename, delete confirmation with project migration warning, color picker
- **ProjectService Integration** — Projects are workspace-scoped; `createProject` auto-assigns to current workspace; `moveProjectBetweenWorkspaces` support added
- **Data Migration** — Default workspace auto-created on first run; existing projects assigned to default workspace idempotently

#### Workspace-Level Settings

- **Settings Resolution Types** — `OverridableSettingKeys`, `ResolvedSetting<T>`, `SettingSource` for layered settings hierarchy
- **SettingsResolutionService** — Resolves settings in order: workspace-level → global-level → hard-coded defaults; type-safe per-key resolution with source tracking
- **WorkspaceSettingsPanel** — Toggle-based override panel for 6 overridable settings (autoSave, autoSaveInterval, defaultExportFormat, defaultExportQuality, compactMode, enableExperimentalFeatures) with "Reset All to Global" button
- **`useResolvedSettings` Hook** — Returns resolved settings for current workspace context with source tracking per key, stale-closure guards, and fallback to global settings

#### Remote Plugin Registry Foundation

- **Registry Types** (`src/core/types/registry.ts`) — `RegistryEntry`, `RegistryIndex`, `RegistrySearchParams`, `RegistrySearchResult`, `RegistryConfig`, `RegistryCategory` (9 categories), `RegistrySortField`
- **RegistryService** — Singleton service for fetching/caching remote registry index (static JSON), search/filter with pagination, TTL-based cache, graceful offline fallback
- **Registry Store** (`useRegistryStore`) — Zustand store for registry browsing state (entries, search, categories, tags, selection, loading/error)
- **RegistryBrowser** — Full browse/search panel with real-time search, category/sort filters, paginated grid of entry cards, entry detail panel with stats/permissions/tags, disabled install button ("Coming in v2.0")
- **RegistryEntryCard** — Card component with category badge (color-coded), star rating, download count, size, date, tags
- **Registry Configuration** — `registryUrl` field added to settings store; configurable registry URL in Settings → General with validation

#### Plugin Signing System (Ed25519)

- **Plugin Signing Types** — `PluginSignature`, `PluginVerificationResult`, `PluginTrustLevel` ('trusted' | 'untrusted' | 'unsigned' | 'invalid') added to plugin type system
- **Crypto Utilities** (`src/core/utils/pluginCrypto.ts`) — Ed25519 key generation, manifest signing, signature verification using Web Crypto API (SubtleCrypto); deterministic field ordering; ECDSA P-256 fallback for environments without Ed25519 support
- **Trusted Keys Store** (`src/core/config/trustedKeys.ts`) — Bundled trusted public key entries for signature verification
- **PluginService Integration** — Signature verification on plugin load; `trustLevel` field set per plugin; `getTrustLevel()`, `refreshTrustLevel()`, `getPluginsByTrust()` methods added; soft enforcement (warnings only) in v1.9.0
- **TrustBadge** — Shield icon badge component (green=trusted, amber=untrusted, gray=unsigned, red=invalid) with tooltip and accessible screen reader text; shown next to plugins in PluginList

### Changed

- **Sidebar** — WorkspaceSwitcher added above "Current Project" section; new `onOpenWorkspaceManager` prop
- **SettingsModal** — New "Registry" tab for RegistryBrowser; registry URL configuration in General tab
- **PluginList** — TrustBadge rendered next to each plugin name
- **App.tsx** — Workspace manager modal state and render; `onOpenPlugins` callback now opens Settings (plugins tab)
- **Plugin barrel exports** updated with RegistryBrowser, RegistryEntryCard, TrustBadge

### Engineering

- 22 new files created across types, services, stores, utilities, config, hooks, and UI components
- 13 existing files modified for integration
- Full unit test coverage for workspace service, workspace store, registry service, settings resolution, and crypto utilities
- 0 type errors, 0 lint errors, all tests passing

---

## [1.8.0] - 2026-02-15

**Theme**: Workflow Automation & Batch System

### Added

#### Batch Prompt Generation

- **BatchPromptService** — Generate multiple prompt variations from a single idea with configurable count, target model, and creativity settings
- **BatchGeneratorModal** — Full modal UI for batch generation with progress tracking and inline results
- **Batch Prompt Store** (`useBatchPromptStore`) — Zustand store managing batch state, progress, and results

#### Multi-Scene Export

- **SceneExportService** — Export individual scenes or all scenes in bulk; supports JSON, TXT, and Markdown formats with per-scene or consolidated output
- Export includes scene metadata (duration, shot count, transition info)

#### Export Profiles

- **Model Profiles Config** (`modelProfiles.ts`) — 7 pre-configured export profiles: 4 Veo (Cinematic, Social, Abstract, Fast Draft) + 3 Sora (Cinematic, Social, Extended)
- `applyProfile()` merges profile defaults into PromptState with one call
- Profile metadata includes recommended aspect ratios, max duration, and tags

#### Project Export Bundles

- **ProjectBundleService** — Package entire projects into zip bundles with manifest.json, scene exports, settings, and version metadata
- Configurable: include/exclude scenes, settings, history
- Validation and manifest generation for reproducible builds

#### CLI Mode for Headless Generation

- **CLI Entry Point** (`src/cli/index.ts`) — Node.js CLI with `generate`, `export`, and `profiles` commands
- **Generate Command** — `veo generate --idea "..." [--profile, --api-key, --format, --offline]` for API-powered or offline prompt generation
- **Export Command** — `veo export --input file.json --format markdown` for format conversion
- **Profiles Command** — `veo profiles` to list available model profiles
- API key resolution chain: `--api-key` flag → `VEO_API_KEY` env → `GEMINI_API_KEY` env → error
- Offline mode builds prompts locally without API calls
- Output formats: JSON, TXT, Markdown; pipe-friendly (stdout/stderr separation)
- Uses Node.js built-in `parseArgs` — zero additional CLI dependencies

#### Job Queue & Background Processing

- **JobQueueService** — Priority-based job queue with configurable concurrency, automatic retries, and timeout handling
- **Job Queue Store** (`useJobQueueStore`) — Zustand store for reactive job status tracking
- **JobsPanel** — Sidebar panel showing active/completed/failed jobs with progress bars and action buttons

### Engineering

- 226 new unit tests across 7 test files (28 CLI + 17 batch + 46 scene + 58 profile + 53 bundle + 24 queue)
- `tsx` added as dev dependency for CLI execution
- Package version bumped to 1.8.0
- 0 type errors, 0 lint warnings

---

## [1.7.0] - 2026-02-14

**Theme**: Architecture Hardening, Plugin API v1 & Project Intelligence Layer

### Added

#### Project Intelligence

- **Project Health Scoring** — 4-dimension health score (Content Completeness, Prompt Quality, Timeline Completeness, Project Organization) with tier system (Excellent/Good/Needs Work/Critical) and circular progress badge
- **Scene Consistency Validator** — Validates character/location references, transition patterns, duration sanity (zero/negative, >60s), style drift detection, and cross-scene character continuity
- **Timeline Integrity Checker** — Detects timeline gaps (>0.1s), clip overlaps, orphan clips referencing deleted shots, and unlinked shots without timeline clips
- **Dependency Map Visualization** — SVG radial layout graph showing project → characters → locations → shots → clips dependency relationships with color-coded nodes and edge types
- **Diagnostics Panel** — Full modal panel with 3 tabs (Issues, Health Score, Dependency Map), severity/category filtering, dismissable issues with fix actions
- **Health Badge** — Compact circular SVG progress indicator for sidebar with color-coded health tier

#### Analysis Engine

- **Project Analysis Service** (`projectAnalysisService`) — Singleton orchestrator running health scoring, scene consistency, timeline integrity, and dependency mapping in a single pass
- **Analysis Worker** (`analysisWorker.ts`) — Web Worker for background analysis with 30s timeout and synchronous fallback
- **Diagnostics Store** (`useDiagnosticsStore`) — Zustand store with severity/category filtering, auto-analyze toggle, issue dismissal, and computed selectors

#### Prompt Quality Refinement

- **Quality Dimension Breakdown** — `QualityDimension` interface with 5 refined scoring dimensions: Core Content (30), Visual Style (20), Cinematic Properties (20), Environment & Lighting (20), Character & Constraints (15)
- **New Scoring Criteria** — Detailed Vision (idea > 100 chars), Custom Art Style, Sensory Details, Character Nuances, Visual DNA Lock, Voice Direction

#### Documentation

- **Plugin API Reference** (`docs/PLUGIN_API.md`) — Comprehensive API documentation covering StudioPlugin contract, manifest schema, PluginContext, all API surfaces (UI, Data, Export, Settings, Storage, Events, Logger), permission system, health tracking, semver engine, internal plugins, lifecycle state machine, and full type reference
- **Architecture Diagrams v2** (`docs/ARCHITECTURE_DIAGRAMS.md`) — New plugin system architecture diagram, plugin error boundary flow diagram, and service layer architecture diagram
- **Extension Development Guide** (`docs/PLUGIN_DEVELOPMENT.md`) — Rewritten with StudioPlugin interface examples, internal plugin pattern, version compatibility ranges, health tracking documentation, and 4 complete example plugins (Hello World, Markdown Export, Prompt Enhancer, Internal Studio)

#### Types

- **Diagnostic Types** (`src/core/types/diagnostics.ts`) — 18 new types/interfaces: `DiagnosticIssue`, `DiagnosticSeverity`, `DiagnosticCategory`, `ProjectHealthScore`, `HealthTier`, `HealthDimension`, `SceneConsistencyResult`, `ShotConsistencyDetail`, `TimelineIntegrityResult`, `TimelineGap`, `TimelineOverlap`, `DependencyMap`, `DependencyNode`, `DependencyEdge`, `AnalysisResult`, `AnalysisRequest`, `AnalysisWorkerMessage`

#### Testing

- **26 new unit tests** for `projectAnalysisService` covering health scoring, scene consistency, timeline integrity, dependency map, quickHealthCheck, and issue sorting
- **Total: 202 tests passing across 15 files**

### Changed

#### UI Integration

- **Sidebar** — Added "Diagnostics" nav item with issue count badge
- **App.tsx** — Lazy-loaded DiagnosticsPanel with Suspense boundary, wired diagnostics store

#### Documentation

- **Architecture Diagrams** — Updated to v2 with plugin system, error boundary flow, and service layer visualizations
- **ARCHITECTURE.md** — Added Plugin System section with component file map, updated test count to 202 tests across 15 files, corrected bundle size reference
- **PLUGIN_DEVELOPMENT.md** — Migrated from function-based hooks to typed `StudioPlugin` interface pattern, added `engineVersion` semver range documentation, added crash isolation section, added internal plugin registration pattern

#### Quality

- **0 lint warnings**, **0 type errors**, **202 tests passing**, build passing (655 KB main chunk)

## [1.6.0] - 2026-02-14

**Theme**: Performance & Stability — Make the system fast, reliable, and scalable.

### Added

#### Performance

- **Performance Marks** — `performance.mark/measure` instrumentation for app startup, prompt generation, and export-prompt flows via `performanceService`
- **ShotCard Component** — React.memo'd shot row extracted from StoryBoard (~180 lines), prevents unnecessary re-renders
- **useRafDebounce Hook** — requestAnimationFrame-based debounce for high-frequency timeline events (scrub, drag, scroll)
- **Bundle-Size Budget CI** — New CI step enforcing 800 KB main chunk / 3,000 KB total thresholds

#### Plugin System

- **StudioPlugin Interface Contract** — Formal `StudioPlugin` interface with typed `activate`, `deactivate`, and `dispose` lifecycle hooks
- **Plugin Health Tracking** — `PluginHealth` type with status (healthy/degraded/crashed), crash count, auto-disable at 3 crashes
- **PluginErrorBoundary** — Specialized error boundary for plugin crash isolation with retry/disable controls
- **Semver Utility** — Lightweight semver parser supporting exact, caret (`^`), tilde (`~`), and gte (`>=`) range matching
- **Plugin Data API Wiring** — `getProjects()`, `getProject()`, `saveProject()`, `getHistory()`, `getTemplates()` delegate to real services via dynamic imports
- **Plugin State Filtering** — Studios hide when parent plugin is disabled; `pluginService` tracks UI element ownership
- **Video Generation Studio Plugin** — Decoupled from core using `useVideoStore` and `videoGenerationService`

#### Architecture

- **App.tsx Decomposition** — 1,456 → ~612 lines via 7 extracted hooks and section components
- **Typed Electron Bridge** — `getElectron()` and `isElectronEnvironment()` replace all `(window as any).electron` casts
- **Custom Test Utilities** — Shared render with providers and userEvent setup
- **Extracted Hooks** — `usePromptOptions`, `useHelpPanel`, `useSafeMode`, `useGenerationState`, `useToastManager`, `useAppInitialization`, `useAppHandlers`
- **Database optimize()** — History trimming (configurable max entries) + orphan record removal
- **UI Component Consolidation** — Merged legacy `src/components/ui/` into `src/shared/components/ui/`; deleted 12 dead components

#### Stability

- **Safe Mode Reset IPC** — `reset-safe-mode` IPC handler + preload API; exit safe mode resets both localStorage and Electron crash counter
- **Migration Hydration Test** — 5 tests verifying legacy persisted data hydration
- **PR Changelog Validation CI** — Enforces `CHANGELOG.md` updates on PRs with code changes

#### Testing

- **Test Coverage: 44 → 176 tests** across 14 test files
- **Semver Tests** — 15 tests for `parseSemver`, `compareSemver`, `satisfiesSemver`
- **Plugin Lifecycle Tests** — 16 tests: health tracking, version compatibility, typed lifecycle, manifest validation
- **Database Service Tests** — 22 tests for optimize, history trimming, orphan cleanup
- **Template Manager Tests** — 24 tests for CRUD, validation, import/export
- **Autosave Service Tests** — 26 tests for auto-save lifecycle, debounce, recovery
- **History, Toast, Error Handler Tests** — 25 tests across 3 files
- **Playwright E2E Infrastructure** — 9 tests across smoke and workflow specs

### Changed

#### Performance

- **60% Main Bundle Reduction** — Main chunk from 1,595 KB → 655 KB via dynamic `import()` for FFmpeg, MediaPipe, and Transformers
- **Vite Chunk Splitting** — 4 manual chunks: `vendor` (React), `state` (Zustand), `export` (jsPDF/JSZip), `collaboration` (Yjs)
- **StoryBoard Optimization** — `<ShotCard>` component with `useCallback` to reduce re-render cost

#### Security Hardening

- **Electron `webSecurity`** — Changed from `false` to `true`, closing a critical security gap
- **Electron `sandbox`** — Enabled `sandbox: true` for renderer process isolation
- **DevTools** — Now conditional on `!app.isPackaged` (disabled in production)

#### Stability & UX

- **Safe Mode Threshold** — Increased from 2 to 3 abnormal exits before triggering safe mode
- **Hotkey Conflict Resolution** — `RESERVED_COMBOS` set, modal suppression, browser-native undo/redo passthrough
- **Settings Store Partialize** — `useSettingsStore` excludes `apiKey` from IndexedDB persistence
- **Blob URL Lifecycle Cleanup** — `useSceneAmbience`, `useDirectorsChain`, and StoryBoard SFX track and revoke blob URLs on unmount
- **Yjs Race Condition Mitigation** — `AbortController` cancels stale connection attempts; stale-closure guards on callbacks

#### Plugin System

- **Typed Plugin Instances** — `Plugin.instance` typed as `StudioPlugin` instead of `any`
- **Direct Lifecycle Dispatch** — Plugin hooks invoked via typed interface methods instead of dynamic string-based dispatch
- **All 3 Studio Plugins** — `VideoStudioPlugin`, `AudioStudioPlugin`, `ImageStudioPlugin` implement `StudioPlugin` interface
- **Semver Engine Compatibility** — `checkVersionCompatibility()` uses proper semver comparison

#### Type Safety

- **TypeScript Errors: 68 → 0** — Full type resolution across all services
- **`as any` Casts: 69 → 62** — Replaced with proper typing
- **`tsconfig.json`** — Added `forceConsistentCasingInFileNames: true`

#### CI & DevOps

- **LF Line Endings** — `.gitattributes` enforces LF across all text files
- **GitHub Actions** — Updated `actions/checkout`, `actions/setup-node`, `actions/upload-artifact` to v6
- **Dependabot Changelog Exemption** — Dependabot PRs no longer blocked by changelog validation
- **ESLint Plugins** — Added `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`
- **0 lint warnings**, **0 type errors**, build passing (655 KB main chunk)

#### Architecture Cleanup

- **Eliminated Duplicate State** — `currentProjectId`/`currentProjectName` derived from `useProjectStore`
- **Named Export** — `App.tsx` converted from default to named export
- **Project Store** — Added `clearCurrentProject()` action
- **Toast Warning Type** — `ToastMessage.type` now supports `'warning'` with amber styling

### Fixed

- **Dependency Refresh** — Clean `node_modules` reinstall resolving broken vite binary and stale dependency tree
- **Nested Directory Cleanup** — Removed accidentally cloned nested directory that doubled ESLint warnings
- Null-safety fixes in `geminiService`, `pluginService`, `updateService`, `cameraPhysics`
- Fixed `ApiErrorType` string enum reverse lookup in `errorHandler`
- Fixed `VideoGenerationProgress` stage key indexing
- Fixed `SettingsModal` optional `onApiKeySet` prop forwarding
- Fixed `updateService.electronDownload` to match `ElectronAPI` signatures

## [1.5.0] - 2026-02-10 (Merged into v1.6.0)

### Added

- **Panel Error Boundaries (baseline)** - Studio and overlay failures are now isolated at panel level instead of collapsing the full app shell.
- **Performance Profiler Service (baseline)** - Added `performanceProfiler` for hydration and studio-open latency measurements with structured log output.
- **v1.5.0 Workflow Plan** - Added sprint-level implementation plan at `.agent/workflows/v1.5.0-performance-stability.md`.
- **Electron Safe Mode (baseline)** - Added crash-loop and manual (`--safe-mode`) detection path with renderer-visible status for stability-first startup.

### Changed

- **Studio Opening Path** - Added studio-open timing marks in modal/studio orchestration for initial performance baseline.
- **Lazy Overlay Loading** - Global Search, Variables, and New Project Wizard now lazy-load only when opened.
- **Studio Loading UX** - Replaced blocking backdrops with structured loading skeletons for heavy studios.
- **Safe Mode UX** - Added safe-mode notice in Settings and temporary blocking of heavy studios when safe mode is active.

## [1.1.0] - 2026-02-09

### Added

- **Centralized Settings Store** - Persistent settings system with IndexedDB storage
  - Auto-save configuration
  - API settings management
  - UI preferences (tooltips, compact mode)
  - Performance settings
  - Export preferences
  - Privacy controls
- **Structured Logging System** - Comprehensive logging service with multiple log levels
  - Console output with appropriate styling
  - In-memory log buffering (last 1000 entries)
  - File output for errors in Electron
  - Log export functionality
  - Configurable log levels (DEBUG, INFO, WARN, ERROR, FATAL)
- **Enhanced Error Handling** - Integrated logging into error handler
  - Automatic error logging with context
  - Improved error categorization
  - Better error messages for users
- **CI/CD Pipeline** - Automated build and release system
  - GitHub Actions workflow for Linux and Windows builds
  - Automatic artifact upload to releases
  - Release notes extraction from CHANGELOG
- **Documentation** - Comprehensive project documentation
  - CHANGELOG.md with full version history
  - CONTRIBUTING.md with development guidelines
  - LICENSE file (MIT)
  - Issue templates (bug report, feature request)
  - Pull request template
  - Workflow documentation
- **Project Structure** - Improved organization
  - `.github` directory with templates and workflows
  - `.agent/workflows` for development workflows
  - Better separation of concerns

### Changed

- **Version Scheme** - Switched to semantic versioning starting from 1.1.0
  - Previous version 3.5.0 represents pre-roadmap state
  - All future versions follow strict semver
- **State Management** - Enhanced Zustand store architecture
  - Persistent settings separated from app state
  - Better state hydration/dehydration
- **Error Logging** - All errors now logged with appropriate context
  - Network and service errors logged as warnings
  - Critical errors logged with full stack traces

### Fixed

- Improved error handling throughout the application
- Better TypeScript type safety in error handling
- Consistent logging across all services

### Documentation

- Complete CHANGELOG with historical changes
- Development guidelines in CONTRIBUTING.md
- Issue and PR templates for better collaboration
- CI/CD documentation in workflow files

## [1.4.0] - 2026-02-10

### Added - v1.4.0 Week 5: Auto-Update System + Release Channels

- **Auto-Update Service** - Automatic update detection and installation
  - GitHub Releases API integration for update checking
  - Semantic version comparison for update detection
  - Platform-specific asset detection (Linux AppImage, Windows EXE)
  - Download progress tracking with real-time updates
  - Configurable auto-check intervals (30 minutes to 24 hours)
  - Update notification system with subscription pattern
  - LocalStorage persistence for user preferences
  - Background update downloads
  - Install and restart functionality
- **Release Channel System** - Multi-channel release management
  - Stable channel for production-ready releases
  - Beta channel for early access to new features
  - Dev channel for latest development builds
  - Channel-specific update filtering
  - Channel switcher in settings
  - Pre-release detection and tagging
- **Update UI Components** - User-friendly update management
  - UpdateNotification component with toast-style notifications
  - Download progress indicator with percentage
  - Changelog preview in notification
  - "Remind Me Later" and "Install Now" options
  - UpdateSettings panel with comprehensive controls
  - Release channel selector with descriptions
  - Auto-check, auto-download, and auto-install toggles
  - Manual "Check for Updates" button
  - Last check timestamp display
- **Electron Integration** - Desktop app update support
  - IPC handlers for download and install operations
  - Download manager with progress reporting
  - Platform information exposure (OS, architecture, version)
  - Secure context bridge with preload script
  - Install and restart functionality
  - Background download support
- **Configuration & Types** - TypeScript support and environment setup
  - Vite environment variable declarations
  - Electron API interface definitions
  - App version injection from package.json
  - Comprehensive type safety for update system
  - UpdateConfig, ReleaseInfo, and UpdateStatus interfaces

### Changed

- **Vite Configuration** - Enhanced build configuration
  - Inject app version from package.json into environment
  - Version available at `import.meta.env.VITE_APP_VERSION`
- **Electron Main Process** - Enhanced with update capabilities
  - Added IPC handlers for update operations
  - Download manager with progress events
  - Platform information API
  - Preload script for secure renderer communication
- **App Integration** - Update system initialization
  - UpdateNotification component rendered at app root
  - Update service initialized on app mount
  - Cleanup on app unmount

### Technical

- **Services Added**:
  - `updateService.ts` - Update detection, download, and installation
- **Components Added**:
  - `components/updates/UpdateNotification.tsx` - Update notification UI
  - `components/updates/UpdateSettings.tsx` - Update settings panel
- **Electron Files Added**:
  - `electron/preload.cjs` - Secure context bridge for updates
- **Types Added**:
  - `vite-env.d.ts` - Vite and Electron API type declarations
- **Configuration Updated**:
  - `vite.config.ts` - Version injection and environment setup
  - `electron/main.cjs` - IPC handlers and download manager
- **Features**:
  - Multi-channel release support (stable/beta/dev)
  - Automatic update detection and notification
  - Download progress tracking
  - One-click install and restart
  - Configurable auto-update behavior
  - Platform-specific installer detection
  - Changelog preview before update
  - User-controlled update preferences

### Documentation

- Created Week 5 implementation summary
- Documented update service API
- Added update flow documentation
- Documented release channel system

### Added - v1.4.0 Week 4: Plugin Architecture Foundation

- **Plugin System Core** - Extensible plugin architecture
  - Plugin manifest schema (JSON) with metadata, permissions, and extension points
  - Plugin lifecycle management (load, unload, activate, deactivate)
  - Plugin state tracking (unloaded, loaded, active, inactive, error)
  - Plugin versioning and engine compatibility checks
  - Plugin dependency management
  - Comprehensive TypeScript type definitions for plugin development
- **Plugin Permission System** - Granular permission control
  - 15+ permission types for fine-grained access control
  - Storage permissions (read, write, full access)
  - Data permissions (projects, history, templates - read/write)
  - UI permissions (sidebar, toolbar, modal registration)
  - Event permissions (subscribe, publish)
  - Export permissions for custom formats
  - Permission validation before API access
  - Permission caching for performance
- **Plugin API** - Rich API for plugin developers
  - UI API: Register sidebar items, toolbar buttons, and modals
  - Data API: Access projects, history, and templates
  - Export API: Register custom export formats
  - Settings API: Plugin-specific configuration management
  - Storage API: Isolated plugin data storage with IndexedDB
  - Events API: Subscribe and publish application events
  - Logger API: Structured logging for plugins
  - Notification API: Show user notifications
- **Plugin Manager UI** - User-friendly plugin management
  - Plugin list with state indicators (active, inactive, error)
  - Plugin details view with metadata and permissions
  - Install plugin from manifest JSON
  - Activate/deactivate plugins with one click
  - Uninstall plugins with confirmation
  - Plugin settings configuration
  - Extension points visualization
  - Error display for failed plugins
  - Responsive design for all screen sizes
- **Plugin Storage** - Isolated data storage
  - IndexedDB-based storage per plugin
  - Namespaced keys to prevent conflicts
  - Full CRUD operations (get, set, delete, clear, keys)
  - Permission-based access control
  - Persistent storage across sessions
- **Plugin Events** - Event-driven architecture
  - Subscribe to application events
  - Publish custom plugin events
  - Event handler registration and cleanup
  - Error handling in event handlers
  - Permission-based event access
- **Example Plugins** - Reference implementations
  - Hello World plugin - Basic structure and lifecycle
  - Markdown Export plugin - Custom export format
  - Prompt Enhancer plugin - Data access and UI integration
  - Complete manifest examples with all features
- **Plugin Development Documentation** - Comprehensive guide
  - Plugin structure and manifest schema
  - Permission system documentation
  - API reference with code examples
  - Lifecycle hooks explanation
  - Best practices and security considerations
  - Example plugins with step-by-step tutorials
  - Publishing guidelines (coming soon)
- **Sidebar Integration** - Plugin access in navigation
  - Plugins menu item in sidebar
  - Quick access to Plugin Manager
  - Plugin count badge (future enhancement)

### Changed

- **Sidebar Component** - Added Plugins navigation item
  - New `onOpenPlugins` prop for plugin manager access
  - Plugins menu item between Templates and Storyboard
  - Puzzle icon for plugins
- **Type System** - New plugin type definitions
  - `types/plugin.ts` with comprehensive interfaces
  - Plugin manifest, context, API, and registry types
  - Extension point and permission type definitions

### Technical

- **Services Added**:
  - `pluginService.ts` - Plugin lifecycle and API management
- **Stores Added**:
  - `pluginStore.ts` - Plugin state management with Zustand
- **Components Added**:
  - `PluginManager.tsx` - Plugin management UI
  - `InstallPluginModal.tsx` - Plugin installation dialog
- **Types Added**:
  - `types/plugin.ts` - Plugin system type definitions
- **Examples Added**:
  - `examples/plugins/hello-world/` - Basic plugin example
  - `examples/plugins/markdown-export/` - Export format plugin
  - `examples/plugins/prompt-enhancer/` - Advanced plugin example
- **Documentation Added**:
  - `docs/PLUGIN_DEVELOPMENT.md` - Plugin development guide
  - `examples/plugins/README.md` - Example plugins overview
- **Features**:
  - Plugin loading and lifecycle management
  - Permission-based API access
  - Isolated plugin storage
  - Event-driven plugin communication
  - Plugin settings management
  - Extension point system
  - Plugin Manager UI
  - Example plugins for reference

### Documentation

- Created comprehensive plugin development guide
- Documented plugin manifest schema
- Added API reference with examples
- Documented permission system
- Added best practices and security guidelines
- Created example plugins with documentation

### Added - v1.4.0 Week 3: Accessibility Improvements

- **Keyboard Navigation System** - Full keyboard navigation support
  - Custom hooks for keyboard event handling (`useKeyboardNavigation`)
  - Focus trap implementation for modals and dialogs (`useFocusTrap`)
  - Roving tabindex navigation for lists and menus (`useRovingTabIndex`)
  - Tab/Shift+Tab navigation throughout the application
  - Escape key to close modals and dialogs
  - Enter/Space to activate buttons and controls
  - Arrow key navigation for interactive elements
- **Skip Links** - Accessibility navigation shortcuts
  - "Skip to main content" link for keyboard users
  - Visible on focus with smooth scroll behavior
  - Positioned at top of page for immediate access
- **Screen Reader Support** - Comprehensive ARIA implementation
  - ARIA labels for all interactive elements
  - ARIA live regions for dynamic content announcements
  - ARIA descriptions for complex components
  - Proper heading hierarchy (h1 → h2 → h3)
  - Screen reader-only text for context (`.sr-only` class)
  - ARIA utilities for managing accessibility attributes
  - Announcement system for user actions and state changes
- **Accessibility Context** - Global accessibility settings management
  - Reduced motion preference detection and control
  - High contrast mode with enhanced color contrast
  - Font size adjustment (75% to 200%)
  - Screen reader announcement toggle
  - Keyboard navigation enable/disable
  - Focus indicator visibility control
  - System preference detection (prefers-reduced-motion, prefers-contrast)
  - Persistent settings in localStorage
- **Accessibility Settings Panel** - User-facing accessibility controls
  - Comprehensive settings UI for all accessibility options
  - Real-time preview of accessibility changes
  - Reset to defaults functionality
  - Keyboard shortcuts reference guide
  - Screen reader announcements for setting changes
  - Responsive design for all screen sizes
- **WCAG 2.1 AA Compliance** - Color contrast and visual accessibility
  - Color contrast ratios: 4.5:1 for normal text, 3:1 for large text
  - WCAG AA compliant color palette for light and dark themes
  - Primary colors: Blue (#2563eb - 4.54:1 on white)
  - Semantic colors: Success (#059669), Error (#dc2626), Warning (#d97706)
  - Text colors with proper contrast ratios (15.3:1 to 3.54:1)
  - High contrast mode with black/white color scheme
  - Focus indicators with 3px amber outline (#fbbf24)
  - Minimum touch target size (44x44px) for interactive elements
- **Reduced Motion Support** - Respect user motion preferences
  - CSS class for reduced motion (`.reduced-motion`)
  - Media query support for `prefers-reduced-motion`
  - Disabled animations and transitions when enabled
  - Smooth scroll behavior override
  - Animation duration reduced to 0.01ms
- **Focus Management** - Enhanced focus indicators
  - Visible focus outlines (3px solid with 2px offset)
  - Focus-visible pseudo-class support
  - Custom focus color (amber #fbbf24)
  - Focus trap for modals and dialogs
  - Focus restoration after modal close
  - Keyboard navigation active state
- **ARIA Utilities** - Helper functions for accessibility
  - `generateAriaId()` - Generate unique ARIA IDs
  - `announceToScreenReader()` - Announce messages to screen readers
  - `setAriaExpanded()`, `setAriaPressed()`, `setAriaSelected()` - State management
  - `createLiveRegion()`, `updateLiveRegion()` - Live region management
  - `getFocusableElements()` - Query focusable elements
  - `trapFocus()` - Implement focus trapping
  - `createFocusRestorer()` - Restore focus after interactions
  - User preference detection (reduced motion, high contrast, dark mode)
- **Accessibility Styles** - Global WCAG-compliant CSS
  - Screen reader-only utility class (`.sr-only`)
  - Focus-visible styles for keyboard navigation
  - High contrast mode styles
  - Reduced motion styles
  - Accessible form input styles with clear states
  - Error and success message styles with icons
  - Loading state indicators
  - Accessible tooltip styles
  - Modal/dialog accessibility styles
  - Print styles for accessible printing

### Changed

- **App Integration** - Wrapped app with AccessibilityProvider
  - Accessibility context available throughout the application
  - Global accessibility styles imported
  - System preferences automatically detected on load
- **Index.tsx** - Updated app providers
  - Added AccessibilityProvider wrapper
  - Imported accessibility.css for global styles
  - Proper provider nesting (Accessibility → Onboarding → App)

### Technical

- **Components Added**:
  - `src/components/accessibility/SkipLink.tsx` - Skip to main content link
  - `src/components/accessibility/AccessibilitySettings.tsx` - Settings panel
  - `src/components/accessibility/index.ts` - Barrel export
- **Contexts Added**:
  - `src/contexts/AccessibilityContext.tsx` - Global accessibility state
- **Hooks Added**:
  - `src/hooks/useKeyboardNavigation.ts` - Keyboard navigation utilities
- **Utilities Added**:
  - `src/utils/ariaUtils.ts` - ARIA helper functions
- **Styles Added**:
  - `src/styles/accessibility.css` - WCAG 2.1 AA compliant styles
- **Features**:
  - Full keyboard navigation support
  - Screen reader compatibility
  - WCAG 2.1 AA color contrast compliance
  - Reduced motion support
  - High contrast mode
  - Adjustable font sizes
  - Focus management and trapping
  - ARIA live regions for announcements

### Documentation

- Updated CHANGELOG with v1.4.0 Week 3 features
- Accessibility utilities documented in code
- ARIA patterns and best practices implemented
- Keyboard shortcuts documented in settings panel

### Added - v1.4.0 Week 2: Onboarding Flow

- **Welcome Screen** - First-time user onboarding experience
  - Welcome modal on first launch with product highlights
  - Feature showcase with 4 key capabilities (Projects, Templates, Export, History)
  - Animated logo and gradient design
  - "Take the Tour" and "Skip for Now" options
  - Onboarding completion tracking in localStorage
  - Responsive design for mobile and desktop
- **Interactive Tutorial System** - Step-by-step guided tour
  - 6-step tutorial overlay with spotlight highlighting
  - Contextual tooltips positioned around target elements
  - Progress indicator showing current step (e.g., "Step 2 of 6")
  - Visual progress bar with gradient fill
  - Navigation controls (Previous, Next, Skip Tour, Finish)
  - Smooth animations and transitions
  - Backdrop with blur effect and spotlight cutout
  - Arrow indicators pointing to highlighted elements
  - Tutorial steps cover: Welcome, Create Project, Generate Prompt, Templates, Export, Advanced Features
  - Restart tutorial functionality from Help Panel
- **Help Panel** - Comprehensive help center
  - Searchable help topics with fuzzy search
  - Category-based organization (Getting Started, Features, Advanced, Troubleshooting)
  - Topic detail view with formatted content
  - Keyboard shortcuts reference
  - FAQ section
  - Direct topic/category navigation support
  - "Restart Tutorial" button in footer
  - Link to external documentation
  - Smooth slide-in animation from right
  - ESC key to close
  - Responsive design for all screen sizes
- **Contextual Help System** - Inline help throughout the UI
  - Context-aware help buttons (? icon) in prompt builder sections
  - Tooltip-based help with "Learn more" action
  - Integration with Help Panel for deep-dive topics
  - Help triggers on Prompt Idea and Reference Image inputs
  - Consistent styling and placement
  - Support for both tooltip and help panel navigation
- **Onboarding Context** - State management for onboarding flow
  - React Context API for global onboarding state
  - Persistent state in localStorage
  - Tutorial step tracking and navigation
  - Welcome screen shown/hidden state
  - Tutorial completion tracking
  - `startTutorial()`, `nextStep()`, `previousStep()`, `skipTutorial()` actions
  - `completeTutorial()`, `resetOnboarding()`, `restartTutorial()` methods
  - `setWelcomeShown()` and `goToStep()` utilities
  - Timestamp tracking for analytics
- **Keyboard Shortcuts for Help** - Quick access to help
  - `?` key opens Help Panel
  - `F1` key opens Help Panel
  - Global keyboard event handling
  - Help button in floating action buttons (bottom-left)

### Changed

- **Header Component** - Enhanced with tutorial integration
  - "Start Tutorial" button now connected to OnboardingContext
  - Proper tutorial restart functionality
- **ImageUploadInput Component** - Enhanced label support
  - Labels now support React nodes (not just strings)
  - Enables contextual help integration in labels
  - Improved TypeScript typing
- **App Layout** - Integrated onboarding components
  - WelcomeModal rendered at app root
  - TutorialOverlay rendered with portal
  - HelpPanel with topic/category support
  - Floating help button in bottom-left corner
  - Help panel state management with topic/category routing

### Technical

- **Components Added**:
  - `src/components/onboarding/WelcomeModal.tsx` - Welcome screen
  - `src/components/onboarding/TutorialOverlay.tsx` - Tutorial overlay
  - `src/components/onboarding/index.ts` - Barrel export
  - `src/components/help/HelpPanel.tsx` - Help center panel
  - `src/components/help/ContextualHelp.tsx` - Inline help buttons
  - `src/components/help/index.ts` - Barrel export
- **Contexts Added**:
  - `src/contexts/OnboardingContext.tsx` - Onboarding state management
- **Data Files Added**:
  - `src/data/tutorialSteps.ts` - Tutorial step definitions
  - `src/data/helpContent.ts` - Help topics and categories
- **Utilities Added**:
  - Tutorial step navigation logic
  - Help search with fuzzy matching
  - Category-based topic filtering
- **Styling**:
  - CSS custom properties for theming
  - Smooth animations and transitions
  - Responsive breakpoints for mobile
  - Gradient backgrounds and glassmorphism effects
  - Accessible focus states and hover effects

### Documentation

- Updated CHANGELOG with v1.4.0 Week 2 features
- Tutorial steps documented in code
- Help content structured and searchable
- Component props and interfaces documented

### Added - v1.4.0 Performance Optimization

- **Performance Optimization** - Code splitting and lazy loading for heavy studio components
  - Vite rollupOptions with manual chunk splitting (vendor, state bundles)
  - React.lazy() for heavy studio and modal components
  - Suspense fallback component for graceful loading states
  - Reduced initial bundle size through deferred loading

## [1.3.0] - 2026-02-23

### Added

- **Prompt History System** - Complete history tracking with IndexedDB storage
  - Automatic history capture on prompt generation with full metadata
  - History search and filtering by date, tags, favorites, and project
  - Favorite prompts feature with toggle
  - Tag management for history entries
  - History statistics dashboard (total entries, favorites, projects)
  - Export history to JSON or CSV
  - Import history from JSON
  - History cleanup with configurable max entries (1000)
  - Project-based history organization
- **Diff Comparison** - Side-by-side prompt comparison
  - Visual diff highlighting for text changes
  - Compare any two prompts from history
  - Restore from history functionality
  - Show changes in prompt structure (style, camera, scene, etc.)
  - Syntax highlighting for better readability
- **Project-Based Organization** - Multi-project workspace management
  - Create, edit, and delete projects
  - Project metadata (name, description, tags, status)
  - Project archiving and unarchiving
  - Project duplication with new name
  - Project search functionality with fuzzy matching
  - Default project auto-creation on first run
  - Project-specific history and settings
  - Recent projects tracking
- **Lightweight Local Database** - Enhanced IndexedDB architecture
  - Centralized database service with singleton pattern
  - Database migrations system with version tracking
  - Automatic schema upgrades
  - Database backup/restore functionality
  - Database size monitoring with storage API
  - Database health checks
  - Cleanup utilities for old entries
  - Export/import database to JSON
- **Structured API Export Mode** - API-ready export formats
  - JSON-API compliant format
  - cURL command generation
  - Code snippet generation (Python, JavaScript, TypeScript)
  - Batch export for multiple prompts
  - Export validation
  - Copy to clipboard functionality
- **Sidebar Navigation** - Improved navigation UX
  - Collapsible sidebar with smooth animations
  - Main navigation sections (Prompt Builder, History, Projects, Templates, Settings)
  - Active state highlighting
  - Responsive layout with sidebar offset
  - Quick access to key features
  - Project name display in sidebar
- **Global Search Service** - Fuzzy search across all content
  - Search across history and projects
  - Intelligent similarity scoring with multiple algorithms
  - Character-level and word-level matching
  - Search suggestions based on recent queries
  - Configurable search options (types, limit, threshold)
  - Result ranking by relevance score
- **Zustand State Management** - Dedicated stores for new features
  - `useProjectStore` - Project state management with persistence
  - `useHistoryStore` - History state management with filtering
  - Automatic initialization on app startup
  - Error handling with user notifications
- **Auto-Save Integration** - Seamless history tracking
  - Automatic save to history after prompt generation
  - Full metadata capture (style, camera, scene, character, audio)
  - Project association for all history entries
  - Background saving without UI blocking

### Changed

- Enhanced state management with project isolation
- Improved database performance with IndexedDB indexes
- Better error handling throughout new services
- Optimized queries for large datasets
- Main layout adjusted for sidebar navigation
- Database initialization moved to app startup

### Technical

- **Services Added**:
  - `historyService.ts` - History CRUD operations
  - `diffService.ts` - Text diff comparison
  - `projectService.ts` - Project management
  - `databaseService.ts` - Database abstraction layer
  - `apiExportService.ts` - API export utilities
  - `searchService.ts` - Global fuzzy search
- **Components Added**:
  - `HistoryPanel.tsx` - History browser with filters
  - `DiffViewer.tsx` - Side-by-side diff comparison
  - `ProjectManager.tsx` - Project CRUD interface
  - `Sidebar.tsx` - Navigation sidebar
  - `ApiExportModal.tsx` - API export dialog
- **Stores Added**:
  - `useProjectStore.ts` - Project state with IndexedDB
  - `useHistoryStore.ts` - History state with filtering
- **Icons Added**:
  - `code`, `document`, `menu` icons for new features

### Documentation

- Updated README with v1.3.0 features
- Added project management documentation
- Added history system guide
- Added API export documentation
- Updated progress tracking documents

## [1.2.0] - 2026-02-09

### Added

- **Template System** - Save, manage, and reuse prompt configurations
  - Create custom templates from current prompt state
  - Template library with search and filtering
  - Template categories and tags
  - Import/export templates as JSON
  - Duplicate and edit existing templates
  - Built-in starter templates (Cinematic, Documentary, Music Video, etc.)
- **Variable Placeholders** - Dynamic variables in prompts with auto-fill
  - Variable syntax: `{{variable_name}}` or `{{variable_name:default_value}}`
  - Built-in variables for character, location, time, camera, and style
  - Custom variable creation
  - Variable autocomplete suggestions
  - Variable validation and error handling
  - Variable import/export
- **Preset Management** - Reusable preset configurations
  - Preset categories (Camera, Lighting, Style, Character, Environment, Audio, Effects, Workflow)
  - 10+ built-in presets (Cinematic Camera, Golden Hour, Film Noir, etc.)
  - Preset favorites and recent tracking
  - Quick-apply preset buttons
  - Preset import/export
  - Preset versioning
- **Autosave & Recovery** - Automatic saving and crash recovery
  - Periodic autosave with configurable interval
  - Crash detection on startup
  - Recovery prompt with snapshot selection
  - Autosave history (last 5 versions)
  - Manual save points
  - Autosave indicator in UI
  - Force autosave option
- **Keyboard Shortcuts** - Comprehensive shortcut system
  - 20+ default shortcuts for common actions
  - Customizable shortcut keys
  - Shortcut conflict detection
  - Context-aware shortcuts
  - Shortcut help overlay (`?` key)
  - Import/export shortcut profiles
  - Enable/disable shortcuts globally
- **Enhanced Export** - Improved export with retry logic and multiple formats
  - Export queue with progress tracking
  - Retry logic with exponential backoff
  - Multiple formats: JSON, TXT, PDF, CSV, Markdown, XML, ZIP
  - Export validation
  - Batch export operations
  - Export history
  - Quick export for single files
- **GitHub Issue Templates** - Standardized community contributions
  - Bug report template with severity levels
  - Feature request template with priority
  - Documentation request template
  - Issue template configuration

### Changed

- Improved export reliability with queue system
- Enhanced error handling in all new services
- Better TypeScript type safety throughout

### Documentation

- Updated README with v1.2.0 features
- Added template system documentation
- Added preset management guide
- Added keyboard shortcuts reference
- Updated CONTRIBUTING.md with issue template usage

## [3.5.0] - 2026-02-09

### Added

- Windows build configuration
- Standalone desktop app with Electron
- Magic Mask feature with blocking generation
- Film emulation and B-roll generation
- "Takes" system for prompt variations
- Razor tool for splitting clips
- Global style lock with unlock icons
- Undo/redo functionality with modular effects
- Image-to-video bridging support
- Camera effects and frame extraction
- Visual DNA and Identity Lock features
- Script Studio functionality
- Text track type and caption support
- AI scene analysis and semantic search
- Chroma key effect and B-roll suggestions
- AI agent for storyboard control
- Lyric-to-video and audio visualizer features
- New Project Wizard
- Suno Music Studio integration
- Motion configuration for video clips
- Variables panel
- AI-powered director agent (chatbot)
- Color grading and ambience audio generation
- Scene bridging functionality
- Text overlay functionality
- Script doctor and title card generation
- Collaborative editing with Yjs
- Table read functionality
- Imagen inpainting and StyleTuner
- Location management features
- Concept image generation and video critique
- Asset library with keyboard shortcuts
- Video take switching and filtering
- SFX generation and EDL export
- FFmpeg video export
- Project management functionality
- Character Bank
- Batch video generation
- Visual DNA feature
- History panel with date filtering
- Video generation functionality
- Camera and action suggestions
- Copy to clipboard for prompt output
- Concept art generation support
- Global hotkeys
- Prompt variations and model comparison
- Audio upload and mix controls
- Tooltips and UI string integration
- Sora emulation optimization options
- Character cameo functionality
- Interactive tutorial
- Tabbed interface for prompt generation
- Sound effects intensity control
- Prompt refinement functionality
- Character action suggestions
- Custom preset functionality
- Advanced scene and character modifiers
- Sensory details and character nuances suggestions
- History feature
- Theme switching and light theme support
- Target model selection (Veo, Sora)
- Local state persistence
- Audio suggestions
- Image upload for Veo prompts
- Character detail suggestions
- Art style suggestions
- Skin tone and clothing validation
- Character mood and pose options
- Storyboard generation
- Series generation with placeholder support
- Suno AI song generation
- Image studio feature
- Save to history functionality
- Variations generation
- Character archetype selection
- Model selection for prompt generation
- Real-time sync and toast notifications

### Changed

- Refactored timeline and clip data structure
- Improved Suno generation and UI
- Enhanced song generation error handling
- Improved layout and responsiveness of tabs
- Consolidated character bank to Zustand store
- Improved error handling throughout the application
- Enhanced UI animations and visual feedback
- Updated README and USER_GUIDE for Veo Studio rebrand
- Improved prompt generation with validation
- Enhanced input validation and error handling
- Improved UI and added more generation options
- Updated dependencies

### Fixed

- SunoSongStudio empty lyrics handling
- UI layout and responsiveness issues
- Error handling and user feedback
- Download button error handling
- Various minor bugs and improvements

### Removed

- Unused semantic search code
- Deprecated Webpack CI workflow
- Voice assistant functionality (temporarily)
- Unused AI suggestion states and services

## [1.0.0] - Initial Release

### Added

- Initial Veo Prompt Generator project
- Basic prompt generation functionality
- Core UI components
- Gemini API integration
- Basic video analysis functionality

---

**Note:** Version 3.5.0 represents the state before the structured roadmap implementation. Starting with v1.1.0, we follow strict semantic versioning and release discipline.
