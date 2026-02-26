# QA Checklist — Veo Prompt Generator

## Test Environment

- [ ] Docker staging is running (`compose.staging.yaml`)
- [ ] App is reachable at `http://localhost:8080`
- [ ] Browser cache cleared (or incognito used)
- [ ] No pre-existing local storage/IndexedDB conflicts

## Startup & Onboarding

- [ ] App loads without blank screen
- [ ] Startup modals (wizard/welcome/tutorial) can be dismissed
- [ ] Main layout renders correctly (header, sidebar, prompt area)
- [ ] No console errors during initial load

## Core Prompt Workflow

- [ ] User can type prompt idea in textarea
- [ ] Character counter updates while typing (if present)
- [ ] Veo/Sora model switching works without UI freeze
- [ ] Generate button remains clickable and responsive
- [ ] Missing API key path shows clear error feedback (no crash)

## Navigation & Layout Stability

- [ ] Sidebar navigation items are clickable
- [ ] Switching between major views does not lose responsiveness
- [ ] Sidebar collapse/expand works (if available)
- [ ] Back/forward browser navigation does not break state

## Performance & Stress Behavior

- [ ] Rapid typing in textarea remains smooth
- [ ] Large multi-line input does not freeze the app
- [ ] Repeated model toggles do not cause visual corruption
- [ ] Repeated navigation hops do not trigger hard errors

## Settings & Persistence

- [ ] Theme change applies immediately (if exposed)
- [ ] Theme persists after refresh/reopen
- [ ] Important user preferences persist across sessions
- [ ] Reset/clear operations complete without stale UI state

## Error Handling & Recovery

- [ ] Toast/alert notifications appear for expected failures
- [ ] Invalid operations fail gracefully (no white screen)
- [ ] App remains usable after an error is shown
- [ ] Hard refresh recovers app from transient errors

## Accessibility & Responsiveness

- [ ] Keyboard tab navigation reaches major controls
- [ ] Visible focus styles appear on interactive elements
- [ ] UI remains usable at 1280x720 and 1920x1080
- [ ] No major overflow/cutoff issues in core forms

## Regression Gate (Pre-Release)

- [ ] Unit tests pass
- [ ] E2E smoke suite passes
- [ ] E2E stability suite passes
- [ ] Lint, typecheck, and format checks pass

## Sign-off

- QA Owner: **\*\*\*\***\_\_\_\_**\*\*\*\***
- Date: **\*\*\*\***\_\_\_\_**\*\*\*\***
- Build/Version: **\*\*\*\***\_\_\_\_**\*\*\*\***
- Result: [ ] PASS [ ] FAIL
- Notes:
