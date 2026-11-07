import { describe, it, expect } from 'vitest';
import {
  transpilePrompt,
  TARGET_MODEL_PROFILES,
  getTargetProfile,
  getTargetProfiles,
  getProfileModes,
  getProfileDurations,
  getProfileAspectRatios,
  getTargetPromptGuidance,
  isActiveStudioTarget,
} from './modelTranspilerService';
import type { UniversalPromptInput } from '@core/types/modelTranspiler';

const BASE: UniversalPromptInput = {
  idea: 'An astronaut walks across an alien plain',
  mode: 'text-to-video',
  target: 'flow-veo',
  aspectRatio: '16:9',
  durationSeconds: 8,
  subject: 'An astronaut in a gold helmet',
  action: 'walks slowly through ash',
  environment: 'A plain beneath twin moons',
  camera: 'Slow push-in',
};

describe('shared Studio target profiles', () => {
  it('keeps stable persisted target IDs while publishing explicit current versions', () => {
    expect(TARGET_MODEL_PROFILES.kling).toMatchObject({
      modelCode: 'Kling 4.0',
      cameraDirectiveStyle: 'natural',
    });
    expect(getTargetProfile('runway-gen3').modelCode).toBe('gen4.5');
    expect(getTargetProfile('luma-ray').modelCode).toBe('ray-3.2');
    expect(getTargetProfile('minimax-hailuo').modelCode).toBe('MiniMax-H3');
    expect(getTargetProfiles('wan-video').map((item) => item.profileId)).toEqual([
      'wan-3.0-hosted',
      'wan-2.1-open',
    ]);
  });

  it('sources every profile and distinguishes legacy from retired', () => {
    for (const selected of Object.values(TARGET_MODEL_PROFILES)) {
      expect(selected.sourceUrl).toMatch(/^https:/);
      expect(selected.verifiedDate).toBe('2026-10-29');
    }
    expect(isActiveStudioTarget('sora')).toBe(false);
    expect(isActiveStudioTarget('veo-api')).toBe(false);
    expect(isActiveStudioTarget('flow-veo')).toBe(true);
    expect(getTargetProfile('wan-video', 'wan-2.1-open').lifecycle).toBe('legacy');
    expect(() => getTargetProfile('kling', 'runway-gen-4.5')).toThrow('Unknown profile');
  });

  it('resolves Flow capabilities per concrete model and mode', () => {
    expect(getTargetProfiles('flow-veo')).toHaveLength(3);
    expect(getProfileModes({ ...BASE, profileId: 'flow-veo-3.1-quality' })).not.toContain(
      'ingredients',
    );
    expect(getProfileModes({ ...BASE, profileId: 'flow-veo-3.1-fast' })).not.toContain('extend');
    expect(getProfileModes(BASE)).toContain('extend');
    expect(getProfileDurations({ ...BASE, mode: 'ingredients' })).toEqual([8]);
    expect(getProfileDurations({ ...BASE, mode: 'text-to-video' })).toEqual([4, 6, 8]);
  });

  it('supports Luma 5-second keyframes and current formats without rewriting input', () => {
    const input = { ...BASE, target: 'luma-ray' as const, mode: 'first-last-frames' as const };
    expect(getProfileDurations(input)).toEqual([5]);
    expect(getProfileAspectRatios(input)).toContain('21:9');
    expect(getProfileAspectRatios(input)).not.toContain('2.39:1');
    expect(transpilePrompt(input).variants[0].settingsChecklist.join(' ')).toContain(
      'Unsupported duration',
    );
    expect(input.durationSeconds).toBe(8);
  });

  it.each(['sora', 'veo-api'] as const)(
    'blocks new %s compilation without deleting its metadata',
    (target) => {
      expect(getTargetProfile(target).lifecycle).toBe('retired');
      expect(() => transpilePrompt(BASE, target)).toThrow('retired');
      expect(() => getTargetPromptGuidance({ ...BASE, target })).toThrow('retired');
    },
  );
});

