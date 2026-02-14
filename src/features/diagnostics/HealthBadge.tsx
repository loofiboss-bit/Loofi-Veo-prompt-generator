/**
 * HealthBadge Component
 * v1.8.0 — Project Intelligence Layer
 *
 * Compact badge showing project health score, usable in sidebar or header.
 */

import React from 'react';
import type { ProjectHealthScore } from '@core/types/diagnostics';

interface HealthBadgeProps {
  health: ProjectHealthScore | null;
  onClick?: () => void;
  compact?: boolean;
}

const colorMap: Record<string, string> = {
  red: 'text-red-400 border-red-500/30 bg-red-500/10',
  orange: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  yellow: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  green: 'text-green-400 border-green-500/30 bg-green-500/10',
};

const progressColors: Record<string, string> = {
  red: '#f87171',
  orange: '#fb923c',
  yellow: '#facc15',
  green: '#4ade80',
};

export const HealthBadge: React.FC<HealthBadgeProps> = ({ health, onClick, compact = false }) => {
  if (!health) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-600/30 bg-slate-700/20 text-slate-500 text-xs hover:bg-slate-700/40 transition-colors"
        title="Run diagnostics"
      >
        <span className="w-2 h-2 rounded-full bg-slate-600" />
        {!compact && <span>–</span>}
      </button>
    );
  }

  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (health.overall / 100) * circumference;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-300 hover:shadow-lg ${colorMap[health.color] || colorMap.red}`}
      title={`Project Health: ${health.overall}/100 (${health.tier})`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <svg className="transform -rotate-90 w-5 h-5">
          <circle
            className="text-slate-700"
            strokeWidth="2"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="10"
            cy="10"
          />
          <circle
            stroke={progressColors[health.color] || progressColors.red}
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx="10"
            cy="10"
          />
        </svg>
      </div>
      {!compact && <span className="text-xs font-bold">{health.overall}</span>}
    </button>
  );
};
