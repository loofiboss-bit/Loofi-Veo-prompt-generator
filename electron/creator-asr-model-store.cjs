'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');

const MODEL_ID = 'onnx-community/whisper-base';
const MODEL_REVISION = '1846881b6b3a3024392c1eea3ad983695bc23925';
const MODEL_SOURCE = `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}/`;
const MODEL_FILES = Object.freeze([
  {
    path: 'added_tokens.json',
    size: 34604,
    sha256: '9715fd2243b6f06a5858b5e32950d2853f73dd5bc201aafcf76f5082a2d8acd1',
  },
  {
    path: 'config.json',
    size: 2243,
    sha256: 'f4d0608f7d918166da7edb3e188de5ef1bfe70d9802e785d271fd88111e9cf4b',
  },
  {
    path: 'generation_config.json',
    size: 3832,
    sha256: '61070cf8de25b1e9256e8e102ded49d8d24a8369ed36ef84fdf21549e68125a0',
  },
  {
    path: 'merges.txt',
    size: 493869,
    sha256: '2df2990a395e35e8dfbc7511e08c12d56018d8d04691e0133e5d63b21e154dc6',
  },
  {
    path: 'normalizer.json',
    size: 52666,
    sha256: 'bf1c507dc8724ca9cf9903640dacfb69dae2f00edee4f21ceba106a7392f26dd',
  },
  {
    path: 'onnx/decoder_model_merged_quantized.onnx',
    size: 53693315,
    sha256: 'fa3ef9902734ce5ae6f9ef2bdb2ba9a6c4b5785b09f4f420ce036573dc9d090b',
  },
  {
    path: 'onnx/encoder_model_quantized.onnx',
    size: 23201314,
    sha256: '5862993336bf33acd23736071aae2b32261d3b1b2f37780194460d4ef974dd46',
  },
  {
    path: 'preprocessor_config.json',
    size: 339,
    sha256: 'a6a76d28c93edb273669eb9e0b0636a2bddbb1272c3261e47b7ca6dfdbac1b8d',
  },
  {
    path: 'special_tokens_map.json',
    size: 2194,
    sha256: 'e67ae3a0aaa99abcd9f187138e12db1f65c16a14761c50ef10eef2c174a7a691',
  },
  {
    path: 'tokenizer.json',
    size: 2480466,
    sha256: '27fc476bfe7f17299480be2273fc0608e4d5a99aba2ab5dec5374b4482d1a566',
  },
  {
    path: 'tokenizer_config.json',
    size: 282682,
    sha256: '2e036e4dbacfdeb7242c7d4ec4149f4a16e86026048f94d1637e3a8ee9c6a573',
  },
  {
    path: 'vocab.json',
    size: 1036584,
    sha256: '50d6a919f0a0601d56a04eb583c780d18553aa388254ba3158eb6a00f13e2c1a',
  },
]);
const MODEL_BYTES = MODEL_FILES.reduce((sum, file) => sum + file.size, 0);

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

function isAllowedRedirect(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'huggingface.co' ||
        url.hostname.endsWith('.huggingface.co') ||
        url.hostname === 'hf.co' ||
        url.hostname.endsWith('.hf.co'))
    );
  } catch {
    return false;
  }
}

function safeRelativePath(relative) {
  return (
    typeof relative === 'string' &&
    relative.length > 0 &&
    !relative.includes('\\') &&
    !relative.includes('\0') &&
    !path.posix.isAbsolute(relative) &&
    relative.split('/').every((part) => part && part !== '.' && part !== '..')
  );
}

class CreatorAsrModelStore {
  constructor({ root, fetchImpl = fetch, manifest = MODEL_FILES } = {}) {
    if (typeof root !== 'string' || !path.isAbsolute(root))
      throw new Error('A local ASR model directory is required.');
    this.root = root;
    this.fetchImpl = fetchImpl;
    this.manifest = manifest;
    this.totalBytes = manifest.reduce((sum, file) => sum + file.size, 0);
    this.installedPath = path.join(root, MODEL_ID, MODEL_REVISION);
    this.installControllers = new Map();
    this.verified = false;
  }

