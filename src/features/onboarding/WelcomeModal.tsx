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
  const [mode, setMode] = useState<'video' | 'music'>('video');
  const [busy, setBusy] = useState(false);
  const language = SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
    ? (i18n.language as SupportedLanguage)
    : 'en';
  const finish = () => {
    setWelcomeShown();
    localStorage.setItem('v8-onboarding-complete', 'true');
    onClose();
    navigate(ROUTES.STUDIO + '?mode=' + mode);
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
        <div className="studio-toolbar mt-4">
          <button aria-pressed={mode === 'video'} onClick={() => setMode('video')}>
            {t('videoMode')}
          </button>
          <button aria-pressed={mode === 'music'} onClick={() => setMode('music')}>
            {t('musicMode')}
          </button>
        </div>
        <button className="studio-primary mt-4" onClick={finish} disabled={busy}>
          {t('startCreating')}
        </button>
      </div>
    </Modal>
  );
}
