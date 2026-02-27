# Architecture — v4.6.0 "Stability Baseline & Slice Activation"

**Date**: 2026-02-27
**Status**: In Progress

## Objective

- Activate `v4.6.0` as the current workflow slice with aligned roadmap/spec/report artifacts.
- Establish a stability-first baseline so downstream feature work can proceed without workflow drift.
- Keep the slice bootstrap small, explicit, and fully verifiable.

## Scope

- Create `v4.6.0` workflow contract files (`arch`, `tasks`, `run-manifest`).
- Update race lock metadata to mark `v4.6.0` active.
- Update roadmap status to reflect active in-progress workflow slice.
- Define validation gates for this slice before feature implementation begins.
- Stabilize lip-sync mock timing by removing exact-threshold scheduling ambiguity in delay simulation.

## Boundaries

- No production feature code changes in `src/` during activation task.
- No release artifact version bumps (`package.json`, `manifest.json`, `metadata.json`) in this step.
- No API, store, route, or plugin contract changes.

## Invariants

- Workflow files must reference the same target slice version (`v4.6.0`).
- Existing completed slices remain immutable historical records.
- Validation commands remain the project quality source of truth.

## Constraints

- Preserve existing workflow schema style from prior slices (`v4.5.0`).
- Keep documentation concise and dependency-ordered to reduce planning ambiguity.
- Maintain compatibility with release/doc checks that consume workflow artifacts.

## Non-goals

- Defining final user-facing feature set for `v4.6.0` in this activation pass.
- Implementing UI/service/store behavior changes.
- Packaging or releasing the application.

## Next Sprint Objective

- Deliver command palette ranking and recents persistence hardening.
- Ensure deterministic ordering for command discovery and stable recent-command recall across sessions.
- Back changes with targeted command palette tests and full validation gate coverage.

## Validation Strategy

- Run `npm run validate` as full quality gate.
- Run `npm run agents:check` and `npm run mcp:check` to verify workflow/agent configuration health.
- Ensure `race-lock`, `tasks`, `arch`, and roadmap references are synchronized.

## Anchors

- `.workflow/specs/.race-lock.json`
- `.workflow/specs/arch-v4.6.0.md`
- `.workflow/specs/tasks-v4.6.0.md`
- `.workflow/reports/run-manifest-v4.6.0.json`
- `.ai/ROADMAP.md`
- `src/core/services/lipSyncService.ts`
- `src/core/services/lipSyncService.test.ts`
