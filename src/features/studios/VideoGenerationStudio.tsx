

import React, { useState, useEffect, useRef } from 'react';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { ToastMessage, SelectOption, GenerationTask } from '@core/types';
import { getAspectRatios, getResolutionOptions, getVeoModelOptions } from '@core/constants';
import Icon from '@shared/components/ui/Icon';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import SelectInput from '@shared/components/ui/SelectInput';
import Button from '@shared/components/ui/Button';
import Tooltip from '@shared/components/ui/Tooltip';
import { ApiError, ApiErrorType } from '@core/utils/apiErrors';

interface VideoGenerationStudioProps {
  onClose: () => void;
  uiStrings: any;
  addToast: (message: string, type: ToastMessage['type']) => void;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  initialPrompt?: string;
  initialSettings?: { aspectRatio: string; resolution: string; veoModel: string };
  // Props for external state management
  tasks?: GenerationTask[];
  onGenerate?: (prompt: string, settings: { aspectRatio: string; resolution: '1080p' | '720p'; veoModel: 'fast' | 'quality'; count: number }) => Promise<void>;
  isGenerating?: boolean;
}

const StatusStepper: React.FC<{ status: string; uiStrings: any }> = ({ status, uiStrings }) => {
    const stages = ['Init', 'Processing', 'Fetching'];
    const currentStageIndex = stages.findIndex(s => {
        if (status === 'Polling') return s === 'Processing';
        return s === status;
    });
    const isComplete = status === 'Complete';
    const isError = status === 'Error';
    const isQueued = status === 'Queued' || status === 'Pending';

    if (isQueued) {
        return (
            <div className="flex flex-col items-center justify-center space-y-3 w-full h-full p-4 animate-pulse">
                <div className="p-3 bg-slate-800/50 rounded-full">
                    <Icon name="clock" className="w-6 h-6 text-yellow-400" />
                </div>
                <span className="text-sm text-yellow-200 font-light tracking-wide text-center">
                    {uiStrings.videoStudio.queueStatus || "Pending Execution..."}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-3 w-full h-full p-4">
            {isError ? (
                <div className="text-red-400 flex flex-col items-center animate-pulse">
                    <Icon name="cancel" className="w-8 h-8 mb-2" />
                    <p className="font-semibold text-xs text-center">Generation Failed</p>
                </div>
            ) : isComplete ? (
                <div className="text-green-400 flex flex-col items-center">
                    <Icon name="check" className="w-8 h-8 mb-2" />
                    <p className="font-semibold text-xs">Complete</p>
                </div>
            ) : (
                <>
                    <div className="flex items-center space-x-2">
                        <Icon name="spinner" className="w-6 h-6 text-cyan-400 animate-spin" />
                        <span className="text-sm text-slate-200 font-light tracking-wide text-center">
                            {uiStrings.videoStudio[`videoStatus${status}`] || "Working..."}
                        </span>
                    </div>
                    <div className="flex space-x-1.5 mt-2">
                        {stages.map((stage, i) => {
                            const isActive = i === currentStageIndex || (status === 'Polling' && stage === 'Processing');
                            const isDone = i < currentStageIndex || isComplete;
                            return (
                                <div key={stage} className={`w-2 h-2 rounded-full transition-all duration-500 ${isDone ? 'bg-cyan-500' : isActive ? 'bg-cyan-500/50 animate-pulse' : 'bg-slate-700'}`} />
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

const VideoGenerationStudio: React.FC<VideoGenerationStudioProps> = ({ 
    onClose, uiStrings, addToast, language, initialPrompt = '', initialSettings,
    tasks: externalTasks, onGenerate: externalOnGenerate, isGenerating: externalIsGenerating
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState(initialSettings?.aspectRatio || '16:9');
  
  // Safe resolution initialization
  const [resolution, setResolution] = useState(() => {
      const r = initialSettings?.resolution;
      return (r === '1080p' || r === '720p') ? r : '1080p';
  });
  
  const [veoModel, setVeoModel] = useState(initialSettings?.veoModel || 'fast');
  const [variationCount, setVariationCount] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'results' | 'queue'>('results');
  
  // Internal state fallback
  const [internalTasks, setInternalTasks] = useState<GenerationTask[]>([]);
  const isMounted = useRef(true);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const tasks = externalTasks || internalTasks;
  const isGenerating = externalIsGenerating !== undefined 
      ? externalIsGenerating 
      : internalTasks.some(t => ['Init', 'Processing', 'Polling', 'Fetching', 'Pending'].includes(t.status));

  // Filter tasks based on tabs
  const queuedTasks = tasks.filter(t => t.status === 'Queued' || t.status === 'Pending');
  const activeOrDoneTasks = tasks.filter(t => t.status !== 'Queued' && t.status !== 'Pending');
  
  const displayTasks = activeTab === 'queue' ? queuedTasks : activeOrDoneTasks;

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Auto-switch tabs if queue gets items or empties
  useEffect(() => {
      if (queuedTasks.length > 0 && activeOrDoneTasks.length === 0) {
          setActiveTab('queue');
      } else if (queuedTasks.length === 0 && activeOrDoneTasks.length > 0) {
          setActiveTab('results');
      }
  }, [queuedTasks.length, activeOrDoneTasks.length]);

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
  const variationOptions = [
      { value: '1', label: '1 Variation' },
      { value: '2', label: '2 Variations' },
      { value: '4', label: '4 Variations' },
  ];

  // --- Internal Generation Logic (Legacy Fallback) ---
  const updateInternalTask = (id: string, updates: Partial<GenerationTask>) => {
      if (!isMounted.current) return;
      setInternalTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const runInternalGenerationTask = async (taskId: string) => {
    // ... Legacy implementation for fallback if no external hook ...
    // Keeping this minimal as we primarily use the hook now.
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            setIsApiKeyModalOpen(true);
            return;
        }
    }

    addToast(uiStrings.videoStatusProcessing || "Generation started...", 'info');

    if (externalOnGenerate) {
        await externalOnGenerate(prompt, { 
            aspectRatio, 
            resolution: resolution as '1080p' | '720p', 
            veoModel: veoModel as 'fast' | 'quality',
            count: variationCount 
        });
        setActiveTab('results'); // Switch to results to see the init status
    }
  };

  const handleSelectKeyAndRetry = async () => {
    if (typeof (window as any).aistudio?.openSelectKey !== 'function') return;

    await (window as any).aistudio.openSelectKey();
    setIsApiKeyModalOpen(false);
  };

  const handleDownload = (url: string | null) => {
      if (!url) return;
      const link = document.createElement('a');
      link.href = url;
      link.download = `veo-generated-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const clearPrompt = () => setPrompt('');
  
  const gridCols = displayTasks.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';

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
                <div className="grid grid-cols-2 gap-4">
                    <SelectInput
                        label={uiStrings.labelVeoModel}
                        name="veoModel"
                        options={veoModelOptions}
                        value={veoModel}
                        onChange={(e) => setVeoModel(e.target.value)}
                        info={uiStrings.tooltips.videoStudioModel}
                        disabled={isGenerating}
                    />
                    <SelectInput
                        label="Variations"
                        name="variationCount"
                        options={variationOptions}
                        value={variationCount.toString()}
                        onChange={(e) => setVariationCount(parseInt(e.target.value))}
                        info="Generate multiple variations to explore different interpretations."
                        disabled={isGenerating}
                    />
                </div>
            </div>

             <Button 
                onClick={handleGenerate} 
                isLoading={isGenerating} 
                disabled={isGenerating || !prompt}
            >
                {isGenerating ? `Generating ${tasks.length > 1 ? 'Variations' : 'Video'}...` : (variationCount > 1 ? `Generate ${variationCount} Variations` : uiStrings.videoStudio.generateButton)}
            </Button>
          </div>

          <div className="lg:col-span-3 flex flex-col h-full min-h-[400px]">
            {/* Tabs */}
            <div className="flex space-x-1 mb-4 bg-slate-800/50 p-1 rounded-lg self-start">
                <button
                    onClick={() => setActiveTab('results')}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        activeTab === 'results' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    {uiStrings.videoStudio.resultsTab} ({activeOrDoneTasks.length})
                </button>
                <button
                    onClick={() => setActiveTab('queue')}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        activeTab === 'queue' ? 'bg-yellow-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                >
                    {uiStrings.videoStudio.queueTab} ({queuedTasks.length})
                </button>
            </div>

            {displayTasks.length === 0 ? (
                <div className="flex-grow bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden shadow-inner p-8">
                    <div className="text-center text-slate-600 flex flex-col items-center">
                        <Icon name={activeTab === 'queue' ? 'clock' : 'film'} className="w-24 h-24 mb-4 opacity-30" />
                        <p className="text-lg font-medium">{activeTab === 'queue' ? "Queue is empty" : uiStrings.videoStudio.placeholderText}</p>
                        {activeTab === 'results' && <p className="text-sm mt-2 opacity-60">Configure your settings and click generate to start.</p>}
                    </div>
                </div>
            ) : (
                <div className={`grid ${gridCols} gap-4 h-full overflow-y-auto pr-2`}>
                    {displayTasks.map((task, index) => (
                        <div key={task.id} className="flex flex-col bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden shadow-inner min-h-[250px] relative group">
                            <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono text-slate-300 pointer-events-none">
                                #{task.id.slice(-4)}
                            </div>

                            <div className="flex-grow relative flex items-center justify-center">
                                {task.videoUrl ? (
                                    <video src={task.videoUrl} controls autoPlay={displayTasks.length === 1} loop className="w-full h-full object-contain" />
                                ) : (
                                    <StatusStepper status={task.status} uiStrings={uiStrings} />
                                )}
                            </div>
                            
                            {/* Prompt overlay for queued items */}
                            {activeTab === 'queue' && task.prompt && (
                                <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-xs text-slate-400 line-clamp-2">
                                    {task.prompt}
                                </div>
                            )}
                            
                            {task.videoUrl && (
                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                    <button
                                        onClick={() => handleDownload(task.videoUrl)}
                                        className="p-2 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg transition-transform hover:scale-105"
                                        title={uiStrings.videoStudio.downloadButton}
                                    >
                                        <Icon name="download" className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
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
