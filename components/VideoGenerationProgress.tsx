import React from 'react';
import { videoGenerationStages } from '../translations';
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
    const stageLabels = videoGenerationStages[language] || videoGenerationStages['en'];
    
    const getStageIndex = (status: string) => {
      if (!status || status === 'Error') return -1;
      if (status === 'Complete') return STAGES.length;
      return STAGES.findIndex(stage => stage.statuses.includes(status));
    };
    
    const activeIndex = getStageIndex(currentStatus);

    return (
        <div className="w-full max-w-lg mx-auto">
            {/* Visual Loading Bar for active state */}
            {currentStatus !== 'Complete' && currentStatus !== 'Error' && (
                <div className="w-full bg-slate-800 h-1.5 rounded-full mb-8 overflow-hidden">
                    <div className="h-full bg-cyan-500 animate-progress-infinite origin-left"></div>
                </div>
            )}

            <div className="flex items-start justify-between relative">
                {/* Connecting Line */}
                <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-800 -z-10"></div>
                
                {STAGES.map((stage, index) => {
                    const isCompleted = activeIndex > index;
                    const isActive = activeIndex === index;

                    return (
                        <div key={stage.key} className="flex flex-col items-center text-center w-24 relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 ${
                                isCompleted ? 'bg-cyan-600 border-cyan-600 scale-100' :
                                isActive ? 'bg-slate-900 border-cyan-500 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.4)]' :
                                'bg-slate-900 border-slate-700'
                            }`}>
                                {isCompleted ? <Icon name="check" className="w-5 h-5 text-white" /> : 
                                 isActive ? <Icon name="spinner" className="w-5 h-5 text-cyan-400 animate-spin" /> : 
                                 <span className="text-slate-500 font-bold text-sm">{index + 1}</span>
                                }
                            </div>
                            <p className={`mt-3 text-xs font-semibold transition-colors duration-300 ${
                                isCompleted ? 'text-cyan-400' :
                                isActive ? 'text-white' : 'text-slate-500'
                            }`}>
                                {stageLabels[stage.key]}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const VideoGenerationProgress: React.FC<VideoGenerationProgressProps> = ({ currentStatus, generatedVideoUrl, onClose, uiStrings, language }) => {
  const messageKey = `videoStatus${currentStatus}` as keyof typeof uiStrings;
  const detailedMessage = (uiStrings[messageKey] as string) || (currentStatus === 'Error' ? uiStrings.videoStatusError : 'Processing...');

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in-up">
        <div className="bg-slate-900/80 backdrop-blur-xl w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 text-center relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent animate-spin-slow pointer-events-none"></div>

            <h2 className="text-2xl font-bold text-slate-100 mb-1 relative z-10">
                {generatedVideoUrl ? uiStrings.videoStatusComplete : uiStrings.generateVideoButton}
            </h2>
            
            <div className="my-10 relative z-10">
                {generatedVideoUrl ? (
                    <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 bg-black aspect-video">
                        <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                    </div>
                ) : (
                    <ProgressStepper currentStatus={currentStatus} language={language} />
                )}
            </div>

            <p className={`text-center text-sm min-h-[1.5rem] relative z-10 transition-colors duration-300 ${currentStatus === 'Error' ? 'text-red-400' : 'text-slate-300'}`}>
                {detailedMessage}
            </p>

            <div className="mt-8 relative z-10">
                 <button 
                    onClick={onClose} 
                    className={`px-8 py-3 rounded-full font-medium transition-all duration-300 transform hover:scale-105 ${
                        generatedVideoUrl 
                        ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20' 
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                >
                    {generatedVideoUrl ? 'Close & Continue' : 'Cancel / Close'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default VideoGenerationProgress;