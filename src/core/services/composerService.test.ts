/**
 * ComposerService — Unit Tests
 *
 * Tests block creation, connection validation, cycle detection,
 * topological sort, graph evaluation, and auto-layout.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { PromptBlock, BlockConnection, Position } from '@core/types/composer';

// Re-import fresh instance for test isolation
let service: typeof import('@core/services/composerService').composerService;

beforeEach(async () => {
  const mod = await import('@core/services/composerService');
  service = mod.composerService;
});

// ─── Block Registry ─────────────────────────────────────────────────────────

describe('Block Registry', () => {
  it('returns all block definitions', () => {
    const defs = service.getBlockDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(20);
    expect(defs.every((d) => d.type && d.category && d.label)).toBe(true);
  });

  it('returns block definition by type', () => {
    const def = service.getBlockDefinition('scene-environment');
    expect(def).toBeDefined();
    expect(def!.category).toBe('scene');
    expect(def!.label).toBe('Environment');
    expect(def!.ports.length).toBeGreaterThan(0);
  });

  it('returns undefined for unknown type', () => {
    const def = service.getBlockDefinition('nonexistent' as never);
    expect(def).toBeUndefined();
  });

  it('filters blocks by category', () => {
    const sceneBlocks = service.getBlocksByCategory('scene');
    expect(sceneBlocks.length).toBe(4);
    expect(sceneBlocks.every((b) => b.category === 'scene')).toBe(true);
  });

  it('returns all 8 categories', () => {
    const cats = service.getCategories();
    expect(cats.length).toBe(8);
    const ids = cats.map((c) => c.id);
    expect(ids).toContain('scene');
    expect(ids).toContain('character');
    expect(ids).toContain('camera');
    expect(ids).toContain('style');
    expect(ids).toContain('audio');
    expect(ids).toContain('effect');
    expect(ids).toContain('logic');
    expect(ids).toContain('output');
  });

  it('every block definition has valid ports', () => {
    const defs = service.getBlockDefinitions();
    for (const def of defs) {
      for (const port of def.ports) {
        expect(['input', 'output']).toContain(port.direction);
        expect(['text', 'number', 'style', 'camera', 'audio', 'any']).toContain(port.dataType);
      }
    }
  });
});

// ─── Block Factory ──────────────────────────────────────────────────────────

describe('Block Factory', () => {
  it('creates a block with the correct type and position', () => {
    const pos: Position = { x: 100, y: 200 };
    const block = service.createBlock('scene-environment', pos, 1);
    expect(block).not.toBeNull();
    expect(block!.type).toBe('scene-environment');
    expect(block!.category).toBe('scene');
    expect(block!.position).toEqual(pos);
    expect(block!.zIndex).toBe(1);
    expect(block!.id).toBeTruthy();
  });

  it('initializes default fields from definition', () => {
    const block = service.createBlock('scene-environment', { x: 0, y: 0 }, 0);
    expect(block).not.toBeNull();
    expect(block!.fields).toBeDefined();
    expect('environment' in block!.fields).toBe(true);
  });

  it('returns null for unknown block type', () => {
    const block = service.createBlock('unknown-type' as never, { x: 0, y: 0 }, 0);
    expect(block).toBeNull();
  });

  it('generates unique IDs for blocks', () => {
    const b1 = service.createBlock('scene-environment', { x: 0, y: 0 }, 0);
    const b2 = service.createBlock('scene-environment', { x: 0, y: 0 }, 0);
    expect(b1!.id).not.toBe(b2!.id);
  });

  it('sets default flags', () => {
    const block = service.createBlock('camera-movement', { x: 0, y: 0 }, 0);
    expect(block).not.toBeNull();
    expect(block!.isCollapsed).toBe(false);
    expect(block!.isDisabled).toBe(false);
    expect(block!.isLocked).toBe(false);
  });

  it('creates different block types', () => {
    const scene = service.createBlock('scene-environment', { x: 0, y: 0 }, 0);
    const cam = service.createBlock('camera-movement', { x: 0, y: 0 }, 0);
    const output = service.createBlock('output-prompt', { x: 0, y: 0 }, 0);
    expect(scene!.category).toBe('scene');
    expect(cam!.category).toBe('camera');
    expect(output!.category).toBe('output');
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeBlock(type: string, id: string): PromptBlock {
  const block = service.createBlock(type as never, { x: 0, y: 0 }, 0);
  if (!block) throw new Error(`Failed to create block of type: ${type}`);
  return { ...block, id };
}

function makeConnection(
  id: string,
  sourceBlockId: string,
  sourcePortId: string,
  targetBlockId: string,
  targetPortId: string,
): BlockConnection {
  return {
    id,
    sourceBlockId,
    sourcePortId,
    targetBlockId,
    targetPortId,
    style: 'bezier',
    isActive: true,
  };
}

// ─── Connection Validation ──────────────────────────────────────────────────

describe('Connection Validation', () => {
  it('rejects self-connections', () => {
    const block = makeBlock('scene-environment', 'a');
    const result = service.canConnect([block], [], 'a', 'out-scene', 'a', 'in-context');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('itself');
  });

  it('rejects if block not found', () => {
    const result = service.canConnect([], [], 'missing1', 'out', 'missing2', 'in');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('accepts valid output-to-input connections', () => {
    const s = makeBlock('scene-environment', 's');
    const o = makeBlock('output-prompt', 'o');
    const result = service.canConnect([s, o], [], 's', 'out-scene', 'o', 'in-scene');
    expect(result.valid).toBe(true);
  });

  it('rejects duplicate connections', () => {
    const s = makeBlock('scene-environment', 's');
    const o = makeBlock('output-prompt', 'o');
    const existing = makeConnection('c1', 's', 'out-scene', 'o', 'in-scene');

    const result = service.canConnect([s, o], [existing], 's', 'out-scene', 'o', 'in-scene');
    expect(result.valid).toBe(false);
    // Max-connections check fires before duplicate check since in-scene has max=1
    expect(result.reason).toBeDefined();
  });

  it('rejects input-to-input connections', () => {
    const a = makeBlock('scene-environment', 'a');
    const b = makeBlock('scene-lighting', 'b');
    const result = service.canConnect([a, b], [], 'a', 'in-context', 'b', 'in-context');
    expect(result.valid).toBe(false);
  });

  it('rejects when max connections exceeded', () => {
    const s1 = makeBlock('scene-environment', 's1');
    const s2 = makeBlock('scene-environment', 's2');
    const o = makeBlock('output-prompt', 'o');

    // in-scene has maxConnections=1, fill it with s1
    const existing = makeConnection('c1', 's1', 'out-scene', 'o', 'in-scene');
    // Try to connect s2 to the same port — should be rejected
    const result = service.canConnect([s1, s2, o], [existing], 's2', 'out-scene', 'o', 'in-scene');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('maximum');
  });
});

// ─── Cycle Detection ────────────────────────────────────────────────────────

describe('Cycle Detection', () => {
  it('detects direct cycle (A→B→A)', () => {
    const a = makeBlock('scene-environment', 'a');
    const b = makeBlock('scene-lighting', 'b');
    const conn = makeConnection('c1', 'a', 'out-scene', 'b', 'in-context');

    const hasCycle = service.wouldCreateCycle([a, b], [conn], 'b', 'a');
    expect(hasCycle).toBe(true);
  });

  it('detects indirect cycle (A→B→C→A)', () => {
    const a = makeBlock('scene-environment', 'a');
    const b = makeBlock('scene-lighting', 'b');
    const c = makeBlock('camera-movement', 'c');

    const connections: BlockConnection[] = [
      makeConnection('c1', 'a', 'out-scene', 'b', 'in-context'),
      makeConnection('c2', 'b', 'out-lighting', 'c', 'in-context'),
    ];

    const hasCycle = service.wouldCreateCycle([a, b, c], connections, 'c', 'a');
    expect(hasCycle).toBe(true);
  });

  it('allows non-cyclic connections', () => {
    const a = makeBlock('scene-environment', 'a');
    const b = makeBlock('scene-lighting', 'b');
    const c = makeBlock('camera-movement', 'c');

    const connections: BlockConnection[] = [
      makeConnection('c1', 'a', 'out-scene', 'b', 'in-context'),
    ];

    const hasCycle = service.wouldCreateCycle([a, b, c], connections, 'a', 'c');
    expect(hasCycle).toBe(false);
  });

  it('handles disconnected graphs', () => {
    const a = makeBlock('scene-environment', 'a');
    const b = makeBlock('scene-lighting', 'b');
    const c = makeBlock('camera-movement', 'c');
    const d = makeBlock('style-color', 'd');

    const connections: BlockConnection[] = [
      makeConnection('c1', 'c', 'out-camera', 'd', 'in-context'),
    ];

    const hasCycle = service.wouldCreateCycle([a, b, c, d], connections, 'a', 'b');
    expect(hasCycle).toBe(false);
  });
});

// ─── Topological Sort ───────────────────────────────────────────────────────

describe('Topological Sort', () => {
  it('sorts a linear chain correctly', () => {
    const a = makeBlock('scene-environment', 'a');
    const b = makeBlock('scene-lighting', 'b');
    const c = makeBlock('output-prompt', 'c');

    const connections: BlockConnection[] = [
      makeConnection('c1', 'a', 'out-scene', 'b', 'in-context'),
      makeConnection('c2', 'b', 'out-lighting', 'c', 'in-style'),
    ];

    const order = service.topologicalSort([a, b, c], connections);
    expect(order).not.toBeNull();
    expect(order!.indexOf('a')).toBeLessThan(order!.indexOf('b'));
    expect(order!.indexOf('b')).toBeLessThan(order!.indexOf('c'));
  });

  it('returns null for cyclic graph', () => {
    const a = makeBlock('scene-environment', 'a');
    const b = makeBlock('scene-lighting', 'b');

    const connections: BlockConnection[] = [
      makeConnection('c1', 'a', 'out-scene', 'b', 'in-context'),
      makeConnection('c2', 'b', 'out-lighting', 'a', 'in-context'),
    ];

    const order = service.topologicalSort([a, b], connections);
    expect(order).toBeNull();
  });

  it('handles disconnected blocks', () => {
    const a = makeBlock('scene-environment', 'a');
    const b = makeBlock('scene-lighting', 'b');

    const order = service.topologicalSort([a, b], []);
    expect(order).not.toBeNull();
    expect(order!).toHaveLength(2);
    expect(order!).toContain('a');
    expect(order!).toContain('b');
  });

  it('handles diamond dependency', () => {
    const a = makeBlock('scene-environment', 'a');
    const b = makeBlock('scene-lighting', 'b');
    const c = makeBlock('camera-movement', 'c');
    const d = makeBlock('output-prompt', 'd');

    const connections: BlockConnection[] = [
      makeConnection('c1', 'a', 'out-scene', 'b', 'in-context'),
      makeConnection('c2', 'a', 'out-scene', 'c', 'in-context'),
      makeConnection('c3', 'b', 'out-lighting', 'd', 'in-style'),
      makeConnection('c4', 'c', 'out-camera', 'd', 'in-camera'),
    ];

    const order = service.topologicalSort([a, b, c, d], connections);
    expect(order).not.toBeNull();
    expect(order!.indexOf('a')).toBeLessThan(order!.indexOf('b'));
    expect(order!.indexOf('a')).toBeLessThan(order!.indexOf('c'));
    expect(order!.indexOf('b')).toBeLessThan(order!.indexOf('d'));
    expect(order!.indexOf('c')).toBeLessThan(order!.indexOf('d'));
  });

  it('returns empty array for empty graph', () => {
    const order = service.topologicalSort([], []);
    expect(order).toEqual([]);
  });
});

// ─── Graph Evaluation ───────────────────────────────────────────────────────

describe('Graph Evaluation', () => {
  it('evaluates a single scene block (no output block)', () => {
    const block = makeBlock('scene-environment', 'loc1');
    block.fields = {
      environment: 'forest clearing',
      sensoryDetails: 'birds chirping',
      dynamicEvents: '',
    };

    const result = service.evaluateGraph([block], []);
    expect(result.hasCycles).toBe(false);
    expect(result.errors).toHaveLength(0);
    expect(result.blockResults).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes('No output block'))).toBe(true);
  });

  it('evaluates connected blocks with output', () => {
    const scene = makeBlock('scene-environment', 'scene1');
    scene.fields = { environment: 'underwater cave', sensoryDetails: '', dynamicEvents: '' };

    const output = makeBlock('output-prompt', 'out1');
    output.fields = { format: 'natural', maxLength: 500 };

    const connections: BlockConnection[] = [
      makeConnection('c1', 'scene1', 'out-scene', 'out1', 'in-scene'),
    ];

    const result = service.evaluateGraph([scene, output], connections);
    expect(result.hasCycles).toBe(false);
    expect(result.evaluationOrder).toContain('scene1');
    expect(result.evaluationOrder).toContain('out1');
    expect(result.compiledPrompt).toBeTruthy();
    expect(result.compiledPrompt).toContain('underwater cave');
  });

  it('skips disabled blocks', () => {
    const block = makeBlock('scene-environment', 'disabled1');
    block.fields = { environment: 'forest' };
    block.isDisabled = true;

    const result = service.evaluateGraph([block], []);
    expect(result.blockResults).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('returns cycle error for cyclic graphs', () => {
    const a = makeBlock('scene-environment', 'a');
    const b = makeBlock('scene-lighting', 'b');

    const connections: BlockConnection[] = [
      makeConnection('c1', 'a', 'out-scene', 'b', 'in-context'),
      makeConnection('c2', 'b', 'out-lighting', 'a', 'in-context'),
    ];

    const result = service.evaluateGraph([a, b], connections);
    expect(result.hasCycles).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('produces compiled prompt from multiple connected blocks', () => {
    const env = makeBlock('scene-environment', 'env');
    env.fields = {
      environment: 'Japanese temple',
      sensoryDetails: 'incense smoke',
      dynamicEvents: '',
    };

    const cam = makeBlock('camera-movement', 'cam');
    cam.fields = { movement: 'slow dolly forward', speed: 'slow' };

    const output = makeBlock('output-prompt', 'out');
    output.fields = { format: 'natural', maxLength: 500 };

    const connections: BlockConnection[] = [
      makeConnection('c1', 'env', 'out-scene', 'out', 'in-scene'),
      makeConnection('c2', 'cam', 'out-camera', 'out', 'in-camera'),
    ];

    const result = service.evaluateGraph([env, cam, output], connections);
    expect(result.compiledPrompt.length).toBeGreaterThan(0);
  });
});

// ─── Auto Layout ────────────────────────────────────────────────────────────

describe('Auto Layout', () => {
  it('positions blocks in columns based on depth', () => {
    const a = makeBlock('scene-environment', 'a');
    const b = makeBlock('scene-lighting', 'b');
    const c = makeBlock('output-prompt', 'c');

    const connections: BlockConnection[] = [
      makeConnection('c1', 'a', 'out-scene', 'b', 'in-context'),
      makeConnection('c2', 'b', 'out-lighting', 'c', 'in-style'),
    ];

    const results = service.autoLayoutBlocks([a, b, c], connections);
    expect(results).toHaveLength(3);

    const posA = results.find((r) => r.id === 'a')!.position;
    const posB = results.find((r) => r.id === 'b')!.position;
    const posC = results.find((r) => r.id === 'c')!.position;

    expect(posB.x).toBeGreaterThan(posA.x);
    expect(posC.x).toBeGreaterThan(posB.x);
  });

  it('handles empty graph', () => {
    const results = service.autoLayoutBlocks([], []);
    expect(results).toEqual([]);
  });

  it('handles single block', () => {
    const a = makeBlock('scene-environment', 'a');
    const results = service.autoLayoutBlocks([a], []);
    expect(results).toHaveLength(1);
    expect(results[0].position.x).toBeGreaterThanOrEqual(0);
    expect(results[0].position.y).toBeGreaterThanOrEqual(0);
  });
});

// ─── Snap Position ──────────────────────────────────────────────────────────

describe('Snap Position', () => {
  it('snaps to nearest grid point', () => {
    const pos = service.snapPosition({ x: 13, y: 27 }, 20);
    expect(pos.x).toBe(20);
    expect(pos.y).toBe(20);
  });

  it('does not snap when already on grid', () => {
    const pos = service.snapPosition({ x: 40, y: 60 }, 20);
    expect(pos.x).toBe(40);
    expect(pos.y).toBe(60);
  });

  it('snaps correctly for small grid', () => {
    const pos = service.snapPosition({ x: 7, y: 3 }, 5);
    expect(pos.x).toBe(5);
    expect(pos.y).toBe(5);
  });
});
