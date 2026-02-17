# Release Notes - v2.7.0

Release date: 2026-02-17

## Highlights

- Completed a full UI shell overhaul for sidebar, header, and prompt workspace alignment.
- Standardized dialogs with a shared `AppDialog` contract across core panels and studio modals.
- Unified theme flow through `ThemeService -> store -> DOM` to prevent startup/theme drift.
- De-globalized accessibility CSS and moved layout-impacting behavior to explicit opt-in modes.
- Consolidated Settings to the routed page and removed duplicate modal styling path.
- Migrated onboarding targeting to canonical `data-tour-id` anchors with deterministic fallback selectors.
- Expanded quality coverage with new dialog/onboarding/accessibility unit tests and modal/responsive/visual Playwright suites.
- Refreshed prompt-builder surfaces (Action Bar, Core Concept, Details, Output, Summary) with consistent foundation tokens.

## Verification

- `npm run validate`
- `npm run cli:help`
- `npm run cli -- --version`
- `npm run test:e2e`
- `npm run dist`
