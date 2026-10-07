# Loofi Creator Studio Architecture

> v14 qualification: the advanced modules described below are implementation components, not a
> claim that their complete user workflows are qualified. ComfyUI rendering, Live audio, LAN
> collaboration and Foley generation are disabled experiments. FCPXML import is unverified.
> [V14_IMPLEMENTATION.md](V14_IMPLEMENTATION.md) describes the current persistence, recovery,
> capability and portable export contracts.

## 1. Runtime Shape

```text
React Feature Pages (Modular Studio, 3D Previz Viewport, Co-Director, Timeline)
  -> Zustand/Zundo Stores (EditorSession, ProductionRun, JobQueue, Diagnostics)
  -> Singleton Services (Transpiler, Continuity, ComfyUI, SFX, Collaboration, Previz)
  -> Typed Preload Boundary (Electron IPC, Keytar, Media Storage)
  -> Electron Main IPC Modules (paid-job-engine, media-store, window-lifecycle, credentials)
  -> External Engines (Google Vertex/Gemini Live, Local ComfyUI, LAN WebRTC Mesh)
```

The web renderer remains usable for local planning, prompt transpilation, 3D staging, script breakdown, and NLE export. Paid provider execution is guarded strictly in Electron main, where credentials, approval tokens, pricing mirrors, and durable media writes are enforced. Local ComfyUI generation operates over localhost HTTP without external credentials.

---

## 2. Product Surfaces & Modular Information Architecture

The application layout centers on seven primary destinations:

1. **Prompt Studio** (`/` or `/studio`): Default first-run surface. Modularized into:
   - `VideoPromptStudio.tsx`: Core prompt form, Universal Model Target selector, 3D camera rig binding, reference manager.
   - `MusicPromptStudio.tsx`: Suno Custom Mode lyrics generator, energy curve designer, section locks.
   - `PromptVariantCard.tsx`: Reusable cards for Recommended Primary, Cinematic, and Control-focused variants.
   - `PromptValidationList.tsx`: Real-time pass/warning/block checklists.
2. **Production** (`/create`): Advanced 6-step pipeline (Brief → Scenes → Assets → Generate → Review → Export).
3. **Projects** (`/hubs/projects`): Local project library, backups, and `.loofi-project` bundle import/export.
4. **Assets & Continuity** (`/hubs/assets`): Production Bible v2, 4-angle turnaround sheets, reference hash manager.
5. **Timeline & Previz** (`/hubs/timeline`): Previz Animatic Player, multi-track audio/video arrangement, OTIO/FCPXML 1.11 export.
6. **Activity & Jobs** (`/hubs/activity`): Durable queue, ComfyUI render status, and retry controls.
7. **Settings** (`/settings`): OS vault credentials, ComfyUI local GPU setup, and system diagnostics.

Compatibility routes (`/director`, `/composer`, `/optimize`) redirect cleanly to `/create`.

---

## 3. Subsystem Architecture

### 3.1 Universal Model Transpiler Engine

- **Service**: `universalModelTranspilerService.ts`
- **Grammar Compilers**:
  - `compileVeoPrompt`: Naturalistic cinema wording, lens language, restrained negative tokens.
  - `compileKlingPrompt`: Bracket camera directives (`[camera: ...]`), dynamic motion weights, atmospheric tokens.
  - `compileRunwayPrompt`: Action-first imperative syntax, directional motion vectors, subject anchors.
  - `compileSoraPrompt`: Continuous narrative cadence, photochemical realism, optical texture descriptors.
  - `compileLumaPrompt`: Keyframe trajectory anchors, perspective shifts, transition continuity.
- **Contract**: Produces `PromptArtifactV1` preserving normalized input, primary variant, two complete alternatives, validation results, and byte-identical copy fields.

### 3.2 3D WebGPU Staging & Generative Previz v2

- **Component**: `SpatialCamera3dViewport.tsx` (powered by Three.js)
- **Optics Engine**: Simulates calibrated focal lengths (16mm–135mm & 2.39:1 Anamorphic) and apertures ($f/1.2$ to $f/16$).
- **Map Generation**: Renders ControlNet conditioning maps (16-bit linear Depth, Surface Normal, and Wireframe geometry) client-side in the browser.
- **Bundle Budget**: Total bundle budget configured to 4500 KB to accommodate Three.js and spatial math libraries.

### 3.3 Multimodal AI Co-Director

