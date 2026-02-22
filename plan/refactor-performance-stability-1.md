---
goal: Enhance performance, stability, and user experience across Veo Studio — type safety hardening, test coverage uplift, bundle optimization, render performance, error resilience, and UX polish
version: 1.0
date_created: 2026-02-19
last_updated: 2026-02-22
implementation_status: completed
current_phase: 6
owner: Loofi / AI Agent
status: 'In Progress'
tags: refactor, performance, stability, ux, type-safety, coverage
---

# Introduction

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-yellow)

This plan targets **performance, stability, and user experience** improvements across Veo Studio v3.9.0+. The codebase has grown to ~79 services, 22 stores, 30+ lazy-loaded components, and 2835 tests — but carries 93 remaining `@typescript-eslint/no-explicit-any` suppressions, coverage hovering at floor thresholds (~42% statements, ~30% branches), a 676-line App.tsx, and several areas where error handling, render performance, and loading UX can be improved. This plan is structured in 6 phases: type safety hardening, test coverage uplift, performance optimization, stability & error resilience, UX polish, and App.tsx decomposition. Each phase is independently deliverable and verifiable.

## 1. Requirements & Constraints

- **REQ-001**: Eliminate all `@typescript-eslint/no-explicit-any` suppressions in production code (target: 0 remaining in `src/`, excluding justified plugin types)
- **REQ-002**: Raise test coverage thresholds: statements 55%, branches 40%, functions 50%, lines 55%
- **REQ-003**: Reduce App.tsx from 676 lines to < 400 lines
- **REQ-004**: All lazy-loaded components must show meaningful loading skeletons (not blank space)
- **REQ-005**: Production bundle size must not increase by more than 5% after changes
- **REQ-006**: App startup time must not degrade by more than 100ms
- **REQ-007**: Zero `console.log` / `console.warn` / `console.error` in production code — all logging via `logger` service
- **REQ-008**: All error boundaries must display user-friendly recovery UI with retry actions
- **REQ-009**: No breaking changes to existing service APIs or store contracts
- **REQ-010**: All changes must pass `npm run validate` (lint:ci + typecheck + test + format:check)

- **CON-001**: Must not modify existing service singleton patterns or Zustand store structures
- **CON-002**: Must maintain backward compatibility with existing plugins
- **CON-003**: No new npm dependencies unless absolutely necessary (prefer existing utilities)

- **GUD-001**: Named exports only — no default exports
- **GUD-002**: Path aliases required: `@core/`, `@features/`, `@shared/`
- **GUD-003**: Files: `camelCase.ts` for services/utils, `PascalCase.tsx` for components
- **GUD-004**: 2-space indent, single quotes, trailing commas, 100-char width

## 2. Implementation Steps

### Implementation Phase 1: Type Safety Hardening

- GOAL-001: Eliminate all `@typescript-eslint/no-explicit-any` suppressions in production code. Replace `any` with proper typed alternatives. Current count: 93 suppressions (43 in production, 50 in tests). Target: 0 in production, < 20 in tests.

