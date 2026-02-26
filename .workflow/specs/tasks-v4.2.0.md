# Tasks — v4.2.0 "Refactor Continuation"

**Date**: 2026-02-26
**Status**: Complete
**Arch Spec**: `arch-v4.2.0.md`

## Task List

---

### TASK001 — Activate v4.2.0 workflow cycle

**ID**: TASK001
**Status**: Complete
**Files**: `.workflow/specs/.race-lock.json`, `.workflow/specs/tasks-v4.2.0.md`, `.workflow/specs/arch-v4.2.0.md`, `.workflow/reports/run-manifest-v4.2.0.json`
**Dep**: none
**Agent**: project-coordinator
**Description**: Start v4.2.0 as the active workflow cycle and create canonical planning artifacts.
**Acceptance**: All v4.2.0 control artifacts exist and reference the same target version.
**Docs**: workflow specs
**Tests**: TASK010

---

### TASK002 — App shell decomposition phase 3 planning pass

**ID**: TASK002
**Status**: Complete
**Files**: `src/App.tsx`, `src/shared/components/layout/`
**Dep**: TASK001
**Agent**: architecture-advisor
**Description**: Define and confirm extraction boundaries for remaining shell orchestration concerns in `App.tsx`.
**Acceptance**: Clear extraction map with module ownership and no contract break requirements.
**Docs**: CHANGELOG
**Tests**: TASK007

---

### TASK003 — App shell decomposition phase 3 implementation

**ID**: TASK003
**Status**: Complete
**Files**: `src/App.tsx`, `src/shared/components/layout/AppPanels.tsx`, `src/shared/components/layout/AppOverlays.tsx`
**Dep**: TASK002
**Agent**: frontend-integration-builder
**Description**: Execute approved shell extractions and reduce cross-cutting orchestration in `App.tsx`.
**Acceptance**: `App.tsx` shrinks further without behavioral drift and extracted responsibilities are modular.
**Docs**: CHANGELOG
**Tests**: TASK007

---

### TASK004 — Export resilience taxonomy hardening

**ID**: TASK004
**Status**: Complete
**Files**: `src/core/services/nleDirectExportService.ts`, `src/core/types/`
**Dep**: TASK001
**Agent**: backend-builder
**Description**: Stabilize preflight and failure taxonomy for direct export to ensure deterministic recovery pathways.
**Acceptance**: Typed failure taxonomy is deterministic and backward-compatible for successful paths.
**Docs**: CHANGELOG
**Tests**: TASK008

---

### TASK005 — Export recovery UX alignment

**ID**: TASK005
**Status**: Complete
**Files**: `src/features/export/ExportModal.tsx`
**Dep**: TASK004
**Agent**: frontend-integration-builder
**Description**: Align export modal messaging/actions with hardened failure taxonomy and recovery intent.
**Acceptance**: User-visible export failure states are actionable, consistent, and mapped to taxonomy.
**Docs**: CHANGELOG
**Tests**: TASK008

---

### TASK006 — Performance instrumentation extension

**ID**: TASK006
**Status**: Complete
**Files**: `src/core/utils/performanceMarks.ts`, `src/shared/hooks/useAppInitialization.ts`, `docs/performance/`
**Dep**: TASK001
**Agent**: code-implementer
**Description**: Extend startup/interactive performance marks and refresh baseline documentation for v4.2.0 scope.
**Acceptance**: New marks emit in stable lifecycle points and baseline docs reflect latest measurements.
**Docs**: `docs/performance/`
**Tests**: TASK009

---

### TASK007 — Test coverage for app shell decomposition

**ID**: TASK007
**Status**: Complete
**Files**: `src/App.test.tsx`, `src/shared/components/layout/AppPanels.test.tsx`, `src/shared/components/layout/AppOverlays.test.tsx`
**Dep**: TASK003
**Agent**: test-writer
**Description**: Add regression coverage for newly extracted shell orchestration and edge states.
**Acceptance**: Tests cover shell render/toggle/fallback behavior introduced by v4.2 extractions.
**Docs**: none
**Tests**: self

---

### TASK008 — Test coverage for export resilience + recovery UX

**ID**: TASK008
**Status**: Complete
**Files**: `src/core/services/nleDirectExportService.test.ts`, `src/features/export/ExportModal.test.tsx`
**Dep**: TASK005
**Agent**: test-writer
**Description**: Add/extend tests for hardened export taxonomy and recovery messaging/actions.
**Acceptance**: Service + UI tests cover failure categories, mapping stability, and recovery affordances.
**Docs**: none
**Tests**: self

---

### TASK009 — Test coverage for instrumentation updates

**ID**: TASK009
**Status**: Complete
**Files**: `src/core/utils/performanceMarks.test.ts`, `src/shared/hooks/useAppInitialization.test.tsx`, `docs/performance/`
**Dep**: TASK006
**Agent**: test-writer
**Description**: Verify new instrumentation marks and associated startup/interactive guardrails.
**Acceptance**: Tests assert mark emission and docs reference validated marker set.
**Docs**: `docs/performance/`
**Tests**: self

---

### TASK010 — Roadmap/workflow drift fix + quality gate

**ID**: TASK010
**Status**: Complete
**Files**: `.ai/ROADMAP.md`, `.workflow/specs/tasks-v4.2.0.md`, `.workflow/reports/run-manifest-v4.2.0.json`
**Dep**: TASK007, TASK008, TASK009
**Agent**: release-planner
**Description**: Keep roadmap/workflow state aligned and run final validation for v4.2 touched scope.
**Acceptance**: No contradictions between roadmap, tasks, and run-manifest; touched-scope validation passes.
**Docs**: roadmap/workflow updates
**Tests**: self
