# AI & Voice Skills

## Gemini Prompt Enhancement

- **Prompt rewriting** — AI improves prompt specificity and quality
- **Style suggestions** — Recommend complementary styles and techniques
- **Scene expansion** — Expand brief descriptions into detailed prompts
- **Multi-language** — Translate and adapt prompts across languages

**Services:** `gemini/geminiPromptService.ts`
**UI:** Prompt Builder (enhance button)

## Voice-to-Prompt

- **Speech recognition** — Convert spoken scene descriptions to text prompts
- **Voice activation** — Hands-free prompt creation via microphone
- **Natural language parsing** — Extract structured fields from conversational input
- **Dictation mode** — Continuous voice input for long-form descriptions

**Services:** `audioAnalysisService.ts`, `audioSeparationService.ts`
**Features:** `src/features/studios/` (recording booth)

## Vision Analysis

- **Image-to-prompt** — Generate prompts from reference images via Gemini Vision
- **Style extraction** — Identify visual style, color palette, composition from images
- **Scene decomposition** — Break reference images into prompt components
- **Mood detection** — Automatically detect mood and atmosphere from visual references

**Services:** `gemini/geminiVisionService.ts`

## Context RAG

- **Prompt memory** — Build searchable index of past prompts and results
- **Contextual suggestions** — Suggest prompt elements based on current project context
- **Style consistency** — Maintain visual consistency across multi-shot projects
- **Knowledge retrieval** — Pull relevant techniques from prompt history

**Infrastructure:** `src/infrastructure/`

## AI Chat Assistant

- **Conversational help** — Chat-based interface for prompt guidance
- **Technique explanations** — Explain cinematic techniques and how to prompt them
- **Troubleshooting** — Help diagnose why generated videos don't match expectations
- **Learning mode** — Progressive tutorials on effective prompting

**Features:** `src/features/help/ChatBot.tsx`

## Style Transfer

- **Reference matching** — Match prompt parameters to a reference video's style
- **Mood boards** — Create visual mood boards that auto-generate prompt settings
- **Color palette extraction** — Extract color palettes from references for prompt use

**Services:** `colorGradeService.ts`, `imageEditService.ts`

## Audio Intelligence

- **Beat detection** — Detect audio beats for timeline sync points
- **Audio separation** — Separate vocals, instruments, effects from audio tracks
- **Lip sync** — Generate lip-sync data for character animation prompts
- **Sound design** — AI-suggested sound effects based on visual content

**Services:** `beatDetection.ts`, `audioSeparationService.ts`, `lipSyncService.ts`, `sfxService.ts`

## Intelligent Arbitration

- **Conflict resolution** — Resolve conflicting prompt parameters (e.g., "bright" + "noir")
- **Quality gates** — Automatic rejection of prompts likely to produce poor results
- **Optimization** — Suggest parameter tweaks for better generation quality
