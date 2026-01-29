import React, { useRef, useState, useEffect } from 'react';
import Icon from './Icon';
import RangeInput from './RangeInput';

interface MotionBrushProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onSave: (maskBlob: Blob) => void;
}

type Tool = 'brush' | 'eraser' | 'arrow';

interface Arrow {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

const MotionBrush: React.FC<MotionBrushProps> = ({ isOpen, onClose, imageUrl, onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null); // Mask Layer
    const uiCanvasRef = useRef<HTMLCanvasElement>(null); // UI/Vector Layer
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [currentTool, setCurrentTool] = useState<Tool>('brush');
    const [brushSize, setBrushSize] = useState(30);
    const [isDrawing, setIsDrawing] = useState(false);
    
    // Arrow Logic
    const [arrows, setArrows] = useState<Arrow[]>([]);
    const [arrowStart, setArrowStart] = useState<{x: number, y: number} | null>(null);

    // Initialize
    useEffect(() => {
        if (!isOpen || !imageUrl) return;

        const img = new Image();
        img.src = imageUrl;
        img.crossOrigin = "anonymous";
        
        img.onload = () => {
            if (!containerRef.current || !canvasRef.current || !uiCanvasRef.current) return;

            // Use native resolution for quality
            const w = img.width;
            const h = img.height;

            // Resize canvases
            canvasRef.current.width = w;
            canvasRef.current.height = h;
            uiCanvasRef.current.width = w;
            uiCanvasRef.current.height = h;

            // Calculate display size to fit container
            const containerW = containerRef.current.clientWidth;
            const containerH = containerRef.current.clientHeight;
            const ratio = Math.min(containerW / w, containerH / h);
            
            const displayW = w * ratio;
            const displayH = h * ratio;

            // Apply display styles
            [canvasRef.current, uiCanvasRef.current].forEach(c => {
                c.style.width = `${displayW}px`;
                c.style.height = `${displayH}px`;
            });

            // Set background of container to the image
            // We don't draw image to canvas 1 to simplify export (canvas 1 only has mask)
            containerRef.current.style.backgroundImage = `url(${imageUrl})`;
            containerRef.current.style.backgroundSize = 'contain';
            containerRef.current.style.backgroundRepeat = 'no-repeat';
            containerRef.current.style.backgroundPosition = 'center';
        };
    }, [isOpen, imageUrl]);

    // Redraw UI Layer (Arrows + Cursor)
    useEffect(() => {
        const ctx = uiCanvasRef.current?.getContext('2d');
        if (!ctx || !uiCanvasRef.current) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw Arrows
        ctx.strokeStyle = '#22d3ee'; // Cyan-400
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const drawArrow = (ax: number, ay: number, bx: number, by: number) => {
            const headLen = 20;
            const angle = Math.atan2(by - ay, bx - ax);
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
            
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx - headLen * Math.cos(angle - Math.PI / 6), by - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(bx, by);
            ctx.lineTo(bx - headLen * Math.cos(angle + Math.PI / 6), by - headLen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        };

        arrows.forEach(a => drawArrow(a.startX, a.startY, a.endX, a.endY));
        
        // Active drawing arrow
        if (isDrawing && currentTool === 'arrow' && arrowStart) {
            // Need mouse pos tracking for real-time line, complicated in React effect
            // We'll rely on the mouseMove handler to request animation frame or redraw
        }

    }, [arrows, isDrawing, currentTool, arrowStart]);

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
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const { x, y } = getCoords(e);

        if (currentTool === 'arrow') {
            setArrowStart({ x, y });
        } else {
            paint(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { x, y } = getCoords(e);

        if (currentTool === 'arrow' && arrowStart) {
            // Re-render UI layer for live arrow preview
            const ctx = uiCanvasRef.current?.getContext('2d');
            if (!ctx) return;
            
            // Clear only UI layer and redraw existing + new
            // Note: Efficient way is to trigger the effect, but we do imperative for speed here
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            
            // Redraw existing
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 6;
            arrows.forEach(a => {
                const angle = Math.atan2(a.endY - a.startY, a.endX - a.startX);
                const headLen = 20;
                ctx.beginPath();
                ctx.moveTo(a.startX, a.startY);
                ctx.lineTo(a.endX, a.endY);
                ctx.stroke();
                // Head
                ctx.beginPath();
                ctx.moveTo(a.endX, a.endY);
                ctx.lineTo(a.endX - headLen * Math.cos(angle - Math.PI / 6), a.endY - headLen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(a.endX, a.endY);
                ctx.lineTo(a.endX - headLen * Math.cos(angle + Math.PI / 6), a.endY - headLen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();
            });

            // Draw active
            const angle = Math.atan2(y - arrowStart.y, x - arrowStart.x);
            const headLen = 20;
            ctx.beginPath();
            ctx.moveTo(arrowStart.x, arrowStart.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            // Head
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(x, y);
            ctx.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();

        } else {
            paint(x, y);
        }
    };

    const paint = (x: number, y: number) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;

        if (currentTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Visual Red Overlay
        }

        ctx.beginPath();
        ctx.moveTo(x, y); // Ideally connect from last point, simplified for now
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (currentTool === 'arrow' && arrowStart) {
            const { x, y } = getCoords(e);
            // Only add if length is significant
            if (Math.hypot(x - arrowStart.x, y - arrowStart.y) > 10) {
                setArrows(prev => [...prev, { startX: arrowStart.x, startY: arrowStart.y, endX: x, endY: y }]);
            }
            setArrowStart(null);
        }
    };

    const handleClear = () => {
        const ctx = canvasRef.current?.getContext('2d');
        const uiCtx = uiCanvasRef.current?.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if (uiCtx) uiCtx.clearRect(0, 0, uiCtx.canvas.width, uiCtx.canvas.height);
        setArrows([]);
    };

    const handleExport = () => {
        const maskCanvas = canvasRef.current;
        if (!maskCanvas) return;

        // Create Export Canvas (Black Background, White Mask)
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = maskCanvas.width;
        exportCanvas.height = maskCanvas.height;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        // 1. Fill Black (Static Area)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // 2. Draw User Mask
        // The user mask is semitransparent red. We need to turn any painted pixel to solid white.
        ctx.drawImage(maskCanvas, 0, 0);

        // 3. Threshold to White
        // We iterate pixels or use composite trick. Composite trick:
        // Use 'source-in' with white fill.
        // Step A: Draw mask (Red) on Black bg -> Result: Black with Dark Red.
        // Better:
        // 1. Clear.
        // 2. Draw Mask.
        // 3. 'source-in' fill White -> turns Red pixels White, transparent pixels stay transparent.
        // 4. 'destination-over' fill Black -> turns transparent pixels Black.
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(maskCanvas, 0, 0);
        
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        exportCanvas.toBlob(blob => {
            if (blob) onSave(blob);
            onClose();
        }, 'image/png');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/95 z-[200] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 pointer-events-auto">
                    <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <Icon name="move" className="w-4 h-4 text-cyan-400" />
                        Motion Brush
                    </h2>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-900/80 backdrop-blur-md rounded-full text-slate-400 hover:text-white border border-slate-700 pointer-events-auto transition-colors">
                    <Icon name="cancel" className="w-5 h-5" />
                </button>
            </div>

            {/* Canvas Container */}
            <div 
                ref={containerRef} 
                className="relative w-full max-w-5xl flex-grow flex items-center justify-center overflow-hidden my-16 bg-slate-900 border border-slate-800 rounded-lg cursor-crosshair touch-none"
            >
                {/* Mask Layer */}
                <canvas 
                    ref={canvasRef}
                    className="absolute z-10"
                />
                {/* UI/Arrow Layer (Top) */}
                <canvas 
                    ref={uiCanvasRef}
                    className="absolute z-20"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>

            {/* Toolbar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-3 shadow-2xl flex items-center gap-4 animate-fade-in-up z-20">
                <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
                    <button 
                        onClick={() => setCurrentTool('brush')}
                        className={`p-2 rounded-lg transition-colors ${currentTool === 'brush' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        title="Paint Motion Area"
                    >
                        <Icon name="brush" className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setCurrentTool('eraser')}
                        className={`p-2 rounded-lg transition-colors ${currentTool === 'eraser' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        title="Eraser"
                    >
                        <Icon name="eraser" className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setCurrentTool('arrow')}
                        className={`p-2 rounded-lg transition-colors ${currentTool === 'arrow' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        title="Directional Arrow"
                    >
                        <Icon name="arrow-up-right" className="w-5 h-5" />
                    </button>
                </div>

                <div className="w-px h-8 bg-slate-700" />

                <div className="w-32 px-2">
                    <RangeInput 
                        label="" 
                        name="brushSize" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                        min={5} 
                        max={100} 
                        info="Brush Size"
                    />
                </div>

                <div className="w-px h-8 bg-slate-700" />

                <button 
                    onClick={handleClear}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    title="Clear All"
                >
                    <Icon name="trash" className="w-5 h-5" />
                </button>

                <button 
                    onClick={handleExport}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105 ml-2"
                >
                    Save Mask
                </button>
            </div>
        </div>
    );
};

export default MotionBrush;