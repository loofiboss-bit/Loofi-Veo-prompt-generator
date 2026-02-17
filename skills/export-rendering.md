# Export & Rendering Skills

## FFmpeg.wasm Rendering

- **Client-side rendering** — Render video compositions entirely in-browser via FFmpeg.wasm
- **Format support** — MP4 (H.264), WebM (VP9), GIF, image sequences
- **Resolution options** — 720p, 1080p, 4K output
- **Hardware acceleration** — WebAssembly SIMD for faster encoding

**Infrastructure:** `src/infrastructure/` (workers)

## Export Profiles

- **Platform presets** — YouTube, TikTok, Instagram, Twitter optimized settings
- **Custom profiles** — Save custom export configurations
- **Batch export** — Export multiple clips with different profiles simultaneously
- **Quality presets** — Draft, standard, high, production quality tiers

**Config:** `src/core/config/exportProfiles.ts`
**Services:** `exportService.ts`, `apiExportService.ts`

## Scene Export

- **Selective export** — Export specific scenes or timeline ranges
- **Proxy rendering** — Generate low-res previews before final export
- **Export queue** — Background export with progress notification

**Services:** `sceneExportService.ts`

## Upscaling

- **AI upscaling** — Enhance resolution of generated video frames
- **Quality enhancement** — Improve sharpness and detail post-generation
- **Batch upscaling** — Upscale multiple clips in queue

**Services:** `upscaleService.ts`

## Smart Cropping

- **Content-aware crop** — Automatically crop to important content
- **Aspect ratio conversion** — Convert between aspect ratios preserving key content
- **Face detection crop** — Keep faces in frame during crop operations

**Services:** `smartCropService.ts`

## Video Generation

- **API integration** — Send prompts to Veo/Sora APIs and receive video
- **Generation queue** — Manage multiple concurrent generation requests
- **Result preview** — Preview generated video before adding to timeline
- **Regeneration** — Re-generate with modified parameters

**Services:** `videoGenerationService.ts`
**Store:** `useVideoStore`

## Format Conversion

- **Container conversion** — Convert between video container formats
- **Codec transcoding** — Transcode between video codecs
- **Audio extraction** — Extract audio tracks from video files
- **Thumbnail generation** — Generate thumbnail images from video frames
