import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PromptStudioDraftV1 } from '@core/types/promptStudioDraft';
import type { StudioTemplateV1 } from '@core/types/studioTemplate';
import { StudioTemplateLibrary } from './StudioTemplateLibrary';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  t: (key: string) => key,
}));
vi.mock('@core/services/studioTemplateService', () => ({
  studioTemplateService: mocks,
  sanitizeStudioTemplate: (template: StudioTemplateV1) => template,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: mocks.t }) }));

const draft: PromptStudioDraftV1 = {
  schemaVersion: 1,
  projectId: 'a',
  mode: 'video',
  video: {
    idea: 'Forest',
    target: 'flow-veo',
    mode: 'text-to-video',
    aspectRatio: '16:9',
    durationSeconds: 8,
  },
  music: { topic: 'Home', language: 'English' },
  artifact: null,
  selectedVariant: 0,
  lockedSections: [],
  revision: 0,
  updatedAt: '',
};
const base = {
  schemaVersion: 1 as const,
  source: 'studio' as const,
  name: 'Forest',
  description: 'Scene',
  createdAt: '',
  updatedAt: '',
};
const template: StudioTemplateV1 = { ...base, id: 'video', kind: 'video', input: draft.video };
const music: StudioTemplateV1 = {
  ...base,
  id: 'music',
  name: 'Song',
  kind: 'music',
  input: draft.music,
  lockedSections: ['Verse'],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([template, music]);
});

describe('StudioTemplateLibrary', () => {
  it('filters by workspace and search, previews and applies selected inputs', async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(<StudioTemplateLibrary draft={draft} onApply={onApply} />);
    await screen.findByRole('button', { name: 'Forest — templateLibrary.preview' });
    expect(screen.queryByText('Song — templateLibrary.preview')).toBeNull();
    fireEvent.change(screen.getByLabelText('templateLibrary.search'), {
      target: { value: 'missing' },
    });
    expect(screen.getByText('templateLibrary.empty')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('templateLibrary.search'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Forest — templateLibrary.preview' }));
    expect(screen.getByText('templateLibrary.mediaNotice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'templateLibrary.apply' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith(template));
  });

  it('surfaces load errors without presenting an empty healthy library', async () => {
    mocks.list.mockRejectedValue(new Error('Storage failed'));
    render(<StudioTemplateLibrary draft={draft} onApply={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('templateLibrary.loadFailed');
    expect(screen.queryByText('templateLibrary.empty')).toBeNull();
  });

  it('keeps legacy templates read-only and surfaces apply failures', async () => {
    mocks.list.mockResolvedValue([{ ...template, source: 'legacy' }]);
    render(
      <StudioTemplateLibrary
        draft={draft}
        onApply={vi.fn().mockRejectedValue(new Error('Checkpoint failed'))}
      />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Forest — templateLibrary.preview' }),
    );
    expect(screen.queryByRole('button', { name: 'templateLibrary.delete' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'templateLibrary.update' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'templateLibrary.apply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('templateLibrary.operationFailed');
  });

  it('saves current input and does not report a storage failure as saved', async () => {
    mocks.create.mockRejectedValue(new Error('Quota'));
    render(<StudioTemplateLibrary draft={draft} onApply={vi.fn()} />);
    await screen.findByRole('button', { name: 'Forest — templateLibrary.preview' });
    fireEvent.change(screen.getByLabelText('templateLibrary.name'), { target: { value: 'New' } });
    fireEvent.click(screen.getByRole('button', { name: 'templateLibrary.save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('templateLibrary.operationFailed');
    expect(mocks.create).toHaveBeenCalledWith('New', '', draft);
    expect(screen.queryByText('templateLibrary.saved')).toBeNull();
  });
});
