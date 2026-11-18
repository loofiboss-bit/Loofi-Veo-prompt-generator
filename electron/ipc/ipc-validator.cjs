'use strict';

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,160}$/;
// Media identities are opaque store keys, not paths. Local and external imports
// use a namespaced `prefix:identifier`; path separators remain forbidden.
const SAFE_MEDIA_KEY = /^[a-zA-Z0-9_:\-.]{1,250}$/;
const MAX_BACKUP_DEPTH = 24;
const MAX_BACKUP_SNAPSHOT_BYTES = 15 * 1024 * 1024;

function assertSnapshotDepthWithinLimit(value, depth = 0, seen = new WeakSet()) {
  if (depth > MAX_BACKUP_DEPTH) {
    throw new Error(
      `Invalid project backup payload: snapshot nesting exceeds ${MAX_BACKUP_DEPTH} levels.`,
    );
  }
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) {
    throw new Error('Invalid project backup payload: circular reference detected.');
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      for (const item of value) {
        assertSnapshotDepthWithinLimit(item, depth + 1, seen);
      }
    } else {
      for (const propValue of Object.values(value)) {
        assertSnapshotDepthWithinLimit(propValue, depth + 1, seen);
      }
    }
  } finally {
    seen.delete(value);
  }
}

function validateProjectId(projectId, label = 'project ID') {
  if (typeof projectId !== 'string' || !SAFE_ID_PATTERN.test(projectId.trim())) {
    throw new Error(`Invalid ${label}: must be an alphanumeric identifier.`);
  }
  return projectId.trim();
}

function validateBackupId(id) {
  if (typeof id !== 'string' || !/^[0-9a-f-]+\.backup\.json$/.test(id.trim())) {
    throw new Error('Invalid backup ID format.');
  }
  return id.trim();
}

function validateProjectBackupSaveInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid project backup payload: input must be an object.');
  }
  const projectId = validateProjectId(input.projectId);
  if (!input.snapshot || typeof input.snapshot !== 'object' || Array.isArray(input.snapshot)) {
    throw new Error('Invalid project backup payload: snapshot must be an object.');
  }
  assertSnapshotDepthWithinLimit(input.snapshot);
  const serialized = JSON.stringify(input.snapshot);
  if (typeof serialized !== 'string') {
    throw new Error('Invalid project backup payload: snapshot could not be serialized.');
  }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_BACKUP_SNAPSHOT_BYTES) {
    throw new Error(
      `Invalid project backup payload: snapshot exceeds ${MAX_BACKUP_SNAPSHOT_BYTES} bytes limit.`,
    );
  }
  return { projectId, snapshot: input.snapshot };
}

function validateProjectBackupRestoreInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid project backup restore payload: input must be an object.');
  }
  const projectId = validateProjectId(input.projectId);
  const id = validateBackupId(input.id);
  return { projectId, id };
}

function validateMediaKey(key) {
  if (typeof key !== 'string' || !key.trim() || !SAFE_MEDIA_KEY.test(key.trim())) {
    throw new Error('Invalid media storage key.');
  }
  return key.trim();
}

function validateMediaCacheInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid desktop media cache payload.');
  }
  if (typeof input.url !== 'string' || !input.url.trim()) {
    throw new Error('Invalid desktop media cache payload: missing URL.');
  }
  return input;
}

function validateMediaRelinkInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid desktop media relink payload.');
  }
  const key = validateMediaKey(input.key);
  if (typeof input.candidatePath !== 'string' || !input.candidatePath.trim()) {
    throw new Error('Invalid desktop media relink payload: candidatePath must be a string.');
  }
  return { key, candidatePath: input.candidatePath.trim() };
}

function validatePaidTaskInput(task) {
  if (!task || typeof task !== 'object' || typeof task.id !== 'string' || !task.id.trim()) {
    throw new Error('Invalid paid job submission: task id is required.');
  }
  if (!task.request || typeof task.request !== 'object') {
    throw new Error('Invalid paid job submission: task request is required.');
  }
  return task;
}

function validateProjectDbCommitInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid project DB commit payload: input must be an object.');
  }
  const projectId = validateProjectId(input.projectId || input.document?.id);
  if (
    input.expectedRevision !== undefined &&
    (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0)
  ) {
    throw new Error('Invalid project DB expectedRevision.');
  }
  if (input.document !== undefined) {
    if (!input.document || typeof input.document !== 'object' || Array.isArray(input.document)) {
      throw new Error('Invalid project DB commit payload: document must be an object.');
    }
    assertSnapshotDepthWithinLimit(input.document);
  }
  if (input.delta !== undefined) {
    if (!input.delta || typeof input.delta !== 'object' || Array.isArray(input.delta)) {
      throw new Error('Invalid project DB commit payload: delta must be an object.');
    }
    assertSnapshotDepthWithinLimit(input.delta);
  }
  return {
    projectId,
    expectedRevision: input.expectedRevision,
    preserveRevision: Boolean(input.preserveRevision),
    document: input.document,
    delta: input.delta,
  };
}

module.exports = {
  SAFE_ID_PATTERN,
  SAFE_MEDIA_KEY,
  validateProjectId,
  validateBackupId,
  validateProjectBackupSaveInput,
  validateProjectBackupRestoreInput,
  validateMediaKey,
  validateMediaCacheInput,
  validateMediaRelinkInput,
  validatePaidTaskInput,
  validateProjectDbCommitInput,
};
