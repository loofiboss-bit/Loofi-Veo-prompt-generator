# Architecture — v4.4.0 "Next Workflow Slice"

**Date**: 2026-02-26
**Status**: Draft

## Scope

- Define v4.4 reliability/performance objective and bounded implementation surface.
- Preserve existing service/store/component boundaries from prior slices.
- Keep behavior backward-compatible for user-visible prompt generation flows.

## Constraints

- No broad architectural rewrites.
- Minimize churn outside targeted files.
- Maintain strict TypeScript safety and existing test conventions.

## Non-goals

- No new platform integrations.
- No storage schema migrations unless explicitly required.
- No release packaging changes beyond workflow compliance.

## Anchors

- `src/core/services/`
- `src/shared/hooks/`
- `src/App.tsx`
- `.workflow/specs/tasks-v4.4.0.md`
