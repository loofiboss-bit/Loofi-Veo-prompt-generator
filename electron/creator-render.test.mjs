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
    { durationSeconds: 61 },
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
      const engine = new CreatorRenderEngine({
        root,
        runtimeRoot: '/unused',
        fontsRoot: path.resolve('public/creator-fonts'),
        getMediaStore: () => ({ read: async () => ({ bytes: png, mimeType: 'image/png' }) }),
      });
      engine.binaryDirectory = realBinary;
      engine.capabilities = async () => ({ available: true, version: 'test-only-vendor-nightly' });
      const p = plan();
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
