/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { ToastMessage } from '@core/types';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/ui/Icon';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import Button from '@shared/components/ui/Button';
import Tooltip from '@shared/components/ui/Tooltip';

interface VideoAnalysisStudioProps {
  onClose: () => void;
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
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const VideoAnalysisStudio: React.FC<VideoAnalysisStudioProps> = ({
  onClose,
  addToast,
  onUseAnalysis,
}) => {
  const { t, i18n } = useTranslation(['studios', 'errors', 'toasts', 'tooltips']);
  const [prompt, setPrompt] = useState(
    'Summarize this video in detail. Describe the environment, subjects, actions, and overall mood to inspire a new video prompt.',
  );
  const [videoFile, setVideoFile] = useState<{
    data: string;
    mimeType: string;
    url: string;
  } | null>(null);
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

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      if (file) {
        // Limit file size to ~20MB for practical API use
        if (file.size > 20 * 1024 * 1024) {
          addToast(t('errors:errorVideoFileSize'), 'error');
          return;
        }
        try {
          const videoData = await fileToBase64(file);
          setVideoFile(videoData);
          setAnalysisResult(null); // Clear previous result
        } catch (_error) {
          addToast(t('errors:errorFileUpload'), 'error');
        }
      }
    },
    [addToast, t],
  );

  const handleAnalyze = async () => {
    if (!prompt || !videoFile) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await geminiService.analyzeVideo(videoFile.data, videoFile.mimeType, prompt);
      setAnalysisResult(result);
      addToast(t('toasts:toastVideoAnalyzed'), 'success');
    } catch (error) {
      addToast(
        getApiErrorMessage(error, i18n.getResourceBundle(i18n.language, 'errors') || {}),
        'error',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUseResult = () => {
    if (analysisResult) {
      onUseAnalysis(analysisResult);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-analysis-studio-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="relative bg-slate-900/70 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]">
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2
            id="video-analysis-studio-title"
            className="text-lg font-semibold text-slate-100 flex items-center gap-2"
          >
            <Icon name="video-analysis" className="w-6 h-6 text-cyan-400" />
            {t('studios:videoAnalysisStudio.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close Video Analysis Studio"
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-grow p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Controls & Video */}
          <div className="flex flex-col space-y-4">
            <div>
              <div className="flex items-center space-x-2 text-sm font-medium text-slate-300 mb-2">
                <span>{t('studios:videoAnalysisStudio.uploadLabel')}</span>
                <Tooltip text={t('tooltips:videoAnalysisUpload')} />
              </div>
              <div
                className={`mt-2 flex justify-center items-center rounded-lg border border-dashed border-slate-700 p-6 bg-slate-800/40 transition-colors relative aspect-video ${!videoFile ? 'hover:border-cyan-500/50' : ''}`}
              >
                {videoFile ? (
                  <video
                    src={videoFile.url}
                    controls
                    className="max-w-full max-h-full object-contain rounded-md"
                  />
                ) : (
                  <div className="text-center">
                    <Icon name="upload" className="mx-auto h-12 w-12 text-slate-500" />
                    <div className="mt-4 flex flex-col items-center text-sm leading-6 text-slate-400">
                      <label
                        htmlFor="video-upload"
                        className={`relative rounded-md font-semibold text-cyan-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 ${isAnalyzing ? 'cursor-not-allowed' : 'cursor-pointer hover:text-cyan-300'}`}
                      >
                        <span>{t('studios:videoAnalysisStudio.uploadButton')}</span>
                        <input
                          id="video-upload"
                          name="video-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          ref={fileInputRef}
                          accept="video/mp4,video/quicktime,video/webm"
                          disabled={isAnalyzing}
                        />
                      </label>
                    </div>
                    <p className="text-xs leading-5 text-slate-400">
                      {t('studios:videoAnalysisStudio.uploadHint')}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <TextAreaInput
              label={t('studios:videoAnalysisStudio.promptLabel')}
              name="analysisPrompt"
              value={prompt}
              onChange={(e) => setPrompt(e.currentTarget.value)}
              placeholder={t('studios:videoAnalysisStudio.promptPlaceholder')}
              rows={4}
              info={t('tooltips:videoAnalysisPrompt')}
              disabled={isAnalyzing}
            />
            <Button
              onClick={handleAnalyze}
              isLoading={isAnalyzing}
              disabled={isAnalyzing || !prompt || !videoFile}
            >
              {isAnalyzing
                ? t('studios:videoAnalysisStudio.analyzingButton')
                : t('studios:videoAnalysisStudio.analyzeButton')}
            </Button>
          </div>

          {/* Right Column: Results */}
          <div className="flex flex-col">
            <h3 className="text-md font-semibold text-slate-300 mb-2">
              {t('studios:videoAnalysisStudio.resultsTitle')}
            </h3>
            <div className="flex-grow bg-slate-800/40 rounded-lg border border-slate-700 p-4 overflow-y-auto">
              {isAnalyzing ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                  <div className="h-4 bg-slate-700 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                </div>
              ) : analysisResult ? (
                <p className="text-sm text-slate-300 whitespace-pre-wrap animate-text-fade-in">
                  {analysisResult}
                </p>
              ) : (
                <div className="text-center text-slate-500 h-full flex flex-col items-center justify-center">
                  <Icon name="activity" className="w-12 h-12 opacity-20 mb-2" />
                  <p>{t('studios:videoAnalysisStudio.resultsPlaceholder')}</p>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 mt-2 flex items-center justify-end">
              <button
                onClick={handleUseResult}
                disabled={!analysisResult || isAnalyzing}
                className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white bg-cyan-600 hover:bg-cyan-500"
              >
                <Icon name="plus" className="w-4 h-4" />
                <span>{t('studios:videoAnalysisStudio.useResultButton')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoAnalysisStudio;
