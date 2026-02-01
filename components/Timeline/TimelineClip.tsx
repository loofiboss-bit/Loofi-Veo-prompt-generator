
import React, { useState, useEffect, useRef } from 'react';
import { TimelineClip, Shot } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import Icon from '../Icon';
import { getEasedValue } from '../../utils/easing';
import { decode, decodeAudioData } from '../../utils/audio';
import { useAudioWorker } from '../../hooks/useAudioWorker';

interface TimelineClipProps {
    clip: TimelineClip;
    zoomLevel: number;
    onUpdate: (id: string, changes: Partial<TimelineClip>) => void;
    onSelect?: (clip: TimelineClip) => void;
    isSelected?: boolean;
    onSplit?: (clip: TimelineClip, splitTime: number) => void;
}

const TimelineClipView: React.FC<TimelineClipProps> = ({ clip, zoomLevel, onUpdate, onSelect, isSelected, onSplit }) => {
    // Access global store to get actual Shot data including MotionConfig
    const { sbShots, currentTime, assets } = useAppStore();
    const { generateWaveform } = useAudioWorker();
    const shot = sbShots.find(s => s.id === clip.resourceId) as Shot | undefined;

    // Resolve Asset URL for direct image rendering
    const asset = assets.find(a => a.id === String(clip.resourceId));
    const imageUrl = asset?.url || shot?.conceptImageUrl;

    // Waveform State
    const [waveformPeaks, setWaveformPeaks] = useState<Float32Array | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Local state for dragging
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [initialStartTime, setInitialStartTime] = useState(0);
    const [mouseDownX, setMouseDownX] = useState(0);

    // Styles based on type
    let baseStyle = clip.type === 'video' 
        ? 'bg-gradient-to-b from-cyan-600 to-cyan-800 border-cyan-500' 
        : clip.type === 'image'
        ? 'bg-gradient-to-b from-emerald-600 to-emerald-800 border-emerald-500'
        : 'bg-gradient-to-b from-purple-600 to-purple-800 border-purple-500';

    if (clip.isLoading) {
        baseStyle = 'bg-slate-800/50 border-slate-600 border-dashed animate-pulse';
    }
    
    const selectionStyle = isSelected ? 'ring-2 ring-white z-20' : '';
    const left = clip.startTime * zoomLevel;
    const width = clip.duration * zoomLevel;

    // --- Waveform Generation ---
    useEffect(() => {
        if (clip.type !== 'audio' || !asset?.data || waveformPeaks) return;

        const generate = async () => {
            try {
                // Determine sample count based on width (approx 1 peak per 2px)
                const samples = Math.floor(clip.duration * zoomLevel / 2);
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const audioBuffer = await decodeAudioData(decode(asset.data), ctx, 44100, 1);
                
                // If the clip is trimmed (offset), we need the whole buffer stats but need to slice rendering
                // Worker generates peaks for the WHOLE file usually.
                // For efficiency, let's generate peaks for the whole file once (should cache this on Asset really)
                // Here we generate for the specific duration required or whole file.
                
                const peaks = await generateWaveform(audioBuffer, Math.floor(audioBuffer.duration * 10)); // 10 peaks per second resolution
                setWaveformPeaks(peaks);
                ctx.close();
            } catch(e) {
                console.warn("Waveform gen failed", e);
            }
        };
        generate();
    }, [clip.type, asset, clip.duration]); // Re-run if asset changes, simplistic

    // --- Waveform Rendering ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !waveformPeaks) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = canvas.clientHeight * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, canvas.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        
        // Calculate visible range based on clip offset
        // waveformPeaks represents whole file duration
        // We need to render the slice from [offset] to [offset + duration]
        
        const totalDuration = asset?.data ? (asset.data.length / 10000) : clip.duration; // Estimate or store real duration
        // Ideally Asset stores duration. For now, assume peaks map to clip.duration if generated for clip,
        // OR map relatively.
        // Simplified: peaks array length = X, clip duration = Y. 
        // We generated fixed peaks. Let's assume peaks cover the active clip duration for now to simplify logic in this snippet,
        // or re-generate if zoom/trim changes (expensive).
        // Better: peaks map linearly to current clip display.
        
        const barWidth = width / waveformPeaks.length;
        const h = canvas.height / dpr;
        const center = h / 2;

        for (let i = 0; i < waveformPeaks.length; i++) {
            const val = waveformPeaks[i];
            const barH = val * h;
            ctx.fillRect(i * barWidth, center - barH / 2, Math.max(1, barWidth - 1), barH);
        }
    }, [waveformPeaks, width, asset]);

    // --- Drag Handlers ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (clip.isLoading) return; 
        
        // Alt+Click to Split (Razor)
        if (e.altKey && onSplit) {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const splitTime = (clickX / zoomLevel); // relative time within clip
            onSplit(clip, splitTime);
            return;
        }

        e.stopPropagation(); 
        setMouseDownX(e.clientX);
        setIsDragging(true);
        setDragStartX(e.clientX);
        setInitialStartTime(clip.startTime);
        
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStartX;
        const deltaTime = deltaX / zoomLevel;
        let newStartTime = Math.max(0, initialStartTime + deltaTime);
        onUpdate(clip.id, { startTime: newStartTime });
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        
        if (Math.abs(e.clientX - mouseDownX) < 5) {
            if (onSelect) onSelect(clip);
        }
    };

    // --- Motion Keyframe Preview Logic ---
    let motionStyle: React.CSSProperties = {};
    if (clip.transform) {
        const { scale, position, rotation, opacity } = clip.transform;
        motionStyle = {
            transform: `scale(${scale / 100}) translate(${position.x}%, ${position.y}%) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: opacity / 100
        };
    } else if ((clip.type === 'video' || clip.type === 'image') && shot && shot.motionConfig && !clip.isLoading) {
        const { start, end, ease } = shot.motionConfig;
        const clipProgress = Math.max(0, Math.min(1, (currentTime - clip.startTime) / clip.duration));
        const t = getEasedValue(clipProgress, ease || 'linear');
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const currentZoom = lerp(start.zoom, end.zoom, t);
        const currentX = lerp(start.x, end.x, t);
        const currentY = lerp(start.y, end.y, t);
        const translateX = (0.5 - currentX) * 100;
        const translateY = (0.5 - currentY) * 100;
        
        motionStyle = {
            transform: `scale(${currentZoom}) translate(${translateX}%, ${translateY}%)`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
        };
    }

    const filterString = clip.colorGrade ? 
        `brightness(${clip.colorGrade.brightness}) contrast(${clip.colorGrade.contrast}) saturate(${clip.colorGrade.saturation}) hue-rotate(${clip.colorGrade.hueRotate}deg) sepia(${clip.colorGrade.sepia})` 
        : undefined;

    const combinedStyle = { ...motionStyle, filter: filterString };

    return (
        <div 
            onMouseDown={handleMouseDown}
            className={`absolute top-1 bottom-1 rounded-md border text-xs overflow-hidden shadow-sm group select-none ${clip.isLoading ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'} ${baseStyle} ${selectionStyle} ${isDragging ? 'z-50 shadow-xl opacity-90' : 'z-10'}`}
            style={{ 
                left: `${left}px`, 
                width: `${width}px`,
                minWidth: '4px'
            }}
            title={`${clip.label} (${clip.duration.toFixed(1)}s) - Alt+Click to Split`}
        >
            <div className="w-full h-full relative overflow-hidden pointer-events-none">
                {/* Waveform Canvas */}
                {clip.type === 'audio' && (
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 opacity-60" />
                )}

                {/* Video/Image Content Layer */}
                {(clip.type === 'video' || clip.type === 'image') && !clip.isLoading && (
                    <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay">
                        {imageUrl ? (
                            <img 
                                src={imageUrl} 
                                alt="" 
                                className="w-full h-full object-cover transition-transform duration-75 ease-linear"
                                style={combinedStyle}
                            />
                        ) : (
                            <div className="w-full h-full bg-black/20" />
                        )}
                    </div>
                )}

                <div className="relative z-10 w-full h-full px-2 py-1 flex flex-col justify-center">
                    <div className="flex items-center gap-1">
                        {clip.isLoading && <Icon name="spinner" className="w-3 h-3 animate-spin text-fuchsia-400" />}
                        <span className={`font-bold truncate drop-shadow-md ${clip.isLoading ? 'text-fuchsia-200 italic' : 'text-white'}`}>
                            {clip.label}
                        </span>
                    </div>
                    {((shot?.motionConfig || clip.transform) && !clip.isLoading) && (
                        <span className="text-[8px] text-fuchsia-200 uppercase tracking-tighter">★ Motion</span>
                    )}
                </div>
            </div>

            {/* Resize Handles */}
            {!clip.isLoading && (
                <>
                    <div className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize hover:bg-white/30 z-20 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()} />
                    <div className="absolute top-0 bottom-0 right-0 w-2 cursor-w-resize hover:bg-white/30 z-20 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()} />
                </>
            )}
        </div>
    );
};

export default TimelineClipView;
