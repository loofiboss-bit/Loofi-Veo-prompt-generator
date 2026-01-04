
import React, { useState } from 'react';
import { calculatePromptQuality } from '../utils/promptScoring';
import { PromptState } from '../types';
import Icon from './Icon';

interface QualityMeterProps {
  promptState: PromptState;
}

const QualityMeter: React.FC<QualityMeterProps> = ({ promptState }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { score, tier, color, suggestions, metCriteria } = calculatePromptQuality(promptState);

  const colorClasses = {
    red: 'text-red-400 border-red-500/30 bg-red-500/10',
    yellow: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    green: 'text-green-400 border-green-500/30 bg-green-500/10',
    cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  };

  const progressColor = {
    red: '#f87171',
    yellow: '#facc15',
    green: '#4ade80',
    cyan: '#22d3ee',
  };

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative z-20">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${colorClasses[color]} hover:shadow-lg`}
      >
        <div className="relative w-6 h-6 flex items-center justify-center">
          <svg className="transform -rotate-90 w-6 h-6">
            <circle
              className="text-slate-700"
              strokeWidth="2"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="12"
              cy="12"
            />
            <circle
              stroke={progressColor[color]}
              strokeWidth="2"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx="12"
              cy="12"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span className="absolute text-[8px] font-bold">{score}</span>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide hidden sm:inline">{tier}</span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-4 animate-fade-in-up origin-top-left">
          <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${colorClasses[color].split(' ')[0]}`}>{tier} Quality</span>
            <span className="text-xs text-slate-500">{score}/100</span>
          </div>
          
          {suggestions.length > 0 && (
            <div className="mb-3">
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Enhance Your Prompt</h4>
              <ul className="space-y-1">
                {suggestions.slice(0, 3).map((s, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <Icon name="plus" className="w-3 h-3 text-cyan-500 mt-0.5 flex-shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {metCriteria.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Strengths</h4>
              <div className="flex flex-wrap gap-1">
                {metCriteria.slice(0, 5).map((c, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QualityMeter;
