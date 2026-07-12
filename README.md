# Loofi Flow/Veo Studio

Local-first Flow/Veo and Suno prompt studio for AI video and music workflows.

![Version](https://img.shields.io/badge/version-7.0.1-blue.svg)
![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

Loofi Flow/Veo Studio helps creators plan Google Flow/Veo video prompts, scene packs,
shot cards, continuity notes, approval-gated production runs, structured take reviews, and Suno
music prompts from one desktop app. Project data, production runs, generated media, prompt history,
templates, settings, and API keys stay local on your machine.

## Screenshots

![Home workspace](assets/screenshots/01-home.png)
![Flow/Veo Studio](assets/screenshots/02-flow-veo-studio.png)
![Suno Studio](assets/screenshots/03-suno-studio.png)
![Scene pack export](assets/screenshots/04-scene-pack-export.png)
![Settings for Windows and Linux](assets/screenshots/05-settings-windows-linux.png)
![Timeline planning](assets/screenshots/06-timeline.png)
![Create workflow](assets/screenshots/07-create-workflow.png)
![Model decision and cost approval](assets/screenshots/08-model-cost-approval.png)
![A/B take comparison](assets/screenshots/09-take-comparison.png)
![Diagnostics](assets/screenshots/10-diagnostics.png)
![Media library](assets/screenshots/11-media-library.png)

Regenerate screenshots with:

```bash
npm run screenshots
```

## What It Does

| Workflow            | Output                                                                           |
| ------------------- | -------------------------------------------------------------------------------- |
| Create              | Six-step local plan, cost approval, Veo generation, A/B review, revision, export |
| Flow/Veo Scene Pack | Shot cards, character continuity, location continuity, style bible, copy pack    |
| Veo API Prompt      | Concise prompt with duration, aspect ratio, resolution, references, audio notes  |
| Optimize Workbench  | Prompt quality, cost, preset, narrative, asset, and patchable suggestion review  |
| Suno Song Pack      | Style tags, lyrics, structure, production brief, JSON export                     |
| Video to Suno       | Music brief from current Flow/Veo scene direction                                |
| Suno to Flow/Veo    | Music-video shot ideas from lyric sections                                       |

The app includes local project storage, durable production runs, prompt history, templates,
timeline planning, Suno Studio, Flow/Veo compatibility scoring, Creative Pack v2 exports,
optimization review, and optional Gemini/Ollama prompt drafting.

## Install

Download the latest release from:

https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases

| Platform | Artifact               | Notes                                                            |
| -------- | ---------------------- | ---------------------------------------------------------------- |
| Windows  | NSIS installer         | Per-user install, Start Menu shortcut, no admin requirement      |
| Windows  | Portable EXE           | Run without installation                                         |
| Linux    | AppImage               | Make executable, then launch from your file manager or terminal  |
| Linux    | RPM                    | Fedora/RHEL package with desktop entry and icon                  |
| macOS    | Community/experimental | Not a primary supported target unless CI artifacts are published |

Linux AppImage:

```bash
chmod +x Loofi-Flow-Veo-Studio-*-linux-*.AppImage
./Loofi-Flow-Veo-Studio-*-linux-*.AppImage
```

Fedora/RHEL RPM:

```bash
sudo dnf install ./Loofi-Flow-Veo-Studio-*-linux-*.rpm
```

## Quick Start

1. Enter a video idea, reference details, aspect ratio, camera direction, and audio notes.
2. Open **Create**, create a local plan, and optionally approve one Gemini brief-enhancement call.
3. Review the displayed Veo ceiling, then approve shots or split long shots into Veo-safe segments.
4. Generate and review takes; explicitly accept, reject, revise, or approve a retake.
5. Export Creative Pack v2 or continue with **Optimize** and **Suno Studio**.

Use descriptive style terms instead of naming real artists, real voices, or copyrighted lyrics.

## Privacy Model

- Projects, history, templates, and settings are stored locally in IndexedDB.
- Desktop production runs survive restart and accepted media is atomically copied to the filesystem with SHA-256 metadata; IndexedDB/OPFS remains the web fallback.
- Desktop API keys stay in the operating-system credential vault and are never returned to the renderer.
- No generation or semantic review request runs without an explicit approval action.
- Optional local LLM drafting can run through Ollama-compatible endpoints.
- No hosted backend is required for normal desktop usage.

## Development

```bash
nvm use
npm ci
npm run dev
npm run electron:dev
npm run validate
npm run build
```

Useful scripts:

```bash
npm run screenshots
npm run release:checksums
npm run validate:release
```

## Documentation

- Wiki seed pages: [docs/wiki](docs/wiki/Home.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security: [SECURITY.md](SECURITY.md)
- Support: [SUPPORT.md](SUPPORT.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)
- License: [LICENSE](LICENSE)

## Repository Metadata

Recommended GitHub description:

```text
Local-first Flow/Veo and Suno prompt studio for AI video and music workflows.
```

Recommended topics:

```text
veo google-veo google-flow suno ai-video ai-music prompt-engineering electron react vite typescript local-first
```
