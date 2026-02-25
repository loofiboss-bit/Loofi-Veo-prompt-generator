# Startup Marks Baseline (v4.1.0)

Date: 2026-02-25

## Scope

- Task 005: Performance guardrail instrumentation.
- Baseline startup and first-interactive mark coverage emitted by `useAppInitialization`.

## Mark taxonomy (v4.1.0)

### Existing

- `app-startup`
- `store-hydration`
- `first-render`
- `first-interactive`
- `db-init`
- `plugin-init`
- `deferred-services`

### Added in v4.1.0

- `critical-bootstrap`
- `queue-replay-sync`
- `online-resume-handoff`

## Emission locations

- `critical-bootstrap`
  - Start: at mount in `useAppInitialization`.
  - End: after critical startup chain (`databaseService.initialize` + migrations + project store initialize).
- `queue-replay-sync`
  - Start: after queue hydration/store init path enters replay sync phase.
  - End: after service-worker replay signaling setup has run.
- `online-resume-handoff`
  - Start/End: around `RESUME_QUEUED_JOBS` `postMessage` when online + controller + API key are present.

## Baseline intent

This baseline defines stable instrumentation boundaries for startup and replay flow analysis. It is intended to support future timing comparisons without changing mark semantics.

## Validation in this session

- Updated unit assertions in:
  - `src/core/utils/performanceMarks.test.ts`
  - `src/shared/hooks/useAppInitialization.test.tsx`
- Full quality gate run completed successfully with these changes (`npm run validate`).
