/**
 * CLI Generate Command
 *
 * Generates an AI video prompt using the Gemini API.
 * Supports offline mode (builds prompt locally without API call)
 * and profile-based defaults.
 *
 * @module cli/commands/generate
 * @since v1.8.0
 */

import { GoogleGenAI } from '@google/genai';
import { MODEL_PROFILES, getProfileById } from '../../core/config/modelProfiles';
import {
  generatePromptWithOllama,
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
} from '../../core/services/ollamaProvider';
import { resolveApiKey } from '../utils/apiKey';
import { formatResult, writeOutput, verboseLog, errorLog } from '../utils/output';
import type { GenerateOptions, CLIResult } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a system prompt for the Gemini API based on CLI options.
 * This is a CLI-specific, simplified version of the full prompt builder.
 */
function buildCliPrompt(opts: GenerateOptions): string {
  const parts: string[] = [];

  parts.push(`Create a highly detailed, cinematic prompt for AI video generation.`);
  parts.push(`Target workflow: ${opts.targetModel.toUpperCase()}.`);
  parts.push('');
  parts.push(`User idea: ${opts.idea}`);

  if (opts.artStyle) parts.push(`Art style: ${opts.artStyle}`);
  if (opts.cameraMovement) parts.push(`Camera movement: ${opts.cameraMovement}`);
  if (opts.lightingStyle) parts.push(`Lighting: ${opts.lightingStyle}`);
  if (opts.aspectRatio) parts.push(`Aspect ratio: ${opts.aspectRatio}`);

  parts.push('');
  parts.push('Requirements:');
  parts.push('1. Consolidate into a cohesive paragraph.');
  parts.push('2. Enhance visual descriptions (lighting, texture, camera movement).');

  parts.push('3. Optimize for Google Flow/Veo shot control, continuity, and safe references.');

  parts.push('4. Keep it under 300 words.');
  parts.push('5. Return ONLY the prompt text, no explanations or metadata.');

  return parts.join('\n');
}

/**
 * Build a basic offline prompt (no API call).
 * Combines CLI inputs into a structured prompt string.
 */
function buildOfflinePrompt(opts: GenerateOptions): string {
  const parts: string[] = [];

  parts.push(opts.idea);

  if (opts.artStyle) parts.push(`Style: ${opts.artStyle}.`);
  if (opts.cameraMovement) parts.push(`Camera: ${opts.cameraMovement}.`);
  if (opts.lightingStyle) parts.push(`Lighting: ${opts.lightingStyle}.`);
  if (opts.aspectRatio) parts.push(`Aspect ratio: ${opts.aspectRatio}.`);

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

/**
 * Execute the generate command.
 *
 * In online mode: calls Gemini API to refine the prompt.
 * In offline mode: builds a prompt locally without an API call.
 */
export async function executeGenerate(opts: GenerateOptions): Promise<void> {
  const result: CLIResult = {
    success: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Apply profile defaults if specified
    if (opts.profile) {
      const profile = getProfileById(opts.profile);
      if (!profile) {
        const available = MODEL_PROFILES.map((p) => p.id).join(', ');
        throw new Error(`Unknown profile: "${opts.profile}". Available: ${available}`);
      }
      verboseLog(`Applying profile: ${profile.label}`, opts.verbose);
      // Merge profile defaults into options
      opts.targetModel = profile.defaults.targetModel ?? opts.targetModel;
      opts.aspectRatio = opts.aspectRatio ?? profile.defaults.aspectRatio;
      opts.artStyle = opts.artStyle ?? profile.defaults.artStyle;
      opts.cameraMovement = opts.cameraMovement ?? profile.defaults.cameraMovement;
      opts.model = opts.model ?? profile.defaults.model;
      result.profileId = profile.id;
    }

    if (opts.offline) {
      // ── Offline mode ──────────────────────────────────────────────
      verboseLog('Offline mode: building prompt locally', opts.verbose);
      result.prompt = buildOfflinePrompt(opts);
      result.success = true;
    } else if (opts.provider === 'ollama') {
      // ── Ollama (local LLM) mode ───────────────────────────────────
      verboseLog(`Ollama mode: ${OLLAMA_BASE_URL} model=${OLLAMA_MODEL}`, opts.verbose);
      const prompt = buildCliPrompt(opts);
      const systemPrefix =
        'You are an expert prompt engineer for Google Flow and Veo video workflows.\n\n';
      result.prompt = await generatePromptWithOllama(systemPrefix + prompt);
      result.success = true;
    } else {
      // ── Online mode (Gemini API) ──────────────────────────────────
      const apiKey = resolveApiKey(opts.apiKey);
      verboseLog('Resolved API key', opts.verbose);

      const ai = new GoogleGenAI({ apiKey });
      const modelName = opts.model ?? 'gemini-3.1-pro-preview';
      verboseLog(`Using model: ${modelName}`, opts.verbose);

      const prompt = buildCliPrompt(opts);

      const response = await ai.models.generateContent({
        model: modelName,
        contents: `You are an expert prompt engineer for Google Flow and Veo video workflows.\n\n${prompt}`,
      });

      result.prompt = response.text ?? '';
      result.groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? undefined;
      result.success = true;
    }

    // Write output
    const formatted = formatResult(result, opts.format);
    writeOutput(formatted, opts.output);

    if (opts.output) {
      verboseLog(`Output written to: ${opts.output}`, opts.verbose);
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    result.success = false;

    const formatted = formatResult(result, opts.format);

    if (opts.output) {
      writeOutput(formatted, opts.output);
    } else {
      errorLog(result.error);
    }

    process.exitCode = 1;
  }
}
