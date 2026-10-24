'use strict';

const crypto = require('crypto');
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const PROVIDER_MODELS = {
  'veo-3.1-quality': 'veo-3.1-generate-preview',
  'veo-3.1-fast': 'veo-3.1-fast-generate-preview',
  'veo-3.1-lite': 'veo-3.1-lite-generate-preview',
};

function buildMusicSubmission(task) {
  const { request } = task;
  const promptParts = [request.prompt];
  if (request.lyrics?.trim()) promptParts.push(`Custom lyrics:\n${request.lyrics.trim()}`);
  if (request.structure?.trim()) promptParts.push(`Song structure:\n${request.structure.trim()}`);
  const prompt = promptParts.join('\n\n');
  const input = request.images.length
    ? [
        { type: 'text', text: prompt },
        ...request.images.map((image) => ({
          type: 'image',
          mime_type: image.mimeType,
          data: image.data,
        })),
      ]
    : prompt;
  return {
    model: request.modelId,
    input,
    ...(request.responseFormat === 'wav' ? { response_format: { type: 'audio' } } : {}),
  };
}

function buildSubmission(task) {
  const request = task.request;
  const inputs = task.executionInputs || {};
  const instance = { prompt: request?.prompt || task.prompt };
  const firstFrame = inputs.firstFrame || task.inputImage;
  if (firstFrame) {
    instance.image = { bytesBase64Encoded: firstFrame.data, mimeType: firstFrame.mimeType };
  }
  if (request?.mode === 'interpolation' && inputs.lastFrame) {
    instance.lastFrame = {
      bytesBase64Encoded: inputs.lastFrame.data,
      mimeType: inputs.lastFrame.mimeType,
    };
  }
  // Continuity compilation can attach identity references to an otherwise
  // text-to-video shot. Never drop those selected files just because the UI
  // mode label is not `reference-images`; capability validation already guards
  // incompatible frame/extension combinations at the paid boundary.
  if (inputs.referenceImages?.length) {
    instance.referenceImages = inputs.referenceImages.map((image) => ({
      image: { bytesBase64Encoded: image.data, mimeType: image.mimeType },
      referenceType: 'asset',
    }));
  }
  if (request?.mode === 'extension') {
    const uri = inputs.extensionVideoUri || request.extensionArtifact?.mediaUri;
    if (uri) instance.video = { uri };
  }
  return {
    instances: [instance],
    parameters: {
      sampleCount: 1,
      resolution: request?.resolution || task.settings.resolution,
      aspectRatio: request?.aspectRatio || task.settings.aspectRatio,
      durationSeconds: request?.durationSeconds || task.settings.durationSeconds || 8,
      negativePrompt: request?.negativePrompt || undefined,
      seed: request?.seed,
    },
  };
}

function createPaidSubmission(task) {
  const music = task.jobKind === 'music';
  const modelId = task.request?.modelId;
  const providerModel = PROVIDER_MODELS[modelId] || modelId;
  return Object.freeze({
    version: 2,
    modelId,
    operation: music ? 'interactions' : 'predictLongRunning',
    url: music
      ? `${API_BASE}/interactions`
      : `${API_BASE}/models/${encodeURIComponent(providerModel)}:predictLongRunning`,
    body: JSON.stringify(music ? buildMusicSubmission(task) : buildSubmission(task)),
  });
}

function computePaidSubmissionHash(submission) {
  // Fixed envelope order, exact serialized body: no prompt normalization or omitted media bytes.
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify([
        submission.version,
        submission.modelId,
        submission.operation,
        submission.url,
        submission.body,
      ]),
      'utf8',
    )
    .digest('hex');
}

function requireApprovedSubmission(task) {
  if (task.costApproval?.hashVersion !== 2 || !task.costApproval.payloadHash) {
    throw new Error('A new native cost approval is required for this unsent job.');
  }
  const expected = createPaidSubmission(task);
  const snapshot = task.approvedSubmission;
  if (
    !snapshot ||
    snapshot.version !== expected.version ||
    snapshot.modelId !== expected.modelId ||
    snapshot.operation !== expected.operation ||
    snapshot.url !== expected.url ||
    snapshot.body !== expected.body ||
    computePaidSubmissionHash(expected) !== task.costApproval.payloadHash
  ) {
    throw new Error('Payload hash mismatch: the paid submission changed after cost approval.');
  }
  // Return a separate immutable envelope so callbacks cannot change the bytes about to be sent.
  return Object.freeze({ ...expected });
}

module.exports = {
  API_BASE,
  PROVIDER_MODELS,
  buildSubmission,
  buildMusicSubmission,
  createPaidSubmission,
  computePaidSubmissionHash,
  requireApprovedSubmission,
};
