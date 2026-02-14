/**
 * TrustBadge
 * Visual indicator for plugin trust/signature verification level.
 * v1.9.0 - Platform Foundations (Sprint 3, Task 4.7)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { PluginTrustLevel } from '@core/types/plugin';

// ─── Configuration ──────────────────────────────────────────────────

interface TrustConfig {
  label: string;
  color: string; // tailwind text- color
  bg: string; // tailwind bg- color
  border: string; // tailwind border- color
  fill: string; // SVG fill for shield
  tooltipText: string;
}

const TRUST_CONFIG: Record<PluginTrustLevel, TrustConfig> = {
  trusted: {
    label: 'Trusted',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    fill: '#34d399',
    tooltipText: 'Signature verified — this plugin is signed by a trusted author.',
  },
  untrusted: {
    label: 'Untrusted',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    fill: '#fbbf24',
    tooltipText: 'Not verified — this plugin is signed but the author is not in your trust list.',
  },
  unsigned: {
    label: 'Unsigned',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    fill: '#94a3b8',
    tooltipText: 'No signature — this plugin has not been cryptographically signed.',
  },
  invalid: {
    label: 'Invalid',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    fill: '#f87171',
    tooltipText:
      'Signature invalid — the plugin signature could not be verified. Use with caution.',
  },
};

// ─── Shield SVG ─────────────────────────────────────────────────────

interface ShieldIconProps {
  fill: string;
  size: number;
  className?: string;
}

function ShieldIcon({ fill, size, className }: ShieldIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={fill}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      {/* Checkmark for trusted, X for invalid, nothing for others */}
    </svg>
  );
}

function ShieldTrustedIcon({ fill, size, className }: ShieldIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={fill}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ShieldInvalidIcon({ fill, size, className }: ShieldIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={fill}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="10" y1="10" x2="14" y2="14" />
      <line x1="14" y1="10" x2="10" y2="14" />
    </svg>
  );
}

// Select the right shield variant by trust level
function getShieldComponent(trust: PluginTrustLevel) {
  switch (trust) {
    case 'trusted':
      return ShieldTrustedIcon;
    case 'invalid':
      return ShieldInvalidIcon;
    default:
      return ShieldIcon;
  }
}

// ─── Props ──────────────────────────────────────────────────────────

export interface TrustBadgeProps {
  /** The trust level to display */
  trustLevel: PluginTrustLevel;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show label text next to badge */
  showLabel?: boolean;
  /** Additional CSS classes on the container */
  className?: string;
}

const SIZES = {
  sm: { icon: 12, text: 'text-[10px]', px: 'px-1.5 py-0.5', gap: 'gap-1' },
  md: { icon: 14, text: 'text-xs', px: 'px-2 py-1', gap: 'gap-1.5' },
  lg: { icon: 16, text: 'text-sm', px: 'px-2.5 py-1', gap: 'gap-2' },
} as const;

// ─── Component ──────────────────────────────────────────────────────

export function TrustBadge({
  trustLevel,
  size = 'sm',
  showLabel = true,
  className = '',
}: TrustBadgeProps) {
  const config = TRUST_CONFIG[trustLevel];
  const sz = SIZES[size];
  const ShieldComponent = getShieldComponent(trustLevel);

  // Tooltip state
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = useCallback(() => {
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(true), 400);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setShowTooltip(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${sz.gap} ${sz.px} ${config.bg} ${config.border} border rounded-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      role="status"
      aria-label={`Trust level: ${config.label} — ${config.tooltipText}`}
      tabIndex={0}
    >
      <ShieldComponent fill={config.fill} size={sz.icon} />
      {showLabel && (
        <span className={`${sz.text} ${config.color} font-medium leading-none`}>
          {config.label}
        </span>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 max-w-[240px] text-xs text-white bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 pointer-events-none"
          role="tooltip"
        >
          <div className="font-semibold mb-0.5">{config.label}</div>
          <div className="text-slate-400 leading-relaxed">{config.tooltipText}</div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
