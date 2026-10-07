# Loofi Creator Studio User Guide

Loofi Creator Studio v13.0.0 is a local-first desktop production suite designed for AI filmmakers, prompt engineers, and creative teams. It bridges prompt craft, 3D previsualization, local GPU rendering, multimodal AI directing, and professional NLE post-production workflows.

---

## 1. Quick Navigation & Product Surfaces

| Surface                            | Route                  | Primary Purpose                                                                  |
| :--------------------------------- | :--------------------- | :------------------------------------------------------------------------------- |
| **Prompt Studio (Video)**          | `/` or `/studio`       | Universal Model Transpiler across Veo 3.1, Kling, Runway, Sora, and Luma         |
| **Prompt Studio (Music & Lyrics)** | `/studio?mode=music`   | Structured Suno Custom Mode lyrics packs and section-level editing               |
| **Production**                     | `/create`              | 6-step production pipeline: Brief → Scenes → Assets → Generate → Review → Export |
| **3D Previz & Staging**            | Within Studio & Create | WebGPU Three.js camera staging, lens simulation, and ControlNet maps             |
| **AI Co-Director**                 | Studio floating widget | Real-time hands-free audio directing powered by Gemini Live (`gemini-3.8-live`)  |
| **Virtual Writers' Room**          | `/hubs/collaboration`  | Zero-cloud P2P LAN collaboration over WebRTC with creative roles                 |
| **Settings**                       | `/settings`            | Provider credentials, ComfyUI local GPU setup, and system diagnostics            |

Legacy routes (`/director`, `/composer`, `/optimize`) redirect cleanly to `/create` while preserving stored project identities.

---

## 2. Prompt Studio & Universal Model Transpiler

Prompt Studio is the default entry surface. It operates in two specialized modes: **Video** and **Music & Lyrics**.

### 2.1 Universal Model Transpiler (Video)

Filmmakers can describe a scene once and deterministically compile native, model-tailored prompt packets for 5 industry-standard video generators:

1. **Google Flow / Veo 3.1**: Naturalistic cinematic phrasing, explicit camera focal lengths and apertures, lighting temperature, and restrained negative tokens.
2. **Kling 1.5 / 2.0**: Structured camera bracket directives (e.g., `[camera: slow push-in, wide angle]`), motion dynamic weightings, and atmospheric tokens.
3. **Runway Gen-3 / Gen-4**: Action-first syntax, directional motion vectors, high-coherence subject anchors, and explicit camera speed descriptors.
4. **OpenAI Sora**: Continuous narrative flow, rich photochemical physical realism, lighting physics, and authentic optical grain indicators.
5. **Luma Dream Machine Ray-2**: Keyframe trajectory anchors, perspective shift clarity, and spatial continuity cues.

#### Workflow:

1. Open `/studio` (or `/`) and ensure **Video** mode is selected.
2. Enter your core scene concept into the **Idea** field.
3. Select your **Model Target** (Veo 3.1, Kling, Runway, Sora, or Luma).
4. Choose the **Prompt Mode**:
   - **Text-to-video**: Complete visual scene, camera movement, lighting, subject action, and audio cue.
   - **Image-to-video**: Strictly motion-only directives (camera, subject, and environment movement) without restating still image contents.
   - **First/last frames**: Explicit definition of the beginning frame, closing frame, and connecting action.
   - **Ingredients/references**: Strict attribution of roles (subject identity, wardrobe anchor, location reference, lighting style).
   - **Extend**: Continuity from the prior shot, specifying next motion progression.
5. Configure optical controls in the **3D Camera & Optics** section:
   - **Focal Length**: 16mm (ultra-wide), 24mm, 35mm, 50mm, 85mm (portrait), 135mm (telephoto), or 2.39:1 Anamorphic.
   - **Aperture / Depth of Field**: Calibrated from $f/1.2$ (ultra-shallow, soft bokeh) to $f/16$ (deep cinema focus).
   - **Camera Trajectory**: Dolly Push-in, Pull-out, Pan, Tilt, Crane Ascension, 360° Orbit, Vertigo Dolly-Zoom, FPV Drone Dive, Dutch Track, or Steadicam Follow.
6. Click **Optimize prompt**. The deterministic compiler evaluates constraints locally and outputs three complete variants:
   - **Recommended Primary**: Balanced, high-fidelity prompt.
   - **Cinematic Alternative**: Emphasizes optical depth, atmospheric lighting, and film stock aesthetics.
   - **Control-Focused Alternative**: Maximizes strict physical and trajectory adherence.
7. Use the explicit copy actions: **Copy Prompt**, **Copy Negative**, **Copy Settings**, or **Copy All**.

---

### 2.2 Suno Music & Lyrics Studio

Music mode (`/studio?mode=music`) prepares structured lyrics packs tailored for Suno Custom Mode without automated external scraping:

