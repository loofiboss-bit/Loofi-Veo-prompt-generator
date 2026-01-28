
import { useEffect, useRef, useCallback } from 'react';
import { TimeRange } from '../services/audioAnalysisService';

export const useAudioWorker = () => {
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize worker
        workerRef.current = new Worker(new URL('../workers/audioProcessor.worker.ts', import.meta.url), {
            type: 'module'
        });

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const analyzeBeats = useCallback(async (audioBuffer: AudioBuffer): Promise<number[]> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) return reject("Worker not initialized");

            // 1. Pre-process in Main Thread (Web Audio API is efficient here)
            // Render a Low-Passed version for better beat detection accuracy
            const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            
            const filter = offlineCtx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 150;
            filter.Q.value = 1;

            source.connect(filter);
            filter.connect(offlineCtx.destination);
            source.start(0);

            offlineCtx.startRendering().then(renderedBuffer => {
                const channelData = renderedBuffer.getChannelData(0);
                
                // 2. Offload Analysis to Worker
                const handler = (e: MessageEvent) => {
                    if (e.data.type === 'BEATS_RESULT') {
                        workerRef.current?.removeEventListener('message', handler);
                        resolve(e.data.payload);
                    } else if (e.data.type === 'ERROR') {
                        workerRef.current?.removeEventListener('message', handler);
                        reject(e.data.payload);
                    }
                };
                
                workerRef.current?.addEventListener('message', handler);
                
                // Transfer ownership of the array buffer to zero-copy transfer
                workerRef.current?.postMessage(
                    { type: 'DETECT_BEATS', payload: { channelData, sampleRate: audioBuffer.sampleRate } },
                    [channelData.buffer]
                );
            }).catch(reject);
        });
    }, []);

    const analyzeSilence = useCallback(async (audioBuffer: AudioBuffer, thresholdDb: number = -40, minDuration: number = 0.5): Promise<TimeRange[]> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) return reject("Worker not initialized");

            const channelData = audioBuffer.getChannelData(0); // Copy happens here naturally unless we want to detach the original buffer, which might be unsafe if used elsewhere. We send a copy implicitly by getting channel data usually, or explicit transfer.
            
            // Note: getChannelData returns a Float32Array view. We should copy it to transfer to worker
            // to avoid detaching the AudioBuffer's data if it's needed for playback.
            const dataCopy = new Float32Array(channelData);

            const handler = (e: MessageEvent) => {
                if (e.data.type === 'SILENCE_RESULT') {
                    workerRef.current?.removeEventListener('message', handler);
                    resolve(e.data.payload);
                } else if (e.data.type === 'ERROR') {
                    workerRef.current?.removeEventListener('message', handler);
                    reject(e.data.payload);
                }
            };

            workerRef.current?.addEventListener('message', handler);
            
            workerRef.current?.postMessage(
                { type: 'DETECT_SILENCE', payload: { channelData: dataCopy, sampleRate: audioBuffer.sampleRate, thresholdDb, minDuration } },
                [dataCopy.buffer]
            );
        });
    }, []);

    return { analyzeBeats, analyzeSilence };
};
