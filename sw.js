const CACHE_NAME = 'veo-prompt-generator-v11.0.0';
const urlsToCache = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
];

const DB_NAME = 'veo-generator-db';
const STORE_NAME = 'jobs';

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

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
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
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(sanitizedJob);
    transaction.oncomplete = () => resolve(sanitizedJob);
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getJob(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllJobs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

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

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
            return false;
          }),
        ),
      ),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request.clone()).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return response;
      });
    }),
  );
});

// Paid execution is intentionally unavailable in the service worker. Jobs are retained only so
// older browser sessions receive an explicit, recoverable failure instead of silently spending.
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'ADD_JOB' || type === 'START_JOB') {
    const blockedPayload = {
      ...payload,
      status: 'Error',
      error:
        'Paid generation requires the desktop approval boundary. Service-worker execution is disabled.',
    };
    void saveJob(blockedPayload).then(() => broadcastUpdate(blockedPayload));
  } else if (type === 'CANCEL_JOB' && payload?.id) {
    void getJob(payload.id).then((job) => {
      if (!job) return;
      const cancelled = { ...job, status: 'Error', error: 'Cancelled by user' };
      void saveJob(cancelled).then(() => broadcastUpdate(cancelled));
    });
  } else if (type === 'GET_STATUS' && payload?.id) {
    void getJob(payload.id).then((job) => {
      if (job && event.source) {
        event.source.postMessage({ type: 'JOB_STATUS', payload: job });
      }
    });
  } else if (type === 'SYNC_STATE' || type === 'RESUME_QUEUED_JOBS') {
    void broadcastAll();
  }
});
