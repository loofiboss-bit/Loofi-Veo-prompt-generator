# Video Prompt Studio & Universal Model Transpiler

Prompt Studio is the primary copy-first creation workspace in Loofi Creator Studio v13.0.0. Located at `/` and `/studio`, it provides instant model-tailored prompt compilation across leading AI video generators.

## Supported Model Targets & Grammar

1. **Google Flow / Veo 3.1**:
   - Naturalistic, scene-first descriptive language.
   - Explicit cinematic lens specifications (e.g., 35mm, 85mm anamorphic) and lighting attributes.
   - Restrained negative prompts to prevent token clipping.
2. **Kling 1.5 / 2.0**:
   - Structured camera bracket directives (e.g. `[camera: slow pan left, cinematic tracking]`).
   - Dynamic motion weighting and atmospheric cues.
3. **Runway Gen-3 / Gen-4**:
   - Action-first syntax with directional motion vectors.
   - High-coherence subject locks and explicit camera speed indicators.
4. **OpenAI Sora**:
   - Rich continuous narrative flow describing physical realism, motion cadence, and photochemical film grain.
5. **Luma Dream Machine Ray-2**:
   - Trajectory anchors, transition clarity, and keyframe perspective shifts.

## Core Prompt Modes

- **Text-to-video**: Subject, visible action, environment, camera, lighting, and ambient sound cues.
- **Image-to-video**: Strictly motion-only descriptors (camera and subject movement) without restating static image contents.
- **First/last frames**: The desired bridge action connecting two reference frames.
- **Ingredients/references**: Explicit role assignments (character, wardrobe, location, style).
- **Extend**: Next narrative progression preserving continuity from the preceding shot.

## 3D Spatial Optics

- Cinema focal lengths: 16mm, 24mm, 35mm, 50mm, 85mm, 135mm, and 2.39:1 Anamorphic.
- Calibrated apertures: $f/1.2$ to $f/16$ for precise depth-of-field simulation.
- 3D camera trajectory compilation: Dolly Push-in/Pull-out, Pan, Tilt, Crane Ascension, 360° Orbit, Vertigo Dolly-Zoom, FPV Drone Dive, Dutch Track, and Steadicam Follow.

Each compile produces three deterministic variants: **Recommended Primary**, **Cinematic**, and **Control-focused**, with byte-identical copy fields, negative prompts, and settings checklists.
