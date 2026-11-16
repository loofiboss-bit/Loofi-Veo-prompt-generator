'use strict';

const crypto = require('crypto');
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const PROVIDER_MODELS = {
  'veo-3.1-quality': 'veo-3.1-generate-preview',
  'veo-3.1-fast': 'veo-3.1-fast-generate-preview',
  'veo-3.1-lite': 'veo-3.1-lite-generate-preview',
};
const VERTEX_VEO_MODELS = Object.freeze({
  'veo-3.1-quality': 'veo-3.1-generate-001',
  'veo-3.1-fast': 'veo-3.1-fast-generate-001',
  'veo-3.1-lite': 'veo-3.1-lite-generate-001',
  'veo-3.1-generate-001': 'veo-3.1-generate-001',
  'veo-3.1-fast-generate-001': 'veo-3.1-fast-generate-001',
  'veo-3.1-lite-generate-001': 'veo-3.1-lite-generate-001',
});
const VERTEX_DIRECT_VEO_MODELS = new Set([
  'veo-3.1-generate-001',
  'veo-3.1-fast-generate-001',
  'veo-3.1-lite-generate-001',
]);
const DURABLE_OMNI_MODELS = new Set(['gemini-omni-1.2-flash']);
const SAFE_PROJECT_ID = /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/;
const SAFE_LOCATION = /^[a-z]+-[a-z]+\d$/;

function isOmniTask(task) {
  return task?.jobKind !== 'music' && DURABLE_OMNI_MODELS.has(task?.request?.modelId);
}

function isVertexVeoTask(task) {
  if (task?.jobKind === 'music' || isOmniTask(task)) return false;
  const modelId = task?.request?.modelId;
  if (!modelId) return false;
  if (VERTEX_DIRECT_VEO_MODELS.has(modelId)) return true;
  if (
    task?.provider === 'vertex-ai' ||
    task?.request?.provider === 'vertex-ai' ||
    task?.providerProfile?.provider === 'vertex-ai'
  ) {
    return Object.hasOwn(VERTEX_VEO_MODELS, modelId);
  }
  return false;
}

function resolveVertexTarget(task) {
  const profile =
    task?.providerProfile || task?.request?.vertexProfile || task?.vertexProfile || {};
  const projectId = String(profile.projectId || '');
  const location = String(profile.location || '');
  if (!SAFE_PROJECT_ID.test(projectId)) {
    throw new Error('Invalid Vertex AI project ID.');
  }
  if (location !== 'global' && !SAFE_LOCATION.test(location)) {
    throw new Error('Invalid Vertex AI location.');
  }
  const host =
    location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
  return { projectId, location, host };
}

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

function buildOmniSubmission(task) {
  const request = task.request || {};
  const inputs = task.executionInputs || {};
  const promptText = request.prompt || task.prompt || '';
  const imageItems = [];
  const firstFrame = inputs.firstFrame || task.inputImage;
  if (firstFrame?.data) {
    imageItems.push({ type: 'image', mime_type: firstFrame.mimeType, data: firstFrame.data });
  }
  if (inputs.lastFrame?.data) {
    imageItems.push({
      type: 'image',
      mime_type: inputs.lastFrame.mimeType,
      data: inputs.lastFrame.data,
    });
  }
  for (const image of inputs.referenceImages || []) {
    if (image?.data) {
      imageItems.push({ type: 'image', mime_type: image.mimeType, data: image.data });
    }
  }
  const input = imageItems.length
    ? [{ type: 'text', text: promptText }, ...imageItems]
    : promptText;
  const durationSeconds = request.durationSeconds || task.settings?.durationSeconds || 8;
  const resolution = request.resolution || task.settings?.resolution || '720p';
  const aspectRatio = request.aspectRatio || task.settings?.aspectRatio || '16:9';
  return {
    model: request.modelId,
    input,
    ...(request.interactionId ? { previous_interaction_id: request.interactionId } : {}),
    background: true,
    generation_config: {
      response_format: {
        type: 'video',
        duration: `${durationSeconds}s`,
        resolution,
        ...(request.mode !== 'extension' && aspectRatio ? { aspect_ratio: aspectRatio } : {}),
      },
    },
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
  const omni = isOmniTask(task);
  const vertex = isVertexVeoTask(task);
  const modelId = task.request?.modelId;
  if (music) {
    return Object.freeze({
      version: 2,
      modelId,
      operation: 'interactions',
      url: `${API_BASE}/interactions`,
      body: JSON.stringify(buildMusicSubmission(task)),
    });
  }
  if (omni) {
    return Object.freeze({
      version: 2,
      modelId,
      operation: 'interactions',
      url: `${API_BASE}/interactions`,
      body: JSON.stringify(buildOmniSubmission(task)),
    });
  }
  if (vertex) {
    const vertexModel = VERTEX_VEO_MODELS[modelId] || modelId;
    const { projectId, location, host } = resolveVertexTarget(task);
    return Object.freeze({
      version: 2,
      modelId,
      operation: 'predictLongRunning',
      url: `https://${host}/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(vertexModel)}:predictLongRunning`,
      body: JSON.stringify(buildSubmission(task)),
    });
  }
  const providerModel = PROVIDER_MODELS[modelId] || modelId;
  return Object.freeze({
    version: 2,
    modelId,
    operation: 'predictLongRunning',
    url: `${API_BASE}/models/${encodeURIComponent(providerModel)}:predictLongRunning`,
    body: JSON.stringify(buildSubmission(task)),
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

/** Do not block envelope readback, operation polling or media recovery for historical jobs. */
function assertNewSubmissionAvailable(task, now = Date.now()) {
  const modelId = task.request?.modelId;
  if (task.jobKind === 'music' || isOmniTask(task) || isVertexVeoTask(task)) {
    return;
  }
  if (
    (Object.hasOwn(PROVIDER_MODELS, modelId) || Object.values(PROVIDER_MODELS).includes(modelId)) &&
    now >= Date.UTC(2026, 9, 22)
  ) {
    throw new Error(
      'Veo 3.1 Preview in Gemini API shut down on 2026-10-22. Choose an active target; this job was not submitted.',
    );
  }
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
  VERTEX_VEO_MODELS,
  DURABLE_OMNI_MODELS,
  isOmniTask,
  isVertexVeoTask,
  resolveVertexTarget,
  buildSubmission,
  buildMusicSubmission,
  buildOmniSubmission,
  createPaidSubmission,
  computePaidSubmissionHash,
  requireApprovedSubmission,
  assertNewSubmissionAvailable,
};
