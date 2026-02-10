
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { SelectOption, ToastMessage } from '@core/types';
import { CHARACTER_LIMITS } from '@core/constants';
import Icon from '@shared/components/ui/Icon';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import SelectInput from '@shared/components/ui/SelectInput';
import Button from '@shared/components/ui/Button';
import Tooltip from '@shared/components/ui/Tooltip';
import RangeInput from '@shared/components/ui/RangeInput';
import CollapsibleSection from '@shared/components/ui/CollapsibleSection';
import { IconName } from '@core/types';

interface ImageStudioProps {
  onClose: () => void;
  aspectRatioOptions: SelectOption[];
  uiStrings: any; // Using `any` for simplicity, could be typed more strictly
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const ASPECT_RATIOS: { value: string, label: string, icon: IconName, width: string, height: string }[] = [
    { value: '1:1', label: 'Square', icon: 'square', width: 'w-8', height: 'h-8' },
    { value: '16:9', label: 'Landscape', icon: 'video', width: 'w-10', height: 'h-6' },
    { value: '9:16', label: 'Portrait', icon: 'smartphone', width: 'w-6', height: 'h-10' },
    { value: '4:3', label: 'Standard', icon: 'image', width: 'w-9', height: 'h-7' },
    { value: '3:4', label: 'Vertical', icon: 'smartphone', width: 'w-7', height: 'h-9' }
];

const STYLES = [
    'None', 'Cinematic', 'Photorealistic', 'Anime', 'Oil Painting', 
    'Cyberpunk', 'Watercolor', 'Sketch', '3D Render', 'Vintage'
];

const ImageStudio: React.FC<ImageStudioProps> = ({ onClose, aspectRatioOptions, uiStrings, addToast }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [baseImage, setBaseImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Advanced Controls
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('None');
  const [styleStrength, setStyleStrength] = useState(50);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        if (url) {
          const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
          const data = url.substring(url.indexOf(',') + 1);
          setBaseImage({ data, mimeType, url });
          setGeneratedImage(null); // Clear previous generation when a new base is set
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
    try {
      let resultUrl: string;
      
      const options = {
          aspectRatio,
          negativePrompt,
          style: stylePreset,
          styleStrength
      };

      if (baseImage) {
        // Construct edit prompt including negative constraint if present
        let editInstruction = prompt;
        if (negativePrompt) {
            editInstruction += ` Exclude: ${negativePrompt}.`;
        }
        const result = await geminiService.editImageWithGemini(baseImage.data, baseImage.mimeType, editInstruction);
        resultUrl = `data:${result.newMimeType};base64,${result.newImageBytes}`;
      } else {
        resultUrl = await geminiService.generateConceptArt(prompt, options);
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
    link.download = `image-studio-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearImage = () => {
    setBaseImage(null);
    setGeneratedImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  const placeholderText = baseImage
    ? uiStrings.promptPlaceholderEdit
    : uiStrings.promptPlaceholderGenerate;
    
  const buttonText = baseImage ? uiStrings.imageStudio.editButton : uiStrings.generateButton;
  const loadingButtonText = baseImage ? uiStrings.imageStudio.editingButton : uiStrings.generatingButton;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog" aria-modal="true" aria-labelledby="image-studio-title"
    >
      <div
        className="bg-slate-900/70 backdrop-blur-xl w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]"
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

        <div className="flex-grow p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Controls */}
          <div className="flex flex-col space-y-6">
            <TextAreaInput
              label={uiStrings.promptLabel}
              name="imagePrompt"
              value={prompt}
              onChange={(e) => setPrompt(e.currentTarget.value)}
              placeholder={placeholderText}
              rows={4}
              maxLength={CHARACTER_LIMITS.imageStudioPrompt}
              info={uiStrings.tooltips.imageStudioPrompt}
              disabled={isGenerating}
            />
            
            {/* Visual Aspect Ratio Selector */}
            <div className={`transition-opacity ${!!baseImage ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-sm font-medium text-slate-300 mb-3">{uiStrings.imageStudio.aspectRatioLabel}</label>
                <div className="grid grid-cols-5 gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                        <button
                            key={ratio.value}
                            onClick={() => setAspectRatio(ratio.value)}
                            disabled={!!baseImage || isGenerating}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                                aspectRatio === ratio.value 
                                    ? 'bg-slate-700/50 border-cyan-500 shadow-md' 
                                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                            }`}
                            title={ratio.label}
                        >
                            <div className={`${ratio.width} ${ratio.height} border-2 rounded-sm mb-1 ${aspectRatio === ratio.value ? 'border-cyan-400 bg-cyan-400/20' : 'border-slate-500'}`} />
                            <span className={`text-[10px] ${aspectRatio === ratio.value ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>{ratio.value}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="border border-slate-700 rounded-xl bg-slate-900/30 overflow-hidden">
                <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex justify-between items-center p-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
                >
                    <span className="flex items-center gap-2"><Icon name="sliders" className="w-4 h-4 text-cyan-500" /> {uiStrings.imageStudio.advancedSettings}</span>
                    <Icon name="chevron-down" className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </button>
                
                {showAdvanced && (
                    <div className="p-4 space-y-4 border-t border-slate-700/50 animate-fade-in-up">
                        <TextAreaInput
                            label={uiStrings.imageStudio.negativePromptLabel}
                            name="negativePrompt"
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.currentTarget.value)}
                            placeholder={uiStrings.imageStudio.negativePromptPlaceholder}
                            rows={2}
                            disabled={isGenerating}
                        />
                        
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!!baseImage ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">{uiStrings.imageStudio.styleLabel}</label>
                                <select
                                    value={stylePreset}
                                    onChange={(e) => setStylePreset(e.currentTarget.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-sm text-slate-200 focus:ring-cyan-500 focus:border-cyan-500"
                                    disabled={!!baseImage || isGenerating}
                                >
                                    {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <RangeInput
                                    label={uiStrings.imageStudio.styleStrengthLabel}
                                    name="styleStrength"
                                    value={styleStrength}
                                    onChange={(e) => setStyleStrength(parseInt(e.currentTarget.value))}
                                    min={0}
                                    max={100}
                                    disabled={stylePreset === 'None' || !!baseImage || isGenerating}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

             <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300 mb-2">
                    <span>{uiStrings.uploadLabel}</span>
                    <Tooltip text={uiStrings.tooltips.imageUpload} />
                </label>
                <div className={`mt-2 flex justify-center rounded-lg border border-dashed border-slate-700 px-6 py-8 bg-slate-800/40 transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan-500/50'}`}>
                <div className="text-center">
                    <Icon name="upload" className="mx-auto h-8 w-8 text-slate-500" />
                    <div className="mt-2 flex flex-col items-center text-sm leading-6 text-slate-400">
                        <label
                            htmlFor="file-upload"
                            className={`relative rounded-md font-semibold text-cyan-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 ${!isGenerating ? 'cursor-pointer hover:text-cyan-300' : 'cursor-not-allowed'}`}
                        >
                            <span>Upload a file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} ref={fileInputRef} accept="image/png, image/jpeg, image/webp" disabled={isGenerating} />
                        </label>
                        <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                    </div>
                </div>
                </div>
            </div>
             <Button onClick={handleGenerate} isLoading={isGenerating} disabled={isGenerating || !prompt}>
                {isGenerating ? loadingButtonText : buttonText}
            </Button>
          </div>

          {/* Right Column: Canvas */}
          <div className="flex flex-col h-full">
            <div className="flex-grow bg-slate-950/50 rounded-xl border border-slate-700 flex items-center justify-center p-4 relative min-h-[400px] shadow-inner">
                {isGenerating && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl animate-pulse">
                        <Icon name="spinner" className="w-12 h-12 text-cyan-400 animate-spin" />
                        <p className="mt-4 text-cyan-300 font-medium tracking-wide">
                            {baseImage ? "Processing Image..." : "Generating Art..."}
                        </p>
                    </div>
                )}
                
                {generatedImage ? (
                     <img src={generatedImage} alt="Generated art" className="max-w-full max-h-full object-contain rounded-lg shadow-xl" />
                ) : baseImage ? (
                    <img src={baseImage.url} alt="Uploaded preview" className="max-w-full max-h-full object-contain rounded-lg opacity-80" />
                ) : (
                    <div className="text-center text-slate-600">
                        <Icon name="palette" className="w-20 h-20 mx-auto opacity-20 mb-4" />
                        <p className="text-sm font-medium">{uiStrings.imageStudio.canvasPlaceholder}</p>
                    </div>
                )}
            </div>
            <div className="flex-shrink-0 mt-4 flex items-center justify-between">
                 {baseImage ? (
                    <button onClick={handleClearImage} disabled={isGenerating} className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 flex items-center gap-2">
                        <Icon name="trash" className="w-4 h-4" /> Clear Upload
                    </button>
                 ) : <div></div>}
                
                <button
                    onClick={handleDownload}
                    disabled={!generatedImage || isGenerating}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-900/20"
                >
                    <Icon name="download" className="w-4 h-4" />
                    <span>{uiStrings.imageStudio.downloadButton}</span>
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageStudio;
