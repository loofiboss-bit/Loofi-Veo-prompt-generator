/**
 * Universal Model Transpiler Service (v13.0.0)
 *
 * Deterministically transpile high-level cinematic shot directions and 3D spatial
 * camera rigs into model-tailored prompt payloads for:
 * - Google Flow / Veo 3.1
 * - Kling 1.5 / 2.0
 * - Runway Gen-3 / Gen-4
 * - OpenAI Sora
 * - Luma Dream Machine (Ray-2)
 */

import type {
  UniversalPromptInput,
  UniversalVideoTarget,
  TranspiledPromptResult,
  TranspiledPromptVariant,
  TargetModelProfile,
} from '@core/types/modelTranspiler';
import { compileSpatialCameraRig } from './spatialCameraService';

export const TARGET_MODEL_PROFILES: Record<UniversalVideoTarget, TargetModelProfile> = {
  'flow-veo': {
    id: 'flow-veo',
    displayName: 'Google Flow / Veo 3.1',
    vendor: 'Google DeepMind',
    syntaxFlavor: 'Natural Photographic & Spatial Directives',
    maxRecommendedDuration: 8,
    supportedAspectRatios: ['16:9', '9:16'],
    cameraDirectiveStyle: 'natural',
  },
  kling: {
    id: 'kling',
    displayName: 'Kling 1.5 / 2.0',
    vendor: 'Kuaishou',
    syntaxFlavor: 'Structured Bracket Tags & Motion Intensity',
    maxRecommendedDuration: 10,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    cameraDirectiveStyle: 'bracket-tags',
  },
  'runway-gen3': {
    id: 'runway-gen3',
    displayName: 'Runway Gen-3 / Gen-4',
    vendor: 'RunwayML',
    syntaxFlavor: 'Action-First Motion Vectors & Coherence Anchors',
    maxRecommendedDuration: 10,
    supportedAspectRatios: ['16:9', '9:16'],
    cameraDirectiveStyle: 'motion-vector',
  },
  sora: {
    id: 'sora',
    displayName: 'OpenAI Sora',
    vendor: 'OpenAI',
    syntaxFlavor: 'High-Density Photochemical Physical Realism',
    maxRecommendedDuration: 20,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    cameraDirectiveStyle: 'photochemical',
  },
  'luma-ray': {
    id: 'luma-ray',
    displayName: 'Luma Dream Machine Ray-2',
    vendor: 'Luma AI',
    syntaxFlavor: 'Dynamic Trajectory Anchors & Keyframe Transitions',
    maxRecommendedDuration: 9,
    supportedAspectRatios: ['16:9', '9:16', '1:1', '2.39:1'],
    cameraDirectiveStyle: 'anchor-trajectory',
  },
};

const cleanSentence = (value?: string): string => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const formatCameraForTarget = (
  input: UniversalPromptInput,
  target: UniversalVideoTarget,
): string => {
  const rig = input.spatialCamera ? compileSpatialCameraRig(input.spatialCamera) : null;
  const userCam = input.camera?.trim();

  switch (target) {
    case 'kling': {
      const trajectoryTag = input.spatialCamera?.trajectory
        ? `[camera: ${input.spatialCamera.trajectory.replace(/-/g, ' ')}]`
        : userCam
          ? `[camera: ${userCam}]`
          : '[camera: smooth dynamic tracking]';
      const lensNote = input.spatialCamera?.lens
        ? `with ${input.spatialCamera.lens.replace(/-/g, ' ')} view`
        : '';
      return `${trajectoryTag} ${lensNote}`.trim();
    }
    case 'runway-gen3': {
      const move = input.spatialCamera?.trajectory
        ? `Cinematic ${input.spatialCamera.trajectory.replace(/-/g, ' ')} motion`
        : userCam
          ? `Cinematic ${userCam}`
          : 'Smooth steady camera motion';
      const lens = input.spatialCamera?.lens
        ? `, ${input.spatialCamera.lens.replace(/-/g, ' ')} lens`
        : '';
      return `${move}${lens}, fluid tracking`;
    }
    case 'sora': {
      const rigDesc = rig?.promptFragment ?? userCam ?? 'smooth fluid camera movement';
      return `Captured on 35mm motion picture camera with ${rigDesc}, realistic physical camera weight, authentic optical depth`;
    }
    case 'luma-ray': {
      const trajectory = input.spatialCamera?.trajectory
        ? `Smooth ${input.spatialCamera.trajectory.replace(/-/g, ' ')} trajectory`
        : (userCam ?? 'steady camera progression');
      return `${trajectory}, consistent depth of field and fluid perspective shifts`;
    }
    case 'flow-veo':
    default: {
      return rig?.promptFragment ?? userCam ?? 'Cinematic natural camera movement';
    }
  }
};

const formatNegativePromptForTarget = (
  input: UniversalPromptInput,
  target: UniversalVideoTarget,
): string => {
  const baseUserNeg = input.negativePrompt?.trim();

  const modelArtifactNegatives: Record<UniversalVideoTarget, string[]> = {
    'flow-veo': [
      'unintended text',
      'subtitles',
      'logos',
      'watermarks',
      'extra limbs',
      'visual glitches',
    ],
    kling: [
      'morphing',
      'flickering',
      'floating objects',
      'watermark',
      'distorted anatomy',
      'low quality',
      'motion jitter',
    ],
    'runway-gen3': [
      'blurry',
      'motion smearing',
      'stutter',
      'distorted limbs',
      'oversaturated',
      'watermark',
      'text',
    ],
    sora: [
      'unnatural physics',
      'temporal discontinuity',
      'cartoonish',
      'low resolution',
      'clipping artifacts',
      'jitter',
    ],
    'luma-ray': [
      'frame warping',
      'sudden camera jumps',
      'geometry distortion',
      'flickering',
      'extra limbs',
    ],
  };

  const defaults = modelArtifactNegatives[target] ?? modelArtifactNegatives['flow-veo'];
  if (!baseUserNeg) return defaults.join(', ');
  return `${baseUserNeg}, ${defaults.join(', ')}`;
};

