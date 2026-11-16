'use strict';

const fs = require('fs');
const path = require('path');
const { validateCostApproval, calculateMaximumCharge } = require('./paid-job-pricing.cjs');
const { PaidJobFSM, PaidJobJournal } = require('./paid-job-fsm.cjs');

const {
  API_BASE,
  PROVIDER_MODELS,
  isOmniTask,
  isVertexVeoTask,
  resolveVertexTarget,
  buildSubmission,
  buildMusicSubmission,
  buildOmniSubmission,
  requireApprovedSubmission,
  assertNewSubmissionAvailable,
} = require('./paid-job-submission.cjs');
const LYRIA_MODELS = new Set(['lyria-3-clip-preview', 'lyria-3-pro-preview']);
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SAFE_JOB_ID = /^[a-zA-Z0-9._:-]{1,180}$/;

function isValidImagePayload(image) {
  if (!image || typeof image !== 'object' || !ALLOWED_IMAGE_MIME_TYPES.has(image.mimeType)) {
    return false;
  }
  const hasInlineData = typeof image.data === 'string' && image.data.length > 0;
  const hasStorageKey = typeof image.storageKey === 'string' && image.storageKey.length > 0;
  return hasInlineData || hasStorageKey;
}

function hasExternalizedInputs(task) {
  if (!task || typeof task !== 'object') return false;
  if (task.approvedSubmission?.bodyStorageKey && !task.approvedSubmission?.body) return true;
  if (task.inputImage?.storageKey && !task.inputImage?.data) return true;
  const exec = task.executionInputs || {};
  if (exec.firstFrame?.storageKey && !exec.firstFrame?.data) return true;
  if (exec.lastFrame?.storageKey && !exec.lastFrame?.data) return true;
  if (
    Array.isArray(exec.referenceImages) &&
    exec.referenceImages.some((i) => i?.storageKey && !i?.data)
  ) {
    return true;
  }
  if (
    Array.isArray(task.request?.images) &&
    task.request.images.some((i) => i?.storageKey && !i?.data)
  ) {
    return true;
  }
  return false;
}

function validatePaidTask(task) {
  if (!task || typeof task !== 'object' || !SAFE_JOB_ID.test(String(task.id || '')))
    throw new Error('Invalid paid job ID.');
  if (typeof task.prompt !== 'string' || task.prompt.length === 0 || task.prompt.length > 200_000)
    throw new Error('Invalid paid job prompt.');
  const request = task.request;
  if (task.jobKind === 'music') {
    if (!request || !LYRIA_MODELS.has(request.modelId))
      throw new Error('Unsupported paid music model.');
    if (!['mp3', 'wav'].includes(request.responseFormat))
      throw new Error('Unsupported paid music output format.');
    if (request.modelId === 'lyria-3-clip-preview' && request.responseFormat !== 'mp3')
      throw new Error('Lyria 3 Clip only supports MP3 output.');
    if (!Array.isArray(request.images) || request.images.length > 10)
      throw new Error('Paid music jobs support at most ten images.');
    for (const image of request.images) {
      if (!isValidImagePayload(image)) {
        throw new Error('Invalid paid music image input.');
      }
      if (
        typeof image.data === 'string' &&
        Buffer.byteLength(image.data, 'base64') > 25 * 1024 * 1024
      ) {
        throw new Error('Paid music image input exceeds the 25 MB safety limit.');
      }
    }
    if (!hasExternalizedInputs(task)) validateCostApproval(task);
    return task;
  }

  if (isOmniTask(task)) {
    const duration = Number(request?.durationSeconds);
    if (!Number.isInteger(duration) || duration < 3 || duration > 15)
      throw new Error('Unsupported paid job duration.');
    if (!['360p', '720p', '1080p', '4k'].includes(request.resolution))
      throw new Error('Unsupported paid job resolution.');
    if (!['16:9', '9:16'].includes(request.aspectRatio))
      throw new Error('Unsupported paid job aspect ratio.');
    const exec = task.executionInputs || {};
    for (const ref of exec.referenceImages || []) {
      if (!isValidImagePayload(ref)) throw new Error('Invalid paid job reference image input.');
    }
    if (!hasExternalizedInputs(task)) validateCostApproval(task);
    return task;
  }

  const isVertex = isVertexVeoTask(task);
  if (isVertex) {
    resolveVertexTarget(task);
  } else if (!request || !Object.hasOwn(PROVIDER_MODELS, request.modelId)) {
    throw new Error('Unsupported paid job model.');
  }
  if (![4, 6, 8].includes(request.durationSeconds))
    throw new Error('Unsupported paid job duration.');
  if (!['720p', '1080p', '4k'].includes(request.resolution))
    throw new Error('Unsupported paid job resolution.');
  if (!['16:9', '9:16'].includes(request.aspectRatio))
    throw new Error('Unsupported paid job aspect ratio.');
  if (!Array.isArray(request.referenceAssetIds) || request.referenceAssetIds.length > 3)
    throw new Error('Invalid paid job references.');
  const executionInputs = task.executionInputs || {};
  const referenceImages = executionInputs.referenceImages;
  if (request.referenceAssetIds.length > 0) {
    if (
      !Array.isArray(referenceImages) ||
      referenceImages.length !== request.referenceAssetIds.length
    ) {
      throw new Error('Paid job reference payload does not match the approved references.');
    }
  } else if (Array.isArray(referenceImages) && referenceImages.length > 0) {
    throw new Error('Paid job contains unapproved reference images.');
  }
  if (Array.isArray(referenceImages) && referenceImages.length > 3) {
    throw new Error('Paid job supports at most three reference images.');
  }
  for (const image of referenceImages || []) {
    if (!isValidImagePayload(image)) {
      throw new Error('Invalid paid job reference image input.');
    }
  }
  if (request.firstFrameAssetId && !executionInputs.firstFrame && !task.inputImage) {
    throw new Error('Paid job first-frame payload is missing.');
  }
  if (request.lastFrameAssetId && !executionInputs.lastFrame) {
    throw new Error('Paid job last-frame payload is missing.');
  }
  if (hasExternalizedInputs(task)) {
    // Still validate core pricing bounds & metadata synchronously; exact submission bytes verify on hydration.
    calculateMaximumCharge(task);
    if (!task.costApproval?.payloadHash || task.costApproval?.hashVersion !== 2) {
      throw new Error('An auditable cost approval is required for paid execution.');
    }
  } else {
    validateCostApproval(task);
  }
  return task;
}

