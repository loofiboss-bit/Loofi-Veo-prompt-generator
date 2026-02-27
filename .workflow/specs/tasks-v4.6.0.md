# Tasks — v4.6.0 "Stability Baseline & Slice Activation"

**Date**: 2026-02-27
**Status**: In Progress
**Arch Spec**: `arch-v4.6.0.md`

## Task List

---

### TASK001 — Activate v4.6.0 workflow cycle

**ID**: TASK001
**Status**: Complete
**Files**: `.workflow/specs/.race-lock.json`, `.workflow/specs/tasks-v4.6.0.md`, `.workflow/specs/arch-v4.6.0.md`, `.workflow/reports/run-manifest-v4.6.0.json`, `.ai/ROADMAP.md`
**Dep**: none
**Agent**: project-coordinator
**Description**: Start v4.6.0 as active workflow cycle with aligned baseline artifacts.
**Acceptance**: Race-lock, task spec, arch spec, run-manifest, and roadmap all reference v4.6.0 consistently.
**Docs**: workflow specs
**Tests**: TASK005

---

### TASK002 — Define v4.6.0 implementation scope

**ID**: TASK002
**Status**: Complete
**Files**: `.workflow/specs/arch-v4.6.0.md`, `.workflow/specs/tasks-v4.6.0.md`, `.ai/ROADMAP.md`, `src/core/services/lipSyncService.ts`, `src/core/services/lipSyncService.test.ts`
**Dep**: TASK001
**Agent**: architecture-advisor
**Description**: Finalize `v4.6.0` as a stability-focused slice beginning with deterministic timing behavior in lip-sync mock operations to remove flaky test outcomes.
**Acceptance**: Scope explicitly targets timing-bound stability for lip-sync mock delays and documents impacted implementation/test modules.
**Docs**: roadmap/workflow specs
**Tests**: TASK005

---

### TASK003 — Execute first implementation batch

**ID**: TASK003
**Status**: Complete
**Files**: `src/core/services/lipSyncService.ts`
**Dep**: TASK002
**Agent**: code-implementer
**Description**: Implement deterministic lower-bound timing for mock lip-sync delay generation to eliminate exact-threshold race behavior.
**Acceptance**: Mock delay no longer resolves at exactly 3000ms edge and behavior remains within expected 3-5 second simulation window.
**Docs**: CHANGELOG
**Tests**: TASK004

---

### TASK004 — Add or update regression coverage

**ID**: TASK004
**Status**: Complete
**Files**: `src/core/services/lipSyncService.test.ts`
**Dep**: TASK003
**Agent**: test-writer
**Description**: Re-run and confirm lip-sync timing test coverage remains green under deterministic delay bounds.
**Acceptance**: `src/core/services/lipSyncService.test.ts` passes consistently and timing-range assertions remain valid.
**Docs**: none
**Tests**: self

---

### TASK005 — Validate v4.6.0 baseline and quality gate

**ID**: TASK005
**Status**: Complete
**Files**: `.workflow/reports/run-manifest-v4.6.0.json`, `.workflow/specs/tasks-v4.6.0.md`
**Dep**: TASK004
**Agent**: release-planner
**Description**: Run validation checks and record outcomes in run-manifest artifacts.
**Acceptance**: `npm run validate` succeeds and workflow report references successful validation artifacts.
**Docs**: workflow reports
**Tests**: self

---

### TASK006 — Prepare next sprint scope handoff

**ID**: TASK006
**Status**: Complete
**Files**: `.workflow/specs/arch-v4.6.0.md`, `.workflow/specs/tasks-v4.6.0.md`, `.ai/ROADMAP.md`, `CHANGELOG.md`
**Dep**: TASK005
**Agent**: project-coordinator
**Description**: Define the next sprint implementation objective beyond the baseline stability batch.
**Acceptance**: Next sprint objective, boundaries, and first implementation batch are explicitly documented.
**Docs**: roadmap/workflow specs
**Tests**: next sprint

---

### TASK007 — Execute command palette ranking + recents persistence sprint

**ID**: TASK007
**Status**: Pending
**Files**: `src/shared/components/layout/CommandPalette.tsx`, `src/shared/components/layout/CommandPalette.test.tsx`, `src/core/services/*`, `.workflow/reports/run-manifest-v4.6.0.json`
**Dep**: TASK006
**Agent**: code-implementer
**Description**: Implement and validate next sprint objective: deterministic command ranking and persisted recents behavior for command palette.
**Acceptance**: Command ranking and recents persistence behavior are implemented, covered by regression tests, and validated via quality gates.
**Docs**: changelog/workflow reports
**Tests**: targeted command palette + full validate
