import React, { useState, useRef, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import AppDialog from '@shared/components/ui/AppDialog';

interface RecordingBoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptText: string;
  onSave: (blob: Blob) => void;
}

const RecordingBoothModal: React.FC<RecordingBoothModalProps> = ({
  isOpen,
  onClose,
  scriptText,
  onSave,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState(false);

  // Refs for Audio Logic
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Refs for UI
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Cleanup on unmount or when audioUrl changes (revoke old URL)
  useEffect(() => {
    return () => {
      stopVisualization();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  const startVisualization = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;

    if (!canvasCtx) return;

    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(15, 23, 42)'; // match bg-slate-900
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = isRecording ? '#ef4444' : '#22d3ee'; // Red if recording, Cyan if idle
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
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

  const stopVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Visualizer Context
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;
      sourceRef.current = source;

      startVisualization();
      setPermissionError(false);

      return stream;
    } catch (err) {
      console.error('Microphone access denied:', err);
      setPermissionError(true);
      return null;
    }
  };

  const startRecording = async () => {
    let stream = streamRef.current;
    if (!stream) {
      stream = await initAudio();
    }

    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // webm is standard for MediaRecorder
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      stopVisualization();
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);

    timerIntervalRef.current = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const handleSave = () => {
    if (audioBlob) {
      onSave(audioBlob);
      onClose();
    }
  };

  const handleRetake = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    // Restart visualizer
    startVisualization();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      layer="overlay"
      showCloseButton={false}
      bodyClassName="!h-full !overflow-visible !p-0"
      dialogClassName="!h-full !max-h-none !w-full !max-w-none !rounded-none !border-none !bg-transparent !shadow-none"
    >
      <div className="relative flex h-full w-full flex-col items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm animate-fade-in-up">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 pointer-events-auto">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Icon name="audio" className="w-4 h-4 text-red-400" />
              Recording Booth
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-900/80 backdrop-blur-md rounded-full text-slate-400 hover:text-white border border-slate-700 pointer-events-auto transition-colors"
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full max-w-4xl flex flex-col gap-6 h-full max-h-[80vh]">
          {/* Teleprompter Section */}
          <div className="flex-grow bg-slate-900 border border-slate-800 rounded-2xl p-8 overflow-y-auto shadow-inner text-center flex flex-col items-center justify-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
              Teleprompter
            </h3>
            <p className="text-3xl md:text-4xl font-serif text-slate-100 leading-relaxed max-w-3xl">
              {scriptText || 'No script text provided. Improvisation time!'}
            </p>
          </div>

          {/* Visualizer & Controls */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-6">
            {/* Visualizer Canvas */}
            {!audioUrl && (
              <div className="w-full h-24 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative">
                <canvas ref={canvasRef} width={800} height={100} className="w-full h-full" />
                {permissionError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-400 font-bold">
                    Microphone Access Denied
                  </div>
                )}
              </div>
            )}

            {/* Review Player */}
            {audioUrl && (
              <div className="w-full bg-slate-950 rounded-lg p-4 border border-slate-800 flex items-center justify-center">
                <audio ref={audioPlayerRef} src={audioUrl} controls className="w-full max-w-md" />
              </div>
            )}

            {/* Main Controls */}
            <div className="flex items-center gap-8">
              {audioUrl ? (
                <>
                  <button
                    onClick={handleRetake}
                    className="px-6 py-3 rounded-xl font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <Icon name="undo" className="w-4 h-4" />
                    Retake
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20 transition-transform hover:scale-105 flex items-center gap-2"
                  >
                    <Icon name="check" className="w-5 h-5" />
                    Save Recording
                  </button>
                </>
              ) : (
                <>
                  <div className="text-slate-400 font-mono text-xl w-16 text-center">
                    {formatTime(recordingTime)}
                  </div>
                  {isRecording ? (
                    <button
                      onClick={stopRecording}
                      className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 border-4 border-slate-900 ring-2 ring-red-500 shadow-lg shadow-red-900/50 flex items-center justify-center transition-transform hover:scale-105 animate-pulse"
                      title="Stop Recording"
                    >
                      <div className="w-6 h-6 bg-white rounded-sm" />
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      disabled={permissionError}
                      className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 border-4 border-slate-900 ring-2 ring-slate-700 hover:ring-red-500/50 shadow-lg flex items-center justify-center transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Start Recording"
                    >
                      <div className="w-6 h-6 bg-red-500 rounded-full group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                  <div className="w-16" /> {/* Spacer for balance */}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppDialog>
  );
};

export default RecordingBoothModal;
