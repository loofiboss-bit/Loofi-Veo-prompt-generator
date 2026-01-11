import React from 'react';
import TextAreaInput from '../TextAreaInput';
import SelectInput from '../SelectInput';
import Icon from '../Icon';
import { PromptState, SelectOption } from '../../types';
import { CHARACTER_LIMITS } from '../../constants';

interface CharacterTabProps {
  promptState: PromptState;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
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
}) => {
  return (
    <div className="space-y-6 animate-fade-in-up">
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