function extractMusicOutput(payload) {
  const text = [];
  let audio = null;
  for (const step of Array.isArray(payload?.steps) ? payload.steps : []) {
    if (step?.type !== 'model_output') continue;
    for (const block of Array.isArray(step.content) ? step.content : []) {
      if (block?.type === 'audio' && typeof block.data === 'string') audio = block;
      if (block?.type === 'text' && typeof block.text === 'string') text.push(block.text);
    }
  }
  return { audio, text: text.join('\n\n') };
}

class PaidJobStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.pendingWrite = Promise.resolve();
  }

  async readAll() {
    try {
      const parsed = JSON.parse(await fs.promises.readFile(this.filePath, 'utf8'));
      return Array.isArray(parsed.jobs) ? parsed.jobs : [];
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  }

  async writeAll(jobs) {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await fs.promises.writeFile(
      temporaryPath,
      JSON.stringify({ schemaVersion: 1, jobs }, null, 2),
      { encoding: 'utf8', mode: 0o600 },
    );
    const handle = await fs.promises.open(temporaryPath, 'r+');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.promises.rename(temporaryPath, this.filePath);
  }

  async put(job) {
    // Snapshot before queuing: callers mutate their working job while awaiting subsequent transitions.
    const snapshot = structuredClone(job);
    const write = this.pendingWrite
      .catch(() => {})
      .then(async () => {
        const jobs = await this.readAll();
        const index = jobs.findIndex((candidate) => candidate.id === snapshot.id);
        if (index >= 0) jobs[index] = snapshot;
        else jobs.push(snapshot);
        await this.writeAll(jobs);
        return snapshot;
      });
    this.pendingWrite = write;
    return write;
  }

  async get(id) {
    return (await this.readAll()).find((job) => job.id === id);
  }
}

function normalizeMediaUri(uri) {
  if (typeof uri !== 'string' || !uri) return null;
  if (uri.startsWith('gs://')) {
    const rest = uri.slice('gs://'.length);
    const slash = rest.indexOf('/');
    if (slash > 0) {
      const bucket = rest.slice(0, slash);
      const objectPath = rest.slice(slash + 1);
      return `https://storage.googleapis.com/${bucket}/${objectPath}`;
    }
  }
  return uri;
}

function extractVideoUri(payload) {
  return normalizeMediaUri(
    payload?.response?.generatedVideos?.[0]?.video?.uri ||
      payload?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
      payload?.response?.videos?.[0]?.gcsUri ||
      payload?.response?.videos?.[0]?.uri ||
      null,
  );
}

function extractVideoOutput(payload) {
  const uri = extractVideoUri(payload);
  const inline = payload?.response?.videos?.[0]?.bytesBase64Encoded;
  const inlineMime = payload?.response?.videos?.[0]?.mimeType || 'video/mp4';
  if (typeof inline === 'string' && inline.length > 0) {
    return { uri, bytesBase64Encoded: inline, mimeType: inlineMime };
  }
  return { uri, bytesBase64Encoded: null, mimeType: inlineMime };
}

function extractInteractionVideoOutput(payload) {
  const blocks = [];
  for (const step of Array.isArray(payload?.steps) ? payload.steps : []) {
    if (step?.type === 'model_output' && Array.isArray(step.content)) {
      blocks.push(...step.content);
    }
  }
  if (Array.isArray(payload?.outputs)) blocks.push(...payload.outputs);
  if (Array.isArray(payload?.output?.content)) blocks.push(...payload.output.content);
  const text = [];
  let video = null;
  for (const block of blocks) {
    if (block?.type === 'text' && typeof block.text === 'string') {
      text.push(block.text);
    } else if (block?.type === 'video') {
      if (typeof block.data === 'string' && block.data.length > 0) {
        video = {
          data: block.data,
          mimeType: block.mime_type || block.mimeType || 'video/mp4',
        };
      } else if (typeof block.uri === 'string' || typeof block.file_uri === 'string') {
        video = {
          uri: normalizeMediaUri(block.uri || block.file_uri),
          mimeType: block.mime_type || block.mimeType || 'video/mp4',
        };
      }
    }
  }
  return { video, text: text.join('\n\n') };
}

function mapLegacyStatusToFsmState(job) {
  if (job?.state) return job.state;
  switch (job?.status) {
    case 'Submitting':
      return 'DISPATCHING';
    case 'Polling':
    case 'Fetching':
    case 'Processing':
      return 'RUNNING';
    case 'Complete':
      return 'COMPLETED';
    case 'Error':
    case 'RecoveryRequired':
    case 'MediaAtRisk':
      return 'FAILED';
    case 'Queued':
    case 'Init':
    case 'Pending':
    default:
      return job?.costApproval?.payloadHash ? 'APPROVED' : 'DRAFT';
  }
}

