# Changelog

<!-- markdownlint-configure-file {"MD024": false} -->

All notable changes to Veo Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **PromptLogicContext refactor** — `DetailsSection` and `OutputSection` now consume prompt-logic handlers and loading states via `usePromptLogicContext()` instead of receiving ~27 bridged props through `PromptWorkspace`, eliminating the prop-drilling pattern identified in the 10-improvement review.
- **OS keychain API-key storage** — Replace `safeStorage`-backed encrypted JSON file with `keytar` for native OS credential vault integration (Windows Credential Manager / macOS Keychain / Linux secret service); browser fallback to `localStorage` preserved.
- **FocusModeBanner test coverage** — Add unit tests for the focus-mode banner component (render/hide and exit interaction).
- **PromptLogicContext test** — Add unit tests verifying the context hook throws outside the provider and returns the supplied value inside it.
- **10-improvement overhaul** — Complete the app review items: geolocation removal, Ollama badge, live preview, local-only collaboration badge, focus mode, history ratings, theme guard script, PromptLogicContext, keytar API key storage, and Tier 1 service test suites.

### Changed

- Add `npm run validate:release` as a stronger local release-readiness gate that runs the AI health checks and pre-release validation pipeline.
- Add a new global Command Palette (`Ctrl+K`) with searchable quick actions for search, history, templates, projects, settings, help, batch generation, optimize panel, and collaboration entry points.
- Harden NLE direct export flow with readiness preflight checks and explicit failure metadata for bridge-unavailable and invalid-payload scenarios.
- Add direct export UX guards in timeline and export surfaces so unavailable NLE integrations show actionable hints instead of failing late.

### Changed

- Improve Command Palette usability with grouped command sections, recent-command recall, and expanded keyboard traversal (`ArrowUp/Down`, `Home`, `End`, `Enter`).
- Harden Command Palette discovery with deterministic search ranking, keyword-aware matching, extracted recents persistence logic, and dedicated regression coverage for storage edge cases.
- Stabilize mock lip-sync processing timing by shifting the lower bound to `3001ms` (from `3000ms`) to remove exact-threshold fake-timer flakiness while preserving the intended ~3–5 second simulation window.
- Make job queue offline-aware with explicit online/offline state tracking and deterministic replay behavior after reconnection.
- Reorder app initialization so queue executors register before hydration and trigger resume signaling when connectivity returns.
- Extend service worker job handling with explicit resume messaging for queued offline work.
- Sync published app metadata, README version markers, and the service-worker cache namespace to `4.3.0`.
- Align v4.5.0 workflow metadata/docs to completed state without creating a new app release.
- Advance `v4.6.0` workflow artifacts through build/test/validate phases, and define the next sprint objective as command palette ranking and recents persistence hardening.
- Upgrade generation paths to the official Gemini 3.1 Pro API model ID (`gemini-3.1-pro-preview`) across prompt, audio, vision, production, fallback, and CLI flows, with legacy `gemini-3-pro-preview` compatibility in options/pricing/fallback chains.
- Consolidate local multi-repo workspace ownership under `C:\Users\<you>\Documents\Dev\Loofi.code-workspace`, retire repo-tracked workspace templates, and update Fedora setup guidance for the unified `Dev/repos/loofi` layout.
- Add app-level prompt provider switching in Settings so Veo prompt generation can route through Ollama while Gemini-only assistive tools remain unchanged.

## [4.3.0] - 2026-03-08

### Changed

- **Centralized Gemini model resolution** — Introduce `getPromptModel()` in `aiClient.ts` with circuit-breaker-aware fallback chain (`gemini-3.1-pro-preview` → `gemini-3-pro-preview` → `gemini-2.5-pro` → `gemini-2.5-flash` → `gemini-2.0-flash`), replacing 30+ hardcoded model strings across all prompt, audio, vision, and production services.
- **Resilient API calls** — Upgrade all auxiliary Gemini functions from raw `retryOperation()` to `resilientCall()` (retry + circuit breaker + API health monitoring) for consistent error handling and automatic failover.
- **Ollama provider stability** — Add `AbortController`-based request timeout (120s default) to `generatePromptWithOllama()` to prevent indefinite UI hangs when Ollama is unresponsive.

### Removed

- **Duplicate local LLM code** — Remove standalone `LocalLLMConfig`, `configureLocalLLM()`, `getLocalLLMConfig()`, `checkLocalLLMHealth()`, and `generateWithLocalLLM()` from `LocalLLMAdapter.ts` (superseded by `ollamaProvider.ts`); retain the `LocalLLMAdapter` class for prompt formatting.

## [4.2.2] - 2026-03-08

### Fixed

- **Unicode crash in share handler** — Replace raw `btoa()` with `TextEncoder`-backed encoding so share links work with non-ASCII prompt content (Japanese, Arabic, emoji, etc.).
- **Infinite auto-save loop** — Switch `useAutoSaveHistory` from full-store subscription to a selector (`useHistoryStore(s => s.addEntry)`) to prevent render-loop cascades.
- **Stale i18n error messages after language switch** — Change `errorsBundle` memoization dependency from `i18n` singleton to `i18n.language` in `useAppHandlers`, `usePromptLogic`, and `useGenerationState`.
- **CSV export unquoted fields** — Wrap `artStyle`, `cameraMovement`, and `model` values in escaped quotes in `historyService` CSV export to prevent column misalignment from commas/quotes.
- **JSON import duplication** — Add existing-entry check before writing during JSON history import to prevent duplicate entries on re-import.
- **Autosave race condition** — Add `isSaving` guard in `autosaveService` to prevent overlapping concurrent autosave operations.
- **Comment service race condition** — Add per-project promise-based write lock mutex in `commentService` to serialize all five mutation methods (`addComment`, `editComment`, `deleteComment`, `resolveComment`, `addReaction`).
- **ApiKeyModal unhandled rejection** — Add `.catch()` handlers to `setStoredApiKeyAsync` and `clearStoredApiKeyAsync` calls.
- **Clipboard write error swallowed** — Convert clipboard write in share handler to `.then()/.catch()` pattern so failures show a toast instead of silently failing.
- **Async `onupgradeneeded` in databaseService** — Remove `async` from IndexedDB upgrade handler (auto-commits on return, so `await` inside caused silent migration failures).
- **Event listener memory leak** — Store `online`/`offline` handlers as named class properties in `apiHealthMonitorService` and remove them in `destroy()`.
- **Unbounded undo history** — Add `limit: 50` to Zundo temporal config in `useComposerStore` and `useOptimizationStore`.
- **Marketplace store duplicate listener registration** — Guard `pluginInstallService.onProgress` and `pluginSandboxService.subscribe` with a `subscriptionsRegistered` flag to prevent duplicate registrations on re-mount.
- **Batch prompt store permanent loading spinner** — Wrap `open()` and `startBatch()` async actions in `useBatchPromptStore` in try/catch blocks so errors reset loading state.
- **History `rateEntry` missing error handling** — Add try/catch with `logger.error` around `rateEntry` in `useHistoryStore`.
- **History `setFilter` race condition** — Add monotonic `filterRequestId` counter to discard stale filter responses in `useHistoryStore`.
- **Unbounded optimization history** — Cap `addHistoryEntry` array at 50 entries with `.slice(-50)` in `useOptimizationStore`.
- **Weak random for share codes** — Replace `Math.random()` with `crypto.getRandomValues()` in `collaborationService` for cryptographically secure share codes.
- **Default exports violating project guidelines** — Convert `ApiKeyModal`, `TargetModelToggle`, and `Sidebar` from default exports to named exports, updating all import sites and barrel re-exports.
- **Settings language source** — Read current UI language from `i18n.language` instead of `localStorage` in `SettingsPage` to stay in sync with the i18n runtime.

