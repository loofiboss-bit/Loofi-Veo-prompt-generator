/**
 * Zero-LLM Rule-Based Prompt AST & Static Conflict Linter
 *
 * Performs deterministic real-time static analysis on video & audio prompts
 * and node graphs to flag cinematic contradictions and validate hardware/API constraints.
 */

import type { PromptBlock, BlockConnection } from '@core/types/composer';

export type LintSeverity = 'error' | 'warning' | 'info';

export type LintCategory =
  | 'camera-conflict'
  | 'lighting-conflict'
  | 'composition-conflict'
  | 'hardware-limit'
  | 'audio-conflict'
  | 'optical-conflict'
  | 'shutter-conflict';

export interface LintIssue {
  code: string;
  category: LintCategory;
  severity: LintSeverity;
  message: string;
  suggestions?: string[];
  details?: Record<string, unknown>;
}

export type ModelTarget = 'veo-2' | 'veo-3' | 'veo-raw' | 'flow-director' | 'lyria-music';

export interface LinterOptions {
  targetModel?: ModelTarget;
  durationSeconds?: number;
  aspectRatio?: string;
  fps?: number;
}

export interface LinterResult {
  valid: boolean;
  errors: LintIssue[];
  warnings: LintIssue[];
  info: LintIssue[];
  tokenEstimate: number;
  analyzedNodes: number;
}

// ─── Rule Definitions ────────────────────────────────────────────────────────

interface ContradictionRule {
  code: string;
  category: LintCategory;
  severity: LintSeverity;
  message: string;
  suggestions: string[];
  setA: RegExp[];
  setB: RegExp[];
}

const CONTRADICTION_RULES: ContradictionRule[] = [
  {
    code: 'CAM-001',
    category: 'camera-conflict',
    severity: 'error',
    message:
      'Contradictory camera motion: Locked static camera cannot coexist with rapid dynamic camera movement in the same shot.',
    suggestions: [
      'Choose either a static tripod shot or a dynamic movement.',
      'Split into two separate sequential timeline shots with a cut or transition.',
    ],
    setA: [/\b(static tripod|locked[- ]off|stationary camera|fixed camera|rigid tripod)\b/i],
    setB: [
      /\b(whip pan|fpv drone|shaky handheld|rapid tracking run|dramatic camera spin|crash zoom)\b/i,
    ],
  },
  {
    code: 'LGT-001',
    category: 'lighting-conflict',
    severity: 'warning',
    message:
      'Contradictory lighting: Pitch black / midnight darkness combined with direct midday sunlight.',
    suggestions: [
      'Unify lighting to either night (e.g., moonlight, practicals) or day (e.g., natural sunlight).',
      'If depicting an eclipse or supernatural transition, explicitly describe the transformation event.',
    ],
    setA: [/\b(pitch black|midnight darkness|deep night|dead of night|zero ambient light)\b/i],
    setB: [/\b(high noon sunlight|direct midday sun|blinding daylight|bright noon solar flare)\b/i],
  },
  {
    code: 'CMP-001',
    category: 'composition-conflict',
    severity: 'warning',
    message:
      'Contradictory framing: Extreme close-up macro combined with extreme wide panoramic landscape in a single shot.',
    suggestions: [
      'Specify a single framing focal length (e.g. macro close-up or wide establishing vista).',
      'Use a rack focus or continuous zoom description if a focal shift is intended.',
    ],
    setA: [/\b(extreme close[- ]up|macro lens|microscopic detail|macro iris close-up)\b/i],
    setB: [
      /\b(extreme wide panoramic|vast sweeping vista|satellite view|distant establishing landscape)\b/i,
    ],
  },
  {
    code: 'AUD-001',
    category: 'audio-conflict',
    severity: 'warning',
    message: 'Visual diffusion descriptors detected in an audio/music prompt (Lyria).',
    suggestions: [
      'Replace visual keywords (4K, photorealistic, cinematic lighting) with musical descriptors (tempo, instruments, mixing styles).',
    ],
    setA: [
      /\b(4k resolution|8k|photorealistic|hyperrealistic|octane render|unreal engine 5|cinematic lighting)\b/i,
    ],
    setB: [/\b(bpm|tempo|chords|melody|harmony|bassline|drums|synth|acoustic|orchestral)\b/i],
  },
  {
    code: 'OPT-001',
    category: 'optical-conflict',
    severity: 'warning',
    message:
      'Contradictory optics: Telephoto compression cannot coexist with ultra-wide panoramic framing in a single shot.',
    suggestions: [
      'Choose either a telephoto focal length (e.g. 85mm-200mm) or an ultra-wide field of view (e.g. 14mm-24mm).',
      'If depicting a focal length transition, specify a continuous zoom.',
    ],
    setA: [/\b(200mm|300mm|400mm|telephoto lens|super-telephoto|compressed background)\b/i],
    setB: [
      /\b(extreme wide angle|ultra-wide panoramic|fisheye lens|12mm lens|14mm lens|vast sweeping vista)\b/i,
    ],
  },
  {
    code: 'MOT-001',
    category: 'shutter-conflict',
    severity: 'warning',
    message:
      'Contradictory shutter speed: High-speed freeze-action shutter cannot produce long-exposure motion blur in the same capture.',
    suggestions: [
      'Choose high-speed shutter (e.g. 1/1000s) to freeze motion or slow shutter (e.g. 1/24s) to capture motion blur.',
    ],
    setA: [
      /\b(1\/1000s|1\/2000s|1\/4000s|high[- ]speed shutter|crystal[- ]clear freeze frame|frozen water droplets)\b/i,
    ],
    setB: [
      /\b(silky motion blur|long[- ]exposure light trails|dreamy motion blur|streaking headlights|motion smeared)\b/i,
    ],
  },
  {
    code: 'LGT-002',
    category: 'lighting-conflict',
    severity: 'warning',
    message:
      'Contradictory lighting angle: Low-angle sunset or sunrise lighting contradicts high-noon overhead sunlight.',
    suggestions: ['Choose either low-horizon golden hour lighting or high-noon overhead lighting.'],
    setA: [/\b(golden hour sunset|low setting sun|dawn twilight horizon|long raking shadows)\b/i],
    setB: [
      /\b((?:direct\s+)?high noon(?:\s+direct)?\s+sun|overhead 12:00 sun|shadowless midday|vertical midday shadows)\b/i,
    ],
  },
];

