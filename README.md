# Loofi Creator Studio

[![Release](https://img.shields.io/github/v/release/loofiboss-bit/Loofi-Veo-prompt-generator?label=release)](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/latest)
[![Validate](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/workflows/validate.yml/badge.svg)](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/workflows/validate.yml)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20Fedora-green.svg)](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

Local-first desktop tools for writing copy-ready Google Flow/Veo prompts and complete Suno lyrics
packs. Media generation remains available in the advanced production workflow, but the primary job
is helping you make a better prompt or lyrics handoff before you open the provider.

## Start here

| Goal                           | Where to go                                               |
| ------------------------------ | --------------------------------------------------------- |
| Write a Google Flow/Veo prompt | **Prompt Studio → Video** (`/` or `/studio`)              |
| Write a Suno lyrics pack       | **Prompt Studio → Music & Lyrics** (`/studio?mode=music`) |
| Build and render a production  | **Production** (`/create`)                                |
| Read the user guide            | [docs/USER_GUIDE.md](docs/USER_GUIDE.md)                  |

The application ID remains `com.loofi.flowveostudio`, and existing local storage and deep links are
preserved. `/director`, `/composer`, and `/optimize` continue to redirect to `/create`.

## Prompt Studio

### Video

Describe the idea first, then add only the controls that matter for the shot:

- target platform, aspect ratio, duration, style, camera, action, environment, and audio;
- Text-to-video, image-to-video, first/last frames, ingredients/references, and extend modes;
- explicit reference roles and motion-only wording for image-to-video;
- one recommended English prompt plus complete **Cinematic** and **Control-focused** alternatives.

Every result keeps the prompt, negative prompt, and settings checklist as explicit copy fields, so
clipboard, export, and history use the same text.

### Music & Lyrics

Music mode prepares a manual Suno Custom Mode handoff:

- title and an English **Style of Music** field;
- complete section-tagged lyrics in the selected lyrics language;
- production notes plus manual Voice, Custom Model, and My Taste notes;
- rewrite, hook/refrain improvement, extend, shorten, lock, and regenerate tools.

Use **Copy Style**, **Copy Lyrics**, **Copy All**, or **Copy & Open Suno**. Text is never sent to Suno
automatically, and the app does not use unofficial Suno authentication or private APIs.

## Advanced Production

Production remains a six-step, local-first workflow for users who want to create media in the app:

1. **Brief** — define the outcome and create a free local plan.
2. **Scenes** — review shot intent, camera, continuity, and timing.
3. **Assets** — manage local references and the Production Bible.
4. **Generate** — review routing and the sourced maximum charge before approval.
5. **Review** — compare takes and record findings.
6. **Export** — create handoff material with settings and provenance.

**Generate in app** from Prompt Studio creates only a local Production Run or Lyria draft first. A
provider request cannot happen until the existing cost and approval workflow is completed.

## Local-first safety

- Projects, prompt artifacts, history, settings, and media stay local by default.
- `PromptArtifactV1` keeps normalized input, one primary, two alternatives, validation, provenance,
  and byte-identical copy fields together.
- Gemini and Ollama optimization uses a structured JSON contract; invalid provider output leaves the
  local draft visible instead of silently falling back.
- Paid provider requests are fail-closed and require an explicit approval with a maximum charge.
- Desktop credentials stay in the operating-system vault and never enter renderer state.
- `.loofi-project` schema 11 and Creative Pack schema 4 preserve older project data and unknown fields.

## Install v11.0.0

Download the [v11.0.0 GitHub Release](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v11.0.0)
and verify the asset against `SHA256SUMS.txt` before installing.

### Windows

Use the NSIS installer for a normal installation, or the portable EXE without installation.

### Fedora RPM from GitHub

```bash
sudo dnf install ./Loofi-Flow-Veo-Studio-11.0.0-linux-x86_64.rpm
```

### Fedora COPR

```bash
sudo dnf copr enable loofitheboss/loofi-creator-studio
sudo dnf install veo-prompt-generator
```

The [COPR project](https://copr.fedorainfracloud.org/coprs/loofitheboss/loofi-creator-studio/)
publishes the Fedora 44 x86_64 package. Its source helper downloads the matching GitHub RPM and
checks `SHA256SUMS.txt` before COPR builds the package.

### Linux AppImage

```bash
chmod +x Loofi-Flow-Veo-Studio-11.0.0-linux-x86_64.AppImage
./Loofi-Flow-Veo-Studio-11.0.0-linux-x86_64.AppImage
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
copy-first entry point in the shipped v11 application.

MIT License — see [LICENSE](LICENSE).
