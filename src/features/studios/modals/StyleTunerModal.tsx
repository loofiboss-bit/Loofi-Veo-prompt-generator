import React, { useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import AppDialog from '@shared/components/ui/AppDialog';
import * as geminiService from '@core/services/geminiService';
import { PromptState } from '@core/types';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import { logger } from '@core/services/loggerService';

interface StyleTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, styleParams: Partial<PromptState>) => void;
}

interface StyleOption {
  id: number;
  prompt: string;
  imageUrl: string;
  loading: boolean;
}

const StyleTunerModal: React.FC<StyleTunerModalProps> = ({ isOpen, onClose, onSave }) => {
  const [step, setStep] = useState<'input' | 'generating' | 'selection' | 'analyzing' | 'success'>(
    'input',
  );
  const [seedIdea, setSeedIdea] = useState('');
  const [options, setOptions] = useState<StyleOption[]>([]);
  const [_selectedOption, setSelectedOption] = useState<StyleOption | null>(null);
  const [extractedDNA, setExtractedDNA] = useState<Partial<PromptState> | null>(null);
  const [dnaName, setDnaName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setSeedIdea('');
      setOptions([]);
      setSelectedOption(null);
      setExtractedDNA(null);
      setDnaName('');
    }
  }, [isOpen]);

  const handleGenerateOptions = async () => {
    if (!seedIdea.trim()) return;
    setStep('generating');

    try {
      // 1. Get Text Variations
      const variations = await geminiService.generateStyleVariations(seedIdea);

      // Initialize placeholders
      const initialOptions = variations.map((prompt, index) => ({
        id: index,
        prompt,
        imageUrl: '',
        loading: true,
      }));
      setOptions(initialOptions);
      setStep('selection');

      // 2. Generate Images in Parallel
      variations.forEach(async (prompt, index) => {
        try {
          const imageUrl = await geminiService.generateStyleThumbnail(prompt);
          setOptions((prev) =>
            prev.map((opt) => (opt.id === index ? { ...opt, imageUrl, loading: false } : opt)),
          );
        } catch (e) {
          logger.error('Failed to generate thumbnail', e);
          setOptions((prev) =>
            prev.map((opt) => (opt.id === index ? { ...opt, loading: false } : opt)),
          );
        }
      });
    } catch (e) {
      logger.error('Failed to generate variations', e);
      setStep('input'); // Reset on failure
    }
  };

  const handleSelect = async (option: StyleOption) => {
    setSelectedOption(option);
    setStep('analyzing');
    try {
      const dna = await geminiService.extractStyleDNA(option.prompt);
      setExtractedDNA(dna);
      setStep('success');
    } catch (e) {
      logger.error('Failed to extract DNA', e);
      setStep('selection');
    }
  };

  const handleFinalSave = () => {
    if (extractedDNA && dnaName) {
      onSave(dnaName, extractedDNA);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      layer="overlay"
      showCloseButton={false}
      bodyClassName="!p-0"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Icon name="magic" className="w-6 h-6 text-fuchsia-400" />
              Style Tuner
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Discover your aesthetic through visual selection.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow p-8 overflow-y-auto flex flex-col items-center justify-center">
          {/* STEP 1: INPUT */}
          {step === 'input' && (
            <div className="w-full max-w-lg space-y-6 text-center animate-fade-in-up">
              <Icon name="palette" className="w-16 h-16 mx-auto text-slate-700 mb-4" />
              <h3 className="text-2xl font-bold text-slate-200">What do you want to visualize?</h3>
              <p className="text-slate-400">
                Enter a simple subject. We&apos;ll generate different stylistic interpretations for
                you to choose from.
              </p>

              <TextAreaInput
                label=""
                name="seedIdea"
                value={seedIdea}
                onChange={(e) => setSeedIdea(e.target.value)}
                placeholder="e.g. A cyberpunk detective, A peaceful forest, A race car..."
                rows={2}
                autoFocus
              />

              <button
                onClick={handleGenerateOptions}
                disabled={!seedIdea.trim()}
                className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-fuchsia-900/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
              >
                Generate Variations
              </button>
            </div>
          )}

          {/* STEP 2: GENERATING (Loading) */}
          {step === 'generating' && (
            <div className="text-center space-y-4 animate-pulse">
              <Icon name="spinner" className="w-12 h-12 mx-auto text-fuchsia-400 animate-spin" />
              <p className="text-lg text-slate-300">Dreaming up styles...</p>
            </div>
          )}

          {/* STEP 3: SELECTION GRID */}
          {step === 'selection' && (
            <div className="w-full h-full flex flex-col">
              <h3 className="text-center text-slate-300 mb-6 font-medium">
                Select the image that best matches your vision:
              </h3>
              <div className="grid grid-cols-2 gap-4 flex-grow min-h-0">
                {options.map((opt) => (
                  <div
                    key={opt.id}
                    className="relative group rounded-xl overflow-hidden border-2 border-slate-700 hover:border-fuchsia-500 transition-all cursor-pointer bg-slate-800"
                    onClick={() => !opt.loading && handleSelect(opt)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!opt.loading) handleSelect(opt);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {opt.loading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon name="spinner" className="w-8 h-8 text-slate-600 animate-spin" />
                      </div>
                    ) : opt.imageUrl ? (
                      <img
                        src={opt.imageUrl}
                        alt="Style option"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <p className="text-xs text-slate-400 italic">&quot;{opt.prompt}&quot;</p>
                        <p className="text-[10px] text-red-400 mt-2">(Image generation failed)</p>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-4 py-2 bg-fuchsia-600 text-white rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        Select This Style
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: ANALYZING */}
          {step === 'analyzing' && (
            <div className="text-center space-y-4 animate-pulse">
              <Icon name="dna" className="w-12 h-12 mx-auto text-cyan-400 animate-bounce" />
              <p className="text-lg text-slate-300">Extracting Visual DNA...</p>
            </div>
          )}

          {/* STEP 5: SUCCESS & SAVE */}
          {step === 'success' && extractedDNA && (
            <div className="w-full max-w-md space-y-6 animate-fade-in-up">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="check" className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Style Extracted!</h3>
              </div>

              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-3">
                <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Art Style</span>
                  <span className="text-cyan-300 font-medium">
                    {extractedDNA.artStyle || 'Custom'}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Lighting</span>
                  <span className="text-cyan-300 font-medium">
                    {extractedDNA.lightingStyle || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Colors</span>
                  <span className="text-cyan-300 font-medium">
                    {extractedDNA.colorPalette || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Camera</span>
                  <span className="text-cyan-300 font-medium">
                    {extractedDNA.cameraMovement || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="styleDnaName" className="text-sm font-medium text-slate-300">
                  Name this Style
                </label>
                <input
                  id="styleDnaName"
                  type="text"
                  value={dnaName}
                  onChange={(e) => setDnaName(e.target.value)}
                  placeholder="e.g. My Neon Noir"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
                  autoFocus
                />
              </div>

              <button
                onClick={handleFinalSave}
                disabled={!dnaName.trim()}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
              >
                Save to Library
              </button>
            </div>
          )}
        </div>
      </div>
    </AppDialog>
  );
};

export default StyleTunerModal;
