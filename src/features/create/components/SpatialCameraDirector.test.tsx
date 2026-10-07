import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SpatialCameraDirector } from './SpatialCameraDirector';
import { DEFAULT_SPATIAL_CAMERA_RIG } from '@core/services/spatialCameraService';

describe('SpatialCameraDirector', () => {
  it('renders director title, 3D viewport toggle, and lens choices', () => {
    const handleChange = vi.fn();
    render(<SpatialCameraDirector rig={DEFAULT_SPATIAL_CAMERA_RIG} onChange={handleChange} />);

    expect(screen.getByText('3D Spatial Camera Director')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide 3D Staging/i })).toBeInTheDocument();
    expect(screen.getByText('35mm')).toBeInTheDocument();
    expect(screen.getByText('50mm')).toBeInTheDocument();
  });

  it('updates lens selection when clicked', () => {
    const handleChange = vi.fn();
    render(<SpatialCameraDirector rig={DEFAULT_SPATIAL_CAMERA_RIG} onChange={handleChange} />);

    const lens50Btn = screen.getByRole('button', { name: /50mm/i });
    fireEvent.click(lens50Btn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lens: '50mm-natural',
      }),
    );
  });

  it('updates aperture when clicked', () => {
    const handleChange = vi.fn();
    render(<SpatialCameraDirector rig={DEFAULT_SPATIAL_CAMERA_RIG} onChange={handleChange} />);

    const f18Btn = screen.getByRole('button', { name: 'f/1.8' });
    fireEvent.click(f18Btn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        aperture: 'f/1.8',
      }),
    );
  });

  it('toggles 3D viewport visibility when toggle button is clicked', () => {
    render(
      <SpatialCameraDirector
        rig={DEFAULT_SPATIAL_CAMERA_RIG}
        onChange={vi.fn()}
        defaultShowViewport={true}
      />,
    );

    expect(screen.getByText('3D Staging Viewport')).toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /Hide 3D Staging/i });
    fireEvent.click(toggleBtn);

    expect(screen.queryByText('3D Staging Viewport')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show 3D Staging/i })).toBeInTheDocument();
  });

  it('displays the compiled Veo Camera Rig prompt snippet', () => {
    render(<SpatialCameraDirector rig={DEFAULT_SPATIAL_CAMERA_RIG} onChange={vi.fn()} />);

    expect(screen.getByText('Compiled Veo Camera Rig:')).toBeInTheDocument();
    expect(screen.getByText(/35mm cinematic lens/i)).toBeInTheDocument();
  });
});
