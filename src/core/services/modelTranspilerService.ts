/** Shared, source-backed profiles for local compilation, AI direction and Studio controls. */
import type {
  UniversalPromptInput,
  UniversalVideoTarget,
  TranspiledPromptResult,
  TranspiledPromptVariant,
  TargetModelProfile,
} from '@core/types/modelTranspiler';
import type { VideoPromptArtifactInput, VideoPromptMode } from '@core/types/promptArtifact';
import { compileSpatialCameraRig } from './spatialCameraService';

const VERIFIED_DATE = '2026-10-29';
const ALL_MODES: VideoPromptMode[] = [
  'text-to-video',
  'image-to-video',
  'first-last-frames',
  'ingredients',
  'extend',
];
const TEXT_IMAGE: VideoPromptMode[] = ['text-to-video', 'image-to-video'];
const range = (min: number, max: number): number[] =>
  Array.from({ length: max - min + 1 }, (_, index) => min + index);

type ProfileDefinition = Pick<
  TargetModelProfile,
  | 'id'
  | 'profileId'
  | 'displayName'
  | 'vendor'
  | 'modelCode'
  | 'supportedModes'
  | 'durations'
  | 'sourceUrl'
  | 'promptingGuidance'
> &
  Partial<TargetModelProfile>;
const profile = (value: ProfileDefinition): TargetModelProfile => ({
  lifecycle: 'active',
  handoff: 'manual',
  audioPolicy: 'unknown',
  negativePolicy: 'unknown',
  syntaxFlavor: 'Natural scene and motion descriptions',
  cameraDirectiveStyle: 'natural',
  supportedAspectRatios: ['16:9', '9:16'],
  verifiedDate: VERIFIED_DATE,
  maxRecommendedDuration: Math.max(...value.durations),
  ...value,
});

