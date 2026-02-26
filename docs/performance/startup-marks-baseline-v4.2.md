# Startup Marks Baseline (v4.2.0)

Date: 2026-02-26

## Scope

- Task 006: startup/interactive instrumentation extension.
- Baseline startup and first-interactive mark coverage emitted by `useAppInitialization`.

## Mark taxonomy (v4.2.0)

### Existing

- `app-startup`
- `store-hydration`
- `first-render`
- `first-interactive`
- `critical-bootstrap`
- `db-init`
- `plugin-init`
- `job-queue-hydrate`
- `queue-replay-sync`
- `online-resume-handoff`
- `deferred-services`

### Added in v4.2.0

- `settings-migration`
- `project-store-init`

## Emission locations

- `settings-migration`
  - Start: immediately before `settingsMigrationService.runMigrations`.
  - End: immediately after migration completion.
- `project-store-init`
  - Start: immediately before `projectStore.initialize`.
  - End: immediately after project store initialization.
- `job-queue-hydrate`
  - Start: immediately before `jobQueueService.hydrate`.
  - End: immediately after queue hydration completes.

## Baseline intent

This baseline refines critical bootstrap visibility by splitting migration and project-store phases, and by isolating queue hydration from broader replay orchestration. It enables finer regression detection without changing startup behavior.

## Validation in this session

- Updated unit assertions in:
  - `src/core/utils/performanceMarks.test.ts`
  - `src/shared/hooks/useAppInitialization.test.tsx`
- Targeted startup/instrumentation tests and typecheck passed.
