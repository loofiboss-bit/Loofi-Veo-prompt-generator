
import React, { useState } from 'react';
import RangeInput from './RangeInput';
import { VideoFilters, ColorGrade } from '../types';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import * as geminiService from '../services/geminiService';

interface FilterControlsProps {
    filters: VideoFilters;
    onChange: (key: keyof VideoFilters, value: number) => void;
    onReset: () => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({ filters, onChange, onReset }) => {
    const [vibeInput, setVibeInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleMagicMatch = async () => {
        if (!vibeInput.trim()) return;
        setIsGenerating(true);
        try {
            const grade = await geminiService.generateColorGrade(vibeInput);
            
            // Map AI ColorGrade to VideoFilters properties (scaling as needed)
            // ColorGrade uses 1.0 base mostly. FilterControls sliders use percentage (100 base) or specific ranges.
            
            // VideoFilters: contrast (50-150, def 100), saturation (0-200, def 100), sepia (0-100), grain (0-50).
            // ColorGrade: contrast (0-2.0, def 1.0), saturation (0-3.0, def 1.0), sepia (0-1), brightness (0-2.0, def 1.0), hueRotate (deg).
            
            // Note: FilterControls in parent state handles `vfxType` separately. 
            // We map what we can. 
            // Brightness and Hue are not in current VideoFilters interface in UI, need to be added to UI or mapped?
            // Actually, for this update, I will assume we should map to existing where possible or allow expansion if parent supports it.
            // But wait, user requirement 1 was "Add colorGrade object to TimelineClip". 
            // And requirement 4 is "Add a '🎨 Color' tab...".
            // Since this component is reused for global filters, let's just map the standard ones and ignore new ones if UI doesn't support them yet, 
            // OR update UI here to support brightness/hue if `filters` prop allows it. 
            // `VideoFilters` extends `ColorGrade` now in types.ts change.
            
            onChange('contrast', Math.round(grade.contrast * 100));
            onChange('saturation', Math.round(grade.saturation * 100));
            onChange('sepia', Math.round(grade.sepia * 100));
            
            // New fields if parent supports (checked via types)
            if ('brightness' in filters) onChange('brightness' as any, Math.round(grade.brightness * 100));
            if ('hueRotate' in filters) onChange('hueRotate' as any, Math.round(grade.hueRotate));

        } catch (e) {
            console.error("AI Colorist failed", e);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-2">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Icon name="sliders" className="w-4 h-4 text-cyan-400" />
                    Global Color Grading
                </h3>
                <button 
                    onClick={onReset}
                    className="text-[10px] text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
                >
                    Reset
                </button>
            </div>
            
            {/* AI Colorist Section */}
            <div className="mb-6 p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
                <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide mb-2 block">
                    AI Colorist
                </label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={vibeInput}
                        onChange={(e) => setVibeInput(e.target.value)}
                        placeholder="e.g. Matrix Green, Wes Anderson..."
                        className="flex-grow bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleMagicMatch()}
                    />
                    <button 
                        onClick={handleMagicMatch}
                        disabled={isGenerating || !vibeInput.trim()}
                        className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors disabled:opacity-50"
                        title="Magic Match"
                    >
                        {isGenerating ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name="magic" className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <RangeInput 
                    label="Contrast" 
                    name="contrast" 
                    value={filters.contrast} 
                    onChange={(e) => onChange('contrast', parseInt(e.target.value))} 
                    min={50} 
                    max={150} 
                    step={5}
                />
                <RangeInput 
                    label="Saturation" 
                    name="saturation" 
                    value={filters.saturation} 
                    onChange={(e) => onChange('saturation', parseInt(e.target.value))} 
                    min={0} 
                    max={200} 
                    step={5}
                />
                <RangeInput 
                    label="Brightness" 
                    name="brightness" 
                    value={(filters as any).brightness || 100} // Cast for safety if type update pending propagate
                    onChange={(e) => onChange('brightness' as any, parseInt(e.target.value))} 
                    min={50} 
                    max={150} 
                    step={5}
                />
                <RangeInput 
                    label="Hue Rotate" 
                    name="hueRotate" 
                    value={(filters as any).hueRotate || 0} 
                    onChange={(e) => onChange('hueRotate' as any, parseInt(e.target.value))} 
                    min={-180} 
                    max={180} 
                    step={10}
                />
                <RangeInput 
                    label="Sepia" 
                    name="sepia" 
                    value={filters.sepia} 
                    onChange={(e) => onChange('sepia', parseInt(e.target.value))} 
                    min={0} 
                    max={100} 
                    step={5}
                />
                <RangeInput 
                    label="Film Grain" 
                    name="grain" 
                    value={filters.grain} 
                    onChange={(e) => onChange('grain', parseInt(e.target.value))} 
                    min={0} 
                    max={50} 
                    step={5}
                />
            </div>
        </div>
    );
};

export default FilterControls;
