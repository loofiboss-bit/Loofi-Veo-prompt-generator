

import React from 'react';
import Tooltip from './Tooltip';
import Icon from './Icon';

interface TargetModelToggleProps {
  value: 'veo' | 'sora';
  onChange: (model: 'veo' | 'sora') => void;
  uiStrings: {
    label: string;
    veoLabel: string;
    veoDescription: string;
    soraLabel: string;
    soraDescription: string;
  };
  info?: string;
}

const ModelOptionCard: React.FC<{
  label: string;
  description: string;
  iconName: 'film' | 'globe';
  isActive: boolean;
  onClick: () => void;
}> = ({ label, description, iconName, isActive, onClick }) => (
  <button
    onClick={onClick}
    role="radio"
    aria-checked={isActive}
    className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
      isActive
        ? 'bg-slate-700/50 border-cyan-500 shadow-lg'
        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
    }`}
  >
    <div className="flex items-start space-x-3">
      <div className={`mt-1 flex-shrink-0 p-2 rounded-full ${isActive ? 'bg-cyan-500/20' : 'bg-slate-700/50'}`}>
         <Icon name={iconName} className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
      </div>
      <div>
        <h4 className={`font-semibold ${isActive ? 'text-white' : 'text-slate-200'}`}>{label}</h4>
        <p className="text-sm text-slate-300 mt-1">{description}</p>
      </div>
    </div>
  </button>
);

const TargetModelToggle: React.FC<TargetModelToggleProps> = ({ value, onChange, uiStrings, info }) => {
  return (
    <div>
      <label className="flex items-center space-x-2 text-sm font-medium text-slate-300 mb-2">
        <span>{uiStrings.label}</span>
        {info && <Tooltip text={info} />}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
        <ModelOptionCard
            label={uiStrings.veoLabel}
            description={uiStrings.veoDescription}
            iconName="film"
            isActive={value === 'veo'}
            onClick={() => onChange('veo')}
        />
        <ModelOptionCard
            label={uiStrings.soraLabel}
            description={uiStrings.soraDescription}
            iconName="globe"
            isActive={value === 'sora'}
            onClick={() => onChange('sora')}
        />
      </div>
    </div>
  );
};

export default TargetModelToggle;