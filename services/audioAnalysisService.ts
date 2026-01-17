
/**
 * Detects beats in an AudioBuffer using an energy threshold algorithm.
 * 
 * @param audioBuffer The AudioBuffer to analyze.
 * @param threshold The sensitivity threshold (default 1.2). Higher = fewer beats.
 * @param minPeakDistance Minimum time between beats in seconds (default 0.3s = ~200 BPM limit).
 * @returns An array of timestamps (in seconds) where beats occur.
 */
export const detectBeats = (audioBuffer: AudioBuffer, threshold: number = 1.2, minPeakDistance: number = 0.3): number[] => {
    const rawData = audioBuffer.getChannelData(0); // Analyze first channel
    const sampleRate = audioBuffer.sampleRate;
    const beatTimestamps: number[] = [];

    // Window size for energy calculation (e.g., 0.05s)
    const windowSize = Math.floor(sampleRate * 0.05);
    const windows = Math.floor(rawData.length / windowSize);
    
    // 1. Calculate instant energy for each window
    const energies: number[] = [];
    for (let i = 0; i < windows; i++) {
        let sum = 0;
        for (let j = 0; j < windowSize; j++) {
            const sample = rawData[i * windowSize + j];
            sum += sample * sample;
        }
        energies.push(sum);
    }

    // 2. Calculate local average energy (moving average) to compare against
    // We look at ~1 second of context (approx 20 windows)
    const localHistorySize = 20; 

    for (let i = 0; i < energies.length; i++) {
        // Get local average history
        const start = Math.max(0, i - localHistorySize);
        const end = i;
        let sumHistory = 0;
        let count = 0;
        
        for (let k = start; k < end; k++) {
            sumHistory += energies[k];
            count++;
        }
        
        const localAverage = count > 0 ? sumHistory / count : 0;
        const instantEnergy = energies[i];

        // 3. Peak Detection Logic
        // Calculate dynamic threshold based on local history variance or simple multiplier
        // Using simple C constant method: E > C * <E>
        
        if (instantEnergy > localAverage * threshold && instantEnergy > 0.01) {
            const timeSeconds = (i * windowSize) / sampleRate;
            
            // Refractory period check to prevent double hits on same bass kick
            if (beatTimestamps.length === 0 || (timeSeconds - beatTimestamps[beatTimestamps.length - 1] > minPeakDistance)) {
                beatTimestamps.push(timeSeconds);
            }
        }
    }

    return beatTimestamps;
};
