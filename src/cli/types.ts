/**
 * CLI-specific type definitions
 *
 * Defines interfaces for CLI commands, options, and output formatting.
 * Kept separate from browser types to avoid coupling.
 *
 * @module cli/types
 * @since v1.8.0
 */

// ---------------------------------------------------------------------------
// Command Option Types
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  /** The creative idea / prompt input */
  idea: string;
  /** Profile ID to apply (e.g., 'veo-cinematic', 'sora-social') */
  profile?: string;
  /** Target AI model: 'veo', 'sora', or 'local' */
  targetModel: 'veo' | 'sora' | 'local';
  /** Gemini model name override */
  model?: string;
  /** Aspect ratio override (e.g., '16:9', '9:16', '1:1') */
  aspectRatio?: string;
  /** Art style override */
  artStyle?: string;
  /** Camera movement override */
  cameraMovement?: string;
  /** Lighting style override */
  lightingStyle?: string;
  /** Output file path (stdout if omitted) */
  output?: string;
  /** Output format */
  format: OutputFormat;
  /** Gemini API key */
  apiKey?: string;
  /** Use offline mode (buildGeminiPrompt only, no API call) */
  offline: boolean;
  /** Enable verbose logging */
  verbose: boolean;
}

export interface ExportOptions {
  /** Input file path (stdin if omitted) */
  input?: string;
  /** Output file path (stdout if omitted) */
  output?: string;
  /** Export format */
  format: OutputFormat;
  /** Enable verbose logging */
  verbose: boolean;
}

// ---------------------------------------------------------------------------
// Output Types
// ---------------------------------------------------------------------------

export type OutputFormat = 'json' | 'txt' | 'markdown';

export interface CLIResult {
  /** Whether the command succeeded */
  success: boolean;
  /** Generated prompt text */
  prompt?: string;
  /** Any grounding metadata */
  groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
  /** Error message if failed */
  error?: string;
  /** Profile used */
  profileId?: string;
  /** Timestamp of generation */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Help & Version
// ---------------------------------------------------------------------------

export interface CLICommand {
  name: string;
  description: string;
  usage: string;
  options: CLIOption[];
}

export interface CLIOption {
  flag: string;
  alias?: string;
  description: string;
  default?: string;
  required?: boolean;
}
