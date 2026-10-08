import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@/test-utils';
import { i18n, SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '@core/config/i18n';
import { WelcomeModal } from './WelcomeModal';
const shown = vi.hoisted(() => vi.fn());
vi.mock('@shared/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({ setWelcomeShown: shown }),
}));

describe('local-first welcome', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await i18n.changeLanguage('en');
  });
  it('offers only registered application languages and starts music without provider configuration', async () => {
    const close = vi.fn();
    const { user } = render(<WelcomeModal isOpen onClose={close} />);
    const options = within(screen.getByRole('combobox', { name: 'Language' })).getAllByRole(
      'option',
    );
    expect(options.map((option) => (option as HTMLOptionElement).value)).toEqual([
      ...SUPPORTED_LANGUAGES,
    ]);
    expect(options.map((option) => option.textContent)).toEqual(
      SUPPORTED_LANGUAGES.map((language) => LANGUAGE_LABELS[language]),
    );
    expect(screen.queryByRole('textbox', { name: /API key/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Music & Lyrics' }));
    await user.click(screen.getByRole('radio', { name: 'Use my own idea or media' }));
    await user.click(screen.getByRole('button', { name: 'Start creating' }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(shown).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('v8-onboarding-complete')).toBe('true');
  });
  it('defaults to a key-free offline example and supports skipping', async () => {
    const close = vi.fn();
    const { user } = render(<WelcomeModal isOpen onClose={close} />);
    expect(screen.getByRole('radio', { name: 'Try an offline example' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(shown).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('v8-onboarding-complete')).toBe('true');
  });
});
