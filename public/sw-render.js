// Import FFmpeg scripts from CDN
importScripts('https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/umd/ffmpeg.js');
importScripts('https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js');

const { FFmpeg } = FFmpegWASM;
const { fetchFile, toBlobURL } = FFmpegUtil;

let ffmpeg = null;

const loadFFmpeg = async () => {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();

  // Log progress to main thread
  // eslint-disable-next-line no-unused-vars
  ffmpeg.on('progress', ({ progress, time }) => {
    broadcast({
      type: 'RENDER_PROGRESS',
      progress: progress * 100,
      status: 'Encoding...',
    });
  });

  ffmpeg.on('log', ({ message }) => {
    console.log('[SW-Render] FFmpeg:', message);
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
};

const broadcast = (message) => {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => client.postMessage(message));
  });
};

// Helper: Generate Title Card using OffscreenCanvas (DOM Canvas unavailable in SW)
const generateTitleCardImage = async (text, styles) => {
  const width = 1920;
  const height = 1080;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = styles.background || '#000000';
  ctx.fillRect(0, 0, width, height);

  // Text
  ctx.fillStyle = styles.color || '#ffffff';
  ctx.font = `${styles.fontSize || 80}px Arial`; // Simple font fallback
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Word wrap logic would go here, simple centered text for now
  ctx.fillText(text, width / 2, height / 2);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
};

