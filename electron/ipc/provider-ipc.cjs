'use strict';

const { createHash, randomUUID } = require('crypto');
const {
  executeGemini,
  executeInteraction,
  executeOllama,
  executeVertex,
  validateProviderInput,
} = require('../provider-runtime.cjs');
const { validateProviderCostApproval } = require('../paid-job-pricing.cjs');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function providerRequestFingerprint(input) {
  const request = validateProviderInput(input);
  const profile = input?.profile;
  const approvalPayload = {
    provider: request.provider,
    providerModelId: request.providerModelId,
    operation: request.operation,
    prompt: request.prompt,
    inputs: request.inputs || [],
    interactionId: request.interactionId || null,
    systemInstruction: request.systemInstruction || null,
    config: request.config || null,
    profile:
      request.provider === 'vertex-ai'
        ? {
            projectId: profile?.projectId || null,
            location: profile?.location || null,
          }
        : request.provider === 'ollama'
          ? { endpoint: input?.endpoint || profile?.endpoint || null }
          : null,
  };
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(approvalPayload)))
    .digest('hex');
}

function registerProviderIpc({
  ipcMain,
  keytar,
  keytarService,
  dialog,
  getMainWindow,
  vertexAuth,
  createGeminiClient = async (apiKey) => {
    const { GoogleGenAI } = await import('@google/genai');
    return new GoogleGenAI({ apiKey });
  },
}) {
  const approvals = new Map();

  function consumeApproval(input) {
    if (input?.provider === 'ollama') return null;
    const token = typeof input?.approvalToken === 'string' ? input.approvalToken : '';
    const approval = approvals.get(token);
    approvals.delete(token);
    if (
      !approval ||
      approval.expiresAt < Date.now() ||
      approval.provider !== input.provider ||
      approval.providerModelId !== input.providerModelId ||
      approval.operation !== input.operation ||
      approval.requestFingerprint !== providerRequestFingerprint(input)
    ) {
      throw new Error('Missing, expired, or mismatched one-time provider cost approval.');
    }
    return approval;
  }

  ipcMain.handle('provider-test-connection', async (_, input) => {
    const profile = input?.profile;
    const providerModelId = input?.providerModelId || 'gemini-3.5-flash';
    try {
      if (profile?.provider === 'gemini-api') {
        const configured = Boolean(await keytar.getPassword(keytarService, 'gemini-api-key'));
        return {
          ok: configured,
          provider: 'gemini-api',
          model: providerModelId,
          failure: configured ? undefined : 'authentication',
          message: configured
            ? 'Credential is present. No paid generation canary was run.'
            : 'Gemini API key is not configured.',
          hints: configured ? [] : ['Configure credentials and retry.'],
        };
      }
      if (profile?.provider === 'vertex-ai') {
        await vertexAuth.getClient();
        return {
          ok: true,
          provider: 'vertex-ai',
          model: providerModelId,
          message: 'Google credentials are available. No paid generation canary was run.',
          hints: [],
        };
      }
      const request = validateProviderInput({
        provider: profile?.provider,
        providerModelId,
        operation: 'plan',
        prompt: 'Reply with OK.',
      });
      const result = await executeOllama(request, profile?.endpoint);
      return result.failure
        ? {
            ok: false,
            provider: request.provider,
            failure: result.failure,
            message: result.message,
            hints: [],
          }
        : {
            ok: true,
            provider: request.provider,
            model: result.rawModelId,
            message: 'Connection successful.',
            hints: [],
          };
    } catch (error) {
      return {
        ok: false,
        provider: profile?.provider || 'gemini-api',
        failure: 'unknown',
        message: error instanceof Error ? error.message : 'Connection test failed.',
        hints: [],
      };
    }
  });

  ipcMain.handle('provider-cost-approve', async (_, input) => {
    const request = validateProviderInput(input);
    if (request.provider === 'ollama') return `local:${randomUUID()}`;
    const maximumChargeUsd = validateProviderCostApproval(input);
    const result = await dialog.showMessageBox(getMainWindow(), {
      type: 'warning',
      buttons: ['Approve maximum', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
      title: 'Approve provider charge',
      message: `Approve a maximum charge of $${maximumChargeUsd.toFixed(6)} USD?`,
      detail: `${request.providerModelId} · ${request.operation}\nUpper bound from ${input.costApproval.sourceUrl}\nVerified ${input.costApproval.verifiedDate}. This approval is single-use.`,
    });
    if (result.response !== 0) throw new Error('Provider execution was not approved.');
    const token = randomUUID();
    approvals.set(token, {
      provider: request.provider,
      providerModelId: request.providerModelId,
      operation: request.operation,
      costApproval: input.costApproval,
      requestFingerprint: providerRequestFingerprint(input),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return token;
  });

  ipcMain.handle('provider-execute', async (_, input) => {
    try {
      const request = validateProviderInput(input);
      const approval = consumeApproval(input);
      if (approval) {
        validateProviderCostApproval({ ...input, costApproval: approval.costApproval });
        request.config = {
          ...request.config,
          maxOutputTokens: approval.costApproval.calculationInputs.estimatedOutputTokens,
        };
      }
      if (request.provider === 'gemini-api') {
        return executeGemini(request, await keytar.getPassword(keytarService, 'gemini-api-key'));
      }
      if (request.provider === 'ollama') return executeOllama(request, input.endpoint);
      return executeVertex(request, input.profile, vertexAuth);
    } catch (error) {
      return {
        failure: 'unknown',
        message: error instanceof Error ? error.message : 'Provider execution failed.',
        rawModelId: '',
      };
    }
  });

  ipcMain.handle('provider-interaction', async (_, input) => {
    try {
      const request = validateProviderInput(input);
      if (
        request.provider !== 'gemini-api' ||
        !['video', 'video-edit'].includes(request.operation)
      ) {
        throw new Error('Unsupported provider interaction request.');
      }
      const approval = consumeApproval(input);
      validateProviderCostApproval({ ...input, costApproval: approval.costApproval });
      const apiKey = await keytar.getPassword(keytarService, 'gemini-api-key');
      if (!apiKey) {
        return {
          failure: 'authentication',
          message: 'Gemini API key is not configured.',
          rawModelId: '',
        };
      }
      return executeInteraction(request, await createGeminiClient(apiKey));
    } catch (error) {
      return {
        failure: 'unknown',
        message: error instanceof Error ? error.message : 'Provider interaction failed.',
        rawModelId: '',
      };
    }
  });
}

module.exports = { providerRequestFingerprint, registerProviderIpc };
