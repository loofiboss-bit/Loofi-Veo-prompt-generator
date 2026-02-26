/**
 * Composer Service — v2.0.0
 *
 * Business logic for the Visual Composer: block definitions, graph evaluation,
 * connection validation, topological sort, and prompt compilation.
 */

import { logger } from './loggerService';
import {
  arePortsCompatible,
  autoLayoutBlocks,
  snapPosition,
  topologicalSort,
  wouldCreateCycle,
} from './composerGraphUtils';
import { evaluateComposerBlock } from './composerBlockEvaluationUtils';
import type {
  BlockDefinition,
  BlockType,
  BlockCategory,
  PromptBlock,
  BlockConnection,
  ComposerEvaluationResult,
  BlockEvaluationResult,
  Position,
} from '@core/types/composer';

// ─── Block Registry ──────────────────────────────────────────────────────────

const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // Scene blocks
  {
    type: 'scene-environment',
    category: 'scene',
    label: 'Environment',
    description: 'Define the scene setting and location',
    icon: 'map-pin',
    color: '#22d3ee',
    ports: [
      {
        id: 'in-context',
        label: 'Context',
        direction: 'input',
        dataType: 'text',
        maxConnections: 1,
      },
      { id: 'out-scene', label: 'Scene', direction: 'output', dataType: 'text', maxConnections: 0 },
    ],
    defaultFields: { environment: '', sensoryDetails: '', dynamicEvents: '' },
  },
  {
    type: 'scene-lighting',
    category: 'scene',
    label: 'Lighting',
    description: 'Set the lighting conditions',
    icon: 'sun',
    color: '#22d3ee',
    ports: [
      {
        id: 'in-context',
        label: 'Context',
        direction: 'input',
        dataType: 'text',
        maxConnections: 1,
      },
      {
        id: 'out-lighting',
        label: 'Lighting',
        direction: 'output',
        dataType: 'style',
        maxConnections: 0,
      },
    ],
    defaultFields: { lightingStyle: 'natural', intensity: 50, direction: 'front' },
  },
  {
    type: 'scene-weather',
    category: 'scene',
    label: 'Weather',
    description: 'Set weather conditions',
    icon: 'cloud-download',
    color: '#22d3ee',
    ports: [
      {
        id: 'out-weather',
        label: 'Weather',
        direction: 'output',
        dataType: 'text',
        maxConnections: 0,
      },
    ],
    defaultFields: { weather: '', intensity: 50 },
  },
  {
    type: 'scene-time',
    category: 'scene',
    label: 'Time of Day',
    description: 'Set the time of day',
    icon: 'clock',
    color: '#22d3ee',
    ports: [
      { id: 'out-time', label: 'Time', direction: 'output', dataType: 'text', maxConnections: 0 },
    ],
    defaultFields: { timeOfDay: 'day' },
  },

  // Character blocks
  {
    type: 'character-action',
    category: 'character',
    label: 'Character Action',
    description: 'Define what the character does',
    icon: 'user',
    color: '#a78bfa',
    ports: [
      {
        id: 'in-character',
        label: 'Character',
        direction: 'input',
        dataType: 'text',
        maxConnections: 1,
      },
      { id: 'in-scene', label: 'Scene', direction: 'input', dataType: 'text', maxConnections: 1 },
      {
        id: 'out-action',
        label: 'Action',
        direction: 'output',
        dataType: 'text',
        maxConnections: 0,
      },
    ],
    defaultFields: { action: '', nuances: '', objectInteraction: '' },
  },
  {
    type: 'character-dialogue',
    category: 'character',
    label: 'Dialogue',
    description: 'Character speech or voiceover',
    icon: 'chat',
    color: '#a78bfa',
    ports: [
      {
        id: 'in-character',
        label: 'Character',
        direction: 'input',
        dataType: 'text',
        maxConnections: 1,
      },
      {
        id: 'out-dialogue',
        label: 'Dialogue',
        direction: 'output',
        dataType: 'text',
        maxConnections: 0,
      },
      {
        id: 'out-audio',
        label: 'Audio',
        direction: 'output',
        dataType: 'audio',
        maxConnections: 0,
      },
    ],
    defaultFields: { text: '', voiceStyle: 'neutral', emotion: '' },
  },
  {
    type: 'character-emotion',
    category: 'character',
    label: 'Emotion',
    description: 'Set character emotional state',
    icon: 'smile',
    color: '#a78bfa',
    ports: [
      {
        id: 'out-emotion',
        label: 'Emotion',
        direction: 'output',
        dataType: 'text',
        maxConnections: 0,
      },
    ],
    defaultFields: { mood: '', intensity: 50 },
  },
  {
    type: 'character-appearance',
    category: 'character',
    label: 'Appearance',
    description: 'Define character visual attributes',
    icon: 'eye',
    color: '#a78bfa',
    ports: [
      {
        id: 'out-appearance',
        label: 'Appearance',
        direction: 'output',
        dataType: 'text',
        maxConnections: 0,
      },
    ],
    defaultFields: { clothing: '', accessories: '', archetype: '' },
  },

  // Camera blocks
  {
    type: 'camera-movement',
    category: 'camera',
    label: 'Camera Movement',
    description: 'Define camera motion (pan, track, dolly)',
    icon: 'move',
    color: '#60a5fa',
    ports: [
      {
        id: 'in-subject',
        label: 'Subject',
        direction: 'input',
        dataType: 'text',
        maxConnections: 1,
      },
      {
        id: 'out-camera',
        label: 'Camera',
        direction: 'output',
        dataType: 'camera',
        maxConnections: 0,
      },
    ],
    defaultFields: { movement: 'static', speed: 'medium' },
  },
  {
    type: 'camera-angle',
    category: 'camera',
    label: 'Camera Angle',
    description: 'Set camera framing angle',
    icon: 'video',
    color: '#60a5fa',
    ports: [
      {
        id: 'out-angle',
        label: 'Angle',
        direction: 'output',
        dataType: 'camera',
        maxConnections: 0,
      },
    ],
    defaultFields: { angle: 'eye-level', distance: 'medium' },
  },
  {
    type: 'camera-lens',
    category: 'camera',
    label: 'Lens',
    description: 'Select lens characteristics',
    icon: 'eye-dropper',
    color: '#60a5fa',
    ports: [
      { id: 'out-lens', label: 'Lens', direction: 'output', dataType: 'camera', maxConnections: 0 },
    ],
    defaultFields: { lensType: 'standard', focalLength: 50, depthOfField: 'normal' },
  },
  {
    type: 'camera-composition',
    category: 'camera',
    label: 'Composition',
    description: 'Set composition rules',
    icon: 'grid-3x3',
    color: '#60a5fa',
    ports: [
      {
        id: 'out-composition',
        label: 'Composition',
        direction: 'output',
        dataType: 'camera',
        maxConnections: 0,
      },
    ],
    defaultFields: { guide: 'rule-of-thirds', headroom: 50 },
  },

  // Style blocks
  {
    type: 'style-art',
    category: 'style',
    label: 'Art Style',
    description: 'Define the visual art style',
    icon: 'palette',
    color: '#f472b6',
    ports: [
      {
        id: 'out-style',
        label: 'Style',
        direction: 'output',
        dataType: 'style',
        maxConnections: 0,
      },
    ],
    defaultFields: { artStyle: '', customStyle: '' },
  },
  {
    type: 'style-color',
    category: 'style',
    label: 'Color Palette',
    description: 'Set the color grading',
    icon: 'brush',
    color: '#f472b6',
    ports: [
      {
        id: 'in-style',
        label: 'Base Style',
        direction: 'input',
        dataType: 'style',
        maxConnections: 1,
      },
      {
        id: 'out-color',
        label: 'Color',
        direction: 'output',
        dataType: 'style',
        maxConnections: 0,
      },
    ],
    defaultFields: { palette: 'cinematic', temperature: 'neutral' },
  },
  {
    type: 'style-mood',
    category: 'style',
    label: 'Mood',
    description: 'Set the overall atmospheric mood',
    icon: 'heart',
    color: '#f472b6',
    ports: [
      { id: 'out-mood', label: 'Mood', direction: 'output', dataType: 'style', maxConnections: 0 },
    ],
    defaultFields: { mood: '', intensity: 50 },
  },
  {
    type: 'style-reference',
    category: 'style',
    label: 'Style Reference',
    description: 'Reference a visual style or director',
    icon: 'film',
    color: '#f472b6',
    ports: [
      {
        id: 'out-reference',
        label: 'Reference',
        direction: 'output',
        dataType: 'style',
        maxConnections: 0,
      },
    ],
    defaultFields: { reference: '', strength: 50 },
  },

  // Audio blocks
  {
    type: 'audio-ambient',
    category: 'audio',
    label: 'Ambient Sound',
    description: 'Set background ambient audio',
    icon: 'music',
    color: '#34d399',
    ports: [
      {
        id: 'out-audio',
        label: 'Audio',
        direction: 'output',
        dataType: 'audio',
        maxConnections: 0,
      },
    ],
    defaultFields: { sound: '', intensity: 50 },
  },
  {
    type: 'audio-music',
    category: 'audio',
    label: 'Music',
    description: 'Background music track',
    icon: 'music',
    color: '#34d399',
    ports: [
      {
        id: 'out-audio',
        label: 'Audio',
        direction: 'output',
        dataType: 'audio',
        maxConnections: 0,
      },
    ],
    defaultFields: { genre: '', mood: '', tempo: 'medium' },
  },
  {
    type: 'audio-sfx',
    category: 'audio',
    label: 'Sound Effect',
    description: 'Specific sound effect',
    icon: 'zap',
    color: '#34d399',
    ports: [
      {
        id: 'out-audio',
        label: 'Audio',
        direction: 'output',
        dataType: 'audio',
        maxConnections: 0,
      },
    ],
    defaultFields: { effect: '', timing: 0 },
  },
  {
    type: 'audio-voiceover',
    category: 'audio',
    label: 'Voice Over',
    description: 'Narration or voiceover',
    icon: 'mic',
    color: '#34d399',
    ports: [
      {
        id: 'out-audio',
        label: 'Audio',
        direction: 'output',
        dataType: 'audio',
        maxConnections: 0,
      },
    ],
    defaultFields: { text: '', voiceStyle: 'neutral' },
  },

  // Effect blocks
  {
    type: 'effect-transition',
    category: 'effect',
    label: 'Transition',
    description: 'Shot transition effect',
    icon: 'shuffle',
    color: '#fbbf24',
    ports: [
      { id: 'in-from', label: 'From', direction: 'input', dataType: 'any', maxConnections: 1 },
      { id: 'in-to', label: 'To', direction: 'input', dataType: 'any', maxConnections: 1 },
      {
        id: 'out-result',
        label: 'Result',
        direction: 'output',
        dataType: 'text',
        maxConnections: 0,
      },
    ],
    defaultFields: { type: 'cut', duration: 0.5 },
  },
  {
    type: 'effect-visual',
    category: 'effect',
    label: 'Visual Effect',
    description: 'Post-processing visual effect',
    icon: 'sparkles',
    color: '#fbbf24',
    ports: [
      { id: 'in-source', label: 'Source', direction: 'input', dataType: 'any', maxConnections: 1 },
      {
        id: 'out-result',
        label: 'Result',
        direction: 'output',
        dataType: 'text',
        maxConnections: 0,
      },
    ],
    defaultFields: { effect: '', intensity: 50 },
  },
  {
    type: 'effect-motion',
    category: 'effect',
    label: 'Motion Intensity',
    description: 'Control motion speed and intensity',
    icon: 'activity',
    color: '#fbbf24',
    ports: [
      {
        id: 'out-motion',
        label: 'Motion',
        direction: 'output',
        dataType: 'text',
        maxConnections: 0,
      },
    ],
    defaultFields: { intensity: 'medium', speed: 50 },
  },

  // Logic blocks
  {
    type: 'logic-condition',
    category: 'logic',
    label: 'Condition',
    description: 'Conditional prompt inclusion',
    icon: 'filter',
    color: '#94a3b8',
    ports: [
      { id: 'in-value', label: 'Value', direction: 'input', dataType: 'any', maxConnections: 1 },
      {
        id: 'out-true',
        label: 'If True',
        direction: 'output',
        dataType: 'text',
        maxConnections: 0,
      },
      {
        id: 'out-false',
        label: 'If False',
        direction: 'output',
        dataType: 'text',
        maxConnections: 0,
      },
    ],
    defaultFields: { condition: 'is-not-empty', compareValue: '' },
  },
  {
    type: 'logic-loop',
    category: 'logic',
    label: 'Repeat',
    description: 'Repeat a block pattern N times',
    icon: 'layers',
    color: '#94a3b8',
    ports: [
      {
        id: 'in-template',
        label: 'Template',
        direction: 'input',
        dataType: 'text',
        maxConnections: 1,
      },
      {
        id: 'out-result',
        label: 'Result',
        direction: 'output',
        dataType: 'text',
        maxConnections: 0,
      },
    ],
    defaultFields: { count: 3, separator: ', ' },
  },
  {
    type: 'logic-variable',
    category: 'logic',
    label: 'Variable',
    description: 'Reference a project variable',
    icon: 'code',
    color: '#94a3b8',
    ports: [
      { id: 'out-value', label: 'Value', direction: 'output', dataType: 'text', maxConnections: 0 },
    ],
    defaultFields: { variableName: '', fallback: '' },
  },

  // Output blocks
  {
    type: 'output-prompt',
    category: 'output',
    label: 'Prompt Output',
    description: 'Compile all inputs into final prompt text',
    icon: 'file-text',
    color: '#f97316',
    ports: [
      { id: 'in-scene', label: 'Scene', direction: 'input', dataType: 'text', maxConnections: 1 },
      {
        id: 'in-character',
        label: 'Character',
        direction: 'input',
        dataType: 'text',
        maxConnections: 1,
      },
      {
        id: 'in-camera',
        label: 'Camera',
        direction: 'input',
        dataType: 'camera',
        maxConnections: 1,
      },
      { id: 'in-style', label: 'Style', direction: 'input', dataType: 'style', maxConnections: 1 },
      { id: 'in-audio', label: 'Audio', direction: 'input', dataType: 'audio', maxConnections: 1 },
      { id: 'in-extra', label: 'Extra', direction: 'input', dataType: 'any', maxConnections: 0 },
    ],
    defaultFields: { format: 'natural', maxLength: 500 },
  },
  {
    type: 'output-shot',
    category: 'output',
    label: 'Shot Output',
    description: 'Generate a single shot for the timeline',
    icon: 'video',
    color: '#f97316',
    ports: [
      { id: 'in-scene', label: 'Scene', direction: 'input', dataType: 'text', maxConnections: 1 },
      { id: 'in-action', label: 'Action', direction: 'input', dataType: 'text', maxConnections: 1 },
      {
        id: 'in-camera',
        label: 'Camera',
        direction: 'input',
        dataType: 'camera',
        maxConnections: 1,
      },
      { id: 'in-style', label: 'Style', direction: 'input', dataType: 'style', maxConnections: 0 },
    ],
    defaultFields: { duration: 5, shotType: 'video' },
  },
];

