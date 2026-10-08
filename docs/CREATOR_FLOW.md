# Connected creator flow

Status: unreleased local development. No application version or published installer changes.

## Studio results

Manual video targets expose **Import result for this variant**. Choose a local, decoder-readable
video with a finite positive duration. Import saves the original artifact and selected variant's
exact copy fields as immutable source snapshots, together with local media and its project identity.
Later prompt edits and rebuilds do not rewrite an imported result's source.

Watch the video, enter review notes, and choose **Confirm manual review** before **Use on timeline**.
Choose an existing video scene or create a new one. Placement preserves the edit's other tracks,
clips and start positions; replacement trims are constrained to the imported media. Reusing the
same result updates its linked scene rather than creating duplicate placements.

These records are `ExternalStudioResultV1` entries in optional `Project.studioResults`. Older
projects without the field behave as an empty result list. Imports never manufacture Veo requests,
provider operations, prices or cost approvals. Manual confirmation is bound to the video content;
changing that content requires a new confirmation. Project archives include referenced media and
remap imported project, artifact and asset identities consistently.

Media is staged locally before the initial document link. A failed initial link removes the owned
staged media. Desktop copying happens after a successful durable link, retaining local fallback
when the desktop copy fails. Switching projects does not redirect an in-flight import or overwrite
the new project's editor. Missing media exposes a replacement-video picker, the asset library and
a local refresh action. A replacement retains the frozen source and requires a new manual review.

## Production readiness and recovery

Workflow completion and **Next action** use shared readiness checks. Required scene references
must be available, Generate requires playable completed results, and Review requires a current
review of the selected take. Failed or pending attempts do not count as generated results.
Navigation remains free so creators can inspect or correct any step.

Scene cards link to Activity and display the corresponding durable job. Recovery of known
operations resumes polling or media retrieval through scoped IPC; it cannot submit generation.
An uncertain submission without an operation identifier must be checked at the provider. Preparing
a new attempt uses the existing retake and fresh cost-approval flow. Repeated recovery actions are
locked while pending, and job updates are synchronized after reopening.

## Honest review

The comparison view identifies local prechecks, AI review and combined review, including findings,
warnings, explanations and playable timestamp links. Local heuristic scores remain compatible in
stored records but are presented as metadata checks, not observed video-quality measurements.

A new take with only local checks or failed AI analysis needs explicit manual confirmation before
acceptance. Manual and automated review validity follows the media/request/continuity context;
changing that context invalidates the old result. Already accepted legacy takes are preserved.

## Delivery and backup

**Download OTIO with media** is available in Production and Timeline, including projects containing
only imported external results. The delivery ZIP packages `timeline.otio`, the actual selected
video/audio media at relative paths, `provenance.json`, and a `manifest.json` with checksums. Its
`loofi-delivery` manifest describes a delivery, not an importable full-project backup.

Actual tracks, gaps, trims and selected takes drive delivery. Missing unselected takes and old
revision media do not block it. Selected media that is missing blocks export and produces a clip
list with compatible replacement selection and an asset-library action. Empty edits and unsupported
overlapping clips produce explicit errors instead of an incomplete deliverable.

Complete `.loofi-project` backup remains strict and includes all referenced project/revision media.
`PromptArtifactV1`, project schema 11, Creative Pack schema 5 and existing storage keys remain
supported; the new result and manual review data are additive.

## Verification

Run `npm run validate` and `npm run build`. Focused browser coverage is in
`e2e/creator-flow.spec.ts`, `e2e/studio-iteration.spec.ts`, `e2e/studio-locales.spec.ts` and production
workflow tests. Browser tests block external requests and use an original synthetic VP8 fixture;
they cover import, exact source retention, manual review, restart, playback, keyboard activation,
locales, themes and delivery. The shared fixture is `e2e/fixtures/creatorVideo.ts`.

Local verification on 2026-10-08 used Node.js 24. All 52 selected Chromium tests passed across
focused runs and reruns after corrections. Six creator-flow tests also passed against a production
preview. Existing layout tests that inject source modules run against Vite development instead.

```bash
npm run test:e2e -- e2e/creator-flow.spec.ts e2e/studio-iteration.spec.ts e2e/studio-locales.spec.ts e2e/director-mode.spec.ts e2e/creator-redesign.spec.ts --workers=2
```

For production-preview coverage, start `npm run preview -- --host 127.0.0.1 --port 8099`, then run:

```bash
STAGING_URL=http://127.0.0.1:8099 npm run test:e2e -- e2e/creator-flow.spec.ts --workers=2
```

Development navigation also logged the pre-existing `AudioContext` double-close warning in the
timeline's audio cleanup. Music/audio-engine repair is outside this slice.

Automated checks do not qualify physical Electron playback, paid-provider execution, screen readers
or import into an external NLE. No such qualification is claimed by this development slice.
