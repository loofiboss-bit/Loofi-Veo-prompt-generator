# Studios Skills

## Motion Brush

- **Region selection** — Paint motion regions on video frames
- **Motion direction** — Define motion vectors for selected regions
- **Intensity control** — Adjust motion strength per region
- **Preview** — Real-time preview of motion effects

**Features:** `src/features/studios/MotionBrush.tsx`

## Inpainting

- **Mask painting** — Paint areas for AI inpainting/removal
- **Content-aware fill** — AI-generated content to fill masked areas
- **Object removal** — Remove unwanted objects from scenes
- **Background replacement** — Replace backgrounds in generated footage

**Features:** `src/features/studios/InpaintingModal.tsx`

## Color Grading

- **LUT application** — Apply Look-Up Tables for cinematic color
- **Color wheels** — Lift/gamma/gain color correction
- **Scopes** — Waveform, vectorscope, histogram displays
- **Grade presets** — Save and share color grade configurations

**Services:** `colorGradeService.ts`

## Video Editing

- **Cut/trim** — Basic video editing operations
- **Speed ramping** — Variable speed within a single clip
- **Stabilization** — AI-based video stabilization
- **Noise reduction** — Reduce visual noise in generated footage

**Services:** `videoEditorService.ts`

## Segmentation

- **Object segmentation** — AI-powered object isolation from backgrounds
- **Rotoscoping** — Frame-by-frame object masking
- **Depth mapping** — Generate depth maps for parallax effects

**Services:** `segmentationService.ts`

## Effect Pipeline

- **Effect chain** — Stack multiple effects in configurable order
- **Effect presets** — Save and share effect combinations
- **Per-clip effects** — Apply effects to individual clips
- **Real-time preview** — Preview effects before rendering

**Services:** `effectPipeline.ts`

## Audio Studio

- **Suno integration** — AI audio generation via Suno
- **Recording booth** — Record voiceovers and audio directly
- **Audio mixing** — Multi-track audio mixing with levels
- **Sound effects** — Browse and apply sound effect library

**Services:** `sfxService.ts`
**Features:** `src/features/studios/` (audio components)

## Image Editing

- **Reference editing** — Edit reference images before prompt generation
- **Crop/resize** — Standard image manipulation tools
- **Filter application** — Apply visual filters to reference images

**Services:** `imageEditService.ts`
