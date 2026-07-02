import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      getResourceBundle: () => ({ errorValidation: 'Validation error' }),
    },
  }),
}));

// Mock geminiService
const mockAnalyzeIdeaForModifiers = vi.fn();
const mockSuggestFullAudioDesign = vi.fn();
const mockSuggestEnvironmentDetails = vi.fn();
const mockSuggestSensoryDetails = vi.fn();
const mockSuggestCharacterNuances = vi.fn();
const mockSuggestVisualEffect = vi.fn();
const mockSuggestAdvancedSettings = vi.fn();
const mockSuggestArtStyles = vi.fn();
const mockSuggestCharacterDetails = vi.fn();
const mockAnalyzeAudio = vi.fn();
const mockSuggestCameraSetup = vi.fn();
const mockSuggestCharacterActionFlow = vi.fn();
const mockRefinePrompt = vi.fn();
const mockRestructurePrompt = vi.fn();
const mockGenerateCharacterDNA = vi.fn();
const mockGeneratePromptWithCurrentProvider = vi.fn();

vi.mock('@core/services/geminiService', () => ({
  analyzeIdeaForModifiers: (...args: unknown[]) => mockAnalyzeIdeaForModifiers(...args),
  suggestFullAudioDesign: (...args: unknown[]) => mockSuggestFullAudioDesign(...args),
  suggestEnvironmentDetails: (...args: unknown[]) => mockSuggestEnvironmentDetails(...args),
  suggestSensoryDetails: (...args: unknown[]) => mockSuggestSensoryDetails(...args),
  suggestCharacterNuances: (...args: unknown[]) => mockSuggestCharacterNuances(...args),
  suggestVisualEffect: (...args: unknown[]) => mockSuggestVisualEffect(...args),
  suggestAdvancedSettings: (...args: unknown[]) => mockSuggestAdvancedSettings(...args),
  suggestArtStyles: (...args: unknown[]) => mockSuggestArtStyles(...args),
  suggestCharacterDetails: (...args: unknown[]) => mockSuggestCharacterDetails(...args),
  analyzeAudio: (...args: unknown[]) => mockAnalyzeAudio(...args),
  suggestCameraSetup: (...args: unknown[]) => mockSuggestCameraSetup(...args),
  suggestCharacterActionFlow: (...args: unknown[]) => mockSuggestCharacterActionFlow(...args),
  refinePrompt: (...args: unknown[]) => mockRefinePrompt(...args),
  restructurePrompt: (...args: unknown[]) => mockRestructurePrompt(...args),
  generateCharacterDNA: (...args: unknown[]) => mockGenerateCharacterDNA(...args),
}));

vi.mock('@core/services/promptGenerationService', () => ({
  generatePromptWithCurrentProvider: (...args: unknown[]) =>
    mockGeneratePromptWithCurrentProvider(...args),
}));

// Mock error handler
vi.mock('@core/utils/errorHandler', () => ({
  getApiErrorMessage: (err: unknown) => `API Error: ${String(err)}`,
}));

// Mock validation
const mockValidateAllFields = vi.fn().mockReturnValue({});
vi.mock('@core/utils/validation', () => ({
  validateAllFields: (...args: unknown[]) => mockValidateAllFields(...args),
}));

// Mock performance service
vi.mock('@core/services/performanceService', () => ({
  performanceService: {
    startMark: vi.fn(),
    endMark: vi.fn(),
  },
}));

