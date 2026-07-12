'use strict';

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const PROVIDER_MODELS = {
  'veo-3.1-quality': 'veo-3.1-generate-preview',
  'veo-3.1-fast': 'veo-3.1-fast-generate-preview',
  'veo-3.1-lite': 'veo-3.1-lite-generate-preview',
};

class PaidJobStore {
  constructor(filePath) {
    this.filePath = filePath;
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
    await fs.promises.rename(temporaryPath, this.filePath);
  }

  async put(job) {
    const jobs = await this.readAll();
    const index = jobs.findIndex((candidate) => candidate.id === job.id);
    if (index >= 0) jobs[index] = job;
    else jobs.push(job);
    await this.writeAll(jobs);
    return job;
  }

  async get(id) {
    return (await this.readAll()).find((job) => job.id === id);
  }
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
  if (request?.mode === 'reference-images' && inputs.referenceImages?.length) {
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

function extractVideoUri(payload) {
  return (
    payload?.response?.generatedVideos?.[0]?.video?.uri ||
    payload?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
    null
  );
}

class PaidJobEngine {
  constructor({
    store,
    getApiKey,
    fetchImpl = fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    onUpdate = () => {},
  }) {
    this.store = store;
    this.getApiKey = getApiKey;
    this.fetchImpl = fetchImpl;
    this.sleep = sleep;
    this.onUpdate = onUpdate;
    this.active = new Map();
  }

  async persist(job) {
    job.updatedAt = Date.now();
    await this.store.put(job);
    this.onUpdate(job);
    return job;
  }

  async submit(task) {
    const existing = await this.store.get(task.id);
    if (existing) {
      if (existing.providerOperationName && !['Complete', 'Error'].includes(existing.status)) {
        void this.run(existing);
      }
      return existing;
    }
    const job = { ...task, status: 'Queued', createdAt: task.createdAt || Date.now() };
    await this.persist(job);
    void this.run(job);
    return job;
  }

  async run(job) {
    if (this.active.has(job.id)) return this.active.get(job.id);
    const controller = new AbortController();
    const promise = this.runOnce(job, controller.signal).finally(() => this.active.delete(job.id));
    this.active.set(job.id, promise);
    this.active.get(job.id).controller = controller;
    return promise;
  }

  async runOnce(job, signal) {
    const apiKey = await this.getApiKey();
    if (!apiKey)
      return this.persist({ ...job, status: 'Error', error: 'Gemini API key is not configured.' });
    try {
      let operationName = job.providerOperationName;
      if (!operationName) {
        job.status = 'Submitting';
        job.error = undefined;
        await this.persist(job);
        const canonicalModel =
          job.request?.modelId ||
          (job.settings.veoModel === 'quality'
            ? 'veo-3.1-quality'
            : job.settings.veoModel === 'lite'
              ? 'veo-3.1-lite'
              : 'veo-3.1-fast');
        const providerModel = PROVIDER_MODELS[canonicalModel] || canonicalModel;
        let response;
        try {
          response = await this.fetchImpl(
            `${API_BASE}/models/${encodeURIComponent(providerModel)}:predictLongRunning`,
            {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
              body: JSON.stringify(buildSubmission(job)),
              signal,
            },
          );
        } catch (error) {
          if (error?.name === 'AbortError') throw error;
          return this.persist({
            ...job,
            status: 'RecoveryRequired',
            error: 'Submission acknowledgement was lost. Verify provider activity before retrying.',
          });
        }
        if (!response.ok)
          throw new Error(`Veo submission failed (${response.status}): ${await response.text()}`);
        const payload = await response.json();
        operationName = payload.name;
        if (!operationName) throw new Error('Veo submission returned no operation ID.');
        job.providerOperationName = operationName;
        await this.persist(job);
      }

      job.status = 'Polling';
      await this.persist(job);
      while (!signal.aborted) {
        await this.sleep(5000);
        const response = await this.fetchImpl(`${API_BASE}/${operationName}`, {
          headers: { 'x-goog-api-key': apiKey },
          signal,
        });
        if (!response.ok)
          throw new Error(`Veo polling failed (${response.status}): ${await response.text()}`);
        const payload = await response.json();
        if (payload.error) throw new Error(payload.error.message || 'Veo operation failed.');
        if (!payload.done) continue;
        const videoUri = extractVideoUri(payload);
        if (!videoUri) throw new Error('Veo completed without a video URI.');
        return this.persist({
          ...job,
          status: 'Complete',
          videoUrl: videoUri,
          providerMediaUri: videoUri,
          providerExpiresAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
        });
      }
    } catch (error) {
      return this.persist({
        ...job,
        status: 'Error',
        error: error?.name === 'AbortError' ? 'Cancelled by user' : String(error?.message || error),
      });
    }
  }

  async cancel(id) {
    const active = this.active.get(id);
    active?.controller?.abort();
    const job = await this.store.get(id);
    if (!job) return false;
    await this.persist({ ...job, status: 'Error', error: 'Cancelled by user' });
    return true;
  }

  async retry(id) {
    const job = await this.store.get(id);
    if (!job || job.status !== 'Error') return false;
    const retryable = {
      ...job,
      status: job.providerOperationName ? 'Polling' : 'Queued',
      error: undefined,
      retryCount: Number(job.retryCount || 0) + 1,
    };
    await this.persist(retryable);
    void this.run(retryable);
    return true;
  }

  async resumeAll() {
    const jobs = await this.store.readAll();
    for (const job of jobs) {
      if (
        job.providerOperationName &&
        ['Submitting', 'Polling', 'Processing', 'Queued'].includes(job.status)
      ) {
        void this.run(job);
      } else if (
        !job.providerOperationName &&
        ['Submitting', 'Polling', 'Processing'].includes(job.status)
      ) {
        await this.persist({
          ...job,
          status: 'RecoveryRequired',
          error:
            'Submission state is ambiguous after restart. Verify provider activity before retrying.',
        });
      }
    }
    return this.store.readAll();
  }
}

module.exports = { PaidJobEngine, PaidJobStore, buildSubmission, extractVideoUri };