  getManifest() {
    return {
      modelId: MODEL_ID,
      revision: MODEL_REVISION,
      totalBytes: this.totalBytes,
      files: this.manifest.map(({ path: filePath, size }) => ({ path: filePath, size })),
      source: `https://huggingface.co/${MODEL_ID}/tree/${MODEL_REVISION}`,
    };
  }

  async getStatus() {
    const status = { installed: false, revision: MODEL_REVISION, totalBytes: this.totalBytes };
    this.verified = false;
    let marker;
    try {
      marker = JSON.parse(
        await fsp.readFile(path.join(this.installedPath, 'loofi-model-manifest.json'), 'utf8'),
      );
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT')
        return { ...status, state: 'not-installed' };
      return { ...status, state: 'corrupt' };
    }
    if (
      !marker ||
      typeof marker !== 'object' ||
      marker.modelId !== MODEL_ID ||
      marker.revision !== MODEL_REVISION ||
      marker.totalBytes !== this.totalBytes ||
      !Array.isArray(marker.files) ||
      marker.files.length !== this.manifest.length
    )
      return { ...status, state: 'corrupt' };
    try {
      for (const entry of this.manifest) {
        const markedFile = marker.files.find(
          (file) => file && typeof file === 'object' && file.path === entry.path,
        );
        if (markedFile?.size !== entry.size || markedFile?.sha256 !== entry.sha256)
          return { ...status, state: 'corrupt' };
        const filePath = this.resolveFilePath(entry.path);
        const stats = await fsp.stat(filePath);
        if (
          !stats.isFile() ||
          stats.size !== entry.size ||
          (await sha256File(filePath)) !== entry.sha256
        )
          return { ...status, state: 'corrupt' };
      }
      this.verified = true;
      return { ...status, installed: true, state: 'ready' };
    } catch {
      return { ...status, state: 'corrupt' };
    }
  }