## [4.2.1] - 2026-02-26

### Fixed

- Restore reliable opening of `Image`, `Suno`, and `Video` studios when internal plugin registration is delayed by adding a core fallback render path in `ModalManager`.
- Resolve high-severity audit findings in the dependency graph and re-green CI security checks.

## [4.2.0] - 2026-02-26

### Changed

- Align release metadata and manifest versioning to `4.2.0` for consistent packaging and release validation.

## [3.16.0] - 2026-02-25

### Added

- **Phase 1 — Architectural Refactoring**
  - **Strict Lazy Loading (Task 1.1)** — Heavy studio modules (`VideoAnalysisStudio`, `AmbienceStudio`, `ComposerCanvas`) wrapped with `React.lazy()` + `SuspenseFallback` boundaries at routing level, reducing initial bundle size and improving TTI.
  - **Store Mediator Pattern (Task 1.2)** — Centralized event bus (`src/core/store/mediator.ts`) replacing direct cross-store imports. Eliminates cyclic dependencies between App, Project, Timeline, and Video stores. 16 unit tests.
  - **Web Worker Isolation (Task 1.3)** — `promptAnalysis.worker.ts` and `projectAnalysis.worker.ts` offload CPU-heavy prompt scoring and project analysis from the main UI thread. 62 unit tests.

- **Phase 2 — Feature Implementations**
  - **Local LLM Fallback — Privacy Mode (Task 2.1)** — `LocalLLMAdapter` integrating Ollama/Llama.cpp local inference. New `localLLMService` singleton for endpoint management. Settings UI toggle for "Local Privacy Mode" with configurable API URL. Supports `'local'` as a `targetModel` value. 54 unit tests.
  - **Git-like Prompt Branching (Task 2.2)** — `branchService` with full tree/graph data structure persisted to IndexedDB. Fork, switch, rename, delete branches. `BranchTreeView` component with branch selector toolbar, inline renaming, compare mode. `HistoryPanel` extended with list/tree toggle and `DiffViewer` overlay integration. 35 unit tests.

### Changed

- **`useHistoryStore`** — Upgraded to v1.4.0 with `branchTree`, `viewMode` state and 10 branch management actions (`forkBranch`, `switchBranch`, `setActiveNode`, `renameBranch`, `deleteBranch`, `setViewMode`, `getActiveBranch`, `getActiveNode`, `getBranchEntries`, `refreshBranchTree`).
- **`HistoryEntry`** — Extended with optional `branchId` and `parentId` fields in both `@core/types` and `historyService` interfaces.
- **`HistoryPanel`** — Conditional rendering of tree view vs list view based on `viewMode` state, with DiffViewer overlay when comparing branches.

## [3.15.1] - 2026-02-24

### Changed

- **App.tsx decomposition continued** — extracted the top-level render scaffold into `AppScaffold` (`src/shared/components/layout/AppScaffold.tsx`) and rewired `App.tsx` to pass structured props for sidebar, header, workspace, panels, and overlays.
- **App test mocks updated** — `src/App.test.tsx` now mocks `AppScaffold` so layout/hydration tests continue to validate skip-link and main-content landmarks.

## [3.15.0] - 2026-02-23

### Changed

- **Performance — `OutputSection` memoized** — Wrapped with `React.memo()` and stabilised the previously inline `onSetIsEditing` callback with `useCallback` so `ActionBar` doesn't receive a new function reference on every parent render.
- **Performance — `PromptOutput` handler memoization** — `handleDownloadImage` and `handleRefineClick` were recreated on every render; both are now wrapped with `useCallback`. `handleDownloadImage` has no deps (pure DOM operation); `handleRefineClick` depends on `onRefine`, `isEditing`, `editedPrompt`, and `prompt`.
- **Electron — dev-only console.logs gated** — Display size and file-path diagnostic logs in `createWindow()` are now wrapped with `if (isDev)` so packaged production builds produce no stdout noise on startup.
- **Code quality — pluginService suppression comments** — Added inline rationale to all three `@typescript-eslint/no-explicit-any` suppressions in the event-emitter methods (`on`, `off`, `emit`): the plugin sandbox API requires heterogeneous variadic payloads that cannot be expressed without a full typed event map.
- **Version & Cache Sync** — Synchronized app metadata to `3.15.0` and bumped service worker cache namespace to `veo-prompt-generator-v3.15.0`.

## [3.14.0] - 2026-02-23

### Fixed

- **Electron download crash** — `download-update` IPC handler was constructed with `new Promise((resolve) =>` but called the undefined `reject` on network errors, throwing a `ReferenceError` at runtime. Fixed by passing `reject` as the second Promise parameter.
- **Error toasts auto-dismiss** — `Toast.tsx` ran a 6 s auto-dismiss timer for all toast types, silently overriding `useToastManager`'s intent to keep `error` toasts persistent until user dismissal. Error toasts now stay visible until dismissed.

### Changed

- **Performance — Header and Sidebar memoized** — Wrapped both components with `React.memo()` to prevent unnecessary re-renders when unrelated App-level state changes (undo stack, active panels, job counts, etc.). Callbacks are already `useCallback`-stabilised in `useAppHandlers`.
- **Toast container — mobile safety** — Toast wrapper now uses `max-w-[min(24rem,90vw)]` so toasts cannot overflow narrow viewports.
- **Toast container — visible cap** — At most 5 toasts are displayed simultaneously to prevent wall-of-errors on rapid error storms.
- **Toast container — Escape-key dismiss** — Pressing `Escape` while toasts are visible dismisses the most recent one.
- **OutputSection — loading skeleton** — When a prompt generation is in progress and no result exists yet (`isLoading && !generatedPrompt`), the output panel now shows a `SkeletonText` placeholder instead of the static summary, giving clear visual feedback that generation is underway.
- **Version & Cache Sync** — Synchronized app metadata to `3.14.0` and bumped service worker cache namespace to `veo-prompt-generator-v3.14.0`.

## [3.13.0] - 2026-02-23

### Added

- **`useViewport` hook** — new `src/shared/hooks/useViewport.ts` providing reactive viewport dimensions, DPI scale factor, and derived responsive breakpoint flags (`isMobile`, `isTablet`, `isDesktop`, `isCompact`, `isWide`) with debounced resize listener.

### Changed

- **UpdateSettings Tailwind rewrite** — rewrote `UpdateSettings.tsx` from inline `<style>` tags with undefined CSS custom properties to Tailwind CSS classes with `peer`/`peer-checked` toggle pattern; extracted `ToggleRow` sub-component.
- **Responsive Sidebar** — auto-collapses on compact viewports (`<1200px`), uses CSS variable widths (`--sidebar-width`, `--sidebar-width-collapsed`).
- **Header compact mode** — compact toolbar layout on narrow viewports via `useViewport` and `.compact-toolbar` CSS class.
- **SettingsPage responsive layout** — viewport-aware scrollable content with `max-h-[calc(100vh-12rem)]`.
- **App sidebar width** — switched from hardcoded `lg:ml-64` to `lg:ml-[var(--sidebar-width)]` CSS custom property.
- **Electron DPI-aware sizing** — `main.cjs` window dimensions account for DPI scale factor; `minHeight` reduced from 700 to 640.
- **Design tokens** — added `--sidebar-width-active`, `--content-padding-x`, and `.compact-toolbar` styles to `tokens.css`.
- **Version & Cache Sync** — synchronized app metadata to `3.13.0` and bumped service worker cache namespace.

