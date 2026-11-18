import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import PoseEditorModal from './PoseEditorModal';

describe('PoseEditorModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <PoseEditorModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal content when isOpen is true', () => {
    render(<PoseEditorModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText('Pose Director')).toBeInTheDocument();
    expect(screen.getByText('Use Pose')).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<PoseEditorModal isOpen={true} onClose={onClose} onSave={vi.fn()} />);
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
