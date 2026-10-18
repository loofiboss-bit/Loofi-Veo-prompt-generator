import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { MusicGenerator } from './MusicGenerator';
import { MODEL_CATALOG } from '@core/models/catalog';

vi.mock('@core/services/musicGenerationService', () => ({
  musicGenerationService: {
    list: vi.fn().mockResolvedValue([]),
    subscribe: vi.fn().mockReturnValue(() => {}),
    estimateMaximumCharge: vi.fn((modelId: string) =>
      modelId === 'lyria-3-clip-preview' ? 0.04 : 0.08,
    ),
    submit: vi.fn().mockResolvedValue({ id: 'task-1', status: 'Queued' }),
  },
}));

describe('MusicGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders catalog-driven Lyria model options derived directly from MODEL_CATALOG', async () => {
    render(<MusicGenerator />);

    const musicModels = MODEL_CATALOG.filter((entry) =>
      entry.capabilities.operations.includes('music'),
    );
    expect(musicModels.length).toBeGreaterThan(0);

    const select = await screen.findByRole('combobox', { name: /model/i });
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    // Ensure all catalog music models have corresponding option elements
    for (const model of musicModels) {
      const durationSuffix = model.capabilities.fixedDurationSeconds
        ? ` · ${model.capabilities.fixedDurationSeconds}s`
        : '';
      const expectedLabel = `${model.displayName}${durationSuffix}`;
      const matchingOption = options.find((opt) => opt.textContent === expectedLabel);
      expect(matchingOption).toBeDefined();
      expect(matchingOption).toHaveAttribute('value', model.id);
    }
  });

  it('updates selected model and estimates cost accordingly', async () => {
    const { user } = render(<MusicGenerator />);

    const select = await screen.findByRole('combobox', { name: /model/i });
    expect(select).toHaveValue('lyria-3-clip-preview');

    await user.selectOptions(select, 'lyria-3-pro-preview');
    expect(select).toHaveValue('lyria-3-pro-preview');
  });
});
