
const DB_NAME = 'veo-generator-db';
const STORE_NAME = 'jobs';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

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
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(job);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getJob(id) {
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
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'JOB_UPDATE', payload: job });
  });
}

async function broadcastAll() {
  const jobs = await getAllJobs();
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_STATE', payload: jobs });
  });
}

// --- API Logic ---
async function processQueue(apiKey) {
  const jobs = await getAllJobs();
  const queued = jobs.filter(j => j.status === 'Queued');

  for (const job of queued) {
    await runJob(job, apiKey);
  }
}

async function runJob(job, apiKey) {
  try {
    // 1. Init
    job.status = 'Processing';
    await saveJob(job);
    await broadcastUpdate(job);

    const modelName = job.settings.veoModel === 'quality' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
    const url = `${API_BASE}/models/${modelName}:generateVideos?key=${apiKey}`;

    // Payload construction
    const body = {
      prompt: job.prompt,
      config: {
        numberOfVideos: 1,
        resolution: job.settings.resolution,
        aspectRatio: job.settings.aspectRatio
      }
    };

    if (job.inputImage) {
        body.image = {
            imageBytes: job.inputImage.data,
            mimeType: job.inputImage.mimeType
        };
    }

    // 2. Start Generation
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText}`);
    }

    const initialRes = await response.json();
    let operationName = initialRes.name; // "operations/..."

    // 3. Poll
    job.status = 'Polling';
    await saveJob(job);
    await broadcastUpdate(job);

    let videoUri = null;
    
    while (!videoUri) {
        await new Promise(r => setTimeout(r, 5000)); // Poll every 5s
        
        const pollUrl = `${API_BASE}/${operationName}?key=${apiKey}`;
        const pollRes = await fetch(pollUrl);
        const pollData = await pollRes.json();

        if (pollData.error) {
            throw new Error(pollData.error.message || "Operation failed");
        }

        if (pollData.done) {
            if (pollData.response && pollData.response.generatedVideos && pollData.response.generatedVideos.length > 0) {
                videoUri = pollData.response.generatedVideos[0].video.uri;
            } else {
                throw new Error("Generation finished but no video returned.");
            }
        }
    }

    // 4. Fetch Result (We store the download link, hook handles fetching actual blob to avoid filling IDB with huge blobs)
    // Actually, to be robust offline, strictly we should cache the blob, but for this step we store the URI
    // and let the client fetch it.
    
    // NOTE: We need to append key for the client to fetch it
    const finalDownloadLink = `${videoUri}&key=${apiKey}`;
    
    // Fetch blob here to ensure it's "done" and maybe cache in CacheStorage if needed, 
    // but simply passing the authenticated link back is usually enough for the UI to display.
    // However, to notify "Render Complete", the worker has done its job.

    job.status = 'Complete';
    job.videoUrl = finalDownloadLink; // This is a remote URL. Client will fetch.
    
    await saveJob(job);
    await broadcastUpdate(job);

    // 5. Notify
    if (self.registration.showNotification) {
        self.registration.showNotification("Veo Render Complete", {
            body: `Your video for "${job.prompt.substring(0, 20)}..." is ready.`,
            icon: '/icon-192x192.png'
        });
    }

  } catch (error) {
    console.error('Job failed', error);
    job.status = 'Error';
    job.error = error.message;
    await saveJob(job);
    await broadcastUpdate(job);
  }
}

// --- Event Listeners ---

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const { type, payload, apiKey } = event.data;

  if (type === 'ADD_JOB') {
    saveJob(payload).then(() => {
        broadcastUpdate(payload); // Ack receipt
        processQueue(apiKey);
    });
  } else if (type === 'SYNC_STATE') {
    broadcastAll();
  }
});
