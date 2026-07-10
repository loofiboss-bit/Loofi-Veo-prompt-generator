const CACHE_NAME = 'veo-prompt-generator-v7.0.0';
const urlsToCache = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
];

// --- Generator Constants & Helpers ---
const DB_NAME = 'veo-generator-db';
const STORE_NAME = 'jobs';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function stripApiKeyFromVideoUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') {
    return videoUrl ?? null;
  }

  return videoUrl.replace(/([?&])key=[^&]+&?/g, '$1').replace(/[?&]$/, '');
}

function sanitizeJob(job) {
  if (!job || typeof job !== 'object') {
    return job;
  }

  const { apiKey: _apiKey, ...rest } = job;
  return {
    ...rest,
    videoUrl: stripApiKeyFromVideoUrl(rest.videoUrl ?? null),
  };
}

// --- IndexedDB Helpers ---
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveJob(job) {
  const sanitizedJob = sanitizeJob(job);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(sanitizedJob);
    tx.oncomplete = () => resolve(sanitizedJob);
    tx.onerror = () => reject(tx.error);
  });
}

async function _getJob(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllJobs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- Communication ---
async function broadcastUpdate(job) {
  const sanitizedJob = sanitizeJob(job);
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'JOB_UPDATE', payload: sanitizedJob });
  });
}

async function broadcastAll() {
  const jobs = (await getAllJobs()).map((job) => sanitizeJob(job));
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_STATE', payload: jobs });
  });
}

// --- Active job tracking for cancellation ---
const activeAbortControllers = new Map();
let replayPromise = null;

function isQueuedStatus(status) {
  return status === 'Queued' || status === 'queued';
}

function isProcessingStatus(status) {
  return (
    status === 'Processing' ||
    status === 'processing' ||
    status === 'Submitting' ||
    status === 'Polling'
  );
}

function normalizeReplayCandidate(job) {
  if (job.providerOperationName) {
    return {
      ...job,
      status: 'Queued',
      error: undefined,
    };
  }
  if (isProcessingStatus(job.status)) {
    return {
      ...job,
      status: 'RecoveryRequired',
      error:
        job.error ||
        'Submission state is ambiguous. Review the provider account before submitting again.',
    };
  }

  return job;
}

