import React, { useState, useRef, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import { generateMaskSequence } from '@core/services/segmentationService';

interface MagicMaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  onApply: (maskSequence: string[]) => void;
}

const MagicMaskModal: React.FC<MagicMaskModalProps> = ({ isOpen, onClose, videoUrl, onApply }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [clickPoint, setClickPoint] = useState<{ x: number; y: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleVideoClick = (e: React.MouseEvent) => {
    if (!videoRef.current || isProcessing) return;

    const rect = e.currentTarget.getBoundingClientRect();
    // Normalized coordinates (0-1) required by MediaPipe
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setClickPoint({ x, y });
  };

  const handleProcess = async () => {
    if (!clickPoint) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const masks = await generateMaskSequence(videoUrl, [clickPoint], (p) => setProgress(p));
      onApply(masks);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to generate mask. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[150] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Icon name="magic" className="w-5 h-5 text-fuchsia-400" />
            Magic Mask (Rotoscoping)
          </h3>
          {!isProcessing && (
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <Icon name="cancel" className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="flex-grow flex items-center justify-center bg-black p-4 relative">
          <div className="relative" ref={containerRef}>
            <video
              ref={videoRef}
              src={videoUrl}
              className={`max-h-[60vh] rounded-lg shadow-lg ${isProcessing ? 'opacity-50' : 'cursor-crosshair'}`}
              onClick={handleVideoClick}
              muted
              playsInline
            />

            {/* Click Indicator */}
            {clickPoint && !isProcessing && (
              <div
                className="absolute w-4 h-4 bg-fuchsia-500 rounded-full border-2 border-white shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-1/2 animate-ping-slow"
                style={{ left: `${clickPoint.x * 100}%`, top: `${clickPoint.y * 100}%` }}
              />
            )}

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <div className="w-16 h-16 border-4 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin mb-4" />
                <h4 className="text-white font-bold text-lg drop-shadow-md">Tracking Subject...</h4>
                <div className="w-48 h-2 bg-slate-700 rounded-full mt-2 overflow-hidden border border-slate-500">
                  <div
                    className="h-full bg-fuchsia-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-fuchsia-300 text-sm mt-1 font-mono">{progress}%</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-800/30 border-t border-slate-700 flex justify-between items-center">
          <p className="text-sm text-slate-400">
            {clickPoint
              ? 'Subject selected. Click Process to generate mask.'
              : 'Click on the subject you want to isolate.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleProcess}
              disabled={!clickPoint || isProcessing}
              className="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="layers" className="w-4 h-4" />
              Process Mask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagicMaskModal;
