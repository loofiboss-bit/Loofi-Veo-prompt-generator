/**
 * HealthBar — compact status bar showing API endpoint health & online status.
 * Intended to sit in the header/footer area.
 *
 * @module shared/components/resilience/HealthBar
 */
import React from 'react';
import { useApiHealthStore } from '@core/store/useApiHealthStore';
import type { EndpointHealth } from '@core/types';

interface HealthBarProps {
  /** Optional CSS class */
  className?: string;
}

const statusColors: Record<string, string> = {
  healthy: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  unhealthy: 'bg-red-500',
  unknown: 'bg-slate-600',
};

const statusLabels: Record<string, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  unhealthy: 'Unhealthy',
  unknown: 'Unknown',
};

const EndpointDot: React.FC<{ endpoint: EndpointHealth; name: string }> = ({ endpoint, name }) => (
  <div
    className="group relative"
    title={`${name}: ${statusLabels[endpoint.status]} (${Math.round(endpoint.avgLatencyMs)}ms avg)`}
  >
    <div
      className={`w-2.5 h-2.5 rounded-full ${statusColors[endpoint.status]}
        ${endpoint.status === 'degraded' ? 'animate-pulse' : ''}`}
    />
    {/* Tooltip on hover */}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
      <div className="bg-slate-900 text-xs text-slate-300 px-2 py-1 rounded shadow-lg whitespace-nowrap border border-slate-700">
        <div className="font-medium text-slate-200">{name}</div>
        <div>Status: {statusLabels[endpoint.status]}</div>
        <div>Avg latency: {Math.round(endpoint.avgLatencyMs)}ms</div>
        <div>Error rate: {(endpoint.errorRate * 100).toFixed(1)}%</div>
      </div>
    </div>
  </div>
);

export const HealthBar: React.FC<HealthBarProps> = ({ className = '' }) => {
  const endpoints = useApiHealthStore((s) => s.endpoints);
  const isOnline = useApiHealthStore((s) => s.isOnline);

  const endpointEntries = Object.entries(endpoints);
  if (endpointEntries.length === 0 && isOnline) return null;

  const worstStatus = endpointEntries.reduce((worst, [, ep]) => {
    const rank: Record<string, number> = { unhealthy: 3, degraded: 2, healthy: 1, unknown: 0 };
    return (rank[ep.status] ?? 0) > (rank[worst] ?? 0) ? ep.status : worst;
  }, 'healthy' as string);

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg
        ${isOnline ? 'bg-slate-800/50' : 'bg-red-900/30 border border-red-800/50'}
        ${className}`}
    >
      {/* Online/Offline indicator */}
      <div className="flex items-center gap-1">
        <div
          className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}
        />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Endpoint dots */}
      {endpointEntries.length > 0 && (
        <>
          <div className="w-px h-3 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            {endpointEntries.map(([name, ep]) => (
              <EndpointDot key={name} endpoint={ep} name={name} />
            ))}
          </div>
        </>
      )}

      {/* Summary text if degraded */}
      {worstStatus !== 'healthy' && isOnline && (
        <span className="text-[10px] text-amber-400">
          {worstStatus === 'unhealthy' ? 'API issues' : 'Slow'}
        </span>
      )}
    </div>
  );
};
