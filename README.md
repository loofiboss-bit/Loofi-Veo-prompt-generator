# Loofi Creator Studio

Local-first planning, approval, generation, review, and export for Google Flow/Veo productions.

![Version](https://img.shields.io/badge/version-10.0.0-blue.svg)
![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)
[![Validate](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/workflows/validate.yml/badge.svg)](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/workflows/validate.yml)

Loofi Creator Studio consolidates the previous Director, Composer, and Optimize entry points into a
single six-step **Create** workflow. Existing routes, project bundles, application identity
(`com.loofi.flowveostudio`), and local storage keys remain compatible.

## Create workflow

1. **Brief** — define the production goal and create a zero-cost local plan.
2. **Scenes** — inspect shot intent, camera, continuity, and timing.
3. **Assets** — manage the local Production Bible, bind continuity references, or explicitly approve
   official Lyria 3 music generation.
4. **Generate** — review model routing and a sourced maximum charge before any paid request.
5. **Review** — compare takes, record findings, and accept, reject, or revise.
6. **Export** — create handoff material with settings and provenance.

The six primary destinations are Create, Projects, Assets, Timeline, Activity, and Settings.
Legacy `/director`, `/composer`, and `/optimize` deep links redirect to `/create`.

Continuity Studio keeps character, location, prop, and look profiles local. Each shot compiles its
bindings into a deterministic snapshot with asset hashes before approval; changed snapshots require
new approval and cost review.

## Model and cost safety

- One versioned catalog owns provider IDs, lifecycle, capabilities, routing, and pricing metadata.
- A paid operation is blocked when a conservative maximum cannot be calculated.
- Every paid request carries a one-time approval with model, calculation inputs, maximum USD,
  pricing source, and verification date.
- Electron main independently validates the request and approval; credentials never enter renderer
  state.
- Ordinary 720p video prefers Gemini Omni Flash. Veo is selected for specialized controls such as
  reference images, first/last frames, extension, higher resolution, or explicit Veo choice.

Pricing is audited against the official
[Gemini API pricing page](https://ai.google.dev/gemini-api/docs/pricing). Provider prices can
change; the verification date shown in the app is part of the execution contract.

## Music: Lyria and Suno

Lyria 3 Clip and Pro use Google's official Interactions API. Clip creates a 30-second MP3; Pro can
create longer MP3 or WAV output. Text, optional lyrics/structure, and up to ten images are accepted.
The result is checksum-verified into local desktop media before the durable job is marked complete.

Suno remains a clearly labelled structured export handoff. The app does not implement unofficial
Suno authentication or private API behavior.

## Privacy and recovery

- Projects, history, settings, assets, and production runs stay local.
- Desktop credentials are stored in the operating-system credential vault.
- Provider calls happen only after an explicit approval action.
- Durable jobs persist acknowledgements before polling and never replay ambiguous paid submissions.
- Accepted/generated media is copied atomically with SHA-256 readback metadata.
- Safe Mode detects crash loops. Diagnostics and support bundles exclude credentials and prompt
  content.
- Existing v5–v9 project bundles remain importable; v10 writes only the Production Bible format and
  preserves unknown fields and migration history.

## Supported platforms

| Platform                   | Support                               | Artifacts                       |
| -------------------------- | ------------------------------------- | ------------------------------- |
| Windows x64                | Supported through CI qualification    | NSIS installer and portable EXE |
| Fedora 44 x86_64           | Supported Linux baseline              | RPM and AppImage                |
| Other current Linux x86_64 | Best effort                           | AppImage                        |
| macOS                      | Not a production-supported v10 target | No qualified release artifact   |

Artifact names use `Loofi-Flow-Veo-Studio-10.0.0-<os>-<arch>.<ext>` for compatibility with the
existing release channel.

## Install and development

Node.js 24 and npm are required for development.

```bash
nvm use
npm ci
npm run electron:dev
npm run validate
npm run validate:release
```

Linux AppImage:

```bash
chmod +x Loofi-Flow-Veo-Studio-10.0.0-linux-x86_64.AppImage
./Loofi-Flow-Veo-Studio-10.0.0-linux-x86_64.AppImage
```

Fedora RPM:

```bash
sudo dnf install ./Loofi-Flow-Veo-Studio-10.0.0-linux-x86_64.rpm
```

## Deterministic screenshots

The checked-in screenshots use seeded local data and fake provider state. Capture fails when the
expected populated content is missing and never runs a paid request.

```bash
npm run screenshots
```

![Project brief](assets/screenshots/01-project-brief.png)
![Scene planning](assets/screenshots/02-scene-planning.png)
![Assets and Lyria](assets/screenshots/03-assets.png)
![Generation approval](assets/screenshots/04-generation-approval.png)
![Active job](assets/screenshots/05-active-job.png)
![A/B review](assets/screenshots/06-ab-review.png)
![Timeline](assets/screenshots/07-timeline.png)
![Export](assets/screenshots/08-export.png)
![Diagnostics](assets/screenshots/09-diagnostics.png)

## Documentation

- [User guide](docs/USER_GUIDE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Support](SUPPORT.md)

MIT License — see [LICENSE](LICENSE).
