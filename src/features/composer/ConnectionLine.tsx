/**
 * ConnectionLine — v2.0.0
 *
 * SVG connection line between two block ports.
 * Supports bezier, straight, and step styles.
 */

import React, { useMemo } from 'react';
import type { ConnectionStyle, Position } from '@core/types/composer';

interface ConnectionLineProps {
  from: Position;
  to: Position;
  style: ConnectionStyle;
  isSelected: boolean;
  isActive: boolean;
  color?: string;
  onClick?: () => void;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  from,
  to,
  style,
  isSelected,
  isActive,
  color = '#64748b',
  onClick,
}) => {
  const pathD = useMemo(() => {
    switch (style) {
      case 'straight':
        return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

      case 'step': {
        const midX = (from.x + to.x) / 2;
        return `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}`;
      }

      case 'bezier':
      default: {
        const dx = Math.abs(to.x - from.x);
        const controlOffset = Math.max(dx * 0.4, 60);
        const cp1x = from.x + controlOffset;
        const cp2x = to.x - controlOffset;
        return `M ${from.x} ${from.y} C ${cp1x} ${from.y}, ${cp2x} ${to.y}, ${to.x} ${to.y}`;
      }
    }
  }, [from, to, style]);

  const strokeColor = isSelected ? '#22d3ee' : isActive ? color : '#475569';
  const strokeWidth = isSelected ? 3 : 2;
  const opacity = isActive ? 1 : 0.4;

  return (
    <g className="cursor-pointer" onClick={onClick}>
      {/* Wider invisible hit area */}
      <path d={pathD} fill="none" stroke="transparent" strokeWidth={12} />
      {/* Glow effect for selected */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={6}
          opacity={0.2}
          strokeLinecap="round"
        />
      )}
      {/* Main line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        strokeLinecap="round"
        strokeDasharray={isActive ? 'none' : '6 4'}
      />
      {/* Animated flow indicator for active connections */}
      {isActive && (
        <circle r={3} fill={strokeColor}>
          <animateMotion dur="2s" repeatCount="indefinite" path={pathD} />
        </circle>
      )}
    </g>
  );
};

// ─── Pending Connection Line ─────────────────────────────────────────────────

interface PendingConnectionLineProps {
  from: Position;
  to: Position;
}

export const PendingConnectionLine: React.FC<PendingConnectionLineProps> = ({ from, to }) => {
  const dx = Math.abs(to.x - from.x);
  const controlOffset = Math.max(dx * 0.4, 60);
  const cp1x = from.x + controlOffset;
  const cp2x = to.x - controlOffset;
  const pathD = `M ${from.x} ${from.y} C ${cp1x} ${from.y}, ${cp2x} ${to.y}, ${to.x} ${to.y}`;

  return (
    <path
      d={pathD}
      fill="none"
      stroke="#22d3ee"
      strokeWidth={2}
      strokeDasharray="8 4"
      opacity={0.6}
      strokeLinecap="round"
    >
      <animate
        attributeName="stroke-dashoffset"
        from="0"
        to="-24"
        dur="0.8s"
        repeatCount="indefinite"
      />
    </path>
  );
};
