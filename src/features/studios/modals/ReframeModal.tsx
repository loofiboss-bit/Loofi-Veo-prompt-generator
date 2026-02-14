import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@shared/components/ui/Icon';
import { CropConfig } from '@core/types';
import { calculateSubjectCenter } from '@core/services/smartCropService';

interface ReframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  onConfirm: (config: CropConfig) => void;
}

interface CropKeyframe {
  time: number;
  x: number; // 0.0 to 1.0 (normalized to video width)
}

const ReframeModal: React.FC<ReframeModalProps> = ({ isOpen, onClose, videoUrl, onConfirm }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Canvas for analysis snapshot
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);

  const [dragStart, setDragStart] = useState<number | null>(null);
  const [cropLeft, setCropLeft] = useState(0); // Percentage 0.0 to 1.0 of CONTAINER
  const [isDragging, setIsDragging] = useState(false);

  // Smart Crop State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [keyframes, setKeyframes] = useState<CropKeyframe[]>([]);

  // 9:16 aspect ratio relative to 16:9 container
  const CROP_WIDTH_RATIO = 0.3164; // (9/16) / (16/9)

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setCropLeft((1 - CROP_WIDTH_RATIO) / 2);
      setKeyframes([]);
      setProgress(0);
    }
  }, [isOpen, videoUrl]);

  // Handle Playback & Keyframe Interpolation
  const handleTimeUpdate = () => {
    if (!videoRef.current || isDragging || isAnalyzing) return;

    const currentTime = videoRef.current.currentTime;

    if (keyframes.length > 0) {
      // Find surrounding keyframes
      // Simple Linear Interpolation
      const sorted = [...keyframes].sort((a, b) => a.time - b.time);

      let targetX = 0.5; // Default center relative to video (0-1)

      if (currentTime <= sorted[0].time) {
        targetX = sorted[0].x;
      } else if (currentTime >= sorted[sorted.length - 1].time) {
        targetX = sorted[sorted.length - 1].x;
      } else {
        const nextIdx = sorted.findIndex((k) => k.time > currentTime);
        const prev = sorted[nextIdx - 1];
        const next = sorted[nextIdx];

        const ratio = (currentTime - prev.time) / (next.time - prev.time);
        targetX = prev.x + (next.x - prev.x) * ratio;
      }

      // Convert Video Normalized X (0-1) to Container Percentage for UI
      // Video Center X = 0.5 means center of video.
      // We want crop box Center to align with Video Subject Center.
      // Crop Box Width is CROP_WIDTH_RATIO (0.3164).
      // Crop Left = SubjectX - (CropWidth / 2)

      let newCropLeft = targetX - CROP_WIDTH_RATIO / 2;

      // Clamp
      const maxLeft = 1 - CROP_WIDTH_RATIO;
      newCropLeft = Math.max(0, Math.min(maxLeft, newCropLeft));

      setCropLeft(newCropLeft);
    }
  };

  const runSmartAnalysis = async () => {
    const video = videoRef.current;
    const canvas = analysisCanvasRef.current;
    if (!video || !canvas) return;

    setIsAnalyzing(true);
    setKeyframes([]);
    setProgress(0);

    const wasPlaying = !video.paused;
    video.pause();

    const duration = video.duration;
    const interval = 1.0; // Analyze every 1 second
    const newKeyframes: CropKeyframe[] = [];

    try {
      // Set canvas size once
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      for (let t = 0; t < duration; t += interval) {
        // Seek
        video.currentTime = t;

        // Wait for seek (simple promise wrapper for event)
        await new Promise<void>((resolve) => {
          const onSeek = () => {
            video.removeEventListener('seeked', onSeek);
            resolve();
          };
          video.addEventListener('seeked', onSeek, { once: true });
        });

        if (!ctx) continue;

        // Draw frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Analyze
        const center = await calculateSubjectCenter(canvas);

        if (center !== null) {
          newKeyframes.push({ time: t, x: center });
        } else {
          // If lost subject, hold previous or default to center
          const prev = newKeyframes[newKeyframes.length - 1];
          newKeyframes.push({ time: t, x: prev ? prev.x : 0.5 });
        }

        setProgress(Math.round((t / duration) * 100));
      }

      // Smoothing pass (optional simple moving average)
      const smoothed = newKeyframes.map((kf, i, arr) => {
        if (i === 0 || i === arr.length - 1) return kf;
        const prev = arr[i - 1];
        const next = arr[i + 1];
        return { ...kf, x: (prev.x + kf.x + next.x) / 3 };
      });

      setKeyframes(smoothed);
    } catch (e) {
      console.error('Analysis failed', e);
      alert('Smart analysis failed. Please try manual cropping.');
    } finally {
      setIsAnalyzing(false);
      video.currentTime = 0;
      if (wasPlaying) video.play();
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragStart(clientX);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      if (!videoContainerRef.current) return;

      // If dragging manually, we might want to clear keyframes or just override for now
      // For simplicity, manual drag overrides auto-tracking visually but doesn't delete keys unless confirmed

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

      if (dragStart !== null) {
        const deltaX = clientX - dragStart;
        const deltaPercent = deltaX / videoContainerRef.current.offsetWidth;

        let newLeft = cropLeft + deltaPercent;

        // Clamp
        const maxLeft = 1 - CROP_WIDTH_RATIO;
        newLeft = Math.max(0, Math.min(maxLeft, newLeft));

        setCropLeft(newLeft);
        setDragStart(clientX);
      }
    },
    [isDragging, dragStart, cropLeft, CROP_WIDTH_RATIO],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Global listeners for drag outside
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleConfirm = () => {
    // If we have keyframes, pass them.
    // If manual override was done (keyframes is empty or user ignored them), we pass single static.
    // We assume if keyframes exist, user wants dynamic crop.

    // NOTE: If user dragged manually AFTER analysis, we technically should clear keyframes or offset them.
    // For this MVP, we just pass what we have.

    onConfirm({
      xPercentage: cropLeft,
      keyframes: keyframes.length > 0 ? keyframes : undefined,
    });
  };

  const handleCenter = () => {
    setCropLeft((1 - CROP_WIDTH_RATIO) / 2);
    setKeyframes([]); // Clear automation
  };

  if (!isOpen) return null;

  // Local drag state
  const isDraggingLocal = isDragging;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[120] p-4">
      {/* Hidden Canvas for Analysis */}
      <canvas ref={analysisCanvasRef} className="hidden" />

      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Icon name="smartphone" className="w-5 h-5 text-fuchsia-400" />
            Reframe for Social (9:16)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 bg-black flex justify-center relative select-none flex-grow overflow-hidden">
          {/* Container mimics 16:9 Aspect Ratio explicitly */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            ref={videoContainerRef}
            className="relative aspect-video w-full max-h-full bg-slate-800 overflow-hidden group cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            role="application"
            tabIndex={0}
            onTouchStart={handleMouseDown}
          >
            {/* The Video */}
            <video
              ref={videoRef}
              src={videoUrl}
              className={`w-full h-full object-cover pointer-events-none ${isAnalyzing ? 'opacity-50 blur-sm' : ''}`}
              muted
              loop
              // AutoPlay if not analyzing
              autoPlay={!isAnalyzing}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Analyzing Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
                <Icon
                  name="video-analysis"
                  className="w-12 h-12 text-cyan-400 animate-pulse mb-4"
                />
                <h4 className="text-white font-bold text-lg">Analyzing Subject...</h4>
                <div className="w-64 h-2 bg-slate-700 rounded-full mt-4 overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-cyan-400 text-xs mt-2 font-mono">{progress}%</p>
              </div>
            )}

            {/* Dimmed Overlay Left */}
            <div
              className="absolute top-0 left-0 bottom-0 bg-black/60 pointer-events-none transition-all duration-75"
              style={{ width: `${cropLeft * 100}%` }}
            />

            {/* Crop Box (Clear area) */}
            <div
              className={`absolute top-0 bottom-0 border-2 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.3)] pointer-events-none transition-all duration-75 ${isDraggingLocal ? 'border-yellow-400' : ''}`}
              style={{
                left: `${cropLeft * 100}%`,
                width: `${CROP_WIDTH_RATIO * 100}%`,
              }}
            >
              {/* Grid Lines */}
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-30">
                <div className="border-r border-b border-white/50"></div>
                <div className="border-r border-b border-white/50"></div>
                <div className="border-b border-white/50"></div>
                <div className="border-r border-b border-white/50"></div>
                <div className="border-r border-b border-white/50"></div>
                <div className="border-b border-white/50"></div>
                <div className="border-r border-white/50"></div>
                <div className="border-r border-white/50"></div>
                <div></div>
              </div>

              {/* Subject Indicator (if tracking) */}
              {keyframes.length > 0 && !isAnalyzing && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-1 bg-fuchsia-600/80 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                    <Icon name="video" className="w-3 h-3" /> TRACKING
                  </div>
                </div>
              )}

              {/* Handle Icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2 rounded-full backdrop-blur-sm">
                <Icon name="sliders" className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Dimmed Overlay Right */}
            <div
              className="absolute top-0 right-0 bottom-0 bg-black/60 pointer-events-none transition-all duration-75"
              style={{ width: `${(1 - cropLeft - CROP_WIDTH_RATIO) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-slate-800/30 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={handleCenter}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Reset Center
            </button>
            <button
              onClick={runSmartAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-2 text-sm font-bold text-cyan-100 bg-cyan-900/40 border border-cyan-500/50 hover:bg-cyan-900/60 rounded-lg transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? (
                <Icon name="spinner" className="w-4 h-4 animate-spin" />
              ) : (
                <Icon name="video-analysis" className="w-4 h-4" />
              )}
              Auto-Track Subject
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-lg text-sm font-bold shadow-lg flex items-center gap-2"
            >
              <Icon name="download" className="w-4 h-4" />
              Export Vertical Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReframeModal;
