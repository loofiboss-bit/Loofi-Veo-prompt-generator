import { PromptState } from '@core/types';

export interface VideoModelAdapter {
  /**
   * Constructs the final prompt string to be sent to the LLM/Image Generator.
   * @param state The current state of the prompt form.
   * @param variables Global variables for interpolation (e.g. {{HERO}} -> "John").
   */
  buildPrompt(state: PromptState, variables: Record<string, string>): string;

  /**
   * Returns model-specific enhancement keywords for a specific parameter.
   * @param key The field name (e.g., 'artStyle', 'lighting').
   * @param value The selected value.
   */
  getEnhancements(key: keyof PromptState, value: string): string;

  /**
   * Checks for model-specific constraints (e.g., Sora might support longer prompts than Veo).
   * @returns Array of warning strings. Empty if valid.
   */
  validateConstraints(state: PromptState): string[];
}
