
import React from 'react';
import Tooltip from './Tooltip';

interface RangeInputProps {
  label: string;
  name: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  info?: string;
  disabled?: boolean;
}

const RangeInput: React.FC<RangeInputProps> = ({ label, name, value, onChange, min = 0, max = 100, step = 1, info, disabled }) => {
  return (
    <div className={`w-full ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={`range-${name}`} className="flex items-center space-x-2 text-sm font-medium text-slate-200">
          <span>{label}</span>
          {info && <Tooltip text={info} />}
        </label>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">{value}%</span>
      </div>
      <input
        type="range"
        id={`range-${name}`}
        name={name}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      />
    </div>
  );
};

export default RangeInput;
