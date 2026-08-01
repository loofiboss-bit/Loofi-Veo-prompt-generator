import type { GenerateContentResponse, GoogleGenAI } from '@google/genai';
import { getModel, type ImageResolution } from '@core/models/catalog';
import { ElectronBridgeAdapter, type PrivilegedProviderBridge } from './electronBridgeAdapter';

type GeminiBridge = Pick<
  PrivilegedProviderBridge,
  'approveProviderCost' | 'executeProvider' | 'testProviderConnection'
>;

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
  if (record.functionResponse) text.push(JSON.stringify(record.functionResponse));
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
    const model = getModel(String(params.model ?? ''));
    if (!model) throw new Error(`No executable model catalog entry exists for ${params.model}.`);
    const estimatedInputTokens = Math.max(
      1,
      Math.ceil(
        (text.join('\n').length + inputs.reduce((sum, input) => sum + input.data.length, 0)) / 3,
      ),
    );
    const configuredOutputTokens = Number(config.maxOutputTokens);
    const imageConfig =
      config.imageConfig && typeof config.imageConfig === 'object'
        ? (config.imageConfig as Record<string, unknown>)
        : {};
    const requestedImageResolution = String(imageConfig.imageSize ?? '1k').toLowerCase();
    const imageResolution = (
      ['0.5k', '1k', '2k', '4k'].includes(requestedImageResolution)
        ? requestedImageResolution
        : '1k'
    ) as ImageResolution;
    const costContext = {
      estimatedInputTokens,
      ...((operation === 'plan' || operation === 'review') && {
        estimatedOutputTokens:
          Number.isFinite(configuredOutputTokens) && configuredOutputTokens > 0
            ? configuredOutputTokens
            : 8_192,
      }),
      ...(operation === 'image' && {
        imageCount: 1,
        imageResolution,
        ...(Number.isFinite(configuredOutputTokens) && configuredOutputTokens > 0
          ? { estimatedOutputTokens: configuredOutputTokens }
          : {}),
      }),
      ...(operation === 'tts' && { audioOutputSeconds: 600 }),
    };
    const adapter = new ElectronBridgeAdapter('gemini-api', bridge);
    const response = await adapter.execute({
      model,
      operation,
      prompt: text.join('\n'),
      inputs,
      systemInstruction: readSystemInstruction(config.systemInstruction),
      config,
      costContext,
    });
    const parts = [
      ...(response.text ? [{ text: response.text }] : []),
      ...(response.media ?? []).map((item) => ({ inlineData: item })),
      ...(response.functionCalls ?? []).map((item) => ({ functionCall: item })),
    ];
    return {
      text: response.text,
      functionCalls: response.functionCalls,
      candidates: [{ content: { role: 'model', parts } }],
      modelVersion: response.rawModelId,
    } as GenerateContentResponse;
  };

  const chats = {
    create: (parameters: unknown) => {
      const params = (parameters ?? {}) as Record<string, unknown>;
      const transcript: string[] = [];
      return {
        sendMessage: async (input: unknown) => {
          const record = (input ?? {}) as Record<string, unknown>;
          const message =
            typeof record.message === 'string' ? record.message : JSON.stringify(record.message);
          transcript.push(`User: ${message}`);
          const response = await generateContent({
            model: params.model,
            contents: transcript.join('\n\n'),
            config: params.config,
          });
          if (response.text) transcript.push(`Assistant: ${response.text}`);
          return response;
        },
      };
    },
  };

  return { models: { generateContent }, chats } as unknown as GoogleGenAI;
};

export const getDesktopGeminiProxy = (): GoogleGenAI | null => {
  const electron = typeof window === 'undefined' ? undefined : window.electron;
  if (
    !electron?.approveProviderCost ||
    !electron.executeProvider ||
    !electron.testProviderConnection
  ) {
    return null;
  }
  return createDesktopGeminiProxy({
    approveProviderCost: electron.approveProviderCost,
    executeProvider: electron.executeProvider,
    testProviderConnection: electron.testProviderConnection,
  });
};