function ensureFsmJob(job) {
  if (!job || typeof job !== 'object') return job;
  const state = mapLegacyStatusToFsmState(job);
  const history = Array.isArray(job.history) ? job.history : [];
  if (job.state === state && Array.isArray(job.history)) return job;
  return { ...job, state, history };
}

const VALID_OPERATION_ID =
  /^(?:projects\/[^/]+\/locations\/[^/]+\/(?:publishers\/google\/models\/[^/]+\/)?)?(?:models\/[a-zA-Z0-9._-]+\/)?operations\/[a-zA-Z0-9._-]+$/;

class PaidJobEngine {
  constructor({
    store,
    journal,
    getApiKey,
    getVertexAccessToken,
    fetchImpl = fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    storeMedia,
    readMedia,
    cacheVideo,
    onUpdate = () => {},
    now = () => Date.now(),
  }) {
    this.store = store;
    this.journal =
      journal === undefined && store?.filePath
        ? new PaidJobJournal(path.join(path.dirname(store.filePath), 'paid-jobs.jsonl'))
        : journal || null;
    this.getApiKey = getApiKey;
    this.getVertexAccessToken = getVertexAccessToken;
    this.fetchImpl = fetchImpl;
    this.sleep = sleep;
    this.storeMedia = storeMedia;
    this.readMedia = readMedia;
    this.cacheVideo = cacheVideo;
    this.onUpdate = onUpdate;
    this.now = typeof now === 'function' ? now : () => Date.now();
    this.active = new Map();
    this.submissions = new Map();
  }

  canExternalizeMedia() {
    return typeof this.storeMedia === 'function' && typeof this.readMedia === 'function';
  }

  async externalizeImageSlot(jobId, slot, image) {
    if (!image || typeof image !== 'object') return image;
    if (image.storageKey && !image.data) return image;
    if (typeof image.data !== 'string' || !image.data) return image;
    const key = `jobinput:${jobId}:${slot}`;
    const bytes = Buffer.from(image.data, 'base64');
    await this.storeMedia({
      key,
      bytes,
      mimeType: image.mimeType || 'image/png',
      metadata: { jobId, slot, kind: 'paid-job-input' },
    });
    return {
      storageKey: key,
      mimeType: image.mimeType || 'image/png',
      byteLength: bytes.length,
    };
  }

  async externalizeJobPayloads(job) {
    if (!this.canExternalizeMedia()) return job;
    const clone = structuredClone(job);
    if (clone.inputImage) {
      clone.inputImage = await this.externalizeImageSlot(clone.id, 'input', clone.inputImage);
    }
    if (clone.executionInputs && typeof clone.executionInputs === 'object') {
      if (clone.executionInputs.firstFrame) {
        clone.executionInputs.firstFrame = await this.externalizeImageSlot(
          clone.id,
          'first',
          clone.executionInputs.firstFrame,
        );
      }
      if (clone.executionInputs.lastFrame) {
        clone.executionInputs.lastFrame = await this.externalizeImageSlot(
          clone.id,
          'last',
          clone.executionInputs.lastFrame,
        );
      }
      if (Array.isArray(clone.executionInputs.referenceImages)) {
        clone.executionInputs.referenceImages = await Promise.all(
          clone.executionInputs.referenceImages.map((img, i) =>
            this.externalizeImageSlot(clone.id, `ref-${i}`, img),
          ),
        );
      }
    }
    if (Array.isArray(clone.request?.images)) {
      clone.request.images = await Promise.all(
        clone.request.images.map((img, i) =>
          this.externalizeImageSlot(clone.id, `music-${i}`, img),
        ),
      );
    }
    if (clone.approvedSubmission?.body && typeof clone.approvedSubmission.body === 'string') {
      const subKey = `jobsub:${clone.id}`;
      const bodyBytes = Buffer.from(clone.approvedSubmission.body, 'utf8');
      await this.storeMedia({
        key: subKey,
        bytes: bodyBytes,
        mimeType: 'application/json',
        metadata: { jobId: clone.id, kind: 'paid-job-submission' },
      });
      clone.approvedSubmission = {
        version: clone.approvedSubmission.version,
        modelId: clone.approvedSubmission.modelId,
        operation: clone.approvedSubmission.operation,
        url: clone.approvedSubmission.url,
        bodyStorageKey: subKey,
        bodyByteLength: bodyBytes.length,
      };
    }
    return clone;
  }

  async hydrateImageSlot(image) {
    if (!image || typeof image !== 'object') return image;
    if (typeof image.data === 'string' && image.data.length > 0) return image;
    if (!image.storageKey || typeof this.readMedia !== 'function') return image;
    const buf = await this.readMedia(image.storageKey);
    if (!buf) {
      throw new Error(`Externalized input media ${image.storageKey} is missing or tampered.`);
    }
    return {
      mimeType: image.mimeType,
      data: Buffer.from(buf).toString('base64'),
    };
  }

