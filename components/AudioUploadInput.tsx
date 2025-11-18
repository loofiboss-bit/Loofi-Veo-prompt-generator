
import React, { useRef, useCallback } from 'react';
import Icon from './Icon';
import Tooltip from './Tooltip';

interface AudioUploadInputProps {
  onAudioSelect: (audio: { data: string; mimeType: string; name: string; }) => void;
  onAudioClear: () => void;
  onAnalyze: () => void;
  uploadedAudioName: string | null;
  isAnalyzing: boolean;
  label: string;
  placeholder: string;
  info?: string;
  analyzeButtonText: string;
}

const AudioUploadInput: React.FC<AudioUploadInputProps> = ({ onAudioSelect, onAudioClear, onAnalyze, uploadedAudioName, isAnalyzing, label, placeholder, info, analyzeButtonText }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
        console.error("Error reading file");
      };
      reader.readAsDataURL(file);
    }
  }, [onAudioSelect]);

  const handleUploadClick = () => {
    if (uploadedAudioName) return;
    fileInputRef.current?.click();
  };
  
  const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onAudioClear();
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                <span>{label}</span>
                {info && <Tooltip text={info} />}
            </label>
        </div>
        <div
            onClick={handleUploadClick}
            className="mt-2 flex justify-center items-center rounded-lg border border-dashed border-slate-700 p-6 bg-slate-800/40 hover:border-cyan-500/50 transition-colors cursor-pointer relative"
        >
            <input
            ref={fileInputRef}
            id="audio-upload"
            name="audio-upload"
            type="file"
            className="sr-only"
            onChange={handleFileChange}
            accept="audio/mp3, audio/wav, audio/mpeg"
            />
            {uploadedAudioName ? (
                <div className="flex flex-col items-center w-full">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 bg-cyan-500/20 rounded-full">
                            <Icon name="audio" className="w-6 h-6 text-cyan-400" />
                        </div>
                        <span className="text-sm text-slate-200 font-medium truncate max-w-[200px]">{uploadedAudioName}</span>
                        <button
                            onClick={handleClear}
                            className="p-1.5 bg-slate-700 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-600 transition-colors"
                            aria-label="Clear audio"
                        >
                            <Icon name="cancel" className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
                        disabled={isAnalyzing}
                        className="flex items-center px-4 py-2 text-xs font-medium rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAnalyzing ? <Icon name="spinner" className="w-4 h-4 mr-2 animate-spin" /> : <Icon name="magic" className="w-4 h-4 mr-2" />}
                        {isAnalyzing ? "Analyzing..." : analyzeButtonText}
                    </button>
                </div>
            ) : (
                <div className="text-center pointer-events-none">
                    <Icon name="upload" className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                    <p className="text-sm text-slate-300">{placeholder}</p>
                    <p className="text-xs text-slate-500">MP3, WAV (Max 10MB)</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default AudioUploadInput;
