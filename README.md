# Loofi Creator Studio

[![Release](https://img.shields.io/github/v/release/loofiboss-bit/Loofi-Veo-prompt-generator?label=release)](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/latest)
[![Validate](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/workflows/validate.yml/badge.svg)](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/workflows/validate.yml)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20Fedora-green.svg)](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

Local-first desktop workspace for individual creators: idea → editable prompt pack → manual
handoff or approved production → portable result. The local v14.1.0 development version adds
model comparison, actionable validation, reviewed AI changes, project revisions and reusable Studio templates.
The latest published installation documented below remains v14.0.1.

## Start here

| Goal                                              | Where to go                                               |
| ------------------------------------------------- | --------------------------------------------------------- |
| Build and edit video prompts                      | **Prompt Studio → Video** (`/studio`)                     |
| Prepare a Suno lyrics pack                        | **Prompt Studio → Music & Lyrics** (`/studio?mode=music`) |
| Create, open, import or export projects           | **Projects**                                              |
| Review and approve supported Veo/Lyria generation | **Production** (`/create`)                                |
| Configure an AI provider when needed              | **Settings**                                              |
| Inspect experimental capabilities                 | **Settings → Labs**                                       |
| Read the user guide                               | [docs/USER_GUIDE.md](docs/USER_GUIDE.md)                  |

The application ID remains `com.loofi.flowveostudio`. Existing local data and documented archive
schemas are preserved. Legacy routes `/director`, `/composer`, and `/optimize` redirect to `/create`.

## Prompt Studio

Describe your idea, choose the target, mode, duration and references, then select **Build copy-ready
pack**. Compilation runs locally. Each pack has three editable variants with synchronized copy
fields. Project history, version comparison and a complete local template library are available in Studio. Scene details and handoff notes
expand when needed.

Video targets Flow, Kling, Runway, Sora, Luma, Wan and Hailuo use manual copy handoffs. Suno uses **Copy Style**,
**Copy Lyrics**, **Copy All**, or **Copy & Open Suno**; it has no automated provider integration.
Only **Veo API** exposes an internal production handoff, with supported request combinations checked
before creating a plan. A plan does not submit a paid request: review its cost and approve it in
Production first.

Music templates are local lyric suggestions. AI enhancement requires a configured Gemini or Ollama
provider. Section rewriting keeps the requested language and preserves other sections, including
locks. Late AI responses are ignored after input changes.

Drafts, variant edits and section locks autosave after 500 ms to the active project document.
**Saving**, **Saved**, and **Not saved** report the real persistence result; memory fallback cannot
claim a durable save. Project switching waits for pending draft writes.

## New in v14.1.0 development

- **Compare in Arena** compiles all eight video targets from the same brief with the same compiler
  as Studio. Copy packages match Studio exactly; this is a prompt comparison, not a video-quality benchmark.
- **Readiness checks** distinguish documented constraints, writing advice and unconfirmed compatibility.
  Checks update after editing any variant; **Open control** selects the affected field or variant.
  Quoted dialogue is preserved. Manual copy remains available; internal Veo requests remain approval-gated.
- **Versions and comparison** saves both workspaces, outputs, variant selection and lyric locks in the
  project. Restore saves the current work before creating a restored version. Identical snapshots are deduplicated.
- AI enhancement and section rewriting propose changes for **Accept changes** or **Reject changes**.
  The draft stays unchanged until acceptance, locked sections stay byte-identical, and edits invalidate pending proposals.
- **Studio template library** saves complete video or music inputs for reuse between projects, with
  search, target filtering, preview, update and delete. Re-select images and clips in each project.
  Older video templates remain available as read-only entries.

Changing brief inputs keeps the previous output visible until rebuilding. Rebuild, model change,
template application, AI acceptance and restore require a durable checkpoint first; a storage failure
blocks replacement. Project archives retain revisions and their referenced local media. Creative Pack
schema 5 supports revisions without changing the documented project schema 11 or existing storage keys.

## Portable projects and production

Projects exposes creation, import and export directly. `.loofi-project` archives contain the chosen
project document, referenced local media, relative paths, checksums and provenance. Import assigns
consistent local IDs and revokes active cost approvals. Missing media blocks export instead of
producing an unusable archive.

Production retains its Brief → Scenes → Assets → Generate → Review → Export workflow. OTIO bundles
use actual timeline tracks, gaps, trims and selected takes with packaged media. FCPXML is experimental
until import into an external editor is qualified.

## Labs

Labs is off by default. Camera staging is a local preview experiment. ComfyUI diagnostics can be
opened after enabling Labs, but video rendering is unavailable. Live audio, LAN collaboration and
Foley generation have incomplete integrations and their actions are disabled. GPU rendering,
physical multi-device collaboration and external NLE imports are not qualified by mock tests.

See [v14 implementation notes](docs/V14_IMPLEMENTATION.md) for contracts and verification boundaries.

## Local-first safety

- Projects, prompt artifacts, history, settings, and media stay local by default.
- `PromptArtifactV1` keeps normalized input, one primary, two alternatives, validation, provenance,
  and byte-identical copy fields together.
- Gemini and Ollama optimization uses a structured JSON contract; invalid provider output leaves the
  local draft visible instead of silently falling back.
- Paid provider requests are fail-closed and require an explicit approval with a maximum charge.
- Desktop credentials stay in the operating-system vault and never enter renderer state.
- `.loofi-project` schema 11 and Creative Pack schema 5 preserve older project data and unknown fields.

## Install v14.0.1

Download the [v14.0.1 GitHub Release](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v14.0.1)
and verify the asset against `SHA256SUMS.txt` before installing.

### Windows

Use the NSIS installer (`Loofi-Flow-Veo-Studio-14.0.1-win-x64-setup.exe`) for a normal installation, or the portable EXE (`Loofi-Flow-Veo-Studio-14.0.1-win-x64-portable.exe`) without installation.

### Fedora RPM from GitHub

```bash
sudo dnf install ./Loofi-Flow-Veo-Studio-14.0.1-linux-x86_64.rpm
```

### Fedora COPR

```bash
sudo dnf copr enable loofitheboss/loofi-creator-studio
sudo dnf install veo-prompt-generator
```

The [COPR project](https://copr.fedorainfracloud.org/coprs/loofitheboss/loofi-creator-studio/)
publishes the Fedora 44 x86_64 package. Its source helper downloads the matching GitHub RPM and
checks `SHA256SUMS.txt` before COPR builds the package. The current package is
`14.0.1-1.fc44`; run `sudo dnf upgrade veo-prompt-generator` if an older package is
already installed.

### Linux AppImage

```bash
chmod +x Loofi-Flow-Veo-Studio-14.0.1-linux-x86_64.AppImage
./Loofi-Flow-Veo-Studio-14.0.1-linux-x86_64.AppImage
```

## Development

Node.js 24 and npm are required.

```bash
nvm use
npm ci
npm run electron:dev
```

Useful checks:

```bash
npm run validate
npm run validate:release
npm run screenshots
```

## Documentation

- [Documentation portal](docs/README.md)
- [User guide](docs/USER_GUIDE.md)
- [Prompting guide](docs/wiki/Prompting-Guide.md)
- [Suno handoff](docs/wiki/Suno-Handoff.md)
- [Production workflow](docs/wiki/Production-Workflow.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Release process and evidence](docs/RELEASE.md)
- [Installation and updates](docs/wiki/Installation-and-Updates.md)
- [Release notes](docs/wiki/Release-Notes.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Screenshots

The [screenshot guide](docs/wiki/Screenshots.md) explains how to regenerate the deterministic,
provider-free fixtures. The screenshots cover the advanced production workflow; Prompt Studio is the
copy-first entry point in the shipped application.

MIT License — see [LICENSE](LICENSE).