  async install(request, onProgress = () => {}) {
    if (
      !request ||
      request.confirmed !== true ||
      request.modelId !== MODEL_ID ||
      request.revision !== MODEL_REVISION ||
      request.confirmedBytes !== this.totalBytes ||
      typeof request.installId !== 'string' ||
      !/^[a-f0-9-]{36}$/i.test(request.installId)
    )
      throw new Error('ASR model installation requires confirmation of the pinned model and size.');
    if (this.installControllers.has(request.installId))
      throw new Error('Duplicate ASR install request.');
    const controller = new AbortController();
    this.installControllers.set(request.installId, controller);
    const stagePath = `${this.installedPath}.${request.installId}.partial`;
    let totalLoaded = 0;
    let lastReported = 0;
    try {
      if ((await this.getStatus()).installed) return this.getStatus();
      if (controller.signal.aborted) throw new Error('ASR model installation cancelled.');
      await fsp.rm(stagePath, { recursive: true, force: true });
      await fsp.mkdir(stagePath, { recursive: true, mode: 0o700 });
      for (const entry of this.manifest) {
        if (controller.signal.aborted) throw new Error('ASR model installation cancelled.');
        onProgress({
          installId: request.installId,
          status: 'downloading',
          file: entry.path,
          loadedBytes: totalLoaded,
          totalBytes: this.totalBytes,
        });
        const url = new URL(entry.path, MODEL_SOURCE);
        const response = await this.fetchImpl(url, {
          signal: controller.signal,
          redirect: 'follow',
        });
        if (!response.ok) throw new Error(`ASR model download failed (${response.status}).`);
        if (!isAllowedRedirect(response.url || url.href))
          throw new Error('ASR model download redirected outside the approved model host.');
        if (!response.body) throw new Error('ASR model download returned no file data.');

        const destination = path.join(stagePath, entry.path);
        await fsp.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
        const temporaryFile = `${destination}.partial`;
        const hash = crypto.createHash('sha256');
        let fileBytes = 0;
        const counter = new Transform({
          transform: (chunk, _encoding, callback) => {
            const buffer = Buffer.from(chunk);
            hash.update(buffer);
            fileBytes += buffer.length;
            totalLoaded += buffer.length;
            const now = Date.now();
            if (now - lastReported >= 100) {
              lastReported = now;
              onProgress({
                installId: request.installId,
                file: entry.path,
                loadedBytes: totalLoaded,
                totalBytes: this.totalBytes,
              });
            }
            callback(null, buffer);
          },
        });
        const handle = await fsp.open(temporaryFile, 'wx', 0o600);
        await handle.close();
        try {
          await pipeline(
            Readable.fromWeb(response.body),
            counter,
            fs.createWriteStream(temporaryFile),
            {
              signal: controller.signal,
            },
          );
          onProgress({
            installId: request.installId,
            status: 'verifying',
            file: entry.path,
            loadedBytes: totalLoaded,
            totalBytes: this.totalBytes,
          });
          const digest = hash.digest('hex');
          if (fileBytes !== entry.size || digest !== entry.sha256)
            throw new Error(`ASR model integrity check failed for ${entry.path}.`);
          await fsp.rename(temporaryFile, destination);
        } catch (error) {
          await fsp.rm(temporaryFile, { force: true });
          throw error;
        }
      }

      const marker = {
        schemaVersion: 1,
        modelId: MODEL_ID,
        revision: MODEL_REVISION,
        totalBytes: this.totalBytes,
        installedAt: new Date().toISOString(),
        files: this.manifest.map(({ path: filePath, size, sha256 }) => ({
          path: filePath,
          size,
          sha256,
        })),
      };
      await fsp.writeFile(
        path.join(stagePath, 'loofi-model-manifest.json'),
        JSON.stringify(marker),
        {
          mode: 0o600,
        },
      );
      await fsp.mkdir(path.dirname(this.installedPath), { recursive: true, mode: 0o700 });
      await fsp.rm(this.installedPath, { recursive: true, force: true });
      await fsp.rename(stagePath, this.installedPath);
      this.verified = true;
      onProgress({
        installId: request.installId,
        status: 'ready',
        file: null,
        loadedBytes: this.totalBytes,
        totalBytes: this.totalBytes,
        complete: true,
      });
      return this.getStatus();
    } catch (error) {
      await fsp.rm(stagePath, { recursive: true, force: true }).catch(() => undefined);
      if (controller.signal.aborted) throw new Error('ASR model installation cancelled.');
      throw error;
    } finally {
      this.installControllers.delete(request.installId);
    }
  }

  cancel(installId) {
    const controller = this.installControllers.get(installId);
    if (!controller) return false;
    controller.abort();
    return true;
  }

  async remove() {
    if (this.installControllers.size)
      throw new Error('Cancel ASR model installation before removal.');
    await fsp.rm(this.installedPath, { recursive: true, force: true });
    this.verified = false;
    return {
      installed: false,
      state: 'not-installed',
      revision: MODEL_REVISION,
      totalBytes: this.totalBytes,
    };
  }

  resolveFilePath(relative) {
    if (!safeRelativePath(relative) || !this.manifest.some((entry) => entry.path === relative))
      throw new Error('Unapproved local ASR model file.');
    return path.join(this.installedPath, relative);
  }

  async resolveFile(relative) {
    const status = this.verified ? { installed: true } : await this.getStatus();
    if (!status.installed) return null;
    const filePath = this.resolveFilePath(relative);
    try {
      return (await fsp.stat(filePath)).isFile() ? filePath : null;
    } catch {
      return null;
    }
  }
}

module.exports = {
  CreatorAsrModelStore,
  MODEL_BYTES,
  MODEL_FILES,
  MODEL_ID,
  MODEL_REVISION,
};
