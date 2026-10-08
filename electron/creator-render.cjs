'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const exec = promisify(execFile);
const VERSION = '9.0.2';
const MEDIA_FORMATS =
  'mov,matroska,webm,avi,wav,mp3,flac,ogg,image2,png_pipe,jpeg_pipe,gif,bmp_pipe,webp_pipe';
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
function planHash(plan) {
  const { contentHash: _hash, ...snapshot } = plan;
  return crypto.createHash('sha256').update(canonical(snapshot)).digest('hex');
}
function text(value, limit = 4000) {
  return typeof value === 'string' && value.length <= limit && !value.includes('\0');
}
function number(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}
function validatePlan(input) {
  if (!input || JSON.stringify(input).length > 2000000) throw new Error('Invalid render plan.');
  const p = JSON.parse(JSON.stringify(input));
  if (
    p.schemaVersion !== 1 ||
    !text(p.projectId, 180) ||
    !p.projectId ||
    !text(p.projectName, 300) ||
    !number(p.durationSeconds, 1 / 30, 60) ||
    p.fps !== 30 ||
    !['9:16', '16:9', '1:1'].includes(p.aspectRatio) ||
    !['720p', '1080p'].includes(p.resolution) ||
    !['sidecar', 'burn-in'].includes(p.captionsMode) ||
    !['classic', 'pop', 'karaoke'].includes(p.captionStyle) ||
    !number(p.safeMargin, 0, 0.3) ||
    !text(p.title) ||
    !text(p.description)
  )
    throw new Error('Invalid render settings.');
  if (
    !Array.isArray(p.clips) ||
    !p.clips.length ||
    p.clips.length > 120 ||
    !Array.isArray(p.captions) ||
    p.captions.length > 500
  )
    throw new Error('Invalid timeline.');
  const ids = new Set();
  for (const c of p.clips) {
    if (
      !text(c.id, 180) ||
      ids.has(c.id) ||
      !text(c.mediaId, 180) ||
      !/^[\w.:-]+$/.test(c.mediaId) ||
      !['video', 'image', 'audio'].includes(c.type) ||
      !number(c.startTime, 0, 60) ||
      !number(c.duration, 1 / 30, 60) ||
      c.startTime + c.duration > p.durationSeconds + 0.001 ||
      !number(c.offset, 0, 86400) ||
      !number(c.volume, 0, 4) ||
      !c.crop ||
      !['fit', 'fill'].includes(c.crop.mode) ||
      !number(c.crop.x, 0, 1) ||
      !number(c.crop.y, 0, 1)
    )
      throw new Error(`Invalid clip: ${text(c.id, 180) ? c.id : 'unknown'}.`);
    ids.add(c.id);
    for (const key of ['fadeInSeconds', 'fadeOutSeconds', 'crossfadeSeconds'])
      if (c[key] !== undefined && !number(c[key], 0, c.duration))
        throw new Error(`Invalid fade in clip ${c.id}.`);
  }
  const visuals = p.clips
    .filter((c) => c.type !== 'audio')
    .sort((a, b) => a.startTime - b.startTime);
  if (!visuals.length) throw new Error('Timeline needs a video or image clip.');
  if (visuals[0].crossfadeSeconds)
    throw new Error(`Crossfade needs a previous clip: ${visuals[0].id}.`);
  for (let i = 1; i < visuals.length; i++) {
    const overlap = visuals[i - 1].startTime + visuals[i - 1].duration - visuals[i].startTime;
    const fade = visuals[i].crossfadeSeconds || 0;
    if (overlap > fade + 0.001 || (fade && Math.abs(overlap - fade) > 0.001))
      throw new Error(`Unsupported overlap; match the dissolve duration in clip ${visuals[i].id}.`);
  }
  for (const c of p.captions)
    if (
      !text(c.id, 180) ||
      !text(c.text, 2000) ||
      !number(c.startTime, 0, p.durationSeconds) ||
      !number(c.endTime, c.startTime + 0.001, p.durationSeconds)
    )
      throw new Error('Invalid caption timing or text.');
  if (
    p.style &&
    (!['Noto Sans', 'Noto Serif'].includes(p.style.fontFamily) ||
      !/^#[a-f\d]{6}$/i.test(p.style.primaryColor) ||
      !/^#[a-f\d]{6}$/i.test(p.style.textColor) ||
      (p.style.logoAssetId && !/^[\w.:-]{1,180}$/.test(p.style.logoAssetId)))
  )
    throw new Error('Invalid creator style.');
  if (p.contentHash !== planHash(p)) throw new Error('Render snapshot hash mismatch.');
  return p;
}
function dimensions(p) {
  const size = p.resolution === '1080p' ? 1080 : 720;
  return p.aspectRatio === '16:9'
    ? [(size * 16) / 9, size]
    : p.aspectRatio === '9:16'
      ? [size, (size * 16) / 9]
      : [size, size];
}
function timestamp(seconds, separator = ',') {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}${separator}${String(ms % 1000).padStart(3, '0')}`;
}
function srt(p) {
  return p.captions
    .map((c, i) => `${i + 1}\n${timestamp(c.startTime)} --> ${timestamp(c.endTime)}\n${c.text}\n`)
    .join('\n');
}
function ass(p) {
  const [w, h] = dimensions(p);
  const color = (p.style?.textColor || '#ffffff').slice(1).match(/../g).reverse().join('');
  const background = p.captionStyle === 'pop' ? 3 : 1;
  const highlight = (p.style?.primaryColor || '#ffd84d').slice(1).match(/../g).reverse().join('');
  const font = p.style?.fontFamily || 'Noto Sans';
  const withFonts = (safe) => {
    let active = font;
    let result = '';
    for (const character of safe) {
      const selected = /\p{Script=Arabic}/u.test(character)
        ? 'Noto Sans Arabic'
        : /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(character)
          ? 'Noto Sans CJK JP'
          : /\p{Mark}/u.test(character)
            ? active
            : font;
      if (selected !== active) result += `{\\fn${selected}}`;
      active = selected;
      result += character;
    }
    return result;
  };
  const captionText = (c) => {
    const safe = c.text.replace(/\\/g, '\\\\').replace(/[{}]/g, '').replace(/\r?\n/g, '\\N');
    if (p.captionStyle !== 'karaoke') return withFonts(safe);
    const words = safe.split(/\s+/);
    const duration = Math.max(1, Math.floor(((c.endTime - c.startTime) * 100) / words.length));
    return words.map((word) => `{\\kf${duration}}{\\fn${font}}${withFonts(word)}`).join(' ');
  };
  const margin = Math.round(h * p.safeMargin);
  const at = (n) => {
    const t = timestamp(n, '.');
    return t.slice(1, -1);
  };
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${w}\nPlayResY: ${h}\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Default,${font},${Math.round(h * 0.048)},&H00${p.captionStyle === 'karaoke' ? highlight : color},&H00${color},&H00111111,&H80111111,-1,0,0,0,100,100,0,0,${background},3,1,2,${margin},${margin},${margin},1\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n${p.captions.map((c) => `Dialogue: 0,${at(c.startTime)},${at(c.endTime)},Default,,0,0,0,,${captionText(c)}`).join('\n')}`;
}
class CreatorRenderEngine {
  constructor({ root, runtimeRoot, fontsRoot, getMediaStore, onUpdate = () => {} }) {
    this.root = root;
    this.runtimeRoot = runtimeRoot;
    this.fontsRoot = fontsRoot || path.join(runtimeRoot, 'fonts');
    this.getMediaStore = getMediaStore;
    this.onUpdate = onUpdate;
    this.jobs = new Map();
  }
  async initialize() {
    let entries;
    try {
      await fs.mkdir(this.root, { recursive: true });
      entries = await fs.readdir(this.root);
    } catch {
      this.initializationError =
        'Local export storage is unavailable. Check folder permissions and free space.';
      return;
    }
    for (const name of entries) {
      if (!/^[a-f\d-]{36}$/.test(name)) continue;
      try {
        const j = JSON.parse(await fs.readFile(path.join(this.root, name, 'job.json'), 'utf8'));
        if (['queued', 'rendering', 'verifying'].includes(j.status)) {
          j.status = 'failed';
          j.error = 'Rendering interrupted. Retry from the project.';
          await fs.writeFile(path.join(this.root, name, 'job.json'), JSON.stringify(j), {
            mode: 0o600,
          });
          for (const artifact of await fs.readdir(path.join(this.root, name))) {
            if (
              artifact.startsWith('input-') ||
              ['output.mp4', 'logo.png', 'fonts'].includes(artifact)
            )
              await fs.rm(path.join(this.root, name, artifact), { recursive: true, force: true });
          }
        }
        this.jobs.set(j.id, { job: j, directory: path.join(this.root, name) });
      } catch {
        /* Incomplete jobs cannot be restored. */
      }
    }
  }
  async capabilities() {
    if (this.initializationError) return { available: false, reason: this.initializationError };
    try {
      const directory = path.join(this.runtimeRoot, `${process.platform}-${process.arch}`);
      const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));
      if (
        manifest.version !== VERSION ||
        manifest.license !== 'GPL-3.0-or-later' ||
        manifest.distributionReady !== true
      )
        throw new Error('Verified offline rendering runtime is not provisioned.');
      for (const name of ['ffmpeg', 'ffprobe']) {
        const file = path.join(directory, name + (process.platform === 'win32' ? '.exe' : ''));
        const hash = crypto
          .createHash('sha256')
          .update(await fs.readFile(file))
          .digest('hex');
        if (hash !== manifest.files[name])
          throw new Error('Rendering runtime integrity check failed.');
      }
      this.binaryDirectory = directory;
      return { available: true, version: VERSION };
    } catch (error) {
      return {
        available: false,
        reason: error.code
          ? 'Verified offline rendering runtime is not provisioned.'
          : error.message,
      };
    }
  }
  binary(name) {
    return path.join(this.binaryDirectory, name + (process.platform === 'win32' ? '.exe' : ''));
  }
  async update(state, values) {
    if (state.cancelled && values.status !== 'cancelled') return;
    Object.assign(state.job, values);
    const snapshot = { ...state.job };
    state.persistence = (state.persistence || Promise.resolve())
      .catch(() => {})
      .then(async () => {
        const temporary = path.join(state.directory, 'job.json.tmp');
        await fs.writeFile(temporary, JSON.stringify(snapshot), { mode: 0o600 });
        await fs.rename(temporary, path.join(state.directory, 'job.json'));
        this.onUpdate(snapshot);
      });
    await state.persistence;
  }
  async start(input) {
    if (this.starting) throw new Error('Another export is starting.');
    this.starting = true;
    try {
      return await this.startReserved(input);
    } finally {
      this.starting = false;
    }
  }
  async startReserved(input) {
    const plan = validatePlan(input);
    const caps = await this.capabilities();
    if (!caps.available) throw new Error(caps.reason);
    if (
      [...this.jobs.values()].some((s) =>
        ['queued', 'rendering', 'verifying'].includes(s.job.status),
      )
    )
      throw new Error('Another export is running.');
    const id = crypto.randomUUID();
    const directory = path.join(this.root, id);
    await fs.mkdir(directory, { mode: 0o700 });
    const state = {
      directory,
      plan,
      job: {
        id,
        projectId: plan.projectId,
        contentHash: plan.contentHash,
        status: 'queued',
        progress: 0,
      },
    };
    this.jobs.set(id, state);
    await fs.writeFile(path.join(directory, 'plan.json'), JSON.stringify(plan), { mode: 0o600 });
    await this.update(state, {});
    void this.render(state).catch(async () => {});
    return { ...state.job };
  }
  get(id) {
    if (typeof id !== 'string' || !this.jobs.has(id)) throw new Error('Export job not found.');
    return { ...this.jobs.get(id).job };
  }
  async cancel(id) {
    const state = this.jobs.get(id);
    this.get(id);
    if (['queued', 'rendering', 'verifying'].includes(state.job.status)) {
      state.cancelled = true;
      state.process?.kill();
      await this.update(state, { status: 'cancelled', progress: 0 });
    }
    return { ...state.job };
  }
  run(state, args, progress = false) {
    return new Promise((resolve, reject) => {
      if (state.cancelled) return reject(new Error('Export cancelled.'));
      const child = spawn(this.binary('ffmpeg'), args, {
        cwd: state.directory,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      state.process = child;
      let diagnostics = '';
      let fontTail = '';
      child.stderr.on('data', (chunk) => {
        diagnostics = (diagnostics + chunk.toString()).slice(-12000);
        const fontMessages = fontTail + chunk.toString();
        if (/failed to find any fallback with glyph/.test(fontMessages))
          state.missingCaptionGlyph = true;
        state.captionFonts ??= new Set();
        for (const match of fontMessages.matchAll(/fontselect:\s*\(([^,]+),/g))
          state.captionFonts.add(match[1]);
        fontTail = fontMessages.slice(-1024);
      });
      const timeout = setTimeout(() => child.kill(), 300000);
      timeout.unref();
      if (progress)
        child.stdout.on('data', (chunk) => {
          const match = chunk.toString().match(/out_time_us=(\d+)/);
          if (match)
            void this.update(state, {
              progress: Math.min(
                0.9,
                (Number(match[1]) / 1000000 / state.plan.durationSeconds) * 0.9,
              ),
            }).catch(() => child.kill());
        });
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on('exit', (code) => {
        clearTimeout(timeout);
        state.diagnostics = ((state.diagnostics || '') + diagnostics).slice(-20000);
        void fs
          .writeFile(path.join(state.directory, 'render.log'), state.diagnostics, { mode: 0o600 })
          .catch(() => {});
        state.process = null;
        if (code === 0) resolve();
        else
          reject(
            new Error(
              state.cancelled
                ? 'Export cancelled.'
                : `Video rendering failed (exit ${code}). Check the source clips and available storage.`,
            ),
          );
      });
    });
  }
  async probe(file) {
    const { stdout } = await exec(
      this.binary('ffprobe'),
      [
        '-v',
        'error',
        '-protocol_whitelist',
        'file,pipe',
        '-format_whitelist',
        MEDIA_FORMATS,
        '-show_streams',
        '-show_format',
        '-of',
        'json',
        file,
      ],
      { timeout: 30000, maxBuffer: 2000000, windowsHide: true },
    );
    return JSON.parse(stdout);
  }
  async render(state) {
    const p = state.plan;
    try {
      if (state.cancelled) return;
      await this.update(state, { status: 'rendering' });
      const args = ['-hide_banner', '-nostdin', '-y', '-filter_complex_threads', '1'];
      const [w, h] = dimensions(p);
      const filters = [];
      let index = 0;
      args.push('-f', 'lavfi', '-i', `color=c=black:s=${w}x${h}:r=30:d=${p.durationSeconds}`);
      index++;
      filters.push('[0:v]format=rgba[base0]');
      let base = 'base0';
      let count = 0;
      const audio = [];
      const ordered = [
        ...p.clips.filter((c) => c.type !== 'audio').sort((a, b) => a.startTime - b.startTime),
        ...p.clips.filter((c) => c.type === 'audio'),
      ];
      for (const c of ordered) {
        const record = await this.getMediaStore().read(c.mediaId);
        if (!record) throw new Error(`Missing media for clip ${c.id}.`);
        const ext = c.type === 'image' ? '.png' : c.type === 'audio' ? '.audio' : '.video';
        const filename = `input-${index}${ext}`;
        await fs.writeFile(path.join(state.directory, filename), Buffer.from(record.bytes), {
          mode: 0o600,
        });
        let metadata;
        try {
          metadata = await this.probe(path.join(state.directory, filename));
        } catch {
          throw new Error(`Cannot read media for clip ${c.id}. Unsupported or damaged file.`);
        }
        if (c.type === 'image') args.push('-loop', '1');
        args.push(
          '-protocol_whitelist',
          'file,pipe',
          '-format_whitelist',
          MEDIA_FORMATS,
          '-ss',
          String(c.offset),
          '-t',
          String(c.duration),
          '-i',
          filename,
        );
        if (c.type !== 'image' && !metadata.streams.some((s) => s.codec_type === c.type))
          throw new Error(`Missing ${c.type} stream in clip ${c.id}.`);
        if (c.type !== 'image' && Number(metadata.format.duration) + 0.05 < c.offset + c.duration)
          throw new Error(`Clip exceeds source duration: ${c.id}.`);
        if (c.type !== 'audio') {
          count++;
          const scale =
            c.crop.mode === 'fill'
              ? `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:(iw-ow)*${c.crop.x}:(ih-oh)*${c.crop.y}`
              : `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`;
          const fadeIn = c.crossfadeSeconds || c.fadeInSeconds;
          const fade = `${fadeIn ? `,fade=t=in:st=0:d=${fadeIn}:alpha=1` : ''}${c.fadeOutSeconds ? `,fade=t=out:st=${Math.max(0, c.duration - c.fadeOutSeconds)}:d=${c.fadeOutSeconds}:alpha=1` : ''}`;
          filters.push(
            `[${index}:v]trim=duration=${c.duration},setpts=PTS-STARTPTS,${scale},setsar=1,fps=30,format=rgba${fade},setpts=PTS+${c.startTime}/TB[v${count}]`,
          );
          filters.push(
            `[${base}][v${count}]overlay=eof_action=pass:enable='between(t,${c.startTime},${c.startTime + c.duration})'[base${count}]`,
          );
          base = `base${count}`;
        }
        if (c.type !== 'image' && metadata.streams.some((s) => s.codec_type === 'audio')) {
          const label = `a${index}`;
          const fadeIn = c.fadeInSeconds ? `,afade=t=in:st=0:d=${c.fadeInSeconds}` : '';
          const fadeOut = c.fadeOutSeconds
            ? `,afade=t=out:st=${Math.max(0, c.duration - c.fadeOutSeconds)}:d=${c.fadeOutSeconds}`
            : '';
          filters.push(
            `[${index}:a]atrim=duration=${c.duration},asetpts=PTS-STARTPTS,aresample=48000,volume=${c.volume}${fadeIn}${fadeOut},adelay=${Math.round(c.startTime * 1000)}:all=1[${label}]`,
          );
          audio.push(`[${label}]`);
        }
        index++;
      }
      if (p.style?.logoAssetId) {
        const record = await this.getMediaStore().read(p.style.logoAssetId);
        if (!record || !record.mimeType.startsWith('image/'))
          throw new Error('Style logo media is missing or invalid.');
        await fs.writeFile(path.join(state.directory, 'logo.png'), Buffer.from(record.bytes));
        args.push(
          '-protocol_whitelist',
          'file,pipe',
          '-format_whitelist',
          MEDIA_FORMATS,
          '-loop',
          '1',
          '-i',
          'logo.png',
        );
        filters.push(`[${index}:v]scale=${Math.round(w * 0.15)}:-1[logo]`);
        filters.push(
          `[${base}][logo]overlay=x=W-w-${Math.round(w * p.safeMargin)}:y=${Math.round(h * p.safeMargin)}:shortest=1[branded]`,
        );
        base = 'branded';
      }
      await fs.writeFile(path.join(state.directory, 'captions.srt'), srt(p));
      if (p.captionsMode === 'burn-in' && p.captions.length) {
        await fs.writeFile(path.join(state.directory, 'captions.ass'), ass(p));
        await fs.cp(this.fontsRoot, path.join(state.directory, 'fonts'), { recursive: true });
        const fonts = 'fonts';
        filters.push(`[${base}]subtitles=filename=captions.ass:fontsdir='${fonts}'[captioned]`);
        base = 'captioned';
      }
      filters.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${p.durationSeconds}[silence]`);
      filters.push(
        `${audio.join('')}[silence]amix=inputs=${audio.length + 1}:normalize=0,alimiter=limit=0.95[amixed]`,
      );
      args.push(
        '-filter_complex',
        filters.join(';'),
        '-map',
        `[${base}]`,
        '-map',
        '[amixed]',
        '-t',
        String(p.durationSeconds),
        '-r',
        '30',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-movflags',
        '+faststart',
        '-progress',
        'pipe:1',
        'output.mp4',
      );
      await this.run(state, args, true);
      if (state.missingCaptionGlyph)
        throw new Error(
          'A caption contains characters missing from the bundled fonts. Edit the caption before retrying.',
        );
      if (state.cancelled) return;
      await this.update(state, { status: 'verifying', progress: 0.95 });
      const metadata = await this.probe(path.join(state.directory, 'output.mp4'));
      const video = metadata.streams.find((s) => s.codec_type === 'video');
      const sound = metadata.streams.find((s) => s.codec_type === 'audio');
      if (
        video?.codec_name !== 'h264' ||
        sound?.codec_name !== 'aac' ||
        video.width !== w ||
        video.height !== h ||
        Math.abs(Number(metadata.format.duration) - p.durationSeconds) > 0.15
      )
        throw new Error('Export verification failed.');
      await this.run(state, ['-nostdin', '-v', 'error', '-i', 'output.mp4', '-f', 'null', '-']);
      await this.run(state, ['-nostdin', '-y', '-i', 'output.mp4', '-frames:v', '1', 'cover.png']);
      state.outputSha256 = crypto
        .createHash('sha256')
        .update(await fs.readFile(path.join(state.directory, 'output.mp4')))
        .digest('hex');
      await fs.writeFile(
        path.join(state.directory, 'verification.json'),
        JSON.stringify({
          outputSha256: state.outputSha256,
          captionFonts: [...(state.captionFonts || [])],
          captionGlyphsVerified: !state.missingCaptionGlyph,
        }),
        { mode: 0o600 },
      );
      if (state.cancelled) return;
      await this.update(state, { status: 'complete', progress: 1 });
    } catch (error) {
      if (!state.cancelled)
        await this.update(state, {
          status: 'failed',
          error: error.code
            ? 'Media export failed. Check available storage and source files.'
            : error.message,
          progress: 0,
        });
    } finally {
      for (const name of await fs.readdir(state.directory)) {
        if (name.startsWith('input-') || name === 'logo.png' || name === 'fonts')
          await fs.rm(path.join(state.directory, name), { force: true, recursive: true });
      }
      if (state.cancelled || state.job.status === 'failed')
        await fs.rm(path.join(state.directory, 'output.mp4'), { force: true });
    }
  }
  async save(id, destination, asPackage = false) {
    const state = this.jobs.get(id);
    this.get(id);
    if (state.job.status !== 'complete') throw new Error('Export is not complete.');
    const verification =
      state.outputSha256 ||
      JSON.parse(await fs.readFile(path.join(state.directory, 'verification.json'), 'utf8'))
        .outputSha256;
    if (
      crypto
        .createHash('sha256')
        .update(await fs.readFile(path.join(state.directory, 'output.mp4')))
        .digest('hex') !== verification
    )
      throw new Error('Rendered video integrity verification failed. Retry export.');
    const temporary = `${destination}.${crypto.randomUUID()}.partial`;
    try {
      if (asPackage) {
        const JSZip = require('jszip');
        const zip = new JSZip();
        for (const [source, target] of [
          ['output.mp4', 'video.mp4'],
          ['captions.srt', 'captions.srt'],
          ['cover.png', 'cover.png'],
        ])
          zip.file(target, await fs.readFile(path.join(state.directory, source)));
        const p =
          state.plan ||
          JSON.parse(await fs.readFile(path.join(state.directory, 'plan.json'), 'utf8'));
        zip.file('publication.txt', `${p.title}\n\n${p.description}\n`);
        zip.file(
          'delivery-report.json',
          JSON.stringify(
            {
              schemaVersion: 1,
              projectId: p.projectId,
              contentHash: p.contentHash,
              durationSeconds: p.durationSeconds,
              aspectRatio: p.aspectRatio,
              codec: 'H.264/AAC',
              verified: true,
            },
            null,
            2,
          ),
        );
        await fs.writeFile(temporary, await zip.generateAsync({ type: 'nodebuffer' }), {
          flag: 'wx',
          mode: 0o600,
        });
      } else
        await fs.copyFile(
          path.join(state.directory, 'output.mp4'),
          temporary,
          require('node:fs').constants.COPYFILE_EXCL,
        );
      const handle = await fs.open(temporary, 'r+');
      await handle.sync();
      await handle.close();
      await fs.rename(temporary, destination);
      await this.update(state, { savedName: path.basename(destination) });
      return { saved: true, name: path.basename(destination) };
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
}
module.exports = { CreatorRenderEngine, validatePlan, planHash, canonical, dimensions, srt, ass };
