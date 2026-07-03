# Loofi Flow/Veo Studio

Local-first Flow/Veo and Suno prompt studio for AI video and music workflows.

![Version](https://img.shields.io/badge/version-6.0.0-blue.svg)
![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

Loofi Flow/Veo Studio helps creators plan Google Flow/Veo video prompts, scene packs,
shot cards, continuity notes, optimization passes, and Suno music prompts from one desktop
app. Project data, prompt history, templates, settings, and API keys stay local on your
machine.

## Screenshots

![Home workspace](assets/screenshots/01-home.png)
![Flow/Veo Studio](assets/screenshots/02-flow-veo-studio.png)
![Suno Studio](assets/screenshots/03-suno-studio.png)
![Scene pack export](assets/screenshots/04-scene-pack-export.png)
![Settings for Windows and Linux](assets/screenshots/05-settings-windows-linux.png)
![Timeline planning](assets/screenshots/06-timeline.png)

Regenerate screenshots with:

```bash
npm run screenshots
```

## What It Does

| Workflow            | Output                                                                          |
| ------------------- | ------------------------------------------------------------------------------- |
| Flow/Veo Scene Pack | Shot cards, character continuity, location continuity, style bible, copy pack   |
| Veo API Prompt      | Concise prompt with duration, aspect ratio, resolution, references, audio notes |
| Optimize Workbench  | Prompt quality, cost, preset, narrative, asset, and patchable suggestion review |
| Suno Song Pack      | Style tags, lyrics, structure, production brief, JSON export                    |
| Video to Suno       | Music brief from current Flow/Veo scene direction                               |
| Suno to Flow/Veo    | Music-video shot ideas from lyric sections                                      |

The app includes local project storage, prompt history, templates, timeline planning,
Suno Studio, Flow/Veo compatibility scoring, Creative Pack exports, optimization review,
and optional Gemini/Ollama prompt drafting.

## Install

Download the latest release from:

https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases

| Platform | Artifact               | Notes                                                           |
| -------- | ---------------------- | --------------------------------------------------------------- |
| Windows  | NSIS installer         | Per-user install, Start Menu shortcut, no admin requirement     |
| Windows  | Portable EXE           | Run without installation                                        |
| Linux    | AppImage               | Make executable, then launch from your file manager or terminal |
| Linux    | RPM                    | Fedora/RHEL package with desktop entry and icon                 |
| macOS    | Community/experimental | Not a primary v5 target unless CI artifacts are published       |

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

1. Open the app and choose **Google Flow Scene Pack** or **Veo API Prompt**.
2. Enter a video idea, reference details, aspect ratio, camera direction, and audio notes.
3. Generate a prompt or scene pack.
4. Copy Markdown/JSON exports into Flow/Veo workflows.
5. Open **Optimize** to review local-first suggestions and export a Creative Pack.
6. Open **Suno Studio** to generate style tags, lyrics, and a production brief.

Use descriptive style terms instead of naming real artists, real voices, or copyrighted lyrics.

## Privacy Model

- Projects, history, templates, and settings are stored locally in IndexedDB.
- API keys are stored locally and only used for user-triggered generation.
- Optional local LLM drafting can run through Ollama-compatible endpoints.
- No hosted backend is required for normal desktop usage.

## Development

```bash
npm ci --legacy-peer-deps
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
