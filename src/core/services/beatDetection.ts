
/**
 * Detects beats in an AudioBuffer using a Low-Pass Filter and Energy Peak detection.
 * This runs in an OfflineAudioContext for fast processing.
 * 
 * @param audioBuffer The source AudioBuffer to analyze.
 * @returns Promise<number[]> Array of timestamps (in seconds) where beats are detected.
 */
export const detectBeats = async (audioBuffer: AudioBuffer): Promise<number[]> => {
    // 1. Create Offline Context
    // We use a lower sample rate for analysis to speed up processing without losing beat precision
    const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
    
    // 2. Create Source
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    // 3. Create Low Pass Filter
    // Isolates kick drums and bass lines (frequencies below 150Hz) which usually drive the beat.
    const filter = offlineCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 150;
    filter.Q.value = 1;

    // 4. Connect Graph
    source.connect(filter);
    filter.connect(offlineCtx.destination);
    source.start(0);

    // 5. Render
    const renderedBuffer = await offlineCtx.startRendering();
    const data = renderedBuffer.getChannelData(0);

    // 6. Peak Detection Algorithm
    const peaks: number[] = [];
    const sampleRate = renderedBuffer.sampleRate;
    
    // Window size for energy calculation (e.g. 0.05s)
    const windowSize = Math.floor(sampleRate * 0.05); 
    const windows = Math.floor(data.length / windowSize);
    
    const energies: number[] = [];

    // Calculate energy for each window (Root Mean Square)
    for (let i = 0; i < windows; i++) {
        let sum = 0;
        for (let j = 0; j < windowSize; j++) {
            const sample = data[i * windowSize + j];
            sum += sample * sample;
        }
        energies.push(Math.sqrt(sum / windowSize));
    }

    // Dynamic Thresholding
    // We compare current energy to a local history average
    const historySize = 40; // Look roughly 2 seconds back
    const sensitivity = 1.3; // Multiplier required above average to count as a beat
    const minBeatInterval = 0.25; // Max 240 BPM (0.25s between beats) to prevent double hits

    let lastBeatTime = -minBeatInterval;

    for (let i = 0; i < energies.length; i++) {
        // Calculate local average
        const start = Math.max(0, i - historySize);
        let historySum = 0;
        let count = 0;
        for (let k = start; k < i; k++) {
            historySum += energies[k];
            count++;
        }
        const localAverage = count > 0 ? historySum / count : 0;
        
        const instantEnergy = energies[i];

        // Is it a peak?
        // 1. Must be significantly higher than local average
        // 2. Must be above a silence floor (0.01)
        // 3. Must abide by minimum refractory period
        if (instantEnergy > localAverage * sensitivity && instantEnergy > 0.01) {
            const timeSeconds = (i * windowSize) / sampleRate;
            
            if (timeSeconds - lastBeatTime > minBeatInterval) {
                peaks.push(timeSeconds);
                lastBeatTime = timeSeconds;
            }
        }
    }

    return peaks;
};
