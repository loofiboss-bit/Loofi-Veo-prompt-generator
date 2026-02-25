# Tasks — v4.1.0 "Refactor Continuation"

**Date**: 2026-02-25
**Status**: Complete
**Arch Spec**: `arch-v4.1.0.md`

## Task List

---

### TASK001 — Activate v4.1.0 workflow cycle

**ID**: TASK001
**Status**: Complete
**Files**: `.workflow/specs/.race-lock.json`, `.workflow/specs/tasks-v4.1.0.md`, `.workflow/specs/arch-v4.1.0.md`, `.workflow/reports/run-manifest-v4.1.0.json`
**Dep**: none
**Agent**: project-coordinator
**Description**: Start v4.1.0 as the active workflow cycle and create canonical planning artifacts.
**Acceptance**: All v4.1.0 control artifacts exist and reference the same target version.
**Docs**: workflow specs
**Tests**: TASK010

---

### TASK002 — App shell decomposition phase 2

**ID**: TASK002
**Status**: Complete
**Files**: `src/App.tsx`, `src/shared/components/layout/AppPanels.tsx`, `src/shared/components/layout/AppOverlays.tsx`
**Dep**: TASK001
**Agent**: frontend-integration-builder
**Description**: Continue structural extraction from `App.tsx` to dedicated layout modules while preserving behavior.
**Acceptance**: `src/App.tsx` is reduced further with no behavioral regression and extracted modules are covered by tests.
**Docs**: CHANGELOG
**Tests**: TASK006

---

### TASK003 — Export pipeline resilience pass

**ID**: TASK003
**Status**: Complete
**Files**: `src/core/services/nleDirectExportService.ts`, `src/features/export/ExportModal.tsx`
**Dep**: TASK001
**Agent**: backend-builder
**Description**: Harden preflight and failure mapping for direct export edge cases and improve recovery UX signals.
**Acceptance**: Deterministic error contract for all direct-export failure categories with actionable user feedback.
**Docs**: CHANGELOG
**Tests**: TASK007

---

### TASK004 — Queue replay reliability pass

**ID**: TASK004
**Status**: Complete
**Files**: `src/core/services/jobQueueService.ts`, `src/shared/hooks/useAppInitialization.ts`, `sw.js`
**Dep**: TASK001
**Agent**: backend-builder
**Description**: Tighten startup replay and offline resume guarantees for queued jobs.
**Acceptance**: Rehydrated queued jobs replay deterministically after startup and online transition across app + service worker boundaries.
**Docs**: CHANGELOG
**Tests**: TASK008

---

### TASK005 — Performance guardrail instrumentation

**ID**: TASK005
**Status**: Complete
**Files**: `src/core/utils/performanceMarks.ts`, `src/shared/hooks/useAppInitialization.ts`, `docs/performance/`
**Dep**: TASK001
**Agent**: code-implementer
**Description**: Expand runtime marks for startup and first-interactive milestones and document current baseline.
**Acceptance**: Additional marks are emitted in stable locations and baseline report is updated.
**Docs**: `docs/performance/`
**Tests**: TASK009

---

### TASK006 — Test coverage for App shell decomposition

**ID**: TASK006
**Status**: Complete
**Files**: `src/App.test.tsx`, `src/shared/components/layout/AppPanels.test.tsx`, `src/shared/components/layout/AppOverlays.test.tsx`
**Dep**: TASK002
**Agent**: test-writer
**Description**: Add regression tests for extracted app shell logic and panel orchestration.
**Acceptance**: Extracted modules are covered for render paths, toggles, and fallback behavior.
**Docs**: none
**Tests**: self

---

### TASK007 — Test coverage for export resilience

**ID**: TASK007
**Status**: Complete
**Files**: `src/core/services/nleDirectExportService.test.ts`, `src/features/export/ExportModal.test.tsx`
**Dep**: TASK003
**Agent**: test-writer
**Description**: Add/extend tests for all direct-export guarded failure paths and user-visible states.
**Acceptance**: Tests assert service contract + UI behavior for unavailable, invalid, failed, and recovered states.
**Docs**: none
**Tests**: self

---

### TASK008 — Test coverage for queue replay reliability

**ID**: TASK008
**Status**: Complete
**Files**: `src/core/services/jobQueueService.test.ts`, `src/shared/hooks/useAppInitialization.test.tsx`
**Dep**: TASK004
**Agent**: test-writer
**Description**: Validate queue replay ordering, resume signaling, and offline buffering behavior.
**Acceptance**: Replay and resume flows are deterministic and covered in both service and hook tests.
**Docs**: none
**Tests**: self

---

### TASK009 — Full quality gate for v4.1.0 touched scope

**ID**: TASK009
**Status**: Complete
**Files**: `package.json` scripts output only
**Dep**: TASK005, TASK006, TASK007, TASK008
**Agent**: code-implementer
**Description**: Validate lint/typecheck/tests/format for all v4.1 touched files.
**Acceptance**: `npm run validate` passes with no new warnings/errors.
**Docs**: none
**Tests**: self

---

### TASK010 — Sync workflow + roadmap after milestone closures

**ID**: TASK010
**Status**: Complete
**Files**: `.ai/ROADMAP.md`, `.workflow/specs/tasks-v4.1.0.md`, `.workflow/reports/run-manifest-v4.1.0.json`
**Dep**: TASK009
**Agent**: release-planner
**Description**: Keep roadmap and workflow metadata aligned during v4.1 execution.
**Acceptance**: No contradictions remain between roadmap summary, task statuses, and run-manifest markers.
**Docs**: roadmap/workflow updates
**Tests**: TASK009