/** Persisted target IDs remain stable; explicit profile IDs distinguish real model capabilities. */
export const STUDIO_TARGET_PROFILES: TargetModelProfile[] = [
  profile({
    id: 'flow-veo',
    profileId: 'flow-veo-3.1-lite',
    modelCode: 'Veo 3.1 Lite',
    displayName: 'Google Flow / Veo 3.1 Lite',
    vendor: 'Google DeepMind',
    supportedModes: ALL_MODES,
    durations: [4, 6, 8],
    audioPolicy: 'native',
    negativePolicy: 'supported',
    sourceUrl: 'https://support.google.com/flow/answer/16352836?hl=en',
    promptingGuidance:
      'Describe a clear subject, one readable action, camera, composition and light. Include relevant ambient sound and exact requested dialogue. Ingredients and extension require 8-second clips; extension uses Veo 3.1 Lite.',
  }),
  profile({
    id: 'flow-veo',
    profileId: 'flow-veo-3.1-fast',
    modelCode: 'Veo 3.1 Fast',
    displayName: 'Google Flow / Veo 3.1 Fast',
    vendor: 'Google DeepMind',
    supportedModes: ALL_MODES.filter((mode) => mode !== 'extend'),
    durations: [4, 6, 8],
    audioPolicy: 'native',
    negativePolicy: 'supported',
    sourceUrl: 'https://support.google.com/flow/answer/16352836?hl=en',
    promptingGuidance:
      'Use a clear subject, concrete action and optional camera, composition, light and audio. Ingredients require an 8-second clip. Extension is unavailable for this profile.',
  }),
  profile({
    id: 'flow-veo',
    profileId: 'flow-veo-3.1-quality',
    modelCode: 'Veo 3.1 Quality',
    displayName: 'Google Flow / Veo 3.1 Quality',
    vendor: 'Google DeepMind',
    supportedModes: [...TEXT_IMAGE, 'first-last-frames'],
    durations: [4, 6, 8],
    audioPolicy: 'native',
    negativePolicy: 'supported',
    sourceUrl: 'https://support.google.com/flow/answer/16352836?hl=en',
    promptingGuidance:
      'Describe the scene, subject action, camera and light naturally, with relevant sound and exact requested dialogue. Ingredients and extension are unavailable for this profile.',
  }),
  profile({
    id: 'omni-flash',
    profileId: 'gemini-omni-1.1-flash',
    modelCode: 'gemini-omni-1.1-flash',
    displayName: 'Gemini Omni 1.1 Flash',
    vendor: 'Google DeepMind',
    supportedModes: ALL_MODES,
    durations: range(3, 10),
    audioPolicy: 'native',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/omni',
    promptingGuidance:
      'Use natural conversational video direction. State the visible action, camera behavior and relevant synchronized sound. For frames or extension preserve the supplied anchors. Keep a simple idea simple; do not impose an unrequested film style or extra shots.',
  }),
  profile({
    id: 'kling',
    profileId: 'kling-4.0',
    modelCode: 'Kling 4.0',
    displayName: 'Kling 4.0',
    vendor: 'Kuaishou',
    supportedModes: ['text-to-video', 'image-to-video', 'first-last-frames', 'ingredients'],
    durations: range(3, 30),
    audioPolicy: 'native',
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    sourceUrl: 'https://kling.ai/quickstart/kling-4-model-user-guide',
    promptingGuidance:
      'Describe subjects, concrete events, reference roles, camera and relevant synchronized sound in natural language. Prefer a few precise actions. Do not invent bracket-tag control syntax or numeric motion-strength settings.',
  }),
  profile({
    id: 'runway-gen3',
    profileId: 'runway-gen-4.5',
    modelCode: 'gen4.5',
    displayName: 'Runway Gen-4.5',
    vendor: 'Runway',
    supportedModes: TEXT_IMAGE,
    durations: range(2, 10),
    audioPolicy: 'post-production',
    negativePolicy: 'unsupported',
    sourceUrl: 'https://help.runwayml.com/hc/en-us/articles/46974685288467-Creating-with-Gen-4-5',
    syntaxFlavor: 'Concise positive physical motion',
    promptingGuidance:
      'Use direct positive descriptions of subject, camera and scene motion. Start simple. For image-to-video describe movement rather than repeating the image appearance. Use “locked camera” instead of negative instructions. Do not place dialogue or audio-generation instructions in the video prompt; keep them as post-production notes.',
  }),
  profile({
    id: 'luma-ray',
    profileId: 'luma-ray-3.2',
    modelCode: 'ray-3.2',
    displayName: 'Luma Ray3.2',
    vendor: 'Luma AI',
    supportedModes: ['text-to-video', 'image-to-video', 'first-last-frames', 'extend'],
    durations: [5, 10],
    audioPolicy: 'post-production',
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    sourceUrl: 'https://docs.agents.lumalabs.ai/guides/videos/generation/',
    promptingGuidance:
      'Use concrete subject, movement, camera, light and pacing. Describe start/end anchors clearly when supplied. First/last anchor interpolation uses 5 seconds. Keep audio and dialogue as separate post-production notes. Do not claim a negative-prompt parameter.',
  }),
  profile({
    id: 'wan-video',
    profileId: 'wan-3.0-hosted',
    modelCode: 'Wan 3.0',
    displayName: 'Wan 3.0',
    vendor: 'Alibaba Cloud',
    supportedModes: ['text-to-video', 'image-to-video', 'ingredients'],
    durations: [30],
    audioPolicy: 'native',
    sourceUrl: 'https://github.com/AlibabaCloud-Official/Wan3.0',
    promptingGuidance:
      'Describe the scene, motion, reference roles, camera and native audio naturally. This is the hosted Wan 3.0 profile; do not describe it as a local CLIP/T5 or FP8/GGUF workflow. Negative-prompt support is unconfirmed.',
  }),
  profile({
    id: 'wan-video',
    profileId: 'wan-2.1-open',
    modelCode: 'Wan 2.1',
    displayName: 'Wan 2.1 (open weights)',
    vendor: 'Wan-Video',
    lifecycle: 'legacy',
    supportedModes: TEXT_IMAGE,
    durations: [5],
    audioPolicy: 'post-production',
    negativePolicy: 'supported',
    sourceUrl: 'https://github.com/Wan-Video/Wan2.1',
    promptingGuidance:
      'Describe the subject, environment, physical movement, camera and style. This legacy open-weights workflow depends on the locally selected checkpoint and host configuration; verify actual output settings in that host.',
  }),
  profile({
    id: 'minimax-hailuo',
    profileId: 'minimax-h3',
    modelCode: 'MiniMax-H3',
    displayName: 'MiniMax-H3',
    vendor: 'MiniMax',
    supportedModes: ['text-to-video', 'image-to-video', 'first-last-frames', 'ingredients'],
    durations: range(4, 15),
    audioPolicy: 'native',
    sourceUrl: 'https://platform.minimax.io/docs/api-reference/video-generation-v2-create',
    promptingGuidance:
      'Describe visible actions and reference roles clearly, with relevant synchronized dialogue and stereo sound. Do not invent a negative-prompt API field or legacy camera-command syntax.',
  }),
  profile({
    id: 'veo-api',
    profileId: 'veo-3.1-preview-retired',
    modelCode: 'veo-3.1-fast-generate-preview',
    displayName: 'Veo 3.1 Gemini API (retired)',
    vendor: 'Google DeepMind',
    lifecycle: 'retired',
    handoff: 'approved-provider',
    supportedModes: [],
    durations: [4, 6, 8],
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/veo',
    promptingGuidance:
      'The Gemini API Veo 3.1 Preview endpoints shut down on 2026-10-22. Preserve existing artifacts, but require an explicit active target before new generation. This does not describe Flow or Vertex GA availability.',
  }),
  profile({
    id: 'sora',
    profileId: 'sora-retired',
    modelCode: 'Sora',
    displayName: 'OpenAI Sora (retired)',
    vendor: 'OpenAI',
    lifecycle: 'retired',
    supportedModes: [],
    durations: [4, 8, 12, 20],
    sourceUrl:
      'https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation',
    promptingGuidance:
      'Sora web/app ended on 2026-04-26 and its API ended on 2026-09-24. Preserve existing artifacts and require an explicit active target for new generation.',
  }),
];

