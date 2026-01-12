
import React from 'react';
import RangeInput from './RangeInput';
import { VideoFilters } from '../types';
import Icon from './Icon';

interface FilterControlsProps {
    filters: VideoFilters;
    onChange: (key: keyof VideoFilters, value: number) => void;
    onReset: () => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({ filters, onChange, onReset }) => {
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
