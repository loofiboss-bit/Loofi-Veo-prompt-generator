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
  const finish = () => {
    setWelcomeShown();
    localStorage.setItem('v8-onboarding-complete', 'true');
    onClose();
    navigate(mode === 'clips' ? `${ROUTES.START}?mode=clips` : `${ROUTES.STUDIO}?mode=${mode}`);
  };
  return (
    <Modal isOpen={isOpen} onClose={finish} size="lg" closeOnBackdropClick>
      <div className="studio-workspace">
        <h1 className="text-2xl font-semibold">{t('welcomeTitle')}</h1>
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
        <fieldset className="mt-4">
          <legend>{creatorT('start.goals', 'Choose how to begin')}</legend>
          <label className="studio-field">
            <input
              type="radio"
              name="welcome-goal"
              checked={mode === 'clips'}
              onChange={() => setMode('clips')}
            />
            {creatorT('start.ownClips', 'Use my own clips')}
          </label>
          <label className="studio-field">
            <input
              type="radio"
              name="welcome-goal"
              checked={mode === 'video'}
              onChange={() => setMode('video')}
            />
            {creatorT('start.videoPrompts', 'Open video prompts')}
          </label>
          <label className="studio-field">
            <input
              type="radio"
              name="welcome-goal"
              checked={mode === 'music'}
              onChange={() => setMode('music')}
            />
            {creatorT('start.musicLyrics', 'Open music and lyrics')}
          </label>
        </fieldset>
        <button
          onClick={() => {
            setWelcomeShown();
            localStorage.setItem('v8-onboarding-complete', 'true');
            onClose();
          }}
          disabled={busy}
        >
          {creatorT('welcome.skip', 'Skip for now')}
        </button>
        <button className="studio-primary mt-4" onClick={finish} disabled={busy}>
          {t('startCreating')}
        </button>
      </div>
    </Modal>
  );
}