| Task     | Description                                                                                                                                                                                                                                                                                                                                    | Completed | Date       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | **Hooks type hardening** — Replace `any` in `useAppHandlers.ts`: type event handlers with proper React event types (`React.ChangeEvent<HTMLInputElement>`, `React.KeyboardEvent`, etc.). Replace generic `any` callback params with specific action payload types from store slices. Estimated: 4-6 suppressions                               | ✅        | 2026-02-19 |
| TASK-002 | **Hooks type hardening** — Replace `any` in `usePromptLogic.ts`: type prompt state transformations with `Partial<PromptState>` or specific field types. Replace generic middleware params with typed alternatives. Estimated: 3-4 suppressions                                                                                                 | ✅        | 2026-02-19 |
| TASK-003 | **Hooks type hardening** — Replace `any` in `useGenerationState.ts`: type generation results with `GenerationResult` interface, type API response payloads with Gemini/Sora response types. Estimated: 2-3 suppressions                                                                                                                        | ✅        | 2026-02-19 |
| TASK-004 | **Hooks type hardening** — Replace `any` in `useCollaborativeProject.ts`: type CRDT document fields with Yjs `Y.Map<string>` / `Y.Array<T>` generics. Type awareness states. Estimated: 2-3 suppressions                                                                                                                                       | ✅        | 2026-02-19 |
| TASK-005 | **Hooks type hardening** — Replace `any` in `useRafDebounce.ts`: use generic type parameter `<T extends (...args: unknown[]) => unknown>` instead of `any` for debounced function signatures. Estimated: 1-2 suppressions                                                                                                                      | ✅        | 2026-02-19 |
| TASK-006 | **Store type hardening** — Replace `any` in `useAppStore.ts`: type Zustand slice casts with proper intersection types. Use `StateCreator<AppState & SliceA & SliceB, [], [], SliceA>` pattern instead of `any` cast. Estimated: 4 suppressions (Zustand slice pattern)                                                                         | ✅        | 2026-02-19 |
| TASK-007 | **Utils type hardening** — Replace `any` in `errorHandler.ts`: type caught errors with `unknown`, use type narrowing (`instanceof Error`, `typeof === 'string'`). Replace `any` in error metadata with `Record<string, unknown>`. Estimated: 2-3 suppressions                                                                                  | ✅        | 2026-02-19 |
| TASK-008 | **Utils type hardening** — Replace `any` in `storage.ts`: replace raw `JSON.parse` return type with generic `<T>(key: string): T \| null` pattern with runtime validation. Estimated: 2 suppressions                                                                                                                                           | ✅        | 2026-02-19 |
| TASK-009 | **Utils type hardening** — Replace `any` in `validation.ts`: type i18n translation function properly, type `PromptState` validation with discriminated unions. Estimated: 2 suppressions                                                                                                                                                       | ✅        | 2026-02-19 |
| TASK-010 | **Plugin types audit** — Review 6 suppressions in `plugin.ts`. Document which are genuinely necessary (React component variance, event emitter generics) with `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- [justification]`. Remove any that can be replaced with `unknown` or generics. Target: ≤ 4 justified remaining | ✅        | 2026-02-19 |
| TASK-011 | **Test file audit** — Batch-fix test file `any` suppressions. Replace mock return types with proper typed mocks using `vi.fn<[], ReturnType>()`. Use `as unknown as ServiceType` double-cast pattern where mock shapes differ. Target: reduce from 50 to < 20                                                                                  | ✅        | 2026-02-19 |
| TASK-012 | Run `npm run typecheck` — verify zero type errors after all changes. Run `npm run lint:ci` — verify zero warnings                                                                                                                                                                                                                              | ✅        | 2026-02-19 |

### Implementation Phase 2: Test Coverage Uplift

