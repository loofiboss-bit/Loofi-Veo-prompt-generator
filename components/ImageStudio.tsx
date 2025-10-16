import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { SelectOption, ToastMessage } from '../types';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
import Button from './Button';

interface ImageStudioProps {
  onClose: () => void;
  aspectRatioOptions: SelectOption[];
  uiStrings: any; // Using `any` for simplicity, could be typed more strictly
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const ImageStudio: React.FC<ImageStudioProps> = ({ onClose, aspectRatioOptions, uiStrings, addToast }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [baseImage, setBaseImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        if (url) {
          const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
          const data = url.substring(url.indexOf(',') + 1);
          setBaseImage({ data, mimeType, url });
        }
      };
      reader.onerror = () => {
        addToast(uiStrings.errorFileUpload, 'error');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      let resultUrl: string;
      if (baseImage) {
        const result = await geminiService.editImageWithGemini(baseImage.data, baseImage.mimeType, prompt);
        resultUrl = `data:${result.newMimeType};base64,${result.newImageBytes}`;
      } else {
        resultUrl = await geminiService.generateConceptArt(prompt, aspectRatio);
      }
      setGeneratedImage(resultUrl);
      addToast(uiStrings.toastImageGenerated, 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, uiStrings), 'error');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'generated-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearImage = () => {
    setBaseImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog" aria-modal="true" aria-labelledby="image-studio-title"
    >
      <div
        className="bg-slate-900/70 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="image-studio-title" className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Icon name="image" className="w-6 h-6 text-cyan-400" />
            {uiStrings.title}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" aria-label="Close Image Studio">
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-grow p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Controls */}
          <div className="flex flex-col space-y-4">
            <TextAreaInput
              label={uiStrings.promptLabel}
              name="imagePrompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={uiStrings.promptPlaceholder}
              rows={4}
            />
            <SelectInput
              label={uiStrings.labelAspectRatio}
              name="aspectRatio"
              options={aspectRatioOptions}
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              disabled={!!baseImage}
            />
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{uiStrings.uploadLabel}</label>
                <div className="mt-2 flex justify-center rounded-lg border border-dashed border-slate-700 px-6 py-10 bg-slate-800/40">
                <div className="text-center">
                    <Icon name="upload" className="mx-auto h-12 w-12 text-slate-500" />
                    <div className="mt-4 flex flex-col sm:flex-row items-center text-center sm:text-left text-sm leading-6 text-slate-400">
                    <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-semibold text-cyan-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 hover:text-cyan-300"
                    >
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} ref={fileInputRef} accept="image/png, image/jpeg, image/webp" />
                    </label>
                    <p className="pl-0 sm:pl-1 mt-1 sm:mt-0">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-slate-500">PNG, JPG, WEBP up to 10MB</p>
                </div>
                </div>
            </div>
             <Button onClick={handleGenerate} isLoading={isGenerating} disabled={isGenerating || !prompt}>
                {isGenerating ? uiStrings.generatingButton : uiStrings.generateButton}
            </Button>
          </div>

          {/* Right Column: Canvas */}
          <div className="flex flex-col">
            <div className="flex-grow bg-slate-800/40 rounded-lg border border-slate-700 flex items-center justify-center p-2 relative aspect-square">
                {generatedImage ? (
                     <img src={generatedImage} alt="Generated art" className="max-w-full max-h-full object-contain rounded-md" />
                ) : baseImage ? (
                    <img src={baseImage.url} alt="Uploaded preview" className="max-w-full max-h-full object-contain rounded-md" />
                ) : (
                    <div className="text-center text-slate-500">
                        <Icon name="palette" className="w-16 h-16 mx-auto" />
                        <p className="mt-2">{uiStrings.canvasPlaceholder}</p>
                    </div>
                )}
            </div>
            <div className="flex-shrink-0 mt-2 flex items-center justify-end space-x-2">
                 {baseImage && (
                    <button onClick={handleClearImage} className="text-sm text-slate-400 hover:text-white transition-colors">
                        {uiStrings.clearButton}
                    </button>
                 )}
                <button
                    onClick={handleDownload}
                    disabled={!generatedImage}
                    className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 bg-slate-700/60 hover:bg-slate-700"
                >
                    <Icon name="download" className="w-4 h-4" />
                    <span>{uiStrings.downloadButton}</span>
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageStudio;