// --- Thin Executor: runs a single video generation job ---
// Main-thread sends START_JOB; SW executes and reports status via JOB_UPDATE.
// No queue logic here — the main-thread GenerationQueueService owns orchestration.
async function runJob(job, apiKeyOverride) {
  if (activeAbortControllers.has(job.id)) {
    return;
  }

  const ac = new AbortController();
  activeAbortControllers.set(job.id, ac);

  const apiKey = apiKeyOverride || job.apiKey;

  try {
    if (!apiKey) {
      throw new Error('Missing API key for queued generation job.');
    }

    const modelName =
      job.request?.modelId ||
      (job.settings.veoModel === 'quality'
        ? 'veo-3.1-generate-preview'
        : 'veo-3.1-fast-generate-preview');

    let operationName = job.providerOperationName || null;

    if (!operationName) {
      job.status = 'Submitting';
      await saveJob(job);
      await broadcastUpdate(job);

      const url = `${API_BASE}/models/${modelName}:predictLongRunning?key=${apiKey}`;
      const request = job.request;
      const executionInputs = job.executionInputs || {};
      const instance = { prompt: request?.prompt || job.prompt };

      if (!request || request.mode === 'image-to-video' || request.mode === 'interpolation') {
        const firstFrame = executionInputs.firstFrame || job.inputImage;
        if (firstFrame) {
          instance.image = {
            bytesBase64Encoded: firstFrame.data,
            mimeType: firstFrame.mimeType,
          };
        }
      }
      if (request?.mode === 'interpolation' && executionInputs.lastFrame) {
        instance.lastFrame = {
          bytesBase64Encoded: executionInputs.lastFrame.data,
          mimeType: executionInputs.lastFrame.mimeType,
        };
      }
      if (request?.mode === 'reference-images' && executionInputs.referenceImages?.length) {
        instance.referenceImages = executionInputs.referenceImages.map((image) => ({
          image: {
            bytesBase64Encoded: image.data,
            mimeType: image.mimeType,
          },
          referenceType: 'asset',
        }));
      }
      if (request?.mode === 'extension') {
        const extensionUri =
          executionInputs.extensionVideoUri || request.extensionArtifact?.mediaUri;
        if (extensionUri) {
          instance.video = { uri: extensionUri };
        }
      }

      const body = {
        instances: [instance],
        parameters: {
          sampleCount: 1,
          resolution: request?.resolution || job.settings.resolution,
          aspectRatio: request?.aspectRatio || job.settings.aspectRatio,
          durationSeconds: request?.durationSeconds || job.settings.durationSeconds || 8,
          negativePrompt: request?.negativePrompt || undefined,
          seed: request?.seed,
        },
      };

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: ac.signal,
        });
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        job.status = 'RecoveryRequired';
        job.error =
          'The submission response was not received. The job was not resubmitted automatically.';
        await saveJob(job);
        await broadcastUpdate(job);
        return;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText}`);
      }

      const initialRes = await response.json();
      operationName = initialRes.name;
      if (!operationName) {
        throw new Error('Generation submission did not return an operation name.');
      }
      job.providerOperationName = operationName;
      await saveJob(job);
      await broadcastUpdate(job);
    }

    job.status = 'Polling';
    await saveJob(job);
    await broadcastUpdate(job);

    let videoUri = null;

    while (!videoUri) {
      if (ac.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      await new Promise((r) => setTimeout(r, 5000)); // Poll every 5s

      const pollUrl = `${API_BASE}/${operationName}?key=${apiKey}`;
      const pollRes = await fetch(pollUrl, { signal: ac.signal });
      const pollData = await pollRes.json();

      if (pollData.error) {
        throw new Error(pollData.error.message || 'Operation failed');
      }

      if (pollData.done) {
        if (
          pollData.response &&
          ((pollData.response.generatedVideos && pollData.response.generatedVideos.length > 0) ||
            (pollData.response.generateVideoResponse?.generatedSamples &&
              pollData.response.generateVideoResponse.generatedSamples.length > 0))
        ) {
          videoUri =
            pollData.response.generatedVideos?.[0]?.video?.uri ||
            pollData.response.generateVideoResponse.generatedSamples?.[0]?.video?.uri;
        } else {
          throw new Error('Generation finished but no video returned.');
        }
      }
    }

    // 4. Complete
    job.status = 'Complete';
    job.videoUrl = videoUri;
    job.providerMediaUri = videoUri;
    job.providerExpiresAt = Date.now() + 2 * 24 * 60 * 60 * 1000;

    await saveJob(job);
    await broadcastUpdate(job);

    // 5. Notify
    if (self.registration.showNotification) {
      self.registration.showNotification('Veo Render Complete', {
        body: `Your video for "${job.prompt.substring(0, 20)}..." is ready.`,
        icon: 'icon-192x192.png',
      });
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      job.status = 'Error';
      job.error = 'Cancelled by user';
    } else {
      console.error('Job failed', error);
      job.status = 'Error';
      job.error = error.message;
    }
    await saveJob(job);
    await broadcastUpdate(job);
  } finally {
    activeAbortControllers.delete(job.id);
  }
}

// --- Legacy queue processing (backward-compat for direct ADD_JOB) ---
async function processQueue(apiKey) {
  if (replayPromise) {
    return replayPromise;
  }

  replayPromise = (async () => {
    const jobs = await getAllJobs();
    const replayCandidates = jobs
      .map(normalizeReplayCandidate)
      .filter((job) => isQueuedStatus(job.status))
      .sort((a, b) => {
        const left = typeof a.createdAt === 'number' ? a.createdAt : 0;
        const right = typeof b.createdAt === 'number' ? b.createdAt : 0;
        return left - right;
      });

    for (const job of replayCandidates) {
      if (!isQueuedStatus(job.status)) {
        continue;
      }

      // Persist normalized state before replaying to avoid silent drops after restarts.
      await saveJob(job);

      const keyForJob = apiKey || job.apiKey;
      await runJob(job, keyForJob);
    }
  })();

  try {
    await replayPromise;
  } finally {
    replayPromise = null;
  }
}

// --- Main Service Worker Lifecycle ---

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Take control of all pages immediately
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          }),
        );
      }),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      const fetchRequest = event.request.clone();
      return fetch(fetchRequest)
        .then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Only cache valid static assets, not API calls or dynamic content if possible
          // For simple PWA, we cache everything successfully fetched
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If offline and request fails, we can check if it's navigation to return index.html
          // But this SW setup is basic.
        });
    }),
  );
});

// --- Generator Message Handler ---
self.addEventListener('message', (event) => {
  const { type, payload, apiKey } = event.data;

  if (type === 'ADD_JOB') {
    // Legacy: direct job add (backward-compat)
    saveJob(payload).then(() => {
      broadcastUpdate(payload); // Ack receipt
      processQueue(apiKey);
    });
  } else if (type === 'START_JOB') {
    // v2.5.0: Main-thread orchestrated — run a single job
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const queuedPayload = {
        ...payload,
        status: 'Queued',
        error: 'Queued while offline. Will resume when connection returns.',
      };

      saveJob(queuedPayload).then(() => {
        broadcastUpdate(queuedPayload);
      });
      return;
    }

    saveJob(payload).then(() => {
      runJob(payload, apiKey);
    });
  } else if (type === 'CANCEL_JOB') {
    // v2.5.0: Cancel a running job
    const ac = activeAbortControllers.get(payload.id);
    if (ac) {
      ac.abort();
    }
  } else if (type === 'GET_STATUS') {
    // v2.5.0: Return status of a specific job
    if (payload && payload.id) {
      _getJob(payload.id).then((job) => {
        if (job && event.source) {
          event.source.postMessage({ type: 'JOB_STATUS', payload: job });
        }
      });
    }
  } else if (type === 'SYNC_STATE') {
    broadcastAll();
  } else if (type === 'RESUME_QUEUED_JOBS') {
    processQueue(apiKey);
  }
});
