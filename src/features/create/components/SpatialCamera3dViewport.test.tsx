import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { SpatialCamera3dViewport } from './SpatialCamera3dViewport';
import { DEFAULT_SPATIAL_CAMERA_RIG } from '@core/services/spatialCameraService';

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: vi.fn(function () {
      return {
        setPixelRatio: vi.fn(),
        setSize: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
      };
    }),
  };
});

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

interface RenderResources {
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

function sceneResources(scene: THREE.Scene): RenderResources {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((node) => {
    if (
      node instanceof THREE.Mesh ||
      node instanceof THREE.LineSegments ||
      node instanceof THREE.Line
    ) {
      geometries.add(node.geometry);
      const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
      nodeMaterials.forEach((material) => materials.add(material));
    }
  });
  return { geometries: [...geometries], materials: [...materials] };
}

describe('SpatialCamera3dViewport GPU lifecycle', () => {
  function enableRenderer() {
    const context = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({} as WebGLRenderingContext);
    const constructor = vi.mocked(THREE.WebGLRenderer);
    constructor.mockClear();
    return { context, constructor };
  }

  it('matches captured camera orientation during a rolled FPV trajectory without accumulating roll', async () => {
    const { context, constructor } = enableRenderer();
    const dataUrl = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,captured');
    const { unmount } = render(
      <SpatialCamera3dViewport
        rig={{ ...DEFAULT_SPATIAL_CAMERA_RIG, trajectory: 'fpv-drone-dive' }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Through Lens' }));
    const renderer = constructor.mock.results[0].value as THREE.WebGLRenderer;
    const orientation = () => vi.mocked(renderer.render).mock.lastCall![1].quaternion.clone();
    const initial = orientation();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.75' } });
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.5' } });
    expect(orientation().angleTo(initial)).toBeLessThan(1e-7);
    fireEvent.click(screen.getByRole('button', { name: /Capture Depth Map/i }));
    await screen.findByRole('button', { name: /Download/i });
    const capturedRenderer = constructor.mock.results[1].value as THREE.WebGLRenderer;
    const capturedCamera = vi.mocked(capturedRenderer.render).mock.lastCall![1];
    expect(orientation().angleTo(capturedCamera.quaternion)).toBeLessThan(1e-7);
    unmount();
    context.mockRestore();
    dataUrl.mockRestore();
  });

  it('reuses scene geometry, materials and renderer through repeated scrubbing and capture', async () => {
    const { context, constructor } = enableRenderer();
    const dataUrl = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,captured');
    const onExportMap = vi.fn();
    const { unmount } = render(
      <SpatialCamera3dViewport rig={DEFAULT_SPATIAL_CAMERA_RIG} onExportMap={onExportMap} />,
    );
    const renderer = constructor.mock.results[0].value as THREE.WebGLRenderer;
    const renderCall = vi.mocked(renderer.render);
    const scene = renderCall.mock.calls[0][0] as THREE.Scene;
    const resources = sceneResources(scene);
    const disposals = [...resources.geometries, ...resources.materials].map((resource) =>
      vi.spyOn(resource, 'dispose'),
    );
    const cameraGroup = scene.children.find((child) => child instanceof THREE.Group)!;
    const initialPosition = cameraGroup.position.clone();

    for (const value of ['0.1', '0.25', '0.75', '0.9']) {
      fireEvent.change(screen.getByRole('slider'), { target: { value } });
    }
    expect(constructor).toHaveBeenCalledTimes(1);
    expect(renderCall.mock.calls.every(([renderedScene]) => renderedScene === scene)).toBe(true);
    expect(sceneResources(scene)).toEqual(resources);
    expect(cameraGroup.position.equals(initialPosition)).toBe(false);
    disposals.forEach((dispose) => expect(dispose).not.toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Capture Depth Map/i }));
    await screen.findByRole('button', { name: /Download/i });
    expect(onExportMap).toHaveBeenCalledWith(
      expect.objectContaining({ pass: 'depth', dataUrl: 'data:image/png;base64,captured' }),
    );
    expect(constructor).toHaveBeenCalledTimes(2);
    const captureRenderer = constructor.mock.results[1].value as THREE.WebGLRenderer;
    expect(captureRenderer.dispose).toHaveBeenCalledTimes(1);
    expect(renderCall.mock.lastCall?.[0]).toBe(scene);
    disposals.forEach((dispose) => expect(dispose).not.toHaveBeenCalled());
    unmount();
    disposals.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    context.mockRestore();
    dataUrl.mockRestore();
  });

  it('keeps resources alive across animation frames and equivalent parent rig updates', () => {
    const { context, constructor } = enableRenderer();
    const callbacks: FrameRequestCallback[] = [];
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callbacks.push(callback);
        return callbacks.length;
      });
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const { rerender, unmount } = render(
      <SpatialCamera3dViewport rig={DEFAULT_SPATIAL_CAMERA_RIG} />,
    );
    const renderer = constructor.mock.results[0].value as THREE.WebGLRenderer;
    const renderCall = vi.mocked(renderer.render);
    const scene = renderCall.mock.calls[0][0] as THREE.Scene;
    const resources = sceneResources(scene);
    const disposals = [...resources.geometries, ...resources.materials].map((resource) =>
      vi.spyOn(resource, 'dispose'),
    );
    fireEvent.click(screen.getByTitle('Play trajectory animation'));
    for (const timestamp of [0, 100, 200, 300]) {
      act(() => callbacks.at(-1)!(timestamp));
    }
    expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBeGreaterThan(0.5);
    rerender(
      <SpatialCamera3dViewport
        rig={{
          ...DEFAULT_SPATIAL_CAMERA_RIG,
          spatialGrid: { ...DEFAULT_SPATIAL_CAMERA_RIG.spatialGrid },
        }}
      />,
    );
    expect(constructor).toHaveBeenCalledTimes(1);
    expect(renderCall.mock.calls.every(([renderedScene]) => renderedScene === scene)).toBe(true);
    disposals.forEach((dispose) => expect(dispose).not.toHaveBeenCalled());
    unmount();
    disposals.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
    expect(cancelFrame).toHaveBeenCalled();
    requestFrame.mockRestore();
    cancelFrame.mockRestore();
    context.mockRestore();
  });

