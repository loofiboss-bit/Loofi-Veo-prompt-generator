
import React, { useState, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { ToastMessage, SelectOption } from '../types';
import { getAspectRatios, getResolutionOptions, getVeoModelOptions } from '../constants';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
import Button from './Button';
import Tooltip from './Tooltip';
import { ApiError, ApiErrorType } from '../utils/apiErrors';

interface VideoGenerationStudioProps {
  onClose: () => void;
  uiStrings: any;
  addToast: (message: string, type: ToastMessage['type']) => void;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  initialPrompt?: string;
  initialSettings?: { aspectRatio: string; resolution: string; veoModel: string };
}

const VideoGenerationStudio: React.FC<VideoGenerationStudioProps> = ({ 
    onClose, uiStrings, addToast, language, initialPrompt = '', initialSettings 
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState(initialSettings?.aspectRatio || '16:9');
  const [resolution, setResolution] = useState(initialSettings?.resolution || '1080p');
  const [veoModel, setVeoModel] = useState(initialSettings?.veoModel || 'fast');
  
  const [generationStatus, setGenerationStatus] = useState<string>(''); // 'Init', 'Processing', 'Polling', 'Fetching', 'Complete', 'Error'
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isApiKeyModalOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isApiKeyModalOpen]);

  const aspectRatioOptions = getAspectRatios(language).filter(o => ['16:9', '9:16'].includes(o.value));
  const resolutionOptions = getResolutionOptions(language);
  const veoModelOptions = getVeoModelOptions(language);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // Check for API key access using the window.aistudio helper if available
    if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            setIsApiKeyModalOpen(true);
            return;
        }
    }

    setGenerationStatus('Init');
    setGeneratedVideoUrl(null);

    try {
      let operation = await geminiService.generateVideo(
        prompt,
        null, // No image support in this simplified studio for now, keep focused on prompt
        aspectRatio,
        resolution as '1080p' | '720p',
        veoModel as 'fast' | 'quality'
      );
      
      setGenerationStatus('Processing');
      
      while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          setGenerationStatus('Polling');
          operation = await geminiService.pollVideoOperation(operation);
      }
      
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setGenerationStatus('Fetching');
        const videoBlobUrl = await geminiService.fetchVideo(downloadLink);
        setGeneratedVideoUrl(videoBlobUrl);
        setGenerationStatus('Complete');
        addToast(uiStrings.toastVideoGenerated, 'success');
      } else {
        throw new Error("Video generation completed, but no download link was found.");
      }

    } catch (error) {
        const apiErrorMessage = getApiErrorMessage(error, uiStrings);
        let shouldOpenModal = false;
        if (error instanceof ApiError && error.type === ApiErrorType.InvalidApiKey) {
            shouldOpenModal = true;
        }
        
        addToast(apiErrorMessage, 'error');
        setGenerationStatus('Error');

        if (shouldOpenModal) {
            setIsApiKeyModalOpen(true);
        }
    }
  };

  const handleSelectKeyAndRetry = async () => {
    if (typeof (window as any).aistudio?.openSelectKey !== 'function') return;

    await (window as any).aistudio.openSelectKey();
    setIsApiKeyModalOpen(false);
    setTimeout(() => {
        handleGenerate();
    }, 500);
  };

  const handleDownload = () => {
      if (!generatedVideoUrl) return;
      const link = document.createElement('a');
      link.href = generatedVideoUrl;
      link.download = `veo-generated-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const isGenerating = ['Init', 'Processing', 'Polling', 'Fetching'].includes(generationStatus);

  // Status Stepper Component
  const StatusStepper = () => {
      const stages = ['Init', 'Processing', 'Fetching'];
      const currentStageIndex = stages.findIndex(s => {
          if (generationStatus === 'Polling') return s === 'Processing'; // Polling maps to Processing visual
          return s === generationStatus;
      });
      const isComplete = generationStatus === 'Complete';
      const isError = generationStatus === 'Error';

      return (
          <div className="flex flex-col items-center justify-center space-y-4 w-full h-full">
              {isError ? (
                  <div className="text-red-400 flex flex-col items-center animate-pulse">
                      <Icon name="cancel" className="w-12 h-12 mb-2" />
                      <p className="font-semibold">Generation Failed</p>
                  </div>
              ) : isComplete ? (
                  <div className="text-green-400">Complete</div>
              ) : (
                  <div className="flex items-center space-x-3">
                      <Icon name="spinner" className="w-10 h-10 text-cyan-400 animate-spin" />
                      <span className="text-xl text-slate-200 font-light tracking-wide">
                          {uiStrings.videoStudio[`status${generationStatus}`] || "Working..."}
                      </span>
                  </div>
              )}
              
              {!isError && !isComplete && (
                  <div className="flex space-x-2 mt-6">
                      {stages.map((stage, i) => {
                          const isActive = i === currentStageIndex || (generationStatus === 'Polling' && stage === 'Processing');
                          const isDone = i < currentStageIndex || isComplete;
                          return (
                              <div key={stage} className={`w-3 h-3 rounded-full transition-all duration-500 ${isDone ? 'bg-cyan-500 scale-110' : isActive ? 'bg-cyan-500/50 animate-pulse scale-110' : 'bg-slate-700'}`} />
                          );
                      })}
                  </div>
              )}
          </div>
      );
  };

  const clearPrompt = () => setPrompt('');

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog" aria-modal="true" aria-labelledby="video-studio-title"
    >
      <div
        className="bg-slate-900/70 backdrop-blur-xl w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="video-studio-title" className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Icon name="film" className="w-6 h-6 text-cyan-400" />
            {uiStrings.videoStudio.title}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" aria-label="Close Video Studio">
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-grow p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Controls (2/5 width) */}
          <div className="lg:col-span-2 flex flex-col space-y-6">
            <div className="relative">
                <TextAreaInput
                label={uiStrings.videoStudio.promptLabel}
                name="videoPrompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={uiStrings.videoStudio.promptPlaceholder}
                rows={8}
                info={uiStrings.tooltips.videoStudioPrompt}
                disabled={isGenerating}
                />
                {prompt && !isGenerating && (
                    <button 
                        onClick={clearPrompt}
                        className="absolute top-9 right-3 text-slate-500 hover:text-slate-300 transition-colors"
                        title="Clear Prompt"
                    >
                        <Icon name="cancel" className="w-4 h-4" />
                    </button>
                )}
            </div>
            
            <div className="space-y-4 p-5 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <SelectInput
                    label={uiStrings.labelAspectRatio}
                    name="aspectRatio"
                    options={aspectRatioOptions}
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    info={uiStrings.tooltips.aspectRatio}
                    disabled={isGenerating}
                />
                <SelectInput
                    label={uiStrings.labelResolution}
                    name="resolution"
                    options={resolutionOptions}
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    info={uiStrings.tooltips.resolution}
                    disabled={isGenerating}
                />
                <SelectInput
                    label={uiStrings.labelVeoModel}
                    name="veoModel"
                    options={veoModelOptions}
                    value={veoModel}
                    onChange={(e) => setVeoModel(e.target.value)}
                    info={uiStrings.tooltips.videoStudioModel}
                    disabled={isGenerating}
                />
            </div>

             <Button 
                onClick={handleGenerate} 
                isLoading={isGenerating} 
                disabled={isGenerating || !prompt}
            >
                {isGenerating ? uiStrings.videoStudio.generatingButton : uiStrings.videoStudio.generateButton}
            </Button>
          </div>

          {/* Right Column: Preview/Player (3/5 width) */}
          <div className="lg:col-span-3 flex flex-col">
            <div className="flex-grow bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden aspect-video shadow-inner">
                {generatedVideoUrl ? (
                     <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                ) : isGenerating || generationStatus === 'Error' ? (
                    <StatusStepper />
                ) : (
                    <div className="text-center text-slate-600 flex flex-col items-center">
                        <Icon name="film" className="w-24 h-24 mb-4 opacity-30" />
                        <p className="text-lg font-medium">{uiStrings.videoStudio.placeholderText}</p>
                    </div>
                )}
            </div>
            
            {generatedVideoUrl && (
                <div className="flex-shrink-0 mt-4 flex justify-end animate-fade-in-up">
                    <button
                        onClick={handleDownload}
                        className="flex items-center space-x-2 px-6 py-3 text-sm font-bold rounded-lg transition-all text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
                    >
                        <Icon name="download" className="w-5 h-5" />
                        <span>{uiStrings.videoStudio.downloadButton}</span>
                    </button>
                </div>
            )}
          </div>
        </div>
      </div>

      {isApiKeyModalOpen && (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[60] p-4">
                <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-lg text-center shadow-2xl">
                    <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon name="lightbulb" className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-100 mb-2">Unlock Veo Video Generation</h3>
                    <p className="text-slate-300 mt-2 text-base leading-relaxed">Video generation with Veo 3.1 requires a valid API key associated with a project that has billing enabled.</p>
                    <p className="text-slate-400 mt-4 mb-8 text-sm">
                        Please select your key to continue. For more information, please see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">billing documentation</a>.
                    </p>
                    <div className="flex justify-center gap-4">
                        <button 
                            onClick={() => setIsApiKeyModalOpen(false)} 
                            className="px-6 py-3 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <Button onClick={handleSelectKeyAndRetry}>Select Key & Continue</Button>
                    </div>
                </div>
            </div>
      )}
    </div>
  );
};

export default VideoGenerationStudio;
