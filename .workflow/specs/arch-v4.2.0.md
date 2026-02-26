# Architecture Spec — v4.2.0 "Refactor Continuation"

## Design Rationale

v4.2.0 extends the refactor path from v4.1.0 with a mixed, dependency-ordered scope: (1) deeper app-shell decomposition to reduce orchestration load in `App.tsx`, (2) export resilience hardening for deterministic recovery states, and (3) performance instrumentation improvements to make startup and first-interactive regressions measurable.

## Scope

1. Continue app-shell decomposition by extracting orchestration boundaries and reducing cross-cutting concerns in `App.tsx`.
2. Improve direct export resilience with explicit preflight/error taxonomy and stable recovery UX paths.
3. Expand performance instrumentation markers and baseline reporting for startup/interactive milestones.
4. Align workflow metadata and roadmap status to prevent version-state drift.

## Assumptions

1. Existing service/store public contracts remain valid and should be preserved unless explicitly versioned.
2. `npm run validate` remains the quality gate for touched scope.
3. Existing logger/error handling patterns continue to be the standard for failure reporting.
4. Workflow artifacts (`race-lock`, `tasks`, `run-manifest`, roadmap) remain authoritative for execution state.

## Non-Goals

1. No new feature families outside refactor/resilience/instrumentation scope.
2. No plugin API contract changes.
3. No broad visual redesign unrelated to shell decomposition and export recovery clarity.
4. No source-runtime implementation in this initialization step.

## Dependencies

1. App-shell extraction tasks depend on active v4.2.0 workflow artifacts.
2. Export UI recovery updates depend on stabilized export service error taxonomy.
3. Performance baseline docs depend on instrumentation landing first.
4. Roadmap drift fix depends on canonical workflow status and version handoff state.

## Acceptance Anchors

- App shell decomposition is done when targeted orchestration moves out of `App.tsx` without behavior regressions and with focused tests.
- Export resilience is done when preflight/failure mapping is deterministic, typed, and reflected in actionable UI states.
- Performance instrumentation is done when startup/interactive markers are emitted consistently and baseline docs are updated.
- Workflow consistency is done when roadmap and workflow artifacts no longer conflict about active/completed version state.