  async hydrateTaskMedia(job) {
    if (!hasExternalizedInputs(job)) return job;
    const hydrated = structuredClone(job);
    if (hydrated.inputImage) {
      hydrated.inputImage = await this.hydrateImageSlot(hydrated.inputImage);
    }
    if (hydrated.executionInputs && typeof hydrated.executionInputs === 'object') {
      if (hydrated.executionInputs.firstFrame) {
        hydrated.executionInputs.firstFrame = await this.hydrateImageSlot(
          hydrated.executionInputs.firstFrame,
        );
      }
      if (hydrated.executionInputs.lastFrame) {
        hydrated.executionInputs.lastFrame = await this.hydrateImageSlot(
          hydrated.executionInputs.lastFrame,
        );
      }
      if (Array.isArray(hydrated.executionInputs.referenceImages)) {
        hydrated.executionInputs.referenceImages = await Promise.all(
          hydrated.executionInputs.referenceImages.map((img) => this.hydrateImageSlot(img)),
        );
      }
    }
    if (Array.isArray(hydrated.request?.images)) {
      hydrated.request.images = await Promise.all(
        hydrated.request.images.map((img) => this.hydrateImageSlot(img)),
      );
    }
    if (hydrated.approvedSubmission?.bodyStorageKey && !hydrated.approvedSubmission.body) {
      if (typeof this.readMedia !== 'function') {
        throw new Error('Cannot hydrate externalized submission body without media reader.');
      }
      const buf = await this.readMedia(hydrated.approvedSubmission.bodyStorageKey);
      if (!buf) {
        throw new Error('Externalized submission snapshot is missing or corrupted.');
      }
      hydrated.approvedSubmission = Object.freeze({
        version: hydrated.approvedSubmission.version,
        modelId: hydrated.approvedSubmission.modelId,
        operation: hydrated.approvedSubmission.operation,
        url: hydrated.approvedSubmission.url,
        body: Buffer.from(buf).toString('utf8'),
      });
    }
    return hydrated;
  }

  async recordJournalTransition(job, fromState, toState, reason) {
    if (!this.journal) return;
    await this.journal
      .append({
        jobId: job.id,
        from: fromState,
        to: toState,
        status: job.status,
        reason: reason || '',
        payloadHash: job.costApproval?.payloadHash,
        providerOperationName: job.providerOperationName,
        providerInteractionId: job.providerInteractionId,
      })
      .catch(() => {});
  }

  async persist(job, targetState, reason = '') {
    let next = ensureFsmJob(job);
    const fromState = next.state;
    if (targetState && next.state !== targetState) {
      if (PaidJobFSM.canTransition(next.state, targetState)) {
        next = PaidJobFSM.transition(
          next,
          targetState,
          {
            approvalToken: next.costApproval?.approvalId || next.approvalToken,
            payloadHash: next.costApproval?.payloadHash || next.payloadHash,
          },
          reason,
        );
      } else {
        // Record valid fallback state metadata cleanly without blocking error persistence.
        next.state = targetState;
        next.updatedAt = Date.now();
      }
    } else {
      next.updatedAt = Date.now();
    }
    // Synchronize caller's working object reference cleanly when mutated in tests (e.g. onUpdate spies)
    Object.assign(job, {
      state: next.state,
      history: next.history,
      updatedAt: next.updatedAt,
    });
    const toStore = this.canExternalizeMedia() ? await this.externalizeJobPayloads(next) : next;
    await this.store.put(toStore);
    if (targetState && fromState !== next.state) {
      await this.recordJournalTransition(next, fromState, next.state, reason);
    }
    this.onUpdate(next);
    return next;
  }

  async submit(input) {
    const task = structuredClone(input);
    validatePaidTask(task);
    if (this.submissions.has(task.id)) return this.submissions.get(task.id);
    const submission = this.submitOnce(task).finally(() => this.submissions.delete(task.id));
    this.submissions.set(task.id, submission);
    return submission;
  }

  async submitOnce(task) {
    const existing = await this.store.get(task.id);
    if (existing) {
      if (existing.providerOperationName && !['Complete', 'Error'].includes(existing.status)) {
        void this.run(existing);
      }
      return existing;
    }
    const hydrated = await this.hydrateTaskMedia(task);
    requireApprovedSubmission(hydrated);
    assertNewSubmissionAvailable(hydrated, this.now());

    // Record canonical DRAFT -> QUOTED -> APPROVED lineage on admission
    let fsmJob = {
      ...task,
      state: 'DRAFT',
      history: [],
      status: 'Queued',
      createdAt: task.createdAt || Date.now(),
    };
    fsmJob = PaidJobFSM.transition(fsmJob, 'QUOTED', {}, 'Validated pricing ceiling');
    fsmJob = PaidJobFSM.transition(
      fsmJob,
      'APPROVED',
      {
        approvalToken: task.costApproval?.approvalId,
        payloadHash: task.costApproval?.payloadHash,
      },
      'Native approval verified',
    );
    await this.recordJournalTransition(fsmJob, 'DRAFT', 'QUOTED', 'Validated pricing ceiling');
    await this.recordJournalTransition(fsmJob, 'QUOTED', 'APPROVED', 'Native approval verified');
    await this.persist(fsmJob, 'APPROVED', 'Queued for execution');
    void this.run(fsmJob);
    return fsmJob;
  }

  async run(job) {
    if (this.active.has(job.id)) return this.active.get(job.id);
    const controller = new AbortController();
    const promise = this.runOnce(ensureFsmJob(job), controller.signal)
      .catch((error) => this.recover(job, String(error?.message || error)))
      .finally(() => this.active.delete(job.id));
    this.active.set(job.id, promise);
    this.active.get(job.id).controller = controller;
    return promise;
  }