export const TARGET_MODEL_PROFILES = Object.fromEntries(
  STUDIO_TARGET_PROFILES.map((item) => [
    item.id,
    STUDIO_TARGET_PROFILES.find((candidate) => candidate.id === item.id)!,
  ]),
) as Record<UniversalVideoTarget, TargetModelProfile>;

type ProfileInput = Pick<VideoPromptArtifactInput, 'target' | 'profileId' | 'mode'>;
export const getTargetProfiles = (target: UniversalVideoTarget): TargetModelProfile[] =>
  STUDIO_TARGET_PROFILES.filter((item) => item.id === target);
export const getTargetProfile = (
  target: UniversalVideoTarget,
  profileId?: string,
): TargetModelProfile => {
  const selected = profileId
    ? STUDIO_TARGET_PROFILES.find((item) => item.id === target && item.profileId === profileId)
    : Object.hasOwn(TARGET_MODEL_PROFILES, target)
      ? TARGET_MODEL_PROFILES[target]
      : undefined;
  if (!selected)
    throw new Error(
      `Unknown profile ${profileId ?? target} for ${target}. Choose a supported target profile.`,
    );
  return selected;
};
export const isActiveStudioTarget = (target: string): boolean =>
  Object.hasOwn(TARGET_MODEL_PROFILES, target) &&
  TARGET_MODEL_PROFILES[target as UniversalVideoTarget].lifecycle === 'active';
