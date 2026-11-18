import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@core/config/routes';
import type { Asset, TimelineClip } from '@core/types';
import type { CreateWorkflowController } from '../hooks/useCreateWorkflow';
import { ReviewExportStep } from './ReviewExportStep';

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const state = vi.hoisted(() => ({ assets: [] as Asset[], clips: [] as TimelineClip[] }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));
vi.mock('@core/store/useAppStore', () => ({
  useAppStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

describe('ReviewExportStep missing media recovery', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    state.assets = [
      { id: 'video', type: 'video', name: 'Replacement video' },
      { id: 'audio', type: 'audio', name: 'Music' },
    ] as Asset[];
    state.clips = [{ id: 'opening', type: 'video' }] as TimelineClip[];
  });

  it('navigates to timeline from review and export steps', () => {
    const workflow = {
      exportMissingMedia: [],
      handleRelinkExportMedia: vi.fn(),
      useGeminiReview: false,
      setUseGeminiReview: vi.fn(),
    } as unknown as CreateWorkflowController;

    const { rerender } = render(<ReviewExportStep activeStep="review" workflow={workflow} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open in Timeline' }));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.TIMELINE);

    mockNavigate.mockReset();
    rerender(<ReviewExportStep activeStep="export" workflow={workflow} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open in Timeline' }));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.TIMELINE);
  });

  it('identifies the missing clip and requires explicit compatible replacement selection', () => {
    const relink = vi.fn();
    const entry = { clipId: 'opening', clipLabel: 'Opening scene', mediaKey: 'gone' };
    const workflow = {
      exportMissingMedia: [entry],
      handleRelinkExportMedia: relink,
    } as unknown as CreateWorkflowController;
    render(<ReviewExportStep activeStep="export" workflow={workflow} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Opening scene (gone)');
    expect(screen.queryByRole('option', { name: 'Music' })).toBeNull();
    const button = screen.getByRole('button', { name: 'Relink clip' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'video' } });
    fireEvent.click(button);
    expect(relink).toHaveBeenCalledWith(entry, 'video');
  });

  it('opens the existing media library drawer without leaving the project', () => {
    const open = vi.fn();
    window.addEventListener('loofi:open-asset-library', open);
    const workflow = {
      exportMissingMedia: [{ clipLabel: 'Opening', mediaKey: 'gone' }],
    } as unknown as CreateWorkflowController;
    render(<ReviewExportStep activeStep="export" workflow={workflow} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open media library' }));
    expect(open).toHaveBeenCalledOnce();
    window.removeEventListener('loofi:open-asset-library', open);
  });
});
