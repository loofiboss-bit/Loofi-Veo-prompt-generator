import React, { useState } from 'react';
import { PromptState } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import Icon from '@shared/components/ui/Icon';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { useTranslation } from 'react-i18next';

interface PhysicsValidatorProps {
  promptState: PromptState;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const PhysicsValidator: React.FC<PhysicsValidatorProps> = ({ promptState, addToast }) => {
  const { t, i18n } = useTranslation(['prompt', 'errors']);
  const errorStrings = i18n.getResourceBundle(i18n.language, 'errors') || {};
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{ isValid: boolean; issues: string[] } | null>(null);

  if (promptState.targetModel === 'local') {
    return null;
  }

  const handleCheckPhysics = async () => {
    if (!promptState.idea.trim()) {
      addToast(
        t('errors:errorValidation', { defaultValue: 'Please enter an idea first.' }),
        'error',
      );
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      const validationResult = await geminiService.validatePhysicsLogic(promptState);
      setResult(validationResult);
      if (validationResult.isValid) {
        addToast('Motion and continuity parameters are stable.', 'success');
      } else {
        addToast('Motion continuity issues detected.', 'info');
      }
    } catch (error) {
      addToast(getApiErrorMessage(error, errorStrings), 'error');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="mt-6 border border-slate-700/50 rounded-xl bg-slate-900/30 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/20">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Icon name="activity" className="w-4 h-4 text-cyan-400" />
          Motion & Continuity Check
        </h3>
        <button
          onClick={handleCheckPhysics}
          disabled={isChecking || !promptState.idea}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-cyan-900/30 text-cyan-300 hover:bg-cyan-900/50 border border-cyan-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isChecking ? (
            <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Icon name="play" className="w-3.5 h-3.5" />
          )}
          <span>
            {t('prompt:physicsCheck.runButton', { defaultValue: 'Run Simulation Check' })}
          </span>
        </button>
      </div>

      {result && (
        <div
          className={`p-4 border-l-4 transition-all duration-500 animate-fade-in-up ${result.isValid ? 'border-green-500/60 bg-green-900/10' : 'border-red-500/60 bg-red-900/10'}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 p-1 rounded-full ${result.isValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
            >
              <Icon name={result.isValid ? 'check' : 'alert-triangle'} className="w-4 h-4" />
            </div>
            <div>
              <h4
                className={`text-sm font-bold mb-1 ${result.isValid ? 'text-green-300' : 'text-red-300'}`}
              >
                {result.isValid
                  ? t('prompt:physicsCheck.validTitle', { defaultValue: 'Simulation Stable' })
                  : t('prompt:physicsCheck.invalidTitle', {
                      defaultValue: 'Motion Continuity Issues Detected',
                    })}
              </h4>

              {result.isValid ? (
                <p className="text-xs text-green-200/80">
                  {t('prompt:physicsCheck.validMessage', {
                    defaultValue: 'The prompt logic is coherent for Flow/Veo planning.',
                  })}
                </p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {result.issues.map((issue, idx) => (
                    <li key={idx} className="text-xs text-red-200/80 flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicsValidator;
