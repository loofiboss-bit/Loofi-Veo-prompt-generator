# Release Notes

## v14.1.0 — Prompt Quality & Safe Iteration

- Compare exact prompt packages across eight video targets with Model Arena.
- Follow actionable validation after compilation, enhancement and manual edits.
- Review AI proposals before accepting changes; locked lyrics remain exact.
- Compare and restore durable project revisions for both Studio workspaces.
- Reuse complete local video/music templates with safe cross-project media handling.
- Use the Pro Studio Glass interface with translated review surfaces and corrected Arabic layout.

[Download v14.1.0](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v14.1.0).
The tag workflow qualifies Windows/Linux packages before publication. Physical desktop and paid
provider qualification remain separate; see [release process](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/blob/main/docs/RELEASE.md).

## v13.0.0 — Universal Model Transpiler & Modular Studio Architecture

v13 expands Loofi Creator Studio from Google Flow/Veo specialization into an open, universal AI video production suite:

- **Universal Model Transpiler Engine**: Transpile cinematic shot rigs into model-specific prompts for Google Veo 3.1 / Flow, Kling 1.5/2.0, Runway Gen-3/4, OpenAI Sora, and Luma Dream Machine Ray-2.
- **Prompt Studio UI Modularization**: Decomposes `PromptStudioPage` into decoupled, maintainable components (`VideoPromptStudio`, `MusicPromptStudio`, `PromptVariantCard`, `PromptValidationList`).
- **ComfyUI Local GPU Engine**: Zero-cost, fully offline video rendering for Stable Video Diffusion (SVD-XT), HunyuanVideo, CogVideoX, and AnimateDiff with real-time VRAM and health diagnostics.
- **3D WebGPU Staging & Generative Previz v2**: Real-time Three.js viewport, optical lens simulation (16mm to 135mm & 2.39:1 Anamorphic), calibrated apertures ($f/1.2$ to $f/16$), and client-side ControlNet Depth, Normal, and Wireframe map rendering.
- **Multimodal AI Co-Director**: Hands-free audio voice directing powered by Gemini Live (`gemini-3.8-live`), waveform studio widget, and bidirectional camera/scene tool manipulation.
- **Automated Foley & SFX Audio Pipeline**: Multi-track audio detection (A2 Dialogue TTS, A3 Foley/SFX, A5 Room Tone), dynamic ducking keyframe automation (-14 dB attenuation during dialogue), and offline synthetic WAV previz.
- **P2P Virtual Writers' Room**: Local network (LAN) real-time collaboration over WebRTC data channels without cloud servers, creative production roles, LAN pairing codes, and AES-GCM data channel encryption.

## v12.0.0 — Previz & Multi-Track Production Studio

v12 bridges cinematic film direction with video generation and professional NLE post-production:

- **3D Spatial Camera Director for Veo 3.1**: Full cinema focal lengths (16mm to 135mm & 2.39:1 Anamorphic), calibrated apertures ($f/1.2$ to $f/16$), 3D trajectories (push-in, orbit 360, vertigo dolly-zoom, FPV drone dive), speeds, and foreground spatial coordinates.
- **Previz Animatic Engine & Beat-Sync Audio Alignment**: Canvas-based real-time 2D camera motion simulation, musical BPM grid snapping for shot cuts, and local Web Speech API text-to-speech scratch dialogue playback.
- **AI Screenplay Breakdown Engine**: Automatic parsing of Fountain and Markdown screenplays into scenes, dialogue lines, characters, locations, and foley cues with cinematic Director style profiles (Villeneuve, Anderson, Nolan, Fincher, Cyberpunk).
- **Production Bible v2 & Visual Drift Scorer**: 4-angle turnaround reference matrix (front, 3/4, profile, action/back) for character identity locking, combined with client-side canvas perceptual hash (dHash) drift scoring.
- **Multi-Track Timeline & OpenTimelineIO (OTIO) + Creative Pack Schema 5**: Multi-track video (V1 Veo primary, V2 Previz animatic) and audio (A1 Music, A2 Scratch Dialogue, A3 Foley SFX) with clip metadata markers and seamless NLE interchange for DaVinci Resolve, Final Cut Pro, and Premiere Pro.
- **Project Schema 12 Migration**: Forward migration preserving all v10/v11 prompt artifacts, production runs, and continuity profiles.

## v11.0.0 — Prompt & Lyrics Studio

v11 makes copy-ready creation the first surface:

- Prompt Studio opens at `/` and `/studio`, with Video and Music & Lyrics modes plus `?mode=music`.
- Deterministic `PromptArtifactV1` output provides one recommended handoff and exactly two complete
  alternatives for every optimization.
- Five Flow/Veo prompt recipes encode focused scenes, motion-only image-to-video, frame transitions,
  reference roles, and extension continuity. Suno remains a manual Custom Mode handoff with
  selected-language, section-tagged lyrics and English Style of Music.
- Creative Pack schema 4 and `.loofi-project` schema 11 preserve Prompt Studio artifacts and older
  project data. Generate in app remains a local draft until the existing cost and approval workflow.