### Fixed

- **UpdateSettings toggle switches** — toggles were non-functional due to undefined CSS custom properties; now use Tailwind's `peer-checked` pattern.
- **ComposerPanel positioning** — changed from `fixed inset-0` to `absolute inset-0` to prevent layout conflicts.

## [3.12.0] - 2026-02-23

### Added

- **`ConfirmDialog` component** — new `src/shared/components/ui/ConfirmDialog.tsx` wrapping `AppDialog` for imperative confirm flows; replaces all `window.confirm()` calls.
- **`safeIdbKeyval` utility** — wraps every `idb-keyval` call in try/catch with `QuotaExceededError` / `InvalidStateError` handling and in-memory fallback.
- **`performanceMarks` utility** — records `mark()` / `measure()` milestones via `performance.mark` with graceful no-op fallback.
- **App.tsx decomposition** — extracted `AppBackground`, `AppLoadingGate`, `AppCollaborationPanels`, and `useAppCollaborationState` (−112 lines from App.tsx).
- **`PromptOptions` type** — new exported type in `usePromptOptions` replacing `Record<string, any>` in prompt sections.

### Changed

- **Error Resilience Hardening** — wrapped all `localStorage` access, `matchMedia` calls, and `JSON.parse` in try/catch across `useSafeMode`, `App.tsx`, `OnboardingContext`, `AccessibilityContext`, `ariaUtils`, and `projectArchiver`.
- **Type Safety — 7 `any` suppressions eliminated** — reduced from 17 → 10 production suppressions: `chromaKey?: any` → `ChromaKeyConfig`, `validateEntry(entry: any)` → `(entry: unknown)`, `[key: string]: any` → `unknown` in `projectBundleService`, `ideaInputRef: any` → `React.Ref<HTMLTextAreaElement>`, `Record<string, any>` → `PromptOptions`, ShotCard value type → `Shot[keyof Shot]`.
- **Bundle Splitting** — added `react` vendor chunk to `manualChunks` in Vite config.
- **Coverage Thresholds Raised** — bumped from 49/37/44/50 to 52/40/47/53 (statements/branches/functions/lines).
- **Stability & UX Polish** — error boundary audit, `safeIdbKeyval` migration, crash-loop detection hardened, toast manager upgraded, `window.confirm()` eliminated, performance milestones via `performanceMarks`.
- **Version & Cache Sync** — synchronized app metadata to `3.12.0` and bumped service worker cache namespace.

### Fixed

- **Security — 3 `jspdf` vulnerabilities** resolved via `npm audit fix`.
- **`webkitAudioContext` type safety** — replaced `(window as any).webkitAudioContext` with proper Window type augmentation in `TimelineClip` and `AmbienceStudio`.

### Removed

- **Dead hooks** — deleted unused `useRafDebounce`, `useSceneAmbience`, and `useResolvedSettings` hooks and cleaned barrel exports.

## [3.11.0] - 2026-02-22

### Added

- **Hook Test Suite — `useKeyboardNavigation`** — 28 tests covering `useKeyboardNavigation` (Escape/Enter/Arrow keys, disabled state, cleanup, re-register), `useFocusTrap` (6 tests), and `useRovingTabIndex` (9 tests).
- **Hook Test Suite — `usePromptLogic`** — 40 tests covering the core prompt generation hook (handleGeneratePrompt, handleAutoFillModifiers, all suggest handlers, handleRefinePrompt, handleRestructurePrompt, handleGenerateVisualDNA, handleAnalyzeAudio, handleTriggerCharacterDetails).
- **Hook Test Suite — `useAppHandlers`** — 27 tests covering app-level event handlers (input/checkbox/audio changes, image/audio upload/clear, reset, save, share, download, target model change, enhance idea, use example, modal handlers, preset save).
- **Hook Test Suite — `useCollaborativeProject`** — 9 tests covering WebRTC collaboration (connect/disconnect, user color, abort previous connection, updateFocus, setEditing, canWrite, cleanup).
- **Hook Test Suite — `useDirectorsChain`** — 7 tests covering the director's chain workflow (idle status, expose functions, stop chain, audio error handling, skip title shots, skip completed shots, blob URL cleanup).
- **Utility Test Suite — `storage`** — 13 tests covering IDB-based dehydrate/rehydrate storage adapter (getItem with null/rehydrate/image/audio/assets/parse error, setItem with dehydrate/image/audio/assets/error, removeItem).

### Changed

- **Coverage Thresholds Raised** — raised minimum coverage gates from 40/29/38/41 to 49/37/44/50 (statements/branches/functions/lines) in both `vite.config.ts` and `scripts/check-coverage.mjs`, reflecting actual coverage of ~52/40/47/53.
- **Version & Cache Sync** — synchronized app metadata to `3.11.0` and bumped service worker cache namespace to `veo-prompt-generator-v3.11.0`.

## [3.10.0] - 2026-02-20

### Changed

- **Type Safety — `any` elimination continued** — replaced `any` types with proper interfaces in `geminiAudioService` (`RawCaptionEntry`), `geminiProductionService` (`RawBreakdownItem`), `constants` (`InspirationTranslation`, `InspirationPromptEntry`), `DiffViewer` (`DiffChange` import), `ChatBot`, `searchService`, and `AssetLibrary`. Added justification comments on remaining necessary suppressions.
- **Grounding Types** — replaced `any[]` in `CLIResult.groundingChunks` with typed `Array<{ web?: { title?: string; uri?: string } }>`.
- **Plugin Toggle Safety** — guarded `PluginList` toggle handler with proper state discriminant check instead of `as any` cast.
- **DetailsSection Type Assertions** — added explicit `SelectOption[]` assertions for audio/motion/model option props.
- **Auto-save Hook Extraction** — extracted 30-line debounced auto-save logic from `App.tsx` into `useAutoSaveHistory` custom hook for cleaner component composition.
- **Version & Cache Sync** — synchronized app metadata to `3.10.0` and bumped service worker cache namespace to `veo-prompt-generator-v3.10.0`.

### Added

- **New Tests** — added unit tests for `uiSlice`, `Header`, `ModalManager`, `Sidebar`, `CheckboxInput`, and `SelectInput` components.
- **`useAutoSaveHistory` Hook** — new custom hook handling debounced prompt-to-history persistence.

## [3.9.1] - 2026-02-20

### Added

- **Accessibility Regression Tests** — added a11y test suites for 5 UI components: `BatchGeneratorModal` (15 tests), `WorkspaceManagerModal` (23 tests), `WorkspaceSwitcher` (16 tests), `AudioUploadInput` (15 tests), `ImageUploadInput` (14 tests). Tests cover ARIA dialog semantics, label association, listbox/option roles, `aria-selected`, `aria-expanded`, `aria-live` regions, disabled state guards, and keyboard focus behavior.

### Changed

- **Coverage Threshold Alignment** — synchronized `scripts/check-coverage.mjs` thresholds to match `vite.config.ts` (statements 40%, branches 29%, functions 38%, lines 41%).
- **Version & Cache Sync** — synchronized app metadata to `3.9.1` and bumped service worker cache namespace to `veo-prompt-generator-v3.9.1`.

## [3.9.0] - 2026-02-22

### Changed