- **Service**: `src/features/codirector/`
- **Model**: Gemini Live (`gemini-3.8-live`)
- **Transport**: Real-time bidirectional WebSocket with Web Audio API capture and synthesized voice playback.
- **Tool Boundary**: Co-Director calls structured tools to adjust camera focal length, scene lighting, shot sequencing, and script breakdowns without manual keyboard interaction.

### 3.4 ComfyUI Local GPU Engine

- **Service**: `comfyUiService.ts`
- **Integration**: Communicates with local ComfyUI instance (`http://127.0.0.1:8188`) via REST and WebSocket.
- **Supported Pipelines**: Stable Video Diffusion (SVD-XT), HunyuanVideo, CogVideoX, and AnimateDiff.
- **Diagnostics**: Queries `/system_stats` for real-time VRAM allocation and loaded checkpoint verification.

### 3.5 Automated Foley & SFX Audio Pipeline

- **Service**: `sfxService.ts`
- **Track Layout**:
  - `A1`: Musical score & stems (Suno / Lyria 3 Pro).
  - `A2`: Dialogue & scratch voiceover (Web Speech API / TTS).
  - `A3`: Foley & sound effect events.
  - `A5`: Ambient room tone.
- **Ducking Automation**: Calculates audio envelope keyframes with `-14 dB` attenuation during dialogue intervals with 250ms smooth ramp transitions.

### 3.6 P2P Virtual Writers' Room

- **Module**: `src/features/collaboration/`
- **Architecture**: Serverless LAN mesh using `simple-peer`, `y-webrtc`, and Yjs CRDTs.
- **Creative Roles**: Director, Cinematographer, Sound Designer, Screenwriter, Editor.
- **Security**: AES-GCM data channel encryption using shared LAN pairing phrase.

### 3.7 Screenplay Breakdown & Previz Animatic

- **Parser**: Fountain (`.fountain`) and Screenplay Markdown parser extracting scene headers, actions, dialogues, characters, and Foley cues.
- **Style Presets**: Villeneuve, Anderson, Nolan, Fincher, and Cyberpunk Neon Noir.
- **Animatic**: Canvas-based 2D motion simulation, BPM beat-sync grid snapping, and Web Speech API zero-cost scratch voiceover.

---

## 4. Continuity Studio & Production Bible v2

- **Canonical Store**: `ProductionBible` stores character, location, prop, and style profiles.
- **4-Angle Turnaround Reference Matrix**: Standardizes character references across Front, 3/4 Profile, Side Silhouette, and Action/Back angles.
- **Perceptual Hash Drift Scorer**: Computes 64-bit difference hashes (dHash) and average color distance between generated frames and reference sheets.
- **Shot Snapshot**: Every shot compiles into a deterministic `ContinuitySnapshot` containing reference asset fingerprints, profile versions, and lock fields.
- **Critical Invariants**: Missing reference files, contradictory locks, or snapshot changes block approval; minor drift issues remain warnings.

---

## 5. Security & Cost Boundaries

- **Executable Model Catalog**: Versioned model registry with canonical/provider IDs, modalities, price dimensions, official source URLs, and verification dates.
- **Price Calculation Mirror**: Electron main independently recalculates maximum charges. Missing, stale, malformed, or zero-assumed pricing blocks paid operations immediately.
- **OS Credential Vault**: Provider API keys reside in Keytar (system Secret Service / Windows Credential Manager) and never cross into the renderer.
- **BrowserWindow Hardening**: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, web security enforced, external URLs opened strictly via validated OS handlers.

---

## 6. Durable Jobs & Atomic Media

- **Durable Paid Jobs**: Video and Lyria operations persist state (`Submitting`, `Generating`, `Complete`) in Electron's durable job store. Submissions survive app restarts without duplicate billing.
- **Atomic Media Writes**: Media files are written atomically with SHA-256 validation before being committed to the project media catalog.
- **Archive Versioning**:
  - `.loofi-project`: Bundle Schema 11 with backward compatibility for v5–v10.
  - Creative Pack: Schema 5 with OpenTimelineIO `Timeline.1` and FCPXML 1.11 payloads.

---

## 7. Quality & Verification Layers

- **Vitest & jsdom**: Unit and integration tests for services, stores, UI components, transpiler engines, and migration fixtures.
- **Node Test Runner**: Electron main IPC, price mirror, durable jobs, and media store.
- **Playwright**: End-to-end browser workflows, RTL layout, accessibility compliance, and screenshot regression.
- **CI Release Smoke**: RPM dependency metadata checks, package build, AppImage extraction smoke, Windows smoke.
