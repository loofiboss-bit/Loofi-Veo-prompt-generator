# Architecture — v4.4.0 "Next Workflow Slice"

**Date**: 2026-02-26
**Status**: Finalized

## Objective

- Strengthen composer-to-app-shell execution consistency while reducing avoidable rerender and graph-evaluation instability.
- Keep all changes additive and bounded to existing seams introduced in v4.2/v4.3.
- Preserve user-visible behavior and existing public contracts.

## Scope

- Composer graph reliability refinements in `src/core/services/` with deterministic handling for sparse and partially connected graphs.
- App-shell hook contract hardening in `src/shared/hooks/` and `src/App.tsx` for stable callback/reference behavior.
- Focused regression coverage in existing test surfaces (`*.test.ts`, `*.test.tsx`) for reliability-critical paths.

## Boundaries

- Service logic stays in `src/core/services/`; no direct UI ownership drift.
- UI composition remains in `src/App.tsx` and layout shell components.
- Hook-level memoization remains local to hook modules; no cross-cutting store refactors.

## Invariants

- TypeScript `strict` remains green (`npm run typecheck`).
- Lint/format gates remain green (`npm run lint:ci`, `npm run format:check`).
- Existing behavior snapshots and interaction tests remain stable.
- No schema/version migration in this slice.

## Constraints

- No broad architectural rewrites.
- Minimize churn outside targeted files.
- Maintain strict TypeScript safety and existing test conventions.
- Keep changes dependency-ordered: service reliability → hook wiring → integration tests.

## Non-goals

- No new platform integrations.
- No storage schema migrations unless explicitly required.
- No release packaging changes beyond workflow compliance.
- No new feature-panel additions in this slice.

## Validation Strategy

- Phase P3/P4 verification via targeted tests first, then full `npm run validate`.
- Phase P6 verification via `npm run dist` to ensure packaging continuity.
- Phase P7 closes only when run-manifest, race-lock, and roadmap are coherent.

## Anchors

- `src/core/services/`
- `src/shared/hooks/`
- `src/App.tsx`
- `.workflow/specs/tasks-v4.4.0.md`
