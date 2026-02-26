# Tasks — v4.3.0 "Composer Reliability + Shell Contracts"

**Date**: 2026-02-26
**Status**: In Progress
**Arch Spec**: `arch-v4.3.0.md`

## Task List

---

### TASK001 — Activate v4.3.0 workflow cycle

**ID**: TASK001
**Status**: Complete
**Files**: `.workflow/specs/.race-lock.json`, `.workflow/specs/tasks-v4.3.0.md`, `.workflow/specs/arch-v4.3.0.md`, `.workflow/reports/run-manifest-v4.3.0.json`, `.ai/ROADMAP.md`
**Dep**: none
**Agent**: project-coordinator
**Description**: Start v4.3.0 as the active workflow cycle and create minimal planning artifacts.
**Acceptance**: All v4.3.0 bootstrap artifacts exist and reference the same target version.
**Docs**: workflow specs
**Tests**: TASK008

---

### TASK002 — Finalize v4.3 architecture direction

**ID**: TASK002
**Status**: Complete
**Files**: `.workflow/specs/arch-v4.3.0.md`
**Dep**: TASK001
**Agent**: architecture-advisor
**Description**: Expand architecture spec with finalized reliability scope, dependency boundaries, and cross-layer constraints.
**Acceptance**: Architecture spec includes agreed boundaries, dependencies, and explicit exclusion list.
**Docs**: architecture spec
**Tests**: TASK008

---

### TASK003 — Decompose implementation work into atomic contracts

**ID**: TASK003
**Status**: Complete
**Files**: `.workflow/specs/tasks-v4.3.0.md`
**Dep**: TASK002
**Agent**: project-coordinator
**Description**: Break v4.3 reliability scope into dependency-ordered atomic contracts with clear ownership and verification paths.
**Acceptance**: Task list is dependency-valid (no cycles) and each task has complete contract markers.
**Docs**: workflow specs
**Tests**: TASK008

---

### TASK004 — Harden composer service reliability surface

**ID**: TASK004
**Status**: Complete
**Files**: `src/core/services/`
**Dep**: TASK003
**Agent**: backend-builder
**Description**: Implement deterministic safeguards and cleanup passes for composer graph/evaluation seams.
**Acceptance**: Composer service behavior remains backward-compatible with stable cycle/sort/evaluation outcomes.
**Docs**: CHANGELOG
**Tests**: TASK006

---

### TASK005 — Stabilize app-shell panel/overlay hook contracts

**ID**: TASK005
**Status**: Complete
**Files**: `src/App.tsx`, `src/shared/hooks/`
**Dep**: TASK004
**Agent**: frontend-integration-builder
**Description**: Refine app shell hook prop contracts and callback invariants for panels/overlays without widening scaffold scope.
**Acceptance**: Hook wiring remains stable, memoized, and behaviorally equivalent for existing navigation/overlay interactions.
**Docs**: CHANGELOG
**Tests**: TASK007

---

### TASK006 — Add composer reliability regression tests

**ID**: TASK006
**Status**: Complete
**Files**: `src/core/services/*.test.ts`
**Dep**: TASK004
**Agent**: test-writer
**Description**: Add targeted tests for composer graph/evaluation/store helper reliability paths.
**Acceptance**: Service tests cover happy path and at least one failure/edge path per changed unit.
**Docs**: none
**Tests**: self

---

### TASK007 — Add app-shell hook integration regression tests

**ID**: TASK007
**Status**: Complete
**Files**: `src/shared/hooks/*.test.ts`, `src/App.test.tsx`
**Dep**: TASK005
**Agent**: test-writer
**Description**: Add or update integration/UI tests covering panel/overlay hook contracts and key interaction edges.
**Acceptance**: Tests verify user-visible states and core interaction paths introduced in v4.3 scope.
**Docs**: none
**Tests**: self

---

### TASK008 — Final validation + workflow alignment

**ID**: TASK008
**Status**: Complete
**Files**: `.workflow/reports/run-manifest-v4.3.0.json`, `.workflow/specs/tasks-v4.3.0.md`, `.ai/ROADMAP.md`
**Dep**: TASK006, TASK007
**Agent**: release-planner
**Description**: Execute quality gate and synchronize roadmap/workflow artifacts before release transition.
**Acceptance**: `npm run validate` passes and artifacts consistently represent v4.3 progression state.
**Docs**: roadmap/workflow updates
**Tests**: self

---

### TASK009 — Prepare v4.3 package handoff

**ID**: TASK009
**Status**: In Progress
**Files**: `.workflow/reports/run-manifest-v4.3.0.json`, `release/`, `dist/`
**Dep**: TASK008
**Agent**: release-planner
**Description**: Prepare package-phase handoff inputs after successful validation.
**Acceptance**: Manifest package phase is ready with expected artifact placeholders and no workflow drift.
**Docs**: workflow reports
**Tests**: TASK010

---

### TASK010 — Execute release readiness sweep

**ID**: TASK010
**Status**: Pending
**Files**: `.workflow/reports/run-manifest-v4.3.0.json`, `.workflow/specs/.race-lock.json`, `.ai/ROADMAP.md`
**Dep**: TASK009
**Agent**: release-planner
**Description**: Execute final readiness sweep and synchronize release-state artifacts for v4.3 transition.
**Acceptance**: Race lock, roadmap, and run-manifest represent a single coherent v4.3 status.
**Docs**: roadmap/workflow updates
**Tests**: self
