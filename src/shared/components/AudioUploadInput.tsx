/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useRef, useCallback, useState, useId } from 'react';
import Icon from '@shared/components/ui/Icon';
import Tooltip from '@shared/components/ui/Tooltip';
import { Asset } from '@core/types';
import { logger } from '@core/services/loggerService';

interface AudioUploadInputProps {
  onAudioSelect: (audio: { data: string; mimeType: string; name: string }) => void;
  onAudioClear: () => void;
  onAnalyze: () => void;
  uploadedAudioName: string | null;
  isAnalyzing: boolean;
  label: string;
  placeholder: string;
  info?: string;
  analyzeButtonText: string;
}

const AudioUploadInput: React.FC<AudioUploadInputProps> = ({
  onAudioSelect,
  onAudioClear,
  onAnalyze,
  uploadedAudioName,
  isAnalyzing,
  label,
  placeholder,
  info,
  analyzeButtonText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const inputId = useId();
  const messageId = `${inputId}-message`;

  const validateAudioFile = useCallback((file: File): string | null => {
    const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/mpeg'];
    if (!allowedTypes.includes(file.type)) {
      return 'Unsupported file type. Use MP3 or WAV audio files.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'Audio file is too large. Maximum size is 10MB.';
    }
    return null;
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      if (file) {
        const validationError = validateAudioFile(file);
        if (validationError) {
          setValidationMessage(validationError);
          return;
        }

        setValidationMessage(null);
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          if (url) {
            const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
            const data = url.substring(url.indexOf(',') + 1);
            onAudioSelect({ data, mimeType, name: file.name });
          }
        };
        reader.onerror = () => {
          logger.error('Error reading file');
        };
        reader.readAsDataURL(file);
      }
    },
    [onAudioSelect, validateAudioFile],
  );

  const handleUploadClick = () => {
    if (uploadedAudioName) return;
    fileInputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAudioClear();
    setValidationMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // 1. Check for Internal Asset Drop
    const assetJson = e.dataTransfer.getData('application/veo-asset');
    if (assetJson) {
      try {
        const asset: Asset = JSON.parse(assetJson);
        if (asset.type === 'audio') {
          onAudioSelect({
            data: asset.data,
            mimeType: asset.mimeType,
            name: asset.name,
          });
          return;
        }
      } catch (err) {
        logger.error('Failed to parse dropped asset', err);
      }
    }

    // 2. Check for File Drop
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validationError = validateAudioFile(droppedFile);
      if (validationError) {
        setValidationMessage(validationError);
        return;
      }

      const fakeEvent = {
        currentTarget: { files: e.dataTransfer.files },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label
          htmlFor={inputId}
          className="flex items-center space-x-2 text-sm font-medium text-slate-200"
        >
          <span>{label}</span>
          {info && <Tooltip text={info} />}
        </label>
      </div>
      <input
        ref={fileInputRef}
        id={inputId}
        name={inputId}
        type="file"
        className="sr-only"
        onChange={handleFileChange}
        accept="audio/mp3, audio/wav, audio/mpeg"
        aria-label={label}
      />
      {uploadedAudioName ? (
        <div
          className={`mt-2 flex justify-center items-center rounded-lg border border-dashed p-6 transition-colors relative ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-900/20 shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]'
              : 'border-slate-700 bg-slate-800/40'
          }`}
        >
          <div className="flex flex-col items-center w-full">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-full">
                <Icon name="audio" className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-sm text-slate-200 font-medium truncate max-w-[200px]">
                {uploadedAudioName}
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 bg-slate-700 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-600 transition-colors"
                aria-label="Clear audio"
              >
                <Icon name="cancel" className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="flex items-center px-4 py-2 text-xs font-medium rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <Icon name="spinner" className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Icon name="magic" className="w-4 h-4 mr-2" />
              )}
              {isAnalyzing ? 'Analyzing...' : analyzeButtonText}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleUploadClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleUploadClick();
            }
          }}
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="Upload audio"
          aria-describedby={messageId}
          className={`mt-2 flex justify-center items-center rounded-lg border border-dashed p-6 transition-colors cursor-pointer relative ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-900/20 shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]'
              : 'border-slate-700 bg-slate-800/40 hover:border-cyan-500/50'
          }`}
        >
          <div className="text-center pointer-events-none">
            <Icon
              name="upload"
              className={`mx-auto h-8 w-8 mb-2 transition-colors ${isDragOver ? 'text-cyan-400' : 'text-slate-500'}`}
            />
            <p className={`text-sm ${isDragOver ? 'text-cyan-200' : 'text-slate-300'}`}>
              {isDragOver ? 'Drop Audio Here' : placeholder}
            </p>
            <p className="text-xs text-slate-500">MP3, WAV (Max 10MB)</p>
          </div>
        </div>
      )}
      <p id={messageId} className="mt-1.5 text-xs text-slate-500" aria-live="polite" role="status">
        {validationMessage ?? 'MP3, WAV (Max 10MB)'}
      </p>
    </div>
  );
};

export default AudioUploadInput;