export const getProfileModes = (input: ProfileInput): VideoPromptMode[] => [
  ...getTargetProfile(input.target, input.profileId).supportedModes,
];
export const getProfileAspectRatios = (
  input: ProfileInput,
): VideoPromptArtifactInput['aspectRatio'][] => [
  ...getTargetProfile(input.target, input.profileId).supportedAspectRatios,
];
export const getProfileDurations = (input: ProfileInput): number[] => {
  const selected = getTargetProfile(input.target, input.profileId);
  if (input.target === 'flow-veo' && (input.mode === 'ingredients' || input.mode === 'extend'))
    return selected.supportedModes.includes(input.mode) ? [8] : [];
  if (input.target === 'luma-ray' && input.mode === 'first-last-frames') return [5];
  return [...selected.durations];
};
export const getTargetPromptGuidance = (input: ProfileInput): string => {
  const selected = getTargetProfile(input.target, input.profileId);
  if (selected.lifecycle === 'retired')
    throw new Error(
      `${selected.displayName} is retired. Choose an active target before generating.`,
    );
  return [
    `Target: ${selected.displayName} (${selected.modelCode}); mode: ${input.mode}.`,
    selected.promptingGuidance,
    input.mode === 'image-to-video'
      ? 'The source image establishes appearance and identity. Describe motion rather than repeating static appearance.'
      : '',
    selected.audioPolicy === 'native'
      ? 'Include sound or dialogue only when relevant to the user idea; do not invent spoken lines.'
      : 'Audio and dialogue belong in separate post-production notes, not the video-generation prompt.',
    selected.negativePolicy === 'supported'
      ? 'Use only relevant user exclusions, not a generic negative list.'
      : 'Do not emit a separate negative prompt: support is absent or unverified. Express positive visual intent instead.',
  ]
    .filter(Boolean)
    .join('\n');
};

const sentence = (value?: string): string => {
  const text = value?.trim() ?? '';
  return text && !/[.!?]$/.test(text) ? `${text}.` : text;
};

