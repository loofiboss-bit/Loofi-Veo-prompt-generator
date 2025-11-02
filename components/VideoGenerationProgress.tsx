import React from 'react';
import { appUIStrings, videoGenerationStages } from '../translations';
import Icon from './Icon';

interface VideoGenerationProgressProps {
  currentStatus: string;
  generatedVideoUrl: string | null;
  onClose: () => void;
  uiStrings: any;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
}

const ProgressStepper: React.FC<{ currentStatus: string, language: 'en' | 'sv' | 'es' | 'fr' | 'de' }> = ({ currentStatus, language }) => {
    const STAGES = [
      { key: 'init', statuses: ['Init'] },
      { key: 'render', statuses: ['Processing', 'Polling'] },
      { key: 'finalize', statuses: ['Fetching'] },
    ];
    const stageLabels = videoGenerationStages[language];
    
    const getStageIndex = (status: string) => {
      if (!status) return -1;
      if (status === 'Complete') return STAGES.length;
      return STAGES.findIndex(stage => stage.statuses.includes(status));
    };
    
    const activeIndex = getStageIndex(currentStatus);

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
        </div>
    );
};


const VideoGenerationProgress: React.FC<VideoGenerationProgressProps> = ({ currentStatus, generatedVideoUrl, onClose, uiStrings, language }) => {
  const messageKey = `videoStatus${currentStatus}` as keyof typeof uiStrings;
  const detailedMessage = (uiStrings[messageKey] as string) || '';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900/70 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 text-center">
            <h2 className="text-xl font-semibold text-slate-100">{uiStrings.generateVideoButton}</h2>

            <div className="my-8">
                {generatedVideoUrl ? (
                    <video src={generatedVideoUrl} controls autoPlay loop className="w-full rounded-lg" />
                ) : (
                    <ProgressStepper currentStatus={currentStatus} language={language} />
                )}
            </div>

            {detailedMessage && !generatedVideoUrl && (
                <p className="text-center text-slate-300 text-sm min-h-[1.25rem]">
                    {detailedMessage}
                </p>
            )}

            <div className="mt-6">
                 <button onClick={onClose} className="px-6 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 transition-colors">
                    Close
                </button>
            </div>
        </div>
    </div>
  );
};

export default VideoGenerationProgress;