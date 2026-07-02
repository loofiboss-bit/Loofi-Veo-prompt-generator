import type {
  FlowVeoBuildOptions,
  FlowVeoCompatibilityScore,
  FlowVeoOutputMode,
  FlowVeoScenePack,
  FlowVeoShotCard,
  PromptState,
} from '@core/types';

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const sentence = (value: string, fallback: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const getDurationSeconds = (state: PromptState): number => {
  if (state.optimizeFor8Seconds) {
    return 8;
  }

  return state.flowVeoOutputMode === 'veo-api-prompt' || state.targetModel === 'veo-api' ? 8 : 6;
};

const buildCompatibility = (state: PromptState, shotCount: number): FlowVeoCompatibilityScore => {
  const hasIdea = state.idea.trim().length > 24;
  const hasCharacter = Boolean(state.characterVisualDNA || state.characterArchetype !== 'Any');
  const hasAudio = Boolean(
    state.voiceOver || state.ambientSound !== 'None' || state.soundEffectsIntensity !== 'Subtle',
  );
  const hasReferences = Boolean(state.uploadedImage || state.useImageAsCameo);

  return {
    promptClarity: clampScore(hasIdea ? 88 : 56),
    characterConsistency: clampScore(hasCharacter ? 86 : 58),
    shotControl: clampScore(shotCount > 1 ? 92 : 70),
    audioReadiness: clampScore(hasAudio ? 84 : 62),
    flowReadiness: clampScore(shotCount > 1 && hasReferences ? 92 : shotCount > 1 ? 82 : 68),
    veoApiReadiness: clampScore(state.aspectRatio && state.resolution ? 88 : 64),
  };
};

const createShotCards = (state: PromptState, options: FlowVeoBuildOptions): FlowVeoShotCard[] => {
  const fallbackShots = [
    {
      id: 'shot-1',
      action: state.characterActions || state.idea || 'Establish the main visual idea',
      camera: state.cameraMovement || 'Static shot',
      duration: getDurationSeconds(state),
    },
  ];
  const sourceShots = options.shots?.length ? options.shots : fallbackShots;

  return sourceShots.map((shot, index) => {
    const action = shot.action || state.characterActions || state.idea || 'A cinematic moment';
    const camera = shot.camera || state.cameraMovement || 'Static shot';
    const durationSeconds = shot.duration || getDurationSeconds(state);

    return {
      id: String(shot.id ?? `shot-${index + 1}`),
      title: `Shot ${index + 1}`,
      prompt: [
        sentence(action, 'A cinematic Flow/Veo shot.'),
        `Camera: ${camera}.`,
        `Composition: ${state.cameraDistance}, ${state.lensType}.`,
        `Look: ${state.artStyle === 'Custom' ? state.customArtStyle : state.artStyle}.`,
      ].join(' '),
      camera,
      durationSeconds,
      startFrameNotes: `Start with ${state.environment || 'a clear establishing frame'} and stable subject placement.`,
      endFrameNotes: `End on a readable frame that preserves ${state.characterVisualDNA || 'visual continuity'}.`,
      audioNotes: [state.voiceOver, state.ambientSound, state.soundEffectsIntensity]
        .filter((value) => value && value !== 'None')
        .join(', '),
      negativePrompt: [state.negativePrompt, state.characterNegativePrompt]
        .filter(Boolean)
        .join(', '),
    };
  });
};

export const buildFlowVeoScenePack = (
  state: PromptState,
  options: FlowVeoBuildOptions = {},
): FlowVeoScenePack => {
  const mode: FlowVeoOutputMode =
    options.mode ??
    (state.targetModel === 'veo-api'
      ? 'veo-api-prompt'
      : (state.flowVeoOutputMode ?? 'flow-scene-pack'));
  const shotCards = createShotCards(state, options);
  const oneShotPrompt = [
    sentence(state.idea, 'A cinematic Flow/Veo video scene.'),
    state.environment ? `Setting: ${state.environment}.` : '',
    state.characterVisualDNA ? `Character continuity: ${state.characterVisualDNA}.` : '',
    `Style: ${state.artStyle === 'Custom' ? state.customArtStyle : state.artStyle}.`,
    `Camera: ${state.cameraMovement}, ${state.cameraDistance}, ${state.lensType}.`,
    `Format: ${state.aspectRatio}, ${state.resolution}, ${getDurationSeconds(state)} seconds.`,
    state.negativePrompt ? `Avoid: ${state.negativePrompt}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    title: options.title || state.idea.trim().slice(0, 80) || 'Flow/Veo Scene Pack',
    mode,
    oneShotPrompt,
    shotCards,
    characterContinuity:
      state.characterVisualDNA ||
      [state.characterArchetype, state.characterAge, state.characterGender, state.characterClothing]
        .filter((value) => value && value !== 'Any')
        .join(', ') ||
      'Keep subject identity stable across all shots.',
    locationContinuity:
      state.environment ||
      'Preserve the same physical location, lighting direction, and atmosphere across shots.',
    styleBible: [
      state.artStyle === 'Custom' ? state.customArtStyle : state.artStyle,
      state.lightingStyle !== 'Any' ? state.lightingStyle : '',
      state.colorPalette,
      state.visualEffect !== 'None' ? state.visualEffect : '',
    ]
      .filter(Boolean)
      .join(', '),
    referenceChecklist: [
      state.uploadedImage ? 'Reference image attached' : 'Add reference image if identity matters',
      state.useImageAsCameo ? 'Use reference as cameo source' : 'Lock subject description in text',
      'Confirm aspect ratio and duration before generation',
    ],
    insertObjectNotes:
      'When inserting objects, describe their exact position, scale, and interaction.',
    removeObjectNotes:
      'When removing objects, preserve shadows, reflections, and background texture.',
    extendSceneNotes:
      'For extensions, repeat the final frame state and continue the same motion vector.',
    negativePrompt: [state.negativePrompt, state.characterNegativePrompt]
      .filter(Boolean)
      .join(', '),
    compatibility: buildCompatibility(state, shotCards.length),
  };
};

export const buildVeoApiPrompt = (state: PromptState): string => {
  const pack = buildFlowVeoScenePack(state, { mode: 'veo-api-prompt' });

  return [
    pack.oneShotPrompt,
    `Duration: ${getDurationSeconds(state)} seconds.`,
    `Aspect ratio: ${state.aspectRatio}.`,
    `Resolution: ${state.resolution}.`,
    `Reference image notes: ${pack.referenceChecklist.join('; ')}.`,
    pack.shotCards[0]?.audioNotes ? `Audio notes: ${pack.shotCards[0].audioNotes}.` : '',
    pack.negativePrompt ? `Negative prompt: ${pack.negativePrompt}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
};
