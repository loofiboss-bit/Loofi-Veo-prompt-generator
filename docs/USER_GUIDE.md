# Loofi Creator Studio user guide

## Start a project

Open **Projects**, create or open a local project, then choose **Create**. Existing projects and v5–v9
bundles continue to use their current IDs, media references, and storage. Autosave checkpoints appear
in the Create header.

## Complete the Create workflow

1. **Brief:** describe the outcome. Creating the first plan is local and free. A Gemini enhancement
   is separate and requires its own sourced maximum-cost approval.
2. **Scenes:** review shot intent, camera, duration, continuity, and split any shot that exceeds a Veo
   segment.
3. **Assets:** open the **Assets & Continuity** panel, add local images, create character/location/
   prop/look profiles, and bind the profiles explicitly to each shot. Promote an accepted-take or
   extracted-frame candidate only after reviewing it; canonical references are never replaced
   automatically. You can also generate official Lyria music here.
4. **Generate:** inspect model choice, lifecycle, capability reason, price dimension, calculation,
   source, verification date, exact continuity snapshot, reference hashes, and maximum charge. The
   request cannot run until you approve it. Critical continuity blockers cannot be overridden.
5. **Review:** compare takes against the selected identity, wardrobe/props, location/look, and
   shot-transition metadata. Local review is always available; multimodal Gemini review is optional,
   separately approved, and never runs automatically after generation. A changed snapshot invalidates
   old review scores.
6. **Export:** export accepted work, Production Bible profiles, shot bindings, snapshots, reports, and
   provenance. `.loofi-project` schema 10 remains locally portable and preserves migration history.

The Back/Next controls do not cover the content, and changing steps moves keyboard focus to the new
step heading. Job status changes are announced to assistive technology.

## Generate Lyria music

In **Create → Assets**:

1. Choose **Lyria 3 Clip** for a 30-second MP3 or **Lyria 3 Pro** for a longer MP3/WAV song.
2. Enter style, mood, instruments, vocals, language, and desired duration.
3. Optionally add structured lyrics, timestamped sections, and up to ten JPEG/PNG/WebP images.
4. Review the exact per-request maximum and pricing verification date.
5. Select **Approve and generate**. This is the paid execution boundary.
6. When complete, play or export the checksum-verified local file. It also appears in Assets.

If the app loses the provider acknowledgement, the job becomes **Recovery required** and is not
automatically submitted again. If generation succeeds but local verification fails, it becomes
**Media at risk**. Avoid starting a new paid request until provider activity has been checked.

Suno tools create structured prompts/exports only and send you to an external workflow. Loofi Creator
Studio does not sign in to or call unofficial Suno endpoints.

## Settings and credentials

Configure Gemini API or Vertex AI in **Settings**. Desktop credentials are stored in the operating
system credential vault. The renderer can check whether a credential exists, replace it, or delete
it; it cannot retrieve the secret. A connection check verifies configuration without spending API
credits. Ollama is an explicit local provider.

## Cost confidence

- **Exact:** the catalog has a fixed request/unit price for every selected dimension.
- **Upper bound:** the maximum uses conservative token/output assumptions.
- **Unavailable:** required price or request dimensions are unknown; paid execution is blocked.

Always check the source and verification date because provider prices can change.

## Backup, recovery, and Safe Mode

Project backups are stored under the selected local project root and use a bounded retention policy.
Generated desktop media uses atomic writes plus SHA-256 metadata. Do not delete the project media
directory outside the app.

After repeated startup failures, Safe Mode reduces optional work so you can open Settings or export
diagnostics. The support bundle is local and redacted: credentials, prompts, private media, and raw
provider payloads are excluded.

## Offline behavior

Local project editing, planning, timeline work, and exports remain available offline. Paid provider
actions fail with a clear configuration/network error and keep recoverable durable state. Ambiguous
submissions never retry automatically.

## Accessibility and languages

The primary Create workflow is translated into English, Spanish, French, Japanese, and Arabic. RTL
layout uses logical positioning. Keyboard navigation, focus indicators, semantic headings, live
status, reduced motion, and light/dark themes are part of the supported interface.
