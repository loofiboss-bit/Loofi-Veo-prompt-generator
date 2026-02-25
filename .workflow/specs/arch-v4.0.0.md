# Architecture Spec — v4.0.0 "AI Refactor & Expansion"

## Design Rationale

v4.0.0 extends prior architectural refactors with a strict requirement to
close feature quality gaps using acceptance-driven execution. This cycle treats
`.ai/ROADMAP.md` as canonical status truth and uses workflow artifacts to prevent
planning drift.

The current focus is phase-completion correctness:

1. Keep Phase 1 completed work stable (lazy loading, mediator, worker isolation).
2. Close Task 2.3 using UX and error-handling completeness, not code-exists checks.
3. Close Task 2.4 using deterministic offline-first queue behavior under restart/offline transitions.
4. Keep roadmap, workflow tasks, and run-manifest metadata synchronized.

## Scope

1. Status reconciliation for v4 planning artifacts (roadmap-first governance).
2. NLE direct API bridge hardening across service + feature integration points.
3. Offline-first queueing hardening across queue service + startup hydration + service worker boundary.
4. Focused unit/integration test coverage for all touched v4 paths.

## Non-Goals

1. New feature expansions outside v4 Task 2.3 and 2.4 closure criteria.
2. Broad UI redesign unrelated to NLE export or queueing resilience.
3. Plugin architecture or cross-version roadmap restructuring.

## Interfaces and Compatibility

- Preserve existing public service/store contracts unless an explicit migration is documented.
- Maintain TypeScript strict-mode compatibility and existing path alias conventions.
- Ensure any NLE integration hardening degrades gracefully when host integration is unavailable.
- Preserve queue persistence behavior and ordering guarantees for existing queued jobs.

## Reliability and Security Constraints

1. Fail closed with explicit typed errors for invalid direct-export preconditions.
2. Keep user-facing failures actionable (recover/retry guidance where applicable).
3. Avoid silent queue drops during offline/restart transitions.
4. Maintain centralized logging and avoid introducing raw console output.

## Acceptance Anchors

- **Task 2.3 done** when bridge behavior is test-covered and user-visible states are deterministic for success/failure/retry scenarios.
- **Task 2.4 done** when queue hydration, offline enqueueing, replay, and retry policies are deterministic and test-covered.
- **Governance done** when roadmap/tasks/run-manifest show consistent v4 progress with no contradictory status strings.

## Task 2.3 Acceptance Matrix

| Check                               | Layer      | Pass Criteria                                                                                                    |
| ----------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Preflight readiness                 | service/UI | UI receives deterministic readiness state before direct export action and disables direct mode when unavailable. |
| Payload validation                  | service    | Empty timeline name, zero clips, and zero duration fail fast with explicit user-facing errors.                   |
| Resolve availability/running states | service/UI | Not detected and not running states produce distinct actionable guidance and fallback suggestions.               |
| Bridge failure mapping              | service    | Unexpected bridge exceptions map to a stable `bridge_error` reason and retry-capable result.                     |
| Direct-export UX guard              | feature UI | Direct action cannot be triggered when bridge preflight says unavailable.                                        |
| Regression coverage                 | tests      | Unit tests validate readiness + validation + unavailable/running/success paths and modal disabled state.         |

## Task 2.4 Acceptance Matrix

| Check                        | Layer        | Pass Criteria                                                                                                             |
| ---------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Offline enqueue preservation | service      | Jobs enqueued while offline remain queued and are marked as offline-queued without being processed immediately.           |
| Online replay trigger        | service/hook | Reconnection transitions queued-offline jobs into replay-ready state and processing resumes deterministically.            |
| Hydration replay ordering    | hook/service | Executors are registered before queue hydration so recovered queued jobs can replay without executor-missing stalls.      |
| Service-worker resume bridge | hook/SW      | App sends explicit `RESUME_QUEUED_JOBS` signal with API key when online and service worker can process queued jobs.       |
| SW offline buffering         | SW           | `START_JOB` received while offline is persisted as queued state with user-visible resume context instead of hard failure. |
| Regression coverage          | tests        | Unit tests cover offline pause marker behavior and app-init resume signaling path.                                        |
