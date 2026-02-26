import type { BlockDefinition, BlockEvaluationResult, PromptBlock } from '@core/types/composer';

function getFirstOutputPort(def: BlockDefinition): string {
  const port = def.ports.find((p) => p.direction === 'output');
  return port?.id ?? 'out';
}

function evaluateSceneBlock(block: PromptBlock, inputs: Record<string, string>): string {
  const parts: string[] = [];
  const context = Object.values(inputs).filter(Boolean).join(', ');

  switch (block.type) {
    case 'scene-environment': {
      const env = String(block.fields.environment || '');
      const sensory = String(block.fields.sensoryDetails || '');
      const dynamic = String(block.fields.dynamicEvents || '');
      if (env) parts.push(env);
      if (sensory) parts.push(sensory);
      if (dynamic) parts.push(dynamic);
      break;
    }
    case 'scene-lighting':
      if (block.fields.lightingStyle) parts.push(`${block.fields.lightingStyle} lighting`);
      break;
    case 'scene-weather':
      if (block.fields.weather) parts.push(`${block.fields.weather} weather`);
      break;
    case 'scene-time':
      if (block.fields.timeOfDay) parts.push(`during ${block.fields.timeOfDay}`);
      break;
  }

  if (context) parts.unshift(context);
  return parts.join(', ');
}

function evaluateCharacterBlock(block: PromptBlock, inputs: Record<string, string>): string {
  const parts: string[] = [];
  const charInput = inputs['in-character'] || '';

  switch (block.type) {
    case 'character-action': {
      const action = String(block.fields.action || '');
      const nuances = String(block.fields.nuances || '');
      if (charInput) parts.push(charInput);
      if (action) parts.push(action);
      if (nuances) parts.push(nuances);
      break;
    }
    case 'character-dialogue': {
      const text = String(block.fields.text || '');
      if (text) parts.push(`saying "${text}"`);
      break;
    }
    case 'character-emotion': {
      const mood = String(block.fields.mood || '');
      if (mood) parts.push(`with ${mood} expression`);
      break;
    }
    case 'character-appearance': {
      const clothing = String(block.fields.clothing || '');
      const accessories = String(block.fields.accessories || '');
      if (clothing) parts.push(`wearing ${clothing}`);
      if (accessories) parts.push(`with ${accessories}`);
      break;
    }
  }

  return parts.join(', ');
}

function evaluateCameraBlock(block: PromptBlock): string {
  const parts: string[] = [];

  switch (block.type) {
    case 'camera-movement': {
      const movement = String(block.fields.movement || '');
      if (movement && movement !== 'static') parts.push(`${movement} camera`);
      break;
    }
    case 'camera-angle': {
      const angle = String(block.fields.angle || '');
      const distance = String(block.fields.distance || '');
      if (distance) parts.push(`${distance} shot`);
      if (angle) parts.push(`${angle} angle`);
      break;
    }
    case 'camera-lens': {
      const lens = String(block.fields.lensType || '');
      if (lens) parts.push(`${lens} lens`);
      break;
    }
    case 'camera-composition': {
      const guide = String(block.fields.guide || '');
      if (guide) parts.push(`${guide} composition`);
      break;
    }
  }

  return parts.join(', ');
}

function evaluateStyleBlock(block: PromptBlock, inputs: Record<string, string>): string {
  const parts: string[] = [];
  const baseStyle = inputs['in-style'] || '';

  switch (block.type) {
    case 'style-art': {
      const style = String(block.fields.artStyle || '');
      if (style) parts.push(`${style} style`);
      break;
    }
    case 'style-color': {
      if (baseStyle) parts.push(baseStyle);
      const palette = String(block.fields.palette || '');
      if (palette) parts.push(`${palette} color palette`);
      break;
    }
    case 'style-mood': {
      const mood = String(block.fields.mood || '');
      if (mood) parts.push(`${mood} atmosphere`);
      break;
    }
    case 'style-reference': {
      const ref = String(block.fields.reference || '');
      if (ref) parts.push(`in the style of ${ref}`);
      break;
    }
  }

  return parts.join(', ');
}