  async runOnce(job, signal) {
    if (job.jobKind === 'music') return this.runMusicOnce(job, signal);
    if (isOmniTask(job)) return this.runOmniOnce(job, signal);
    if (
      ['Complete', 'RecoveryRequired', 'MediaAtRisk'].includes(job.status) &&
      !job.providerOperationName
    )
      return job;

    let working = ensureFsmJob(job);
    const hydrated = await this.hydrateTaskMedia(working);
    const isVertex =
      isVertexVeoTask(hydrated) ||
      String(hydrated.approvedSubmission?.url || '').includes('aiplatform.googleapis.com') ||
      String(hydrated.providerOperationName || '').startsWith('projects/');

    if (!working.providerOperationName) {
      try {
        validatePaidTask(hydrated);
        requireApprovedSubmission(hydrated);
        assertNewSubmissionAvailable(hydrated, this.now());
      } catch (error) {
        return this.persist(
          { ...working, status: 'Error', error: String(error?.message || error) },
          'FAILED',
          String(error?.message || error),
        );
      }
    }

    let authHeader;
    let apiKey = null;
    if (isVertex) {
      const token = await this.getVertexAccessToken?.();
      if (!token) {
        return this.persist(
          { ...working, status: 'Error', error: 'Vertex AI ADC/OAuth token is unavailable.' },
          'FAILED',
          'Missing Vertex AI token',
        );
      }
      authHeader = { authorization: `Bearer ${token}` };
    } else {
      apiKey = await this.getApiKey?.();
      if (!apiKey) {
        return this.persist(
          { ...working, status: 'Error', error: 'Gemini API key is not configured.' },
          'FAILED',
          'Missing Gemini API key',
        );
      }
      authHeader = { 'x-goog-api-key': apiKey };
    }

    let acknowledgementDurable = Boolean(working.providerOperationName);
    let submissionStarted = false;
    let submissionRejected = false;
    try {
      let operationName = working.providerOperationName;
      let submissionUrl = working.approvedSubmission?.url;
      if (!operationName) {
        working.status = 'Submitting';
        working.error = undefined;
        working = await this.persist(working, 'DISPATCHING', 'Dispatching paid video submission');
        let response;
        try {
          signal.throwIfAborted();
          const rehydrated = await this.hydrateTaskMedia(working);
          validatePaidTask(rehydrated);
          const submission = requireApprovedSubmission(rehydrated);
          assertNewSubmissionAvailable(rehydrated, this.now());
          submissionUrl = submission.url;
          submissionStarted = true;
          response = await this.fetchImpl(submission.url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', ...authHeader },
            body: submission.body,
            signal,
          });
        } catch (error) {
          if (!submissionStarted) throw error;
          return this.recover(
            working,
            'Submission acknowledgement was lost. Verify provider activity before retrying.',
          );
        }
        if (!response.ok) {
          submissionRejected = response.status >= 400 && response.status < 500;
          throw new Error(`Veo submission failed (${response.status}): ${await response.text()}`);
        }
        const payload = await response.json();
        operationName = payload.name;
        if (typeof operationName !== 'string' || !VALID_OPERATION_ID.test(operationName))
          throw new Error('Veo submission returned no operation ID.');
        working.providerOperationName = operationName;
        working.status = 'Polling';
        working = await this.persist(working, 'RUNNING', 'Provider operation acknowledged');
        acknowledgementDurable = true;
      } else {
        working.status = 'Polling';
        working = await this.persist(working, 'RUNNING', 'Resuming operation polling');
      }

      const pollUrl = (() => {
        if (isVertex) {
          const origin = submissionUrl
            ? new URL(submissionUrl).origin
            : `https://${resolveVertexTarget(hydrated).host}`;
          return `${origin}/v1/${operationName.replace(/^\/+/, '')}`;
        }
        return `${API_BASE}/${operationName}`;
      })();

      let pollCount = 0;
      const MAX_POLLS = 360;
      let transientFailures = 0;
      while (!signal.aborted) {
        if (++pollCount > MAX_POLLS) {
          throw new Error('Veo generation timed out after 30 minutes.');
        }
        await this.sleep(5000);
        let response;
        try {
          response = await this.fetchImpl(pollUrl, {
            headers: { ...authHeader },
            signal,
          });
        } catch (fetchErr) {
          if (signal.aborted) throw fetchErr;
          if (++transientFailures <= 3) continue;
          throw fetchErr;
        }
        if (!response.ok) {
          if ([429, 500, 502, 503, 504].includes(response.status) && ++transientFailures <= 3) {
            continue;
          }
          throw new Error(`Veo polling failed (${response.status}): ${await response.text()}`);
        }
        transientFailures = 0;
        const payload = await response.json();
        if (payload.error) throw new Error(payload.error.message || 'Veo operation failed.');
        if (!payload.done) continue;
        const output = extractVideoOutput(payload);
        if (!output.uri && !output.bytesBase64Encoded) {
          throw new Error('Veo completed without a video URI.');
        }
        working = {
          ...working,
          status: 'Fetching',
          ...(output.uri ? { providerMediaUri: output.uri } : {}),
          providerExpiresAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
        };
        working = await this.persist(working);
        try {
          let media;
          if (output.bytesBase64Encoded) {
            if (!this.storeMedia) throw new Error('Local video storage is unavailable.');
            media = await this.storeMedia({
              key: `video:${working.id}`,
              bytes: Buffer.from(output.bytesBase64Encoded, 'base64'),
              mimeType: output.mimeType || 'video/mp4',
              metadata: { modelId: working.request.modelId, operationId: operationName },
            });
          } else {
            if (!this.cacheVideo) throw new Error('Local video storage is unavailable.');
            media = await this.cacheVideo({
              key: `video:${working.id}`,
              url: output.uri,
              ...(isVertex ? { headers: authHeader } : { apiKey }),
              metadata: { modelId: working.request.modelId, operationId: operationName },
            });
          }
          return await this.persist(
            {
              ...working,
              status: 'Complete',
              videoUrl: media.localUrl,
              localMediaKey: media.key,
              localMediaUrl: media.localUrl,
              localMediaPath: media.path,
              mimeType: media.mimeType,
              error: undefined,
            },
            'COMPLETED',
            'Video generation verified and stored locally',
          );
        } catch (error) {
          return this.persist(
            {
              ...working,
              status: 'MediaAtRisk',
              error: `Video was generated but local media verification failed: ${String(error?.message || error)}`,
            },
            'FAILED',
            'Local media verification failed',
          );
        }
      }
      signal.throwIfAborted();
    } catch (error) {
      const recovery = {
        ...working,
        status:
          submissionStarted && !submissionRejected && !acknowledgementDurable
            ? 'RecoveryRequired'
            : 'Error',
        error: error?.name === 'AbortError' ? 'Cancelled by user' : String(error?.message || error),
      };
      const targetState = error?.name === 'AbortError' ? 'CANCELLED' : 'FAILED';
      try {
        return await this.persist(recovery, targetState, recovery.error);
      } catch {
        // The durable Submitting marker prevents replay after a failed acknowledgement write.
        recovery.status = 'RecoveryRequired';
        recovery.state = 'FAILED';
        this.onUpdate(recovery);
        return recovery;
      }
    }
  }

  async runOmniOnce(job, signal) {
    let working = ensureFsmJob(job);
    const hydrated = await this.hydrateTaskMedia(working);
    if (
      ['Complete', 'RecoveryRequired', 'MediaAtRisk'].includes(working.status) &&
      !working.providerInteractionId
    ) {
      return working;
    }
    if (!working.providerInteractionId) {
      try {
        validatePaidTask(hydrated);
        requireApprovedSubmission(hydrated);
      } catch (error) {
        return this.persist(
          { ...working, status: 'Error', error: String(error?.message || error) },
          'FAILED',
          String(error?.message || error),
        );
      }
    }
    const apiKey = await this.getApiKey?.();
    if (!apiKey) {
      return this.persist(
        { ...working, status: 'Error', error: 'Gemini API key is not configured.' },
        'FAILED',
        'Missing Gemini API key',
      );
    }

    let acknowledgementDurable = Boolean(working.providerInteractionId);
    let submissionStarted = false;
    let submissionRejected = false;
    try {
      let interactionId = working.providerInteractionId;
      let immediatePayload = null;
      if (!interactionId) {
        working.status = 'Submitting';
        working.error = undefined;
        working = await this.persist(
          working,
          'DISPATCHING',
          'Dispatching Omni background interaction',
        );
        let response;
        try {
          signal.throwIfAborted();
          const rehydrated = await this.hydrateTaskMedia(working);
          validatePaidTask(rehydrated);
          const submission = requireApprovedSubmission(rehydrated);
          submissionStarted = true;
          response = await this.fetchImpl(submission.url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
            body: submission.body,
            signal,
          });
        } catch (error) {
          if (!submissionStarted) throw error;
          return this.recover(
            working,
            'Omni interaction acknowledgement was lost. Verify provider activity before retrying.',
          );
        }
        if (!response.ok) {
          submissionRejected = response.status >= 400 && response.status < 500;
          throw new Error(`Omni submission failed (${response.status}): ${await response.text()}`);
        }
        immediatePayload = await response.json();
        interactionId = immediatePayload.id;
        if (typeof interactionId !== 'string' || !interactionId) {
          throw new Error('Omni returned no interaction ID.');
        }
        working.providerInteractionId = interactionId;
        working.status = 'Polling';
        working = await this.persist(working, 'RUNNING', 'Omni interaction acknowledged');
        acknowledgementDurable = true;
      } else {
        working.status = 'Polling';
        working = await this.persist(working, 'RUNNING', 'Resuming Omni interaction polling');
      }

      let payload = immediatePayload;
      let pollCount = 0;
      const MAX_POLLS = 360;
      let transientFailures = 0;
      while (!signal.aborted) {
        if (payload) {
          if (payload.error || payload.status === 'failed' || payload.status === 'cancelled') {
            throw new Error(
              payload.error?.message || `Omni interaction ${payload.status || 'failed'}.`,
            );
          }
          const extracted = extractInteractionVideoOutput(payload);
          const isComplete =
            payload.status === 'completed' ||
            payload.done === true ||
            (!['in_progress', 'requires_action', 'queued'].includes(payload.status) &&
              Boolean(extracted.video));
          if (isComplete && extracted.video) {
            working = await this.persist({ ...working, status: 'Fetching' });
            try {
              let media;
              if (extracted.video.data) {
                if (!this.storeMedia) throw new Error('Local video storage is unavailable.');
                const bytes = Buffer.from(extracted.video.data, 'base64');
                media = await this.storeMedia({
                  key: `video:${working.id}`,
                  bytes,
                  mimeType: extracted.video.mimeType || 'video/mp4',
                  metadata: { modelId: working.request.modelId, operationId: interactionId },
                });
              } else {
                if (!this.cacheVideo) throw new Error('Local video storage is unavailable.');
                media = await this.cacheVideo({
                  key: `video:${working.id}`,
                  url: extracted.video.uri,
                  apiKey,
                  metadata: { modelId: working.request.modelId, operationId: interactionId },
                });
              }
              return await this.persist(
                {
                  ...working,
                  status: 'Complete',
                  providerInteractionId: interactionId,
                  generatedText: extracted.text || undefined,
                  videoUrl: media.localUrl,
                  localMediaKey: media.key,
                  localMediaUrl: media.localUrl,
                  localMediaPath: media.path,
                  mimeType: media.mimeType,
                  error: undefined,
                },
                'COMPLETED',
                'Omni interaction video stored locally',
              );
            } catch (error) {
              return this.persist(
                {
                  ...working,
                  status: 'MediaAtRisk',
                  error: `Omni video was generated but local media verification failed: ${String(error?.message || error)}`,
                },
                'FAILED',
                'Local media verification failed',
              );
            }
          }
          if (isComplete && !extracted.video) {
            throw new Error('Omni interaction completed without a video block.');
          }
        }

        if (++pollCount > MAX_POLLS) {
          throw new Error('Omni generation timed out after 30 minutes.');
        }
        await this.sleep(5000);
        let response;
        try {
          response = await this.fetchImpl(
            `${API_BASE}/interactions/${encodeURIComponent(interactionId)}`,
            { headers: { 'x-goog-api-key': apiKey }, signal },
          );
        } catch (fetchErr) {
          if (signal.aborted) throw fetchErr;
          if (++transientFailures <= 3) {
            payload = null;
            continue;
          }
          throw fetchErr;
        }
        if (!response.ok) {
          if ([429, 500, 502, 503, 504].includes(response.status) && ++transientFailures <= 3) {
            payload = null;
            continue;
          }
          throw new Error(`Omni polling failed (${response.status}): ${await response.text()}`);
        }
        transientFailures = 0;
        payload = await response.json();
      }
      signal.throwIfAborted();
    } catch (error) {
      const recovery = {
        ...working,
        status:
          submissionStarted && !submissionRejected && !acknowledgementDurable
            ? 'RecoveryRequired'
            : 'Error',
        error: error?.name === 'AbortError' ? 'Cancelled by user' : String(error?.message || error),
      };
      const targetState = error?.name === 'AbortError' ? 'CANCELLED' : 'FAILED';
      return this.persist(recovery, targetState, recovery.error);
    }
  }

  async recover(job, error) {
    const recovery = { ...ensureFsmJob(job), status: 'RecoveryRequired', error };
    try {
      return await this.persist(recovery, 'FAILED', error);
    } catch {
      recovery.state = 'FAILED';
      this.onUpdate(recovery);
      return recovery;
    }
  }

  async runMusicOnce(job, signal) {
    let working = ensureFsmJob(job);
    if (
      working.providerInteractionId ||
      ['Complete', 'RecoveryRequired', 'MediaAtRisk'].includes(working.status)
    )
      return working;
    const hydrated = await this.hydrateTaskMedia(working);
    try {
      validatePaidTask(hydrated);
      requireApprovedSubmission(hydrated);
    } catch (error) {
      return this.persist(
        { ...working, status: 'Error', error: String(error?.message || error) },
        'FAILED',
        String(error?.message || error),
      );
    }
    const apiKey = await this.getApiKey();
    if (!apiKey)
      return this.persist(
        { ...working, status: 'Error', error: 'Gemini API key is not configured.' },
        'FAILED',
        'Missing Gemini API key',
      );
    if (!this.storeMedia) {
      return this.persist(
        {
          ...working,
          status: 'Error',
          error: 'Local media storage is unavailable.',
        },
        'FAILED',
        'Local media storage unavailable',
      );
    }
    working.status = 'Submitting';
    working.error = undefined;
    working = await this.persist(working, 'DISPATCHING', 'Dispatching paid music submission');
    let response;
    let submissionStarted = false;
    try {
      signal.throwIfAborted();
      const rehydrated = await this.hydrateTaskMedia(working);
      validatePaidTask(rehydrated);
      const submission = requireApprovedSubmission(rehydrated);
      submissionStarted = true;
      response = await this.fetchImpl(submission.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: submission.body,
        signal,
      });
    } catch (error) {
      if (!submissionStarted)
        return this.persist(
          { ...working, status: 'Error', error: String(error?.message || error) },
          'FAILED',
          String(error?.message || error),
        );
      return this.recover(
        working,
        'Music submission acknowledgement was lost. Verify provider activity before retrying.',
      );
    }
    let submissionRejected = false;
    try {
      if (!response.ok) {
        submissionRejected = response.status >= 400 && response.status < 500;
        throw new Error(`Lyria submission failed (${response.status}): ${await response.text()}`);
      }
      const payload = await response.json();
      if (typeof payload.id !== 'string' || !payload.id)
        throw new Error('Lyria returned no interaction ID.');
      working.providerInteractionId = payload.id;
      working = await this.persist(
        { ...working, status: 'RecoveryRequired' },
        'RUNNING',
        'Music interaction returned ID',
      );
      const output = extractMusicOutput(payload);
      if (!output.audio) throw new Error('Lyria completed without an audio block.');
      const bytes = Buffer.from(output.audio.data, 'base64');
      if (bytes.length === 0 || bytes.length > 200 * 1024 * 1024) {
        throw new Error('Lyria returned an invalid audio payload size.');
      }
      const mimeType =
        output.audio.mime_type ||
        output.audio.mimeType ||
        (working.request.responseFormat === 'wav' ? 'audio/wav' : 'audio/mpeg');
      let media;
      try {
        media = await this.storeMedia({
          key: `music:${working.id}`,
          bytes,
          mimeType,
          metadata: {
            accepted: false,
            modelId: working.request.modelId,
            operationId: payload.id,
          },
        });
      } catch (error) {
        return this.persist(
          {
            ...working,
            status: 'MediaAtRisk',
            providerInteractionId: payload.id,
            error: `Music was generated but local media verification failed: ${String(error?.message || error)}`,
          },
          'FAILED',
          'Local media verification failed',
        );
      }
      return await this.persist(
        {
          ...working,
          status: 'Complete',
          providerInteractionId: payload.id,
          generatedText: output.text || undefined,
          localMediaKey: media.key,
          localMediaUrl: media.localUrl,
          localMediaPath: media.path,
          mimeType,
        },
        'COMPLETED',
        'Music generation stored locally',
      );
    } catch (error) {
      if (!submissionRejected) return this.recover(working, String(error?.message || error));
      return this.persist(
        { ...working, status: 'Error', error: String(error?.message || error) },
        'FAILED',
        String(error?.message || error),
      );
    }
  }

  async cancel(id) {
    const active = this.active.get(id);
    active?.controller?.abort();
    if (active) await active;
    const job = await this.store.get(id);
    if (!job) return false;
    if (['Complete'].includes(job.status)) return true;
    if (['RecoveryRequired', 'MediaAtRisk'].includes(job.status) && !active) {
      await this.persist(
        {
          ...job,
          status: 'Error',
          error: 'Cancelled by user',
        },
        'CANCELLED',
        'Cancelled by user',
      );
      return true;
    }
    if (['RecoveryRequired', 'MediaAtRisk'].includes(job.status)) return true;
    const isAmbiguous =
      job.status === 'Submitting' &&
      !job.providerOperationName &&
      !(job.providerInteractionId && isOmniTask(job));
    await this.persist(
      {
        ...job,
        status: isAmbiguous ? 'RecoveryRequired' : 'Error',
        error: 'Cancelled by user',
      },
      isAmbiguous ? 'FAILED' : 'CANCELLED',
      'Cancelled by user',
    );
    return true;
  }

  async retry(id, renewedCostApproval, renewedSubmission) {
    const job = await this.store.get(id);
    if (!job || !['Error', 'MediaAtRisk', 'RecoveryRequired'].includes(job.status)) return false;
    const isResumableOmni = Boolean(job.providerInteractionId && isOmniTask(job));
    if (job.status !== 'Error' && !job.providerOperationName && !isResumableOmni) return false;
    if (job.providerInteractionId && !isResumableOmni) return false;
    const retryable = {
      ...ensureFsmJob(job),
      ...(renewedCostApproval ? { costApproval: renewedCostApproval } : {}),
      ...(renewedSubmission ? { approvedSubmission: renewedSubmission } : {}),
      status: job.providerOperationName || isResumableOmni ? 'Polling' : 'Queued',
      error: undefined,
      retryCount: Number(job.retryCount || 0) + 1,
    };
    if (!retryable.providerOperationName && !isResumableOmni) {
      const hydrated = await this.hydrateTaskMedia(retryable);
      validatePaidTask(hydrated);
      requireApprovedSubmission(hydrated);
      assertNewSubmissionAvailable(hydrated, this.now());
      await this.persist(retryable, 'APPROVED', 'Renewed retry approval verified');
    } else {
      await this.persist(retryable, 'RUNNING', 'Retrying acknowledged operation');
    }
    void this.run(retryable);
    return true;
  }

  async resumeAll() {
    const jobs = await this.store.readAll();
    for (const rawJob of jobs) {
      const job = ensureFsmJob(rawJob);
      const isOmniBackground = Boolean(job.providerInteractionId && isOmniTask(job));
      const recovered = PaidJobFSM.recoverAfterCrash(job);

      if (recovered.state === 'FAILED' && job.state !== 'FAILED') {
        await this.persist(
          {
            ...recovered,
            status: 'RecoveryRequired',
          },
          'FAILED',
          'Prevented duplicate dispatch after unconfirmed restart',
        );
        continue;
      }

      if (
        (job.providerOperationName || isOmniBackground) &&
        [
          'Submitting',
          'Polling',
          'Processing',
          'Queued',
          'Fetching',
          'MediaAtRisk',
          'RecoveryRequired',
        ].includes(job.status)
      ) {
        if (recovered !== job) {
          await this.persist(recovered, 'RUNNING', 'Recovered active operation after restart');
        }
        void this.run(recovered);
      } else if (
        job.status === 'Queued' &&
        !job.providerOperationName &&
        !job.providerInteractionId
      ) {
        try {
          const hydrated = await this.hydrateTaskMedia(job);
          validatePaidTask(hydrated);
          requireApprovedSubmission(hydrated);
          void this.run(job);
        } catch (error) {
          await this.persist(
            { ...job, status: 'Error', error: String(error?.message || error) },
            'FAILED',
            String(error?.message || error),
          );
        }
      } else if (
        !job.providerOperationName &&
        !isOmniBackground &&
        ['Submitting', 'Polling', 'Processing'].includes(job.status)
      ) {
        await this.persist(
          {
            ...job,
            status: 'RecoveryRequired',
            error:
              'Submission state is ambiguous after restart. Verify provider activity before retrying.',
          },
          'FAILED',
          'Ambiguous state on restart',
        );
      }
    }
    return this.store.readAll();
  }
}

module.exports = {
  PaidJobEngine,
  PaidJobStore,
  buildSubmission,
  buildMusicSubmission,
  buildOmniSubmission,
  extractMusicOutput,
  extractVideoUri,
  extractVideoOutput,
  extractInteractionVideoOutput,
  validatePaidTask,
};
