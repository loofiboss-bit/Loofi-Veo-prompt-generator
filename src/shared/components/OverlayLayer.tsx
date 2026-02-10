
import React, { useMemo } from 'react';
import { Caption } from '@core/types';

interface OverlayLayerProps {
    captions: Caption[];
    currentTime: number;
}

const OverlayLayer: React.FC<OverlayLayerProps> = ({ captions, currentTime }) => {
    
    // Find active caption
    const activeCaption = useMemo(() => {
        return captions.find(c => currentTime >= c.startTime && currentTime <= c.endTime);
    }, [captions, currentTime]);

    if (!activeCaption) return null;

    const { text, style } = activeCaption;

    // Style classes
    const getStyleClasses = (styleType: string) => {
        switch (styleType) {
            case 'pop':
                return "text-5xl font-black text-white stroke-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] animate-bounce-in";
            case 'karaoke':
                return "text-4xl font-bold text-yellow-400 bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm";
            case 'classic':
            default:
                return "text-2xl font-medium text-white bg-black/50 px-3 py-1 rounded mb-8";
        }
    };

    // Animation Keyframes for Pop
    const popAnimation = `
        @keyframes bounce-in {
            0% { transform: scale(0.8); opacity: 0; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
        }
    `;

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20">
            <style>{popAnimation}</style>
            
            <div className={`
                absolute bottom-16 left-0 right-0 text-center px-8 transition-all duration-150
                ${style === 'pop' ? 'bottom-1/2 translate-y-1/2' : ''} 
            `}>
                <span className={getStyleClasses(style)} style={{ 
                    textShadow: style === 'pop' ? '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' : 'none'
                }}>
                    {text}
                </span>
            </div>
        </div>
    );
};

export default OverlayLayer;