  it('disposes replaced scenes and preserves the canvas renderer until unmount', () => {
    const { context, constructor } = enableRenderer();
    const { unmount } = render(<SpatialCamera3dViewport rig={DEFAULT_SPATIAL_CAMERA_RIG} />);
    const renderer = constructor.mock.results[0].value as THREE.WebGLRenderer;
    const scene = vi.mocked(renderer.render).mock.calls[0][0] as THREE.Scene;
    const resources = sceneResources(scene);
    const disposals = [...resources.geometries, ...resources.materials].map((resource) =>
      vi.spyOn(resource, 'dispose'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Depth Map' }));
    expect(constructor).toHaveBeenCalledTimes(1);
    expect(vi.mocked(renderer.render).mock.lastCall?.[0]).not.toBe(scene);
    disposals.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
    expect(renderer.dispose).not.toHaveBeenCalled();
    unmount();
    disposals.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    context.mockRestore();
  });

  it('reinitializes safely during StrictMode effect replay and remount', () => {
    const { context, constructor } = enableRenderer();
    const first = render(
      <React.StrictMode>
        <SpatialCamera3dViewport rig={DEFAULT_SPATIAL_CAMERA_RIG} />
      </React.StrictMode>,
    );
    expect(constructor).toHaveBeenCalledTimes(2);
    const renderers = constructor.mock.results.map((result) => result.value as THREE.WebGLRenderer);
    expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
    const activeScene = vi.mocked(renderers[1].render).mock.calls[0][0] as THREE.Scene;
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.8' } });
    expect(vi.mocked(renderers[1].render).mock.lastCall?.[0]).toBe(activeScene);
    first.unmount();
    renderers.forEach((renderer) => expect(renderer.dispose).toHaveBeenCalledTimes(1));
    const second = render(<SpatialCamera3dViewport rig={DEFAULT_SPATIAL_CAMERA_RIG} />);
    expect(constructor).toHaveBeenCalledTimes(3);
    expect(vi.mocked(constructor.mock.results[2].value.render)).toHaveBeenCalled();
    second.unmount();
    context.mockRestore();
  });
});
