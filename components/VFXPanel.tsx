
import React from 'react';
import RangeInput from './RangeInput';
import Icon from './Icon';
import { VideoFilters } from '../types';

interface VFXPanelProps {
    filters: VideoFilters;
    onChange: (key: keyof VideoFilters, value: any) => void;
    onReset: () => void;
}

const VFXOption: React.FC<{
    label: string;
    active: boolean;
    onClick: () => void;
    icon: React.ComponentProps<typeof Icon>['name'];
}> = ({ label, active, onClick, icon }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
            active 
            ? 'bg-fuchsia-900/30 border-fuchsia-500 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.2)]' 
            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-500'
        }`}
    >
        <Icon name={icon} className="w-5 h-5 mb-1" />
        <span className="text-[10px] font-bold uppercase">{label}</span>
    </button>
);

const VFXPanel: React.FC<VFXPanelProps> = ({ filters, onChange, onReset }) => {
    const activeVFX = filters.vfxType || 'none';

    return (
        <div className="bg-slate-800/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-2">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Icon name="magic" className="w-4 h-4 text-fuchsia-400" />
                    Atmosphere & VFX
                </h3>
                <button 
                    onClick={onReset}
                    className="text-[10px] text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
                >
                    Reset
                </button>
            </div>
            
            <div className="grid grid-cols-4 gap-2 mb-6">
                <VFXOption 
                    label="None" 
                    icon="cancel" 
                    active={activeVFX === 'none'} 
                    onClick={() => onChange('vfxType', 'none')} 
                />
                <VFXOption 
                    label="Grain" 
                    icon="filter" 
                    active={activeVFX === 'grain'} 
                    onClick={() => onChange('vfxType', 'grain')} 
                />
                <VFXOption 
                    label="Vignette" 
                    icon="circle" 
                    active={activeVFX === 'vignette'} 
                    onClick={() => onChange('vfxType', 'vignette')} 
                />
                <VFXOption 
                    label="Cinema" 
                    icon="film" 
                    active={activeVFX === 'letterbox'} 
                    onClick={() => onChange('vfxType', 'letterbox')} 
                />
            </div>

            {activeVFX !== 'none' && (
                <div className="space-y-2 animate-fade-in-up">
                    <RangeInput 
                        label="Effect Intensity" 
                        name="vfxIntensity" 
                        value={filters.vfxIntensity} 
                        onChange={(e) => onChange('vfxIntensity', parseInt(e.target.value))} 
                        min={0} 
                        max={100} 
                        step={5}
                    />
                    <p className="text-[10px] text-slate-500 text-center mt-1">
                        {activeVFX === 'grain' && "Adds simulated film noise overlay."}
                        {activeVFX === 'vignette' && "Darkens corners for focus."}
                        {activeVFX === 'letterbox' && "Adds cinematic black bars (2.35:1)."}
                    </p>
                </div>
            )}
        </div>
    );
};

export default VFXPanel;
