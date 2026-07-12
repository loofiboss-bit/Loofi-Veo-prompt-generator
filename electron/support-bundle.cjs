'use strict';

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z_-]{20,}/g,
  /(?:api[_ -]?key|authorization|token|secret)\s*[:=]\s*[^\s,;]+/gi,
  /[?&]key=[^&\s]+/gi,
];

function redactText(value) {
  return SECRET_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, '[REDACTED]'),
    String(value),
  );
}

function sanitizeJob(job) {
  return {
    id: job.id,
    status: job.status,
    modelId: job.request?.modelId || job.settings?.veoModel,
    providerOperationName: job.providerOperationName,
    error: job.error ? redactText(job.error) : undefined,
    createdAt: job.createdAt || job.timestamp,
    updatedAt: job.updatedAt,
    hasLocalMedia: Boolean(job.localMediaKey || job.videoUrl),
  };
}

function buildSupportSnapshot(input) {
  return {
    schemaVersion: 1,
    createdAt: new Date(input.now ?? Date.now()).toISOString(),
    app: input.app,
    platform: input.platform,
    safeMode: input.safeMode,
    provider: { configured: Boolean(input.providerConfigured), credentialsIncluded: false },
    storage: input.storage,
    jobs: (input.jobs || []).map(sanitizeJob),
    logs: (input.logs || []).map(redactText),
  };
}

module.exports = { buildSupportSnapshot, redactText, sanitizeJob };
