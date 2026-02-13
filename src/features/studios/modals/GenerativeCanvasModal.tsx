import React, { useRef, useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import RangeInput from '@shared/components/ui/RangeInput';
import TextAreaInput from '@shared/components/ui/TextAreaInput';

interface GenerativeCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  conceptImageUrl: string;
  onGenerateFill: (compositeBase64: string, maskBase64: string, prompt: string) => Promise<void>;
}

const GenerativeCanvasModal: React.FC<GenerativeCanvasModalProps> = ({
  isOpen,
  onClose,
  conceptImageUrl,
  onGenerateFill,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(70); // Default zoom out to 70%
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  // Load Image
  useEffect(() => {
    if (!isOpen || !conceptImageUrl) return;
    const img = new Image();
    img.src = conceptImageUrl;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgElement(img);
    };
  }, [isOpen, conceptImageUrl]);

  // Draw Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set native resolution to match source image
    canvas.width = imgElement.width;
    canvas.height = imgElement.height;

    // Visual Display sizing (fit container)
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const ratio = Math.min(containerW / canvas.width, containerH / canvas.height);

    canvas.style.width = `${canvas.width * ratio}px`;
    canvas.style.height = `${canvas.height * ratio}px`;

    // Clear Background (Checkerboard effect is handled by CSS on parent div)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate Scaled Dimensions
    const newW = canvas.width * (scale / 100);
    const newH = canvas.height * (scale / 100);
    const dx = (canvas.width - newW) / 2;
    const dy = (canvas.height - newH) / 2;

    // Draw Image
    ctx.drawImage(imgElement, dx, dy, newW, newH);
  }, [imgElement, scale, isOpen]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !imgElement) return;

    setIsGenerating(true);
    try {
      // Prepare Composites
      const w = imgElement.width;
      const h = imgElement.height;
      const newW = w * (scale / 100);
      const newH = h * (scale / 100);
      const dx = (w - newW) / 2;
      const dy = (h - newH) / 2;

      // 1. COMPOSITE IMAGE
      // Create a temp canvas for the input image
      // We fill background with black (or edge extension color) to avoid alpha issues
      const compCanvas = document.createElement('canvas');
      compCanvas.width = w;
      compCanvas.height = h;
      const compCtx = compCanvas.getContext('2d');
      if (!compCtx) throw new Error('Canvas init failed');

      compCtx.fillStyle = 'black';
      compCtx.fillRect(0, 0, w, h);
      compCtx.drawImage(imgElement, dx, dy, newW, newH);
      const compositeBase64 = compCanvas.toDataURL('image/png').split(',')[1];

      // 2. MASK IMAGE
      // White = Inpaint (Change), Black = Protected (Keep)
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) throw new Error('Canvas init failed');

      // Fill whole area with White (To be generated)
      maskCtx.fillStyle = 'white';
      maskCtx.fillRect(0, 0, w, h);

      // Draw center box Black (Protected)
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(dx, dy, newW, newH);

      const maskBase64 = maskCanvas.toDataURL('image/png').split(',')[1];

      await onGenerateFill(compositeBase64, maskBase64, prompt);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-[200] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 pointer-events-auto">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Icon name="expand" className="w-4 h-4 text-cyan-400" />
            Generative Canvas (Expand Frame)
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
        className="relative w-full max-w-5xl flex-grow flex items-center justify-center overflow-hidden my-16 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-slate-900 border-y border-slate-800"
      >
        <canvas
          ref={canvasRef}
          className="shadow-2xl rounded-sm border border-slate-700 bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%,transparent_75%,#1e293b_75%,#1e293b),linear-gradient(45deg,#1e293b_25%,transparent_25%,transparent_75%,#1e293b_75%,#1e293b)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] bg-slate-950"
        />

        {/* Visual Guidelines for Frame */}
        {imgElement && !isGenerating && (
          <div className="absolute text-xs text-slate-500 font-mono bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-1 rounded pointer-events-none">
            Canvas: {imgElement.width}x{imgElement.height} | Scale: {scale}%
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl animate-fade-in-up">
        <div className="flex flex-col gap-4">
          {/* Scale Slider */}
          <div className="flex items-center gap-4">
            <div className="flex-grow">
              <RangeInput
                label="Zoom Out Amount"
                name="outpaintScale"
                value={scale}
                onChange={(e) => setScale(parseInt(e.target.value))}
                min={30}
                max={90}
                step={5}
                info="Smaller % means more surroundings will be generated."
              />
            </div>
          </div>

          {/* Prompt & Action */}
          <div className="flex gap-3">
            <div className="flex-grow">
              <TextAreaInput
                label=""
                name="outpaintPrompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the FULL scene, including new surroundings (e.g. 'Wide shot of a robot in a vast desert')"
                rows={1}
                autoFocus
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 rounded-xl font-bold shadow-lg shadow-cyan-900/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
            >
              {isGenerating ? (
                <Icon name="spinner" className="w-5 h-5 animate-spin" />
              ) : (
                <Icon name="magic" className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Generate Fill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerativeCanvasModal;