- **Type Safety — 55 `any` suppressions eliminated** — reduced `@typescript-eslint/no-explicit-any` suppressions from 148 → 93 total (37% reduction); production files from 79 → 43 (46% reduction). All remaining suppressions are justified with inline comments.
- **Service Type Hardening** — replaced `any` with precise types across 11 services: `loggerService` (6→0), `exportService` (13→0), `smartCropService` (4→0), `geminiPromptService` (4→0), `updateService` (3→0), `audioSeparationService` (3→0), `pluginService` (14→3), `sceneExportService`, `useAppStore`, `useAppHandlers`.
- **Plugin Type System Overhaul** — replaced 18 `any` usages in `plugin.ts` with `unknown`, proper generics, and React component types; 6 justified suppressions remain for `React.ComponentType` variance and event emitter contravariance.
- **Component Type Safety** — eliminated `as any` casts in `VideoGenerationStudio` (4→0), `TimelinePlayer` (2→0), `Timeline` (2→0), `ApiExportModal` (2→0), `WorkspaceSettingsPanel` (2→0) using Window type augmentations, proper prop types, and icon type extensions.
- **Utility Type Safety** — typed `variableParser.ts` (2→0) with `Partial<PromptState>` and structured variable objects; `useHotkeys.ts` (2→0) by removing unnecessary `as any` casts (store already typed with `temporal`).
- **Window Type Augmentations** — added `declare global` Window interface extensions for `aistudio`, `webkitAudioContext`, and `EyeDropper` vendor APIs.
- **Icon System Extension** — added `'api'` to the `IconName` union type and implemented its SVG in the `Icon` component.
- **Version & Cache Sync** — synchronized app metadata to `3.9.0` and bumped service worker cache namespace to `veo-prompt-generator-v3.9.0`.

### Added

- **New TypeScript Types** — `ExportData`, `ExportInput`, `DetectionResult`, `DetectorPipeline`, `GitHubRelease`, `GitHubAsset`, `LogEntry`, `LogLevel` for previously untyped service internals.

### Stability

- **Full Test Suite** — 2835/2835 tests pass (144 test files), zero TypeScript errors, lint clean, prettier clean.

## [3.8.1] - 2026-02-19

### Changed

- **Batch Template Accessibility** — associated the template `<select>` in `BatchGeneratorModal` with an explicit label/id and added an accessible control label.
- **Audio Upload Accessibility** — improved `AudioUploadInput` label association using stable input ids and separated upload vs. uploaded interaction containers to avoid nested interactive controls.
- **PWA Metadata** — added `apple-touch-icon` link in `index.html` for improved mobile install compatibility.
- **Workspace Accessibility** — improved keyboard visibility for workspace row actions, added required-name validation feedback, and strengthened color selector semantics for assistive technologies.
- **Batch Matrix Accessibility** — added dialog semantics, variable input labels, and progressbar ARIA attributes for active batch generation updates.
- **Upload Validation UX** — added explicit file type/size validation messaging and stable `aria-describedby` feedback for image/audio upload inputs.
- **Release Readiness Gate** — `pre-release-check` now enforces `test:ci` coverage gates and supports optional E2E smoke checks via `PRE_RELEASE_E2E=1`.
- **Coverage Reporting** — CI now uploads `coverage-summary.json` as an artifact for stable aggregate reporting visibility.
- **Version & Cache Sync** — synchronized app metadata to `3.8.1` and bumped service worker cache namespace to `veo-prompt-generator-v3.8.1`.

### Stability

- **Coverage Verification** — revalidated V8 aggregate coverage reporting with `pool: 'forks'` active; current aggregate summary is stable (~42.69% statements, ~30.73% branches, ~39.92% functions, ~43.41% lines).

## [3.8.0] - 2026-02-21

### Added

- **App Component Tests** — new `App.test.tsx` with 5 render/hydration/a11y tests covering the hydration gate, skip nav, and layout landmarks.
- **Export Service Branch Coverage** — 19 new tests for `exportService` covering all format branches (JSON, TXT, CSV, Markdown, PDF, XML, ZIP), queue processing, and edge cases (escaping, empty arrays, missing fields).

### Changed

- **Accessibility Hardening** — added `aria-label` to 3 icon-only buttons (Header disconnect, DiagnosticsPanel close, MotionEditorPanel close) and 3 unnamed selects (DiagnosticsPanel filter, DesktopSettings max reports, DesktopSettings min threshold).
- **ARIA Attribute Values** — converted boolean ARIA attributes to explicit string values (`'true'`/`'false'`) across InspectorPanel, WorkspaceSwitcher, WorkspaceManagerModal, and MotionCropEditor per WAI-ARIA spec.
- **Type Safety** — removed 5 `as any` casts: 2 in CharacterTab (`handleSeedLockToggle` event typing) and 3 in SunoSongStudio (voice, structure, tags indexing).
- **Coverage Pool** — added `pool: 'forks'` to Vitest config for more accurate V8 coverage aggregation.

### Fixed

- **CHANGELOG Date Correction** — v3.7.0 date corrected from `2026-02-20` to `2026-02-18` (was incorrectly postdating its patch v3.7.1); legacy pre-roadmap v3.5.0 entry disambiguated as `3.5.0-legacy`.

## [3.7.1] - 2026-02-18

### Changed

- **Stabilization Patch** — aligned unit test fixtures and mocks with current TypeScript contracts across diagnostics, composer, generation queue, cost tracking, and Gemini service tests.
- **Validation Reliability** — restored full green `npm run validate` pipeline (lint, typecheck, tests, format check) after contract drift in test suites.
- **README Polish** — refreshed the main project overview and feature presentation.

### Documentation

- Added `RELEASE-NOTES-v3.7.1.md` and synced release notes with the published GitHub release.

## [3.7.0] - 2026-02-18

### Added

- **Test Coverage Hardening** — new unit tests for `pluginStore`, `promptSlice`, `assetSlice`, `timelineSlice`, `errorLoggingService`, `exportService`, `effectPipeline`, and `montageService`; total coverage raised to ~41% statements, ~30% branches, ~39% functions, ~42% lines.
- **Arabic Locale Complete Rewrite** — `public/locales/ar/common.json` rewritten to mirror all 84+ keys from `en/common.json` with accurate Arabic translations, including full `sidebar` sub-tree.

### Changed

- **Coverage Thresholds Raised** — `vite.config.ts` and `scripts/check-coverage.mjs` thresholds updated to statements 40%, branches 29%, functions 38%, lines 41%.

### Documentation

- Updated `HANDOFF_SUMMARY.md` to reflect v3.7.0 sprint completion.

## [3.6.0] - 2026-02-19

### Added

- **Complete Collaboration Wiring** — connected all built collaboration UI into the live app shell
  - Added **Comments** nav item to Sidebar (💬 chat icon) — opens `CommentPanel`
  - Added **Roles** nav item to Sidebar (🔒 lock icon) — opens `RoleManager`
  - Lazy-loaded `ConflictResolutionPanel` and `ProfileSetup` in `App.tsx`
  - Auto-trigger `ProfileSetup` modal on first collaborative action if no profile set
  - Replaced manual peer avatar row in `Header.tsx` with `<PresenceIndicator />`
  - `sidebar.comments` + `sidebar.roles` i18n keys added to all 5 locales (en, es, fr, ja, ar)
  - Smoke tests added for `CommentPanel`, `ConflictResolutionPanel`, `RoleManager`, `ProfileSetup` (15 tests, all passing)

## [3.5.0] - 2026-02-18

### Added

- **Collaboration Suite integration** — wire the built-but-unconnected collaboration UI into the app
  - Added **Collaborate** nav item to Sidebar (🔗 share icon) — opens `ShareDialog` modal
  - Lazy-loaded `ShareDialog` in `App.tsx` with project ID + name scoping
  - `sidebar.collaborate` i18n key added to all 4 locales (en, es, fr, ja)
  - Smoke tests added for `ShareDialog` component (render, close, hidden-when-closed)

