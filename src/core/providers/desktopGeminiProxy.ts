import type { GenerateContentResponse, GoogleGenAI } from '@google/genai';
import { ProviderExecutionError } from './types';

type GeminiBridge = NonNullable<NonNullable<Window['electron']>['generateGeminiContent']>;

const collectParts = (
  value: unknown,
  text: string[],
  inputs: { mimeType: string; data: string }[],
): void => {
  if (typeof value === 'string') {
    text.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectParts(item, text, inputs));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') text.push(record.text);
  const inlineData = record.inlineData;
  if (inlineData && typeof inlineData === 'object') {
    const data = inlineData as Record<string, unknown>;
    if (typeof data.mimeType === 'string' && typeof data.data === 'string') {
      inputs.push({ mimeType: data.mimeType, data: data.data });
    }
  }
  if (record.parts) collectParts(record.parts, text, inputs);
  if (record.contents) collectParts(record.contents, text, inputs);
};

const readSystemInstruction = (value: unknown): string | undefined => {
  const text: string[] = [];
  collectParts(value, text, []);
  return text.length ? text.join('\n') : undefined;
};

export const createDesktopGeminiProxy = (bridge: GeminiBridge): GoogleGenAI => {
  const generateContent = async (parameters: unknown): Promise<GenerateContentResponse> => {
    const params = (parameters ?? {}) as Record<string, unknown>;
    const config = (params.config ?? {}) as Record<string, unknown>;
    const text: string[] = [];
    const inputs: { mimeType: string; data: string }[] = [];
    collectParts(params.contents, text, inputs);
    const modalities = Array.isArray(config.responseModalities)
      ? config.responseModalities.map(String)
      : [];
    const operation = modalities.includes('AUDIO')
      ? 'tts'
      : modalities.includes('IMAGE')
        ? 'image'
        : inputs.length
          ? 'review'
          : 'plan';
    const response = await bridge({
      providerModelId: String(params.model ?? ''),
      operation,
      prompt: text.join('\n'),
      inputs,
      systemInstruction: readSystemInstruction(config.systemInstruction),
      config,
    });
    if (response.failure) {
      throw new ProviderExecutionError(
        response.message ?? `Gemini execution failed: ${response.failure}`,
        response.failure,
      );
    }
    const parts = [
      ...(response.text ? [{ text: response.text }] : []),
      ...(response.media ?? []).map((item) => ({ inlineData: item })),
    ];
    return {
      text: response.text,
      candidates: [{ content: { role: 'model', parts } }],
      modelVersion: response.rawModelId,
    } as GenerateContentResponse;
  };

  return { models: { generateContent } } as unknown as GoogleGenAI;
};

export const getDesktopGeminiProxy = (): GoogleGenAI | null => {
  const bridge = typeof window === 'undefined' ? undefined : window.electron?.generateGeminiContent;
  return bridge ? createDesktopGeminiProxy(bridge) : null;
};
