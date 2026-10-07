import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SpatialCamera3dViewport } from './SpatialCamera3dViewport';
import { DEFAULT_SPATIAL_CAMERA_RIG } from '@core/services/spatialCameraService';

describe('SpatialCamera3dViewport', () => {
  it('renders viewport header with focal length, FOV, and DOF values', () => {
    render(<SpatialCamera3dViewport rig={DEFAULT_SPATIAL_CAMERA_RIG} />);

    expect(screen.getByText('3D Staging Viewport')).toBeInTheDocument();
    expect(screen.getAllByText(/35mm/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/f\/2\.8/i)).toBeInTheDocument();
  });

  it('renders all view pass selector tabs', () => {
    render(<SpatialCamera3dViewport rig={DEFAULT_SPATIAL_CAMERA_RIG} />);

    expect(screen.getByRole('button', { name: '3D Scene' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Through Lens' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Depth Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Normal Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wireframe' })).toBeInTheDocument();
  });

  it('switches active pass on tab button click', () => {
    render(<SpatialCamera3dViewport rig={DEFAULT_SPATIAL_CAMERA_RIG} />);

    const depthTab = screen.getByRole('button', { name: 'Depth Map' });
    fireEvent.click(depthTab);

    // After clicking Depth Map, active styling is applied
    expect(depthTab.className).toContain('bg-primary');
  });

  it('allows playing and scrubbing along camera trajectory', () => {
    render(<SpatialCamera3dViewport rig={DEFAULT_SPATIAL_CAMERA_RIG} />);

    const playBtn = screen.getByTitle('Play trajectory animation');
    expect(playBtn).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(screen.getByTitle('Pause trajectory animation')).toBeInTheDocument();

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '0.85' } });
    expect(screen.getAllByText(/85%/).length).toBeGreaterThan(0);
  });

  it('captures depth map and enables Use as Reference button', async () => {
    const handleAddReference = vi.fn();
    const handleExport = vi.fn();

    render(
      <SpatialCamera3dViewport
        rig={DEFAULT_SPATIAL_CAMERA_RIG}
        onExportMap={handleExport}
        onAddReferenceImage={handleAddReference}
      />,
    );

    const captureDepthBtn = screen.getByRole('button', { name: /Capture Depth Map/i });
    fireEvent.click(captureDepthBtn);

    await waitFor(() => {
      expect(handleExport).toHaveBeenCalledWith(
        expect.objectContaining({
          pass: 'depth',
          dataUrl: expect.stringContaining('data:image/png'),
        }),
      );
    });

    const useAsRefBtn = screen.getByRole('button', { name: /Use as Reference/i });
    fireEvent.click(useAsRefBtn);

    expect(handleAddReference).toHaveBeenCalledWith(
      expect.stringContaining('data:image/png'),
      expect.stringContaining('3D_DEPTH'),
    );
  });
});
