import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
const { CreatorRenderEngine, validatePlan, planHash, srt, ass } = require('./creator-render.cjs');
const { registerCreatorRenderIpc } = require('./ipc/creator-render-ipc.cjs');
function plan(changes = {}) {
  const p = {
    schemaVersion: 1,
    projectId: 'project',
    projectName: 'Example',
    durationSeconds: 2,
    fps: 30,
    aspectRatio: '1:1',
    resolution: '720p',
    clips: [
      {
        id: 'clip',
        mediaId: 'registered',
        type: 'image',
        startTime: 0,
        duration: 2,
        offset: 0,
        volume: 1,
        crop: { mode: 'fit', x: 0.5, y: 0.5 },
      },
    ],
    captions: [
      { id: 'caption', text: 'Hej världen 日本語', startTime: 0, endTime: 1, style: 'classic' },
    ],
    captionsMode: 'burn-in',
    captionStyle: 'classic',
    safeMargin: 0.05,
    title: 'Title',
    description: 'Description',
    ...changes,
  };
  p.contentHash = planHash(p);
  return p;
}
test('validates frozen canonical snapshot and rejects mutated hash', () => {
  const p = plan();
  assert.deepEqual(validatePlan(p), p);
  p.title = 'changed';
  assert.throws(() => validatePlan(p), /hash/);
  assert.equal(planHash(plan()), planHash({ ...plan(), description: 'Description' }));
});
test('rejects unsupported bounds, paths, timings and overlap with clip identity', () => {
  for (const changes of [
    { fps: 60 },
    { durationSeconds: 181 },
    { safeMargin: 0.9 },
    { resolution: '4k' },
    { captions: [{ id: 'c', text: 'bad', startTime: 2, endTime: 1 }] },
  ])
    assert.throws(() => validatePlan(plan(changes)));
  const p = plan();
  p.clips[0].mediaId = '/etc/passwd';
  p.contentHash = planHash(p);
  assert.throws(() => validatePlan(p), /clip/);
});
test('SRT preserves unicode and millisecond timings', () => {
  assert.match(srt(plan()), /00:00:00,000 --> 00:00:01,000/);
  assert.match(srt(plan()), /日本語/);
});
test('ASS explicitly selects bundled Arabic and Japanese fonts without a system provider', () => {
  const subtitles = ass(
    plan({
      captions: [{ id: 'c', text: 'Hej العربية 日本語', startTime: 0, endTime: 2 }],
      captionStyle: 'karaoke',
    }),
  );
  assert.match(subtitles, /\\fnNoto Sans Arabic/);
  assert.match(subtitles, /\\fnNoto Sans CJK JP/);
});
test('missing verified runtime reports unavailable rather than using host binary', async () => {
  const engine = new CreatorRenderEngine({
    root: '/tmp/not-used',
    runtimeRoot: '/nonexistent',
    getMediaStore: () => null,
  });
  assert.equal((await engine.capabilities()).available, false);
  await assert.rejects(engine.start(plan()));
});
test('concurrent start requests reserve one render before asynchronous capability checks', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-start-reservation-'));
  try {
    const engine = new CreatorRenderEngine({ root, runtimeRoot: '/unused' });
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    engine.capabilities = async () => {
      await gate;
      return { available: true };
    };
    engine.render = async () => {};
    const first = engine.start(plan());
    await assert.rejects(engine.start(plan()), /Another export/);
    release();
    await first;
    assert.equal(engine.jobs.size, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
for (const code of ['ENOSPC', 'EACCES'])
  test(`save ${code} preserves the previous verified delivery`, async (context) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-save-fault-'));
    try {
      const directory = path.join(root, 'job');
      await fs.mkdir(directory);
      const bytes = Buffer.from('verified render');
      await fs.writeFile(path.join(directory, 'output.mp4'), bytes);
      const destination = path.join(root, 'previous.mp4');
      await fs.writeFile(destination, 'prior delivery');
      const engine = new CreatorRenderEngine({ root, runtimeRoot: '/unused' });
      engine.jobs.set('job', {
        job: { id: 'job', status: 'complete' },
        directory,
        outputSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      });
      context.mock.method(fs, 'copyFile', async () => {
        throw Object.assign(new Error(code), { code });
      });
      await assert.rejects(engine.save('job', destination), { code });
      assert.equal(await fs.readFile(destination, 'utf8'), 'prior delivery');
      assert.equal(
        (await fs.readdir(root)).some((name) => name.endsWith('.partial')),
        false,
      );
    } finally {
      context.mock.restoreAll();
      await fs.rm(root, { recursive: true, force: true });
    }
  });
test('IPC rejects other renderer and subframe, save only uses native destination', async () => {
  const handlers = {};
  const mainFrame = {};
  const window = { webContents: { mainFrame } };
  const engine = {
    capabilities: () => ({ available: true }),
    get: () => ({ status: 'complete' }),
    save: (_id, file, pkg) => ({ saved: true, file, pkg }),
  };
  registerCreatorRenderIpc({
    ipcMain: { handle: (name, fn) => (handlers[name] = fn) },
    getEngine: () => engine,
    getMainWindow: () => window,
    dialog: { showSaveDialog: async () => ({ canceled: false, filePath: '/chosen/video.mp4' }) },
  });
  assert.throws(() => handlers['timeline-render-capabilities']({ sender: {} }), /Untrusted/);
  assert.throws(
    () => handlers['timeline-render-capabilities']({ sender: window.webContents, senderFrame: {} }),
    /Untrusted/,
  );
  const result = await handlers['timeline-render-save'](
    { sender: window.webContents, senderFrame: mainFrame },
    { id: 'job', package: false, path: '/malicious' },
  );
  assert.equal(result.file, '/chosen/video.mp4');
});
test('restart exposes interrupted job and cannot save it', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-restart-'));
  try {
    const id = '12345678-1234-1234-1234-123456789012';
    await fs.mkdir(path.join(root, id));
    await fs.writeFile(
      path.join(root, id, 'job.json'),
      JSON.stringify({ id, status: 'rendering' }),
    );
    const engine = new CreatorRenderEngine({ root, runtimeRoot: '/nonexistent' });
    await engine.initialize();
    assert.equal(engine.get(id).status, 'failed');
    await assert.rejects(engine.save(id, path.join(root, 'bad.mp4')), /not complete/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
let realBinary =
  process.env.CREATOR_TEST_FFMPEG_DIRECTORY ||
  path.resolve('packaging/media-runtime', `${process.platform}-${process.arch}`);
try {
  await fs.access(path.join(realBinary, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'));
} catch {
  realBinary = undefined;
}
test(
  'real offline render verifies H264 AAC unicode captions, gap, crop, audio and publication ZIP',
  { skip: !realBinary },
  async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-real-'));
    try {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA1kAAAAASUVORK5CYII=',
        'base64',
      );
      const { promisify } = require('node:util');
      const execFile = promisify(require('node:child_process').execFile);
      const binary = path.join(realBinary, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
      const logoFile = path.join(root, 'logo-source.png');
      await execFile(binary, [
        '-hide_banner',
        '-nostdin',
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=c=red:s=64x32',
        '-frames:v',
        '1',
        logoFile,
      ]);
      const logo = await fs.readFile(logoFile);
      const engine = new CreatorRenderEngine({
        root,
        runtimeRoot: '/unused',
        fontsRoot: path.resolve('public/creator-fonts'),
        getMediaStore: () => ({
          read: async (id) => ({ bytes: id === 'logo' ? logo : png, mimeType: 'image/png' }),
        }),
      });
      engine.binaryDirectory = realBinary;
      engine.capabilities = async () => ({ available: true, version: 'test-only-vendor-nightly' });
      const p = plan({
        style: {
          fontFamily: 'Noto Sans',
          primaryColor: '#336699',
          textColor: '#FFFFFF',
          logoAssetId: 'logo',
        },
      });
      p.clips[0].startTime = 0.5;
      p.clips[0].duration = 1.5;
      p.contentHash = planHash(p);
      const job = await engine.start(p);
      while (['queued', 'rendering', 'verifying'].includes(engine.get(job.id).status))
        await new Promise((r) => setTimeout(r, 50));
      assert.equal(engine.get(job.id).status, 'complete', engine.get(job.id).error);
      const metadata = await engine.probe(path.join(root, job.id, 'output.mp4'));
      assert.equal(metadata.streams[0].width, 720);
      assert.equal(metadata.streams[0].codec_name, 'h264');
      const pixel = await execFile(
        binary,
        [
          '-v',
          'error',
          '-ss',
          '0.25',
          '-i',
          path.join(root, job.id, 'output.mp4'),
          '-vf',
          'crop=16:16:620:50,scale=1:1',
          '-frames:v',
          '1',
          '-pix_fmt',
          'rgb24',
          '-f',
          'rawvideo',
          'pipe:1',
        ],
        { encoding: 'buffer' },
      );
      assert.ok(
        pixel.stdout[0] > 180 && pixel.stdout[1] < 60 && pixel.stdout[2] < 60,
        'red logo is visible in the verified export',
      );
      const reviewPlan = { ...p, purpose: 'preview' };
      reviewPlan.contentHash = planHash(reviewPlan);
      const review = await engine.start(reviewPlan);
      while (['queued', 'rendering', 'verifying'].includes(engine.get(review.id).status))
        await new Promise((r) => setTimeout(r, 50));
      assert.equal(engine.get(review.id).status, 'complete', engine.get(review.id).error);
      assert.equal(
        crypto
          .createHash('sha256')
          .update(await fs.readFile(path.join(root, review.id, 'output.mp4')))
          .digest('hex'),
        crypto
          .createHash('sha256')
          .update(await fs.readFile(path.join(root, job.id, 'output.mp4')))
          .digest('hex'),
        '720p review and delivery use the identical compositing pipeline',
      );
      await engine.save(job.id, path.join(root, 'publication.zip'), true);
      const JSZip = require('jszip');
      const zip = await JSZip.loadAsync(await fs.readFile(path.join(root, 'publication.zip')));
      assert.ok(zip.file('video.mp4'));
      assert.ok(zip.file('cover.png'));
      assert.ok(zip.file('captions.srt'));
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  },
);
test(
  'real source trim, overlap dissolve, visual fade, audio mixing and failure preservation',
  { skip: !realBinary },
  async () => {
    const { promisify } = await import('node:util');
    const { execFile } = await import('node:child_process');
    const exec = promisify(execFile);
    const binary = path.join(realBinary, 'ffmpeg' + (process.platform === 'win32' ? '.exe' : ''));
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-real-mix-'));
    try {
      const red = path.join(root, 'red.mp4');
      const blue = path.join(root, 'blue.mp4');
      const sound = path.join(root, 'sound.wav');
      for (const [file, color] of [
        [red, 'red'],
        [blue, 'blue'],
      ])
        await exec(binary, [
          '-y',
          '-f',
          'lavfi',
          '-i',
          `color=${color}:s=160x90:r=30:d=3`,
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          file,
        ]);
      await exec(binary, [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=48000:duration=3',
        sound,
      ]);
      const sources = { red, blue, sound };
      const engine = new CreatorRenderEngine({
        root: path.join(root, 'jobs'),
        runtimeRoot: '/unused',
        fontsRoot: path.resolve('public/creator-fonts'),
        getMediaStore: () => ({
          read: async (key) =>
            sources[key]
              ? {
                  bytes: await fs.readFile(sources[key]),
                  mimeType: key === 'sound' ? 'audio/wav' : 'video/mp4',
                }
              : null,
        }),
      });
      await engine.initialize();
      engine.binaryDirectory = realBinary;
      engine.capabilities = async () => ({ available: true });
      const clip = (id, type, startTime, duration) => ({
        id,
        mediaId: id,
        type,
        startTime,
        duration,
        offset: 0.5,
        volume: 1,
        crop: { mode: 'fill', x: 0.5, y: 0.5 },
      });
      const p = plan({
        captions: [],
        clips: [
          clip('red', 'video', 0, 1.5),
          { ...clip('blue', 'video', 1, 1), crossfadeSeconds: 0.5 },
          { ...clip('sound', 'audio', 0, 2), fadeInSeconds: 0.2, fadeOutSeconds: 0.2 },
        ],
      });
      const job = await engine.start(p);
      while (['queued', 'rendering', 'verifying'].includes(engine.get(job.id).status))
        await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(engine.get(job.id).status, 'complete', engine.get(job.id).error);
      const file = path.join(root, 'jobs', job.id, 'output.mp4');
      const { stdout: pixel } = await exec(
        binary,
        [
          '-ss',
          '1.25',
          '-i',
          file,
          '-frames:v',
          '1',
          '-vf',
          'scale=1:1',
          '-f',
          'rawvideo',
          '-pix_fmt',
          'rgb24',
          'pipe:1',
        ],
        { encoding: 'buffer' },
      );
      assert.ok(pixel[0] > 35 && pixel[2] > 35, `Expected blended red/blue: ${[...pixel]}`);
      const { stdout: audio } = await exec(
        binary,
        ['-i', file, '-map', '0:a', '-f', 's16le', 'pipe:1'],
        { encoding: 'buffer', maxBuffer: 1000000 },
      );
      let energy = 0;
      for (let offset = 0; offset < audio.length; offset += 2)
        energy += audio.readInt16LE(offset) ** 2;
      assert.ok(
        Math.sqrt(energy / (audio.length / 2)) > 100,
        'Audio should contain audible mixed sine',
      );
      const old = path.join(root, 'existing.mp4');
      await fs.writeFile(old, 'previous delivery');
      const broken = plan({ clips: [clip('missing', 'video', 0, 2)], captions: [] });
      const failed = await engine.start(broken);
      while (['queued', 'rendering', 'verifying'].includes(engine.get(failed.id).status))
        await new Promise((resolve) => setTimeout(resolve, 50));
      assert.match(engine.get(failed.id).error, /Missing media.*missing/);
      await assert.rejects(engine.save(failed.id, old));
      assert.equal(await fs.readFile(old, 'utf8'), 'previous delivery');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  },
);
test('cancellation remains terminal and removes render artifacts', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-cancel-'));
  try {
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    const engine = new CreatorRenderEngine({
      root,
      runtimeRoot: '/unused',
      getMediaStore: () => ({
        read: async () => {
          await gate;
          return null;
        },
      }),
    });
    engine.capabilities = async () => ({ available: true });
    const job = await engine.start(plan());
    await engine.cancel(job.id);
    release();
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(engine.get(job.id).status, 'cancelled');
    assert.equal(engine.get(job.id).progress, 0);
    await assert.rejects(fs.access(path.join(root, job.id, 'output.mp4')));
    await assert.rejects(engine.save(job.id, path.join(root, 'cancelled.mp4')));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test('save failure preserves prior file and cleans temporary siblings', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-save-failure-'));
  try {
    const directory = path.join(root, 'job');
    await fs.mkdir(directory);
    const destination = path.join(root, 'existing.mp4');
    await fs.writeFile(destination, 'prior');
    const engine = new CreatorRenderEngine({ root, runtimeRoot: '/unused' });
    engine.jobs.set('job', { job: { id: 'job', status: 'complete' }, directory });
    await assert.rejects(engine.save('job', destination));
    assert.equal(await fs.readFile(destination, 'utf8'), 'prior');
    assert.equal(
      (await fs.readdir(root)).some((name) => name.endsWith('.partial')),
      false,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test('accepts three-minute plans and lists/retries persisted immutable snapshots', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-v16-retry-'));
  try {
    const snapshot = plan({ durationSeconds: 180 });
    snapshot.clips[0].duration = 180;
    snapshot.contentHash = planHash(snapshot);
    assert.equal(validatePlan(snapshot).durationSeconds, 180);
    const id = crypto.randomUUID();
    await fs.mkdir(path.join(root, id));
    await fs.writeFile(
      path.join(root, id, 'job.json'),
      JSON.stringify({
        id,
        projectId: 'project',
        contentHash: snapshot.contentHash,
        status: 'rendering',
        progress: 0.4,
      }),
    );
    await fs.writeFile(path.join(root, id, 'plan.json'), JSON.stringify(snapshot));
    const engine = new CreatorRenderEngine({ root, runtimeRoot: '/unused' });
    await engine.initialize();
    assert.equal(engine.list('project')[0].status, 'failed');
    assert.deepEqual(engine.list('another-project'), []);
    engine.capabilities = async () => ({ available: true });
    engine.render = async () => {};
    const retried = await engine.retry(id);
    assert.notEqual(retried.id, id);
    assert.equal(retried.contentHash, snapshot.contentHash);
    assert.equal(engine.get(id).status, 'failed');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test('preview access verifies output checksum and accepts only known complete jobs', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-v16-preview-'));
  try {
    const id = crypto.randomUUID();
    const directory = path.join(root, id);
    await fs.mkdir(directory);
    const output = Buffer.from('verified output');
    await fs.writeFile(path.join(directory, 'output.mp4'), output);
    await fs.writeFile(
      path.join(directory, 'verification.json'),
      JSON.stringify({ outputSha256: crypto.createHash('sha256').update(output).digest('hex') }),
    );
    const engine = new CreatorRenderEngine({ root, runtimeRoot: '/unused' });
    engine.jobs.set(id, {
      directory,
      job: { id, projectId: 'p', contentHash: 'immutable', status: 'complete' },
    });
    assert.equal((await engine.preview(id)).contentHash, 'immutable');
    await assert.rejects(engine.preview('/etc/passwd'), /not found/);
    await fs.writeFile(path.join(directory, 'output.mp4'), 'tampered');
    await assert.rejects(engine.preview(id), /checksum/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test(
  'real three-minute outputs retain duration and dimensions in every aspect ratio',
  { skip: !realBinary },
  async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-v16-180-'));
    try {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA1kAAAAASUVORK5CYII=',
        'base64',
      );
      const engine = new CreatorRenderEngine({
        root,
        runtimeRoot: '/unused',
        fontsRoot: path.resolve('public/creator-fonts'),
        getMediaStore: () => ({ read: async () => ({ bytes: png, mimeType: 'image/png' }) }),
      });
      engine.binaryDirectory = realBinary;
      engine.capabilities = async () => ({ available: true });
      for (const aspectRatio of ['1:1', '16:9', '9:16']) {
        const snapshot = plan({ durationSeconds: 180, aspectRatio, captionsMode: 'sidecar' });
        snapshot.clips[0].duration = 180;
        snapshot.contentHash = planHash(snapshot);
        const job = await engine.start(snapshot);
        while (['queued', 'rendering', 'verifying'].includes(engine.get(job.id).status))
          await new Promise((resolve) => setTimeout(resolve, 100));
        assert.equal(engine.get(job.id).status, 'complete', engine.get(job.id).error);
        const metadata = await engine.probe(path.join(root, job.id, 'output.mp4'));
        assert.ok(Math.abs(Number(metadata.format.duration) - 180) < 0.1);
        assert.equal(metadata.streams[0].codec_name, 'h264');
        const expected =
          aspectRatio === '1:1' ? [720, 720] : aspectRatio === '16:9' ? [1280, 720] : [720, 1280];
        assert.deepEqual([metadata.streams[0].width, metadata.streams[0].height], expected);
        const delivery = path.join(root, `${aspectRatio.replace(':', '-')}.zip`);
        await engine.save(job.id, delivery, true);
        const JSZip = require('jszip');
        const archive = await JSZip.loadAsync(await fs.readFile(delivery));
        assert.deepEqual(Object.keys(archive.files).sort(), [
          'captions.srt',
          'cover.png',
          'delivery-report.json',
          'publication.txt',
          'video.mp4',
        ]);
        const videoBytes = await archive.file('video.mp4').async('nodebuffer');
        const verification = JSON.parse(
          await fs.readFile(path.join(root, job.id, 'verification.json')),
        );
        assert.equal(
          crypto.createHash('sha256').update(videoBytes).digest('hex'),
          verification.outputSha256,
        );
        assert.equal(
          JSON.parse(await archive.file('delivery-report.json').async('string')).aspectRatio,
          aspectRatio,
        );
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  },
);
test(
  'bundled proxies are checksum cached and native metadata is scoped to registered identities',
  { skip: !realBinary },
  async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-v16-proxy-'));
    try {
      const { DesktopMediaStore } = require('./media-store.cjs');
      const { promisify } = require('node:util');
      const execFile = promisify(require('node:child_process').execFile);
      const source = path.join(root, 'source.mp4');
      await execFile(
        path.join(realBinary, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),
        [
          '-hide_banner',
          '-nostdin',
          '-y',
          '-f',
          'lavfi',
          '-i',
          'color=c=blue:s=128x128:r=30:d=1',
          '-c:v',
          'libx264',
          source,
        ],
      );
      const store = new DesktopMediaStore(root);
      await store.importBytes({
        key: 'original',
        bytes: await fs.readFile(source),
        mimeType: 'video/mp4',
      });
      const engine = new CreatorRenderEngine({
        root,
        runtimeRoot: '/unused',
        getMediaStore: () => store,
      });
      engine.binaryDirectory = realBinary;
      engine.capabilities = async () => ({ available: true });
      const metadata = await engine.inspectMedia('original');
      assert.ok(Math.abs(metadata.durationSeconds - 1) < 0.1);
      assert.ok(metadata.streamTypes.includes('video'));
      await assert.rejects(engine.inspectMedia(source), /identity/);
      const first = await engine.proxy('original');
      const second = await engine.proxy('original');
      assert.equal(first.key, second.key);
      const { fileURLToPath } = require('node:url');
      assert.equal(
        (await fs.realpath(fileURLToPath(first.url))).toLowerCase(),
        (await fs.realpath(fileURLToPath(second.url))).toLowerCase(),
      );
      assert.ok((await store.read('original')).bytes.byteLength > 0);
      assert.equal((await store.records()).length, 2);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  },
);
test('frozen source hashes reject media replacement under a reused identity', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-v16-media-hash-'));
  try {
    const engine = new CreatorRenderEngine({
      root,
      runtimeRoot: '/unused',
      getMediaStore: () => ({
        read: async () => ({ bytes: Buffer.from('changed'), mimeType: 'image/png' }),
      }),
    });
    engine.capabilities = async () => ({ available: true });
    const snapshot = plan({
      mediaHashes: { registered: crypto.createHash('sha256').update('original').digest('hex') },
    });
    const job = await engine.start(snapshot);
    while (['queued', 'rendering', 'verifying'].includes(engine.get(job.id).status))
      await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(engine.get(job.id).status, 'failed');
    assert.match(engine.get(job.id).error, /Media changed.*clip/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('readiness awaits one restoration and rejects storage and unexpected initialization failures', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-ready-'));
  try {
    const engine = new CreatorRenderEngine({ root, runtimeRoot: '/unused' });
    let release;
    let count = 0;
    engine._initInternal = async () => {
      count++;
      await new Promise((resolve) => (release = resolve));
    };
    const first = engine.ready();
    const second = engine.ready();
    assert.equal(count, 1);
    release();
    assert.equal(await first, engine);
    assert.equal(await second, engine);
    const unavailable = new CreatorRenderEngine({
      root: path.join(root, 'file'),
      runtimeRoot: '/unused',
    });
    await fs.writeFile(unavailable.root, 'blocked');
    await unavailable.initialize();
    await assert.rejects(unavailable.ready(), /storage is unavailable/);
    assert.equal((await unavailable.capabilities()).available, false);
    const broken = new CreatorRenderEngine({ root, runtimeRoot: '/unused' });
    broken._initInternal = async () => {
      throw new Error('Unexpected restoration failure');
    };
    await broken.initialize();
    await assert.rejects(broken.ready(), /could not be restored/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('authorized IPC commands wait for readiness and propagate initialization failures', async () => {
  const handlers = {};
  const window = { webContents: { mainFrame: {} } };
  const event = { sender: window.webContents, senderFrame: window.webContents.mainFrame };
  let release;
  let calls = 0;
  const gate = new Promise((resolve) => (release = resolve));
  const engine = {
    ready: () => gate,
    list: () => {
      calls++;
      return [];
    },
  };
  registerCreatorRenderIpc({
    ipcMain: { handle: (name, fn) => (handlers[name] = fn) },
    getEngine: () => engine,
    getMainWindow: () => window,
  });
  const first = handlers['timeline-render-list'](event);
  const second = handlers['timeline-render-list'](event);
  assert.equal(calls, 0);
  assert.throws(() => handlers['timeline-render-list']({ sender: {} }), /Untrusted/);
  release();
  await Promise.all([first, second]);
  assert.equal(calls, 2);
  engine.ready = async () => {
    throw new Error('Storage unavailable');
  };
  await assert.rejects(handlers['timeline-render-list'](event), /Storage unavailable/);
  assert.equal(calls, 2);
});

test('progress is throttled but transitions persist immediately and reject late progress', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-progress-'));
  try {
    let now = 1000;
    context.mock.method(Date, 'now', () => now);
    const updates = [];
    const engine = new CreatorRenderEngine({
      root,
      runtimeRoot: '/unused',
      onUpdate: (job) => updates.push(job),
    });
    const state = { directory: root, job: { id: 'job', status: 'rendering', progress: 0 } };
    await engine.update(state, { progress: 0.1 });
    await engine.update(state, { progress: 0.2 });
    assert.equal(updates.length, 1);
    now += 151;
    await engine.update(state, { progress: 0.3 });
    assert.equal(updates.length, 2);
    await engine.update(state, { status: 'verifying', progress: 0.95 });
    await engine.update(state, { progress: 0.8 });
    assert.equal(state.job.progress, 0.95);
    for (const status of ['complete', 'failed', 'cancelled']) {
      await engine.update(state, { status, progress: status === 'complete' ? 1 : 0 });
      const count = updates.length;
      await engine.update(state, { progress: 0.4 });
      assert.equal(updates.length, count);
      assert.equal(JSON.parse(await fs.readFile(path.join(root, 'job.json'))).status, status);
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

for (const frozen of [true, false])
  for (const logo of [false, true])
    test(`render rejects changed copied ${logo ? 'logo' : 'clip'} in ${frozen ? 'frozen' : 'legacy'} plan before FFmpeg`, async (context) => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-copy-integrity-'));
      try {
        const source = path.join(root, 'source.png');
        const accepted = Buffer.from('accepted source');
        await fs.writeFile(source, accepted);
        const sha256 = crypto.createHash('sha256').update(accepted).digest('hex');
        const snapshot = plan({
          ...(frozen ? { mediaHashes: { registered: sha256, logo: sha256 } } : {}),
          ...(logo ? { style: { logoAssetId: 'logo' } } : {}),
        });
        const engine = new CreatorRenderEngine({
          root,
          runtimeRoot: '/unused',
          getMediaStore: () => ({
            resolve: async () => ({ path: source, sha256, mimeType: 'image/png' }),
          }),
        });
        engine.capabilities = async () => ({ available: true });
        engine.probe = async () => ({ streams: [{ codec_type: 'video' }], format: {} });
        let runs = 0;
        engine.run = async () => {
          runs++;
        };
        const originalCopy = fs.copyFile.bind(fs);
        context.mock.method(fs, 'copyFile', async (from, to) => {
          await originalCopy(from, to);
          if (!logo || path.basename(to) === 'logo.png')
            await fs.writeFile(to, 'changed after resolve');
        });
        const directory = path.join(root, 'job');
        await fs.mkdir(directory);
        const state = { directory, plan: snapshot, job: { id: 'job', status: 'queued' } };
        await engine.render(state);
        assert.equal(state.job.status, 'failed');
        assert.match(state.job.error, logo ? /logo changed/ : /Media changed/);
        assert.equal(runs, 0);
        assert.equal(
          (await fs.readdir(directory)).some(
            (name) => name.startsWith('input-') || name === 'logo.png',
          ),
          false,
        );
      } finally {
        context.mock.restoreAll();
        await fs.rm(root, { recursive: true, force: true });
      }
    });

for (const failure of ['missing captions', 'missing cover', 'early read', 'read', 'write'])
  test(`package ${failure} fails atomically and cleans source streams`, async (context) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-zip-atomic-'));
    try {
      const nodeFs = require('node:fs');
      const { Readable, Writable } = require('node:stream');
      const directory = path.join(root, 'job');
      await fs.mkdir(directory);
      for (const name of ['output.mp4', 'captions.srt', 'cover.png'])
        await fs.writeFile(path.join(directory, name), name);
      if (failure.startsWith('missing'))
        await fs.rm(
          path.join(directory, failure === 'missing captions' ? 'captions.srt' : 'cover.png'),
        );
      const destination = path.join(root, 'previous.zip');
      await fs.writeFile(destination, 'prior delivery');
      const engine = new CreatorRenderEngine({ root, runtimeRoot: '/unused' });
      engine.jobs.set('job', {
        directory,
        plan: plan(),
        job: { id: 'job', status: 'complete' },
        outputSha256: crypto.createHash('sha256').update('output.mp4').digest('hex'),
      });
      const opened = [];
      const originalRead = nodeFs.createReadStream.bind(nodeFs);
      context.mock.method(nodeFs, 'createReadStream', (file, options) => {
        const stream =
          failure === 'read' && path.basename(file) === 'cover.png'
            ? new Readable({
                read() {
                  this.destroy(new Error('Injected source read failure'));
                },
              })
            : originalRead(file, options);
        if (failure === 'early read' && path.basename(file) === 'captions.srt')
          queueMicrotask(() => stream.destroy(new Error('Injected early source read failure')));
        opened.push(stream);
        return stream;
      });
      if (failure === 'write')
        context.mock.method(
          nodeFs,
          'createWriteStream',
          () =>
            new Writable({
              write(_chunk, _encoding, callback) {
                callback(new Error('Injected destination write failure'));
              },
            }),
        );
      await assert.rejects(engine.save('job', destination, true));
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(await fs.readFile(destination, 'utf8'), 'prior delivery');
      assert.equal(
        (await fs.readdir(root)).some((name) => name.endsWith('.partial')),
        false,
      );
      assert.ok(opened.every((stream) => stream.destroyed));
    } finally {
      context.mock.restoreAll();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

test('restoration write failures remain visible while incomplete jobs can be ignored', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-restore-failure-'));
  try {
    const id = crypto.randomUUID();
    const incomplete = crypto.randomUUID();
    await fs.mkdir(path.join(root, id));
    await fs.mkdir(path.join(root, incomplete));
    await fs.writeFile(
      path.join(root, id, 'job.json'),
      JSON.stringify({ id, status: 'rendering' }),
    );
    await fs.writeFile(path.join(root, incomplete, 'job.json'), '{broken');
    const engine = new CreatorRenderEngine({ root, runtimeRoot: '/unused' });
    context.mock.method(fs, 'writeFile', async () => {
      throw Object.assign(new Error('No space'), { code: 'ENOSPC' });
    });
    await engine.initialize();
    await assert.rejects(engine.ready(), /could not be restored/);
    assert.equal((await engine.capabilities()).available, false);
    assert.equal(
      JSON.parse(await fs.readFile(path.join(root, id, 'job.json'))).status,
      'rendering',
    );
  } finally {
    context.mock.restoreAll();
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('committed delivery remains successful if its job metadata cannot be saved', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'creator-save-journal-'));
  try {
    const directory = path.join(root, 'job');
    await fs.mkdir(directory);
    const bytes = Buffer.from('verified output');
    await fs.writeFile(path.join(directory, 'output.mp4'), bytes);
    const destination = path.join(root, 'delivery.mp4');
    await fs.writeFile(destination, 'prior delivery');
    const engine = new CreatorRenderEngine({ root, runtimeRoot: '/unused' });
    engine.jobs.set('job', {
      directory,
      job: { id: 'job', status: 'complete' },
      outputSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    });
    context.mock.method(fs, 'writeFile', async () => {
      throw Object.assign(new Error('Private path must not be logged'), { code: 'ENOSPC' });
    });
    const warning = context.mock.method(console, 'warn', () => {});
    assert.deepEqual(await engine.save('job', destination), { saved: true, name: 'delivery.mp4' });
    assert.deepEqual(await fs.readFile(destination), bytes);
    assert.equal(engine.get('job').status, 'complete');
    assert.equal(warning.mock.callCount(), 1);
    assert.deepEqual(warning.mock.calls[0].arguments, [
      'Delivery saved, but local export metadata could not be updated.',
    ]);
    assert.equal(
      (await fs.readdir(root)).some((name) => name.endsWith('.partial')),
      false,
    );
  } finally {
    context.mock.restoreAll();
    await fs.rm(root, { recursive: true, force: true });
  }
});
