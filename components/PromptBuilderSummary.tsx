

import React, { useMemo } from 'react';
import { PromptState } from '../types';
import Icon from './Icon';

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
  };
}

const SummaryItem: React.FC<{ icon: React.ComponentProps<typeof Icon>['name']; label: string; value?: string }> = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center space-x-3 bg-slate-800/40 p-3 rounded-lg">
      <Icon name={icon} className="w-6 h-6 text-cyan-400 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-300">{label}</p>
        <p className="font-semibold text-slate-200">{value}</p>
      </div>
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
        state.weather !== 'Any' ? `with ${state.weather.toLowerCase()} weather` : ''
    ].filter(Boolean).join(', ');
    if (sceneDetails) {
        clauses.push(`The scene is set ${sceneDetails}.`);
    }

    const characterDetails = [
        state.characterAge !== 'Any' ? state.characterAge.toLowerCase() : '',
        state.characterGender !== 'Any' ? state.characterGender.toLowerCase() : '',
        state.characterArchetype !== 'Any' ? `a ${state.characterArchetype.toLowerCase()}` : '',
        state.characterMood !== 'Any' ? state.characterMood.toLowerCase() : ''
    ].filter(Boolean).join(' ');

    if (state.characterActions.trim()) {
        const subject = characterDetails ? `A ${characterDetails} character` : 'A character';
        clauses.push(`${subject} ${state.characterActions.trim()}.`);
    } else if (characterDetails) {
        clauses.push(`The scene features a ${characterDetails} character.`);
    }

    const style = state.artStyle === 'Custom' ? state.customArtStyle.trim() : state.artStyle;
    const styleDetails = [
        style && style !== 'Cinematic' ? `a ${style.toLowerCase()} style` : (clauses.length > 1 ? 'a cinematic style' : ''),
        state.colorPalette !== 'Vibrant and saturated' ? `a ${state.colorPalette.toLowerCase()} color palette` : '',
        state.visualEffect !== 'None' ? `with ${state.visualEffect.toLowerCase()} effects` : ''
    ].filter(Boolean);
    if (styleDetails.length > 0) {
        clauses.push(`Visually, it has ${styleDetails.join(', ')}.`);
    }

    const cameraDetails = [
        state.cameraMovement !== 'Static shot' ? state.cameraMovement.toLowerCase() : '',
        state.cameraDistance !== 'Medium shot' ? `from a ${state.cameraDistance.toLowerCase()}` : '',
    ].filter(Boolean).join(' ');
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
  const livePreviewText = useMemo(() => generateLivePreview(promptState, uiStrings.livePreviewPlaceholder), [promptState, uiStrings.livePreviewPlaceholder]);
  
  return (
    <div className="bg-slate-900/60 backdrop-blur-lg rounded-2xl border border-slate-700 shadow-2xl shadow-black/30 p-6 space-y-6">
      <h2 className="text-xl font-semibold text-center text-slate-100">{uiStrings.title}</h2>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-400">{uiStrings.ideaLabel}</label>
          <p className="mt-1 p-3 bg-slate-800/40 rounded-lg text-slate-300 italic min-h-[4rem]">
            {promptState.idea || 'Start by writing your core idea...'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SummaryItem icon="palette" label={uiStrings.styleLabel} value={promptState.artStyle === 'Custom' ? promptState.customArtStyle || 'Custom' : promptState.artStyle} />
            <SummaryItem icon="video" label={uiStrings.cameraLabel} value={promptState.cameraMovement} />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-700/50">
        <h3 className="text-md font-semibold text-slate-300 mb-2">{uiStrings.livePreviewTitle}</h3>
        <div className="p-3 bg-slate-800/40 rounded-lg text-slate-300 min-h-[6rem] text-sm leading-relaxed">
            <p key={livePreviewText} className="animate-text-fade-in">
                {livePreviewText}
            </p>
        </div>
      </div>
      
      <div className="text-center pt-4">
        <p className="text-slate-300">{uiStrings.cta}</p>
      </div>
    </div>
  );
};

export default PromptBuilderSummary;