## v10.0.0 — Continuity Studio

v10 makes continuity a first-class local production contract:

- Production Bible profiles cover characters, locations, props, and looks with locked attributes,
  forbidden deviations, ordered references, asset hashes, and local provenance.
- v5–v9 project imports migrate explicitly and idempotently to archive schema 10 while preserving
  unknown fields and migration history; runtime writes the new Bible source.
- Every shot compiles deterministic profile bindings, first/last frame inputs, identity references,
  lock fragments, and a snapshot fingerprint before paid approval.
- Missing or unreadable locked references, contradictory locks, over-capacity reference selections,
  incompatible requests, and changed approvals block execution. Soft drift remains a documented
  warning.
- Assets & Continuity supports local image intake, accepted-take frame extraction, non-destructive
  reference promotion, usage visibility, and Creative Pack provenance.
- Local review always runs against the current snapshot. Optional multimodal Gemini review is a
  separate, one-time approved cost and never runs automatically after generation.

v10 was published as the [Continuity Studio release](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v10.0.0).
Physical desktop qualification remains a separate evidence category from CI package smoke tests.

## v9.0.0 — Creator Studio Consolidation

v9 renames the visible product to Loofi Creator Studio and consolidates creation around one route
and one project context:

- Create now carries Brief, Scenes, Assets, Generate, Review, and Export in one keyboard-complete
  workflow. The primary navigation is limited to Create, Projects, Assets, Timeline, Activity, and
  Settings.
- `/director`, `/composer`, and `/optimize` remain safe compatibility redirects to `/create`.
- Paid operations expose an auditable exact or conservative upper-bound maximum. Unknown, stale,
  malformed, or zero-assumed pricing blocks execution.
- Current Gemini, Nano Banana, Veo, and Lyria catalog entries retain their official source URL,
  verification date, lifecycle, capabilities, and billing assumptions.
- Official Lyria 3 Clip and Pro music generation uses the Google Interactions API, native approval,
  durable jobs, and atomic local media storage. Suno remains an external handoff only.
- The renderer remains sandboxed. Native approvals are one-use and request-bound, provider secrets
  remain in the OS vault, and Electron main independently revalidates the maximum cost.
- English, Spanish, French, Japanese, and Arabic cover the primary workflow, including RTL and
  accessibility behavior.
- The application ID, persisted storage identities, project formats, and compatible package naming
  remain unchanged.

v9 was published as the [Creator Studio consolidation release](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v9.0.0).
Its historical manual qualification boundaries are retained for traceability.

## v8.0.0 — Creator Core

v8 turns Loofi Flow/Veo Studio into one guided, local-first production workspace:

- A six-step Create flow connects planning, assets, generation, A/B review, acceptance, and export.
- The canonical model catalog drives capabilities, lifecycle state, pricing, provider bindings, visible routing reasons, and safe fallbacks.
- Gemini API, Vertex AI ADC/OAuth, and loopback-only Ollama profiles use a narrow privileged desktop bridge.
- Paid jobs survive restart without duplicate submission; ambiguous acknowledgements require manual recovery.
- Desktop media uses a user-selected project folder, atomic writes, checksums, asynchronous thumbnails/proxies, health checks, relink, cleanup preview, and accepted-media protection.
- Portable `.loofi-project` bundles, v5-v7 migrations, five rotating backups, and checksum-verified restore protect project history.
- Production preflight, explicit cost approval, structured review dimensions, take comparison, typed revisions, Suno v5.5/Studio 1.2 handoff, diagnostics, and Safe Mode complete the workflow.
- Windows 11 and current Fedora are supported release targets; macOS remains experimental.

## v7.0.1

v7.0.1 restores the supported model/runtime baseline ahead of Creator Core:

- Retired Gemini endpoints are blocked from executable fallback paths.
- Gemini 3.5 Flash is the default prompt and review model.
- Node.js 24 LTS is used by CI and declared for development.
- Fedora/RHEL RPM metadata now uses native dependency names.

## v7.0.0

v7 introduces Director Mode, an approval-gated production workspace that combines local planning,
validated Veo controls, durable operation recovery, structured take review, local generated-media
storage, storyboard/timeline acceptance, and Creative Pack v2 exports.

## v6.0.0

v6 promotes optimization into the Creative Intelligence Workbench:

- Added `/optimize` as a first-class workspace for prompt quality, cost, narrative continuity, preset fit, and asset review.
- Added patchable accept/dismiss suggestions with project-keyed analysis state and history.
- Added Creative Pack export combining Flow/Veo scene pack, Veo API prompt, Suno production brief, and timeline shot list.
- Replaced static public screenshots with real Playwright captures from seeded app state.

## v5.0.0

v5 focuses the product on Google Flow/Veo and Suno workflows:

- Removed the previous extra video-platform target from UI and adapters.
- Added Flow/Veo output modes and scene pack exports.
- Expanded Suno export modes and bridge workflows.
- Added Windows/Linux-first documentation, screenshots, wiki seed pages, and
  public repository files.
