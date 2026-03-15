import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import { TargetModelToggle } from './TargetModelToggle';

vi.mock('./OllamaStatusBadge', () => ({
  OllamaStatusBadge: () => <div data-testid="ollama-status-badge">Ollama status</div>,
}));

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) => {
        const defaults: Record<string, string> = {
          labelTargetModel: 'Target Model',
          toggleVeoLabel: 'Veo',
          toggleVeoDescription: 'Use Google Veo.',
          toggleSoraLabel: 'Sora',
          toggleSoraDescription: 'Use OpenAI Sora.',
        };

        return options?.defaultValue ?? defaults[key] ?? key;
      },
    }),
  };
});

describe('TargetModelToggle', () => {
  it('calls onChange with the selected model', async () => {
    const onChange = vi.fn();
    const { user } = render(<TargetModelToggle value="veo" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: /Sora/i }));
    expect(onChange).toHaveBeenCalledWith('sora');
  });

  it('renders the Ollama badge only when local mode is selected', () => {
    const { rerender } = render(<TargetModelToggle value="veo" onChange={() => {}} />);
    expect(screen.queryByTestId('ollama-status-badge')).not.toBeInTheDocument();

    rerender(<TargetModelToggle value="local" onChange={() => {}} />);
    expect(screen.getByTestId('ollama-status-badge')).toBeInTheDocument();
  });
});
