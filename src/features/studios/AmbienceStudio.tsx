import React, { useState, useRef, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import { Asset } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import { useAppStore } from '@core/store/useAppStore';
import { logger } from '@core/services/loggerService';

interface AmbienceStudioProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const AmbienceStudio: React.FC<AmbienceStudioProps> = ({ isOpen, onClose, addToast }) => {
  const { addAsset } = useAppStore();
  const [locationInput, setLocationInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  // Audio Context for Loop Preview
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const _gainNodeRef = useRef<GainNode | null>(null);
  const loopIntervalRef = useRef<number | null>(null);

  // Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      stopPreview();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (audioContextRef.current) audioContextRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Cleanup-only effect: runs once on unmount to release audio resources
  }, []);

  const handleGenerate = async () => {
    if (!locationInput.trim()) return;

    stopPreview();
    setIsGenerating(true);
    setGeneratedBlob(null);
    setPreviewUrl(null);

    try {
      // 1. Get Description
      const description = await geminiService.generateAmbiencePrompt(locationInput);

      // 2. Generate Audio
      const base64Audio = await geminiService.generateAmbienceAudio(description);

      // Convert to Blob
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Create proper WAV header for PCM data
      // Assuming 24kHz Mono 16-bit from standard Gemini Audio output
      // (Similar to utils/audio.ts createWavHeader but locally applied here)
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
      const sampleRate = 24000;
      const numChannels = 1;

      const writeString = (v: DataView, o: number, s: string) => {
        for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
      };

      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + byteArray.length, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * 2, true);
      view.setUint16(32, numChannels * 2, true);
      view.setUint16(34, 16, true);
      writeString(view, 36, 'data');
      view.setUint32(40, byteArray.length, true);

      const blob = new Blob([wavHeader, byteArray], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      setGeneratedBlob(blob);
      setPreviewUrl(url);
      addToast('Ambience texture generated.', 'success');
    } catch (error) {
      logger.error('Failed to generate ambience', error);
      addToast('Failed to generate ambience.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const startPreview = async () => {
    if (!generatedBlob || !previewUrl) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      // Decode Audio
      const arrayBuffer = await generatedBlob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Analyser Setup
      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      // Crossfade Loop Logic
      const _playLoop = (_time: number) => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const gain = ctx.createGain();
        source.connect(gain);
        gain.connect(analyserRef.current!);
        analyserRef.current!.connect(ctx.destination);

        source.start(_time);

        // Fade In
        gain.gain.setValueAtTime(0, _time);
        gain.gain.linearRampToValueAtTime(1, _time + 1); // 1s fade in

        // Fade Out at end
        const duration = audioBuffer.duration;
        gain.gain.setValueAtTime(1, _time + duration - 1);
        gain.gain.linearRampToValueAtTime(0, _time + duration); // 1s fade out

        sourceNodeRef.current = source;

        // Schedule next loop
        // We start the next loop 1s before this one ends
        const _nextTime = _time + duration - 1;

        // We use setTimeout to trigger the next scheduling logic slightly before needed
        // Using Web Audio scheduling for precision, but recursion logic here for simplicity
        // Actually, for a pure Web Audio loop without gaps, we should schedule ahead.
        // For this simple preview, simple scheduling is fine.
      };

      // Initial Play
      // playLoop(ctx.currentTime);
      // Simpler: Just use native HTML5 Audio Loop for preview unless crossfade is strictly required
      // But prompt asked for crossfade logic.

      // Implementing simplified crossfade loop scheduler
      let nextStartTime = ctx.currentTime;

      const schedule = () => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        const gain = ctx.createGain();

        source.connect(gain);
        gain.connect(analyserRef.current!);
        analyserRef.current!.connect(ctx.destination);

        source.start(nextStartTime);

        // Crossfade Logic
        gain.gain.setValueAtTime(0, nextStartTime);
        gain.gain.linearRampToValueAtTime(1, nextStartTime + 1);
        gain.gain.setValueAtTime(1, nextStartTime + audioBuffer.duration - 1);
        gain.gain.linearRampToValueAtTime(0, nextStartTime + audioBuffer.duration);

        nextStartTime += audioBuffer.duration - 1; // Overlap by 1s
      };

      schedule(); // First play
      // Schedule repeating
      loopIntervalRef.current = window.setInterval(() => {
        if (ctx.currentTime > nextStartTime - 1) {
          // Schedule next just before needed
          schedule();
        }
      }, 1000);

      setIsLooping(true);
      drawVisualizer();
    } catch (e) {
      logger.error('Audio Playback Error', e);
    }
  };

  const stopPreview = () => {
    if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
    if (audioContextRef.current)
      audioContextRef.current.close().then(() => (audioContextRef.current = null));
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsLooping(false);
  };

  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;

    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#0f172a'; // bg-slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 200)`; // Purple/Pink hue
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const handleSaveToLibrary = () => {
    if (!generatedBlob || !previewUrl) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = (reader.result as string).split(',')[1];
      const newAsset: Asset = {
        id: Date.now().toString(),
        type: 'audio',
        name: `Ambience - ${locationInput || 'Texture'}`,
        url: previewUrl,
        data: base64data,
        mimeType: 'audio/wav',
      };
      addAsset(newAsset);
      addToast('Saved to Asset Library', 'success');
      onClose();
    };
    reader.readAsDataURL(generatedBlob);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[130] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in-up">
        <header className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="activity" className="w-6 h-6 text-purple-400" />
            Ambience Studio
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </header>

        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-400">
            Create seamless, loopable background textures (Room Tone) to add subconscious realism to
            your scenes.
          </p>

          <TextAreaInput
            label="Location Context"
            name="ambienceLocation"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="e.g. Cyberpunk Alleyway, Quiet Forest Morning, Busy Office..."
            rows={2}
            autoFocus
          />

          {/* Visualizer Area */}
          <div className="h-32 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={500}
              height={128}
              className="w-full h-full absolute inset-0 z-0"
            />

            {!previewUrl && !isGenerating && (
              <div className="z-10 text-slate-600 flex flex-col items-center">
                <Icon name="audio" className="w-12 h-12 opacity-20 mb-2" />
                <span className="text-xs">No Audio Generated</span>
              </div>
            )}

            {isGenerating && (
              <div className="z-10 flex flex-col items-center text-purple-400 animate-pulse">
                <Icon name="spinner" className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs font-bold uppercase">Synthesizing Texture...</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {!previewUrl ? (
              <button
                onClick={handleGenerate}
                disabled={!locationInput.trim() || isGenerating}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Icon name="magic" className="w-5 h-5" />
                Generate Texture
              </button>
            ) : (
              <div className="flex gap-2 w-full">
                <button
                  onClick={isLooping ? stopPreview : startPreview}
                  className={`flex-1 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
                    isLooping
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  <Icon name={isLooping ? 'square' : 'play'} className="w-4 h-4" />
                  {isLooping ? 'Stop Loop' : 'Preview Loop'}
                </button>
                <button
                  onClick={handleSaveToLibrary}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="download" className="w-4 h-4" />
                  Save to Library
                </button>
                <button
                  onClick={() => {
                    setGeneratedBlob(null);
                    setPreviewUrl(null);
                  }}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
                  title="Discard"
                >
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbienceStudio;