// ─── ComposerService ─────────────────────────────────────────────────────────

class ComposerService {
  private static instance: ComposerService;

  static getInstance(): ComposerService {
    if (!ComposerService.instance) {
      ComposerService.instance = new ComposerService();
    }
    return ComposerService.instance;
  }

  // ── Block Registry ──

  getBlockDefinitions(): BlockDefinition[] {
    return BLOCK_DEFINITIONS;
  }

  getBlockDefinition(type: BlockType): BlockDefinition | undefined {
    return BLOCK_DEFINITIONS.find((d) => d.type === type);
  }

  getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
    return BLOCK_DEFINITIONS.filter((d) => d.category === category);
  }

  getCategories(): { id: BlockCategory; label: string; color: string }[] {
    return [
      { id: 'scene', label: 'Scene', color: '#22d3ee' },
      { id: 'character', label: 'Character', color: '#a78bfa' },
      { id: 'camera', label: 'Camera', color: '#60a5fa' },
      { id: 'style', label: 'Style', color: '#f472b6' },
      { id: 'audio', label: 'Audio', color: '#34d399' },
      { id: 'effect', label: 'Effect', color: '#fbbf24' },
      { id: 'logic', label: 'Logic', color: '#94a3b8' },
      { id: 'output', label: 'Output', color: '#f97316' },
    ];
  }

  // ── Block Factory ──

  createBlock(type: BlockType, position: Position, zIndex: number): PromptBlock | null {
    const def = this.getBlockDefinition(type);
    if (!def) {
      logger.warn(`Unknown block type: ${type}`);
      return null;
    }

    return {
      id: this.generateId(),
      type,
      category: def.category,
      position,
      size: { width: 220, height: this.calculateBlockHeight(def) },
      fields: { ...def.defaultFields },
      isCollapsed: false,
      isDisabled: false,
      isLocked: false,
      zIndex,
    };
  }

  private calculateBlockHeight(def: BlockDefinition): number {
    const baseHeight = 60;
    const portHeight =
      Math.max(
        def.ports.filter((p) => p.direction === 'input').length,
        def.ports.filter((p) => p.direction === 'output').length,
      ) * 28;
    const fieldHeight = Object.keys(def.defaultFields).length * 36;
    return baseHeight + portHeight + fieldHeight;
  }

  // ── Connection Validation ──

  canConnect(
    blocks: PromptBlock[],
    connections: BlockConnection[],
    sourceBlockId: string,
    sourcePortId: string,
    targetBlockId: string,
    targetPortId: string,
  ): { valid: boolean; reason?: string } {
    // No self-connections
    if (sourceBlockId === targetBlockId) {
      return { valid: false, reason: 'Cannot connect a block to itself' };
    }

    const sourceBlock = blocks.find((b) => b.id === sourceBlockId);
    const targetBlock = blocks.find((b) => b.id === targetBlockId);
    if (!sourceBlock || !targetBlock) {
      return { valid: false, reason: 'Block not found' };
    }

    const sourceDef = this.getBlockDefinition(sourceBlock.type);
    const targetDef = this.getBlockDefinition(targetBlock.type);
    if (!sourceDef || !targetDef) {
      return { valid: false, reason: 'Block definition not found' };
    }

    const sourcePort = sourceDef.ports.find((p) => p.id === sourcePortId);
    const targetPort = targetDef.ports.find((p) => p.id === targetPortId);
    if (!sourcePort || !targetPort) {
      return { valid: false, reason: 'Port not found' };
    }

    // Direction check: must be output → input
    if (sourcePort.direction !== 'output' || targetPort.direction !== 'input') {
      return { valid: false, reason: 'Must connect output to input' };
    }

    // Type compatibility
    if (!arePortsCompatible(sourcePort, targetPort)) {
      return {
        valid: false,
        reason: `Incompatible types: ${sourcePort.dataType} → ${targetPort.dataType}`,
      };
    }

    // Max connections check
    if (targetPort.maxConnections > 0) {
      const existingCount = connections.filter(
        (c) => c.targetBlockId === targetBlockId && c.targetPortId === targetPortId,
      ).length;
      if (existingCount >= targetPort.maxConnections) {
        return { valid: false, reason: 'Port has reached maximum connections' };
      }
    }

    // Duplicate connection check
    const isDuplicate = connections.some(
      (c) =>
        c.sourceBlockId === sourceBlockId &&
        c.sourcePortId === sourcePortId &&
        c.targetBlockId === targetBlockId &&
        c.targetPortId === targetPortId,
    );
    if (isDuplicate) {
      return { valid: false, reason: 'Connection already exists' };
    }

    // Cycle detection
    if (this.wouldCreateCycle(blocks, connections, sourceBlockId, targetBlockId)) {
      return { valid: false, reason: 'Would create a cycle' };
    }

    return { valid: true };
  }

  // ── Graph Analysis ──

  /**
   * Detect if adding an edge sourceId → targetId would create a cycle.
   * Uses reverse DFS from sourceId following existing edges.
   */
  wouldCreateCycle(
    blocks: PromptBlock[],
    connections: BlockConnection[],
    sourceBlockId: string,
    targetBlockId: string,
  ): boolean {
    if (blocks.length === 0) return false;
    return wouldCreateCycle(connections, sourceBlockId, targetBlockId);
  }

  /**
   * Topological sort using Kahn's algorithm.
   * Returns block IDs in evaluation order, or null if graph has cycles.
   */
  topologicalSort(blocks: PromptBlock[], connections: BlockConnection[]): string[] | null {
    return topologicalSort(blocks, connections);
  }

  // ── Prompt Evaluation ──

  evaluateGraph(
    blocks: PromptBlock[],
    connections: BlockConnection[],
    variables: Record<string, string> = {},
  ): ComposerEvaluationResult {
    const activeBlocks = blocks.filter((b) => !b.isDisabled);
    const activeConnections = connections.filter((c) => c.isActive);

    const order = this.topologicalSort(activeBlocks, activeConnections);
    if (!order) {
      return {
        compiledPrompt: '',
        blockResults: [],
        evaluationOrder: [],
        warnings: [],
        errors: ['Graph contains cycles — cannot evaluate'],
        hasCycles: true,
      };
    }

    const blockOutputs = new Map<string, Record<string, string>>();
    const blockResults: BlockEvaluationResult[] = [];
    const allWarnings: string[] = [];
    const allErrors: string[] = [];

    for (const blockId of order) {
      const block = activeBlocks.find((b) => b.id === blockId)!;
      const def = this.getBlockDefinition(block.type);
      if (!def) continue;

      // Gather inputs from connected source blocks
      const inputs: Record<string, string> = {};
      for (const conn of activeConnections) {
        if (conn.targetBlockId === blockId) {
          const sourceOutputs = blockOutputs.get(conn.sourceBlockId);
          if (sourceOutputs && sourceOutputs[conn.sourcePortId]) {
            inputs[conn.targetPortId] = sourceOutputs[conn.sourcePortId];
          }
        }
      }

      // Evaluate block
      const result = this.evaluateBlock(block, def, inputs, variables);
      blockResults.push(result);
      blockOutputs.set(blockId, result.outputValues);
      allWarnings.push(...result.warnings);
      allErrors.push(...result.errors);
    }

    // Find output blocks and compile final prompt
    const outputBlocks = activeBlocks.filter((b) => b.category === 'output');
    let compiledPrompt = '';

    if (outputBlocks.length === 0) {
      allWarnings.push('No output block found — add a Prompt Output or Shot Output block');
    } else {
      const promptParts: string[] = [];
      for (const ob of outputBlocks) {
        const outputs = blockOutputs.get(ob.id);
        if (outputs) {
          for (const value of Object.values(outputs)) {
            if (value.trim()) promptParts.push(value.trim());
          }
        }
      }
      compiledPrompt = promptParts.join('. ');
    }

    logger.info(`Composer evaluated ${order.length} blocks → ${compiledPrompt.length} chars`);

    return {
      compiledPrompt,
      blockResults,
      evaluationOrder: order,
      warnings: allWarnings,
      errors: allErrors,
      hasCycles: false,
    };
  }

  private evaluateBlock(
    block: PromptBlock,
    def: BlockDefinition,
    inputs: Record<string, string>,
    variables: Record<string, string>,
  ): BlockEvaluationResult {
    return evaluateComposerBlock(block, def, inputs, variables);
  }

  // ── Auto Layout ──

  autoLayoutBlocks(blocks: PromptBlock[], connections: BlockConnection[]): PromptBlock[] {
    return autoLayoutBlocks(blocks, connections);
  }

  // ── Snap to Grid ──

  snapPosition(position: Position, gridSize: number): Position {
    return snapPosition(position, gridSize);
  }

  // ── Utilities ──

  private generateId(): string {
    return `blk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const composerService = ComposerService.getInstance();
