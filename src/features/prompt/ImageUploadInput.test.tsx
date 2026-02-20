import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';

vi.mock('@shared/components/ui', () => ({
  Icon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

vi.mock('@shared/components/ui/Tooltip', () => ({
  default: ({ text }: { text: string }) => <span title={text} />,
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import ImageUploadInput from './ImageUploadInput';

const defaultProps = {
  onImageSelect: vi.fn() as (image: { data: string; mimeType: string; url: string }) => void,
  onImageClear: vi.fn() as () => void,
  uploadedImageUrl: null as string | null,
  label: 'Reference Image' as string | React.ReactNode,
  placeholder: 'Click to upload image',
  info: 'Upload a reference image',
};

function renderImage(overrides: Partial<typeof defaultProps> = {}) {
  return render(<ImageUploadInput {...defaultProps} {...overrides} />);
}

describe('ImageUploadInput — Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Label association ───────────────────────────────────────────

  it('associates label with the file input via htmlFor/id', () => {
    renderImage();
    const input = screen.getByLabelText('Reference Image');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/png, image/jpeg, image/webp');
  });

  // ── Upload area ─────────────────────────────────────────────────

  it('renders upload area with role="button"', () => {
    renderImage();
    const uploadArea = screen.getByRole('button', { name: /upload image/i });
    expect(uploadArea).toBeInTheDocument();
  });

  it('sets aria-label="Upload image" on upload area', () => {
    renderImage();
    const uploadArea = screen.getByRole('button', { name: /upload image/i });
    expect(uploadArea).toHaveAttribute('aria-label', 'Upload image');
  });

  it('makes upload area keyboard focusable via tabIndex', () => {
    renderImage();
    const uploadArea = screen.getByRole('button', { name: /upload image/i });
    expect(uploadArea).toHaveAttribute('tabIndex', '0');
  });

  it('links upload area to status message via aria-describedby', () => {
    renderImage();
    const uploadArea = screen.getByRole('button', { name: /upload image/i });
    const describedById = uploadArea.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();

    const statusEl = document.getElementById(describedById!);
    expect(statusEl).toBeInTheDocument();
  });

  // ── Status region ───────────────────────────────────────────────

  it('renders a status region with aria-live="polite"', () => {
    renderImage();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('shows default format hint in status region', () => {
    renderImage();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('PNG, JPG, WEBP (Max 10MB)');
  });

  // ── Uploaded state ──────────────────────────────────────────────

  it('displays uploaded image preview', () => {
    renderImage({ uploadedImageUrl: 'data:image/png;base64,abc123' });
    const img = screen.getByAltText('Uploaded preview');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123');
  });

  it('renders preview container with aria-label', () => {
    renderImage({ uploadedImageUrl: 'data:image/png;base64,abc123' });
    expect(screen.getByLabelText(/uploaded image preview/i)).toBeInTheDocument();
  });

  it('renders clear button with aria-label="Clear image"', () => {
    renderImage({ uploadedImageUrl: 'data:image/png;base64,abc123' });
    const clearBtn = screen.getByRole('button', { name: /clear image/i });
    expect(clearBtn).toBeInTheDocument();
  });

  it('calls onImageClear when clear button is clicked', async () => {
    const onClear = vi.fn();
    const { user } = renderImage({
      uploadedImageUrl: 'data:image/png;base64,abc123',
      onImageClear: onClear,
    });

    await user.click(screen.getByRole('button', { name: /clear image/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  // ── Upload area hidden after upload ─────────────────────────────

  it('does not render upload area when image is uploaded', () => {
    renderImage({ uploadedImageUrl: 'data:image/png;base64,abc123' });
    expect(screen.queryByRole('button', { name: /upload image/i })).not.toBeInTheDocument();
  });

  // ── Tooltip ─────────────────────────────────────────────────────

  it('renders info tooltip when provided', () => {
    renderImage({ info: 'Upload a reference image' });
    expect(screen.getByTitle('Upload a reference image')).toBeInTheDocument();
  });

  // ── ReactNode label fallback ────────────────────────────────────

  it('uses fallback aria-label when label is a ReactNode', () => {
    renderImage({ label: (<span>Custom Label</span>) as React.ReactNode });
    const input = screen.getByLabelText('Image upload input');
    expect(input).toBeInTheDocument();
  });
});
