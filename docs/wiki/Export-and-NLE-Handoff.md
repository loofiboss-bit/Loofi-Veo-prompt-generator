# Export and NLE Handoff

Loofi Creator Studio v13.0.0 bridges generative AI production directly with professional Non-Linear Editing (NLE) suites via standardized interchange formats and multi-track packaging.

---

## 1. Export Formats & Standards

### OpenTimelineIO (`Timeline.1`)

- Industry standard for editorial interchange across VFX and post-production studios.
- Preserves track hierarchy, cut boundaries, transition timings, and clip metadata annotations.
- Direct import into **DaVinci Resolve**, **Final Cut Pro**, and **Adobe Premiere Pro**.

### Final Cut Pro XML (FCPXML 1.11)

- Standard Apple FCPXML interchange supported natively by DaVinci Resolve and Final Cut Pro.
- Preserves multi-track arrangements, audio ducking keyframes, and timing markers.

### Creative Pack Schema 5

- Comprehensive export bundle containing:
  - Full project metadata and prompt artifacts.
  - Production Bible v2 profiles and turnaround reference sheets.
  - Rendered video takes, scratch dialogue stems, and Foley audio tracks.
  - OpenTimelineIO schema payload (`Timeline.1`).
  - Cryptographic SHA-256 checksum manifest.

### Portable `.loofi-project` Schema 11

- Self-contained, portable zip archive encapsulating the entire project state, history, assets, settings, and migration ledger.

---

## 2. Multi-Track Timeline Layout

Exported timelines are organized into dedicated tracks for clean editorial handoff:

| Track  | Type  | Content                                                        |
| :----- | :---- | :------------------------------------------------------------- |
| **V1** | Video | Primary high-resolution video takes (Google Veo 3.1 / ComfyUI) |
| **V2** | Video | Previz animatic reference frames and storyboard animatics      |
| **A1** | Audio | Musical score and instrumental stems (Suno / Lyria 3 Pro)      |
| **A2** | Audio | Dialogue voiceover and scratch dialogue tracks                 |
| **A3** | Audio | Foley sound effects and physical action cues                   |
| **A5** | Audio | Ambient room tone and environmental texture                    |

---

## 3. Clip Markers & Metadata Preservation

Every exported video clip includes embedded metadata markers:

- **Prompt String**: The exact prompt text that generated the take.
- **Model & Generation Seed**: Complete model identification and random seed for reproducibility.
- **Camera Rig Info**: Focal length, aperture, and camera trajectory.
- **Continuity Fingerprint**: Production Bible hash ensuring provenance tracing back to original character references.