## [3.4.0] - 2026-02-18

### Added

- **AI-Driven Project Optimization** epic — intelligent prompt refinement, quality scoring, cost estimation, narrative analysis, and preset recommendation
  - `promptRefinementService`: Gemini-powered prompt analysis with heuristic fallback, LRU cache, AbortController
  - `assetIntelligenceService`: Gemini Vision asset tagging with metadata-based fallback
  - `costEstimationService`: 6-dimension local quality scoring and cost modeling
  - `narrativeAnalysisService`: Scene sequence coherence detection (transitions, pacing, character jumps, duplicate themes)
  - `presetMatchingService`: 5-dimension complexity analysis with model/export profile matching
  - `useOptimizationStore`: Zustand + Zundo + IndexedDB persist store for all optimization state
  - Optimization UI components: `OptimizePanel`, `InlineSuggestions`, `QualityScoreCard`, `CostEstimateCard`, `NarrativeHealthPanel`, `PresetRecommendCard`
  - Plugin API `optimization` namespace with `onPromptAnalysis`, `onScoreCalculation`, `onNarrativeCheck` hooks
  - Optimization i18n namespace (EN + AR translations)
  - Responsible AI ADRs: bias prevention (RAI-ADR-001), accessibility (RAI-ADR-002), evolution log
- **MCP sync infrastructure**: Canonical `.ai/mcp-servers.json` SSoT + `scripts/sync-mcp-configs.sh` generates all 4 platform MCP configs with `--check` CI mode
- **MCP drift detection**: CI gate in `validate.yml` prevents MCP config divergence
- **Copilot skills**: Added `.copilot/skills/` with verify, new-feature, refactor skills (parity with Claude)
- **Auto-label workflow**: `.github/workflows/auto-label.yml` with path-based labeling via `.github/labeler.yml`
- **Chore issue template**: `.github/ISSUE_TEMPLATE/chore.yml` for maintenance tasks
- **Health check script**: `scripts/health-check.sh` validates entire AI infrastructure (agents, MCP, skills, versions, hooks, scripts) with `--fix` mode
- **Workflow validation gates**: Detailed pre/post conditions, validation gate tables, automation script reference, and drift prevention strategy in `.ai/WORKFLOW.md`
- **Plugin install button**: Wired RegistryBrowser "Install" button to `pluginInstallService.installFromRegistry()` with progress bar and error display
- **ProjectExportOptions interface**: Selective export with `includeHistory`, `includeTemplates`, `includePresets` flags
- **Enriched project export/import**: `projectService.exportProject()` now optionally includes history entries, user templates, and user presets; `importProject()` restores them

### Changed

- CI workflows now use a shared coverage gate script (`npm run test:ci`) to remove duplicated inline logic.
- Added GitHub Actions concurrency guards in build and validate workflows to cancel superseded runs.
- CLI command routing now lazy-loads command modules for faster startup on `--help`, `--version`, and profile listing.
- CLI export now reads stdin via file descriptor `0`, improving cross-platform pipe support.
- PR template now includes MCP sync check in CI checklist

### Fixed

- Fixed plugin registry install progress typing in `RegistryBrowser` to match `InstallProgress`.
- Fixed Vitest hoisted mock initialization in `aiClient.test.ts` to resolve CI `ReferenceError`.
- Updated stale fallback-language expectation in `SoraAdapter.test.ts` to match current adapter behavior.
- Regenerated all MCP configs (`.copilot/mcp-config.json`, `.mcp.json`, `.vscode/mcp.json`, `opencode.json`) from SSoT — fixed `uvx→npx` and remote→local inconsistencies in opencode.json

### Integration

- Wired **OptimizePanel** into `App.tsx` as a lazy-loaded fixed right-side panel toggled via Sidebar "Optimize" button
- Added `InlineSuggestions` to `PromptWorkspace` — displays AI suggestions below the output column
- Added `sidebar.optimize` i18n key to all 5 locales (en, es, fr, ja, ar)
- `PromptWorkspace` gains optional `promptId` prop for suggestion namespacing (`currentProjectId || 'default'`)
- Smoke tests added for `OptimizePanel` and `InlineSuggestions` components

## [3.3.1] - 2026-02-18

### Changed

- AI Director no-key message now includes an explicit **Open Settings** action that routes directly to `/settings`.

### Fixed

- Startup crash when launching without a Gemini API key: ChatBot no longer initializes Gemini chat on mount and now fails gracefully.

## [3.3.0] - 2026-02-18

### Added

- **Theme preview**: Visual preview swatches for dark/light theme in Settings page with mini UI mockups
- **React.memo performance**: Added React.memo to 10 heavy components (InspectorPanel, VideoGenerationStudio, TimelineClip, Timeline, PromptOutput, VideoAnalysisStudio, MotionEditorPanel, VFXPanel, AudioMixer, ImageStudio)
- **3 new test files**: VeoAdapter (60 tests), SoraAdapter (44 tests), aiClient (35 tests) — +139 test cases
- **ImageStudio i18n**: Wrapped 7 hardcoded English strings in t() calls, added 8 new translation keys to all 4 locales (en/es/fr/ja)
- **closeModal i18n key**: Added to all 4 locale common.json files
- **Keyframe service**: Created `keyframeService.ts` singleton with CRUD, interpolation (4 easing modes), and property resolution
- **InspectorPanel keyframes**: Wired `toggleKeyframe()` and `isKeyframed()` to keyframeService — keyframes now functional
- **Arabic locale**: Added `ar` (العربية) with 13 namespace stub files, appears in language selector
- **RTL support**: `changeAppLanguage()` now sets `dir="rtl"` on document for RTL languages
- **InspectorPanel ARIA**: Added `role="tablist"`, `role="tab"`, `aria-selected`, `aria-label` on all buttons, `aria-pressed` on keyframe toggles
- **Plugin sandbox data routing**: Wired 5 data methods (`data.getProjects`, `data.getProject`, `data.saveProject`, `data.getHistory`, `data.getTemplates`) to real services
- **CSV import for history**: `historyService.importHistory(data, 'csv')` with quoted field parsing and duplicate deduplication
- **2 more test files**: keyframeService (73 tests), historyService CSV import (+15 tests) — +88 test cases

### Changed

- README.md: Version badge updated 2.7.0 → 3.2.0, AppImage paths updated, added v2.8–v3.2 release summary section
- lipSyncService: Removed dead `SYNC_API_KEY` constant, simplified conditional to check only `SYNC_API_ENDPOINT`, updated example code comment to reference apiKeyService

### Fixed

- ImageStudio: Fixed hardcoded English strings ("Upload a file", "Processing Image...", "Generating Art...", "Clear Upload", aria-labels, alt text) now use i18n t() calls

## [3.2.0] - 2026-02-18

### Security

- **CRITICAL**: Removed hardcoded DEFAULT_API_KEY from apiKeyService.ts — no API keys in source code
- **CRITICAL**: Removed `process.env.API_KEY` and `process.env.LIP_SYNC_API_KEY` from vite.config.ts define block — API keys no longer bundled into client
- Added Content Security Policy (CSP) meta tag to index.html — prevents XSS with restrictive directives
- All `process.env.API_KEY` references replaced with `getStoredApiKey()` across 5 service files

### Added

- Skip navigation link for keyboard/screen-reader users (WCAG compliance)
- `id="main-content"` anchor target for skip link

### Changed

