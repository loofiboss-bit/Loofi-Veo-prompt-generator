# Local Creator Editing in v16

v16.0.0 was published on 2026-10-12. See the [GitHub release](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v16.0.0) for installers. Subsequent source changes are separate from that release.

## The local editing journey

Start → Create from your own clips creates an independent project with one visual track, audio and
captions. Files are copied to durable storage before becoming usable assets. No automatic AI tagging
or provider request runs during import. Source playback helps trim media; it does not promise the
composited mix. Check delivery lists blockers; Review delivery renders a real 720p video through the
same pipeline as final export. The review is marked stale after the edit changes.

The desktop runtime exports MP4 H.264/AAC at 30 fps, 720p or 1080p, in 9:16, 16:9 or 1:1, up to
180 seconds. Unsupported effects still block export. Delivery mode exposes only supported controls;
existing advanced projects retain their workflow. Native verification and scoped media identities
remain mandatory. Media checksums bind new plans to original source bytes.

## Saving and recovery

Canonical documents have optional documentRevision, with legacy revision zero. Read/compare/write
runs atomically in IndexedDB. Conflicting writes leave both the durable version and local work intact.
Load latest replaces local work only after an explicit selection; Save as copy creates a separate
project. Structural editor changes autosave after 700 ms, while saving, saved, unsaved, conflict,
storage failure and automatic-backup failure remain distinct.

Projects supports search, recently modified/name sorting, rename, duplication and archive filtering.
Automatic backups are checksum-verified by native restoration before being copied to a new project.
Listing a backup never establishes checksum validity. Existing project/Creative Pack formats and
unknown document extensions remain supported.

## Captions and jobs

See [timeline editing contracts](V16_TIMELINE_EDITING.md) for linked caption and atomic undo behavior.
SRT import explicitly appends or replaces captions. Export sorts time; overlaps warn without deleting
text. Gemini proposals remain optional and approval-gated.

Native jobs belong to the journal, not the delivery panel. Navigation and project changes do not
cancel jobs. Explicit Cancel stops execution. App restart marks interrupted work failed and restores
completed jobs. Retry saved render plan uses that job's immutable snapshot; Export video creates a
new snapshot of the current edit. Only one native render/proxy operation runs at a time.

Editing proxies use the bundled FFmpeg runtime and a source-checksum cache. Proxy failure leaves the
original playable. Final export always uses original media. Start lists metadata and hydrates only
the chosen project. v17/v18 remain roadmap items rather than hidden unfinished v16 capabilities.

## After v16

| Version                    | Focus                                       | Planned work                                                                                                                                                |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v17 — smart local editing  | Reduce manual work                          | Optional local transcription, microphone recording, audio normalization, speech-driven music ducking and reviewable silence-cut suggestions.                |
| v18 — recurring production | Produce several deliveries from one project | Sequential format-variant exports, custom covers, reusable delivery templates, series projects and picture-in-picture with matching preview/export support. |

These are later product stages. v16 has no mandatory cloud service, automatic social publishing or
4K export. Existing advanced workspaces remain available.

## Qualification

Automated and real-render verification is recorded separately in CREATOR_V16_VERIFICATION.md.
Automated validation is the acceptance gate. Physical installation, screen-reader and hardware
observations are separate evidence boundaries; CI and scripted examples do not establish them.
The historical onboarding target is not a required gate for subsequent stabilization work.

See [v16 stabilization](V16_STABILIZATION.md) for current local qualification and
[historical secret-scan review](SECRET_SCAN_REVIEW.md) for the outstanding credential finding.
