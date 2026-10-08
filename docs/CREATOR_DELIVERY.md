# Creator delivery in v15 development

This documents the v15 source implementation. It does not announce a public release. The published
v14.2.1 downloads remain the stable installation path. Desktop MP4 export is available only when a
verified rendering runtime is provisioned for the running platform.

## From an idea to a deliverable

Start provides twelve editable recipes: six for social video, three for storytelling, and three for
music or music visuals. Recipe creation compiles a local Studio draft and three to five storyboard
scenes. It does not submit generation or charge an account. Customized recipe inputs can be saved
in the existing Studio template library.

Three offline examples include original programmatic geometric clips, synthesized audio, and
caption clips. Their CC0 dedication and checksums are in `public/creator-examples/rights.json`.
They are example media, not generated AI footage. Opening an example creates a separate project
and copies its media into durable local storage.

My style saves local profiles with colors, bundled Noto Sans or Noto Serif, an optional library
logo, and creative direction. A preview and explicit application are required before a profile
is copied into the current project. Later profile edits do not change that project snapshot.
Applying creative direction updates the Studio input; rebuild the prompt pack to use the new input.
Existing character, location, and continuity profiles remain available.

## Local rendering limits

| Capability  | Current behavior                                                                     |
| ----------- | ------------------------------------------------------------------------------------ |
| Duration    | Greater than zero and at most 60 seconds                                             |
| Output      | MP4, H.264 video and AAC audio, 30 fps                                               |
| Size        | 720p or 1080p; 9:16, 16:9, or 1:1                                                    |
| Composition | One main video/image track, multiple separate audio clips, caption clips             |
| Timing      | Clip start times, source trim offsets, cuts, and black gaps                          |
| Transitions | Cuts, fade through black, and a simple dissolve with matching clip overlap           |
| Crop        | Fit the entire image by default; explicit fill crop and horizontal/vertical position |
| Audio       | Separate timeline audio clips, levels, and fade in/out                               |
| Text        | Classic, Pop, or Karaoke caption style; SRT or burned-in captions                    |
| Branding    | Project style colors/font, optional logo, and adjustable safe margins                |

Embedded video sound follows that clip's audio level and joins the mix. Add separate timeline audio
clips for additional music or narration. Unsupported effects, transforms, reactive effects, or animated volume
keyframes block export instead of being silently omitted. Missing or damaged selected media also
blocks export and identifies the affected clip.

Rendering uses a frozen, content-hashed timeline plan. Editing the project while rendering does
not change that job. Start a new export after editing to produce an updated deliverable. Only one
local render job runs at a time. Progress includes a separate verification phase. Cancellation
stops the job; interrupted work is marked failed after restart rather than treated as complete.

The renderer checks streams, dimensions, codec, duration, and full decoding before enabling save.
The native save dialog chooses the destination. Save verifies the rendered file checksum again
and writes through a temporary file. A failed or cancelled job cannot replace a previous delivery.
The web preview retains project and prompt features but explains when native export is unavailable.

## Captions and publication

Manual caption editing and SRT import/export work locally. Start and end times are in seconds and
must fall inside the timeline duration. Import and accepted AI proposals **add** caption clips;
remove earlier clips when replacing their text to avoid duplicate captions.

Gemini transcription is optional. The selected **complete audio file** is sent after approval,
not just its timeline trim. Proposed timings are mapped back to the selected trimmed clip.
The UI identifies the file and the desktop approval dialog shows a maximum charge before sending.
An empty or invalid response fails. A proposal requires review and explicit acceptance; changing
the project or captions invalidates a stale proposal.

A publication title and description can be edited without AI. Optional Gemini polishing sends
only those text fields in the selected language, uses the existing approval gate, and presents a
proposal before changing the fields. A changed project or publication text invalidates the proposal.

After rendering, **Save publication package** creates a ZIP with:

- `video.mp4` — the verified render;
- `captions.srt` — caption text and timing, including an empty sidecar when no captions exist;
- `cover.png` — the first rendered frame;
- `publication.txt` — the export snapshot's title and description;
- `delivery-report.json` — project identity, render content hash, duration, format and codec.

Change title, description, style, or captions before rendering the final package. A completed job
retains the snapshot it rendered; saving that job does not replace its metadata with later edits.
The app does not post to social services or require an account for local project work and rendering.
External generators and optional AI services have their own accounts, availability and charges.

## Compatibility and evidence

Creator recipes, styles, project delivery settings and native render plans have version-one types.
Delivery settings are optional project data. Existing project schema 11, Creative Pack 5 and storage
identities remain supported, including media references in project export/import.

The build requires reviewed FFmpeg/ffprobe bundles for Linux x64 and Windows x64, with exact version,
checksums, licenses, corresponding sources and dependency build recipes. See
[rendering runtime requirements](../packaging/media-runtime/README.md). The app does not download
rendering binaries at startup or fall back to an arbitrary host FFmpeg.

Automated checks, genuine rendered files and five AI-assisted user scenarios provide separate
implementation evidence. They do not prove physical Windows operation or measure how quickly five
new human users finish onboarding. Those claims require their own recorded observations.

## Result-based guides

- [Export your first offline video](guides/FIRST_OFFLINE_VIDEO.md)
- [Add readable captions and your own style](guides/CAPTIONS_AND_STYLE.md)
- [Prepare a publication package](guides/PUBLICATION_PACKAGE.md)

See [local verification and demonstration assets](CREATOR_V15_VERIFICATION.md) for evidence and reproduction commands.