- Header.tsx: All 14 hardcoded English strings wrapped in `useTranslation()` t() calls
- 14 new i18n keys added to en/es/fr/ja common.json locale files
- videoEditorService: fetch calls now wrapped in try/catch with logger error reporting
- Removed dead `/storyboard` and `/timeline` route constants from router config
- lipSyncService: removed `process.env.LIP_SYNC_API_KEY` reference

### Fixed

- useHistoryStore.test.ts: replaced `any` types with `Record<string, unknown>` to satisfy ESLint

## [3.1.0] - 2025-07-16

### Added

- **28 new service test files**: Comprehensive unit tests for all previously untested services:
  - Tier 1 (critical): videoEditorService, videoGenerationService, presetManager, collaborationService, performanceService
  - Tier 2 (data): apiExportService, apiKeyService, colorGradeService, effectPipeline, montageService
  - Tier 3 (media/AI): audioAnalysisService, audioSeparationService, beatDetection, lipSyncService, sfxService
  - Tier 4 (infra): segmentationService, smartCropService, imageEditService, keyboardShortcutManager, performanceProfiler, proxyService, stockMediaService, transitionAnalyst, updateService, upscaleService, communityService
  - Additional: commentService, settingsMigrationService
- **9 new store test files**: Unit tests for all previously untested Zustand stores:
  - useComposerStore, useCostStore, useDiagnosticsStore, useGenerationQueueStore, useHistoryStore
  - useJobQueueStore, useLocationStore, useProjectStore, useVideoStore

### Changed

- **Test count**: 1641 → 2364 tests (+723 new tests, +44% increase)
- **Test files**: 86 → 122 files (+36 new test files)
- **Coverage thresholds raised**: statements 20→35%, branches 15→23%, functions 20→32%, lines 21→36%
- **Coverage actuals**: statements 37.92%, branches 25.69%, functions 34.89%, lines 38.87%

## [3.0.0] - 2025-07-16

### Breaking Changes

- Removed `useUIStrings()` bridge hook — all components now use `useTranslation()` from react-i18next directly.
- Removed `t` prop-drilling from core hooks (`usePromptLogic`, `useAppHandlers`, `useGenerationState`) — hooks call `useTranslation()` internally.
- CSS `.light` class selectors replaced with `[data-theme='light']` attribute selectors.

### Added

- **Full i18n migration**: 35+ components migrated from `useUIStrings()` to `useTranslation()` with namespace-scoped translations.
- **Translation files populated**: Spanish (ES), French (FR), and Japanese (JA) translations across 13 namespaces (39 files).
- **Settings migration service**: `settingsMigrationService` handles legacy `body.light` class and `dark-theme` class migration to `data-theme` attribute on app startup.
- **CSS design token theming**: 54 light-theme rules moved from `index.css` to `tokens.css` using `[data-theme='light']` selectors.
- **Auto theme detection**: `themeService` now detects `prefers-color-scheme` media query for automatic light/dark mode.

### Changed

- Prompt sections and tabs (`StyleTab`, `CameraTab`, `SceneTab`, `CharacterTab`, `AudioTab`, `CoreConceptSection`, `DetailsSection`, `OutputSection`) use internal `useTranslation()` instead of receiving `t` as a prop.
- `PromptWorkspace` no longer accepts a `t` prop.
- `validation.ts` uses i18next `{{field}}` interpolation format.
- `pdfExport.ts` removed unused `UIStrings` parameter.

### Removed

- `src/shared/hooks/useUIStrings.ts` — legacy bridge hook deleted.
- All `.light` CSS class rules from `index.css` (migrated to `tokens.css`).

## [2.9.0] - 2026-02-19

### Code Quality

- Eliminated all 43 ESLint warnings (zero-warning policy enforced).
- Lowered `lint:ci` threshold from 630 to 0 in `scripts/lint-ci.mjs`.
- Audited all 155 `eslint-disable` directives — confirmed all necessary.

### Refactoring

- Decomposed `App.tsx` from 672 → 546 lines by extracting:
  - `useAppKeyboardShortcuts` hook (`src/shared/hooks/useAppKeyboardShortcuts.ts`)
  - `PromptWorkspace` component (`src/features/prompt/PromptWorkspace.tsx`)
  - `AppPanels` component (`src/shared/components/layout/AppPanels.tsx`)

### Testing

- Added 12 new test files with 280+ unit tests:
  - `search.test.ts`, `easing.test.ts`, `promptScoring.test.ts`, `variableParser.test.ts`
  - `diffService.test.ts`, `apiErrors.test.ts`, `loggerService.test.ts`, `retry.test.ts`
  - `edlExport.test.ts`, `cameraPhysics.test.ts`, `audio.test.ts`, `ariaUtils.test.ts`

## [2.8.0] - 2026-02-18

### Cleanup

- Deleted orphaned root files (`u00261`, `HANDOFF_SUMMARY.OLD.md`, `data/sunoTags.ts`).
- Removed legacy `src/components/` directory (dead Toast, accessibility, and onboarding code).
- Consolidated scattered `src/hooks/` into `src/shared/hooks/` and `src/utils/` into `src/core/utils/`.
- Cleaned `tsconfig.json` — removed stale `experimentalDecorators`, `useDefineForClassFields`, and `data` include.
- Synced version across `package.json`, `metadata.json`, and `manifest.json` to `2.8.0`.

### Accessibility

- Fixed a11y lint errors across 12 files (aria-labels, form labels, role containment).

### Resilience

- Added `ErrorBoundary` wrappers to 8 unwrapped components (5 in `App.tsx`, 3 in `ModalManager.tsx`).
- Deduplicated global error handlers — `crashReporterService._installGlobalHandlers()` no longer
  installs duplicate `window.addEventListener` listeners; consolidated to single pipeline via
  `globalUnhandledRejectionService`.
- Fixed silent error swallowing in `index.tsx` (4 `.catch(() => {})` replaced with proper logging)
  and `proxyService.ts` (added `logger.warn` to silent catch blocks).
- Debounced auto-save effect in `App.tsx` to avoid excessive history writes.

### Refactor

- Migrated ~114 raw `console.*` calls to centralized `logger` service across ~57 files.
- Fixed `ErrorBoundary` import from default to named export in `App.tsx`.
- Removed unused variables (`_isSafeMode`, `_handleExitSafeMode`) from `App.tsx`.
- Moved onboarding components from `src/components/onboarding/` to `src/features/onboarding/`
  with barrel re-export.

### Tests

- Added unit tests for `ErrorBoundary` (7 tests): render, catch, retry, logging, crash counter.
- Added unit tests for `globalUnhandledRejectionService` (8 tests): install guard, rejection
  handling (Error/string/non-serializable), window error events.
- Added unit tests for `errorLoggingService` (11 tests): log/persist/trim/clear/normalize.
- Added unit tests for `crashCounterService` (5 tests): increment, session guard, malformed values.

## [2.7.0] - 2026-02-17

### Added

- **Unified dialog primitive** (`AppDialog`) with standardized backdrop, focus trap,
  escape handling, placement, and layering controls.
- **UI foundation docs and task spec** for v2.7.0:
  - `docs/ui/v2.7.0-baseline.md`
  - `docs/ui/v2.7.0-foundations.md`
  - `.workflow/specs/tasks-v2.7.0.md`
- **Accessibility opt-in controls** for layout-impacting modes:
  - `enhancedTouchTargets`
  - `enhancedTextSpacing`
- **Expanded UI regression test coverage**:
  - dialog stack behavior (`e2e/modal-stack.spec.ts`)
  - responsive shell and utility dock bounds (`e2e/responsive.spec.ts`)
  - visual snapshots for shell parity and onboarding (`e2e/visual-regression.spec.ts`)

### Changed

