import React, { useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import { PromptState, IconName } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (newState: Partial<PromptState>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uiStrings: any;
  language: string;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const WizardModal: React.FC<WizardModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  uiStrings,
  language,
  addToast,
}) => {
  const t = uiStrings.wizard;
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const [inputs, setInputs] = useState({
    subject: '',
    mood: '',
    style: '',
    location: '',
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setInputs({ subject: '', mood: '', style: '', location: '' });
      setIsGenerating(false);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleGenerate = async () => {
    if (!inputs.location.trim()) return; // Last step check

    setIsGenerating(true);
    try {
      const result = await geminiService.generateFromWizard(
        inputs.subject,
        inputs.mood,
        inputs.style,
        inputs.location,
        language,
      );
      onComplete(result);
      onClose();
    } catch (error) {
      addToast(getApiErrorMessage(error, uiStrings), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const MoodOption = ({ value, label, icon }: { value: string; label: string; icon: IconName }) => (
    <button
      onClick={() => {
        setInputs({ ...inputs, mood: value });
        handleNext();
      }}
      className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${
        inputs.mood === value
          ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
      }`}
    >
      <div
        className={`p-3 rounded-full mb-3 ${inputs.mood === value ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300'}`}
      >
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <span
        className={`font-semibold ${inputs.mood === value ? 'text-cyan-100' : 'text-slate-300'}`}
      >
        {label}
      </span>
    </button>
  );

  const StyleOption = ({ value, label, icon }: { value: string; label: string; icon: IconName }) => (
    <button
      onClick={() => {
        setInputs({ ...inputs, style: value });
        handleNext();
      }}
      className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${
        inputs.style === value
          ? 'bg-fuchsia-500/20 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.3)]'
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
      }`}
    >
      <div
        className={`p-3 rounded-full mb-3 ${inputs.style === value ? 'bg-fuchsia-500 text-white' : 'bg-slate-700 text-slate-300'}`}
      >
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <span
        className={`font-semibold ${inputs.style === value ? 'text-fuchsia-100' : 'text-slate-300'}`}
      >
        {label}
      </span>
    </button>
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[80] p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div
        className="relative bg-slate-900/80 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden min-h-[400px]"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / 4) * 100}%` }}
          />
        </div>

        <div className="flex justify-between items-center p-6 pb-0">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="magic" className="w-6 h-6 text-cyan-400" />
            {t.title}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow p-8 flex flex-col justify-center animate-fade-in-up">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-center text-slate-200">{t.step1Title}</h3>
              <TextAreaInput
                label=""
                name="wizard-subject"
                value={inputs.subject}
                onChange={(e) => setInputs({ ...inputs, subject: e.target.value })}
                placeholder={t.step1Placeholder}
                rows={2}
                autoFocus
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-center text-slate-200">{t.step2Title}</h3>
              <div className="grid grid-cols-2 gap-4">
                <MoodOption value="Dark" label={t.moods.dark} icon="moon" />
                <MoodOption value="Happy" label={t.moods.happy} icon="smile" />
                <MoodOption value="Tense" label={t.moods.tense} icon="activity" />
                <MoodOption value="Peaceful" label={t.moods.peaceful} icon="sun" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-center text-slate-200">{t.step3Title}</h3>
              <div className="grid grid-cols-2 gap-4">
                <StyleOption value="Realistic" label={t.styles.realistic} icon="video" />
                <StyleOption value="Anime" label={t.styles.anime} icon="sparkles" />
                <StyleOption value="Cinematic" label={t.styles.cinematic} icon="film" />
                <StyleOption value="3D" label={t.styles['3d']} icon="grid-3x3" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-center text-slate-200">{t.step4Title}</h3>
              <TextAreaInput
                label=""
                name="wizard-location"
                value={inputs.location}
                onChange={(e) => setInputs({ ...inputs, location: e.target.value })}
                placeholder={t.step4Placeholder}
                rows={2}
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={step === 0 || isGenerating}
            className={`text-slate-400 hover:text-white px-4 py-2 rounded-lg transition-colors ${step === 0 ? 'opacity-0 pointer-events-none' : ''}`}
          >
            {t.back}
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={
                (step === 0 && !inputs.subject) ||
                (step === 1 && !inputs.mood) ||
                (step === 2 && !inputs.style)
              }
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.next}
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!inputs.location || isGenerating}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-2 rounded-lg font-bold shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isGenerating ? (
                <>
                  <Icon name="spinner" className="w-5 h-5 animate-spin" />
                  {t.generating}
                </>
              ) : (
                <>
                  <Icon name="magic" className="w-5 h-5" />
                  {t.magicGenerate}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WizardModal;