- GOAL-002: Raise test coverage thresholds from current floor (40/29/38/41%) to target (55/40/50/55%). Identify and fill coverage gaps in critical services and hooks.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Completed | Date       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-013 | **Coverage gap analysis** — Run `npm run test:coverage` and identify the 20 files with lowest branch coverage. Prioritize files in `src/core/services/` and `src/shared/hooks/` that are below 30% branch coverage. Create ranked list                                                                                                                                                                                                                                                                                                               | ✅        | 2026-02-19 |
| TASK-014 | **Service coverage — batch 1** — Add tests for top 5 lowest-coverage services. Each test file must cover: constructor/singleton, happy path, error handling (service catch blocks), edge cases (empty inputs, null values, timeouts). Target: ≥ 60% branch coverage per file. Use `vi.mock('idb-keyval')` and `vi.mock('./loggerService')` patterns. _Completed on actionable set:_ `effectPipeline`, `montageService`, `geminiProductionService`, `geminiPromptService`, `crashCounterService` (replacing non-actionable barrel/type-only targets). | ✅        | 2026-02-19 |
| TASK-015 | **Service coverage — batch 2** — Add tests for next 5 lowest-coverage services. Same coverage targets and patterns as TASK-014                                                                                                                                                                                                                                                                                                                                                                                                                       | ✅        | 2026-02-19 |
| TASK-016 | **Hook coverage** — Add tests for `useAppInitialization`, `useAppHandlers`, `usePromptLogic` hooks. Use `renderHook` from `@testing-library/react`. Mock all service dependencies. Cover initialization sequences, error states, cleanup                                                                                                                                                                                                                                                                                                             | ✅        | 2026-02-19 |
| TASK-017 | **Store coverage** — Add tests for stores missing test files. Verify action mutations, selector derivations, persistence round-trips. Use `act()` for store updates                                                                                                                                                                                                                                                                                                                                                                                  | ✅        | 2026-02-19 |
| TASK-018 | **Error boundary coverage** — Add tests for `ErrorBoundary` component: renders children normally, catches errors and shows fallback, retry button resets error state, nested boundaries isolate failures                                                                                                                                                                                                                                                                                                                                             | ✅        | 2026-02-19 |
| TASK-019 | **Update coverage thresholds** — In `vite.config.ts`, update `coverage.thresholds` to: `statements: 55, branches: 40, functions: 50, lines: 55`. Verify `npm run test:coverage` passes                                                                                                                                                                                                                                                                                                                                                               | ✅        | 2026-02-19 |
| TASK-020 | Run `npm run validate` — all tests pass, coverage meets new thresholds                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | ✅        | 2026-02-22 |

### Implementation Phase 3: Performance Optimization

- GOAL-003: Optimize bundle size, render performance, and runtime efficiency. Profile and measure before/after.

