import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createPaidSubmission,
  computePaidSubmissionHash,
  requireApprovedSubmission,
} = require('./paid-job-submission.cjs');
const { validateCostApproval } = require('./paid-job-pricing.cjs');

const image = (data = 'aW1hZ2U=') => ({ data, mimeType: 'image/png' });
const videoTask = () => ({
  id: 'video',
  prompt: 'A landscape.',
  request: {
    modelId: 'veo-3.1-fast',
    mode: 'interpolation',
    prompt: 'A landscape.  ',
    negativePrompt: 'rain',
    aspectRatio: '16:9',
    resolution: '720p',
    durationSeconds: 8,
    seed: 0,
    referenceAssetIds: ['a', 'b'],
    firstFrameAssetId: 'first',
    lastFrameAssetId: 'last',
  },
  executionInputs: {
    firstFrame: image(),
    lastFrame: image('bGFzdA=='),
    referenceImages: [image(), image('b3RoZXI=')],
  },
  costApproval: {
    modelId: 'veo-3.1-fast',
    maximumChargeUsd: 1,
    currency: 'USD',
    confidence: 'upper-bound',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    verifiedDate: '2026-08-01',
  },
});
const musicTask = () => ({
  jobKind: 'music',
  prompt: 'An intimate song.',
  request: {
    modelId: 'lyria-3-pro-preview',
    prompt: 'An intimate song.',
    lyrics: '[Verse] Stay',
    structure: 'Verse, chorus',
    responseFormat: 'mp3',
    images: [image(), image('b3RoZXI=')],
  },
});

function approve(task) {
  task.approvedSubmission = createPaidSubmission(task);
  task.costApproval = {
    ...task.costApproval,
    hashVersion: 2,
    payloadHash: computePaidSubmissionHash(task.approvedSubmission),
  };
  return task;
}

for (const [label, mutate] of [
  [
    'prompt whitespace',
    (task) => {
      task.request.prompt = task.request.prompt.trim();
    },
  ],
  [
    'model endpoint',
    (task) => {
      task.request.modelId = 'veo-3.1-quality';
    },
  ],
  [
    'duration',
    (task) => {
      task.request.durationSeconds = 4;
    },
  ],
  [
    'resolution',
    (task) => {
      task.request.resolution = '1080p';
    },
  ],
  [
    'aspect ratio',
    (task) => {
      task.request.aspectRatio = '9:16';
    },
  ],
  [
    'negative prompt',
    (task) => {
      task.request.negativePrompt = 'fog';
    },
  ],
  [
    'seed',
    (task) => {
      task.request.seed = 1;
    },
  ],
  [
    'first frame bytes',
    (task) => {
      task.executionInputs.firstFrame.data = 'bmV3';
    },
  ],
  [
    'first frame MIME',
    (task) => {
      task.executionInputs.firstFrame.mimeType = 'image/jpeg';
    },
  ],
  [
    'last frame bytes',
    (task) => {
      task.executionInputs.lastFrame.data = 'bmV3';
    },
  ],
  [
    'last frame MIME',
    (task) => {
      task.executionInputs.lastFrame.mimeType = 'image/jpeg';
    },
  ],
  [
    'reference bytes',
    (task) => {
      task.executionInputs.referenceImages[0].data = 'bmV3';
    },
  ],
  [
    'reference MIME',
    (task) => {
      task.executionInputs.referenceImages[0].mimeType = 'image/jpeg';
    },
  ],
  [
    'reference order',
    (task) => {
      task.executionInputs.referenceImages.reverse();
    },
  ],
]) {
  test(`v2 approval binds the actual video ${label}`, () => {
    const original = approve(videoTask());
    assert.equal(validateCostApproval(original), 0.8);
    const changed = structuredClone(original);
    mutate(changed);
    assert.throws(() => requireApprovedSubmission(changed), /hash mismatch/);
    // Changes that also affect the trusted price/model still fail at that earlier boundary.
    assert.throws(() => validateCostApproval(changed));
  });
}

for (const [label, mutate] of [
  [
    'prompt',
    (task) => {
      task.request.prompt += ' More motion.';
    },
  ],
  [
    'model',
    (task) => {
      task.request.modelId = 'lyria-3-clip-preview';
    },
  ],
  [
    'lyrics',
    (task) => {
      task.request.lyrics = '[Verse] Go';
    },
  ],
  [
    'structure',
    (task) => {
      task.request.structure = 'Instrumental intro';
    },
  ],
  [
    'format',
    (task) => {
      task.request.responseFormat = 'wav';
    },
  ],
  [
    'image bytes',
    (task) => {
      task.request.images[0].data = 'bmV3';
    },
  ],
  [
    'image MIME',
    (task) => {
      task.request.images[0].mimeType = 'image/jpeg';
    },
  ],
  [
    'image order',
    (task) => {
      task.request.images.reverse();
    },
  ],
]) {
  test(`v2 approval binds the actual music ${label}`, () => {
    const original = approve(musicTask());
    const changed = structuredClone(original);
    mutate(changed);
    assert.throws(() => requireApprovedSubmission(changed), /hash mismatch/);
  });
}

test('binds the exact extension URI submitted to the provider', () => {
  const task = videoTask();
  task.request.mode = 'extension';
  task.request.extensionArtifact = { mediaUri: 'https://provider/previous.mp4' };
  approve(task);
  task.request.extensionArtifact.mediaUri = 'https://provider/other.mp4';
  assert.throws(() => requireApprovedSubmission(task), /hash mismatch/);
});

test('identical submissions have identical hashes independent of input property order', () => {
  const original = videoTask();
  const reordered = {
    ...original,
    request: Object.fromEntries(Object.entries(original.request).reverse()),
  };
  assert.equal(
    computePaidSubmissionHash(createPaidSubmission(original)),
    computePaidSubmissionHash(createPaidSubmission(reordered)),
  );
});

test('requires v2 native approval and verifies stored bytes, operation and endpoint', () => {
  const original = approve(videoTask());
  assert.ok(Object.isFrozen(requireApprovedSubmission(original)));
  for (const value of [undefined, 1, 3]) {
    const changed = structuredClone(original);
    changed.costApproval.hashVersion = value;
    assert.throws(() => requireApprovedSubmission(changed), /new native cost approval/);
  }
  for (const field of ['body', 'modelId', 'url', 'operation']) {
    const changed = structuredClone(original);
    changed.approvedSubmission[field] += 'changed';
    assert.throws(() => requireApprovedSubmission(changed), /hash mismatch/);
  }
  const missing = structuredClone(original);
  delete missing.approvedSubmission;
  assert.throws(() => requireApprovedSubmission(missing), /hash mismatch/);
});
