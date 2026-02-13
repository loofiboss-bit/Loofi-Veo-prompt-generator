import React, { useState } from 'react';
import RangeInput from '@shared/components/ui/RangeInput';
import Icon from '@shared/components/ui/Icon';
import CheckboxInput from './ui/CheckboxInput';
import { ChromaKeyConfig } from '@core/types';

interface ChromaKeyPanelProps {
  config: ChromaKeyConfig;
  onChange: (config: ChromaKeyConfig) => void;
  onReset: () => void;
  onPickColor: () => void;
  isPicking: boolean;
}

const ChromaKeyPanel: React.FC<ChromaKeyPanelProps> = ({
  config,
  onChange,
  onReset,
  onPickColor,
  isPicking,
}) => {
  return (
    <div className="bg-slate-800/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 w-full max-w-sm animate-fade-in-up">
      <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-2">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Icon name="layers" className="w-4 h-4 text-green-400" />
          Chroma Key (Green Screen)
        </h3>
        <button
          onClick={onReset}
          className="text-[10px] text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        <CheckboxInput
          id="chromaEnabled"
          name="chromaEnabled"
          label="Enable Chroma Key"
          checked={config.enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
        />

        {config.enabled && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-end gap-3">
              <div className="flex-grow">
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                  Key Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.color}
                    onChange={(e) => onChange({ ...config, color: e.target.value })}
                    className="h-8 w-12 rounded cursor-pointer bg-slate-700 border border-slate-600 p-0"
                  />
                  <input
                    type="text"
                    value={config.color}
                    onChange={(e) => onChange({ ...config, color: e.target.value })}
                    className="flex-grow bg-slate-900 border border-slate-600 rounded px-2 text-xs text-slate-300 font-mono uppercase"
                  />
                </div>
              </div>
              <button
                onClick={onPickColor}
                className={`h-8 px-3 rounded border flex items-center gap-2 transition-colors ${
                  isPicking
                    ? 'bg-green-500/20 border-green-500 text-green-400 animate-pulse'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                }`}
                title="Pick color from video"
              >
                <Icon name="eye-dropper" className="w-4 h-4" />
              </button>
            </div>

            <RangeInput
              label="Similarity (Threshold)"
              name="similarity"
              value={Math.round(config.similarity * 100)}
              onChange={(e) => onChange({ ...config, similarity: parseInt(e.target.value) / 100 })}
              min={0}
              max={100}
              step={1}
            />

            <RangeInput
              label="Smoothness (Feather)"
              name="smoothness"
              value={Math.round(config.smoothness * 100)}
              onChange={(e) => onChange({ ...config, smoothness: parseInt(e.target.value) / 100 })}
              min={0}
              max={50}
              step={1}
            />

            <RangeInput
              label="Spill Reduction"
              name="spill"
              value={Math.round(config.spill * 100)}
              onChange={(e) => onChange({ ...config, spill: parseInt(e.target.value) / 100 })}
              min={0}
              max={100}
              step={1}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChromaKeyPanel;
