import React, { useRef, useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import RangeInput from '@shared/components/ui/RangeInput';
import TextAreaInput from '@shared/components/ui/TextAreaInput';

interface InpaintingModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onGenerate: (maskBase64: string, prompt: string) => Promise<void>;
}

const InpaintingModal: React.FC<InpaintingModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onGenerate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize canvases
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const img = new Image();
    img.src = imageUrl;
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas || !containerRef.current) return;

      // Calculate Aspect Ratio fitting
      const maxWidth = containerRef.current.clientWidth;
      const maxHeight = containerRef.current.clientHeight;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);

      const displayWidth = img.width * ratio;
      const displayHeight = img.height * ratio;

      canvas.width = img.width;
      canvas.height = img.height;
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;

      // Apply display size via CSS style to fit screen, but keep internal resolution native
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      const ctx = canvas.getContext('2d');
      const maskCtx = maskCanvas.getContext('2d');

      if (ctx && maskCtx) {
        // Draw original image on main canvas
        ctx.drawImage(img, 0, 0);

        // Fill mask canvas with black (no mask)
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    };
  }, [isOpen, imageUrl]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;

    const { x, y } = getCoords(e);

    // Draw visual feedback (Semi-transparent Red)
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 0, 100, 0.5)'; // Magic pink marker
    ctx.fill();

    // Draw actual mask (White on Black)
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
    maskCtx.fillStyle = 'white';
    maskCtx.fill();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    // Reload image to clear visuals
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      if (ctx) ctx.drawImage(img, 0, 0);
    };

    // Reset mask to black
    if (maskCtx) {
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || !maskCanvasRef.current) return;

    setIsProcessing(true);
    try {
      // Get mask as base64
      const maskBase64 = maskCanvasRef.current.toDataURL('image/png').split(',')[1];
      await onGenerate(maskBase64, prompt);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-[200] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 pointer-events-auto">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Icon name="sparkles" className="w-4 h-4 text-fuchsia-400" />
            Magic Fixer
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-slate-900/80 backdrop-blur-md rounded-full text-slate-400 hover:text-white border border-slate-700 pointer-events-auto transition-colors"
        >
          <Icon name="cancel" className="w-5 h-5" />
        </button>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl flex-grow flex items-center justify-center overflow-hidden my-16"
      >
        <canvas
          ref={canvasRef}
          className="cursor-crosshair shadow-2xl rounded-sm border border-slate-700"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {/* Hidden mask canvas */}
        <canvas ref={maskCanvasRef} className="hidden" />
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl animate-fade-in-up">
        <div className="flex flex-col gap-4">
          {/* Top Row: Brush & Clear */}
          <div className="flex items-center gap-4">
            <div className="w-1/3">
              <RangeInput
                label="Brush Size"
                name="brushSize"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                min={5}
                max={100}
              />
            </div>
            <div className="flex-grow"></div>
            <button
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Icon name="trash" className="w-3 h-3" />
              Clear Mask
            </button>
          </div>

          {/* Bottom Row: Prompt & Action */}
          <div className="flex gap-3">
            <div className="flex-grow">
              <TextAreaInput
                label=""
                name="inpaintingPrompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what should fill the masked area (e.g. 'clean wall', 'a red flower')"
                rows={1}
                autoFocus
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isProcessing}
              className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-6 rounded-xl font-bold shadow-lg shadow-fuchsia-900/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
            >
              {isProcessing ? (
                <Icon name="spinner" className="w-5 h-5 animate-spin" />
              ) : (
                <Icon name="magic" className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Fix It</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InpaintingModal;
