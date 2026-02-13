import React, { useState, useRef, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';

interface CameraPlotterModalProps {
  isOpen: boolean;
  onClose: () => void;
  conceptImageUrl?: string;
  onApply: (cameraPrompt: string) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  uiStrings: any;
}

const CameraPlotterModal: React.FC<CameraPlotterModalProps> = ({
  isOpen,
  onClose,
  conceptImageUrl,
  onApply,
  addToast,
  uiStrings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Initialize Canvas & redraw when path changes
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure canvas size matches display size for correct coordinate mapping
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Image if exists (handled via CSS background mostly, but could draw here if needed)
    // We use CSS background for simplicity with sizing.

    // Draw Grid
    if (!conceptImageUrl) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      // Draw 3x3 grid lines
      const w = canvas.width;
      const h = canvas.height;
      ctx.beginPath();
      ctx.moveTo(w / 3, 0);
      ctx.lineTo(w / 3, h);
      ctx.moveTo((2 * w) / 3, 0);
      ctx.lineTo((2 * w) / 3, h);
      ctx.moveTo(0, h / 3);
      ctx.lineTo(w, h / 3);
      ctx.moveTo(0, (2 * h) / 3);
      ctx.lineTo(w, (2 * h) / 3);
      ctx.stroke();
    }

    // Draw Path
    if (path.length > 1) {
      ctx.strokeStyle = '#f472b6'; // fuchsia-400
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(path[0].x * canvas.width, path[0].y * canvas.height);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * canvas.width, path[i].y * canvas.height);
      }
      ctx.stroke();

      // Draw Start Point (Green Dot)
      ctx.fillStyle = '#4ade80'; // green-400
      ctx.beginPath();
      ctx.arc(path[0].x * canvas.width, path[0].y * canvas.height, 6, 0, Math.PI * 2);
      ctx.fill();

      // Draw End Point (Arrowhead)
      const last = path[path.length - 1];
      const prev = path[path.length - 2];
      if (last && prev) {
        const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
        const arrowLen = 15;
        const endX = last.x * canvas.width;
        const endY = last.y * canvas.height;

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLen * Math.cos(angle - Math.PI / 6),
          endY - arrowLen * Math.sin(angle - Math.PI / 6),
        );
        ctx.lineTo(
          endX - arrowLen * Math.cos(angle + Math.PI / 6),
          endY - arrowLen * Math.sin(angle + Math.PI / 6),
        );
        ctx.lineTo(endX, endY);
        ctx.fillStyle = '#f472b6';
        ctx.fill();
      }
    }
  }, [isOpen, path, conceptImageUrl]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setPath([]); // Start new path
    addPoint(e);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    addPoint(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const addPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    // Clamp 0-1
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    setPath((prev) => [...prev, { x: clampedX, y: clampedY }]);
  };

  const handleClear = () => {
    setPath([]);
  };

  const handleAnalyze = async () => {
    if (path.length < 2) {
      addToast('Please draw a path first.', 'error');
      return;
    }
    setIsAnalyzing(true);
    try {
      const interpretation = await geminiService.interpretCameraPath(path);
      onApply(interpretation);
      onClose();
      addToast('Camera move applied.', 'success');
    } catch (error) {
      addToast('Failed to interpret path.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[100] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Icon name="pencil" className="w-5 h-5 text-fuchsia-400" />
            Camera Plotter
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 bg-slate-950 flex justify-center items-center relative select-none">
          <p className="absolute top-4 left-1/2 -translate-x-1/2 text-slate-500 text-xs z-10 bg-slate-900/80 px-3 py-1 rounded-full pointer-events-none">
            Draw the camera's motion path on the screen
          </p>

          <div className="relative aspect-video w-full max-w-3xl bg-slate-900 border border-slate-700 shadow-xl overflow-hidden cursor-crosshair touch-none">
            {/* Background Image Layer */}
            {conceptImageUrl ? (
              <img
                src={conceptImageUrl}
                alt="Reference"
                className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none select-none"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Icon name="video" className="w-24 h-24 text-slate-800" />
              </div>
            )}

            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full z-20"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            />
          </div>
        </div>

        <div className="p-4 bg-slate-800/30 flex justify-between items-center border-t border-slate-700">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2"
          >
            <Icon name="trash" className="w-4 h-4" />
            Clear Path
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || path.length < 2}
              className="px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <Icon name="spinner" className="w-4 h-4 animate-spin" />
              ) : (
                <Icon name="magic" className="w-4 h-4" />
              )}
              Analyze & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraPlotterModal;
