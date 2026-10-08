# v14.1.0 implementation

Status: v14.1.0 development candidate prepared for pull request review. Publication and installation are outside scope.

## Delivered scope

- Model Arena compiles all eight Studio video targets using the same normalized input and compiler as the copy desk. It compares prompt packages, settings and handoff compatibility, with keyboard navigation, Escape, focus return and clipboard errors.
- Shared validation checks every variant after compilation, AI enhancement and manual edits. Each actionable issue opens the relevant field or variant. Writing advice and unconfirmed compatibility are warnings. Manual copying remains available; internal Veo generation reuses the existing request validator and approval flow.
- Project revisions preserve both video and Music & Lyrics input, editable variants, selection and locks. Explicit saves and destructive iteration boundaries create deduplicated snapshots. Restore saves the work being replaced and the restored result. AI enhancement and section rewrite require proposal review before acceptance; late responses are discarded after edits or project changes.
- A local global template library supports video/music creation, search, target filtering, preview, update, deletion and application across projects. Existing video templates remain readable. Media references and provider handles must be chosen again in the recipient project.

## Compatibility

`PromptArtifactV1`, project bundle schema 11 and Creative Pack schema 5 remain supported. Revisions are additive project data and travel with project archives, including revision-only media and identity remapping. Complete templates have their own global storage key. Unknown project fields and existing local changes are retained.

Official model-rule sources are recorded with the verification date 2026-10-08: [Google Veo](https://ai.google.dev/gemini-api/docs/veo) and [Runway model overview](https://docs.dev.runwayml.com/guides/models/). Broad manual target names do not assert support for a concrete provider version. Quoted dialogue is preserved.

## Release boundary

This release focuses on local creator iteration. New automatic providers, paid comparison runs, ComfyUI, Live, LAN and Foley activation remain outside scope. Public installers referenced by the README remain at the published v14.0.1 version until v14.1.0 is separately released.

Before packaging, run `npm run validate:release`. Browser verification uses `npm run test:e2e -- --workers=2 --reporter=line`; all new iteration tests block external requests. Physical Electron installation and screen-reader behavior require separate qualification.

## Verification

Local verification on 2026-10-08 uses Node 24 and Chromium. The release gate includes validation,
coverage thresholds, desktop contract tests, translation parity, formatting, RPM metadata and a
production build. Browser checks cover all targets through reopening, revision restore, cross-project
video/music templates, keyboard navigation, small windows and both themes. The new locale workflow
checks all five registered languages, including Arabic direction and clickable Studio controls.
The Arabic test exposed and now guards against the sidebar covering the workspace in RTL mode.
Delayed hydration also preserves a control the creator has already focused, with a deterministic
keyboard regression test. Missing first/last-frame guidance opens the frame that is actually missing.

Final results:

- `npm run validate:release`: passed, including 4,164 unit/component tests in 293 files, 100 desktop
  contract tests, coverage gates, strict lint, types, translation parity, formatting and production build.
- Full Chromium suite against the final production preview: 66 passed, one packaged-Electron test
  skipped. All five languages, both themes and the six Linux visual baselines passed in this run.
- Separate Ubuntu visual verification: six passed without updating snapshots.
- Final `git diff --check`: passed. Existing local work is retained. Local verification does not claim remote CI, publication or installation.

Linux and Ubuntu visual baselines were inspected. Ubuntu verification ran in the matching official
Playwright 1.61.1 Noble container with external networking disabled; six visual tests passed without
updating snapshots. The packaged-Electron test requires `PACKAGED_ELECTRON_PATH` and is intentionally
skipped here because release packaging and installation were not requested.

Reproduce the checks from the repository root:

```bash
npm run validate:release
npm run preview -- --host 127.0.0.1 --port 8080 --strictPort
# In another terminal, while preview is running:
STAGING_URL=http://127.0.0.1:8080 npm run test:e2e -- --workers=2 --reporter=line
```