// eslint-disable-next-line no-unused-vars
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  if (type === 'RENDER_JOB') {
    const { clips, outputName, filters, cropConfig, backgroundMusic, audioSettings, fonts } =
      payload;

    try {
      broadcast({ type: 'RENDER_START' });

      const instance = await loadFFmpeg();

      // 1. Load Font if needed
      if (fonts && fonts.data) {
        await instance.writeFile('font.ttf', new Uint8Array(fonts.data));
      } else {
        // Fallback font load inside worker
        const fontUrl =
          'https://cdn.jsdelivr.net/gh/webfontkit/roboto/src/hinted/Roboto-Regular.ttf';
        const fontData = await fetchFile(fontUrl);
        await instance.writeFile('font.ttf', fontData);
      }

      // 2. Write Assets
      const processedClips = [];

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const rawVidName = `raw_${i}.${clip.isImage ? 'png' : 'mp4'}`;
        const rawAudName = `raw_aud_${i}.wav`;
        const cleanName = `clean_${i}.mp4`;

        // Handle Title Cards (Generate via OffscreenCanvas)
        if (clip.isTitle && clip.titleConfig) {
          const titleImgData = await generateTitleCardImage(
            clip.titleConfig.text,
            clip.titleConfig,
          );
          await instance.writeFile(rawVidName, titleImgData);
          // Treat as image for processing
          clip.isImage = true;
        } else {
          await instance.writeFile(rawVidName, new Uint8Array(clip.videoData));
        }

        if (clip.audioData) {
          await instance.writeFile(rawAudName, new Uint8Array(clip.audioData));
        }

        // --- Pre-processing Command Construction ---
        // (Replicating logic from videoEditorService but tailored for SW environment)

        const TARGET_WIDTH = cropConfig ? 1080 : 1920;
        const TARGET_HEIGHT = cropConfig ? 1920 : 1080;
        const duration = clip.duration || 5;
        const totalFrames = Math.ceil(duration * 24);

        const filterParts = [];

        // Scaling/Cropping/Motion
        if (clip.motionConfig) {
          const { start, end } = clip.motionConfig;
          const zoomExpr = `${start.zoom}+(${end.zoom}-${start.zoom})*on/${totalFrames}`;
          const centerXExpr = `${start.x}+(${end.x}-${start.x})*on/${totalFrames}`;
          const centerYExpr = `${start.y}+(${end.y}-${start.y})*on/${totalFrames}`;
          const xExpr = `iw*(${centerXExpr}-1/(2*zoom))`;
          const yExpr = `ih*(${centerYExpr}-1/(2*zoom))`;
          filterParts.push(
            `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:s=${TARGET_WIDTH}x${TARGET_HEIGHT}:fps=24`,
          );
        } else if (clip.isImage) {
          filterParts.push(`zoompan=d=${totalFrames}:s=${TARGET_WIDTH}x${TARGET_HEIGHT}:fps=24`);
        } else if (cropConfig) {
          const cropW = 608;
          const cropH = 1080;
          const maxOffsetX = 1920 - cropW;
          let offsetX = Math.floor(cropConfig.xPercentage * maxOffsetX);
          if (offsetX % 2 !== 0) offsetX--;
          filterParts.push(`crop=${cropW}:${cropH}:${offsetX}:0`);
          filterParts.push(`scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:flags=lanczos`);
        } else {
          filterParts.push(
            `scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=decrease,pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2`,
          );
        }

        // Color Grade
        if (clip.colorGrade) {
          const cg = clip.colorGrade;
          filterParts.push(
            `eq=contrast=${cg.contrast}:brightness=${cg.brightness}:saturation=${cg.saturation}:gamma_r=${cg.gamma_r || 1}:gamma_g=${cg.gamma_g || 1}:gamma_b=${cg.gamma_b || 1}`,
          );
        }

        filterParts.push('setsar=1,fps=24');

        // Text Overlay
        if (clip.dialogueText) {
          const safeText = clip.dialogueText.replace(/'/g, "\\'").replace(/:/g, '\\:');
          const fontSize = cropConfig ? 80 : 48;
          const yPos = cropConfig ? 'h-th-400' : 'h-th-50';
          filterParts.push(
            `drawtext=fontfile=font.ttf:text='${safeText}':fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=${yPos}:borderw=3:bordercolor=black`,
          );
        }

        // Construct Command
        const cmd = [];
        if (clip.isImage) {
          cmd.push('-loop', '1', '-i', rawVidName);
        } else {
          cmd.push('-i', rawVidName);
        }

        if (clip.audioData) {
          cmd.push('-i', rawAudName);
        } else {
          cmd.push('-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`);
        }

        cmd.push('-vf', filterParts.join(','));

        // Audio Filtering
        if (clip.audioData) {
          const vol =
            (clip.audioVolume !== undefined ? clip.audioVolume : 1.0) *
            (audioSettings?.volumes?.dialogue ?? 1.0);
          cmd.push('-filter:a', `volume=${vol},aresample=44100`);
        } else {
          cmd.push('-filter:a', `atrim=duration=${duration},aresample=44100`);
        }

        if (clip.isImage) cmd.push('-t', `${duration}`);

        cmd.push('-c:v', 'libx264', '-preset', 'ultrafast'); // Use ultrafast for SW perf
        cmd.push('-c:a', 'aac');
        cmd.push(cleanName);

        await instance.exec(cmd);

        // Cleanup raw
        try {
          await instance.deleteFile(rawVidName);
          // eslint-disable-next-line no-unused-vars
        } catch (e) {}
        try {
          if (clip.audioData) await instance.deleteFile(rawAudName);
          // eslint-disable-next-line no-unused-vars
        } catch (e) {}

        processedClips.push({
          name: cleanName,
          duration: duration,
          transition: clip.transition,
        });
      }

      // 3. Composite (Stitch)
      let musicFileName = 'bg_music.mp3';
      if (backgroundMusic) {
        await instance.writeFile(musicFileName, new Uint8Array(backgroundMusic));
      }

      const inputArgs = [];
      processedClips.forEach((c) => inputArgs.push('-i', c.name));
      if (backgroundMusic) inputArgs.push('-i', musicFileName);

      // Filter Graph Logic (Simplified XFade for SW)
      const filterGraph = [];
      let offset = 0;
      let vPrev = `[0:v]`;
      let aPrev = `[0:a]`;

      for (let i = 0; i < processedClips.length - 1; i++) {
        const currentClip = processedClips[i];
        const nextClip = processedClips[i + 1];
        const transition = nextClip.transition || { type: 'cut', duration: 0 };

        offset += currentClip.duration - (transition.type === 'cut' ? 0 : transition.duration);

        const nextLabelV = `v${i + 1}`;
        const nextLabelA = `a${i + 1}`;

        // Map types
        let method = 'fade';
        if (transition.type === 'wipe_left') method = 'wipeleft';
        if (transition.type === 'fade_black') method = 'fadeblack'; // Note: fadeblack might fail on older ffmpeg wasm builds

        const transDur = transition.type === 'cut' ? 0 : transition.duration;

        if (transition.type === 'cut') {
          filterGraph.push(
            `${vPrev}[${i + 1}:v]xfade=transition=fade:duration=0.01:offset=${offset}[${nextLabelV}];`,
          );
          filterGraph.push(`${aPrev}[${i + 1}:a]acrossfade=d=0.01:c1=tri:c2=tri[${nextLabelA}];`);
        } else {
          filterGraph.push(
            `${vPrev}[${i + 1}:v]xfade=transition=${method}:duration=${transDur}:offset=${offset}[${nextLabelV}];`,
          );
          filterGraph.push(
            `${aPrev}[${i + 1}:a]acrossfade=d=${transDur}:c1=tri:c2=tri[${nextLabelA}];`,
          );
        }

        vPrev = `[${nextLabelV}]`;
        aPrev = `[${nextLabelA}]`;
      }

      let finalV = vPrev;
      let finalA = aPrev;

      // Global Filters
      if (filters) {
        const fParts = [];
        if (filters.contrast !== 100) fParts.push(`eq=contrast=${filters.contrast / 100}`);
        // Simplified filter chain for reliability
        if (fParts.length > 0) {
          filterGraph.push(`${vPrev}${fParts.join(',')}[v_final];`);
          finalV = `[v_final]`;
        }
      }

      // Music Mix
      if (backgroundMusic) {
        const musicIndex = processedClips.length;
        const musicVol = audioSettings?.volumes?.music ?? 0.5;
        filterGraph.push(`[${musicIndex}:a]volume=${musicVol}[music_vol];`);
        filterGraph.push(`[music_vol][${aPrev}]amix=inputs=2:duration=first[a_final];`);
        finalA = `[a_final]`;
      }

      // Final Exec
      const stitchCmd = [
        ...inputArgs,
        '-filter_complex',
        filterGraph.join('').slice(0, -1), // remove trailing ;
        '-map',
        finalV,
        '-map',
        finalA,
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        outputName,
      ];

      // If single clip and no music, simple copy/transcode
      if (processedClips.length === 1 && !backgroundMusic) {
        await instance.exec([
          '-i',
          processedClips[0].name,
          '-c:v',
          'libx264',
          '-c:a',
          'aac',
          outputName,
        ]);
      } else {
        await instance.exec(stitchCmd);
      }

      const data = await instance.readFile(outputName);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });

      broadcast({
        type: 'RENDER_COMPLETE',
        payload: blob,
      });

      // Cleanup
      try {
        await instance.deleteFile(outputName);
        // eslint-disable-next-line no-unused-vars
      } catch (e) {}
      for (const c of processedClips)
        try {
          await instance.deleteFile(c.name);
          // eslint-disable-next-line no-unused-vars
        } catch (e) {}
    } catch (error) {
      broadcast({
        type: 'RENDER_ERROR',
        payload: error.message,
      });
    }
  }
});
