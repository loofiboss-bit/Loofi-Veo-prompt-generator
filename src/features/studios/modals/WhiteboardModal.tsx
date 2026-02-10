
import React, { useRef, useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';

interface WhiteboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGeneratePreview: (sketchBase64: string) => void;
    initialImage?: string;
}

type Tool = 'pencil' | 'rect' | 'circle' | 'eraser';

const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ isOpen, onClose, onGeneratePreview, initialImage }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentTool, setCurrentTool] = useState<Tool>('pencil');
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [snapshot, setSnapshot] = useState<ImageData | null>(null);
    
    // Canvas settings
    const strokeColor = '#000000'; // Black ink for sketches
    const lineWidth = currentTool === 'eraser' ? 20 : 3;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Initialize Canvas
    useEffect(() => {
        if (!isOpen) return;
        
        const initCanvas = async () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set white background by default
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Load initial image if provided (e.g. editing existing sketch)
            if (initialImage) {
                const img = new Image();
                img.src = initialImage;
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
            }
        };
        
        // Small delay to ensure DOM is ready
        setTimeout(initCanvas, 100);
        
    }, [isOpen, initialImage]);

    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const { x, y } = getCoords(e);
        setStartPos({ x, y });
        
        // Save snapshot for shapes (to clear preview lines)
        setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !startPos) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoords(e);

        if (currentTool === 'pencil' || currentTool === 'eraser') {
            ctx.lineTo(x, y);
            ctx.stroke();
        } else if (snapshot) {
            // Restore snapshot to clear previous shape preview
            ctx.putImageData(snapshot, 0, 0);
            ctx.beginPath();
            
            if (currentTool === 'rect') {
                ctx.rect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
            } else if (currentTool === 'circle') {
                const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
                ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
            }
            
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        setStartPos(null);
        setSnapshot(null);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const handleGenerate = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Get base64 string (image/png)
        const dataUrl = canvas.toDataURL('image/png');
        // Strip prefix for API
        const base64 = dataUrl.split(',')[1];
        
        onGeneratePreview(base64);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[130] p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden h-[90vh]">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Icon name="pencil" className="w-5 h-5 text-fuchsia-400" />
                        Sketch-to-Shot (Whiteboard)
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={handleClear} className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition-colors">
                            Clear Canvas
                        </button>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white transition-colors">
                            <Icon name="cancel" className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-grow flex bg-slate-800 overflow-hidden">
                    {/* Toolbar */}
                    <div className="w-16 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 space-y-4">
                        <button 
                            onClick={() => setCurrentTool('pencil')}
                            className={`p-3 rounded-xl transition-all ${currentTool === 'pencil' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                            title="Pencil"
                        >
                            <Icon name="pencil" className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={() => setCurrentTool('rect')}
                            className={`p-3 rounded-xl transition-all ${currentTool === 'rect' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                            title="Rectangle"
                        >
                            <Icon name="square" className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={() => setCurrentTool('circle')}
                            className={`p-3 rounded-xl transition-all ${currentTool === 'circle' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                            title="Circle"
                        >
                            <Icon name="circle" className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={() => setCurrentTool('eraser')}
                            className={`p-3 rounded-xl transition-all ${currentTool === 'eraser' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                            title="Eraser"
                        >
                            <Icon name="eraser" className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-grow flex items-center justify-center p-8 bg-slate-950/50 overflow-hidden cursor-crosshair">
                        <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white" style={{ width: '100%', height: '100%', maxWidth: '1024px', maxHeight: '576px', aspectRatio: '16/9' }}>
                            <canvas
                                ref={canvasRef}
                                width={1280}
                                height={720}
                                className="w-full h-full touch-none"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-800/30 flex justify-end items-center border-t border-slate-700">
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleGenerate}
                            className="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-lg text-sm font-bold shadow-lg flex items-center gap-2"
                        >
                            <Icon name="magic" className="w-4 h-4" />
                            Generate Preview
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhiteboardModal;
