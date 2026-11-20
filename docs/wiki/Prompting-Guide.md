# Prompting Guide & Universal Syntax Reference

Loofi Creator Studio compiles model-tailored packages for multiple manual destinations. The following are writing examples, not guarantees of model fidelity or documented provider control syntax. Confirm your destination's actual model version and supported controls before submitting. See [Prompt Quality and Iteration](Prompt-Quality-and-Iteration.md) for readiness checks and comparison.

---

## 1. Google Flow / Veo 3.1

Veo excels at naturalistic cinematic descriptions, optical framing, and temporal stability.

### Recommended Structure:

1. **Subject & Action**: State the primary character and concrete motion clearly.
2. **Environment & Time**: Specify location, architecture, atmospheric weather, and time of day.
3. **Camera & Lens Language**: State explicit focal lengths (e.g. _shot on 35mm cinema lens, f/1.8 aperture_) and camera movement (e.g. _slow tracking dolly push-in_).
4. **Lighting & Color**: Volumetric light, golden hour, neon illumination, chromatic tones.
5. **Audio Bed**: Specify ambient background textures and sound effects.

---

## 2. Kling 4.0

Kling 4.0 works best with concrete subjects, actions, camera motion, reference roles, and native audio cues.

### Syntax Rules:

- **Concrete Actions & Timing**: Describe clear subject movement and physical transitions directly in plain language rather than inventing bracket tags.
- **Reference Roles**: Name how each reference image anchors character identity, wardrobe, or environment.
- **Atmospheric & Audio Cues**: Include natural sound textures and lighting cues where native audio is supported.

---

## 3. Runway Gen-4.5

Runway Gen-4.5 prioritizes positive, action-first descriptions and explicit motion-first animation for image inputs.

### Syntax Rules:

- **Action-First Phrasing**: Lead with the active verb:
  `Dolly push-in on an astronaut walking across red dunes towards a glowing monolith.`
- **Positive Phrasing**: Describe what should appear cleanly; avoid relying on negative-prompt parameters.
- **Subject Locking**: Keep subject descriptions concise to maintain structural coherence.

---

## 4. Gemini Omni 1.2 Flash

Gemini Omni 1.2 Flash supports natural multi-turn video direction, frame/reference continuity, 3–15s clips, and synchronized native audio (with `gemini-omni-1.1-flash` compatibility for existing iterations). Note: reference video uploads may be restricted in the EEA, Switzerland, and the UK; text-to-video turns remain available.

_(Historical OpenAI Sora artifacts remain readable in existing projects and exports only; Sora is retired and unavailable for new packs.)_

---

## 5. Luma Ray3.2

Luma Ray3.2 excels at clear scene/motion/camera direction across 5s and 10s generations with frame-anchor constraints.

### Syntax Rules:

- **Trajectory Anchors**: Explicitly define starting perspective and ending perspective:
  `Starts as a wide drone establishing shot of the coastline, rapidly swooping down to ground level to track alongside a vintage sports car.`
- **Direct Scene Controls**: Keep audio and negative directives inside positive visual prose rather than separate parameters.

---

## 6. Suno Custom Mode (Music & Lyrics)

1. **Style of Music**: Keep concise, comma-separated English tags:
   `synthwave, energetic 80s analog arpeggio, punchy drums, driving bassline, melancholic female vocals, 128 bpm`
2. **Lyrics Structuring**: Use standardized section headers in brackets:
   - `[Verse 1]`, `[Verse 2]`
   - `[Pre-Chorus]`, `[Chorus]`
   - `[Guitar Solo]`, `[Instrumental Break]`
   - `[Bridge]`, `[Outro]`
3. **Language**: Write lyrics in your desired language (Swedish, English, Spanish, etc.); keep the Style field in English for maximum genre recognition.
