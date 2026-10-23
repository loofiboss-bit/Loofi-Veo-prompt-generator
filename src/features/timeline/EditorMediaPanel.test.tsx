import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorMediaPanel } from './EditorMediaPanel';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { useProjectStore } from '@core/store/useProjectStore';
import { useAppStore } from '@core/store/useAppStore';
import type { Asset } from '@core/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

vi.mock('@core/services/mediaAssetService', () => ({
  mediaAssetService: {
    importLocalFile: vi.fn(),
    prepareDesktopProxy: vi.fn(),
  },
}));

describe('EditorMediaPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({ currentProjectId: 'proj-1' });
    useAppStore.setState({ assets: [], tracks: [], clips: [] });
  });

  it('imports files in parallel and updates asset store correctly', async () => {
    const delayMs = 50;
    vi.mocked(mediaAssetService.importLocalFile).mockImplementation(async (file: File): Promise<Asset> => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return {
        id: file.name,
        name: file.name,
        type: 'image',
        mimeType: file.type,
        data: '',
        url: `blob:${file.name}`,
        durationSeconds: 5,
        storageKey: file.name,
      };
    });

    vi.mocked(mediaAssetService.prepareDesktopProxy).mockImplementation(async (asset: Asset) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return {
        ...asset,
        proxyUrl: `proxy:${asset.id}`,
        isProxyReady: true,
      };
    });

    const { container } = render(<EditorMediaPanel />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    const files = [
      new File(['1'], 'img1.png', { type: 'image/png' }),
      new File(['2'], 'img2.png', { type: 'image/png' }),
      new File(['3'], 'img3.png', { type: 'image/png' }),
      new File(['4'], 'img4.png', { type: 'image/png' }),
    ];

    const start = performance.now();

    fireEvent.change(fileInput, { target: { files } });

    await waitFor(() => {
      expect(mediaAssetService.prepareDesktopProxy).toHaveBeenCalledTimes(4);
    });

    const duration = performance.now() - start;
    console.log(`[Optimized measurement] Importing ${files.length} files took ${duration.toFixed(2)}ms`);

    expect(mediaAssetService.importLocalFile).toHaveBeenCalledTimes(4);
    expect(useAppStore.getState().assets).toHaveLength(4);
  });
});