function evaluateAudioBlock(block: PromptBlock): string {
  const parts: string[] = [];

  switch (block.type) {
    case 'audio-ambient': {
      const sound = String(block.fields.sound || '');
      if (sound) parts.push(`ambient ${sound}`);
      break;
    }
    case 'audio-music': {
      const genre = String(block.fields.genre || '');
      if (genre) parts.push(`${genre} music`);
      break;
    }
    case 'audio-sfx': {
      const effect = String(block.fields.effect || '');
      if (effect) parts.push(`[SFX: ${effect}]`);
      break;
    }
    case 'audio-voiceover': {
      const text = String(block.fields.text || '');
      if (text) parts.push(`[VO: "${text}"]`);
      break;
    }
  }

  return parts.join(', ');
}

function evaluateEffectBlock(block: PromptBlock, inputs: Record<string, string>): string {
  const parts: string[] = [];

  switch (block.type) {
    case 'effect-transition': {
      const type = String(block.fields.type || 'cut');
      parts.push(`[${type} transition]`);
      break;
    }
    case 'effect-visual': {
      const effect = String(block.fields.effect || '');
      if (effect) parts.push(`with ${effect} effect`);
      break;
    }
    case 'effect-motion': {
      const intensity = String(block.fields.intensity || 'medium');
      parts.push(`${intensity} motion`);
      break;
    }
  }

  const source = Object.values(inputs).filter(Boolean).join(', ');
  if (source) parts.unshift(source);

  return parts.join(', ');
}

function evaluateLogicBlock(
  block: PromptBlock,
  inputs: Record<string, string>,
  variables: Record<string, string>,
  outputValues: Record<string, string>,
): void {
  switch (block.type) {
    case 'logic-condition': {
      const inputValue = inputs['in-value'] || '';
      const condition = String(block.fields.condition || 'is-not-empty');
      let result = false;

      if (condition === 'is-not-empty') result = inputValue.trim().length > 0;
      else if (condition === 'is-empty') result = inputValue.trim().length === 0;
      else if (condition === 'equals')
        result = inputValue === String(block.fields.compareValue || '');

      outputValues['out-true'] = result ? inputValue : '';
      outputValues['out-false'] = result ? '' : inputValue;
      break;
    }
    case 'logic-loop': {
      const template = inputs['in-template'] || '';
      const count = Number(block.fields.count) || 1;
      const separator = String(block.fields.separator || ', ');
      outputValues['out-result'] = Array(count).fill(template).join(separator);
      break;
    }
    case 'logic-variable': {
      const varName = String(block.fields.variableName || '');
      const fallback = String(block.fields.fallback || '');
      outputValues['out-value'] = variables[varName] || fallback;
      break;
    }
  }
}

function evaluateOutputBlock(block: PromptBlock, inputs: Record<string, string>): string {
  const parts = Object.values(inputs).filter((v) => v && v.trim().length > 0);
  const maxLength = Number(block.fields.maxLength) || 500;

  let result = parts.join('. ');
  if (result.length > maxLength) {
    result = result.substring(0, maxLength).trim();
    const lastSpace = result.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      result = result.substring(0, lastSpace);
    }
  }

  return result;
}

export function evaluateComposerBlock(
  block: PromptBlock,
  def: BlockDefinition,
  inputs: Record<string, string>,
  variables: Record<string, string>,
): BlockEvaluationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const outputValues: Record<string, string> = {};
  const label = block.label || def.label;

  try {
    switch (block.category) {
      case 'scene':
        outputValues[getFirstOutputPort(def)] = evaluateSceneBlock(block, inputs);
        break;
      case 'character':
        outputValues[getFirstOutputPort(def)] = evaluateCharacterBlock(block, inputs);
        break;
      case 'camera':
        outputValues[getFirstOutputPort(def)] = evaluateCameraBlock(block);
        break;
      case 'style':
        outputValues[getFirstOutputPort(def)] = evaluateStyleBlock(block, inputs);
        break;
      case 'audio':
        outputValues[getFirstOutputPort(def)] = evaluateAudioBlock(block);
        break;
      case 'effect':
        outputValues[getFirstOutputPort(def)] = evaluateEffectBlock(block, inputs);
        break;
      case 'logic':
        evaluateLogicBlock(block, inputs, variables, outputValues);
        break;
      case 'output':
        outputValues[getFirstOutputPort(def)] = evaluateOutputBlock(block, inputs);
        break;
      default:
        warnings.push(`Unknown category for block "${label}"`);
    }

    const hasOutput = Object.values(outputValues).some((v) => v.trim().length > 0);
    if (!hasOutput) {
      warnings.push(`Block "${label}" produced no output`);
    }
  } catch (err) {
    errors.push(
      `Error evaluating block "${label}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return { blockId: block.id, outputValues, warnings, errors };
}
