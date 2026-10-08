import { act, render, screen } from '@/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { openAssetLibrary } from '@shared/utils/assetLibraryEvents';
import { AppCollaborationPanels } from './AppCollaborationPanels';

vi.mock('@features/prompt/AssetLibrary', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div hidden={!isOpen} role="region" aria-label="Asset library">
      <button onClick={onClose}>Close asset library</button>
    </div>
  ),
}));

const props = {
  isOptimizePanelOpen: false,
  onCloseOptimizePanel: vi.fn(),
  isShareDialogOpen: false,
  onCloseShareDialog: vi.fn(),
  isProfileSetupOpen: false,
  onCloseProfileSetup: vi.fn(),
  isCommentPanelOpen: false,
  onCloseCommentPanel: vi.fn(),
  isRoleManagerOpen: false,
  onCloseRoleManager: vi.fn(),
  currentProjectId: 'first',
  currentProjectName: 'First project',
};

describe('contextual asset drawer', () => {
  it('opens only from editor controls and closes when the project changes', async () => {
    const { user, rerender } = render(<AppCollaborationPanels {...props} />);
    expect(screen.queryByRole('region', { name: 'Asset library' })).not.toBeInTheDocument();
    await act(async () => openAssetLibrary());
    expect(await screen.findByRole('region', { name: 'Asset library' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Close asset library' }));
    expect(screen.queryByRole('region', { name: 'Asset library' })).not.toBeInTheDocument();
    await act(async () => openAssetLibrary());
    rerender(<AppCollaborationPanels {...props} currentProjectId="second" />);
    expect(screen.queryByRole('region', { name: 'Asset library' })).not.toBeInTheDocument();
  });
});