// ─── Hardware & Target Constraints ──────────────────────────────────────────

const VALID_ASPECT_RATIOS = new Set(['16:9', '9:16', '1:1', '4:3', '3:4', '21:9']);

export function estimateTokenCount(text: string): number {
  if (!text || !text.trim()) return 0;
  const words = text.trim().split(/\s+/).length;
  // Approximate standard BPE tokenization (~1.33 tokens per word for natural English)
  return Math.ceil(words * 1.33);
}

export class PromptAstLinterService {
  private static instance: PromptAstLinterService;

  static getInstance(): PromptAstLinterService {
    if (!PromptAstLinterService.instance) {
      PromptAstLinterService.instance = new PromptAstLinterService();
    }
    return PromptAstLinterService.instance;
  }

  /**
   * Lint a compiled prompt text against contradiction rules and target hardware limits.
   */
  lintPromptText(prompt: string, options: LinterOptions = {}): LinterResult {
    const errors: LintIssue[] = [];
    const warnings: LintIssue[] = [];
    const info: LintIssue[] = [];
    const text = prompt || '';
    const tokenEstimate = estimateTokenCount(text);

    // 1. Contradiction rules
    for (const rule of CONTRADICTION_RULES) {
      // Skip audio-specific checks for pure video models unless target is lyria
      if (rule.category === 'audio-conflict' && options.targetModel !== 'lyria-music') {
        continue;
      }

      const matchA = rule.setA.some((rx) => rx.test(text));
      const matchB = rule.setB.some((rx) => rx.test(text));

      if (matchA && matchB) {
        const issue: LintIssue = {
          code: rule.code,
          category: rule.category,
          severity: rule.severity,
          message: rule.message,
          suggestions: rule.suggestions,
        };

        if (rule.severity === 'error') {
          errors.push(issue);
        } else if (rule.severity === 'warning') {
          warnings.push(issue);
        } else {
          info.push(issue);
        }
      }
    }

    // 2. Token Budget & Attention Limits
    if (tokenEstimate > 280) {
      warnings.push({
        code: 'HW-TOK-001',
        category: 'hardware-limit',
        severity: 'warning',
        message: `Prompt length (~${tokenEstimate} tokens) approaches video diffusion cross-attention limits (280 tokens). Trailing details may be ignored.`,
        suggestions: ['Condense prompt to core subject, action, lighting, and camera motion.'],
        details: { tokenEstimate, limit: 280 },
      });
    }

    // 3. Aspect Ratio Validation
    if (options.aspectRatio && !VALID_ASPECT_RATIOS.has(options.aspectRatio)) {
      errors.push({
        code: 'HW-ASP-001',
        category: 'hardware-limit',
        severity: 'error',
        message: `Unsupported aspect ratio "${options.aspectRatio}". Target generators support: ${[...VALID_ASPECT_RATIOS].join(', ')}.`,
        suggestions: [
          'Select a supported aspect ratio (e.g. 16:9 for landscape, 9:16 for vertical).',
        ],
        details: { specified: options.aspectRatio, supported: [...VALID_ASPECT_RATIOS] },
      });
    }

    // 4. Duration Limits
    if (typeof options.durationSeconds === 'number') {
      const target = options.targetModel ?? 'veo-2';
      if (target.startsWith('veo') && options.durationSeconds > 8) {
        warnings.push({
          code: 'HW-DUR-001',
          category: 'hardware-limit',
          severity: 'warning',
          message: `Requested shot duration (${options.durationSeconds}s) exceeds native Veo single-pass limit (8s). Requires shot extension chaining.`,
          suggestions: ['Keep individual shots under 8 seconds or plan an extension take.'],
          details: { duration: options.durationSeconds, maxSinglePass: 8 },
        });
      } else if (target === 'lyria-music' && options.durationSeconds > 120) {
        errors.push({
          code: 'HW-DUR-002',
          category: 'hardware-limit',
          severity: 'error',
          message: `Requested music duration (${options.durationSeconds}s) exceeds Lyria track limit (120s).`,
          suggestions: ['Generate music segments in blocks of 30-120 seconds.'],
          details: { duration: options.durationSeconds, maxDuration: 120 },
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
      tokenEstimate,
      analyzedNodes: 1,
    };
  }

  /**
   * Lint a node graph representation in the Composer canvas.
   */
  lintComposerGraph(
    blocks: PromptBlock[],
    connections: BlockConnection[],
    options: LinterOptions = {},
  ): LinterResult {
    const activeBlocks = blocks.filter((b) => !b.isDisabled);
    const activeBlockIds = new Set(activeBlocks.map((b) => b.id));
    const activeConnections = connections.filter(
      (c) =>
        c.isActive && activeBlockIds.has(c.sourceBlockId) && activeBlockIds.has(c.targetBlockId),
    );

    // Aggregate text values from all active blocks
    const extractedTexts: string[] = [];
    for (const block of activeBlocks) {
      if (block.fields) {
        for (const [, val] of Object.entries(block.fields)) {
          if (typeof val === 'string' && val.trim()) {
            extractedTexts.push(val.trim());
          }
        }
      }
    }

    const aggregatedPrompt = extractedTexts.join('. ');
    const baseResult = this.lintPromptText(aggregatedPrompt, options);

    // Graph structural checks
    const errors = [...baseResult.errors];
    const warnings = [...baseResult.warnings];
    const info = [...baseResult.info];

    const hasOutput = activeBlocks.some((b) => b.category === 'output');
    if (activeBlocks.length > 0 && !hasOutput) {
      warnings.push({
        code: 'GRAPH-OUT-001',
        category: 'composition-conflict',
        severity: 'warning',
        message:
          'Graph has active blocks but lacks an output block (Prompt Output or Shot Output).',
        suggestions: ['Add an Output block from the palette to compile the prompt.'],
      });
    }

    // Check for orphan blocks (no input and no output connections)
    const connectedBlockIds = new Set<string>();
    for (const conn of activeConnections) {
      connectedBlockIds.add(conn.sourceBlockId);
      connectedBlockIds.add(conn.targetBlockId);
    }

    const orphans = activeBlocks.filter(
      (b) => !connectedBlockIds.has(b.id) && b.category !== 'output',
    );
    if (orphans.length > 0) {
      info.push({
        code: 'GRAPH-ORPHAN-001',
        category: 'composition-conflict',
        severity: 'info',
        message: `${orphans.length} disconnected block(s) in canvas will not contribute to compiled prompt.`,
        details: { orphanBlockIds: orphans.map((b) => b.id) },
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
      tokenEstimate: baseResult.tokenEstimate,
      analyzedNodes: activeBlocks.length,
    };
  }
}

export const promptAstLinterService = PromptAstLinterService.getInstance();
