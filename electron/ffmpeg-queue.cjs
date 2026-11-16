'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Bounded priority FIFO queue for FFmpeg child-process invocations.
 * High-priority tasks (e.g. user-initiated delivery renders) preempt queued background derivatives.
 */
class FFmpegTaskQueue {
  constructor(maxConcurrent = 2) {
    this.maxConcurrent = Math.max(1, Number(maxConcurrent) || 2);
    this.activeCount = 0;
    this.highPriority = [];
    this.normalPriority = [];
  }

  get pendingCount() {
    return this.highPriority.length + this.normalPriority.length;
  }

  enqueue(taskFn, options = {}) {
    const priority = options?.priority === 'high' ? 'high' : 'normal';
    return new Promise((resolve, reject) => {
      const entry = { taskFn, resolve, reject };
      if (priority === 'high') {
        this.highPriority.push(entry);
      } else {
        this.normalPriority.push(entry);
      }
      this._drain();
    });
  }

  _drain() {
    while (this.activeCount < this.maxConcurrent) {
      const next = this.highPriority.shift() ?? this.normalPriority.shift();
      if (!next) break;
      this.activeCount += 1;
      Promise.resolve()
        .then(() => next.taskFn())
        .then(next.resolve, next.reject)
        .finally(() => {
          this.activeCount -= 1;
          this._drain();
        });
    }
  }
}

let sharedQueue = null;

function getSharedFfmpegQueue(maxConcurrent = 2) {
  if (!sharedQueue) {
    sharedQueue = new FFmpegTaskQueue(maxConcurrent);
  }
  return sharedQueue;
}

function resolveFfmpegBinary(runtimeRoot) {
  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  if (runtimeRoot) {
    const candidate = path.join(runtimeRoot, `${process.platform}-${process.arch}`, binaryName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return 'ffmpeg';
}

module.exports = {
  FFmpegTaskQueue,
  getSharedFfmpegQueue,
  resolveFfmpegBinary,
};
