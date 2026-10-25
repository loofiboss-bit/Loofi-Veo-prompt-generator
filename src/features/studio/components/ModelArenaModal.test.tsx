import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ModelArenaModal, ARENA_TARGETS } from './ModelArenaModal';
import type { VideoPromptArtifactInput, VideoPromptVariant } from '@core/types/promptArtifact';
import { STUDIO_CAPABILITIES } from '@core/config/studioCapabilities';
import { compileVideoPromptArtifact } from '@core/services/promptStudioService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));
const input: VideoPromptArtifactInput = {
  idea: 'Cyberpunk motorcycle chase through rainy Tokyo neon alley',
  mode: 'text-to-video',
  target: 'flow-veo',
  aspectRatio: '16:9',
  durationSeconds: 6,
  subject: 'A sleek black hyperbike',
  action: 'accelerates sharply through puddles',
};
const writeText = vi.fn();
const renderArena = (props: Partial<Parameters<typeof ModelArenaModal>[0]> = {}) =>
  render(
    <ModelArenaModal isOpen onClose={vi.fn()} input={input} onSelectTarget={vi.fn()} {...props} />,
  );

describe('ModelArenaModal', () => {
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  });
  it('renders nothing while closed', () =>
    expect(renderArena({ isOpen: false }).container).toBeEmptyDOMElement());
  it('compares all eight targets including Luma and the internal API', () => {
    renderArena();
    for (const target of ARENA_TARGETS)
      expect(
        screen.getByRole('region', { name: STUDIO_CAPABILITIES[target].label }),
      ).toBeInTheDocument();
    expect(screen.getByText(/does not rate generated video quality/)).toBeInTheDocument();
  });
  it.each(ARENA_TARGETS)('copies the exact Studio compiler package for %s', async (target) => {
    renderArena();
    fireEvent.click(
      within(screen.getByRole('region', { name: STUDIO_CAPABILITIES[target].label })).getByRole(
        'button',
        { name: 'Copy prompt package' },
      ),
    );
    const artifact = compileVideoPromptArtifact({ ...input, target });
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith((artifact.primary as VideoPromptVariant).copyAll),
    );
  });
  it('shows the same local cinematic guidance as Studio for every target and keeps copy available', () => {
    const contradictory = { ...input, camera: 'Static tripod with a whip pan' };
    renderArena({ input: contradictory });
    for (const target of ARENA_TARGETS) {
      const artifact = compileVideoPromptArtifact({ ...contradictory, target });
      const check = artifact.validation.find(
        (entry) => entry.id === 'variant-0-cinematic-camera-conflict',
      );
      expect(check).toBeDefined();
      const region = within(
        screen.getByRole('region', { name: STUDIO_CAPABILITIES[target].label }),
      );
      expect(region.getByText(check!.detail)).toBeInTheDocument();
      expect(region.getByRole('button', { name: 'Copy prompt package' })).toBeEnabled();
    }
  });
  it('opens the affected current variant only after closing the comparison', () => {
    const onClose = vi.fn();
    const onValidationAction = vi.fn();
    renderArena({
      input: { ...input, camera: 'Static tripod with a whip pan' },
      onClose,
      onValidationAction,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open control: Camera direction' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onValidationAction).toHaveBeenCalledWith({ field: 'variant', variantIndex: 0 });
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
      onValidationAction.mock.invocationCallOrder[0],
    );
  });
  it('awaits target persistence before closing and retains the modal when selection fails', async () => {
    const onClose = vi.fn();
    const onSelectTarget = vi.fn().mockRejectedValue(new Error('Disk full'));
    renderArena({ onClose, onSelectTarget });
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Wan 2.1' })).getByRole('button', {
        name: 'Use Target',
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Target selection failed'),
    );
    expect(onClose).not.toHaveBeenCalled();
    onSelectTarget.mockResolvedValue(undefined);
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Wan 2.1' })).getByRole('button', {
        name: 'Use Target',
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onSelectTarget).toHaveBeenCalledWith(
      'wan-video',
      expect.objectContaining({ target: 'wan-video' }),
    );
  });
  it('reports clipboard errors without closing', async () => {
    writeText.mockRejectedValue(new Error('Permission denied'));
    const onClose = vi.fn();
    renderArena({ onClose });
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy prompt package' })[0]);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Copy failed'));
    expect(onClose).not.toHaveBeenCalled();
  });
  it('traps Tab, closes on Escape and restores focus', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn();
    const view = renderArena({ onClose });
    const close = screen.getAllByRole('button', { name: 'Close' });
    expect(close[0]).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(close[1]).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close[0]).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
  it('copies the primary motion field for image-to-video across every Arena target', async () => {
    const motionInput = {
      ...input,
      mode: 'image-to-video' as const,
      idea: 'The bird flaps its wings and flies away',
      action: undefined,
    };
    renderArena({ input: motionInput });
    for (const target of ARENA_TARGETS) {
      const region = within(
        screen.getByRole('region', { name: STUDIO_CAPABILITIES[target].label }),
      );
      fireEvent.click(region.getByRole('button', { name: 'Copy prompt package' }));
      const artifact = compileVideoPromptArtifact({ ...motionInput, target });
      await waitFor(() =>
        expect(writeText).toHaveBeenLastCalledWith(
          (artifact.primary as VideoPromptVariant).copyAll,
        ),
      );
      expect((artifact.primary as VideoPromptVariant).prompt).toContain(
        'Subject motion: ' + motionInput.idea,
      );
    }
  });
});
