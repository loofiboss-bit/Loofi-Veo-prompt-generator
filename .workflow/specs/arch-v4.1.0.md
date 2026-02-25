# Architecture Spec — v4.1.0 "Refactor Continuation"

## Design Rationale

v4.1.0 continues the refactor trajectory established in v4.0.0 by focusing on structural simplification, resilience hardening, and measurable startup/runtime guardrails. This slice is intentionally incremental: preserve stable contracts, reduce orchestration complexity in the app shell, and tighten edge-case behavior in direct export and queued replay flows.

## Scope

1. Continue `App.tsx` decomposition into dedicated layout orchestration modules.
2. Harden direct-export preflight/failure mapping and user recovery flows.
3. Tighten offline-first queue replay behavior across startup and service-worker resume boundaries.
4. Expand instrumentation for startup and first-interactive performance markers.

## Non-Goals

1. New feature families outside refactor/resilience scope.
2. Plugin API contract changes.
3. Broad visual redesign unrelated to shell extraction and error-state clarity.

## Interfaces and Compatibility

- Preserve service/store public contracts unless explicitly versioned.
- Keep TypeScript strict-mode clean and retain path-alias conventions.
- Maintain existing export-mode and queue semantics for successful paths.
- Degrade gracefully when host integrations are unavailable.

## Reliability Constraints

1. Direct export failures must map to stable, typed reasons with actionable UI messaging.
2. Queue replay must not silently drop jobs during restart/offline transitions.
3. Startup ordering must ensure replay dependencies are available before resume execution.
4. No raw `console.*` introduction; centralized logging only.

## Acceptance Anchors

- App shell decomposition is done when extracted modules own panel/overlay orchestration and `App.tsx` shrinks without behavior drift.
- Export resilience is done when preflight and failure mapping are deterministic and fully test-covered.
- Queue replay hardening is done when startup + online transitions replay jobs deterministically and test coverage reflects it.
- Performance instrumentation is done when startup marks are emitted and baseline docs are updated.
