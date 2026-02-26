# Architecture Spec — v4.3.0 "Composer Reliability + Shell Contracts"

## Design Rationale

v4.3.0 focuses on low-risk reliability hardening after the v4.2.0 refactor/release closure. The slice emphasizes deterministic composer behavior, app-shell contract stability, and stronger regression confidence without introducing broad feature expansion.

## Scope

1. Harden composer graph/evaluation and store utility seams introduced in v4.2.0 extraction.
2. Standardize app-shell panel/overlay prop contracts and guardrails around hook wiring.
3. Add targeted service and UI regression tests for the above reliability surface.
4. Keep workflow/roadmap artifacts synchronized across P1–P4 progression.

## Assumptions

1. v4.2.0 remains complete and released; v4.3.0 starts from the published baseline.
2. Existing public APIs and store contracts are preserved unless explicitly versioned.
3. Quality gate remains `npm run validate` with zero lint/type regressions.
4. Workflow artifacts (`race-lock`, `tasks`, `run-manifest`, roadmap) are canonical state.

## Cross-Layer Constraints

1. No changes to plugin API surface or external IPC contracts in this slice.
2. Composer service/store changes must retain backward-compatible runtime behavior.
3. App shell changes must remain hook-based and avoid widening `AppScaffold` responsibilities.
4. Any new helper modules require co-located tests for deterministic behavior guarantees.

## Non-Goals

1. No major new end-user feature families.
2. No routing overhaul, i18n migration, or theming redesign.
3. No packaging/release automation redesign.
4. No roadmap rewrites beyond v4.3 status alignment.

## Acceptance Anchors

- Architecture finalization is done when this spec defines explicit scope boundaries, constraints, and exclusions.
- Decomposition is done when `tasks-v4.3.0.md` contains dependency-valid atomic contracts.
- Reliability build slices are done when composer and shell contract updates compile cleanly with no API drift.
- Test slices are done when targeted service + UI regression tests cover both happy and edge/failure paths.
- Validation/alignment is done when `npm run validate` passes and workflow artifacts reflect actual progression state.
