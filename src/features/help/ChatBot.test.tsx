import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import ChatBot from './ChatBot';
import * as geminiService from '@core/services/geminiService';

const mockNavigate = vi.fn();
const mockAddShot = vi.fn();
const mockSetPromptState = vi.fn();
const mockResetAll = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@core/services/geminiService', () => ({
  createAppChat: vi.fn(),
}));

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: () => ({
    addShot: mockAddShot,
    setPromptState: mockSetPromptState,
    resetAll: mockResetAll,
    sbShots: [],
  }),
}));

vi.mock('@core/services/apiKeyService', () => ({
  hasApiKeyAsync: vi.fn().mockResolvedValue(false),
}));

describe('ChatBot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: vi.fn(),
      writable: true,
    });
    localStorage.removeItem('veo-gemini-api-key');
  });

  it('does not initialize Gemini chat on mount when API key is missing', async () => {
    const { user } = render(<ChatBot />);

    await user.click(screen.getByRole('button', { name: 'Open AI Director' }));

    await screen.findByText(
      'AI Director is unavailable until you configure your Gemini API key in Settings.',
    );

    await waitFor(() => {
      expect(geminiService.createAppChat).not.toHaveBeenCalled();
    });
    expect(
      screen.getByText(
        'AI Director is unavailable until you configure your Gemini API key in Settings.',
      ),
    ).toBeInTheDocument();
  });

  it('does not expose close-only controls before the chat is opened', async () => {
    render(<ChatBot />);

    await screen.findByRole('button', { name: 'Open AI Director' });

    expect(screen.queryByRole('button', { name: 'Close chat' })).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('e.g. Set ratio to 9:16 and add a scene'),
    ).not.toBeInTheDocument();
  });

  it('keeps app stable and shows a guidance message on submit without API key', async () => {
    const { user } = render(<ChatBot />);

    await user.click(screen.getByRole('button', { name: 'Open AI Director' }));
    await user.type(
      screen.getByPlaceholderText('e.g. Set ratio to 9:16 and add a scene'),
      'Add a scene',
    );
    await user.keyboard('{Enter}');

    expect(geminiService.createAppChat).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(
        'AI Director is unavailable until you configure your Gemini API key in Settings.',
      ),
    ).toHaveLength(2);
  });

  it('routes to settings when clicking Open Settings on no-key message', async () => {
    const { user } = render(<ChatBot />);

    await user.click(screen.getByRole('button', { name: 'Open AI Director' }));
    await user.click(screen.getByRole('button', { name: 'Open Settings' }));

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });
});
