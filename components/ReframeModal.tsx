
import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { CropConfig } from '../types';

interface ReframeModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
    onConfirm: (config: CropConfig) => void;
}

const ReframeModal: React.FC<ReframeModalProps> = ({ isOpen, onClose, videoUrl, onConfirm }) => {
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [cropLeft, setCropLeft] = useState(0); // Percentage 0.0 to 1.0 (of container width - crop width)
    const [containerWidth, setContainerWidth] = useState(0);
    
    // 9:16 aspect ratio relative to 16:9 container
    // If container is 16:9 (1.77), a 9:16 (0.56) box has a width ratio of:
    // (9/16) / (16/9) = 0.5625 / 1.777 = ~0.316
    const CROP_WIDTH_RATIO = 0.3164; // (9/16) / (16/9)

    useEffect(() => {
        const handleResize = () => {
            if (videoContainerRef.current) {
                setContainerWidth(videoContainerRef.current.offsetWidth);
            }
        };
        
        window.addEventListener('resize', handleResize);
        // Initial measurement
        if (isOpen) {
            setTimeout(handleResize, 100);
        }
        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen]);

    // Center on open
    useEffect(() => {
        if (isOpen) {
            // Center is (1 - ratio) / 2
            setCropLeft((1 - CROP_WIDTH_RATIO) / 2);
        }
    }, [isOpen]);

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        setDragStart(clientX);
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (dragStart === null || !videoContainerRef.current) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const deltaX = clientX - dragStart;
        const deltaPercent = deltaX / videoContainerRef.current.offsetWidth;

        let newLeft = cropLeft + deltaPercent;
        
        // Clamp
        const maxLeft = 1 - CROP_WIDTH_RATIO;
        if (newLeft < 0) newLeft = 0;
        if (newLeft > maxLeft) newLeft = maxLeft;

        setCropLeft(newLeft);
        setDragStart(clientX);
    };

    const handleMouseUp = () => {
        setDragStart(null);
    };

    // Global listeners for drag outside
    useEffect(() => {
        if (dragStart !== null) {
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
    }, [dragStart, cropLeft]);

    const handleConfirm = () => {
        // We need to return the X position as a percentage of the *original video width*.
        // cropLeft is a percentage of the container width.
        // The crop box width is CROP_WIDTH_RATIO * containerWidth.
        onConfirm({ xPercentage: cropLeft });
    };

    const handleCenter = () => {
        setCropLeft((1 - CROP_WIDTH_RATIO) / 2);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[120] p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Icon name="smartphone" className="w-5 h-5 text-fuchsia-400" />
                        Reframe for Social (9:16)
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 bg-black flex justify-center relative select-none">
                    {/* Container mimics 16:9 Aspect Ratio explicitly */}
                    <div 
                        ref={videoContainerRef}
                        className="relative aspect-video w-full max-h-[60vh] bg-slate-800 overflow-hidden group cursor-grab active:cursor-grabbing"
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleMouseDown}
                    >
                        {/* The Video */}
                        <video 
                            src={videoUrl} 
                            className="w-full h-full object-cover pointer-events-none"
                            muted
                            loop // Loop for easy reframing
                            autoPlay
                        />

                        {/* Dimmed Overlay Left */}
                        <div 
                            className="absolute top-0 left-0 bottom-0 bg-black/60 pointer-events-none transition-all duration-75"
                            style={{ width: `${cropLeft * 100}%` }}
                        />

                        {/* Crop Box (Clear area) */}
                        <div 
                            className="absolute top-0 bottom-0 border-2 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.3)] pointer-events-none transition-all duration-75"
                            style={{ 
                                left: `${cropLeft * 100}%`,
                                width: `${CROP_WIDTH_RATIO * 100}%`
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
                    <button 
                        onClick={handleCenter}
                        className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                        Auto-Center
                    </button>
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
