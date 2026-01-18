
import React, { useState } from 'react';
import Icon from './Icon';
import { ClipTransition } from '../types';

interface TransitionHandleProps {
    transition: ClipTransition;
    onUpdate: (t: ClipTransition) => void;
    left: number; // Pixel position
    zoomLevel: number;
}

const TransitionHandle: React.FC<TransitionHandleProps> = ({ transition, onUpdate, left, zoomLevel }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Calculate visual width of the transition handle
    // For cuts, it's thin. For active transitions, it spans the duration.
    const width = transition.type === 'cut' ? 4 : (transition.duration * zoomLevel);
    // Position needs to be offset to center on the cut point
    const offsetLeft = left - (width / 2);

    const getIcon = (type: string) => {
        switch (type) {
            case 'dissolve': return 'activity'; // Represents mixing
            case 'fade_black': return 'moon';
            case 'wipe_left': return 'arrow-right';
            default: return 'plus'; // Cut/None
        }
    };

    const handleSelect = (type: ClipTransition['type']) => {
        const duration = type === 'cut' ? 0 : 1.0; // Default 1s for new transitions
        onUpdate({ type, duration });
        setIsOpen(false);
    };

    return (
        <>
            <div 
                className={`absolute top-0 bottom-0 z-30 group cursor-pointer flex flex-col justify-center items-center transition-all ${isOpen ? 'z-50' : ''}`}
                style={{ left: `${offsetLeft}px`, width: `${Math.max(16, width)}px` }}
                onClick={() => setIsOpen(!isOpen)}
            >
                {/* Visual Bar */}
                <div className={`w-full h-full opacity-50 group-hover:opacity-80 transition-opacity rounded-sm ${
                    transition.type === 'cut' 
                    ? 'w-1 bg-white/20 group-hover:bg-white/50' 
                    : 'bg-fuchsia-500/30 border-x border-fuchsia-400/50'
                }`}></div>

                {/* Icon Badge */}
                <div className="absolute top-2 p-1 rounded-full bg-slate-800 border border-slate-600 shadow-md transform scale-0 group-hover:scale-100 transition-transform">
                    <Icon name={getIcon(transition.type)} className="w-3 h-3 text-white" />
                </div>
            </div>

            {/* Popover Menu */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div 
                        className="absolute top-8 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 w-48 animate-fade-in-up"
                        style={{ left: `${left}px` }}
                    >
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-2">Transition Type</h4>
                        <div className="space-y-1">
                            <button onClick={() => handleSelect('cut')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-xs text-slate-300">
                                <Icon name="cancel" className="w-3 h-3" /> None (Cut)
                            </button>
                            <button onClick={() => handleSelect('dissolve')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-xs text-slate-300">
                                <Icon name="activity" className="w-3 h-3 text-cyan-400" /> Cross Dissolve
                            </button>
                            <button onClick={() => handleSelect('fade_black')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-xs text-slate-300">
                                <Icon name="moon" className="w-3 h-3 text-slate-400" /> Dip to Black
                            </button>
                            <button onClick={() => handleSelect('wipe_left')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-xs text-slate-300">
                                <Icon name="arrow-right" className="w-3 h-3 text-fuchsia-400" /> Wipe Left
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default TransitionHandle;