- **Theme sync architecture** now flows through `ThemeService -> store -> DOM`,
  with `uiSlice.setTheme()` and startup synchronization in `src/index.tsx`.
- **Accessibility CSS de-globalized** to avoid baseline typography/layout overrides;
  layout-impacting adjustments are now class-scoped and opt-in.
- **Settings UX consolidated** to the routed settings page (`/settings`) and the
  duplicate settings modal path removed.
- **Sidebar utility actions normalized** (Help/Settings in shell dock) to prevent
  floating control overlap with content surfaces.
- **Dialog migration completed** for core panels and studio modals listed in the
  v2.7.0 plan using the shared `AppDialog` contract.
- **Onboarding target resolution modernized** from legacy selector assumptions to
  canonical `data-tour-id` with deterministic fallback selector support.
- **Prompt-builder visual refresh** applied to action surfaces and key sections:
  `ActionBar`, `CoreConceptSection`, `DetailsSection`, `OutputSection`, and
  `PromptBuilderSummary`.

### Tests

- Added unit tests for:
  - `AppDialog` focus/escape/backdrop/scroll-lock behavior
  - accessibility opt-in class application defaults
  - onboarding target fallback resolution
  - theme service/store synchronization updates
- Added/updated Playwright coverage for dialog stack, responsive shell behavior,
  and visual baselines.

## [2.6.0] - 2026-02-21

### Added

- **Collaboration Suite** — full team workflow and sharing system built on
  Yjs CRDTs and WebRTC awareness.
- **Local user identity** (`authService`) — persistent user profile stored in
  IndexedDB with display name, avatar color, and auto-generated user IDs.
  No external auth required.
- **Room management** (`collaborationService`) — create/join/leave/close
  collaboration rooms with 6-character share codes, member management,
  and IndexedDB persistence.
- **Role-based permissions** (`permissionService`) — three roles
  (viewer/editor/admin) with 7 permission actions. Owner always has full
  access. Client-side enforcement with role hierarchy validation.
- **Threaded comment system** (`commentService`) — comments on timeline
  shots with threading (parent/reply), emoji reactions (👍❤️🎬✅),
  resolve/unresolve, edit/delete, and per-project IndexedDB storage.
- **Collaboration store** (`useCollaborationStore`) — Zustand store managing
  user profile, active room, connected peers, comments, conflicts,
  connection status, and share links.
- **Enhanced collaborative project hook** (`useCollaborativeProject`) —
  integrated with collaboration store, auth service, and permission
  service. Added `setEditing()` and `canWrite()` methods, awareness-based
  presence state sync, and comment array sync via Yjs.
- **PresenceIndicator component** — displays connected user avatars with
  online/editing indicators, role tooltips, and connection status dot.
- **CommentPanel component** — full comment UI with threaded replies,
  emoji reactions, resolve/unresolve, edit/delete (author only),
  time-ago display, and CommentBadge for shot cards.
- **ShareDialog component** — modal for creating/joining rooms via share
  codes, managing share links, and configuring room settings.
- **ConflictResolutionPanel component** — floating panel showing CRDT merge
  conflicts with diff view, accept/revert/dismiss actions.
- **RoleManager component** — modal for managing team member roles with
  role badges, admin controls, and member removal.
- **ProfileSetup component** — onboarding modal for setting display name
  and avatar color before joining collaboration rooms.
- **Collaboration feature barrel** (`features/collaboration/index.ts`) —
  exports all collaboration components.

### Changed

- Updated services barrel (`core/services/index.ts`) with collaboration
  service exports.
- Updated store barrel (`core/store/index.ts`) with collaboration store
  export.
- Updated types barrel (`core/types/index.ts`) with collaboration type
  exports.

### Tests

- **119 new unit tests** across 4 test suites:
  - `authService.test.ts` (22 tests) — profile management, caching, reset
  - `permissionService.test.ts` (27 tests) — role enforcement, hierarchy
  - `commentService.test.ts` (36 tests) — CRUD, threading, reactions
  - `useCollaborationStore.test.ts` (34 tests) — all store actions

## [2.5.0] - 2026-02-20

### Added

- **Circuit breaker pattern** for API endpoints with automatic state machine
  (closed → open → half-open), configurable thresholds, rolling windows,
  and IndexedDB persistence (`circuitBreakerService`).
- **Enhanced retry utility** with maximum delay cap, `AbortSignal` support,
  `onRetry` callback, and circuit breaker integration.
- **API health monitoring** service tracking per-endpoint latency, error rates,
  and online/offline status with rolling window analysis (`apiHealthMonitorService`).
- **Cost tracking** with real Google API pricing for Gemini text models,
  Veo video models, and Imagen. Per-call cost estimation, session/lifetime
  recording, and monthly budget alerts (`costTrackingService`, `pricing.ts`).
- **Unified generation queue** with offline-aware scheduling, auto-resume
  on reconnection, executor registration pattern, priority sorting,
  and IndexedDB persistence (`generationQueueService`).
- **Service Worker refactoring** to thin executor model with `START_JOB`,
  `CANCEL_JOB`, `GET_STATUS` message types and `AbortController` support.
- **Model fallback chains** with config-driven fallback selection based on
  circuit breaker health. Five default chains for video, prompt, vision,
  and audio generation (`modelFallbackService`).
- **Streaming prompt generation** via `generateContentStream()` with async
  chunk callbacks, abort support, and `StreamingPromptDisplay` component.
- **Resilient API call wrapper** (`resilientCall`) integrating circuit breaker,
  API health tracking, and enhanced retry in a single function. Applied to
  primary endpoints across all four Gemini service modules.
- **Three new Zustand stores**: `useApiHealthStore`, `useCostStore`,
  `useGenerationQueueStore` — bridging resilience services to React components.
- **Five new UI components** in `shared/components/resilience/`:
  `CostBadge`, `HealthBar`, `QueuePanel`, `StreamingPromptDisplay`, `FallbackToast`.

### Changed

- `videoGenerationService` now routes through `generationQueueService` with
  cost estimates instead of directly posting to the Service Worker.
- `modelProfiles.ts` extended with optional `fallbackChainId` on model profiles.
- All Gemini service modules (`geminiPromptService`, `geminiVisionService`,
  `geminiAudioService`, `geminiProductionService`) updated to use `resilientCall`
  for primary entry-point functions.

## [2.4.0] - 2026-02-17

### Added

- **i18n infrastructure** via `react-i18next` with namespace-based JSON translations.
  - 13 translation namespaces: common, prompt, history, templates, studios, wizard,
    tutorial, tooltips, errors, project, search, settings, toasts.
  - Full English (EN) extraction from legacy `translations.ts` into JSON files.
  - Stub files for Spanish (ES), French (FR), and Japanese (JA).
  - `changeAppLanguage()` function with lazy-loading for non-EN bundles.
  - `I18nextProvider` wired into the app entry point.
  - Bridge hook `useUIStrings()` for gradual component migration.
- **Hash-based routing** via `react-router-dom` v6 with `createHashRouter`.
  - Core routes: `/` (prompt builder), `/composer`, `/settings`.
  - Lazy-loaded route components with catch-all redirect.
  - Electron `file://` protocol compatible.
- **Full-page Settings route** (`/settings`) with language selector, theme mode toggle,
  accent color picker, API configuration, plugin registry, and desktop settings tabs.
- **Theme accent color system** with 6 HSL-based presets:
  Default (Cyan), Midnight, Ocean, Forest, Sunset, Amethyst.
  - `ThemeService` singleton for mode/accent management with idb-keyval persistence.
  - CSS custom properties `--accent-hue`, `--accent-saturation`, and full
    `--accent-50` through `--accent-900` scale in `tokens.css`.
  - `theme-presets.css` with `[data-accent]` selectors.
  - `[data-theme='light']` selector in tokens.css for new component adoption.
