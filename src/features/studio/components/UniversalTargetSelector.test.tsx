import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { UniversalTargetSelector } from './UniversalTargetSelector';

describe('UniversalTargetSelector', () => {
  it('offers current targets and excludes retired Sora and Veo API', () => {
    render(<UniversalTargetSelector value="flow-veo" onChange={vi.fn()} />);
    for (const name of [
      /Google Flow/,
      /Gemini Omni 1.1/,
      /Kling 4.0/,
      /Runway Gen-4.5/,
      /Ray3.2/,
      /Wan 3.0/,
      /MiniMax-H3/,
    ])
      expect(screen.getByRole('option', { name })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Sora|Veo 3.1 API/ })).not.toBeInTheDocument();
  });
  it('selects a target without changing it silently', async () => {
    const onChange = vi.fn();
    const { user } = render(<UniversalTargetSelector value="flow-veo" onChange={onChange} />);
    await user.selectOptions(screen.getByRole('combobox'), 'kling');
    expect(onChange).toHaveBeenCalledWith('kling');
  });
  it('exposes distinct Flow profiles through an explicit choice', async () => {
    const onProfileChange = vi.fn();
    const { user } = render(
      <UniversalTargetSelector
        value="flow-veo"
        onChange={vi.fn()}
        onProfileChange={onProfileChange}
      />,
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Model profile' }),
      'flow-veo-3.1-quality',
    );
    expect(onProfileChange).toHaveBeenCalledWith('flow-veo-3.1-quality');
  });
  it('keeps a retired saved value visible but disabled', () => {
    render(<UniversalTargetSelector value="sora" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('sora');
    expect(screen.getByRole('option', { name: /retired/ })).toBeDisabled();
  });
});
