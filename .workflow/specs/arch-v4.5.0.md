# Architecture — v4.5.0 "Command Palette Foundation"

**Date**: 2026-02-26
**Status**: Finalized

## Objective

- Deliver a first-class in-app command palette surfaced by the existing `Ctrl+K` shortcut contract.
- Convert an advertised-but-missing shortcut entry into a real, user-visible workflow accelerator.
- Keep scope narrowly focused on shell overlays + shortcut wiring + regression tests.

## Scope

- Add a command palette overlay component under `src/shared/components/layout/`.
- Extend app-shell shortcut wiring in `src/shared/hooks/useAppKeyboardShortcuts.ts` and `src/App.tsx`.
- Integrate palette rendering through `AppOverlays` and its props factory.
- Add focused regression tests for palette interaction and shortcut dispatch.

## Boundaries

- No store schema migrations.
- No route topology changes.
- No plugin/API/service backend contract changes.
- No broad sidebar/header redesign beyond command invocation targets.

## Invariants

- TypeScript strict mode remains green.
- Existing hotkey behavior (help, generate, save preset) remains intact.
- Overlay stack remains accessible (`role="dialog"`, keyboard close support).
- Existing lazy-loading and error boundary patterns remain preserved.

## Constraints

- Keep changes localized to app-shell and overlay seams.
- Reuse existing dialog primitives for consistency.
- Preserve memoized prop contract patterns used in `useAppOverlaysProps`.

## Non-goals

- No fuzzy global search over project data.
- No command customization UX in this slice.
- No localization overhaul beyond required command-palette strings.

## Validation Strategy

- Add unit tests for command palette filtering/execution behavior.
- Add hook-level tests for `Ctrl+K` dispatch behavior.
- Run targeted tests, then lint + typecheck.

## Anchors

- `src/App.tsx`
- `src/shared/hooks/useAppKeyboardShortcuts.ts`
- `src/shared/hooks/useAppOverlaysProps.ts`
- `src/shared/components/layout/AppOverlays.tsx`
- `src/shared/components/layout/CommandPalette.tsx`