// Mock constants
vi.mock('@core/constants', () => ({
  CHARACTER_LIMITS: {
    voiceOver: 500,
    environment: 300,
    environmentSensoryDetails: 300,
    environmentDynamicEvents: 300,
    characterNuances: 300,
    negativePrompt: 300,
    characterActions: 300,
    characterVisualDNA: 500,
  },
  getArtStyles: () => [{ value: 'Cinematic' }, { value: 'Custom' }],
  getCameraMovements: () => [{ value: 'Pan' }, { value: 'Dolly' }],
  getColorPalettes: () => [{ value: 'Warm' }],
  getTimeOfDayOptions: () => [{ value: 'Any' }, { value: 'Morning' }],
  getWeatherOptions: () => [{ value: 'Any' }, { value: 'Clear' }],
  getVisualEffects: () => [{ value: 'Bloom' }],
  getCameraDistances: () => [{ value: 'Medium Shot' }],
  getCharacterGenders: () => [{ value: 'Male' }],
  getCharacterAges: () => [{ value: 'Adult' }],
  getCharacterMoods: () => [{ value: 'Any' }, { value: 'Happy' }],
  getCharacterPoses: () => [{ value: 'Any' }, { value: 'Standing' }],
  getCharacterClothings: () => [{ value: 'Casual' }],
  getCharacterSkinTones: () => [{ value: 'Any' }, { value: 'Fair' }],
  getCharacterArchetypes: () => [{ value: 'Any' }, { value: 'Hero' }],
  getCharacterEthnicityOptions: () => [{ value: 'Any' }],
  getAmbientSounds: () => [{ value: 'Wind' }],
  getSoundEffectsIntensity: () => [{ value: 'Medium' }],
  getVoiceStyles: () => [{ value: 'Narrator' }],
  getArchitecturalStyles: () => [{ value: 'Any' }, { value: 'Modern' }],
  getLightingStyles: () => [{ value: 'Any' }, { value: 'Natural' }],
  getCompositionalGuides: () => [{ value: 'Any' }, { value: 'Rule of Thirds' }],
  getMotionIntensityOptions: () => [{ value: 'Medium' }],
  getCreativityLevelOptions: () => [{ value: 'Balanced' }],
  getLensTypes: () => [{ value: '50mm' }],
  getAspectRatios: () => [{ value: '16:9' }],
  getAnimationPresets: () => [{ value: 'None' }, { value: 'Bounce' }],
}));

import { usePromptLogic } from './usePromptLogic';
import type { PromptState } from '@core/types';

function createMockPromptState(overrides: Partial<PromptState> = {}): PromptState {
  return {
    idea: 'A sunset over the ocean',
    language: 'en',
    model: 'gemini-2.0-flash',
    targetModel: 'flow-veo',
    generateAsSeries: false,
    artStyle: 'Cinematic',
    customArtStyle: '',
    cameraMovement: 'Pan',
    colorPalette: 'Warm',
    timeOfDay: 'Morning',
    weather: 'Clear',
    visualEffect: 'Bloom',
    cameraDistance: 'Medium Shot',
    characterGender: 'Male',
    characterAge: 'Adult',
    characterMood: 'Happy',
    characterPose: 'Standing',
    characterClothing: 'Casual',
    characterSkinTone: 'Fair',
    characterArchetype: 'Hero',
    characterEthnicity: 'Any',
    characterActions: 'Walking along the beach',
    characterNuances: '',
    characterSpecificClothing: '',
    characterVisualDNA: '',
    environment: 'Beach at sunset',
    environmentSensoryDetails: '',
    environmentDynamicEvents: '',
    ambientSound: 'Wind',
    soundEffectsIntensity: 'Medium',
    voiceStyle: 'Narrator',
    voiceOver: '',
    architecturalStyle: 'Modern',
    lightingStyle: 'Natural',
    compositionalGuide: 'Rule of Thirds',
    motionIntensity: 'Medium',
    creativityLevel: 'Balanced',
    lensType: '50mm',
    aspectRatio: '16:9',
    animationPreset: 'None',
    negativePrompt: '',
    audioMix: { voice: 50, ambient: 30, sfx: 20 },
    uploadedImage: null,
    uploadedAudio: null,
    ...overrides,
  } as PromptState;
}

function renderPromptLogic(stateOverrides: Partial<PromptState> = {}) {
  const promptState = createMockPromptState(stateOverrides);
  const setPromptState = vi.fn();
  const addToast = vi.fn();
  const result = renderHook(() => usePromptLogic({ promptState, setPromptState, addToast }));

  return { ...result, setPromptState, addToast, promptState };
}

