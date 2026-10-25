import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/test-utils';
import { compileVideoPromptArtifact } from '@core/services/promptStudioService';
import type { ExternalStudioResultV1 } from '@core/types/externalStudioResult';
import { useExternalStudioResultStore } from '@core/store/useExternalStudioResultStore';
import { ExternalStudioResults } from './ExternalStudioResults';
vi.mock('@core/services/externalStudioResultService', () => ({ externalStudioResultService: {} }));
const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => mocks.navigate,
}));
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
beforeEach(() => {
  mocks.navigate.mockReset();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
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
    saveComparisonNotes: vi.fn().mockResolvedValue(undefined),
  });
});
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
  it('saves notes per result without granting manual review and compares frozen sources', async () => {
    const second = {
      ...result,
      id: 'second',
      assetId: 'b',
      assetName: 'second.mp4',
      variantSnapshot: {
        ...result.variantSnapshot,
        prompt: 'Frozen second source',
        copyAll: 'Frozen second source',
      },
    };
    const state = useExternalStudioResultStore.getState();
    useExternalStudioResultStore.setState({
      results: [result, second],
      assets: {
        ...state.assets,
        second: { ...state.assets.r, id: 'b', url: 'blob:second' },
      },
    });
    const currentArtifact = {
      ...artifact,
      primary: { ...artifact.primary, prompt: 'New unsent prompt' },
    };
    render(<ExternalStudioResults projectId="p" artifact={currentArtifact} variantIndex={0} />);
    expect(document.querySelectorAll('video')).toHaveLength(2);
    const notes = screen.getByRole('textbox', { name: 'Comparison notes · B' });
    fireEvent.change(notes, { target: { value: 'B has a clearer motion' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save notes' })[1]);
    await waitFor(() =>
      expect(state.saveComparisonNotes).toHaveBeenCalledWith('second', 'B has a clearer motion'),
    );
    expect(state.confirm).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: 'Use on timeline' })).toHaveLength(2);
    for (const button of screen.getAllByRole('button', { name: 'Use on timeline' }))
      expect(button).toBeDisabled();
    const details = screen.getByText('Compare frozen prompts and settings').closest('details')!;
    details.open = true;
    fireEvent(details, new Event('toggle'));
    expect(screen.queryByText('New unsent prompt')).toBeNull();
    expect(screen.getAllByText(/Frozen second source/).length).toBeGreaterThan(0);
  });
  it('opens Studio with the frozen external source and unsaved comparison notes', () => {
    render(<ExternalStudioResults projectId="p" artifact={artifact} variantIndex={0} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Comparison notes · A' }), {
      target: { value: 'Keep the subject position and reduce the dolly speed.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Improve prompt from notes' }));
    expect(mocks.navigate).toHaveBeenCalledWith(
      '/studio?mode=video',
      expect.objectContaining({
        state: {
          kind: 'studio-feedback',
          source: expect.objectContaining({
            projectId: 'p',
            sourceKind: 'external-result',
            sourceId: 'r',
            artifactId: artifact.id,
            variantIndex: 0,
            target: 'kling',
            prompt: result.variantSnapshot.prompt,
            negativePrompt: result.variantSnapshot.negativePrompt,
            notes: 'Keep the subject position and reduce the dolly speed.',
            settings: expect.stringContaining('"durationSeconds": 8'),
          }),
        },
      }),
    );
  });
});
