import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import ExportModal from './ExportModal';

describe('ExportModal', () => {
  it('passes directExport=true when Direct Export mode is selected', () => {
    const onConfirm = vi.fn();

    render(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        totalDuration={12}
        isProcessing={false}
        processingStatus=""
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Direct Export to DaVinci Resolve/i }));
    fireEvent.click(screen.getByRole('button', { name: /Send to Resolve/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [, options] = onConfirm.mock.calls[0];
    expect(options).toEqual(
      expect.objectContaining({
        directExport: true,
      }),
    );
  });

  it('renders actionable error message when provided', () => {
    render(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        totalDuration={12}
        isProcessing={false}
        processingStatus=""
        errorMessage="DaVinci Resolve is not running. Open it and retry."
      />,
    );

    expect(screen.getByText(/not running/i)).toBeInTheDocument();
  });

  it('disables direct export confirmation when bridge is unavailable', () => {
    const onConfirm = vi.fn();

    render(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        totalDuration={12}
        isProcessing={false}
        processingStatus=""
        directExportEnabled={false}
        directExportHint="Direct Export is available only in the desktop app."
      />,
    );

    expect(screen.getByText(/desktop app/i)).toBeInTheDocument();
    expect(screen.getByText(/to continue now/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Direct Export to DaVinci Resolve/i }),
    ).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
