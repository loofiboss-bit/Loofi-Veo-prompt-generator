# v17.0.0 Publication Verification & Release Runbook

Verified on 2026-10-17. Loofi Creator Studio v17.0.0 brings Smart Local Editing, token streaming in desktop proxy, and enhanced resilience without compromising local-first guarantees (zero cloud lock-in, zero mandatory accounts, 100% offline-capable editing and rendering).

## Release Overview & Included Work

v17.0.0 merges the complete Smart Local Editing feature slice (PR #68), Enhance with AI resilience (PR #67), and desktop streaming, Co-Director connection gating, store mediator decoupling, and lazy bundle splitting (PR #69).

### Core Features & Enhancements

1. **Microphone Voiceover Recording**: Direct timeline audio recording via Web Audio API with real-time waveform visualization, device selection, take naming, and automatic insertion into a dedicated dialogue track.
2. **Reviewable Silence Detection & Cut Suggestions**: Offline pause detection across media clips using bundled FFmpeg `silencedetect`. Dedicated review modal with adjustable threshold and ripple-cut application.
3. **Local Offline Speech-to-Text & Linked Captions**: Proposes non-overlapping caption blocks from dialogue intervals and script text without external cloud services; linked directly to source clips.
4. **EBU R128 Loudness Normalization**: Integrated broadcast-standard EBU R128 audio normalization (`loudnorm=I=-14:TP=-1.5:LRA=11`) into native delivery rendering.
5. **Speech-Driven Audio Ducking**: Sidechain envelope volume ducking attenuating background music tracks by -14 dB during speech with 200 ms attack/decay transitions.
6. **Save-on-Close Flush Resilience**: Immediate synchronous/microtask flush of pending debounced project autosaves on `beforeunload`, `pagehide`, and component unmount events.
7. **Desktop Gemini Streaming Proxy**: Real-time token streaming support over IPC between Electron main and renderer with abort signals.
8. **AI Co-Director Connection Gate**: Explicit user approval gate in desktop app before establishing WebSocket/Live sessions.
9. **Safe Legacy Generation Redirect**: Graceful redirection from legacy quick-generation endpoints to Create workspace with user notification.
10. **Bundle Optimization**: Code-split `CreatorDeliveryPanel`, `ModalManager`, and CreatePage wizard steps with `React.lazy`.
11. **Decoupled Cross-Store State**: Strongly-typed `storeMediator` event bus (`locations:updated`, `asset:upserted`, `timeline:synced`).
12. **Dynamic Lyria Model Catalog**: Music generator options dynamically derived from `MODEL_CATALOG`.

## Canonical Pipeline & Qualification

Expected desktop assets:

| Target                | Asset                                                |
| --------------------- | ---------------------------------------------------- |
| Windows x64 installer | `Loofi-Flow-Veo-Studio-17.0.0-win-x64-setup.exe`     |
| Windows x64 portable  | `Loofi-Flow-Veo-Studio-17.0.0-win-x64-portable.exe`  |
| Fedora RPM            | `Loofi-Flow-Veo-Studio-17.0.0-linux-x86_64.rpm`      |
| Linux AppImage        | `Loofi-Flow-Veo-Studio-17.0.0-linux-x86_64.AppImage` |

Release metadata assets:

- `SHA256SUMS.txt`
- `sbom.cdx.json` (CycloneDX SBOM)
- `provenance.intoto.json`
- `release-manifest.json`
- `latest.yml` (Windows update metadata)

## Local Release Gates

```bash
npm ci
npm run package:rpm:check
npm run pre-release:check
npm run validate:release
git diff --check
```

## Publication Sequence

```bash
git checkout main
git pull origin main
git tag -a v17.0.0 -m "Loofi Creator Studio v17.0.0"
git push origin v17.0.0
gh run watch <run-id> --repo loofiboss-bit/Loofi-Veo-prompt-generator --exit-status
```

## Fedora COPR Publication

```bash
copr-cli build-package loofitheboss/loofi-creator-studio --name veo-prompt-generator
```
