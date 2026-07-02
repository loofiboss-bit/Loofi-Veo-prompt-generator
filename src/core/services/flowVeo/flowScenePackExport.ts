import type { FlowVeoExportOptions, FlowVeoScenePack } from '@core/types';

const scoreLine = (label: string, value: number): string => `- ${label}: ${value}/100`;

export const exportFlowVeoScenePack = (
  scenePack: FlowVeoScenePack,
  options: FlowVeoExportOptions,
): string => {
  if (options.format === 'json') {
    return JSON.stringify(scenePack, null, 2);
  }

  const shotCards = scenePack.shotCards
    .map(
      (shot) => `## ${shot.title}

${shot.prompt}

- Camera: ${shot.camera}
- Duration: ${shot.durationSeconds}s
- Start frame: ${shot.startFrameNotes}
- End frame: ${shot.endFrameNotes}
- Audio: ${shot.audioNotes || 'No dedicated audio notes'}
- Avoid: ${shot.negativePrompt || scenePack.negativePrompt || 'None'}
`,
    )
    .join('\n');

  const markdown = `# ${scenePack.title}

Mode: ${scenePack.mode}

## One-Shot Prompt

${scenePack.oneShotPrompt}

## Continuity

- Character: ${scenePack.characterContinuity}
- Location: ${scenePack.locationContinuity}
- Style bible: ${scenePack.styleBible}

## Reference Checklist

${scenePack.referenceChecklist.map((item) => `- ${item}`).join('\n')}

## Edit Operations

- Insert object: ${scenePack.insertObjectNotes}
- Remove object: ${scenePack.removeObjectNotes}
- Extend scene: ${scenePack.extendSceneNotes}

## Compatibility

${scoreLine('Prompt clarity', scenePack.compatibility.promptClarity)}
${scoreLine('Character consistency', scenePack.compatibility.characterConsistency)}
${scoreLine('Shot control', scenePack.compatibility.shotControl)}
${scoreLine('Audio readiness', scenePack.compatibility.audioReadiness)}
${scoreLine('Flow readiness', scenePack.compatibility.flowReadiness)}
${scoreLine('Veo API readiness', scenePack.compatibility.veoApiReadiness)}

${shotCards}`.trim();

  if (options.format === 'copy-pack') {
    return [
      scenePack.oneShotPrompt,
      scenePack.characterContinuity,
      scenePack.locationContinuity,
      ...scenePack.shotCards.map((shot) => shot.prompt),
    ].join('\n\n---\n\n');
  }

  return markdown;
};
