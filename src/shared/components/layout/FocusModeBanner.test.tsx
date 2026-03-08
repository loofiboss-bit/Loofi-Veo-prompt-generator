import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FocusModeBanner } from './FocusModeBanner';

const mockUpdateSettings = vi.fn();
let mockFocusMode = false;

vi.mock('@core/store/useSettingsStore', () => ({
  useSettingsStore: () => ({
    focusMode: mockFocusMode,
    updateSettings: mockUpdateSettings,
  }),
}));

describe('FocusModeBanner', () => {
  beforeEach(() => {
    mockFocusMode = false;
    mockUpdateSettings.mockClear();
  });

  it('renders nothing when focus mode is off', () => {
    const { container } = render(<FocusModeBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the banner when focus mode is on', () => {
    mockFocusMode = true;
    render(<FocusModeBanner />);
    expect(screen.getByText(/Focus Mode/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exit focus mode/i })).toBeInTheDocument();
  });

  it('calls updateSettings to disable focus mode on Exit click', async () => {
    mockFocusMode = true;
    render(<FocusModeBanner />);
    await userEvent.click(screen.getByRole('button', { name: /exit focus mode/i }));
    expect(mockUpdateSettings).toHaveBeenCalledWith({ focusMode: false });
  });
});
