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
  if (!SAFE_MODEL_ID.test(String(input.providerModelId || ''))) throw new Error('Invalid model ID.');
  if (!ALLOWED_OPERATIONS.has(input.operation)) throw new Error('Unsupported provider operation.');
  if (typeof input.prompt !== 'string' || input.prompt.length > 200_000)
    throw new Error('Invalid provider prompt.');
  if (input.inputs && (!Array.isArray(input.inputs) || input.inputs.length > 16))
    throw new Error('Invalid provider inputs.');
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
      message: body?.error?.message || body?.message || `Provider returned HTTP ${response.status}.`,
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
  if (!apiKey) return { failure: 'authentication', message: 'Gemini API key is not configured.', rawModelId: '' };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.providerModelId)}:generateContent`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: geminiContents(input) }),
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

module.exports = {
  classifyHttpFailure,
  executeGemini,
  executeOllama,
  resolveOllamaEndpoint,
  validateProviderInput,
};
