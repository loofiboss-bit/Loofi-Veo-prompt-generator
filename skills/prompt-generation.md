# Prompt & Generation Skills

## Prompt Builder

- **Structured prompt composition** — Subject, action, style, camera, lighting, duration fields
- **Token counting** — Real-time token count for model limits
- **Prompt scoring** — Quality scoring with suggestions for improvement
- **Template application** — Apply saved templates to fill prompt fields

**Services:** `promptBuilder.ts`, `promptScoring` (in features)
**Store:** `useAppStore` (promptSlice)
**UI:** Prompt Builder panel

## Batch Generation

- **Multi-prompt batching** — Generate multiple prompts in parallel
- **Queue management** — Priority-based generation queue with pause/resume
- **Progress tracking** — Per-item progress with estimated completion time
- **Error recovery** — Retry failed generations with exponential backoff

**Services:** `batchPromptService.ts`, `generationQueueService.ts`, `jobQueueService.ts`
**Store:** `useBatchPromptStore`, `useGenerationQueueStore`, `useJobQueueStore`
**UI:** Batch Generation modal, Job Queue panel

## AI Model Adapters

- **Veo adapter** — Google Veo 2/3 prompt format and API integration
- **Flow/Veo adapter** — Google Flow/Veo prompt format and API integration
- **Model fallback** — Automatic fallback chain when primary model fails
- **Model profiles** — Per-model parameter presets (temperature, tokens, aspect ratio)

**Services:** `adapters/VeoAdapter.ts`, `adapters/FlowVeoAdapter.ts`, `modelFallbackService.ts`
**Config:** `src/core/config/modelProfiles.ts`

## Gemini Integration

- **Prompt enhancement** — AI-powered prompt improvement via Gemini
- **Vision analysis** — Image-to-prompt using Gemini Vision
- **Audio generation** — AI audio prompt composition via Gemini Audio
- **Production assist** — Scene planning and production suggestions

**Services:** `gemini/geminiPromptService.ts`, `gemini/geminiVisionService.ts`, `gemini/geminiAudioService.ts`, `gemini/geminiProductionService.ts`

## Prompt History

- **Version tracking** — Full history of prompt edits with diff
- **Undo/redo** — Zundo-powered temporal state management
- **Favorites** — Pin frequently used prompts for quick access
- **Search** — Full-text search across prompt history

**Services:** `historyService.ts`, `searchService.ts`
**Store:** `useHistoryStore`

## Template System

- **Built-in templates** — Cinematic, documentary, anime, commercial, music video presets
- **Custom templates** — Save any prompt configuration as a reusable template
- **Template categories** — Organized by genre, style, mood, technique
- **Import/export** — Share templates as JSON files

**Services:** `templateManager.ts`
**Config:** `src/core/config/projectTemplates.ts`

## Prompt Scoring & Analysis

- **Quality score** — 0-100 score based on completeness, specificity, coherence
- **Suggestions** — Actionable improvement tips per prompt field
- **Model compatibility** — Flag prompt features unsupported by target model
- **Token optimization** — Suggest edits to reduce token count without losing quality

**Features:** `src/features/prompt/`

## Cost Tracking

- **Per-generation cost** — Track API costs per model per generation
- **Budget limits** — Set daily/weekly/monthly spending caps
- **Usage analytics** — Visualize spending trends over time

**Services:** `costTrackingService.ts`
**Store:** `useCostStore`

## Preset Manager

- **Style presets** — Quick-apply visual style configurations
- **Camera presets** — Pre-configured camera movements and angles
- **Lighting presets** — Standard lighting setups (golden hour, studio, neon, etc.)
- **Duration presets** — Common duration configurations per platform

**Services:** `presetManager.ts`

## Community & Sharing

- **Community prompts** — Browse shared prompts from other users
- **Prompt sharing** — Share prompts with metadata and preview
- **Rating system** — Rate and review community prompts

**Services:** `communityService.ts`

## Stock Media Integration

- **Stock search** — Search stock video/image libraries
- **Reference images** — Attach reference images to prompts
- **Style matching** — Match prompt style to reference media

**Services:** `stockMediaService.ts`
