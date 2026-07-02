import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test-utils';
import ActionBar from './ActionBar';
import type { PromptState } from '@core/types';

vi.mock('@features/prompt/QualityMeter', () => ({
  default: () => <div data-testid="quality-meter" />,
}));

vi.mock('@core/services/geminiService', () => ({
  generateSpeech: vi.fn(),
}));

const DEFAULT_PROMPT_STATE: PromptState = {
  idea: 'A cinematic forest chase',
  environment: '',
  environmentSensoryDetails: '',
  environmentDynamicEvents: '',
  architecturalStyle: '',
  characterActions: '',
  characterNuances: '',
  characterObjectInteraction: '',
  characterGender: '',
  characterEthnicity: '',
  characterClothing: '',
  characterArchetype: '',
  characterAge: '',
  characterMood: '',
  characterPose: '',
  characterSkinTone: '',
  characterSpecificClothing: '',
  characterAccessories: '',
  characterCameoTag: '',
  characterVisualDNA: '',
  characterFixedSeed: null,
  characterNegativePrompt: '',
  globalStyle: {
    description: '',
    strength: 50,
    isLocked: false,
  },
  timeOfDay: '',
  weather: '',
  voiceOver: '',
  voiceStyle: '',
  ambientSound: '',
  soundEffectsIntensity: '',
  negativePrompt: '',
  optimizeFor8Seconds: false,
  artStyle: '',
  customArtStyle: '',
  lightingStyle: '',
  cameraMovement: '',
  cameraDistance: '',
  lensType: '',
  compositionalGuide: '',
  visualEffect: '',
  colorPalette: '',
  aspectRatio: '16:9',
  resolution: '',
  animationPreset: '',
  motionIntensity: '',
  creativityLevel: '',
  includeOverlayText: false,
  overlayTextContent: '',
  useGoogleSearch: false,
  useGoogleMaps: false,
  generateAsSeries: false,
  thinkingMode: false,
  thinkingBudget: 0,
  youtubeUrl: '',
  imageStudioPrompt: '',
  uploadedImage: null,
  uploadedAudio: null,
  audioMix: { voice: 50, ambient: 50, sfx: 50 },
  useImageAsCameo: false,
  language: 'en',
  model: 'veo',
  targetModel: 'flow-veo',
  veoModel: 'quality',
  spatialMotions: {},
};

const createProps = () =>
  ({
    promptState: DEFAULT_PROMPT_STATE,
    generatedPrompt: {
      prompt: 'A cinematic forest chase with dramatic lighting.',
    },
    isLoading: false,
    isEditing: false,
    editedPrompt: '',
    errors: {},
    addToast: vi.fn(),
    onGeneratePrompt: vi.fn(),
    onNewPrompt: vi.fn(),
    onSavePrompt: vi.fn(),
    onSetIsEditing: vi.fn(),
    onSetEditedPrompt: vi.fn(),
    canUndoEdit: false,
    onUndoEdit: vi.fn(),
    canRedoEdit: false,
    onRedoEdit: vi.fn(),
    canUndoPromptState: false,
    onUndoPromptState: vi.fn(),
    canRedoPromptState: false,
    onRedoPromptState: vi.fn(),
    isGeneratingArt: false,
    onGenerateArt: vi.fn(),
    isGeneratingVideo: false,
    onGenerateVideo: vi.fn(),
    isGeneratingStoryboard: false,
    onGenerateStoryboard: vi.fn(),
    onOpenStoryBoardStudio: vi.fn(),
    isGeneratingVariations: false,
    onGenerateVariations: vi.fn(),
    isRefining: false,
    onRefinePrompt: vi.fn(),
    isRestructuring: false,
    onRestructurePrompt: vi.fn(),
    onSaveToHistory: vi.fn(),
    onShare: vi.fn(),
    onDownload: vi.fn(),
    onOpenSavePresetModal: vi.fn(),
    onOpenTemplatesPanel: vi.fn(),
    onCompareModels: vi.fn(),
    onOpenVisualDNA: vi.fn(),
  }) satisfies React.ComponentProps<typeof ActionBar>;

describe('ActionBar', () => {
  it('opens the storyboard studio from the tools menu', async () => {
    const props = createProps();
    const { user } = render(<ActionBar {...props} />);

    await user.click(screen.getByRole('button', { name: /Tools/i }));
    await user.click(screen.getByRole('button', { name: /Story Board/i }));

    expect(props.onOpenStoryBoardStudio).toHaveBeenCalledOnce();
  });
});
