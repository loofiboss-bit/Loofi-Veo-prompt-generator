import React from 'react';
import { TextAreaInput } from '@shared/components/ui';
import { SelectInput } from '@shared/components/ui';
import { Icon } from '@shared/components/ui';
import { PromptState, SelectOption } from '@core/types';
import { CHARACTER_LIMITS } from '@core/constants';

interface CharacterTabProps {
  promptState: PromptState;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  errors: Partial<Record<keyof PromptState, string>>;
  characterArchetypeOptions: SelectOption[];
  characterAgeOptions: SelectOption[];
  characterGenderOptions: SelectOption[];
  characterMoodOptions: SelectOption[];
  characterPoseOptions: SelectOption[];
  characterEthnicityOptions: SelectOption[];
  characterSkinToneOptions: SelectOption[];
  characterClothingOptions: SelectOption[];
  handleSuggestCharacterActions: () => void;
  isSuggestingActions: boolean;
  // New prop for DNA generation logic, or passed down wrapper
  handleGenerateVisualDNA?: () => void;
  isGeneratingVisualDNA?: boolean;
}

const CharacterTab: React.FC<CharacterTabProps> = ({
  promptState,
  handleInputChange,
  t,
  errors,
  characterArchetypeOptions,
  characterAgeOptions,
  characterGenderOptions,
  characterMoodOptions,
  characterPoseOptions,
  characterEthnicityOptions,
  characterSkinToneOptions,
  characterClothingOptions,
  handleSuggestCharacterActions,
  isSuggestingActions,
  handleGenerateVisualDNA,
  isGeneratingVisualDNA,
}) => {
  const _handleSeedChange = (_e: React.ChangeEvent<HTMLInputElement>) => {
    const _val = _e.target.value ? parseInt(_e.target.value) : null;
    // Synthesize event to match handleInputChange signature roughly, or use a specific setter if passed
    // handleInputChange expects element. We can hack it or assume parent handles name binding.
    // Better to manually call setter or rely on handleInputChange working for text/number inputs if name matches.
    // promptState handles number | null, input gives string.
    // We will assume handleInputChange parses standard inputs, but for seed we might need special handling in parent or just use text input.
    // Let's use a standard number input.
    handleInputChange(_e);
  };

  const handleSeedLockToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    // If checked, generate a seed if none exists
    if (e.target.checked && !promptState.characterFixedSeed) {
      const randomSeed = Math.floor(Math.random() * 10000000);
      // Create synthetic event
      const event = {
        target: { name: 'characterFixedSeed', value: randomSeed.toString() },
        currentTarget: { name: 'characterFixedSeed', value: randomSeed.toString() },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
      handleInputChange(event);
    } else if (!e.target.checked) {
      // Clear seed
      const event = {
        target: { name: 'characterFixedSeed', value: '' },
        currentTarget: { name: 'characterFixedSeed', value: '' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
      handleInputChange(event);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Visual DNA Section (Identity Lock) */}
      <div className="bg-slate-900/40 border border-indigo-500/30 rounded-xl p-4 shadow-lg shadow-indigo-900/10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
            <Icon name="dna" className="w-4 h-4" />
            Identity Lock (Visual DNA)
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={promptState.characterFixedSeed !== null}
                onChange={handleSeedLockToggle}
                className="rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-indigo-500"
              />
              Lock Seed
            </label>
            {promptState.characterFixedSeed !== null && (
              <input
                type="number"
                name="characterFixedSeed"
                value={promptState.characterFixedSeed ?? ''}
                onChange={handleInputChange}
                className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-mono text-indigo-300"
                placeholder="Seed..."
              />
            )}
          </div>
        </div>

        <TextAreaInput
          label="Visual DNA Description"
          name="characterVisualDNA"
          value={promptState.characterVisualDNA}
          onChange={handleInputChange}
          placeholder="Detailed physical description (face, hair, build, distinctive marks). This persists across shots."
          rows={4}
          maxLength={CHARACTER_LIMITS.characterVisualDNA}
          info="The master description for this character. Prioritized over other character fields."
          actionButton={
            handleGenerateVisualDNA && (
              <button
                onClick={handleGenerateVisualDNA}
                disabled={isGeneratingVisualDNA}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 text-xs font-bold transition-colors border border-indigo-500/30"
                title="Generate DNA from Archetype"
              >
                {isGeneratingVisualDNA ? (
                  <Icon name="spinner" className="w-3 h-3 animate-spin" />
                ) : (
                  <Icon name="sparkles" className="w-3 h-3" />
                )}
                Generate
              </button>
            )
          }
        />

        <div className="mt-4">
          <TextAreaInput
            label="Negative Prompt (Exclusions)"
            name="characterNegativePrompt"
            value={promptState.characterNegativePrompt}
            onChange={handleInputChange}
            placeholder="beard, glasses, hat (things this character definitely doesn't have)"
            rows={1}
            maxLength={CHARACTER_LIMITS.characterNegativePrompt}
          />
        </div>
      </div>

      <TextAreaInput
        label={t.labelCharacterActions}
        name="characterActions"
        value={promptState.characterActions}
        onChange={handleInputChange}
        placeholder={t.placeholderCharacterActions}
        rows={3}
        maxLength={CHARACTER_LIMITS.characterActions}
        info={t.tooltips.characterActions}
        error={errors.characterActions}
        actionButton={
          <button
            onClick={handleSuggestCharacterActions}
            disabled={isSuggestingActions || !promptState.idea}
            className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 transition-colors"
            title={t.tooltips.suggestActions}
          >
            {isSuggestingActions ? (
              <Icon name="spinner" className="w-5 h-5 animate-spin" />
            ) : (
              <Icon name="magic" className="w-5 h-5" />
            )}
          </button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t.labelCharacterArchetype}
          name="characterArchetype"
          options={characterArchetypeOptions}
          value={promptState.characterArchetype}
          onChange={handleInputChange}
          info={t.tooltips.characterArchetype}
          error={errors.characterArchetype}
        />
        <div className="grid grid-cols-2 gap-4">
          <SelectInput
            label={t.labelCharacterAge}
            name="characterAge"
            options={characterAgeOptions}
            value={promptState.characterAge}
            onChange={handleInputChange}
            info={t.tooltips.characterAge}
            error={errors.characterAge}
          />
          <SelectInput
            label={t.labelCharacterGender}
            name="characterGender"
            options={characterGenderOptions}
            value={promptState.characterGender}
            onChange={handleInputChange}
            info={t.tooltips.characterGender}
            error={errors.characterGender}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t.labelCharacterMood}
          name="characterMood"
          options={characterMoodOptions}
          value={promptState.characterMood}
          onChange={handleInputChange}
          info={t.tooltips.characterMood}
          error={errors.characterMood}
        />
        <SelectInput
          label={t.labelCharacterPose}
          name="characterPose"
          options={characterPoseOptions}
          value={promptState.characterPose}
          onChange={handleInputChange}
          info={t.tooltips.characterPose}
          error={errors.characterPose}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t.labelCharacterEthnicity}
          name="characterEthnicity"
          options={characterEthnicityOptions}
          value={promptState.characterEthnicity}
          onChange={handleInputChange}
          info={t.tooltips.characterEthnicity}
          error={errors.characterEthnicity}
        />
        <SelectInput
          label={t.labelCharacterSkinTone}
          name="characterSkinTone"
          options={characterSkinToneOptions}
          value={promptState.characterSkinTone}
          onChange={handleInputChange}
          info={t.tooltips.characterSkinTone}
          error={errors.characterSkinTone}
        />
      </div>
      <SelectInput
        label="Clothing Style"
        name="characterClothing"
        options={characterClothingOptions}
        value={promptState.characterClothing}
        onChange={handleInputChange}
        error={errors.characterClothing}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextAreaInput
          label={t.labelCharacterSpecificClothing}
          name="characterSpecificClothing"
          value={promptState.characterSpecificClothing}
          onChange={handleInputChange}
          placeholder={t.placeholderCharacterSpecificClothing}
          rows={2}
          maxLength={CHARACTER_LIMITS.characterSpecificClothing}
          error={errors.characterSpecificClothing}
          info={t.tooltips.characterSpecificClothing}
        />
        <TextAreaInput
          label={t.labelCharacterAccessories}
          name="characterAccessories"
          value={promptState.characterAccessories}
          onChange={handleInputChange}
          placeholder={t.placeholderCharacterAccessories}
          rows={2}
          maxLength={CHARACTER_LIMITS.characterAccessories}
          info={t.tooltips.characterAccessories}
          error={errors.characterAccessories}
        />
      </div>
    </div>
  );
};

export default CharacterTab;
