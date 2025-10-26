import React from 'react';
import { appUIStrings, videoGenerationStages } from '../translations';
import Icon from './Icon';

interface VideoGenerationProgressProps {
  currentStatus: string;
  // FIX: Widened the language type to include all supported languages for translations.
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
}

const STAGES = [
  { key: 'init', statuses: ['Init'] },
  { key: 'render', statuses: ['Processing', 'Polling'] },
  { key: 'finalize', statuses: ['Fetching'] },
];

const VideoGenerationProgress: React.FC<VideoGenerationProgressProps> = ({ currentStatus, language }) => {
  const stageLabels = videoGenerationStages[language];
  const t = appUIStrings[language];
  
  const getStageIndex = (status: string) => {
    if (!status) return -1;
    if (status === 'Complete') return STAGES.length;
    return STAGES.findIndex(stage => stage.statuses.includes(status));
  };
  
  const activeIndex = getStageIndex(currentStatus);
  
  const messageKey = `videoStatus${currentStatus}` as keyof typeof t;
  // FIX: Cast the dynamically looked-up message to a string to satisfy the ReactNode type.
  const detailedMessage = (t[messageKey as keyof typeof t] as string) || '';

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-start justify-between">
        {STAGES.map((stage, index) => {
          const isCompleted = activeIndex > index;
          const isActive = activeIndex === index;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center text-center w-20">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted ? 'bg-cyan-500 border-cyan-500' :
                  isActive ? 'bg-slate-800 border-cyan-500 animate-pulse' :
                  'bg-slate-800 border-slate-700'
                }`}>
                  {isCompleted ? <Icon name="check" className="w-6 h-6 text-white" /> : 
                   isActive ? <Icon name="spinner" className="w-6 h-6 text-cyan-400 animate-spin" /> : 
                   <span className="text-slate-500 font-bold">{index + 1}</span>
                  }
                </div>
                <p className={`mt-2 text-xs font-semibold transition-colors duration-300 ${
                  isCompleted || isActive ? 'text-slate-200' : 'text-slate-500'
                }`}>
                  {stageLabels[stage.key]}
                </p>
              </div>
              {index < STAGES.length - 1 && (
                <div className={`flex-1 h-1 mt-5 mx-2 transition-colors duration-500 rounded-full ${isCompleted ? 'bg-cyan-500' : 'bg-slate-700'}`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {detailedMessage && (
        <p className="text-center text-slate-400 mt-4 text-sm min-h-[1.25rem]">
          {detailedMessage}
        </p>
      )}
    </div>
  );
};

export default VideoGenerationProgress;