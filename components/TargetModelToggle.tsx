import React from 'react';

interface TargetModelToggleProps {
  value: 'veo' | 'sora';
  onChange: (model: 'veo' | 'sora') => void;
  label: string;
}

const TargetModelToggle: React.FC<TargetModelToggleProps> = ({ value, onChange, label }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <div className="flex space-x-1 bg-slate-800/60 p-1 rounded-lg border border-slate-700 w-full" role="radiogroup">
        <button
          onClick={() => onChange('veo')}
          role="radio"
          aria-checked={value === 'veo'}
          className={`w-1/2 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            value === 'veo'
              ? 'bg-slate-700 text-white shadow-md'
              : 'text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          Veo
        </button>
        <button
          onClick={() => onChange('sora')}
          role="radio"
          aria-checked={value === 'sora'}
          className={`w-1/2 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            value === 'sora'
              ? 'bg-slate-700 text-white shadow-md'
              : 'text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          Sora
        </button>
      </div>
    </div>
  );
};

export default TargetModelToggle;
