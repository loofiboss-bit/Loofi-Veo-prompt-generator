/**
 * DependencyGraph Component
 * v1.8.0 — Project Intelligence Layer
 *
 * Visual representation of project component relationships.
 * Uses SVG for a lightweight, accessible dependency map.
 */

import React, { useMemo } from 'react';
import type { DependencyMap, DependencyNode, DependencyEdge } from '@core/types/diagnostics';

interface DependencyGraphProps {
  map: DependencyMap;
  width?: number;
  height?: number;
}

const NODE_COLORS: Record<string, string> = {
  project: '#22d3ee', // cyan
  character: '#a78bfa', // purple
  location: '#34d399', // emerald
  shot: '#60a5fa', // blue
  clip: '#fbbf24', // amber
  template: '#f472b6', // pink
  preset: '#f97316', // orange
};

const NODE_RADIUS: Record<string, number> = {
  project: 24,
  character: 18,
  location: 18,
  shot: 14,
  clip: 10,
  template: 14,
  preset: 14,
};

interface LayoutNode extends DependencyNode {
  x: number;
  y: number;
  r: number;
}

function layoutNodes(nodes: DependencyNode[], width: number, height: number): LayoutNode[] {
  // Group by type for radial layout
  const groups = new Map<string, DependencyNode[]>();
  for (const node of nodes) {
    if (!groups.has(node.type)) groups.set(node.type, []);
    groups.get(node.type)!.push(node);
  }

  const layoutNodes: LayoutNode[] = [];
  const centerX = width / 2;
  const centerY = height / 2;
  const typeOrder = ['project', 'character', 'location', 'shot', 'clip', 'template', 'preset'];
  const ringGap = Math.min(width, height) / (typeOrder.length + 1) / 2;

  let ring = 0;
  for (const type of typeOrder) {
    const group = groups.get(type) || [];
    if (group.length === 0) continue;

    const radius = ring * ringGap + ringGap;
    const angleStep = (2 * Math.PI) / Math.max(group.length, 1);

    group.forEach((node, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const r = NODE_RADIUS[node.type] || 12;

      // Project node at center
      if (node.type === 'project') {
        layoutNodes.push({ ...node, x: centerX, y: centerY, r });
      } else {
        layoutNodes.push({
          ...node,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          r,
        });
      }
    });

    ring++;
  }

  return layoutNodes;
}

const EDGE_COLORS: Record<string, string> = {
  contains: '#475569',
  references: '#22d3ee',
  'depends-on': '#f59e0b',
  uses: '#a78bfa',
};

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  map,
  width = 500,
  height = 400,
}) => {
  const layoutResult = useMemo(
    () => layoutNodes(map.nodes, width, height),
    [map.nodes, width, height],
  );
  const nodeMap = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    for (const n of layoutResult) m.set(n.id, n);
    return m;
  }, [layoutResult]);

  if (map.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No dependency data available. Run analysis first.
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="bg-slate-900/50 rounded-xl border border-slate-700/30"
      >
        {/* Edges */}
        {map.edges.map((edge: DependencyEdge, i: number) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`edge-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={EDGE_COLORS[edge.relationship] || '#475569'}
              strokeWidth={1}
              strokeOpacity={0.4}
            />
          );
        })}

        {/* Nodes */}
        {layoutResult.map((node: LayoutNode) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={NODE_COLORS[node.type] || '#60a5fa'}
              fillOpacity={0.2}
              stroke={NODE_COLORS[node.type] || '#60a5fa'}
              strokeWidth={1.5}
            />
            <text
              x={node.x}
              y={node.y + node.r + 12}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
              className="select-none pointer-events-none"
            >
              {node.label.length > 12 ? node.label.slice(0, 11) + '…' : node.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 px-1">
        {Object.entries(NODE_COLORS).map(([type, color]) => {
          const count = map.nodes.filter((n) => n.type === type).length;
          if (count === 0) return null;
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="capitalize">{type}</span>
              <span className="text-slate-600">({count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
