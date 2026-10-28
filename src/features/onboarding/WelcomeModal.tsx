import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/ui/Modal';
import { useOnboarding } from '@shared/contexts/OnboardingContext';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  changeAppLanguage,
  type SupportedLanguage,
} from '@core/config/i18n';
import { ROUTES } from '@core/config/routes';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}
export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const { t, i18n } = useTranslation('studio');
  const navigate = useNavigate();
  const { setWelcomeShown } = useOnboarding();
  const [mode, setMode] = useState<'clips' | 'video' | 'music'>('video');
  const { t: creatorT } = useTranslation('creator');
  const [busy, setBusy] = useState(false);
  const language = SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
    ? (i18n.language as SupportedLanguage)
    : 'en';
  const dismiss = () => {
    setWelcomeShown();
    localStorage.setItem('v8-onboarding-complete', 'true');
    onClose();
  };
  const finish = () => {
    dismiss();
    navigate(mode === 'clips' ? `${ROUTES.START}?mode=clips` : `${ROUTES.STUDIO}?mode=${mode}`);
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={dismiss}
      title={t('welcomeTitle')}
      size="lg"
      closeOnBackdropClick
    >
      <div className="studio-workspace">
        <p className="studio-hint">{t('welcomeDescription')}</p>
        <label className="studio-field">
          <span>{t('language')}</span>
          <select
            aria-label={t('language')}
            value={language}
            disabled={busy}
            onChange={(e) => {
              setBusy(true);
              void changeAppLanguage(e.target.value as SupportedLanguage).finally(() =>
                setBusy(false),
              );
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-slate-300 mb-2">
            {creatorT('start.goals', 'Choose how to begin')}
          </legend>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="welcome-goal"
              checked={mode === 'clips'}
              onChange={() => setMode('clips')}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-600"
            />
            <span className="text-sm font-medium text-slate-200">
              {creatorT('start.ownClips', 'Use my own clips')}
            </span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="welcome-goal"
              checked={mode === 'video'}
              onChange={() => setMode('video')}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-600"
            />
            <span className="text-sm font-medium text-slate-200">
              {creatorT('start.videoPrompts', 'Open video prompts')}
            </span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="welcome-goal"
              checked={mode === 'music'}
              onChange={() => setMode('music')}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-600"
            />
            <span className="text-sm font-medium text-slate-200">
              {creatorT('start.musicLyrics', 'Open music and lyrics')}
            </span>
          </label>
        </fieldset>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            onClick={dismiss}
            disabled={busy}
          >
            {creatorT('welcome.skip', 'Skip for now')}
          </button>
          <button
            type="button"
            className="studio-primary px-5 py-2.5 rounded-xl text-sm font-semibold"
            onClick={finish}
            disabled={busy}
          >
            {t('startCreating')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
