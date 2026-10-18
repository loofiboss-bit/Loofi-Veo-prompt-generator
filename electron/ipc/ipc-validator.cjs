'use strict';

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,160}$/;
const SAFE_MEDIA_KEY = /^[a-zA-Z0-9_\-\.]{1,250}$/;

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
  if (!input.snapshot || typeof input.snapshot !== 'object') {
    throw new Error('Invalid project backup payload: snapshot must be an object.');
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
};
