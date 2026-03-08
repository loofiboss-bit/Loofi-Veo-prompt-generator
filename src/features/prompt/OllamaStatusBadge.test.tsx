import { render, screen, waitFor } from '@testing-library/react';
import { vi, it, describe, beforeEach } from 'vitest';
import { OllamaStatusBadge } from './OllamaStatusBadge';

describe('OllamaStatusBadge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows checking state initially', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));
    render(<OllamaStatusBadge />);
    expect(screen.getByText(/checking/i)).toBeInTheDocument();
  });

  it('shows offline when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    render(<OllamaStatusBadge />);
    await waitFor(() => expect(screen.getByText(/not running/i)).toBeInTheDocument());
  });

  it('shows connected when fetch succeeds with models', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3.2' }] }),
    } as Response);
    render(<OllamaStatusBadge />);
    await waitFor(() => expect(screen.getByText(/connected/i)).toBeInTheDocument());
    expect(screen.getByText(/llama3\.2/i)).toBeInTheDocument();
  });

  it('shows connected without model name when models array is empty', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    } as Response);
    render(<OllamaStatusBadge />);
    await waitFor(() => expect(screen.getByText('Connected')).toBeInTheDocument());
  });
});
