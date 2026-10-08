# Loofi Creator Studio User Guide

This guide describes the v14 workspace. The application ID and existing local data remain
unchanged.

## Start locally

On first launch, choose Video or Music, choose one of the registered interface languages, then
select **Start creating**. Provider credentials are only needed when you choose an AI function.

In Prompt Studio, enter an idea and select **Build copy-ready pack**. Local compilation needs no
network. Choose one of the three variants, edit its text directly and use its copy actions. Expand
**Scene details** for video direction or **Advanced handoff notes** for music details. History and
saved templates are available in the same workspace.

The status beside your project reports **Saving**, **Saved**, or **Not saved**. Draft input, variants,
selection and lyric locks save after 500 ms. Project changes wait for pending writes. If saving fails,
keep the window open and retry; a temporary memory copy is not persistent storage.

## Video prompts

Choose target, recipe, duration and aspect ratio before building the pack. Flow, Kling, Runway,
Sora and Luma use manual handoffs. Copy the selected variant and follow the destination's own
submission controls. The app does not silently convert those targets to Veo API.

For image-based recipes, import a local PNG, JPEG or WebP image or select an existing local image.
First/last-frame mode requires both images; ingredients mode selects multiple references. Extend
prompts describe continuity from a previous clip. Internal extension requires a real provider
artifact and is blocked when that artifact is missing.

**Veo API** is the internal production target. Supported durations are 4, 6 or 8 seconds, subject to
mode-specific constraints. **Generate in app** creates a local plan with the selected variant and
references. It does not submit a paid request. In Production, review the request and sourced maximum
charge, then approve before generating. Unsupported combinations are stopped before submission.

An uncertain submission result reports **RecoveryRequired**. Do not submit another order: the
provider may already have accepted the first. Known operations resume polling or media download.
On restart, persistent jobs are reconciled. Media is complete only after local storage verification.

## Music and lyrics

Choose lyrics language, genre and story, then build a pack. Locally generated lyrics are suggestions.
Edit the selected variant's lyrics and style. Use **Copy Style**, **Copy Lyrics**, **Copy All**, or
**Copy & Open Suno** for manual Custom Mode handoff. No Suno private API or automatic upload is used.

For AI section rewriting, configure Gemini or Ollama in Settings. Select a section and describe the
change. Lock sections you want to retain. Rewriting preserves non-selected sections and requests the
chosen language. Input changes invalidate late AI responses.

## Projects and portable exports

In **Projects**, name and create a project, open an existing one, import a `.loofi-project` archive,
or export the chosen project. Archives include its full document, referenced local media, relative
paths, checksums, prompt artifacts, handoffs and production provenance. They do not include unrelated
project media. Missing local media blocks export with an error.

Import creates a new local project with consistent remapped IDs and installed media. Active cost
approvals are revoked and imported work is not automatically submitted. Playback uses local media;
no provider account is required to play restored results.

Production's export step offers **Download OTIO with media**. The bundle describes actual timeline
tracks, gaps, trims and chosen takes. **FCPXML: experimental** remains unqualified for external NLE
import; test it in your own editor before relying on it.

## Labs and diagnostics

**Settings → Labs** is off by default. Enabling it exposes local camera preview and ComfyUI
connection diagnostics on demand. ComfyUI rendering, Live Co-Director audio, multi-device LAN
collaboration and Foley generation are unavailable because their integrations are incomplete.
Enabling Labs does not activate those disabled actions.

Both themes use the same workspace controls. Keyboard focus is visible; use Tab to navigate and
Enter or Space to activate actions. Interface languages match the registered English, Spanish,
French, Japanese and Arabic catalogs; lyrics language is a separate creative setting.

For implementation contracts and qualification limits, see [V14_IMPLEMENTATION.md](V14_IMPLEMENTATION.md).

## Studio iteration in v14.1.0

Use **Compare in Arena** to compare local prompt packages for the eight Studio video targets.
The preview and copy action use the same compiler as **Build copy-ready pack**. Confirm the actual
model version, supported controls and duration in each manual destination. Only Veo API supports an
internal production handoff, and paid generation still requires cost approval in Production.

Open **Readiness checks** after building or editing a pack. Each variant is checked separately.
Documented constraints can block internal generation; writing advice and unconfirmed compatibility
are clearly distinguished. **Open control** selects the relevant field or variant without changing its value.
Quoted dialogue is supported. You can still copy a manual pack while reviewing warnings.

**Enhance with AI** and **Rewrite section** show proposed differences. Review all three variants and
choose **Accept changes** or **Reject changes**. Your existing draft stays unchanged until acceptance.
Locked lyric sections are preserved exactly. Changing the draft or switching project invalidates the proposal.

Open **Versions and comparison** and select **Save version** to keep a project snapshot. Choose a
saved version to compare it with the draft, then use **Restore as new version** to restore both video
and music inputs, outputs, selections and lyric locks. Restore preserves a version of your current work.
Rebuild, model change, template application and AI acceptance also checkpoint before replacing work.
Identical adjacent snapshots do not add duplicates. Storage failures block replacements; keep the window
open and retry saving. Brief edits keep the old pack visible until you build a replacement.

Open **Studio template library** to name and save complete inputs. Search or filter templates,
preview one, then apply it and build a new pack. Video and music entries stay in their own workspace.
Saved music inputs include original lyrics and locks. Select images and clips again in every project;
templates exclude project media IDs and provider handles. Updating a template replaces its input with
the current workspace's input. Legacy video templates are read-only.

Revisions travel with `.loofi-project` archives, including local media referenced only by an older
version. Import remaps IDs and retains the existing revocation of active cost approvals. Templates
are a global local library and are not part of a project archive. No new provider integration or Labs
capability is activated by this release.
