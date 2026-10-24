import { describe, expect, it } from 'vitest';
import { promptAstLinterService, estimateTokenCount } from './promptAstLinterService';
import type { PromptBlock, BlockConnection } from '@core/types/composer';

describe('promptAstLinterService', () => {
  it('estimates token count accurately from word count', () => {
    expect(estimateTokenCount('')).toBe(0);
    expect(estimateTokenCount('A quick brown fox')).toBe(6); // 4 words * 1.33 = 5.32 -> 6
  });

  it('detects camera motion contradiction as an error', () => {
    const contradictoryPrompt =
      'A dramatic crime scene. Static tripod locked-off view of the alley, with an FPV drone whip pan chasing the suspect.';
    const result = promptAstLinterService.lintPromptText(contradictoryPrompt);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    const camError = result.errors.find((e) => e.code === 'CAM-001');
    expect(camError).toBeDefined();
    expect(camError?.category).toBe('camera-conflict');
  });

  it('detects lighting contradiction as a warning', () => {
    const contradictoryPrompt =
      'Deep pitch black midnight darkness illuminated by direct midday sun shining overhead.';
    const result = promptAstLinterService.lintPromptText(contradictoryPrompt);

    expect(result.valid).toBe(true); // Warnings don't invalidate prompt
    const lightWarning = result.warnings.find((w) => w.code === 'LGT-001');
    expect(lightWarning).toBeDefined();
    expect(lightWarning?.category).toBe('lighting-conflict');
  });

  it('detects composition framing contradiction as a warning', () => {
    const contradictoryPrompt =
      'Extreme close-up macro lens on a single droplet of dew, while showing a vast sweeping vista of mountain ranges.';
    const result = promptAstLinterService.lintPromptText(contradictoryPrompt);

    const compWarning = result.warnings.find((w) => w.code === 'CMP-001');
    expect(compWarning).toBeDefined();
    expect(compWarning?.category).toBe('composition-conflict');
  });

  it('detects optical contradiction (telephoto vs ultra-wide panoramic) as a warning', () => {
    const contradictoryPrompt =
      'Shot on 200mm telephoto lens with compressed background showing an extreme wide angle vast sweeping vista.';
    const result = promptAstLinterService.lintPromptText(contradictoryPrompt);
    const optWarning = result.warnings.find((w) => w.code === 'OPT-001');
    expect(optWarning).toBeDefined();
    expect(optWarning?.category).toBe('optical-conflict');
  });

  it('detects shutter speed contradiction (high-speed freeze vs long exposure blur) as a warning', () => {
    const contradictoryPrompt =
      'High-speed shutter 1/2000s freeze frame with silky motion blur streaking headlights.';
    const result = promptAstLinterService.lintPromptText(contradictoryPrompt);
    const motWarning = result.warnings.find((w) => w.code === 'MOT-001');
    expect(motWarning).toBeDefined();
    expect(motWarning?.category).toBe('shutter-conflict');
  });

  it('detects sun angle contradiction (golden hour sunset vs high noon sun) as a warning', () => {
    const contradictoryPrompt =
      'Golden hour sunset with long raking shadows under direct high noon sun.';
    const result = promptAstLinterService.lintPromptText(contradictoryPrompt);
    const lgtWarning = result.warnings.find((w) => w.code === 'LGT-002');
    expect(lgtWarning).toBeDefined();
    expect(lgtWarning?.category).toBe('lighting-conflict');
  });

  it('flags unsupported aspect ratios as an error', () => {
    const result = promptAstLinterService.lintPromptText('A serene lake at dawn.', {
      aspectRatio: '32:9',
    });

    expect(result.valid).toBe(false);
    const aspectError = result.errors.find((e) => e.code === 'HW-ASP-001');
    expect(aspectError).toBeDefined();
  });

  it('allows supported aspect ratios', () => {
    const result = promptAstLinterService.lintPromptText('A serene lake at dawn.', {
      aspectRatio: '16:9',
    });

    expect(result.errors.length).toBe(0);
  });

  it('flags Veo duration exceeding single-pass limit (8s) as warning', () => {
    const result = promptAstLinterService.lintPromptText('A car chase.', {
      targetModel: 'veo-2',
      durationSeconds: 15,
    });

    const durWarning = result.warnings.find((w) => w.code === 'HW-DUR-001');
    expect(durWarning).toBeDefined();
  });

  it('flags Lyria duration exceeding 120s limit as error', () => {
    const result = promptAstLinterService.lintPromptText('Ambient electronic track.', {
      targetModel: 'lyria-music',
      durationSeconds: 180,
    });

    expect(result.valid).toBe(false);
    const durError = result.errors.find((e) => e.code === 'HW-DUR-002');
    expect(durError).toBeDefined();
  });

  it('lints composer graph blocks and identifies contradictions across blocks', () => {
    const blocks: PromptBlock[] = [
      {
        id: 'b1',
        type: 'camera-movement',
        category: 'camera',
        label: 'Tripod',
        fields: { movement: 'static tripod locked-off camera' },
        position: { x: 0, y: 0 },
        size: { width: 200, height: 100 },
        isCollapsed: false,
        isDisabled: false,
        isLocked: false,
        zIndex: 1,
      },
      {
        id: 'b2',
        type: 'character-action',
        category: 'character',
        label: 'Chase',
        fields: { description: 'whip pan fast action sequence' },
        position: { x: 200, y: 0 },
        size: { width: 200, height: 100 },
        isCollapsed: false,
        isDisabled: false,
        isLocked: false,
        zIndex: 2,
      },
      {
        id: 'b3',
        type: 'output-prompt',
        category: 'output',
        label: 'Output',
        fields: {},
        position: { x: 400, y: 0 },
        size: { width: 200, height: 100 },
        isCollapsed: false,
        isDisabled: false,
        isLocked: false,
        zIndex: 3,
      },
    ];

    const connections: BlockConnection[] = [
      {
        id: 'c1',
        sourceBlockId: 'b1',
        sourcePortId: 'out',
        targetBlockId: 'b3',
        targetPortId: 'in-camera',
        style: 'bezier',
        isActive: true,
      },
      {
        id: 'c2',
        sourceBlockId: 'b2',
        sourcePortId: 'out',
        targetBlockId: 'b3',
        targetPortId: 'in-action',
        style: 'bezier',
        isActive: true,
      },
    ];

    const result = promptAstLinterService.lintComposerGraph(blocks, connections);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'CAM-001')).toBe(true);
    expect(result.analyzedNodes).toBe(3);
  });

  it('warns when graph has active blocks but lacks an output block', () => {
    const blocks: PromptBlock[] = [
      {
        id: 'b1',
        type: 'scene-environment',
        category: 'scene',
        label: 'Scene',
        fields: { setting: 'Medieval castle' },
        position: { x: 0, y: 0 },
        size: { width: 200, height: 100 },
        isCollapsed: false,
        isDisabled: false,
        isLocked: false,
        zIndex: 1,
      },
    ];

    const result = promptAstLinterService.lintComposerGraph(blocks, []);

    expect(result.warnings.some((w) => w.code === 'GRAPH-OUT-001')).toBe(true);
  });
});
