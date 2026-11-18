import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudioAiControlBar } from './StudioAiControlBar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        aiSettings: 'Gemini AI-inställningar',
        model: 'Modell',
        stylePreset: 'Filmisk stilprofil',
        promptLanguage: 'Prompt-språk',
        overwriteExisting: 'Skriv över befintliga fält',
        'presets.cinematic': 'Filmisk realism',
        'presets.documentary': 'Dokumentär',
        'presets.commercial': 'Kommersiell / Reklam',
        'presets.stylized': 'Stiliserad / Anime',
        'presets.scifi': 'Sci-Fi / Mörk',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('StudioAiControlBar', () => {
  const defaultProps = {
    model: 'gemini-3.8-flash',
    onModelChange: vi.fn(),
    stylePreset: 'cinematic',
    onStylePresetChange: vi.fn(),
    language: 'en' as const,
    onLanguageChange: vi.fn(),
    overwriteAll: false,
    onOverwriteAllChange: vi.fn(),
  };

  it('renders all fields and labels', () => {
    render(<StudioAiControlBar {...defaultProps} />);
    expect(screen.getByText(/Gemini AI-inställningar/)).toBeDefined();
    expect(screen.getByLabelText('Modell')).toBeDefined();
    expect(screen.getByLabelText('Filmisk stilprofil')).toBeDefined();
    expect(screen.getByLabelText('Prompt-språk')).toBeDefined();
    expect(screen.getByLabelText('Skriv över befintliga fält')).toBeDefined();
  });

  it('triggers onModelChange when a new model is selected', () => {
    render(<StudioAiControlBar {...defaultProps} />);
    const select = screen.getByLabelText('Modell');
    fireEvent.change(select, { target: { value: 'gemini-4-argon' } });
    expect(defaultProps.onModelChange).toHaveBeenCalledWith('gemini-4-argon');
  });

  it('triggers onStylePresetChange when a new preset is selected', () => {
    render(<StudioAiControlBar {...defaultProps} />);
    const select = screen.getByLabelText('Filmisk stilprofil');
    fireEvent.change(select, { target: { value: 'documentary' } });
    expect(defaultProps.onStylePresetChange).toHaveBeenCalledWith('documentary');
  });

  it('triggers onLanguageChange when language is changed', () => {
    render(<StudioAiControlBar {...defaultProps} />);
    const select = screen.getByLabelText('Prompt-språk');
    fireEvent.change(select, { target: { value: 'sv' } });
    expect(defaultProps.onLanguageChange).toHaveBeenCalledWith('sv');
  });

  it('triggers onOverwriteAllChange when toggle is clicked', () => {
    render(<StudioAiControlBar {...defaultProps} />);
    const checkbox = screen.getByLabelText('Skriv över befintliga fält');
    fireEvent.click(checkbox);
    expect(defaultProps.onOverwriteAllChange).toHaveBeenCalledWith(true);
  });
});
