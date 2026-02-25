# Tasks — v4.0.0 "AI Refactor & Expansion"

**Date**: 2026-02-25
**Status**: Complete
**Arch Spec**: `arch-v4.0.0.md`

## Task List

---

### TASK001 — Activate v4.0.0 workflow cycle

**ID**: TASK001
**Status**: Complete
**Files**: `.workflow/specs/.race-lock.json`, `.workflow/specs/tasks-v4.0.0.md`, `.workflow/specs/arch-v4.0.0.md`, `.workflow/reports/run-manifest-v4.0.0.json`
**Dep**: none
**Agent**: project-coordinator
**Description**: Activate the v4.0.0 workflow cycle and establish canonical task and architecture contracts for AI refactor and expansion execution.
**Acceptance**: All v4.0.0 control artifacts exist and identify the same target version and in-progress state.
**Docs**: workflow specs
**Tests**: TASK010

---

### TASK002 — Reconcile v4 status sources to roadmap-first truth

**ID**: TASK002
**Status**: Complete
**Files**: `.ai/ROADMAP.md`, `plan/refactor-performance-stability-1.md`, `AI Code Refactoring and Feature Expansion.md`
**Dep**: TASK001
**Agent**: release-planner
**Description**: Normalize conflicting v4 progress markers so roadmap is the canonical source and plan/docs no longer contradict active status.
**Acceptance**: v4 progress and task statuses are internally consistent across canonical and auxiliary planning artifacts.
**Docs**: planning docs
**Tests**: TASK010

---

### TASK003 — Define and enforce Task 2.3 acceptance matrix

**ID**: TASK003
**Status**: Complete
**Files**: `src/core/services/nleDirectExportService.ts`, `src/features/export/ExportModal.tsx`, `src/features/timeline/TimelinePlayer.tsx`
**Dep**: TASK002
**Agent**: architecture-advisor
**Description**: Define concrete done criteria for NLE bridge based on UX quality, robust error handling, and testability rather than code presence alone.
**Acceptance**: A clear pass/fail matrix exists and maps to service behavior, user-facing states, and test scenarios.
**Docs**: architecture notes + inline non-obvious comments
**Tests**: TASK006, TASK007

---

### TASK004 — Implement Task 2.3 UX and error-handling deltas

**ID**: TASK004
**Status**: Complete
**Files**: `src/features/export/ExportModal.tsx`, `src/features/timeline/TimelinePlayer.tsx`, `src/core/services/nleDirectExportService.ts`
**Dep**: TASK003
**Agent**: code-implementer
**Description**: Close 2.3 gaps by adding deterministic failure states, actionable user feedback, and guarded integration flow for direct NLE export.
**Acceptance**: NLE direct export provides explicit success/failure UX paths and resilient behavior for unavailable/invalid integration contexts.
**Docs**: CHANGELOG (Unreleased) if user-visible behavior changes
**Tests**: TASK006, TASK007

---

### TASK005 — Define Task 2.4 offline-first queueing acceptance matrix

**ID**: TASK005
**Status**: Complete
**Files**: `src/core/services/jobQueueService.ts`, `src/shared/hooks/useAppInitialization.ts`, `sw.js`
**Dep**: TASK002
**Agent**: architecture-advisor
**Description**: Specify offline-first queue behavior requirements across hydration, retry semantics, and service-worker-aware execution boundaries.
**Acceptance**: Task 2.4 has explicit acceptance criteria for startup hydration, offline enqueueing, replay behavior, and failure recovery.
**Docs**: architecture notes
**Tests**: TASK008

---

### TASK006 — Add service-level tests for Task 2.3 bridge hardening

**ID**: TASK006
**Status**: Complete
**Files**: `src/core/services/nleDirectExportService.test.ts`
**Dep**: TASK004
**Agent**: test-writer
**Description**: Add focused unit tests for bridge service success, dependency-unavailable, validation failure, and transport-failure paths.
**Acceptance**: Service-level 2.3 test suite validates core error mapping and stable return contracts.
**Docs**: test file doc comments where needed
**Tests**: self

---

### TASK007 — Add feature/integration tests for Task 2.3 user flows

**ID**: TASK007
**Status**: Complete
**Files**: `src/features/export/ExportModal.test.tsx`, `src/features/timeline/TimelinePlayer.test.tsx`
**Dep**: TASK004
**Agent**: test-writer
**Description**: Validate user-visible NLE direct export behavior including disabled states, failure messaging, and retry/cancel actions where applicable.
**Acceptance**: UI tests cover both happy path and guarded-failure path transitions for direct export mode.
**Docs**: test notes
**Tests**: self

---

### TASK008 — Implement and test Task 2.4 offline-first queueing deltas

**ID**: TASK008
**Status**: Complete
**Files**: `src/core/services/jobQueueService.ts`, `src/shared/hooks/useAppInitialization.ts`, `sw.js`, `src/core/services/jobQueueService.test.ts`, `src/shared/hooks/useAppInitialization.test.tsx`
**Dep**: TASK005
**Agent**: backend-builder
**Description**: Implement missing offline-first queue behaviors and add tests for hydration, persistence, replay ordering, and retry backoff constraints.
**Acceptance**: Queue behavior is deterministic across restart/offline transitions and passes defined 2.4 acceptance matrix tests.
**Docs**: CHANGELOG (Unreleased) if user-visible behavior changes
**Tests**: self

---

### TASK009 — Full quality gate validation for v4 active scope

**ID**: TASK009
**Status**: Complete
**Files**: `package.json` scripts output only
**Dep**: TASK006, TASK007, TASK008
**Agent**: code-implementer
**Description**: Run lint, typecheck, and test validation for all touched v4 files and resolve regressions.
**Acceptance**: `npm run lint:ci`, `npm run typecheck`, and `npm run test` pass with no new warnings/errors.
**Docs**: none
**Tests**: self

---

### TASK010 — Sync roadmap/workflow manifests after each closure

**ID**: TASK010
**Status**: Complete
**Files**: `.ai/ROADMAP.md`, `.workflow/specs/tasks-v4.0.0.md`, `.workflow/reports/run-manifest-v4.0.0.json`
**Dep**: TASK009
**Agent**: release-planner
**Description**: Keep roadmap and workflow execution metadata aligned after each milestone to prevent status drift.
**Acceptance**: No contradictions remain between roadmap, task statuses, and run-manifest phase markers.
**Docs**: roadmap/workflow updates
**Tests**: TASK009
