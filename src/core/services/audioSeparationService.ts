interface SeparationResult {
  vocals: Blob;
  instrumental: Blob;
}

/**
 * Separates audio stems from a source URL.
 * Currently uses a high-quality Web Audio API mock (EQ Filtering) to simulate separation
 * because full client-side AI separation (Demucs/Spleeter) is extremely heavy for browser WASM.
 *
 * @param audioUrl Source audio URL
 * @returns Promise with vocal and instrumental blobs
 */
export const separateStems = async (audioUrl: string): Promise<SeparationResult> => {
  try {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();

    // Use OfflineAudioContext for faster-than-realtime processing
    // We assume 44.1kHz for standard music quality
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tempCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
      1,
      1,
      44100,
    );
    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);

    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;

    // --- Render Vocals (Bandpass Filter Focus) ---
    const vocalCtx = new OfflineAudioContext(numChannels, duration * sampleRate, sampleRate);
    const vocalSource = vocalCtx.createBufferSource();
    vocalSource.buffer = audioBuffer;

    // Create Vocal Isolation Chain
    // Human voice fundamental freq is approx 85Hz - 255Hz, harmonics up to 3kHz+
    // We use a bandpass to isolate the "meat" of the vocal range
    const vocalFilterHighPass = vocalCtx.createBiquadFilter();
    vocalFilterHighPass.type = 'highpass';
    vocalFilterHighPass.frequency.value = 200;

    const vocalFilterLowPass = vocalCtx.createBiquadFilter();
    vocalFilterLowPass.type = 'lowpass';
    vocalFilterLowPass.frequency.value = 4000;

    vocalSource.connect(vocalFilterHighPass);
    vocalFilterHighPass.connect(vocalFilterLowPass);
    vocalFilterLowPass.connect(vocalCtx.destination);

    vocalSource.start(0);
    const vocalRendered = await vocalCtx.startRendering();
    const vocalBlob = bufferToWaveBlob(vocalRendered);

    // --- Render Instrumental (Notch/Cut Filter) ---
    const instCtx = new OfflineAudioContext(numChannels, duration * sampleRate, sampleRate);
    const instSource = instCtx.createBufferSource();
    instSource.buffer = audioBuffer;

    // Create Instrumental Chain (Cut out the vocal mid-range)
    const instFilter = instCtx.createBiquadFilter();
    instFilter.type = 'peaking';
    instFilter.frequency.value = 1000; // Center of vocal range
    instFilter.Q.value = 1.5; // Wide-ish bandwidth
    instFilter.gain.value = -15; // Cut 15dB

    // Optional: Boost Bass/Treble to emphasize "backing track" feel
    const bassBoost = instCtx.createBiquadFilter();
    bassBoost.type = 'lowshelf';
    bassBoost.frequency.value = 200;
    bassBoost.gain.value = 3;

    instSource.connect(instFilter);
    instFilter.connect(bassBoost);
    bassBoost.connect(instCtx.destination);

    instSource.start(0);
    const instRendered = await instCtx.startRendering();
    const instBlob = bufferToWaveBlob(instRendered);

    return {
      vocals: vocalBlob,
      instrumental: instBlob,
    };
  } catch (error) {
    console.error('Stem separation failed:', error);
    throw new Error('Failed to process audio for stem separation.');
  }
};

// Helper to convert AudioBuffer to WAV Blob
function bufferToWaveBlob(abuffer: AudioBuffer): Blob {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let i, sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this loop)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

  while (pos < abuffer.length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(44 + offset, sample, true); // write 16-bit sample
      offset += 2;
    }
    pos++;
  }

  // helper for writing header
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function setUint16(data: any) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function setUint32(data: any) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