1. **Parameters**: Choose lyrics language (e.g. English, Swedish, Spanish, French, Japanese) and Vocal vs. Instrumental mode.
2. **Musical Inputs**: Define genre, tempo, mood, narrative arc, hook idea, and production constraints.
3. **Compile**: Produces:
   - An English **Style of Music** string optimized for Suno tags.
   - Complete section-tagged lyrics (`[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, `[Guitar Solo]`, `[Bridge]`, `[Outro]`).
   - Production notes detailing energy curves and instrumentation.
4. **Section Tools**:
   - **Rewrite section**: Rephrase lyrics while preserving meter and rhyme scheme.
   - **Improve hook**: Heighten catchiness and vocal energy.
   - **Extend / Shorten**: Expand or condense specific stanzas.
   - **Lock Section**: Freeze approved sections to prevent modification during bulk regenerations.
5. **Handoff**: Use **Copy Style**, **Copy Lyrics**, **Copy All**, or **Copy & Open Suno**.

---

## 3. 3D WebGPU Staging & Generative Previz v2

The embedded 3D engine leverages Three.js to provide visual previsualization and conditioning map export directly in the browser:

- **Interactive 3D Viewport**: Manipulate camera position, elevation, focal distance, and target framing in real-time.
- **Optical Lens & Sensor Simulation**: Visualizes true field of view, focal compression, and depth of field blur in real time.
- **ControlNet Conditioning Map Export**:
  - **Depth Map**: 16-bit linear depth visualization for spatial grounding.
  - **Normal Map**: Surface normal orientation visualization for lighting and geometry consistency.
  - **Wireframe Map**: Geometric structure outline for architectural and hard-surface alignment.
- **Previz Animatic Player**:
  - Simulates dynamic camera motion (Ken Burns zoom, pan sweeps, whip cuts) using the HTML5 Canvas engine.
  - **BPM Beat-Sync Grid**: Snaps cut durations to musical bars (e.g. 120 BPM 4/4 time) for rhythmic pacing.
  - **Zero-Cost Scratch Dialogue**: Uses the browser's local Web Speech API to synthesize placeholder voiceover dialogue and timing tracks without API spend.

---

## 4. Multimodal AI Co-Director

Powered by Gemini Live (`gemini-3.8-live`), the AI Co-Director acts as an intelligent assistant sitting alongside the creator:

- **Hands-Free Audio Directing**: Click the Co-Director microphone icon to speak naturally (e.g., _"Make shot 3 darker and switch the camera to an 85mm portrait lens with a slow orbit"_).
- **Live Audio Waveform Widget**: Real-time visualization of incoming speech, co-director reasoning, and voice responses.
- **Bidirectional Tool Execution**: The Co-Director inspects current scene parameters, modifies camera rigs, adjusts lighting temperatures, and updates shot descriptions autonomously.

---

## 5. ComfyUI Local GPU Engine

For creators with dedicated desktop GPUs (NVIDIA RTX or compatible hardware), Loofi Creator Studio offers zero-cost, private offline video generation:

- **Supported Architectures**:
  - Stable Video Diffusion (SVD-XT)
  - HunyuanVideo
  - CogVideoX
  - AnimateDiff
- **Local Diagnostics**:
  - Open **Settings → ComfyUI** to configure host address (`http://127.0.0.1:8188`) and inspect real-time connection status.
  - Live VRAM utilization gauge and loaded checkpoint verification.
- **Workflow Integration**:
  - In Production Step 4 (Generate), select **ComfyUI Local** as the compute provider. Local generation bypasses cloud billing ledgers and runs entirely on your local machine.

---

## 6. Automated Foley & SFX Audio Pipeline

Transform silent video takes into rich cinematic soundscapes:

- **Multi-Track Audio Layout**:
  - `A1`: Music score & stems (Suno / Lyria 3 Pro).
  - `A2`: Dialogue & scratch voiceover (Web Speech API or TTS).
  - `A3`: Foley & sound effects (action-triggered audio cues).
  - `A5`: Ambient room tone and environmental texture.
- **Dynamic Keyframe Ducking**:
  - Automatically attenuates background music and ambient tracks by `-14 dB` during active dialogue keyframes with smooth 250ms ramp-ins and ramp-outs.
- **Synthetic Previz Audio**:
  - Generates instant multi-track WAV previz previews offline for timeline alignment prior to final NLE handoff.

---

## 7. P2P Virtual Writers' Room

Collaborate with creative peers on the same local network without cloud servers or external accounts:

- **LAN WebRTC Architecture**: Direct peer-to-peer data channel mesh using `simple-peer` and `y-webrtc`.
- **Creative Roles**:
  - **Director**: Project governance, final shot approvals, and take selection.
  - **Cinematographer**: 3D camera staging, lens configuration, and visual prompt tuning.
  - **Sound Designer**: Foley cues, audio bed, and Suno music parameters.
  - **Screenwriter**: Screenplay text, scene descriptions, and dialogue pacing.
  - **Editor**: Timeline sequencing, animatic cut points, and export profiles.
- **Zero-Setup Pairing**: Click **Host Room** to generate a copyable LAN pairing code, or enter a peer's pairing code to join.
- **End-to-End Encryption**: All state delta synchronization and chat messages are encrypted with AES-GCM across WebRTC data channels.

---

## 8. AI Screenplay Breakdown Engine

Turn raw screenplays into structured shot lists:

- **Format Ingestion**: Supports industry-standard **Fountain** (`.fountain`) and screenplay **Markdown** files.
- **Automatic Entity Extraction**: Identifies Scene Headers (`INT./EXT.`, Location, Time), Action blocks, Characters, Dialogue, and Foley sound cues.
- **Director Style Profiles**: Automatically infuses shot descriptions with signature cinematic styles:
  - _Denis Villeneuve_: Monumental scale, atmospheric fog, slow monolithic tracking, high contrast.
  - _Wes Anderson_: Symmetrical framing, pastel palettes, flat 90° whip-pans.
  - _Christopher Nolan_: Kinetic IMAX 70mm perspective, visceral practical tracking, cross-cutting tension.
  - _David Fincher_: Clinical surgical precision, smooth robotic dolly motion, low-key lighting.
  - _Cyberpunk Neon Noir_: Saturated volumetric neon, reflective wet streets, chromatic lens fringing.

---

## 9. Production Bible v2 & Assets Continuity

Maintain visual consistency across multiple shots and episodes:

- **Production Bible Profiles**: Centralized management of Characters, Locations, Props, and Visual Styles.
- **4-Angle Turnaround Reference Matrix**:
  - Front view, 3/4 Profile, Side Silhouette, and Action/Back angles ensure character identity does not morph across takes.
- **Perceptual Hash Drift Scorer (dHash)**:
  - Computes client-side 64-bit difference hashes and average color distance between generated takes and reference sheets.
  - Alerts creators to visual drift before committing paid batch generations.
- **Non-Destructive Reference Promotion**: Promote accepted takes into canonical Bible references with one click.

---

## 10. Advanced 6-Step Production Workflow

For creators rendering cloud or local media, the Production workflow (`/create`) provides complete governance:

1. **Brief**: Define production goals, narrative tone, and budget ceiling, or import a parsed screenplay.
2. **Scenes**: Review shot sequencing, camera optics, shot durations, and continuity locks.
3. **Assets**: Link Production Bible references, verify hash fingerprints, and inspect turnaround sheets.
4. **Generate**: Inspect the model catalog, route compute (Cloud Veo, Lyria 3 Pro, or Local ComfyUI), and confirm the exact or upper-bound maximum cost.
5. **Review**: Evaluate takes side-by-side with A/B review tools, perceptual drift scores, and audit notes.
6. **Export**: Package the project with complete provenance.

### Fail-Closed Security & Financial Safety:

- Paid cloud actions require an explicit, one-time signed approval token.
- Electron main independently recalculates costs using its internal pricing mirror; missing, zero, or underestimated pricing requests fail closed immediately.
- API keys reside exclusively in the OS credential vault (Keytar/Secret Service) and are never exposed to the web renderer.

---

## 11. Multi-Track Timeline & OTIO / NLE Export

Deliver final edits directly into professional post-production software:

- **Creative Pack Schema 5**: The export bundle contains all prompt artifacts, Bible profiles, media files, and an OpenTimelineIO payload.
- **OpenTimelineIO (`Timeline.1`) & FCPXML 1.11**:
  - Multi-track timeline mapping:
    - `V1`: Primary high-res video takes (Veo / ComfyUI).
    - `V2`: Previz animatic reference clips.
    - `A1`: Score & music stems.
    - `A2`: Voiceover & dialogue.
    - `A3`: Foley & sound effects.
  - Clip markers retain prompt metadata, generation seed, model version, and camera lens notes.
- **Compatible NLE Suites**: DaVinci Resolve, Final Cut Pro, and Adobe Premiere Pro.

---

## 12. Backup, Migration & Offline Reliability

- **Archive Schemas**: Writes `.loofi-project` Schema 11 and Creative Pack Schema 5. Idempotent migrations safely upgrade historical v5–v12 archives without dropping unrecognized keys.
- **Offline First**: Prompt Studio, 3D Previz, screenplay parsing, animatic playback, ComfyUI generation, and writers' room operate without internet access.
- **Accessibility & Internationalization**: Full translation across English, Swedish, Spanish, French, Japanese, and Arabic, featuring native RTL alignment, keyboard navigation, screen reader live regions, and high-contrast themes.
