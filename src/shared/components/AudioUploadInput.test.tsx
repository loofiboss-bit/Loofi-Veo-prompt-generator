import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';

vi.mock('@shared/components/ui/Icon', () => ({
  default: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

vi.mock('@shared/components/ui/Tooltip', () => ({
  default: ({ text }: { text: string }) => <span title={text} />,
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import AudioUploadInput from './AudioUploadInput';

const defaultProps = {
  onAudioSelect: vi.fn() as (audio: { data: string; mimeType: string; name: string }) => void,
  onAudioClear: vi.fn() as () => void,
  onAnalyze: vi.fn() as () => void,
  uploadedAudioName: null as string | null,
  isAnalyzing: false,
  label: 'Reference Audio',
  placeholder: 'Click to upload audio',
  info: 'Upload a reference track',
  analyzeButtonText: 'Analyze Audio',
};

function renderAudio(overrides: Partial<typeof defaultProps> = {}) {
  return render(<AudioUploadInput {...defaultProps} {...overrides} />);
}

describe('AudioUploadInput — Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Label association ───────────────────────────────────────────

  it('associates label with the file input via htmlFor/id', () => {
    renderAudio();
    const input = screen.getByLabelText('Reference Audio');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'audio/mp3, audio/wav, audio/mpeg');
  });

  // ── Upload area ─────────────────────────────────────────────────

  it('renders upload area with role="button"', () => {
    renderAudio();
    const uploadArea = screen.getByRole('button', { name: /upload audio/i });
    expect(uploadArea).toBeInTheDocument();
  });

  it('sets aria-label="Upload audio" on upload area', () => {
    renderAudio();
    const uploadArea = screen.getByRole('button', { name: /upload audio/i });
    expect(uploadArea).toHaveAttribute('aria-label', 'Upload audio');
  });

  it('makes upload area keyboard focusable via tabIndex', () => {
    renderAudio();
    const uploadArea = screen.getByRole('button', { name: /upload audio/i });
    expect(uploadArea).toHaveAttribute('tabIndex', '0');
  });

  it('links upload area to status message via aria-describedby', () => {
    renderAudio();
    const uploadArea = screen.getByRole('button', { name: /upload audio/i });
    const describedById = uploadArea.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();

    const statusEl = document.getElementById(describedById!);
    expect(statusEl).toBeInTheDocument();
  });

  // ── Status region ───────────────────────────────────────────────

  it('renders a status region with aria-live="polite"', () => {
    renderAudio();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('shows default format hint in status region', () => {
    renderAudio();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('MP3, WAV (Max 10MB)');
  });

  // ── Uploaded state ──────────────────────────────────────────────

  it('displays audio filename when uploaded', () => {
    renderAudio({ uploadedAudioName: 'track.mp3' });
    expect(screen.getByText('track.mp3')).toBeInTheDocument();
  });

  it('renders clear button with aria-label="Clear audio"', () => {
    renderAudio({ uploadedAudioName: 'track.mp3' });
    const clearBtn = screen.getByRole('button', { name: /clear audio/i });
    expect(clearBtn).toBeInTheDocument();
  });

  it('calls onAudioClear when clear button is clicked', async () => {
    const onClear = vi.fn();
    const { user } = renderAudio({ uploadedAudioName: 'track.mp3', onAudioClear: onClear });

    await user.click(screen.getByRole('button', { name: /clear audio/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  // ── Analyze button ──────────────────────────────────────────────

  it('shows analyze button when audio is uploaded', () => {
    renderAudio({ uploadedAudioName: 'track.mp3' });
    const analyzeBtn = screen.getByRole('button', { name: /analyze audio/i });
    expect(analyzeBtn).toBeEnabled();
  });

  it('disables analyze button while analyzing', () => {
    renderAudio({ uploadedAudioName: 'track.mp3', isAnalyzing: true });
    const analyzeBtn = screen.getByRole('button', { name: /analyzing/i });
    expect(analyzeBtn).toBeDisabled();
  });

  it('calls onAnalyze when analyze button is clicked', async () => {
    const onAnalyze = vi.fn();
    const { user } = renderAudio({ uploadedAudioName: 'track.mp3', onAnalyze });

    await user.click(screen.getByRole('button', { name: /analyze audio/i }));
    expect(onAnalyze).toHaveBeenCalledOnce();
  });

  // ── Upload area hidden after upload ─────────────────────────────

  it('does not render upload area when audio is uploaded', () => {
    renderAudio({ uploadedAudioName: 'track.mp3' });
    expect(screen.queryByRole('button', { name: /upload audio/i })).not.toBeInTheDocument();
  });

  // ── Tooltip ─────────────────────────────────────────────────────

  it('renders info tooltip when provided', () => {
    renderAudio({ info: 'Upload a reference track' });
    expect(screen.getByTitle('Upload a reference track')).toBeInTheDocument();
  });
});
