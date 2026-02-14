import React from 'react';
import { TextAreaInput } from '@shared/components/ui';
import { SelectInput } from '@shared/components/ui';
import { RangeInput } from '@shared/components/ui';
import AudioUploadInput from '@shared/components/AudioUploadInput';
import { Icon } from '@shared/components/ui';
import { PromptState, SelectOption } from '@core/types';
import { CHARACTER_LIMITS } from '@core/constants';

interface AudioTabProps {
  promptState: PromptState;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  errors: Partial<Record<keyof PromptState, string>>;
  voiceStyleOptions: SelectOption[];
  ambientSoundOptions: SelectOption[];
  soundEffectsIntensityOptions: SelectOption[];
  handleSuggestFullAudioDesign: () => void;
  isSuggestingFullAudio: boolean;
  onOpenPronunciation: () => void;
  handleAudioMixChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAudioUpload: (audio: { data: string; mimeType: string; name: string }) => void;
  handleAudioClear: () => void;
  handleAnalyzeAudio: () => void;
  isAnalyzingAudio: boolean;
}

const AudioTab: React.FC<AudioTabProps> = ({
  promptState,
  handleInputChange,
  t,
  errors,
  voiceStyleOptions,
  ambientSoundOptions,
  soundEffectsIntensityOptions,
  handleSuggestFullAudioDesign,
  isSuggestingFullAudio,
  onOpenPronunciation,
  handleAudioMixChange,
  handleAudioUpload,
  handleAudioClear,
  handleAnalyzeAudio,
  isAnalyzingAudio,
}) => {
  const audioSuggestButton = (
    <button
      onClick={handleSuggestFullAudioDesign}
      disabled={isSuggestingFullAudio || !promptState.idea}
      className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 transition-colors"
      aria-label={t.tooltips.suggestAudio}
      title={t.tooltips.suggestAudio}
    >
      {isSuggestingFullAudio ? (
        <Icon name="spinner" className="w-5 h-5 animate-spin" />
      ) : (
        <Icon name="magic" className="w-5 h-5" />
      )}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t.labelVoiceStyle}
          name="voiceStyle"
          options={voiceStyleOptions}
          value={promptState.voiceStyle}
          onChange={handleInputChange}
          info={t.tooltips.voiceStyle}
          error={errors.voiceStyle}
          actionButton={audioSuggestButton}
        />
        <TextAreaInput
          label={t.labelVoiceOver}
          name="voiceOver"
          value={promptState.voiceOver}
          onChange={handleInputChange}
          placeholder={t.placeholderVoiceOver}
          rows={3}
          maxLength={CHARACTER_LIMITS.voiceOver}
          disabled={promptState.voiceStyle === 'None'}
          error={errors.voiceOver}
          info={t.tooltips.voiceOver}
          actionButton={
            <div className="flex items-center gap-1">
              <button
                onClick={handleSuggestFullAudioDesign}
                disabled={isSuggestingFullAudio || !promptState.idea}
                className="p-1 text-slate-400 hover:text-cyan-400 transition-colors"
                title={t.tooltips.suggestAudio}
              >
                {isSuggestingFullAudio ? (
                  <Icon name="spinner" className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon name="magic" className="w-4 h-4" />
                )}
              </button>
              <div className="h-4 w-px bg-slate-700 mx-1"></div>
              <button
                onClick={onOpenPronunciation}
                className="p-1 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Pronunciation Guide"
              >
                <Icon name="audio" className="w-4 h-4" />
              </button>
            </div>
          }
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t.labelAmbientSound}
          name="ambientSound"
          options={ambientSoundOptions}
          value={promptState.ambientSound}
          onChange={handleInputChange}
          info={t.tooltips.ambientSound}
          error={errors.ambientSound}
          actionButton={audioSuggestButton}
        />
        <SelectInput
          label={t.labelSoundEffectsIntensity}
          name="soundEffectsIntensity"
          options={soundEffectsIntensityOptions}
          value={promptState.soundEffectsIntensity}
          onChange={handleInputChange}
          info={t.tooltips.soundEffectsIntensity}
          error={errors.soundEffectsIntensity}
        />
      </div>
      <div className="p-6 border border-slate-800 rounded-xl bg-slate-900/40">
        <h4 className="text-sm font-semibold text-slate-300 mb-5 uppercase tracking-wide">
          {t.labelAudioMix}
        </h4>
        <div className="space-y-5">
          <RangeInput
            label={t.labelVoiceVolume}
            name="audioMix.voice"
            value={promptState.audioMix.voice}
            onChange={handleAudioMixChange}
            info={t.tooltips.audioMixVoice}
          />
          <RangeInput
            label={t.labelAmbientVolume}
            name="audioMix.ambient"
            value={promptState.audioMix.ambient}
            onChange={handleAudioMixChange}
            info={t.tooltips.audioMixAmbient}
          />
          <RangeInput
            label={t.labelSfxVolume}
            name="audioMix.sfx"
            value={promptState.audioMix.sfx}
            onChange={handleAudioMixChange}
            info={t.tooltips.audioMixSfx}
          />
        </div>
      </div>
      <AudioUploadInput
        onAudioSelect={handleAudioUpload}
        onAudioClear={handleAudioClear}
        onAnalyze={handleAnalyzeAudio}
        uploadedAudioName={promptState.uploadedAudio?.name || null}
        isAnalyzing={isAnalyzingAudio}
        label={t.labelCustomAudio}
        placeholder={t.placeholderCustomAudio}
        info={t.tooltips.customAudio}
        analyzeButtonText={t.analyzeAudioButton}
      />
    </div>
  );
};

export default AudioTab;