describe('target-specific local compilation', () => {
  it('keeps supplied creative camera, identity and environment details', () => {
    const [primary] = transpilePrompt({
      ...BASE,
      creativeDetails: {
        cameraDistance: 'close-up',
        lensType: '50mm',
        compositionalGuide: 'rule of thirds',
        characterVisualDNA: 'A narrow scar over the left eyebrow',
        weather: 'thin snowfall',
        environmentDynamicEvents: 'Dust swirls behind each step',
        colorPalette: 'warm amber',
      },
    }).variants;
    for (const fragment of [
      'close-up',
      '50mm',
      'rule of thirds',
      'narrow scar',
      'thin snowfall',
      'Dust swirls',
      'warm amber',
    ])
      expect(primary.prompt).toContain(fragment);
    expect(primary.negativePrompt).toBe('');
    expect(primary.copyAll).not.toContain('Negative prompt:');
  });

  it('does not inject unsupported Kling bracket tags or made-up settings', () => {
    const [primary] = transpilePrompt(BASE, 'kling').variants;
    expect(primary.prompt).toContain('Slow push-in');
    expect(primary.copyAll).not.toMatch(
      /\[camera:|\[mode:|motion intensity between|fully qualified/i,
    );
    expect(primary.negativePrompt).toBe('');
  });

  it('keeps Runway audio/dialogue outside the prompt and excludes its unsupported negative field', () => {
    const [primary] = transpilePrompt({
      ...BASE,
      target: 'runway-gen3',
      audio: 'Wind through reeds',
      dialogue: 'Stay with me.',
      negativePrompt: 'green tint',
    }).variants;
    expect(primary.prompt).not.toMatch(/Wind through reeds|Stay with me|green tint/);
    expect(primary.settingsChecklist).toContain('Post-production audio: Wind through reeds');
    expect(primary.settingsChecklist).toContain('Post-production dialogue: Stay with me.');
    expect(primary.negativePrompt).toBe('');
    expect(primary.copyAll).not.toContain('Negative prompt:');
    expect(getTargetPromptGuidance({ ...BASE, target: 'runway-gen3' })).toContain('positive');
  });

  it('keeps explicitly requested native dialogue exact in every variant', () => {
    const [primary, cinematic, control] = transpilePrompt({
      ...BASE,
      target: 'omni-flash',
      audio: 'A distant radio',
      dialogue: '“Keep walking. We are close.”',
    }).variants;
    for (const item of [primary, cinematic, control]) {
      expect(item.prompt).toContain('A distant radio');
      expect(item.prompt).toContain('the speaker says: “Keep walking. We are close.”');
    }
  });

  it('uses image motion without restating static appearance', () => {
    const [primary] = transpilePrompt({
      ...BASE,
      target: 'runway-gen3',
      mode: 'image-to-video',
      style: 'A red wool suit',
      lighting: 'Orange studio light',
    }).variants;
    expect(primary.prompt).toContain('walks slowly through ash');
    expect(primary.prompt).not.toMatch(/gold helmet|twin moons|red wool|Orange studio/);
    expect(primary.prompt).toContain('Slow push-in');
  });

  it('preserves idea-only motion and avoids forced photographic style', () => {
    const [primary] = transpilePrompt({
      ...BASE,
      subject: '',
      action: '',
      mode: 'image-to-video',
      idea: 'A paper bird unfolds its wings',
    }).variants;
    expect(primary.prompt).toContain('A paper bird unfolds its wings');
    expect(primary.prompt).not.toMatch(/film stock|photorealistic|35mm|cartoonish/);
  });

  it('supports Flow negative prompts while keeping Omni Flash 1.2 durations mode-aware', () => {
    for (const selected of getTargetProfiles('flow-veo'))
      expect(selected.negativePolicy).toBe('supported');
    const [primary] = transpilePrompt({ ...BASE, negativePrompt: 'unrequested logos' }).variants;
    expect(primary.negativePrompt).toBe('unrequested logos');
    expect(primary.copyAll).toContain('Negative prompt: unrequested logos');
    expect(getTargetProfile('omni-flash').modelCode).toBe('gemini-omni-1.2-flash');
    expect(getProfileDurations({ ...BASE, target: 'omni-flash', mode: 'text-to-video' })).toContain(
      15,
    );
    expect(getProfileDurations({ ...BASE, target: 'omni-flash', mode: 'extend' })).toEqual([
      3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it('preserves exact manually supplied native dialogue and optics in all variants', () => {
    const lensType = '50mm f/2.0 lens with a fixed focus plane';
    const dialogue = '“We stay here. Keep the door open.”';
    const audio = 'Footsteps on wooden boards, a distant bell';
    const original = { ...BASE, dialogue, audio, creativeDetails: { lensType } };
    const result = transpilePrompt(original);
    for (const variant of result.variants) {
      expect(variant.prompt).toContain(lensType);
      expect(variant.prompt).toContain(dialogue);
      expect(variant.prompt).toContain(audio);
    }
    expect(original.creativeDetails.lensType).toBe(lensType);
    expect(original.dialogue).toBe(dialogue);
  });

  it('copies only user-supplied negatives on a profile that supports them', () => {
    const [primary] = transpilePrompt({
      ...BASE,
      target: 'wan-video',
      profileId: 'wan-2.1-open',
      durationSeconds: 5,
      negativePrompt: 'harsh strobing, green tint',
    }).variants;
    expect(primary.negativePrompt).toBe('harsh strobing, green tint');
    expect(primary.copyAll).toContain('Negative prompt: harsh strobing, green tint');
    expect(primary.copyAll).not.toContain('extra limbs');
  });
});
