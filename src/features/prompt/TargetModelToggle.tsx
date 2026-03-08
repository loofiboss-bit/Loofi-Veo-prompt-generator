import React from 'react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@shared/components/ui/Tooltip';
import { Icon } from '@shared/components/ui';
import { OllamaStatusBadge } from './OllamaStatusBadge';

interface TargetModelToggleProps {
  value: 'veo' | 'sora' | 'local';
  onChange: (model: 'veo' | 'sora' | 'local') => void;
  info?: string;
}

const ModelOptionCard: React.FC<{
  label: string;
  description: string;
  iconName: 'film' | 'globe' | 'lock';
  isActive: boolean;
  onClick: () => void;
  activeColor: 'cyan' | 'fuchsia' | 'emerald';
}> = ({ label, description, iconName, isActive, onClick, activeColor }) => {
  const activeClasses =
    activeColor === 'cyan'
      ? 'bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
      : activeColor === 'fuchsia'
        ? 'bg-fuchsia-950/20 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.15)]'
        : 'bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]';

  const iconColor = isActive
    ? activeColor === 'cyan'
      ? 'text-cyan-400'
      : activeColor === 'fuchsia'
        ? 'text-fuchsia-400'
        : 'text-emerald-400'
    : 'text-slate-500 group-hover:text-slate-300';

  const iconBg = isActive
    ? activeColor === 'cyan'
      ? 'bg-cyan-500/10'
      : activeColor === 'fuchsia'
        ? 'bg-fuchsia-500/10'
        : 'bg-emerald-500/10'
    : 'bg-slate-800/50 group-hover:bg-slate-700/50';

  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={isActive}
      className={`group relative w-full p-4 text-left rounded-xl border transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 ${
        isActive
          ? activeClasses
          : 'bg-slate-900/40 border-slate-800 hover:border-slate-600 hover:bg-slate-800/40'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 p-3 rounded-lg transition-colors ${iconBg}`}>
          <Icon name={iconName} className={`w-6 h-6 transition-colors ${iconColor}`} />
        </div>
        <div>
          <h4
            className={`text-base font-semibold transition-colors ${isActive ? 'text-slate-100' : 'text-slate-300 group-hover:text-slate-200'}`}
          >
            {label}
          </h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Active Indicator Dot */}
      {isActive && (
        <div
          className={`absolute top-4 right-4 w-2 h-2 rounded-full ${activeColor === 'cyan' ? 'bg-cyan-400' : activeColor === 'fuchsia' ? 'bg-fuchsia-400' : 'bg-emerald-400'} shadow-[0_0_8px_currentColor]`}
        />
      )}
    </button>
  );
};

const TargetModelToggle: React.FC<TargetModelToggleProps> = ({ value, onChange, info }) => {
  const { t } = useTranslation('prompt');

  return (
    <div className="space-y-3">
      <label className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
        <span>{t('labelTargetModel')}</span>
        {info && <Tooltip text={info} />}
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="radiogroup">
        <ModelOptionCard
          label={t('toggleVeoLabel')}
          description={t('toggleVeoDescription')}
          iconName="film"
          isActive={value === 'veo'}
          onClick={() => onChange('veo')}
          activeColor="cyan"
        />
        <ModelOptionCard
          label={t('toggleSoraLabel')}
          description={t('toggleSoraDescription')}
          iconName="globe"
          isActive={value === 'sora'}
          onClick={() => onChange('sora')}
          activeColor="fuchsia"
        />
        <ModelOptionCard
          label={t('toggleLocalLabel', { defaultValue: 'Local LLM' })}
          description={t('toggleLocalDescription', {
            defaultValue: 'Run locally via Ollama. No data leaves your machine.',
          })}
          iconName="lock"
          isActive={value === 'local'}
          onClick={() => onChange('local')}
          activeColor="emerald"
        />
      </div>
      {value === 'local' && <OllamaStatusBadge />}
    </div>
  );
};

export { TargetModelToggle };
