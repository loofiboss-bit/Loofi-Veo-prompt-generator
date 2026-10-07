# Production Workflow

The **Production** workflow (`/create`) provides an end-to-end, approval-gated pipeline for multi-shot cinematic projects. It guides creators through six structured stages:

```text
1. Brief  ──>  2. Scenes  ──>  3. Assets  ──>  4. Generate  ──>  5. Review  ──>  6. Export
```

---

## Step 1: Brief & Screenplay Ingestion

- Define project title, target platform, aspect ratio, duration goals, and narrative themes.
- **Screenplay Breakdown Engine**: Ingest raw screenplay files in **Fountain** (`.fountain`) or Markdown format. The parser automatically extracts:
  - Scene headers (`INT./EXT.`, Time, Location)
  - Action sequences
  - Character speaking roles and dialogue lines
  - Foley sound effect cues
- **Director Style Presets**: Apply signature aesthetic styling (Denis Villeneuve, Wes Anderson, Christopher Nolan, David Fincher, Cyberpunk Neon Noir).

---

## Step 2: Scenes & 3D Previz Staging

- Organize shots into a sequential timeline.
- **3D WebGPU Viewport**: Position cameras in a 3D environment, configure focal length (16mm–135mm + 2.39:1 Anamorphic) and aperture ($f/1.2$ to $f/16$), and select 3D motion trajectories.
- **Previz Animatic Player**: Simulate 2D camera movement (zooms, pans, whip dissolves) and preview cut pacing aligned to musical BPM grids.
- **Scratch Dialogue**: Use local Web Speech API synthesis for instant voiceover playback during animatics.

---

## Step 3: Assets & Continuity

- Bind characters, locations, and props to canonical **Production Bible v2** profiles.
- Verify 4-angle turnaround matrices and calculate reference hash fingerprints.
- Ensure all required reference assets are locally available before proceeding to generation.

---

## Step 4: Generation & Routing

- Choose compute execution:
  - **Cloud AI Video (Google Veo 3.1)**: Requires explicit cost approval. Sourced exact or upper-bound pricing is calculated and re-verified by Electron main.
  - **Local GPU Video (ComfyUI)**: Zero-cost, fully private rendering on local RTX hardware supporting SVD-XT, HunyuanVideo, CogVideoX, and AnimateDiff.
  - **Music & Audio (Lyria 3 Pro / Suno)**: Orchestrate multi-track audio generation.
- **Fail-Closed Safety**: Any ambiguous, stale, or zero-cost assumed cloud request is rejected immediately.

---

## Step 5: Review & Take Comparison

- Compare takes using side-by-side A/B player comparison.
- Inspect **Perceptual Hash Drift (dHash)** scores to verify character and wardrobe consistency against Bible reference sheets.
- Mark takes as **Accepted**, **Rejected**, or **Candidate for Promotion**.

---

## Step 6: Export & NLE Interchange

- Package the finished project into **Creative Pack Schema 5**.
- Export native **OpenTimelineIO (`Timeline.1`)** and **FCPXML 1.11** multi-track sequences (V1/V2 video, A1/A2/A3 audio, clip markers) for DaVinci Resolve, Final Cut Pro, and Adobe Premiere Pro.
- Export portable `.loofi-project` Schema 11 archives with full migration history and cryptographic checksums.
