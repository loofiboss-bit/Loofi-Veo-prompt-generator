
import React from 'react';
import RangeInput from './RangeInput';
import Icon from './Icon';
import CheckboxInput from './CheckboxInput';

interface AudioMixerProps {
    volumes: { dialogue: number; sfx: number; music: number; ambience?: number };
    autoDuck: boolean;
    onChange: (key: 'dialogue' | 'sfx' | 'music' | 'ambience', value: number) => void;
    onAutoDuckChange: (checked: boolean) => void;
    onReset: () => void;
}

const VerticalSlider: React.FC<{ 
    label: string; 
    icon: React.ComponentProps<typeof Icon>['name']; 
    value: number; 
    onChange: (val: number) => void;
    colorClass: string;
}> = ({ label, icon, value, onChange, colorClass }) => (
    <div className="flex flex-col items-center h-48 group">
        <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">{Math.round(value * 100)}%</div>
        <div className="relative flex-grow w-8 bg-slate-900 rounded-full border border-slate-700 overflow-hidden">
            <div 
                className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ${colorClass}`}
                style={{ height: `${Math.min(100, (value / 1.5) * 100)}%` }}
            />
            <input 
                type="range"
                min="0"
                max="1.5"
                step="0.1"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title={`${label}: ${Math.round(value * 100)}%`}
            />
        </div>
        <div className="mt-3 flex flex-col items-center gap-1">
            <Icon name={icon} className="w-4 h-4 text-slate-300" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        </div>
    </div>
);

const AudioMixer: React.FC<AudioMixerProps> = ({ volumes, autoDuck, onChange, onAutoDuckChange, onReset }) => {
    return (
        <div className="bg-slate-800/90 backdrop-blur-xl p-5 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-5 border-b border-slate-700/50 pb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Icon name="sliders" className="w-4 h-4 text-cyan-400" />
                    Audio Mixer
                </h3>
                <button 
                    onClick={onReset}
                    className="text-[10px] text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
                >
                    Reset
                </button>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mb-6">
                <VerticalSlider 
                    label="Dialogue" 
                    icon="user" 
                    value={volumes.dialogue} 
                    onChange={(v) => onChange('dialogue', v)} 
                    colorClass="bg-cyan-500/80"
                />
                <VerticalSlider 
                    label="Ambience" 
                    icon="activity" 
                    value={volumes.ambience || 0.15} 
                    onChange={(v) => onChange('ambience', v)} 
                    colorClass="bg-purple-500/80"
                />
                <VerticalSlider 
                    label="SFX" 
                    icon="filter" 
                    value={volumes.sfx} 
                    onChange={(v) => onChange('sfx', v)} 
                    colorClass="bg-yellow-500/80"
                />
                <VerticalSlider 
                    label="Music" 
                    icon="music" 
                    value={volumes.music} 
                    onChange={(v) => onChange('music', v)} 
                    colorClass="bg-fuchsia-500/80"
                />
            </div>

            <div className="pt-3 border-t border-slate-700/50">
                <CheckboxInput 
                    id="autoDuck"
                    name="autoDuck"
                    label="Auto-Duck Music (Sidechain)"
                    checked={autoDuck}
                    onChange={(e) => onAutoDuckChange(e.target.checked)}
                    tooltipText="Automatically lower music volume when dialogue is speaking."
                />
            </div>
        </div>
    );
};

export default AudioMixer;
