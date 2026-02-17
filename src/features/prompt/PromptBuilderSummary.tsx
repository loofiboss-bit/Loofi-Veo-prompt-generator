import React, { useMemo } from 'react';
import { PromptState } from '@core/types';
import { Icon } from '@shared/components/ui';
import VisualizerBoard from '@shared/components/VisualizerBoard';

interface PromptBuilderSummaryProps {
  promptState: PromptState;
  uiStrings: {
    title: string;
    ideaLabel: string;
    styleLabel: string;
    cameraLabel: string;
    cta: string;
    livePreviewTitle: string;
    livePreviewPlaceholder: string;
    visualizerTitle?: string; // Optional for backward compatibility if translation missing
  };
}

const SummaryCard: React.FC<{
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  value?: string;
  subValue?: string;
}> = ({ icon, label, value, subValue }) => {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/55 p-4 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)] backdrop-blur-sm transition-colors hover:border-slate-600/70">
      <div className="absolute -right-2 -top-2 p-3 opacity-10 transition-opacity group-hover:opacity-20">
        <Icon name={icon} className="h-12 w-12 text-slate-100" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Icon name={icon} className="h-4 w-4 text-cyan-300" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="truncate text-sm font-semibold text-slate-100" title={value || 'Not set'}>
        {value || <span className="text-slate-600 italic">Not set</span>}
      </p>
      {subValue && <p className="mt-1 truncate text-xs text-slate-400">{subValue}</p>}
    </div>
  );
};

const generateLivePreview = (state: PromptState, placeholder: string): string => {
  if (!state.idea.trim()) {
    return placeholder;
  }

  const clauses: string[] = [];
  clauses.push(state.idea.trim().replace(/[.]$/, ''));

  const sceneDetails = [
    state.environment.trim() ? `in ${state.environment.trim()}` : '',
    state.timeOfDay !== 'Any' ? `during ${state.timeOfDay.toLowerCase()}` : '',
    state.weather !== 'Any' ? `with ${state.weather.toLowerCase()} weather` : '',
  ]
    .filter(Boolean)
    .join(', ');
  if (sceneDetails) {
    clauses.push(`The scene is set ${sceneDetails}.`);
  }

  const characterDetails = [
    state.characterAge !== 'Any' ? state.characterAge.toLowerCase() : '',
    state.characterGender !== 'Any' ? state.characterGender.toLowerCase() : '',
    state.characterArchetype !== 'Any' ? `a ${state.characterArchetype.toLowerCase()}` : '',
    state.characterMood !== 'Any' ? state.characterMood.toLowerCase() : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (state.characterActions.trim()) {
    const subject = characterDetails ? `A ${characterDetails} character` : 'A character';
    clauses.push(`${subject} ${state.characterActions.trim()}.`);
  } else if (characterDetails) {
    clauses.push(`The scene features a ${characterDetails} character.`);
  }

  const style = state.artStyle === 'Custom' ? state.customArtStyle.trim() : state.artStyle;
  const styleDetails = [
    style && style !== 'Cinematic'
      ? `a ${style.toLowerCase()} style`
      : clauses.length > 1
        ? 'a cinematic style'
        : '',
    state.colorPalette !== 'Vibrant and saturated'
      ? `a ${state.colorPalette.toLowerCase()} color palette`
      : '',
    state.visualEffect !== 'None' ? `with ${state.visualEffect.toLowerCase()} effects` : '',
  ].filter(Boolean);
  if (styleDetails.length > 0) {
    clauses.push(`Visually, it has ${styleDetails.join(', ')}.`);
  }

  const cameraDetails = [
    state.cameraMovement !== 'Static shot' ? state.cameraMovement.toLowerCase() : '',
    state.cameraDistance !== 'Medium shot' ? `from a ${state.cameraDistance.toLowerCase()}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  if (cameraDetails) {
    clauses.push(`The camera captures the scene ${cameraDetails}.`);
  }

  let fullString = clauses.join(' ').replace(/ \./g, '.').replace(/\s+/g, ' ').trim();
  if (clauses.length > 1 && !/[.!?]$/.test(fullString)) {
    fullString += '.';
  }
  return fullString;
};

const PromptBuilderSummary: React.FC<PromptBuilderSummaryProps> = ({ promptState, uiStrings }) => {
  const livePreviewText = useMemo(
    () => generateLivePreview(promptState, uiStrings.livePreviewPlaceholder),
    [promptState, uiStrings.livePreviewPlaceholder],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 shadow-2xl backdrop-blur-xl">
      <div className="border-b border-slate-700/50 bg-slate-900/50 px-6 pb-4 pt-5">
        <h2 className="text-center text-lg font-bold text-slate-100">{uiStrings.title}</h2>
      </div>

      <div className="flex-grow space-y-6 p-6">
        {/* Core Idea Section */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            {uiStrings.ideaLabel}
          </label>
          <div className="min-h-[4.75rem] rounded-2xl border border-slate-700/60 bg-slate-950/45 p-4 text-slate-300 leading-relaxed">
            {promptState.idea || (
              <span className="italic text-slate-500">Start by writing your core idea...</span>
            )}
          </div>
        </div>

        {/* Visualizer Board (New Feature) */}
        <VisualizerBoard
          promptState={promptState}
          label={uiStrings.visualizerTitle || 'Mood Board'}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryCard
            icon="palette"
            label={uiStrings.styleLabel}
            value={
              promptState.artStyle === 'Custom'
                ? promptState.customArtStyle || 'Custom'
                : promptState.artStyle
            }
            subValue={promptState.visualEffect !== 'None' ? promptState.visualEffect : undefined}
          />
          <SummaryCard
            icon="video"
            label={uiStrings.cameraLabel}
            value={promptState.cameraMovement}
            subValue={
              promptState.cameraDistance !== 'Medium shot' ? promptState.cameraDistance : undefined
            }
          />
        </div>

        {/* Live Preview Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {uiStrings.livePreviewTitle}
          </h3>
          <div className="min-h-[7.5rem] rounded-2xl border border-slate-700/60 bg-black/30 p-4 text-sm leading-7 text-slate-200">
            <p key={livePreviewText} className="animate-text-fade-in">
              {livePreviewText}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700/60 bg-slate-900/55 p-4 text-center">
        <p className="text-xs text-slate-400 font-medium">{uiStrings.cta}</p>
      </div>
    </div>
  );
};

export default PromptBuilderSummary;
