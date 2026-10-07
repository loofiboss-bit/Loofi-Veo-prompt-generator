# Loofi Creator Studio

[![Release](https://img.shields.io/github/v/release/loofiboss-bit/Loofi-Veo-prompt-generator?label=release)](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/latest)
[![Validate](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/workflows/validate.yml/badge.svg)](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/workflows/validate.yml)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20Fedora-green.svg)](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

Local-first desktop studio for multi-model video prompt transpilation (Google Flow/Veo 3.1, Kling,
Runway, OpenAI Sora, Luma Ray-2), 3D WebGPU camera staging, local ComfyUI GPU rendering, multimodal
Gemini Live co-direction, automated Foley/SFX audio ducking, P2P LAN writers' room, and complete Suno
lyrics packs.

## Start here

| Goal                                     | Where to go                                               |
| ---------------------------------------- | --------------------------------------------------------- |
| Transpile prompts across AI video models | **Prompt Studio → Video** (`/` or `/studio`)              |
| Write a Suno lyrics pack                 | **Prompt Studio → Music & Lyrics** (`/studio?mode=music`) |
| 3D WebGPU camera staging & Previz v2     | **Prompt Studio & Production → 3D Previz**                |
| Multimodal AI Co-Director (Gemini Live)  | **Co-Director Widget** (hands-free audio directing)       |
| P2P Virtual Writers' Room (LAN WebRTC)   | **Collaboration Hub** (`/hubs/collaboration`)             |
| Build, render, or simulate a production  | **Production** (`/create`)                                |
| Read the user guide                      | [docs/USER_GUIDE.md](docs/USER_GUIDE.md)                  |

The application ID remains `com.loofi.flowveostudio`, and existing local storage and deep links are
preserved. `/director`, `/composer`, and `/optimize` continue to redirect to `/create`.

## Prompt Studio & Universal Model Transpiler

### Video & Universal Model Transpiler

Stage the scene once and instantly transpile to target-specific syntax:

- **Universal Model Targets**: Google Flow / Veo 3.1, Kling 1.5/2.0 (bracket syntax), Runway Gen-3/4 (action vectors), OpenAI Sora (photochemical narrative realism), and Luma Dream Machine Ray-2 (keyframe anchors).
- **Prompt Modes**: Text-to-video, image-to-video (motion-only semantics), first/last frames, ingredients/references, and extend mode.
- **3D Spatial Optics**: Select cinema focal lengths (16mm to 135mm & 2.39:1 Anamorphic) and calibrated apertures ($f/1.2$ to $f/16$) with 3D camera trajectory compilation.
- **Three Deterministic Variants**: One recommended primary prompt plus complete **Cinematic** and **Control-focused** alternatives with byte-identical copy fields, negative tokens, and settings checklists.

### Music & Lyrics

Music mode prepares a structured, manual Suno Custom Mode handoff:

- Title and an English **Style of Music** field;
- Complete section-tagged lyrics in the selected lyrics language;
- Production notes plus manual Voice, Custom Model, and My Taste notes;
- Rewrite, hook/refrain improvement, extend, shorten, lock, and regenerate tools.

Use **Copy Style**, **Copy Lyrics**, **Copy All**, or **Copy & Open Suno**. Text is never sent to Suno
automatically, and the app does not use unofficial Suno authentication or private APIs.

## Next-Generation Production Capabilities

### 1. 3D WebGPU Staging & Previz v2

- Interactive Three.js 3D viewport with real-time camera manipulation and optical simulation.
- Generates ControlNet Depth, Normal, and Wireframe map exports directly in the browser.
- Previz Animatic Player with canvas motion simulation, BPM beat-sync grid snapping, and local Web Speech TTS scratch dialogue.

### 2. Multimodal AI Co-Director

- Real-time hands-free audio voice directing powered by Gemini Live (`gemini-3.8-live`).
- Waveform audio studio widget with bidirectional camera, lighting, and scene tool manipulation.

### 3. ComfyUI Local GPU Engine

- Zero-cost offline video rendering using local ComfyUI installations.
- Supports Stable Video Diffusion (SVD-XT), HunyuanVideo, CogVideoX, and AnimateDiff.
- Real-time GPU VRAM and service health inspection in Settings.

### 4. Automated Foley & SFX Audio Pipeline

- Multi-track audio detection (A2 Dialogue TTS, A3 Foley/SFX, A5 Room Tone).
- Dynamic ducking keyframe automation (-14 dB attenuation during dialogue).
- Offline synthetic WAV previz preview.

### 5. P2P Virtual Writers' Room

- Zero-cloud, local network (LAN) collaboration powered by WebRTC data channels.
- Creative production roles (Director, Cinematographer, Sound Designer, Screenwriter, Editor).
- Instant pairing via short LAN codes with end-to-end AES-GCM encryption.

### 6. Production Bible v2 & Continuity

- 4-angle turnaround reference matrix (front, 3/4, side, action/back) for character identity locking.
- Client-side perceptual hash (dHash) drift scoring comparing generated takes against reference sheets.

### 7. Multi-Track Timeline & OTIO / FCPXML 1.11 Export

- Professional multi-track layout (V1 Veo primary, V2 Previz animatic, A1 Music, A2 Scratch Dialogue, A3 Foley SFX).
- Creative Pack Schema 5 with native OpenTimelineIO (`Timeline.1`) and FCPXML 1.11 for DaVinci Resolve, Final Cut Pro, and Premiere Pro.

## Advanced Production Workflow

Production remains a six-step, local-first workflow:

1. **Brief** — define the outcome and create a free local plan or import screenplay breakdowns (Fountain/Markdown).
2. **Scenes** — review shot intent, camera trajectory, continuity, and timing.
3. **Assets** — manage local references, Production Bible v2 profiles, and turnaround matrices.
4. **Generate** — review routing (Cloud Veo/Lyria or Local ComfyUI) and sourced maximum charge before approval.
5. **Review** — compare takes with perceptual hash drift scoring and record findings.
6. **Export** — create OTIO, FCPXML, Creative Pack Schema 5, and `.loofi-project` archives with provenance.

**Generate in app** from Prompt Studio creates only a local Production Run or Lyria draft first. A
paid provider request cannot happen until the existing cost and approval workflow is completed.

## Local-first safety

- Projects, prompt artifacts, history, settings, and media stay local by default.
- `PromptArtifactV1` keeps normalized input, one primary, two alternatives, validation, provenance,
  and byte-identical copy fields together.
- Gemini and Ollama optimization uses a structured JSON contract; invalid provider output leaves the
  local draft visible instead of silently falling back.
- Paid provider requests are fail-closed and require an explicit approval with a maximum charge.
- Desktop credentials stay in the operating-system vault and never enter renderer state.
- `.loofi-project` schema 11 and Creative Pack schema 5 preserve older project data and unknown fields.

## Install v13.0.0

Download the [v13.0.0 GitHub Release](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v13.0.0)
and verify the asset against `SHA256SUMS.txt` before installing.

### Windows

Use the NSIS installer (`Loofi-Flow-Veo-Studio-13.0.0-win-x64-setup.exe`) for a normal installation, or the portable EXE (`Loofi-Flow-Veo-Studio-13.0.0-win-x64-portable.exe`) without installation.

### Fedora RPM from GitHub

```bash
sudo dnf install ./Loofi-Flow-Veo-Studio-13.0.0-linux-x86_64.rpm
```

### Fedora COPR

```bash
sudo dnf copr enable loofitheboss/loofi-creator-studio
sudo dnf install veo-prompt-generator
```

The [COPR project](https://copr.fedorainfracloud.org/coprs/loofitheboss/loofi-creator-studio/)
publishes the Fedora 44 x86_64 package. Its source helper downloads the matching GitHub RPM and
checks `SHA256SUMS.txt` before COPR builds the package. The current package is
`13.0.0-1.fc44`; run `sudo dnf upgrade veo-prompt-generator` if an older package is
already installed.

### Linux AppImage

```bash
chmod +x Loofi-Flow-Veo-Studio-13.0.0-linux-x86_64.AppImage
./Loofi-Flow-Veo-Studio-13.0.0-linux-x86_64.AppImage
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