const compileVariant = (
  input: UniversalPromptInput,
  selected: TargetModelProfile,
  label: TranspiledPromptVariant['label'],
): TranspiledPromptVariant => {
  const details = input.creativeDetails ?? {};
  const rig = input.spatialCamera ? compileSpatialCameraRig(input.spatialCamera) : null;
  const camera = [
    input.camera || rig?.promptFragment,
    details.cameraDistance,
    details.lensType,
    details.compositionalGuide,
  ]
    .filter(Boolean)
    .join(', ');
  const subject = [
    input.subject || input.idea,
    details.characterVisualDNA,
    details.characterClothing,
    details.characterNuances,
  ]
    .filter(Boolean)
    .join(', ');
  const environment = [
    input.environment,
    details.timeOfDay,
    details.weather,
    details.architecturalStyle,
    details.environmentSensoryDetails,
    details.environmentDynamicEvents,
  ]
    .filter(Boolean)
    .join(', ');
  const promptParts =
    input.mode === 'image-to-video'
      ? [
          sentence(input.action || input.idea),
          sentence(camera),
          sentence(details.environmentDynamicEvents),
          sentence(details.motionIntensity),
        ]
      : [
          sentence(subject),
          sentence(input.action),
          sentence(environment),
          sentence(camera),
          sentence(input.lighting),
          sentence(input.style),
          sentence(details.colorPalette),
          sentence(details.motionIntensity),
        ];
  if (input.mode === 'first-last-frames')
    promptParts.push(
      `Transition from ${input.startFrame || 'the supplied first frame'} to ${input.endFrame || 'the supplied last frame'}.`,
    );
  if (input.mode === 'ingredients' && input.referenceRoles)
    promptParts.push(`Reference roles: ${sentence(input.referenceRoles)}`);
  if (input.mode === 'extend')
    promptParts.push(
      `Continue the supplied clip with consistent identity and motion. ${sentence(input.previousClip)}`,
    );
  if (selected.audioPolicy === 'native') {
    const sound = [input.audio, details.ambientSound, details.soundEffectsIntensity]
      .filter(Boolean)
      .join(', ');
    if (sound) promptParts.push(`Sound: ${sentence(sound)}`);
    if (input.dialogue) {
      promptParts.push(`Dialogue: the speaker says: ${input.dialogue}`);
      if (details.voiceStyle) promptParts.push(`Voice delivery: ${sentence(details.voiceStyle)}`);
    }
  }
  // Alternatives vary emphasis without inventing a lens, look, character or action.
  if (label === 'Cinematic')
    promptParts.push('Use deliberate composition and a readable visual rhythm.');
  if (label === 'Control-focused')
    promptParts.push(
      `Keep the described action continuous across ${input.durationSeconds} seconds.`,
    );
  const prompt = promptParts.filter(Boolean).join(' ');
  const negativePrompt =
    selected.negativePolicy === 'unsupported' ? '' : (input.negativePrompt?.trim() ?? '');
  const checklist = [
    `Target: ${selected.displayName} (${selected.modelCode})`,
    `Mode: ${input.mode}`,
    `Aspect ratio: ${input.aspectRatio}`,
    `Duration: ${input.durationSeconds}s`,
    'Manual handoff: select these settings and references in the destination.',
  ];
  if (!getProfileModes(input).includes(input.mode))
    checklist.push('Unsupported mode for this profile. Choose a supported mode before handoff.');
  if (!getProfileDurations(input).includes(input.durationSeconds))
    checklist.push(
      'Unsupported duration for this profile. Choose a supported duration before handoff.',
    );
  if (!getProfileAspectRatios(input).includes(input.aspectRatio))
    checklist.push(
      'Unsupported aspect ratio for this profile. Choose a supported format before handoff.',
    );
  if (selected.audioPolicy !== 'native') {
    const audioNotes = [
      input.audio,
      details.ambientSound,
      details.soundEffectsIntensity,
      details.voiceStyle,
    ]
      .filter(Boolean)
      .join(', ');
    if (audioNotes) checklist.push(`Post-production audio: ${audioNotes}`);
    if (input.dialogue) checklist.push(`Post-production dialogue: ${input.dialogue}`);
  }
  if (input.negativePrompt && selected.negativePolicy === 'unsupported')
    checklist.push(
      `Creative exclusions for manual review: ${input.negativePrompt}. A negative-prompt field is unsupported for this profile; express these exclusions as positive visual direction in the destination.`,
    );
  if (rig) checklist.push(...rig.settingsNotes);
  const copySettingsChecklist = checklist.join('\n');
  const copyAll = [
    prompt,
    negativePrompt ? `Negative prompt: ${negativePrompt}` : '',
    copySettingsChecklist,
  ]
    .filter(Boolean)
    .join('\n\n');
  return {
    label,
    title:
      label === 'Primary'
        ? 'Recommended handoff'
        : label === 'Cinematic'
          ? 'Cinematic emphasis'
          : 'Control-focused',
    prompt,
    negativePrompt,
    settingsChecklist: checklist,
    copyPrompt: prompt,
    copyNegativePrompt: negativePrompt,
    copySettingsChecklist,
    copyAll,
  };
};

export const transpilePrompt = (
  input: UniversalPromptInput,
  overrideTarget?: UniversalVideoTarget,
): TranspiledPromptResult => {
  const target = overrideTarget ?? input.target;
  const scoped = {
    ...input,
    target,
    profileId: target === input.target ? input.profileId : undefined,
  };
  const selected = getTargetProfile(target, scoped.profileId);
  getTargetPromptGuidance(scoped); // Fail closed for retired targets; stored artifacts remain readable.
  return {
    target,
    targetDisplayName: selected.displayName,
    variants: ['Primary', 'Cinematic', 'Control-focused'].map((label) =>
      compileVariant(scoped, selected, label as TranspiledPromptVariant['label']),
    ) as TranspiledPromptResult['variants'],
    recommendations: [
      selected.promptingGuidance,
      input.mode === 'image-to-video'
        ? 'Focus on motion directives; the reference image establishes appearance.'
        : 'Keep the visible subject and action clear.',
    ],
  };
};