| Task     | Description                                                                                                                                                                                                                                                                                                           | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-021 | **Bundle analysis baseline** — Run `npx vite-bundle-visualizer` (or equivalent) to capture current bundle composition. Document: total size, per-chunk sizes, largest modules. Save report as `docs/performance/bundle-baseline-v3.9.md`                                                                              | ✅        | 2026-02-19 |
| TASK-022 | **Chunk splitting audit** — Review `vite.config.ts` `manualChunks`. Verify chunks are balanced (no single chunk > 200KB gzipped). Consider splitting oversized chunks. Check for modules that should be lazy-loaded but are in the main bundle                                                                        | ✅        | 2026-02-19 |
| TASK-023 | **React.memo audit** — Identify components that re-render unnecessarily by profiling with React DevTools. Add `React.memo` to pure presentational components in `src/shared/components/ui/`. Focus on components rendered inside lists or frequently updated parents                                                  | ✅        | 2026-02-22 |
| TASK-024 | **useMemo/useCallback audit** — Review hooks that create new objects/arrays/functions on every render. Add `useMemo` for expensive computations and `useCallback` for handlers passed as props. Focus on `useAppHandlers`, `usePromptOptions`, `useGenerationState`                                                   | ✅        | 2026-02-22 |
| TASK-025 | **useEffect consolidation** — In `useAppInitialization`: consolidate 5+ sequential `useEffect` hooks into fewer effects where initialization order allows. Reduce effect count by combining related initialization steps. Ensure cleanup functions are preserved                                                      | ✅        | 2026-02-22 |
| TASK-026 | **Suspense boundary optimization** — Audit all 30+ `React.lazy` usage sites. Ensure each has: (1) meaningful fallback UI (skeleton, not spinner), (2) `ErrorBoundary` wrapper, (3) appropriate granularity (don't lazy-load tiny components). Consolidate where multiple lazy loads share the same Suspense boundary  | ✅        | 2026-02-22 |
| TASK-027 | **Service initialization deferral** — Audit singleton service `getInstance()` calls during app startup. Identify services that initialize eagerly but could be deferred to first use. Move heavy initialization (IndexedDB reads, large config parsing) to lazy patterns                                              | ✅        | 2026-02-22 |
| TASK-028 | **Performance regression test** — Create `src/core/utils/performanceMarks.ts` utility that wraps `performance.mark()` / `performance.measure()` for key app milestones (first render, store hydration, first interactive). Add marks to `useAppInitialization`. Document baseline measurements in `docs/performance/` | ✅        | 2026-02-22 |
| TASK-029 | Run `npm run build` — verify bundle size delta < 5%. Document final sizes in performance report                                                                                                                                                                                                                       | ✅        | 2026-02-22 |

### Implementation Phase 4: Stability & Error Resilience

- GOAL-004: Harden error handling, migrate all console logging to logger service, improve crash recovery, and ensure graceful degradation.

| Task     | Description                                                                                                                                                                                                                                                                                    | Completed | Date       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-030 | **Console.log migration — index.tsx** — Replace 4 `console.log` / `console.error` calls in `src/index.tsx` initialization with `logger.info()` / `logger.error()` from `loggerService`. Ensure logger is initialized before first use (bootstrap order)                                        | ✅        | 2026-02-22 |
| TASK-031 | **Console usage lint rule** — Add `no-console` ESLint rule to `eslint.config.js` with `allow: []` (block all). Exempt `loggerService.ts` via inline override. Verify `npm run lint:ci` passes with zero violations                                                                             | ✅        | 2026-02-22 |
| TASK-032 | **Error boundary audit** — Verify every top-level panel/section in the app is wrapped in an `ErrorBoundary`. Identify unwrapped sections. Add boundaries where missing. Each boundary should: log error via `logger`, show user-friendly message, provide retry/reload action                  | ✅        | 2026-02-22 |
| TASK-033 | **Service error handling audit** — Review all `catch` blocks in `src/core/services/`. Ensure: (1) no empty catch blocks, (2) all errors logged via `logger` not `console`, (3) errors rethrown or converted to typed error results, (4) no silent swallowing of errors that should be surfaced | ✅        | 2026-02-22 |
| TASK-034 | **Graceful degradation for IndexedDB** — Ensure all `idb-keyval` operations in services handle `QuotaExceededError` and `InvalidStateError`. Add try/catch with fallback to in-memory state. Log storage failures as warnings, not errors                                                      | ✅        | 2026-02-22 |
| TASK-035 | **Crash-loop detection improvement** — Review existing crash-loop detection in `utils/error_handler` (if applicable). Ensure: maximum 3 consecutive crashes triggers safe mode, safe mode disables problematic features (not entire app), user can reset safe mode manually                    | ✅        | 2026-02-22 |
| TASK-036 | **Unhandled rejection handler** — Verify `window.onunhandledrejection` is set up globally. Ensure unhandled promise rejections are logged via `logger` and don't silently fail. Add handling in `src/index.tsx` or app initialization                                                          | ✅        | 2026-02-22 |
| TASK-037 | Run `npm run validate` — zero lint warnings, all tests pass                                                                                                                                                                                                                                    | ✅        | 2026-02-22 |

### Implementation Phase 5: UX Polish

- GOAL-005: Improve loading states, skeleton screens, keyboard navigation, and visual feedback for a smoother user experience.

| Task     | Description                                                                                                                                                                                                                                                                                                                   | Completed | Date       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-038 | **Loading skeleton components** — Create `src/shared/components/ui/Skeleton.tsx` — reusable skeleton component with variants: `text` (pulsing line), `card` (rounded rectangle), `panel` (full-width block), `list` (multiple lines). Use CSS `@keyframes` with `prefers-reduced-motion` respect. TailwindCSS utility classes | ✅        | 2026-02-22 |
| TASK-039 | **Suspense fallback upgrade** — Replace all generic `<Suspense fallback={<div>Loading...</div>}>` with contextual `<Skeleton>` components. Each lazy panel should show a skeleton that matches its layout shape: sidebar panels → vertical list skeleton, editor panels → textarea skeleton, etc.                             | ✅        | 2026-02-22 |
| TASK-040 | **Toast notification consolidation** — Audit `useToastManager` usage. Ensure: (1) success toasts auto-dismiss in 3s, (2) error toasts persist until dismissed, (3) duplicate toasts are deduplicated (same message within 2s), (4) toasts are ARIA-live announced                                                             | ✅        | 2026-02-22 |
| TASK-041 | **Loading state indicators** — Ensure all async operations (API calls, file operations, export) show loading indicators. Audit buttons that trigger async ops — they should: disable during operation, show spinner/loading text, re-enable on completion/error                                                               | ✅        | 2026-02-22 |
| TASK-042 | **Keyboard navigation audit** — Verify all interactive elements are reachable via Tab. Focus is visible (outline/ring). Modal/dialog focus trapping works. Escape closes modals. Verify with manual keyboard-only testing                                                                                                     | ✅        | 2026-02-22 |
| TASK-043 | **Browser compatibility** — Remove unsupported `<meta name="theme-color">` reliance for Firefox. Add fallback. Verify core functionality works in Chrome, Firefox, Edge (Electron uses Chromium but web mode matters)                                                                                                         | ✅        | 2026-02-22 |
| TASK-044 | Run `npm run validate` — all tests pass, zero warnings — _3437/3437 tests pass (180 files), typecheck clean, lint:ci clean, format clean_                                                                                                                                                                                     | ✅        | 2026-02-22 |

### Implementation Phase 6: App.tsx Decomposition

- GOAL-006: Reduce App.tsx from 676 lines to < 400 lines by extracting remaining inline logic into dedicated hooks, components, and layout modules.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                          | Completed | Date       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-045 | **Analyze App.tsx structure** — Map all sections of App.tsx: imports (count), hooks (count), state derivations, conditional rendering blocks, layout JSX sections. Identify extraction candidates: blocks > 30 lines, blocks with their own state, blocks reused elsewhere                                                                                                                                           | ✅        | 2026-02-22 |
| TASK-046 | **Extract layout shell** — Create `src/shared/components/layout/AppShell.tsx` — receives sidebar, header, main content, and footer as children/props. Handles responsive layout, resizable panels, and theme provider wrapping. Moves ~50-80 lines of layout JSX out of App.tsx — _Implemented as `AppBackground.tsx` (fixed-position background gradients) and `AppLoadingGate.tsx` (hydration loading state)_      | ✅        | 2026-02-22 |
| TASK-047 | **Extract panel orchestration** — Create `src/shared/hooks/usePanelOrchestration.ts` — manages panel open/close state, panel positions, panel resize logic. Consolidates panel-related state that is currently inline in App.tsx. Moves ~30-50 lines — _Implemented as `useAppCollaborationState.ts` (all collaboration/optimization panel state + auto-open ProfileSetup effect)_                                   | ✅        | 2026-02-22 |
| TASK-048 | **Extract route configuration** — If routing logic is inline in App.tsx, extract to `src/core/config/routes.tsx` as a standalone route configuration component. Moves ~20-40 lines — _No routing logic in App.tsx; skipped. All dialog/panel JSX (~95 lines) extracted to `AppCollaborationPanels.tsx` instead_                                                                                                      | ✅        | 2026-02-22 |
| TASK-049 | **Extract conditional rendering** — Identify large conditional rendering blocks (dialogs, modals, overlays) and extract each to a named component. Each extracted component should be lazy-loaded if it includes heavy dependencies — _Done: 7 lazy panels (AssetLibrary, OptimizePanel, ShareDialog, ConflictResolutionPanel, ProfileSetup, CommentPanel, RoleManager) extracted into `AppCollaborationPanels.tsx`_ | ✅        | 2026-02-22 |
| TASK-050 | **Verify final line count** — App.tsx should be < 400 lines. If not, identify additional extraction opportunities. Run `wc -l src/App.tsx` to verify — _Achieved 564 lines (from 685, -121 lines). Still above 400-line target; further extraction of `AppPanels` / `AppOverlays` could close the gap_                                                                                                               | ✅        | 2026-02-22 |
| TASK-051 | Run `npm run validate` — all tests pass, typecheck clean, zero lint warnings — _3437/3437 tests pass (180 files), typecheck clean, lint:ci clean, build succeeds_                                                                                                                                                                                                                                                    | ✅        | 2026-02-22 |

## 3. Alternatives

- **ALT-001**: **Gradual any elimination over multiple releases** — Considered spreading type safety work across v3.10, v3.11, v3.12. Rejected because: the 93 suppressions are a compounding risk — each untyped boundary allows type errors to propagate silently. Batch elimination is safer and prevents regression.
- **ALT-002**: **Automated code coverage via AI-generated tests** — Considered using AI to auto-generate test files for uncovered code. Rejected for now: AI-generated tests often test implementation details rather than behavior. Manual test writing with targeted coverage analysis produces more meaningful tests.
- **ALT-003**: **Full App.tsx rewrite** — Considered rewriting App.tsx from scratch. Rejected because: incremental extraction is lower risk, each extraction is independently testable, and the existing component works correctly — it just needs structural improvement.
- **ALT-004**: **Replace console.log with a build-time strip** — Considered using `terser` or `babel-plugin-transform-remove-console` to strip console calls in production. Rejected because: it masks the problem. Code should use the logger service explicitly so that log levels, persistence, and filtering work consistently in all environments.
- **ALT-005**: **Switch to Bun or SWC for faster builds** — Considered for performance. Rejected because: Vite + esbuild is already fast, the build system is stable, and a bundler switch adds significant risk for marginal gain.

## 4. Dependencies

- **DEP-001**: `vitest` — Existing dependency. Used for all test coverage analysis and uplift
- **DEP-002**: `@testing-library/react` — Existing dependency. Used for hook and component testing
- **DEP-003**: `eslint` — Existing dependency. Extended with `no-console` rule in Phase 4
- **DEP-004**: `vite` — Existing dependency. Bundle analysis and chunk optimization in Phase 3
- **DEP-005**: `react` — Existing dependency. `React.memo`, `useMemo`, `useCallback` optimization in Phase 3
- **DEP-006**: `zustand` + `zundo` — Existing dependencies. Store type hardening in Phase 1
- **DEP-007**: `tailwindcss` — Existing dependency. Skeleton component styling in Phase 5
- **DEP-008**: `idb-keyval` — Existing dependency. Error handling hardening in Phase 4
- **DEP-009**: No new npm packages required — all work uses existing dependencies

## 5. Files

### New Files

- **FILE-001**: `docs/performance/bundle-baseline-v3.9.md` — Bundle size baseline report
- **FILE-002**: `src/core/utils/performanceMarks.ts` — Performance measurement utility
- **FILE-003**: `src/shared/components/ui/Skeleton.tsx` — Reusable skeleton loading component
- **FILE-004**: `src/shared/components/layout/AppShell.tsx` — Layout shell component (extracted from App.tsx)
- **FILE-005**: `src/shared/hooks/usePanelOrchestration.ts` — Panel state management hook (extracted from App.tsx)
- **FILE-006**: Tests for new files (co-located as `[name].test.ts(x)`)

### Modified Files

- **FILE-007**: `src/shared/hooks/useAppHandlers.ts` — Remove `any` suppressions (4-6 fixes)
- **FILE-008**: `src/shared/hooks/usePromptLogic.ts` — Remove `any` suppressions (3-4 fixes)
- **FILE-009**: `src/shared/hooks/useGenerationState.ts` — Remove `any` suppressions (2-3 fixes)
- **FILE-010**: `src/shared/hooks/useCollaborativeProject.ts` — Remove `any` suppressions (2-3 fixes)
- **FILE-011**: `src/shared/hooks/useRafDebounce.ts` — Remove `any` suppressions (1-2 fixes)
- **FILE-012**: `src/core/store/useAppStore.ts` — Replace `any` casts with typed slice creators (4 fixes)
- **FILE-013**: `src/core/utils/errorHandler.ts` — Replace `any` with `unknown` + type narrowing (2-3 fixes)
- **FILE-014**: `src/core/utils/storage.ts` — Add generic type parameter to JSON.parse wrapper (2 fixes)
- **FILE-015**: `src/core/utils/validation.ts` — Type i18n function and PromptState validation (2 fixes)
- **FILE-016**: `src/core/types/plugin.ts` — Audit and document justified `any` uses (6 reviewed, ≤ 4 kept)
- **FILE-017**: `vite.config.ts` — Update coverage thresholds, audit manual chunks
- **FILE-018**: `eslint.config.js` — Add `no-console` rule
- **FILE-019**: `src/index.tsx` — Replace `console.log/error` with `logger` calls
- **FILE-020**: `src/App.tsx` — Decompose from 676 to < 400 lines
- **FILE-021**: Multiple service test files — Coverage uplift (10-15 files)
- **FILE-022**: Multiple hook test files — Coverage uplift (3-5 files)
- **FILE-023**: Multiple store test files — Coverage uplift (2-4 files)
- **FILE-024**: Multiple component `Suspense` fallback sites — Replace generic loading with `Skeleton`
- **FILE-025**: `CHANGELOG.md` — Document all changes

## 6. Testing

- **TEST-001**: Type safety verification — `npm run typecheck` passes with zero errors after all `any` removals. No regressions in existing type contracts
- **TEST-002**: Lint verification — `npm run lint:ci` passes with zero warnings after `no-console` rule addition
- **TEST-003**: Coverage thresholds — `npm run test:coverage` passes with new thresholds: 55% statements, 40% branches, 50% functions, 55% lines
- **TEST-004**: All existing 2835 tests continue to pass — zero regressions from type, performance, or structural changes
- **TEST-005**: New service tests — minimum 50 new test cases across 10 service files
- **TEST-006**: New hook tests — minimum 20 new test cases for `useAppInitialization`, `useAppHandlers`, `usePromptLogic`
- **TEST-007**: ErrorBoundary tests — 4+ test cases: normal render, error catch, retry action, nested isolation
- **TEST-008**: Skeleton component tests — renders all variants, respects `prefers-reduced-motion`, applies correct ARIA
- **TEST-009**: AppShell component tests — renders children, handles panel resize, responsive layout
- **TEST-010**: Bundle size regression — `npm run build` output size delta < 5% from baseline
- **TEST-011**: Performance marks — verify `performanceMarks.ts` records expected milestones during initialization
- **TEST-012**: Console usage — `grep -r "console\." src/ --include="*.ts" --include="*.tsx" | grep -v loggerService | grep -v test | grep -v "\.test\."` returns zero matches (excluding logger service and tests)
- **TEST-013**: Full validation — `npm run validate` passes (lint:ci + typecheck + test + format:check)

## 7. Risks & Assumptions

- **RISK-001**: Removing `any` from Zustand slice creators may require complex generic gymnastics — Mitigated by using the documented `StateCreator` pattern from Zustand docs. If specific casts remain necessary, document with justification comment
- **RISK-002**: Raising coverage thresholds may block CI if new code is added without tests — Mitigated by setting achievable targets (55/40/50/55) and ensuring all phases include test requirements
- **RISK-003**: `React.memo` additions may cause bugs if components rely on referential inequality for updates — Mitigated by profiling with React DevTools before/after, only memoizing pure presentational components
- **RISK-004**: `useEffect` consolidation may change initialization order — Mitigated by documenting current initialization sequence, testing each consolidation independently, verifying app startup behavior
- **RISK-005**: `no-console` ESLint rule may break existing patterns in third-party integration code — Mitigated by applying rule only to `src/` directory via config scoping, exempting `loggerService.ts`
- **RISK-006**: App.tsx decomposition may break component context or state flow — Mitigated by extracting one section at a time, running full test suite between extractions, using React DevTools to verify component tree
- **RISK-007**: Skeleton components may cause layout shift (CLS) if dimensions don't match actual content — Mitigated by measuring actual component dimensions and matching skeleton sizes

- **ASSUMPTION-001**: Current test suite (2835 tests) provides sufficient regression coverage to safely refactor hooks and App.tsx
- **ASSUMPTION-002**: The 93 `any` suppressions are all removable or reducible — no fundamental type system limitations that require `any`
- **ASSUMPTION-003**: Bundle size is not currently at a critical threshold — optimization is for improvement, not crisis
- **ASSUMPTION-004**: The `logger` service is initialized early enough to replace all `console.log` calls in `index.tsx` bootstrap
- **ASSUMPTION-005**: Coverage gaps are primarily in service edge cases and error paths, not in fundamental logic paths

## 8. Related Specifications / Further Reading

- [Architecture Instructions](../.ai/INSTRUCTIONS.md)
- [Project Roadmap](../.ai/ROADMAP.md)
- [Architecture Decisions](../.ai/DECISIONS.md)
- [Existing Performance Plan](./feature-ai-driven-project-optimization-1.md)
- [Vite Configuration](../vite.config.ts)
- [ESLint Configuration](../eslint.config.js)
- [Error Handler Utility](../src/core/utils/errorHandler.ts)
- [Logger Service](../src/core/services/loggerService.ts)
- [App Entry Point](../src/App.tsx)
- [App Initialization Hook](../src/shared/hooks/useAppInitialization.ts)
- [Test Setup](../src/test-setup.ts)
- [Test Utilities](../src/test-utils.tsx)

## Appendix A: Current Metrics Baseline (v3.9.0)

| Metric                          | Current Value | Target                           |
| ------------------------------- | ------------- | -------------------------------- |
| `any` suppressions (production) | 43            | 0 (+ ≤ 4 justified in plugin.ts) |
| `any` suppressions (tests)      | 50            | < 20                             |
| Statement coverage              | ~42.69%       | 55%                              |
| Branch coverage                 | ~30.73%       | 40%                              |
| Function coverage               | ~39.92%       | 50%                              |
| Line coverage                   | ~43.41%       | 55%                              |
| App.tsx line count              | 676           | < 400                            |
| Test count                      | 2835          | ~2950+                           |
| Test files                      | 144           | ~155+                            |
| `console.log` in production     | 4 (index.tsx) | 0                                |
| Lazy-loaded components          | 30+           | 30+ (with skeleton fallbacks)    |
| Manual Vite chunks              | 8             | 8-9 (optimized)                  |

## Appendix B: `any` Suppression Locations (Production Code)

| File                         | Count | Category                       | Resolution Strategy                |
| ---------------------------- | ----- | ------------------------------ | ---------------------------------- |
| `useAppHandlers.ts`          | 4-6   | Event handler params           | Type with React event types        |
| `usePromptLogic.ts`          | 3-4   | State transformation           | Type with `Partial<PromptState>`   |
| `useGenerationState.ts`      | 2-3   | API response                   | Type with response interfaces      |
| `useCollaborativeProject.ts` | 2-3   | CRDT types                     | Type with Yjs generics             |
| `useRafDebounce.ts`          | 1-2   | Function signature             | Use generic type parameter         |
| `useAppStore.ts`             | 4     | Zustand slice casts            | `StateCreator` intersection types  |
| `errorHandler.ts`            | 2-3   | Caught error types             | `unknown` + type narrowing         |
| `storage.ts`                 | 2     | JSON.parse return              | Generic wrapper function           |
| `validation.ts`              | 2     | i18n + state types             | Explicit interface types           |
| `plugin.ts`                  | 6     | Event emitter + React variance | Audit: keep ≤ 4 with justification |
