import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { compileVideoPromptArtifact } from '@core/services/promptStudioService';
import type { ExternalStudioResultV1 } from '@core/types/externalStudioResult';
import { useExternalStudioResultStore } from '@core/store/useExternalStudioResultStore';
import { ExternalStudioResults } from './ExternalStudioResults';
vi.mock('@core/services/externalStudioResultService', () => ({ externalStudioResultService: {} }));
const artifact = compileVideoPromptArtifact({
  idea: 'A river',
  target: 'kling',
  mode: 'text-to-video',
  aspectRatio: '16:9',
  durationSeconds: 8,
});
const result: ExternalStudioResultV1 = {
  schemaVersion: 1,
  id: 'r',
  projectId: 'p',
  artifactId: artifact.id,
  variantIndex: 0,
  target: 'kling',
  assetId: 'a',
  assetName: 'clip.mp4',
  mimeType: 'video/mp4',
  durationSeconds: 8,
  importedAt: '2026-10-08',
  updatedAt: 1,
  sourceSnapshot: artifact,
  variantSnapshot: artifact.primary as ExternalStudioResultV1['variantSnapshot'],
};
beforeEach(() =>
  useExternalStudioResultStore.setState({
    projectId: 'p',
    results: [result],
    assets: {
      r: {
        id: 'a',
        name: 'clip.mp4',
        url: 'blob:clip',
        type: 'video',
        data: '',
        mimeType: 'video/mp4',
      },
    },
    pending: false,
    error: null,
    hydrate: vi.fn(),
    confirm: vi.fn(),
    accept: vi.fn(),
    importVideo: vi.fn(),
  }),
);
describe('ExternalStudioResults', () => {
  it('shows exact source and requires review before timeline acceptance', () => {
    render(<ExternalStudioResults projectId="p" artifact={artifact} variantIndex={0} />);
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === 'PRE' && element.textContent === result.variantSnapshot.copyAll,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use on timeline' })).toBeDisabled();
    expect(screen.getByLabelText('Import result for this variant')).toHaveAttribute(
      'accept',
      'video/*',
    );
  });
  it('blocks all mutations while project parent is switching', () => {
    useExternalStudioResultStore.setState({
      results: [{ ...result, manualReview: { confirmedAt: 'now', notes: 'seen', assetId: 'a' } }],
    });
    render(<ExternalStudioResults projectId="p" artifact={artifact} variantIndex={0} disabled />);
    expect(screen.getByRole('button', { name: 'Manual review confirmed' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Use on timeline' })).toBeDisabled();
    expect(screen.getByLabelText('Import result for this variant')).toBeDisabled();
  });
  it('offers local media recovery when result is unavailable', () => {
    useExternalStudioResultStore.setState({ assets: {} });
    render(<ExternalStudioResults projectId="p" artifact={null} variantIndex={0} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/assets');
    expect(screen.getByRole('button', { name: 'Refresh local media' })).toBeEnabled();
  });
});
