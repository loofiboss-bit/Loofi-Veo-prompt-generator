/**
 * Facade re-export – backward-compatible shim.
 *
 * All functions that formerly lived in this 1500-line monolith have been
 * refactored into four domain modules under `./gemini/`:
 *
 *   geminiPromptService   – prompt gen, variations, suggestions, refinement
 *   geminiVisionService   – image gen/edit, video analysis, tagging
 *   geminiAudioService    – speech, SFX, transcription, Suno
 *   geminiProductionService – color grading, blocking, script breakdown, chat
 *
 * Existing consumers that `import * as geminiService from '@core/services/geminiService'`
 * will continue to work without changes because this file re-exports the full
 * public surface from the barrel index.
 */
export * from './gemini';
