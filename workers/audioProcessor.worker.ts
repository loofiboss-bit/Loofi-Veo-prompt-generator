/// <reference lib="webworker" />

// Types for messages
type WorkerMessage = 
  | { type: 'DETECT_BEATS'; payload: { channelData: Float32Array; sampleRate: number } }
  | { type: 'DETECT_SILENCE'; payload: { channelData: Float32Array; sampleRate: number; thresholdDb: number; minDuration: number } }
  | { type: 'GENERATE_WAVEFORM'; payload: { channelData: Float32Array; samples: number } };

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'DETECT_BEATS':
        const beats = detectBeatsInRawData(payload.channelData, payload.sampleRate);
        self.postMessage({ type: 'BEATS_RESULT', payload: beats });
        break;
      case 'DETECT_SILENCE':
        const ranges = detectSilenceInRawData(payload.channelData, payload.sampleRate, payload.thresholdDb, payload.minDuration);
        self.postMessage({ type: 'SILENCE_RESULT', payload: ranges });
        break;
      case 'GENERATE_WAVEFORM':
        const waveform = generateWaveformPeaks(payload.channelData, payload.samples);
        self.postMessage({ type: 'WAVEFORM_RESULT', payload: waveform });
        break;
    }
  } catch (error) {
    self.postMessage({ type: 'ERROR', payload: (error as Error).message });
  }
};

/**
 * Math Logic for Beat Detection (Energy based)
 * Copied and adapted for Worker context
 */
function detectBeatsInRawData(data: Float32Array, sampleRate: number): number[] {
    const peaks: number[] = [];
    
    // Window size for energy calculation (0.05s)
    const windowSize = Math.floor(sampleRate * 0.05); 
    const windows = Math.floor(data.length / windowSize);
    
    const energies: number[] = new Array(windows);

    // 1. Calculate Energy (RMS)
    for (let i = 0; i < windows; i++) {
        let sum = 0;
        let start = i * windowSize;
        for (let j = 0; j < windowSize; j++) {
            // Bounds check not strictly needed due to windows calc, but safe
            if (start + j < data.length) {
                const sample = data[start + j];
                sum += sample * sample;
            }
        }
        energies[i] = Math.sqrt(sum / windowSize);
    }

    // 2. Peak Detection with Dynamic Threshold
    const historySize = 40; // ~2 seconds context
    const sensitivity = 1.3;
    const minBeatInterval = 0.25; // Max 240 BPM

    let lastBeatTime = -minBeatInterval;

    for (let i = 0; i < energies.length; i++) {
        const start = Math.max(0, i - historySize);
        let historySum = 0;
        let count = 0;
        
        for (let k = start; k < i; k++) {
            historySum += energies[k];
            count++;
        }
        
        const localAverage = count > 0 ? historySum / count : 0;
        const instantEnergy = energies[i];

        if (instantEnergy > localAverage * sensitivity && instantEnergy > 0.01) {
            const timeSeconds = (i * windowSize) / sampleRate;
            
            if (timeSeconds - lastBeatTime > minBeatInterval) {
                peaks.push(timeSeconds);
                lastBeatTime = timeSeconds;
            }
        }
    }

    return peaks;
}

/**
 * Math Logic for Silence Detection
 */
function detectSilenceInRawData(data: Float32Array, sampleRate: number, thresholdDb: number, minDuration: number) {
    const thresholdLinear = Math.pow(10, thresholdDb / 20);
    const ranges = [];
    
    let isSilent = false;
    let silenceStart = 0;
    
    // Analyze in 10ms chunks
    const windowSize = Math.floor(sampleRate * 0.01); 
    const windows = Math.floor(data.length / windowSize);

    for (let i = 0; i < windows; i++) {
        let sum = 0;
        const startIdx = i * windowSize;
        
        for (let j = 0; j < windowSize; j++) {
            if (startIdx + j < data.length) {
                 sum += Math.abs(data[startIdx + j]);
            }
        }
        
        const avgAmp = sum / windowSize;
        const currentTime = (i * windowSize) / sampleRate;

        if (avgAmp < thresholdLinear) {
            if (!isSilent) {
                isSilent = true;
                silenceStart = currentTime;
            }
        } else {
            if (isSilent) {
                isSilent = false;
                const duration = currentTime - silenceStart;
                if (duration >= minDuration) {
                    ranges.push({ start: silenceStart, end: currentTime });
                }
            }
        }
    }

    // Check tail
    if (isSilent) {
        const endTime = data.length / sampleRate;
        if ((endTime - silenceStart) >= minDuration) {
            ranges.push({ start: silenceStart, end: endTime });
        }
    }

    return ranges;
}

/**
 * Generates peaks for waveform visualization.
 * Downsamples the audio data to a manageable number of points (samples) for canvas rendering.
 */
function generateWaveformPeaks(data: Float32Array, samples: number): Float32Array {
    const blockSize = Math.floor(data.length / samples);
    const peaks = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
        let max = 0;
        const start = i * blockSize;
        for (let j = 0; j < blockSize; j++) {
            if (start + j < data.length) {
                const val = Math.abs(data[start + j]);
                if (val > max) max = val;
            }
        }
        peaks[i] = max;
    }
    return peaks;
}