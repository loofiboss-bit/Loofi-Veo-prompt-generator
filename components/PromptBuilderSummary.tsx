import React from 'react';
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
  };
}

const SummaryItem: React.FC<{ icon: React.ComponentProps<typeof Icon>['name']; label: string; value?: string }> = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center space-x-3 bg-slate-800/40 p-3 rounded-lg">
      <Icon name={icon} className="w-6 h-6 text-cyan-400 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-semibold text-slate-200">{value}</p>
      </div>
    </div>
  );
};

const PromptBuilderSummary: React.FC<PromptBuilderSummaryProps> = ({ promptState, uiStrings }) => {
  return (
    <div className="bg-slate-900/60 backdrop-blur-lg rounded-2xl border border-slate-700 shadow-2xl shadow-black/30 p-6 space-y-6 animate-fade-in-up">
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
      
      <div className="text-center pt-4">
        <p className="text-slate-400">{uiStrings.cta}</p>
      </div>
    </div>
  );
};

export default PromptBuilderSummary;