describe('usePromptLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateAllFields.mockReturnValue({});
  });

  // ─── Initial State ──────────────────────────────────────────────

  it('should return initial state with null generatedPrompt', () => {
    const { result } = renderPromptLogic();

    expect(result.current.generatedPrompt).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.errors).toEqual({});
    expect(result.current.isAutoFilling).toBe(false);
    expect(result.current.artStyleSuggestions).toEqual([]);
    expect(result.current.clothingSuggestions).toEqual([]);
    expect(result.current.accessorySuggestions).toEqual([]);
  });

  it('should expose all loading states as false initially', () => {
    const { result } = renderPromptLogic();

    expect(result.current.isSuggestingFullAudio).toBe(false);
    expect(result.current.isAnalyzingAudio).toBe(false);
    expect(result.current.isSuggestingArtStyle).toBe(false);
    expect(result.current.isSuggestingCharacterDetails).toBe(false);
    expect(result.current.isSuggestingEnvironment).toBe(false);
    expect(result.current.isSuggestingSensoryDetails).toBe(false);
    expect(result.current.isSuggestingCharacterNuances).toBe(false);
    expect(result.current.isSuggestingEffect).toBe(false);
    expect(result.current.isSuggestingAdvanced).toBe(false);
    expect(result.current.isSuggestingCamera).toBe(false);
    expect(result.current.isSuggestingActions).toBe(false);
    expect(result.current.isRestructuring).toBe(false);
    expect(result.current.isRefining).toBe(false);
    expect(result.current.isGeneratingVisualDNA).toBe(false);
  });

  // ─── handleGeneratePrompt ───────────────────────────────────────

  it('should generate prompt successfully', async () => {
    const mockResult = { prompt: 'Generated prompt text', groundingChunks: [] };
    mockGeneratePromptWithCurrentProvider.mockResolvedValue(mockResult);

    const { result, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleGeneratePrompt();
    });

    expect(result.current.generatedPrompt).toEqual(mockResult);
    expect(addToast).toHaveBeenCalledWith('toasts:toastPromptGenerated', 'success');
  });

  it('should show validation errors when fields are invalid', async () => {
    mockValidateAllFields.mockReturnValue({ idea: 'Required' });

    const { result, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleGeneratePrompt();
    });

    expect(result.current.generatedPrompt).toBeNull();
    expect(addToast).toHaveBeenCalledWith('errors:errorValidation', 'error');
    expect(mockGeneratePromptWithCurrentProvider).not.toHaveBeenCalled();
  });

  it('should handle API errors during prompt generation', async () => {
    mockGeneratePromptWithCurrentProvider.mockRejectedValue(new Error('API failure'));

    const { result, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleGeneratePrompt();
    });

    expect(result.current.generatedPrompt).toBeNull();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('API Error'), 'error');
    expect(result.current.isLoading).toBe(false);
  });

  // ─── handleAutoFillModifiers ────────────────────────────────────

  it('should auto-fill modifiers successfully', async () => {
    mockAnalyzeIdeaForModifiers.mockResolvedValue({
      artStyle: 'Impressionist',
      cameraMovement: 'Dolly',
    });

    const { result, setPromptState, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleAutoFillModifiers();
    });

    expect(setPromptState).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Complete'), 'success');
  });

  it('should reject auto-fill when idea is empty', async () => {
    const { result, addToast } = renderPromptLogic({ idea: '' });

    await act(async () => {
      await result.current.handleAutoFillModifiers();
    });

    expect(mockAnalyzeIdeaForModifiers).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('errors:errorValidation', 'error');
  });

  it('should handle auto-fill API error', async () => {
    mockAnalyzeIdeaForModifiers.mockRejectedValue(new Error('Network error'));

    const { result, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleAutoFillModifiers();
    });

    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('API Error'), 'error');
    expect(result.current.isAutoFilling).toBe(false);
  });

  it('should handle audioMix suggestions in auto-fill', async () => {
    mockAnalyzeIdeaForModifiers.mockResolvedValue({
      audioMixVoice: 60,
      audioMixAmbient: 30,
      audioMixSfx: 10,
    });

    const { result, setPromptState } = renderPromptLogic();

    await act(async () => {
      await result.current.handleAutoFillModifiers();
    });

    const callArgs = setPromptState.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.audioMix).toEqual({ voice: 60, ambient: 30, sfx: 10 });
  });

  // ─── handleSuggestFullAudioDesign ──────────────────────────────

  it('should suggest full audio design successfully', async () => {
    mockSuggestFullAudioDesign.mockResolvedValue({
      suggestedVoiceStyle: 'Dramatic',
      suggestedVoiceOverScript: 'Voice over text',
      suggestedAmbientSound: 'Ocean waves',
      suggestedSoundEffectsIntensity: 'High',
    });

    const { result, setPromptState, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleSuggestFullAudioDesign();
    });

    expect(setPromptState).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceStyle: 'Dramatic',
        ambientSound: 'Ocean waves',
      }),
    );
    expect(addToast).toHaveBeenCalledWith('toasts:toastAudioSuggested', 'success');
  });

  it('should reject audio design when idea is empty', async () => {
    const { result, addToast } = renderPromptLogic({ idea: '' });

    await act(async () => {
      await result.current.handleSuggestFullAudioDesign();
    });

    expect(mockSuggestFullAudioDesign).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('errors:errorValidation', 'error');
  });

  // ─── handleSuggestEnvironmentDetails ────────────────────────────

  it('should suggest environment details successfully', async () => {
    mockSuggestEnvironmentDetails.mockResolvedValue({
      environmentSensoryDetails: 'Salt spray, warm sand',
      environmentDynamicEvents: 'Seagulls circling',
    });

    const { result, setPromptState, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleSuggestEnvironmentDetails();
    });

    expect(setPromptState).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('toasts:toastEnvironmentSuggested', 'success');
  });

  it('should reject environment suggestion when both environment and idea are empty', async () => {
    const { result, addToast } = renderPromptLogic({ environment: '', idea: '' });

    await act(async () => {
      await result.current.handleSuggestEnvironmentDetails();
    });

    expect(mockSuggestEnvironmentDetails).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('errors:errorValidation', 'error');
  });

  it('should use idea to suggest environment when environment is empty', async () => {
    mockSuggestEnvironmentDetails.mockResolvedValue({
      environment: 'Dense forest',
      environmentSensoryDetails: 'Moss and dew',
    });

    const { result, setPromptState } = renderPromptLogic({ environment: '' });

    await act(async () => {
      await result.current.handleSuggestEnvironmentDetails();
    });

    expect(setPromptState).toHaveBeenCalled();
  });

  // ─── handleSuggestSensoryDetails ────────────────────────────────

  it('should suggest sensory details successfully', async () => {
    mockSuggestSensoryDetails.mockResolvedValue('Warm breeze carrying salt air');

    const { result, setPromptState, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleSuggestSensoryDetails();
    });

    expect(setPromptState).toHaveBeenCalledWith(
      expect.objectContaining({
        environmentSensoryDetails: expect.any(String),
      }),
    );
    expect(addToast).toHaveBeenCalledWith('toasts:toastSensoryDetailsSuggested', 'success');
  });

  it('should reject sensory details when environment is empty', async () => {
    const { result, addToast } = renderPromptLogic({ environment: '' });

    await act(async () => {
      await result.current.handleSuggestSensoryDetails();
    });

    expect(mockSuggestSensoryDetails).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('errors:errorValidation', 'error');
  });

  // ─── handleSuggestCharacterNuances ──────────────────────────────

  it('should suggest character nuances successfully', async () => {
    mockSuggestCharacterNuances.mockResolvedValue('A slight limp from an old injury');

    const { result, setPromptState, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleSuggestCharacterNuances();
    });

    expect(setPromptState).toHaveBeenCalledWith(
      expect.objectContaining({
        characterNuances: expect.any(String),
      }),
    );
    expect(addToast).toHaveBeenCalledWith('toasts:toastCharacterNuancesSuggested', 'success');
  });

  it('should reject nuances when actions empty and mood is Any', async () => {
    const { result, addToast } = renderPromptLogic({
      characterActions: '',
      characterMood: 'Any',
    });

    await act(async () => {
      await result.current.handleSuggestCharacterNuances();
    });

    expect(mockSuggestCharacterNuances).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('errors:errorValidation', 'error');
  });

  // ─── handleSuggestVisualEffect ──────────────────────────────────

  it('should suggest visual effect successfully', async () => {
    mockSuggestVisualEffect.mockResolvedValue('Lens Flare');

    const { result, setPromptState, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleSuggestVisualEffect();
    });

    expect(setPromptState).toHaveBeenCalledWith({ visualEffect: 'Lens Flare' });
    expect(addToast).toHaveBeenCalledWith('toasts:toastEffectSuggested', 'success');
  });

  it('should reject visual effect when Custom style has empty custom field', async () => {
    const { result, addToast } = renderPromptLogic({
      artStyle: 'Custom',
      customArtStyle: '',
    });

    await act(async () => {
      await result.current.handleSuggestVisualEffect();
    });

    expect(mockSuggestVisualEffect).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('errors:errorCustomStyleRequired', 'error');
  });

  // ─── handleSuggestAdvancedSettings ──────────────────────────────

  it('should suggest advanced settings successfully', async () => {
    mockSuggestAdvancedSettings.mockResolvedValue({
      negativePrompt: 'blurry, low quality',
      motionIntensity: 'High',
      creativityLevel: 'Creative',
    });

    const { result, setPromptState, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleSuggestAdvancedSettings();
    });

    expect(setPromptState).toHaveBeenCalledWith(
      expect.objectContaining({
        motionIntensity: 'High',
        creativityLevel: 'Creative',
      }),
    );
    expect(addToast).toHaveBeenCalledWith('toasts:toastAdvancedSuggested', 'success');
  });

  it('should reject advanced settings when idea is empty', async () => {
    const { result, addToast } = renderPromptLogic({ idea: '' });

    await act(async () => {
      await result.current.handleSuggestAdvancedSettings();
    });

    expect(mockSuggestAdvancedSettings).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('errors:errorValidation', 'error');
  });

  // ─── handleSuggestArtStyles ─────────────────────────────────────

  it('should suggest art styles successfully', async () => {
    mockSuggestArtStyles.mockResolvedValue(['Impressionist', 'Cubist', 'Surrealist']);

    const { result } = renderPromptLogic({ customArtStyle: 'watercolor painting' });

    await act(async () => {
      await result.current.handleSuggestArtStyles();
    });

    expect(result.current.artStyleSuggestions).toEqual(['Impressionist', 'Cubist', 'Surrealist']);
  });

  it('should reject art style suggestions when customArtStyle is empty', async () => {
    const { result, addToast } = renderPromptLogic({ customArtStyle: '' });

    await act(async () => {
      await result.current.handleSuggestArtStyles();
    });

    expect(mockSuggestArtStyles).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('errors:errorValidation', 'error');
  });

  // ─── handleSuggestCameraSetup ───────────────────────────────────

  it('should suggest camera setup successfully', async () => {
    mockSuggestCameraSetup.mockResolvedValue({
      cameraMovement: 'Dolly',
      cameraDistance: 'Close-Up',
      lensType: '85mm',
      compositionalGuide: 'Golden Ratio',
    });

    const { result, setPromptState, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleSuggestCameraSetup();
    });

    expect(setPromptState).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraMovement: 'Dolly',
        cameraDistance: 'Close-Up',
        lensType: '85mm',
      }),
    );
    expect(addToast).toHaveBeenCalledWith('toasts:toastCameraSuggested', 'success');
  });

  it('should reject camera setup when idea is empty', async () => {
    const { result, addToast } = renderPromptLogic({ idea: '' });

    await act(async () => {
      await result.current.handleSuggestCameraSetup();
    });

    expect(mockSuggestCameraSetup).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('errors:errorValidation', 'error');
  });

  // ─── handleSuggestCharacterActions ──────────────────────────────

  it('should suggest character actions successfully', async () => {
    mockSuggestCharacterActionFlow.mockResolvedValue(
      'Slowly walks toward the camera, pauses, and turns',
    );

    const { result, setPromptState, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleSuggestCharacterActions();
    });

    expect(setPromptState).toHaveBeenCalledWith(
      expect.objectContaining({
        characterActions: expect.any(String),
      }),
    );
    expect(addToast).toHaveBeenCalledWith('toasts:toastActionsSuggested', 'success');
  });

  it('should reject actions when idea is empty', async () => {
    const { result, addToast } = renderPromptLogic({ idea: '' });

    await act(async () => {
      await result.current.handleSuggestCharacterActions();
    });

    expect(mockSuggestCharacterActionFlow).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('errors:errorValidation', 'error');
  });

  // ─── handleRefinePrompt ─────────────────────────────────────────

  it('should refine prompt successfully', async () => {
    mockRefinePrompt.mockResolvedValue('Refined prompt text');

    const { result, addToast } = renderPromptLogic();

    // Set an initial generated prompt first
    await act(async () => {
      mockGeneratePromptWithCurrentProvider.mockResolvedValueOnce({
        prompt: 'Initial prompt',
        groundingChunks: [{ web: { title: 'Source' } }],
      });
      await result.current.handleGeneratePrompt();
    });

    await act(async () => {
      await result.current.handleRefinePrompt('Initial prompt');
    });

    expect(result.current.generatedPrompt?.prompt).toBe('Refined prompt text');
    expect(addToast).toHaveBeenCalledWith('toasts:toastPromptRefined', 'success');
  });

  it('should handle refine error', async () => {
    mockRefinePrompt.mockRejectedValue(new Error('Refine failed'));

    const { result, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleRefinePrompt('Some prompt');
    });

    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('API Error'), 'error');
    expect(result.current.isRefining).toBe(false);
  });

  // ─── handleRestructurePrompt ────────────────────────────────────

  it('should restructure prompt successfully', async () => {
    mockRestructurePrompt.mockResolvedValue('Restructured prompt text');

    const { result, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleRestructurePrompt('Old prompt');
    });

    expect(result.current.generatedPrompt?.prompt).toBe('Restructured prompt text');
    expect(addToast).toHaveBeenCalledWith('toasts:toastPromptRestructured', 'success');
  });

  it('should handle restructure error', async () => {
    mockRestructurePrompt.mockRejectedValue(new Error('Restructure failed'));

    const { result, addToast } = renderPromptLogic();

    await act(async () => {
      await result.current.handleRestructurePrompt('Some prompt');
    });

    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('API Error'), 'error');
    expect(result.current.isRestructuring).toBe(false);
  });

  // ─── handleGenerateVisualDNA ────────────────────────────────────

  it('should generate visual DNA successfully', async () => {
    mockGenerateCharacterDNA.mockResolvedValue('Tall, lean build with sharp features');

    const { result, setPromptState, addToast } = renderPromptLogic({
      characterArchetype: 'Hero',
    });

    await act(async () => {
      await result.current.handleGenerateVisualDNA();
    });

    expect(setPromptState).toHaveBeenCalledWith(
      expect.objectContaining({
        characterVisualDNA: expect.any(String),
      }),
    );
    expect(addToast).toHaveBeenCalledWith('Visual DNA Generated', 'success');
  });

  it('should reject visual DNA when archetype is Any and no clothing', async () => {
    const { result, addToast } = renderPromptLogic({
      characterArchetype: 'Any',
      characterClothing: '',
    });

    await act(async () => {
      await result.current.handleGenerateVisualDNA();
    });

    expect(mockGenerateCharacterDNA).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.stringContaining('archetype or describe clothing'),
      'error',
    );
  });

  // ─── handleAnalyzeAudio ─────────────────────────────────────────

  it('should analyze uploaded audio successfully', async () => {
    mockAnalyzeAudio.mockResolvedValue('Birds singing');

    const { result, setPromptState, addToast } = renderPromptLogic({
      uploadedAudio: { data: 'base64data', mimeType: 'audio/wav', name: 'test.wav' },
    });

    await act(async () => {
      await result.current.handleAnalyzeAudio();
    });

    expect(setPromptState).toHaveBeenCalledWith(
      expect.objectContaining({
        ambientSound: expect.any(String),
      }),
    );
    expect(addToast).toHaveBeenCalledWith('toasts:toastAudioAnalyzed', 'success');
  });

  it('should skip audio analysis when no audio is uploaded', async () => {
    const { result } = renderPromptLogic({ uploadedAudio: null });

    await act(async () => {
      await result.current.handleAnalyzeAudio();
    });

    expect(mockAnalyzeAudio).not.toHaveBeenCalled();
  });

  // ─── handleTriggerCharacterDetails (debounced) ──────────────────

  it('should skip character details when archetype is Any', async () => {
    const { result } = renderPromptLogic({ characterArchetype: 'Any' });

    await act(async () => {
      await result.current.handleTriggerCharacterDetails();
    });

    expect(result.current.clothingSuggestions).toEqual([]);
    expect(result.current.accessorySuggestions).toEqual([]);
  });

  it('should skip character details when environment is empty', async () => {
    const { result } = renderPromptLogic({ environment: '' });

    await act(async () => {
      await result.current.handleTriggerCharacterDetails();
    });

    expect(result.current.clothingSuggestions).toEqual([]);
  });
});