- **Sidebar i18n migration** — all navigation labels now use `useTranslation('common')`.
- **`arrow-left` icon** added to `IconName` type and `Icon` component.
- **Translation coverage script** (`scripts/check-translations.mjs`) —
  reports missing keys per language vs EN reference.
- **31 new unit tests** for ThemeService, i18n config, and router config.

### Changed

- **App entry point** (`index.tsx`) — provider hierarchy updated with
  `I18nextProvider` and `RouterProvider`.
- **App.tsx** refactored to use `Outlet`, `useLocation`, `useNavigate` from
  react-router-dom. Composer and Settings are now routed, not state-driven.
- **Vite config** — added `router` and `i18n` manual chunks for code splitting.
- **test-utils.tsx** — `AllProviders` wrapper now includes `I18nextProvider`
  and `MemoryRouter`.

## [2.3.0] - 2026-02-17

### Added

- **Visual regression coverage** via new Playwright suite in `e2e/visual-regression.spec.ts`
  capturing stable snapshots for prompt shell, output panel empty state, Visual Composer, and
  Storyboard shell.
- **Additional visual snapshots** for workspace/project management surfaces:
  `project-manager-empty` and `workspace-manager-shell`.
- **Composer tour E2E coverage** in `e2e/onboarding-composer.spec.ts` to validate the full walkthrough.
- **Visual Composer onboarding walkthrough** with a dedicated `composer` tutorial flow, including
  toolbar/palette/canvas step targets and a new Composer toolbar `Tour` action.

### Changed

- **Progressive EmptyState adoption** expanded across key panels:
  `HistoryPanel`, `VariationsPanel`, `ScriptBreakdown`, `ProjectManager`, and
  `LocationManagerModal`.
- **Further EmptyState adoption** in `ProjectManagerModal`, `WorkspaceManagerModal`,
  and plugin `PluginList` empty views for consistent UX.
- **More EmptyState adoption** across jobs, variables, and batch generation empty views.
- **Additional EmptyState adoption** across `RegistryBrowser` and Marketplace empty states
  (`Browse`, `Installed`, `Updates`) for consistent UX.
- **E2E modal dismissal hardening** in `e2e/helpers.ts` and visual setup to reduce
  onboarding/overlay flake during screenshots.
- **Documentation refresh** in `docs/USER_GUIDE.md`, `docs/AUTO_UPDATE.md`, and
  `docs/CLAUDE_CONTINUATION_SUMMARY.md` for onboarding and empty-state behavior.
- **Cross-platform lint CI command** now uses `scripts/lint-ci.mjs` to read `.lint-threshold`
  without Unix shell substitution noise on Windows.

## [2.1.0] - 2026-02-15

**Theme**: Critical Fixes & Code Quality

### Fixed

- **Memory leak** in `videoEditorService.ts` — event listener now properly removed on cleanup
- **Security: process.env exposure** in `vite.config.ts` — replaced open `process.env` with explicit allowlist of safe variables
- **Plugin sandbox TODO** in `pluginSandboxService.ts:689` — now returns a descriptive error instead of silently failing
- **Project import/export TODOs** in `projectService.ts:378,414` — replaced with JSDoc documentation
- **Runtime bugs in ImageStudio** — `uiStrings.title`, `uiStrings.promptLabel`, `uiStrings.uploadLabel` were accessing non-existent keys, rendering `undefined`; added missing translation keys to `translations.ts`
- **Coverage thresholds** — aligned `ROADMAP.md` to actual config; raised to 20/15/20/20

### Changed

#### Console.log Migration (31+ statements)

- Migrated all `console.log`/`console.warn`/`console.error` calls to centralized `logger` service across 11 files: `pluginService.ts` (17), `PluginList.tsx`, `InspectorPanel.tsx`, `smartCropService.ts`, `sfxService.ts`, `lipSyncService.ts`, `videoGenerationService.ts`, `useVideoGeneration.ts`, `internalPlugins.ts`, `promptBuilder.ts` (2)

#### Type Safety Pass 1: `uiStrings: any` to `UIStrings` (11 occurrences)

- Typed `uiStrings` props in 10 component/utility files: `TutorialGuide.tsx`, `SunoSongStudio.tsx`, `ProjectManager.tsx`, `pdfExport.ts`, `ImageStudio.tsx`, `VideoGenerationStudio.tsx`, `VideoAnalysisStudio.tsx`, `SpatialDirectorModal.tsx`, `WizardModal.tsx`, `StoryBoard.tsx`
- Added `SectorId` type and `as const` assertion for SECTORS array in `SpatialDirectorModal.tsx`

#### Type Safety Pass 2: Service & Store Internals (30+ `any` eliminated)

- `autosaveService.ts` — 6 `any` replaced with `Record<string, unknown>`
- `jobQueueService.ts` — 1 `any` replaced with `unknown`
- `databaseService.ts` — 6 `any` replaced with `UseStore`, `unknown[]`; fixed `record` narrowing in restore loop
- `presetManager.ts` — 2 `any` replaced with `Record<string, string | number | boolean>`
- `settingsResolutionService.ts` — 1 `any` replaced with `Record<string, unknown>`
- `apiExportService.ts` — 5 of 7 `any` typed properly (JSONAPIDocument, HALDocument); 2 kept with justification (OpenAPI dynamic paths/schemas)
- `videoEditorService.ts` — `titleConfig?: any` replaced with inline type matching `Shot['titleConfig']`
- `videoGenerationService.ts` — `settings: any` replaced with new exported `VideoGenerationSettings` interface
- `types/index.ts` — `GenerationTask.settings: any` replaced with `Record<string, unknown>`
- `uiSlice.ts` — `as any` replaced with `as Partial<UiSlice>`
- `timelineSlice.ts` — `value: any` replaced with `Shot[keyof Shot]`
- `useAppStore.ts` — added justification comments to Zustand slice pattern `as any` casts

#### ESLint Suppression Audit (all 199 directives reviewed)

- Added justification comments to all 7 `react-hooks/exhaustive-deps` suppressions (legitimate patterns: cleanup-only effects, hydration triggers, store reference stability)
- Added justification comments to all 23 `jsx-a11y` suppressions (legitimate patterns: modal backdrop, stopPropagation, draggable canvas, resize handles, timeline ruler)

### Added

#### New Tests

- **`projectService.test.ts`** — 32 tests covering createProject, getProject, getAllProjects, updateProject, deleteProject, archiveProject, unarchiveProject, duplicateProject, setCurrentProject, getCurrentProjectId, exportProject, importProject, searchProjects, getStats, updateMetadata, initialize
- **`promptBuilder.test.ts`** — 27 tests covering `interpolateVariables` (6 tests), `buildGeminiPrompt` (6 tests), `buildShotPrompt` (9 tests), `enforceLore` (6 tests)
- **`geminiService.test.ts`** — 19 tests covering `cleanJson` helper (16 edge cases), `generateSoundEffect` delegation, `generateStoryboard` orchestration and error propagation
- Exported `cleanJson` helper from `geminiService.ts` for direct unit testing

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

## [3.5.0-legacy] - 2026-02-09

> **Note:** This entry records the pre-roadmap application state. The semver v3.5.0 release is listed above.

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

**Note:** Version 3.5.0-legacy represents the state before the structured roadmap implementation. Starting with v1.1.0, we follow strict semantic versioning and release discipline.
