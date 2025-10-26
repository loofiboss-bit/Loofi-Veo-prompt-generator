
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { ToastMessage } from '../types';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import Button from './Button';

interface VideoAnalysisStudioProps {
  onClose: () => void;
  uiStrings: any;
  addToast: (message: string, type: ToastMessage['type']) => void;
  onUseAnalysis: (text: string) => void;
}

// Helper to read file as Base64
const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string; url: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
      const data = result.substring(result.indexOf(',') + 1);
      resolve({ data, mimeType, url: result });
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

const VideoAnalysisStudio: React.FC<VideoAnalysisStudioProps> = ({ onClose, uiStrings, addToast, onUseAnalysis }) => {
  const [prompt, setPrompt] = useState('Summarize this video in detail. Describe the environment, subjects, actions, and overall mood to inspire a new video prompt.');
  const [videoFile, setVideoFile] = useState<{ data: string; mimeType: string; url: string } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Limit file size to ~20MB for practical API use
      if (file.size > 20 * 1024 * 1024) {
        addToast(uiStrings.errorVideoFileSize, 'error');
        return;
      }
      try {
        const videoData = await fileToBase64(file);
        setVideoFile(videoData);
        setAnalysisResult(null); // Clear previous result
      } catch (error) {
        addToast(uiStrings.errorFileUpload, 'error');
      }
    }
  }, [addToast, uiStrings]);

  const handleAnalyze = async () => {
    if (!prompt || !videoFile) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await geminiService.analyzeVideo(videoFile.data, videoFile.mimeType, prompt);
      setAnalysisResult(result);
      addToast(uiStrings.toastVideoAnalyzed, 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, uiStrings), 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleUseResult = () => {
    if (analysisResult) {
        onUseAnalysis(analysisResult);
        onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog" aria-modal="true" aria-labelledby="video-analysis-title"
    >
      <div
        className="bg-slate-900/70 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="video-analysis-title" className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Icon name="video-analysis" className="w-6 h-6 text-cyan-400" />
            {uiStrings.title}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" aria-label="Close Video Analysis Studio">
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-grow p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Upload & Preview */}
          <div className="flex flex-col space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{uiStrings.uploadLabel}</label>
                <div className="mt-2 flex justify-center rounded-lg border border-dashed border-slate-700 p-6 bg-slate-800/40 hover:border-cyan-500/50 transition-colors">
                    <div className="text-center">
                        <Icon name="upload" className="mx-auto h-12 w-12 text-slate-500" />
                        <label htmlFor="video-upload" className="relative cursor-pointer rounded-md font-semibold text-cyan-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-500 hover:text-cyan-300">
                            <span>{uiStrings.uploadButton}</span>
                            <input id="video-upload" name="video-upload" type="file" className="sr-only" onChange={handleFileChange} ref={fileInputRef} accept="video/mp4,video/quicktime,video/webm" />
                        </label>
                        <p className="text-xs leading-5 text-slate-500">{uiStrings.uploadHint}</p>
                    </div>
                </div>
            </div>
            {videoFile && (
                <div className="bg-black rounded-lg overflow-hidden">
                    <video src={videoFile.url} controls muted loop className="w-full h-auto">
                        Your browser does not support the video tag.
                    </video>
                </div>
            )}
          </div>
          
          {/* Right Column: Prompt & Results */}
          <div className="flex flex-col space-y-4">
             <TextAreaInput
              label={uiStrings.promptLabel}
              name="videoAnalysisPrompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={uiStrings.promptPlaceholder}
              rows={4}
            />
            <Button onClick={handleAnalyze} isLoading={isAnalyzing} disabled={isAnalyzing || !videoFile}>
                {isAnalyzing ? uiStrings.analyzingButton : uiStrings.analyzeButton}
            </Button>
            
            <div className="flex-grow bg-slate-800/40 rounded-lg border border-slate-700 p-4 overflow-y-auto min-h-[200px]">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">{uiStrings.resultsTitle}</h3>
                {analysisResult ? (
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{analysisResult}</p>
                ) : (
                    <p className="text-sm text-slate-500 italic">{uiStrings.resultsPlaceholder}</p>
                )}
            </div>
            <Button onClick={handleUseResult} disabled={!analysisResult}>
                {uiStrings.useResultButton}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoAnalysisStudio;
