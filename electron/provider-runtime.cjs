'use strict';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const ALLOWED_OPERATIONS = new Set(['plan', 'review', 'image', 'tts']);
const SAFE_MODEL_ID = /^[a-zA-Z0-9._:-]{1,160}$/;

function classifyHttpFailure(status, body = '') {
  const text = String(body).toLowerCase();
  if (status === 401 || status === 403) return 'authentication';
  if (status === 429) return /quota|billing/.test(text) ? 'quota' : 'rate-limit';
  if (status === 404) return 'model-unavailable';
  if (status === 400) return /safety|blocked|harm/.test(text) ? 'safety' : 'invalid-capability';
  if (status >= 500) return 'provider-incident';
  return 'unknown';
}

function validateProviderInput(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid provider request.');
  if (!['gemini-api', 'vertex-ai', 'ollama'].includes(input.provider))
    throw new Error('Unsupported provider.');
  if (!SAFE_MODEL_ID.test(String(input.providerModelId || '')))
    throw new Error('Invalid model ID.');
  if (!ALLOWED_OPERATIONS.has(input.operation)) throw new Error('Unsupported provider operation.');
  if (typeof input.prompt !== 'string' || input.prompt.length > 200_000)
    throw new Error('Invalid provider prompt.');
  if (input.inputs && (!Array.isArray(input.inputs) || input.inputs.length > 16))
    throw new Error('Invalid provider inputs.');
  for (const item of input.inputs || []) {
    if (!item || typeof item.mimeType !== 'string' || !/^[\w.+-]+\/[\w.+-]+$/.test(item.mimeType))
      throw new Error('Invalid provider input MIME type.');
    if (typeof item.data !== 'string' || item.data.length > 30_000_000)
      throw new Error('Provider input is too large.');
  }
  return input;
}

function geminiContents(input) {
  return [
    {
      role: 'user',
      parts: [
        { text: input.prompt },
        ...(input.inputs || []).map((item) => ({
          inlineData: { mimeType: item.mimeType, data: item.data },
        })),
      ],
    },
  ];
}

async function readResponse(response) {
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }
  if (!response.ok) {
    return {
      failure: classifyHttpFailure(response.status, text),
      message:
        body?.error?.message || body?.message || `Provider returned HTTP ${response.status}.`,
      rawModelId: '',
    };
  }
  return body;
}

function normalizeGenerateContent(body, modelId) {
  const parts = body?.candidates?.[0]?.content?.parts || [];
  return {
    text: parts
      .filter((part) => typeof part.text === 'string')
      .map((part) => part.text)
      .join(''),
    media: parts
      .filter((part) => part.inlineData?.data)
      .map((part) => ({ mimeType: part.inlineData.mimeType, data: part.inlineData.data })),
    rawModelId: body.modelVersion || modelId,
  };
}

async function executeGemini(input, apiKey, fetchImpl = fetch) {
  if (!apiKey)
    return {
      failure: 'authentication',
      message: 'Gemini API key is not configured.',
      rawModelId: '',
    };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.providerModelId)}:generateContent`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: geminiContents(input),
      systemInstruction: input.systemInstruction
        ? { parts: [{ text: input.systemInstruction }] }
        : undefined,
      generationConfig: input.config,
    }),
  });
  const body = await readResponse(response);
  return body.failure ? body : normalizeGenerateContent(body, input.providerModelId);
}

const SAFE_PROJECT_ID = /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/;
const SAFE_LOCATION = /^[a-z]+-[a-z]+\d$/;

function validateVertexProfile(profile) {
  const projectId = String(profile?.projectId || '');
  const location = String(profile?.location || '');
  if (!SAFE_PROJECT_ID.test(projectId)) throw new Error('Invalid Vertex AI project ID.');
  if (location !== 'global' && !SAFE_LOCATION.test(location))
    throw new Error('Invalid Vertex AI location.');
  return { projectId, location };
}

async function executeVertex(input, profile, auth, fetchImpl = fetch) {
  const { projectId, location } = validateVertexProfile(profile);
  if (!auth?.getAccessToken)
    return {
      failure: 'authentication',
      message: 'Vertex AI ADC/OAuth is unavailable.',
      rawModelId: '',
    };
  let token;
  try {
    const access = await auth.getAccessToken();
    token = typeof access === 'string' ? access : access?.token;
  } catch (error) {
    return {
      failure: 'authentication',
      message: error instanceof Error ? error.message : 'Vertex AI authentication failed.',
      rawModelId: '',
    };
  }
  if (!token)
    return {
      failure: 'authentication',
      message: 'Vertex AI ADC/OAuth returned no token.',
      rawModelId: '',
    };
  const host =
    location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(input.providerModelId)}:generateContent`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      contents: geminiContents(input),
      systemInstruction: input.systemInstruction
        ? { parts: [{ text: input.systemInstruction }] }
        : undefined,
      generationConfig: input.config,
    }),
  });
  const body = await readResponse(response);
  return body.failure ? body : normalizeGenerateContent(body, input.providerModelId);
}

function resolveOllamaEndpoint(endpoint) {
  const url = new URL(endpoint || 'http://127.0.0.1:11434');
  if (url.protocol !== 'http:' || !LOOPBACK_HOSTS.has(url.hostname))
    throw new Error('Ollama endpoint must be a loopback HTTP address.');
  return url.origin;
}

async function executeOllama(input, endpoint, fetchImpl = fetch) {
  const origin = resolveOllamaEndpoint(endpoint);
  const response = await fetchImpl(`${origin}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: input.providerModelId, prompt: input.prompt, stream: false }),
  });
  const body = await readResponse(response);
  return body.failure
    ? body
    : { text: body.response || '', rawModelId: body.model || input.providerModelId };
}

async function executeInteraction(input, client) {
  if (!client?.interactions?.create)
    return {
      failure: 'authentication',
      message: 'Gemini Interactions client is unavailable.',
      rawModelId: '',
    };
  try {
    const parts = [
      { type: 'text', text: input.prompt },
      ...(input.inputs || []).map((item) => ({
        type: item.mimeType.startsWith('image/')
          ? 'image'
          : item.mimeType.startsWith('video/')
            ? 'video'
            : 'audio',
        data: item.data,
        mime_type: item.mimeType,
      })),
    ];
    const interaction = await client.interactions.create({
      model: input.providerModelId,
      input: parts,
      store: true,
      background: false,
      previous_interaction_id: input.interactionId || undefined,
    });
    const media = [interaction.output_image, interaction.output_audio]
      .filter(Boolean)
      .map((item) => ({ mimeType: item.mime_type || item.mimeType, data: item.data }));
    return {
      text: interaction.output_text || '',
      media,
      interactionId: interaction.id,
      rawModelId: interaction.model || input.providerModelId,
    };
  } catch (error) {
    return {
      failure: classifyHttpFailure(Number(error?.status || error?.statusCode || 0), error?.message),
      message: error instanceof Error ? error.message : 'Gemini interaction failed.',
      rawModelId: '',
    };
  }
}

module.exports = {
  classifyHttpFailure,
  executeGemini,
  executeOllama,
  executeInteraction,
  executeVertex,
  resolveOllamaEndpoint,
  validateVertexProfile,
  validateProviderInput,
};
