# Tasks — v4.4.0 "Next Workflow Slice"

**Date**: 2026-02-26
**Status**: In Progress
**Arch Spec**: `arch-v4.4.0.md`

## Task List

---

### TASK001 — Activate v4.4.0 workflow cycle

**ID**: TASK001
**Status**: Complete
**Files**: `.workflow/specs/.race-lock.json`, `.workflow/specs/tasks-v4.4.0.md`, `.workflow/specs/arch-v4.4.0.md`, `.workflow/reports/run-manifest-v4.4.0.json`, `.ai/ROADMAP.md`
**Dep**: none
**Agent**: project-coordinator
**Description**: Start v4.4.0 as active workflow cycle with initial planning artifacts.
**Acceptance**: All v4.4.0 bootstrap artifacts exist and point to the same active version.
**Docs**: workflow specs
**Tests**: TASK008

---

### TASK002 — Finalize v4.4 architecture direction

**ID**: TASK002
**Status**: Complete
**Files**: `.workflow/specs/arch-v4.4.0.md`
**Dep**: TASK001
**Agent**: architecture-advisor
**Description**: Expand architecture spec with finalized scope, boundaries, and exclusions.
**Acceptance**: Architecture spec contains concrete goals, constraints, and non-goals.
**Docs**: architecture spec
**Tests**: TASK008

---

### TASK003 — Decompose implementation work into atomic contracts

**ID**: TASK003
**Status**: In Progress
**Files**: `.workflow/specs/tasks-v4.4.0.md`
**Dep**: TASK002
**Agent**: project-coordinator
**Description**: Break v4.4 scope into dependency-ordered atomic tasks with complete contract markers.
**Acceptance**: Task graph is dependency-valid and every task has full markers.
**Docs**: workflow specs
**Tests**: TASK008

---

### TASK004 — Implement scoped backend/service changes

**ID**: TASK004
**Status**: Pending
**Files**: `src/core/services/`
**Dep**: TASK003
**Agent**: backend-builder
**Description**: Implement targeted service-level changes defined by the v4.4 architecture.
**Acceptance**: Service behavior remains stable and backward-compatible for existing flows.
**Docs**: CHANGELOG
**Tests**: TASK006

---

### TASK005 — Implement scoped app-shell integration changes

**ID**: TASK005
**Status**: Pending
**Files**: `src/App.tsx`, `src/shared/hooks/`
**Dep**: TASK004
**Agent**: frontend-integration-builder
**Description**: Implement app-shell integration updates within the approved v4.4 scope.
**Acceptance**: UI/hook behavior remains stable with no regressions in key interactions.
**Docs**: CHANGELOG
**Tests**: TASK007

---

### TASK006 — Add service-level regression tests

**ID**: TASK006
**Status**: Pending
**Files**: `src/core/services/*.test.ts`
**Dep**: TASK004
**Agent**: test-writer
**Description**: Add targeted service tests for new/modified reliability paths.
**Acceptance**: Tests include success and edge/failure paths for changed units.
**Docs**: none
**Tests**: self

---

### TASK007 — Add integration-level regression tests

**ID**: TASK007
**Status**: Pending
**Files**: `src/**/*.test.tsx`
**Dep**: TASK005
**Agent**: test-writer
**Description**: Add integration tests for user-visible behavior touched by v4.4.
**Acceptance**: Critical interaction paths covered and passing.
**Docs**: none
**Tests**: self

---

### TASK008 — Final validation + workflow alignment

**ID**: TASK008
**Status**: Pending
**Files**: `.workflow/reports/run-manifest-v4.4.0.json`, `.workflow/specs/tasks-v4.4.0.md`, `.ai/ROADMAP.md`
**Dep**: TASK006, TASK007
**Agent**: release-planner
**Description**: Run full quality gate and synchronize workflow artifacts.
**Acceptance**: `npm run validate` passes and workflow files are internally consistent.
**Docs**: roadmap/workflow updates
**Tests**: self

---

### TASK009 — Prepare package handoff

**ID**: TASK009
**Status**: Pending
**Files**: `.workflow/reports/run-manifest-v4.4.0.json`, `dist/`, `release/`
**Dep**: TASK008
**Agent**: release-planner
**Description**: Prepare package artifacts and mark package phase readiness.
**Acceptance**: Package outputs are generated and run-manifest reflects package readiness.
**Docs**: workflow reports
**Tests**: TASK010

---

### TASK010 — Execute release readiness sweep

**ID**: TASK010
**Status**: Pending
**Files**: `.workflow/specs/.race-lock.json`, `.workflow/reports/run-manifest-v4.4.0.json`, `.ai/ROADMAP.md`
**Dep**: TASK009
**Agent**: release-planner
**Description**: Complete release readiness synchronization across all v4.4 workflow artifacts.
**Acceptance**: Race lock, run manifest, and roadmap represent one coherent v4.4 status.
**Docs**: roadmap/workflow updates
**Tests**: self
