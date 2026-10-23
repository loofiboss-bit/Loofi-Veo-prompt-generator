import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditorMediaPanel, appendEditorMedia } from './EditorMediaPanel';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

describe('EditorMediaPanel', () => {
  beforeEach(() => {
    useAppStore.setState({
      assets: [],
      tracks: [],
      clips: [],
    });
    useProjectStore.setState({
      currentProjectId: 'project-1',
    });
    vi.restoreAllMocks();
  });

  it('renders media library title and import button', () => {
    render(<EditorMediaPanel />);
    expect(screen.getByRole('heading', { name: 'Media library' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import media' })).toBeInTheDocument();
    expect(screen.getByText('Add your clips, images and music to begin.')).toBeInTheDocument();
  });

  it('imports local files in parallel and appends assets to store', async () => {
    const file1 = new File(['content1'], 'test1.png', { type: 'image/png' });
    const file2 = new File(['content2'], 'test2.mp4', { type: 'video/mp4' });

    const asset1 = {
      id: 'asset-1',
      storageKey: 'key-1',
      name: 'test1.png',
      type: 'image' as const,
      mimeType: 'image/png',
      data: '',
      url: 'blob:test1',
      groupId: 'key-1',
      version: 1,
      tags: [],
    };

    const asset2 = {
      id: 'asset-2',
      storageKey: 'key-2',
      name: 'test2.mp4',
      type: 'video' as const,
      mimeType: 'video/mp4',
      data: '',
      url: 'blob:test2',
      groupId: 'key-2',
      version: 1,
      tags: [],
      durationSeconds: 10,
    };

    vi.spyOn(mediaAssetService, 'importLocalFile').mockImplementation(async (file) => {
      if (file.name === 'test1.png') return asset1;
      return asset2;
    });

    vi.spyOn(mediaAssetService, 'prepareDesktopProxy').mockImplementation(async (asset) => ({
      ...asset,
      proxyUrl: `proxy-${asset.id}`,
      isProxyReady: true,
    }));

    const { container } = render(<EditorMediaPanel />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.assets).toHaveLength(2);
      expect(state.clips).toHaveLength(2);
    });

    const updatedState = useAppStore.getState();
    const videoAsset = updatedState.assets.find((a) => a.id === 'asset-2');
    expect(videoAsset?.proxyUrl).toBe('proxy-asset-2');
    expect(videoAsset?.isProxyReady).toBe(true);
  });

  it('shows error if project changes during import', async () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    const asset = {
      id: 'asset-1',
      storageKey: 'key-1',
      name: 'test.png',
      type: 'image' as const,
      mimeType: 'image/png',
      data: '',
      url: 'blob:test',
      groupId: 'key-1',
      version: 1,
      tags: [],
    };

    vi.spyOn(mediaAssetService, 'importLocalFile').mockImplementation(async () => {
      // Simulate project change mid-import
      useProjectStore.setState({ currentProjectId: 'project-2' });
      return asset;
    });

    const { container } = render(<EditorMediaPanel />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The project changed. Import the media again in the intended project.',
      );
    });
  });

  it('appendEditorMedia throws error if asset duration is missing for non-image', () => {
    const invalidAsset = {
      id: 'asset-invalid',
      storageKey: 'key-invalid',
      name: 'invalid.mp4',
      type: 'video' as const,
      mimeType: 'video/mp4',
      data: '',
      url: 'blob:invalid',
      groupId: 'key-invalid',
      version: 1,
      tags: [],
    };

    expect(() => appendEditorMedia([invalidAsset])).toThrow(
      'Read media duration before adding this file.',
    );
  });
});
