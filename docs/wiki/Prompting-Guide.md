# Prompting Guide & Universal Syntax Reference

Loofi Creator Studio v13.0.0 compiles native prompt syntax for multiple generation targets. Follow these target-specific principles to maximize model fidelity.

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

## 2. Kling 1.5 / 2.0

Kling responds optimally to structured bracket directives for motion and camera trajectories.

### Syntax Rules:

- **Camera Brackets**: Prepend or append bracketed camera operators:
  `[camera: slow pan left, subtle tilt up, 50mm lens]`
- **Motion Dynamics**: Describe motion weightings (e.g. _smooth fluid movement, slow-motion splash_).
- **Atmospheric Keywords**: Include volumetric depth keywords like _cinematic mist, ray tracing reflections_.

---

## 3. Runway Gen-3 / Gen-4

Runway prioritizes action-first, imperative descriptors with explicit directional motion vectors.

### Syntax Rules:

- **Action-First Phrasing**: Lead with the active verb:
  `Dolly push-in on an astronaut walking across red dunes towards a glowing monolith.`
- **Directional Vectors**: Use explicit coordinate language (_moving screen-left to screen-right_, _descending from upper-third_).
- **Subject Locking**: Keep subject descriptions concise to maintain structural coherence.

---

## 4. OpenAI Sora

Sora demonstrates high comprehension of continuous narrative realism and physical lighting physics.

### Syntax Rules:

- **Narrative Continuity**: Write in continuous, descriptive prose describing cause-and-effect motion.
- **Physical Realism**: Mention physical materials and lighting interaction (e.g., _refracting water droplets, subsurface scattering on skin, authentic photochemical 35mm film grain_).
- **Avoid Tag Soups**: Do not use comma-separated buzzwords like "8k, photorealistic". Use descriptive visual context instead.

---

## 5. Luma Dream Machine Ray-2

Luma excels at dynamic perspective shifts and keyframe trajectory anchors.

### Syntax Rules:

- **Trajectory Anchors**: Explicitly define starting perspective and ending perspective:
  `Starts as a wide drone establishing shot of the coastline, rapidly swooping down to ground level to track alongside a vintage sports car.`
- **Transition Clarity**: State motion speed and transitional landmarks clearly.

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
