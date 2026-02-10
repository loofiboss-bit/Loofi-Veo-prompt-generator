import * as geminiService from '@core/services/geminiService';

/**
 * Type-safe wrapper for calling geminiService methods dynamically.
 * Preserves compile-time type checking for method names and arguments.
 * 
 * @param method - The geminiService method name (type-checked against available methods)
 * @param args - Method arguments (type-checked against the selected method's signature)
 * @returns Promise with the method's return type
 * 
 * @example
 * const result = await callGemini('generateVeoPrompt', state, userCoords);
 */
export const callGemini = async <M extends keyof typeof geminiService>(
  method: M,
  ...args: Parameters<(typeof geminiService)[M]>
): Promise<ReturnType<(typeof geminiService)[M]>> => {
  return (
    geminiService[method] as (
      ...a: Parameters<(typeof geminiService)[M]>
    ) => ReturnType<(typeof geminiService)[M]>
  )(...args);
};
