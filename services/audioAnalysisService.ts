
import { VolumeKeyframe } from '../types';

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

export interface TimeRange {
    start: number;
    end: number;
}

/**
 * Scans an audio buffer for periods of silence.
 * 
 * @param audioBuffer The source audio.
 * @param thresholdDb The volume threshold in decibels (e.g. -40). Signal below this is silence.
 * @param minDurationSec The minimum duration of a silent gap to be detected (e.g. 0.5s).
 * @returns Array of {start, end} times representing silence.
 */
export const detectSilence = (audioBuffer: AudioBuffer, thresholdDb: number = -40, minDurationSec: number = 0.5): TimeRange[] => {
    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Convert dB to linear amplitude: 10^(dB/20)
    // -20dB = 0.1, -40dB = 0.01
    const thresholdLinear = Math.pow(10, thresholdDb / 20);
    
    const silenceRanges: TimeRange[] = [];
    
    let isSilent = false;
    let silenceStart = 0;
    
    // Analyze in chunks to smooth out momentary peaks
    const windowSize = Math.floor(sampleRate * 0.01); // 10ms windows
    const windows = Math.floor(rawData.length / windowSize);

    for (let i = 0; i < windows; i++) {
        let sum = 0;
        for (let j = 0; j < windowSize; j++) {
            sum += Math.abs(rawData[i * windowSize + j]);
        }
        const avgAmp = sum / windowSize;
        const currentTime = (i * windowSize) / sampleRate;

        if (avgAmp < thresholdLinear) {
            // It is silent
            if (!isSilent) {
                isSilent = true;
                silenceStart = currentTime;
            }
        } else {
            // It is loud
            if (isSilent) {
                isSilent = false;
                const duration = currentTime - silenceStart;
                if (duration >= minDurationSec) {
                    silenceRanges.push({ start: silenceStart, end: currentTime });
                }
            }
        }
    }

    // Handle case where it ends in silence
    if (isSilent) {
        const endTime = audioBuffer.duration;
        if ((endTime - silenceStart) >= minDurationSec) {
            silenceRanges.push({ start: silenceStart, end: endTime });
        }
    }

    return silenceRanges;
};

/**
 * Generates volume keyframes for ducking music based on dialogue intensity.
 * 
 * @param dialogueBuffer The audio buffer containing spoken dialogue.
 * @param musicBuffer The audio buffer containing background music (used mainly for length check, technically optional if logic is independent).
 * @returns Array of VolumeKeyframe objects for automation.
 */
export const calculateDuckingEnvelope = (dialogueBuffer: AudioBuffer, musicBuffer: AudioBuffer): VolumeKeyframe[] => {
    const sampleRate = dialogueBuffer.sampleRate;
    const channelData = dialogueBuffer.getChannelData(0); // Analyze mono
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms analysis window
    const keyframes: VolumeKeyframe[] = [];
    
    // Default start at 100% volume
    keyframes.push({ time: 0, value: 1 });

    const threshold = 0.01; // Linear threshold for speech activity (approx -40dB)
    let isSpeaking = false;
    const attackTime = 0.2; // 200ms fade down
    const releaseTime = 0.4; // 400ms fade up
    const duckedVolume = 0.3; // 30% volume

    // Iterate through the audio in 100ms chunks
    for(let i = 0; i < channelData.length; i += windowSize) {
        // Calculate RMS for current window
        let sum = 0;
        let count = 0;
        for(let j = 0; j < windowSize && (i + j) < channelData.length; j++) {
            const sample = channelData[i + j];
            sum += sample * sample;
            count++;
        }
        
        if (count === 0) continue;
        const rms = Math.sqrt(sum / count);
        const currentTime = i / sampleRate;

        // State Machine for generating envelopes
        if (rms > threshold) {
            // Speech detected
            if (!isSpeaking) {
                isSpeaking = true;
                // Add Attack: Fade down BEFORE speech starts
                const duckStart = Math.max(0, currentTime - attackTime);
                
                // Add a "hold" point at 1.0 just before ducking starts to prevent linear interpolation from 0
                // Check if we need to insert a hold keyframe
                const lastKf = keyframes[keyframes.length - 1];
                if (lastKf.time < duckStart - 0.1) {
                    keyframes.push({ time: duckStart, value: 1 });
                }

                // Add the ducked volume point at current time
                keyframes.push({ time: currentTime, value: duckedVolume });
            }
        } else {
            // Silence detected
            if (isSpeaking) {
                // Check if silence persists (simple debounce)
                // For simplicity in this function, we assume immediate release
                isSpeaking = false;
                
                // Hold ducked volume until silence starts
                keyframes.push({ time: currentTime, value: duckedVolume });
                
                // Release: Fade up AFTER speech ends
                keyframes.push({ time: currentTime + releaseTime, value: 1 });
            }
        }
    }
    
    // Clean up keyframes (ensure sorted and bounded)
    return keyframes.sort((a, b) => a.time - b.time);
};

/**
 * Creates and configures a PannerNode for spatial audio.
 * @param ctx The AudioContext.
 * @param x Left/Right position (-1 to 1).
 * @param z Front/Back position (-1 to 1).
 * @returns Configured PannerNode.
 */
export const createSpatialPanner = (ctx: AudioContext, x: number, z: number): PannerNode => {
    const panner = ctx.createPanner();
    
    // HRTF is essential for headphone 3D effect
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'linear';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;
    
    // WebAudio coordinate system:
    // X: Positive is Right
    // Y: Positive is Up (Height)
    // Z: Positive is Behind listener, Negative is Front
    
    // We map our inputs (x: -1..1, z: -1..1) to a scale
    // UI Z=-1 (Top/Front) should map to WebAudio Z < 0
    // UI Z=1 (Bottom/Back) should map to WebAudio Z > 0
    
    // Scaling for audible effect
    const scale = 5; 
    panner.setPosition(x * scale, 0, z * scale);
    
    return panner;
};

/**
 * Updates an existing PannerNode with new coordinates.
 */
export const updateSpatialPanner = (panner: PannerNode, x: number, z: number) => {
    const scale = 5;
    // SetPosition is deprecated in some browsers but widely supported. 
    // Using positionX/Y/Z AudioParams is preferred for automation but immediate set is fine here.
    if (panner.positionX) {
        panner.positionX.value = x * scale;
        panner.positionZ.value = z * scale;
    } else {
        panner.setPosition(x * scale, 0, z * scale);
    }
};

/**
 * Gets real-time frequency energy from an AnalyserNode.
 * 
 * @param analyser The Audio Analyser node.
 * @param range The frequency range to target ('bass', 'mids', 'highs').
 * @returns A normalized value between 0 and 1 representing the average energy.
 */
export const getFrequencyEnergy = (analyser: AnalyserNode, range: 'bass' | 'mids' | 'highs'): number => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const sampleRate = analyser.context.sampleRate;
    const nyquist = sampleRate / 2;
    const binSize = nyquist / bufferLength;

    // Define ranges in Hz
    const ranges = {
        bass: { min: 20, max: 140 },
        mids: { min: 140, max: 2000 },
        highs: { min: 2000, max: 16000 }
    };

    const targetRange = ranges[range];
    
    const startBin = Math.floor(targetRange.min / binSize);
    const endBin = Math.min(bufferLength, Math.floor(targetRange.max / binSize));
    
    if (endBin <= startBin) return 0;

    let sum = 0;
    for (let i = startBin; i < endBin; i++) {
        sum += dataArray[i];
    }
    
    const average = sum / (endBin - startBin);
    return average / 255; // Normalize 0-1
};
