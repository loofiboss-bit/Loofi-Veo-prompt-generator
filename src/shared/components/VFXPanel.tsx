import React from 'react';
import RangeInput from '@shared/components/ui/RangeInput';
import Icon from '@shared/components/ui/Icon';
import { VideoFilters } from '@core/types';
import CheckboxInput from './ui/CheckboxInput';

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

const PresetButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
      active
        ? 'bg-cyan-600 text-white border-cyan-500'
        : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
    }`}
  >
    {label}
  </button>
);

const VFXPanel: React.FC<VFXPanelProps> = ({ filters, onChange, onReset }) => {
  const activeVFX = filters.vfxType || 'none';
  const filmConfig = filters.filmConfig || {
    enabled: false,
    preset: 'custom',
    grainIntensity: 0,
    halationIntensity: 0,
    jitterIntensity: 0,
  };

  const updateFilmConfig = (updates: Partial<typeof filmConfig>) => {
    onChange('filmConfig', { ...filmConfig, ...updates });
  };

  const applyPreset = (preset: 'super8' | 'vhs' | 'cinema') => {
    let updates = {};
    if (preset === 'super8') {
      updates = {
        preset,
        enabled: true,
        grainIntensity: 60,
        halationIntensity: 40,
        jitterIntensity: 30,
      };
    } else if (preset === 'vhs') {
      updates = {
        preset,
        enabled: true,
        grainIntensity: 80,
        halationIntensity: 20,
        jitterIntensity: 10,
      };
    } else if (preset === 'cinema') {
      updates = {
        preset,
        enabled: true,
        grainIntensity: 20,
        halationIntensity: 60,
        jitterIntensity: 0,
      };
    }
    updateFilmConfig(updates);
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 w-full max-w-sm max-h-[80vh] overflow-y-auto custom-scrollbar">
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

      {/* Standard Filters */}
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
        <div className="space-y-2 mb-6 p-3 bg-slate-900/30 rounded-lg">
          <RangeInput
            label="Effect Intensity"
            name="vfxIntensity"
            value={filters.vfxIntensity}
            onChange={(e) => onChange('vfxIntensity', parseInt(e.target.value))}
            min={0}
            max={100}
            step={5}
          />
        </div>
      )}

      {/* Film Emulation Engine */}
      <div className="border-t border-slate-700/50 pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-cyan-300 uppercase">Film Emulation</label>
          <CheckboxInput
            id="filmEnabled"
            name="filmEnabled"
            label="Enable"
            checked={filmConfig.enabled}
            onChange={(e) => updateFilmConfig({ enabled: e.target.checked })}
          />
        </div>

        {filmConfig.enabled && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Presets */}
            <div className="flex gap-2 mb-2">
              <PresetButton
                label="Super 8"
                active={filmConfig.preset === 'super8'}
                onClick={() => applyPreset('super8')}
              />
              <PresetButton
                label="VHS"
                active={filmConfig.preset === 'vhs'}
                onClick={() => applyPreset('vhs')}
              />
              <PresetButton
                label="35mm"
                active={filmConfig.preset === 'cinema'}
                onClick={() => applyPreset('cinema')}
              />
            </div>

            <RangeInput
              label="Grain Strength"
              name="grainIntensity"
              value={filmConfig.grainIntensity}
              onChange={(e) =>
                updateFilmConfig({ grainIntensity: parseInt(e.target.value), preset: 'custom' })
              }
              min={0}
              max={100}
            />
            <RangeInput
              label="Halation (Glow)"
              name="halationIntensity"
              value={filmConfig.halationIntensity}
              onChange={(e) =>
                updateFilmConfig({ halationIntensity: parseInt(e.target.value), preset: 'custom' })
              }
              min={0}
              max={100}
            />
            <RangeInput
              label="Jitter (Shake)"
              name="jitterIntensity"
              value={filmConfig.jitterIntensity}
              onChange={(e) =>
                updateFilmConfig({ jitterIntensity: parseInt(e.target.value), preset: 'custom' })
              }
              min={0}
              max={100}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VFXPanel;
