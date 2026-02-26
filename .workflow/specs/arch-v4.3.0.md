# Architecture Spec — v4.3.0 "Planning Bootstrap"

## Scope

1. Initialize workflow governance artifacts for v4.3.0.
2. Define a concise, contract-first execution frame for the next implementation slice.
3. Keep this bootstrap limited to planning/state synchronization only.

## Assumptions

1. v4.2.0 remains fully completed and is preserved as historical context.
2. Existing service/store/component public contracts are unchanged in this bootstrap.
3. Workflow artifacts (`race-lock`, `tasks`, `run-manifest`, roadmap) are authoritative state.
4. Quality gate command remains `npm run validate` for subsequent implementation tasks.

## Non-Goals

1. No feature code changes.
2. No API, plugin, or store contract changes.
3. No packaging/release artifact generation for v4.3.0 at bootstrap time.
4. No broad roadmap rewrite outside active-version status signaling.

## Acceptance Anchors

- Workflow activation is done when `.race-lock.json` targets `v4.3.0` with `in_progress` status and retained completed history for `v4.2.0`.
- Planning scaffold is done when `tasks-v4.3.0.md` exists with contract markers and dependency ordering.
- Execution tracking is done when `run-manifest-v4.3.0.json` records P1 success and P2–P7 as `not_started`.
- Governance visibility is done when roadmap status explicitly shows `v4.3.0` as active/in-progress.
