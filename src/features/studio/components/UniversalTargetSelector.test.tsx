import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { UniversalTargetSelector } from './UniversalTargetSelector';

describe('UniversalTargetSelector', () => {
  it('renders all universal engines and shows syntax profile', () => {
    render(<UniversalTargetSelector value="flow-veo" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Google Flow \/ Veo 3\.1/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Kling 1\.5 \/ 2\.0/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Runway Gen-3 \/ Gen-4/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /OpenAI Sora/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Luma Dream Machine Ray-2/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Wan 2.1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Minimax / Hailuo Video 01' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Google Veo 3\.1 API/i })).toBeInTheDocument();
    expect(screen.getByText('Google DeepMind')).toBeInTheDocument();
  });

  it('triggers onChange when selecting a different target', async () => {
    const onChange = vi.fn();
    const { user } = render(<UniversalTargetSelector value="flow-veo" onChange={onChange} />);

    await user.selectOptions(screen.getByRole('combobox'), 'kling');
    expect(onChange).toHaveBeenCalledWith('kling');
  });

  it('displays model vendor and syntax flavor details for selected engine', () => {
    render(<UniversalTargetSelector value="kling" onChange={vi.fn()} />);
    expect(screen.getByText('Kuaishou')).toBeInTheDocument();
    expect(screen.getByText(/Structured Bracket Tags/i)).toBeInTheDocument();
  });

  it('displays vendor and syntax details for Veo API target', () => {
    render(<UniversalTargetSelector value="veo-api" onChange={vi.fn()} />);
    expect(screen.getByText('Google DeepMind')).toBeInTheDocument();
    expect(screen.getByText(/Native Veo Directives/i)).toBeInTheDocument();
  });
});