const buildTargetSettingsChecklist = (
  input: UniversalPromptInput,
  target: UniversalVideoTarget,
): string[] => {
  const profile = TARGET_MODEL_PROFILES[target];
  const list = [
    `Target Engine: ${profile.displayName} (${profile.vendor})`,
    `Syntax Flavor: ${profile.syntaxFlavor}`,
    `Aspect Ratio: ${input.aspectRatio}`,
    `Duration: ${input.durationSeconds}s ${input.durationSeconds > profile.maxRecommendedDuration ? `(Note: Recommended max is ${profile.maxRecommendedDuration}s)` : ''}`,
    `Generation Mode: ${input.mode}`,
  ];

  if (target === 'kling') {
    list.push(
      'Use structured bracket notation [camera: ...] for deterministic camera movement control.',
    );
    list.push('Set motion intensity between 4-6 for standard realism, or 7-9 for dynamic action.');
  } else if (target === 'runway-gen3') {
    list.push(
      'Structure prompt as: Camera Move + Subject + Continuous Action + Environmental Setting.',
    );
    list.push('Keep motion descriptions continuous rather than episodic.');
  } else if (target === 'sora') {
    list.push(
      'Describe physical realism, lighting material interaction, and continuous temporal pacing.',
    );
  } else if (target === 'luma-ray') {
    list.push(
      'Anchor the start and end trajectory clearly for smooth Dream Machine interpolation.',
    );
  } else {
    list.push('Keep one primary scene and action for highest visual fidelity in Veo.');
  }

  return list;
};

const compileVariant = (
  input: UniversalPromptInput,
  target: UniversalVideoTarget,
  label: TranspiledPromptVariant['label'],
): TranspiledPromptVariant => {
  const subject = cleanSentence(input.subject || input.idea);
  const action = cleanSentence(input.action);
  const environment = cleanSentence(input.environment);
  const camera = cleanSentence(formatCameraForTarget(input, target));
  const lighting = cleanSentence(input.lighting);
  const style = cleanSentence(input.style);
  const negativePrompt = formatNegativePromptForTarget(input, target);
  const checklist = buildTargetSettingsChecklist(input, target);

  let prompt = '';

  if (input.mode === 'image-to-video') {
    const motionOnly = [
      action ? `Subject motion: ${action}` : '',
      camera ? `Camera motion: ${camera}` : '',
      environment ? `Atmosphere motion: ${environment}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    prompt = [
      target === 'kling' ? '[mode: animate]' : 'Animate the provided image.',
      motionOnly || 'Animate with subtle, organic movement and stable visual fidelity.',
      label === 'Cinematic'
        ? 'Preserve natural motion cadence, authentic optical depth, and photographic texture.'
        : label === 'Control-focused'
          ? `Strictly maintain subject geometry and identity without introducing new objects for ${input.durationSeconds}s.`
          : '',
    ]
      .filter(Boolean)
      .join(' ');
  } else {
    const coreBlocks = [subject, action, environment, camera, lighting, style].filter(Boolean);

    if (input.dialogue) {
      coreBlocks.push(
        `Dialogue: the speaker says: ${input.dialogue.replace(/["“”]/g, '').trim()}.`,
      );
    }

    if (label === 'Cinematic') {
      coreBlocks.push(
        target === 'sora'
          ? 'Captured on large-format film, authentic tactile textures, cinematic color grade with balanced highlights.'
          : 'Rich cinematic staging, purposeful composition, high visual fidelity and atmospheric depth.',
      );
    } else if (label === 'Control-focused') {
      coreBlocks.push(
        `One continuous unbroken shot for ${input.durationSeconds}s in ${input.aspectRatio}. No jump cuts, morphing, or unrequested transitions.`,
      );
    }

    prompt = coreBlocks.join(' ');
  }

  const copySettingsChecklist = checklist.join('\n');
  const copyAll = `${prompt}\n\nNegative prompt: ${negativePrompt}\n\n${copySettingsChecklist}`;

  return {
    label,
    title: `${TARGET_MODEL_PROFILES[target].displayName} — ${label}`,
    prompt,
    negativePrompt,
    settingsChecklist: checklist,
    copyPrompt: prompt,
    copyNegativePrompt: negativePrompt,
    copySettingsChecklist,
    copyAll,
  };
};

/**
 * Deterministically transpile an idea or shot rig into target-specific prompt payloads.
 */
export const transpilePrompt = (
  input: UniversalPromptInput,
  overrideTarget?: UniversalVideoTarget,
): TranspiledPromptResult => {
  const target = overrideTarget ?? input.target;
  const profile = TARGET_MODEL_PROFILES[target] ?? TARGET_MODEL_PROFILES['flow-veo'];

  const primary = compileVariant(input, target, 'Primary');
  const cinematic = compileVariant(input, target, 'Cinematic');
  const control = compileVariant(input, target, 'Control-focused');

  const recommendations: string[] = [
    `Optimized for ${profile.displayName} syntax.`,
    input.mode === 'image-to-video'
      ? 'Focus prompt strictly on motion directives; identity is anchored in the reference image.'
      : 'Maintain clear subject-action separation for highest generation coherence.',
  ];

  return {
    target,
    targetDisplayName: profile.displayName,
    variants: [primary, cinematic, control],
    recommendations,
  };
};
