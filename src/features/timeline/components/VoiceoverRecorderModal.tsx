import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Asset, TimelineClip, TimelineTrack } from '@core/types';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { creatorVoiceoverService } from '@core/services/creatorVoiceoverService';
import { useAppStore } from '@core/store/useAppStore';
import { AppDialog } from '@shared/components/ui/AppDialog';
import Icon from '@shared/components/ui/Icon';

export interface VoiceoverRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  onVoiceoverAdded?: (clip: TimelineClip) => void;
}

type RecordState = 'idle' | 'countdown' | 'recording' | 'recorded';

export const VoiceoverRecorderModal: React.FC<VoiceoverRecorderModalProps> = ({
  isOpen,
  onClose,
  currentTime,
  tracks,
  clips,
  onVoiceoverAdded,
}) => {
  const { t } = useTranslation('creator');
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [useCountdown, setUseCountdown] = useState<boolean>(true);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [takeName, setTakeName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const durationRef = useRef<number>(0);

  // Load available input devices
  useEffect(() => {
    if (!isOpen) return;
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((allDevices) => {
        const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');
        setDevices(audioInputs);
        if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      })
      .catch(() => {
        /* Ignore device enumeration failure */
      });
  }, [isOpen, selectedDeviceId]);

  // Setup initial default take name
  useEffect(() => {
    if (isOpen) {
      setTakeName(`Voiceover - ${currentTime.toFixed(1)}s`);
      setRecordState('idle');
      setError(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingSeconds(0);
      durationRef.current = 0;
    }
  }, [isOpen, currentTime]);

  const stopVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const startVisualization = (analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = '#0f172a'; // slate-900
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = recordState === 'recording' ? '#f43f5e' : '#38bdf8'; // rose-500 or sky-400
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  const initAudio = async (deviceId?: string): Promise<MediaStream | null> => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => {});
      }

      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyserRef.current = analyser;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        startVisualization(analyser);
      }

      setError(null);
      return stream;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('voiceover.micDenied', 'Microphone access denied. Check system permissions.'),
      );
      return null;
    }
  };

  // Switch mic device when changed
  useEffect(() => {
    if (isOpen && recordState === 'idle') {
      void initAudio(selectedDeviceId || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId, isOpen]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopVisualization();
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => {});
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const beginActualRecording = (stream: MediaStream) => {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const type = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setRecordState('recorded');
      stopVisualization();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    recorder.start(100);
    setRecordState('recording');
    setRecordingSeconds(0);
    const startTime = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setRecordingSeconds(elapsed);
      durationRef.current = elapsed;
    }, 100);
  };

  const handleStartRecording = async () => {
    setError(null);
    let stream = streamRef.current;
    if (!stream || !stream.active) {
      stream = await initAudio(selectedDeviceId || undefined);
    }
    if (!stream) return;

    if (useCountdown) {
      setRecordState('countdown');
      setCountdown(3);
      let count = 3;
      countdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          beginActualRecording(stream!);
        } else {
          setCountdown(count);
        }
      }, 1000);
    } else {
      beginActualRecording(stream);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRetake = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordState('idle');
    setRecordingSeconds(0);
    durationRef.current = 0;
    void initAudio(selectedDeviceId || undefined);
  };

  const handleAddToTimeline = async () => {
    if (!audioBlob) return;
    setIsSaving(true);
    setError(null);

    try {
      const cleanName = takeName.trim() || `Voiceover - ${currentTime.toFixed(1)}s`;
      const extension = audioBlob.type.includes('webm') ? 'webm' : 'ogg';
      const file = new File(
        [audioBlob],
        `${cleanName.replace(/[^a-zA-Z0-9_-]/g, '_')}.${extension}`,
        {
          type: audioBlob.type || 'audio/webm',
        },
      );

      const fallbackDur = Math.max(0.1, durationRef.current || recordingSeconds);
      const asset: Asset = await mediaAssetService.importLocalFile(file);
      if (!asset.durationSeconds || !Number.isFinite(asset.durationSeconds)) {
        asset.durationSeconds = fallbackDur;
      }

      useAppStore.getState().addAsset(asset);

      const insertion = creatorVoiceoverService.insertVoiceover({
        asset,
        tracks,
        clips,
        insertAtTime: currentTime,
      });

      useAppStore.setState({
        tracks: insertion.tracks,
        clips: insertion.clips,
      });

      onVoiceoverAdded?.(insertion.newClip);
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('voiceover.saveError', 'Failed to save voiceover.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (recordState === 'recording') {
      handleStopRecording();
    }
    stopVisualization();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
    }
    onClose();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds * 10) % 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  return (
    <AppDialog isOpen={isOpen} onClose={handleClose} showCloseButton={false} size="base">
      <div className="p-6 space-y-5 text-slate-200">
        <header className="flex items-center justify-between pb-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Icon
              name="mic"
              className={`w-5 h-5 ${recordState === 'recording' ? 'text-rose-400 animate-pulse' : 'text-sky-400'}`}
            />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t('voiceover.title', 'Record Voiceover')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'voiceover.description',
                  'Record audio directly onto the timeline at current playhead.',
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label={t('common.close', 'Close')}
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>

        {error && (
          <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Visualizer Canvas */}
        <div className="relative rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900 h-28 flex items-center justify-center">
          <canvas ref={canvasRef} width={480} height={112} className="w-full h-full block" />

          {recordState === 'countdown' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-5xl font-extrabold text-amber-400 animate-ping">
                {countdown}
              </span>
            </div>
          )}

          {recordState === 'recording' && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-rose-950/80 border border-rose-700 px-2.5 py-1 rounded-full text-xs font-mono font-medium text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              {formatTime(recordingSeconds)}
            </div>
          )}

          {recordState === 'idle' && (
            <div className="absolute bottom-2 left-2 text-[11px] text-slate-400">
              {t('voiceover.speakToTest', 'Live audio input (test mic)')}
            </div>
          )}
        </div>

        {/* Device selector & Countdown toggle */}
        {recordState === 'idle' && (
          <div className="space-y-3">
            {devices.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t('voiceover.selectMic', 'Microphone')}
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                >
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={useCountdown}
                onChange={(e) => setUseCountdown(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500"
              />
              <span>{t('voiceover.countdownLabel', '3-second countdown before recording')}</span>
            </label>
          </div>
        )}

        {/* Recorded preview section */}
        {recordState === 'recorded' && (
          <div className="space-y-3 rounded-lg bg-slate-800/40 p-4 border border-slate-700/60">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {t('voiceover.takeName', 'Take name')}
              </label>
              <input
                type="text"
                value={takeName}
                onChange={(e) => setTakeName(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                placeholder="Voiceover Take 1"
              />
            </div>

            {audioUrl && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t('voiceover.preview', 'Preview audio')} (
                  {formatTime(durationRef.current || recordingSeconds)})
                </label>
                <audio controls src={audioUrl} className="w-full h-8" />
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <footer className="flex items-center justify-between pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-400">
            {t('voiceover.insertAt', 'Insert at')}:{' '}
            <span className="font-mono text-sky-300">{currentTime.toFixed(1)}s</span>
          </div>

          <div className="flex items-center gap-2">
            {recordState === 'idle' && (
              <>
                <button
                  onClick={handleClose}
                  className="rounded border border-slate-600 px-3.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={() => void handleStartRecording()}
                  className="flex items-center gap-1.5 rounded bg-rose-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-500 transition-colors shadow-sm"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  {t('voiceover.start', 'Start recording')}
                </button>
              </>
            )}

            {recordState === 'countdown' && (
              <button
                onClick={() => {
                  if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                  setRecordState('idle');
                }}
                className="rounded border border-slate-600 px-3.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
            )}

            {recordState === 'recording' && (
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-1.5 rounded bg-rose-700 hover:bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors animate-pulse shadow-md"
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-white" />
                {t('voiceover.stop', 'Stop recording')}
              </button>
            )}

            {recordState === 'recorded' && (
              <>
                <button
                  onClick={handleRetake}
                  disabled={isSaving}
                  className="rounded border border-slate-600 px-3.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {t('voiceover.retake', 'Retake')}
                </button>
                <button
                  onClick={() => void handleAddToTimeline()}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded bg-sky-600 hover:bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Icon name="check" className="w-4 h-4" />
                  {isSaving
                    ? t('voiceover.saving', 'Adding...')
                    : t('voiceover.addToTimeline', 'Add to timeline')}
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </AppDialog>
  );
};
