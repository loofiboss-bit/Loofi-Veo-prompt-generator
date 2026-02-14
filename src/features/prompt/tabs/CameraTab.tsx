import React from 'react';
import { SelectInput } from '@shared/components/ui';
import { Icon } from '@shared/components/ui';
import { PromptState, SelectOption } from '@core/types';

interface CameraTabProps {
  promptState: PromptState;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  errors: Partial<Record<keyof PromptState, string>>;
  cameraMovementOptions: SelectOption[];
  cameraDistanceOptions: SelectOption[];
  lensTypeOptions: SelectOption[];
  compositionalGuideOptions: SelectOption[];
  aspectRatioOptions: SelectOption[];
  resolutionOptions: SelectOption[];
  handleSuggestCameraSetup: () => void;
  isSuggestingCamera: boolean;
  onOpenSpatialDirector: () => void;
}

const CameraTab: React.FC<CameraTabProps> = ({
  promptState,
  handleInputChange,
  t,
  errors,
  cameraMovementOptions,
  cameraDistanceOptions,
  lensTypeOptions,
  compositionalGuideOptions,
  aspectRatioOptions,
  resolutionOptions,
  handleSuggestCameraSetup,
  isSuggestingCamera,
  onOpenSpatialDirector,
}) => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t.labelCameraMovement}
          name="cameraMovement"
          options={cameraMovementOptions}
          value={promptState.cameraMovement}
          onChange={handleInputChange}
          info={t.tooltips.cameraMovement}
          error={errors.cameraMovement}
          actionButton={
            <button
              onClick={handleSuggestCameraSetup}
              disabled={isSuggestingCamera || !promptState.idea}
              className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 transition-colors"
              title={t.tooltips.suggestCamera}
            >
              {isSuggestingCamera ? (
                <Icon name="spinner" className="w-5 h-5 animate-spin" />
              ) : (
                <Icon name="magic" className="w-5 h-5" />
              )}
            </button>
          }
        />
        <SelectInput
          label={t.labelCameraDistance}
          name="cameraDistance"
          options={cameraDistanceOptions}
          value={promptState.cameraDistance}
          onChange={handleInputChange}
          info={t.tooltips.cameraDistance}
          error={errors.cameraDistance}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t.labelLensType}
          name="lensType"
          options={lensTypeOptions}
          value={promptState.lensType}
          onChange={handleInputChange}
          info={t.tooltips.lensType}
          error={errors.lensType}
        />
        <SelectInput
          label={t.labelCompositionalGuide}
          name="compositionalGuide"
          options={compositionalGuideOptions}
          value={promptState.compositionalGuide}
          onChange={handleInputChange}
          info={t.tooltips.compositionalGuide}
          error={errors.compositionalGuide}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectInput
          label={t.labelAspectRatio}
          name="aspectRatio"
          options={aspectRatioOptions}
          value={promptState.aspectRatio}
          onChange={handleInputChange}
          info={t.tooltips.aspectRatio}
          error={errors.aspectRatio}
        />
        <SelectInput
          label={t.labelResolution}
          name="resolution"
          options={resolutionOptions}
          value={promptState.resolution}
          onChange={handleInputChange}
          info={t.tooltips.resolution}
          error={errors.resolution}
        />
      </div>

      <div className="pt-6 border-t border-slate-800">
        <button
          onClick={onOpenSpatialDirector}
          className="w-full flex items-center justify-center space-x-3 py-4 bg-slate-900 border border-slate-700 hover:border-cyan-500/50 rounded-xl text-slate-200 transition-all group shadow-sm hover:shadow-md"
        >
          <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors">
            <Icon name="grid-3x3" className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="block font-semibold text-sm group-hover:text-cyan-100">
              {t.spatialDirectorButton}
            </span>
            <span className="block text-xs text-slate-500 group-hover:text-cyan-200/70">
              Control motion in specific areas
            </span>
          </div>
        </button>
        {Object.keys(promptState.spatialMotions).length > 0 && (
          <p className="text-xs text-center text-cyan-400 mt-3 font-medium">
            {Object.keys(promptState.spatialMotions).length} active spatial directives
          </p>
        )}
      </div>
    </div>
  );
};

export default CameraTab;
