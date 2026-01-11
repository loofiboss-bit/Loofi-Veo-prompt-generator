
import React, { useMemo } from 'react';
import { PromptState } from '../types';
import Icon from './Icon';
import VisualizerBoard from './VisualizerBoard';

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

const SummaryCard: React.FC<{ icon: React.ComponentProps<typeof Icon>['name']; label: string; value?: string; subValue?: string }> = ({ icon, label, value, subValue }) => {
  return (
    <div className="flex flex-col p-4 bg-slate-800/30 rounded-xl border border-white/5 relative group overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <Icon name={icon} className="w-12 h-12 text-slate-100" />
      </div>
      <div className="flex items-center gap-2 mb-2">
          <Icon name={icon} className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-medium text-slate-200 text-sm truncate" title={value || 'Not set'}>
        {value || <span className="text-slate-600 italic">Not set</span>}
      </p>
      {subValue && <p className="text-xs text-slate-500 mt-1 truncate">{subValue}</p>}
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
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden flex flex-col h-full">
      <div className="p-6 pb-4 border-b border-slate-800/50">
        <h2 className="text-lg font-bold text-center text-slate-100">{uiStrings.title}</h2>
      </div>
      
      <div className="p-6 space-y-6 flex-grow">
        
        {/* Core Idea Section */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">{uiStrings.ideaLabel}</label>
          <div className="p-4 bg-slate-800/40 rounded-xl border border-white/5 text-slate-300 italic min-h-[4.5rem] leading-relaxed">
            {promptState.idea || <span className="text-slate-600">Start by writing your core idea...</span>}
          </div>
        </div>

        {/* Visualizer Board (New Feature) */}
        <VisualizerBoard promptState={promptState} label={uiStrings.visualizerTitle || "Mood Board"} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
            <SummaryCard 
                icon="palette" 
                label={uiStrings.styleLabel} 
                value={promptState.artStyle === 'Custom' ? promptState.customArtStyle || 'Custom' : promptState.artStyle} 
                subValue={promptState.visualEffect !== 'None' ? promptState.visualEffect : undefined}
            />
            <SummaryCard 
                icon="video" 
                label={uiStrings.cameraLabel} 
                value={promptState.cameraMovement} 
                subValue={promptState.cameraDistance !== 'Medium shot' ? promptState.cameraDistance : undefined}
            />
        </div>

        {/* Live Preview Section */}
        <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{uiStrings.livePreviewTitle}</h3>
            <div className="p-4 bg-black/20 rounded-xl border border-white/5 text-slate-300 min-h-[7rem] text-sm leading-7">
                <p key={livePreviewText} className="animate-text-fade-in">
                    {livePreviewText}
                </p>
            </div>
        </div>
      </div>
      
      <div className="p-4 bg-slate-800/30 border-t border-slate-800/50 text-center">
        <p className="text-xs text-slate-400 font-medium">{uiStrings.cta}</p>
      </div>
    </div>
  );
};

export default PromptBuilderSummary;
