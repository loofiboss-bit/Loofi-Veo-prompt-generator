import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../../test-utils';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), fatal: vi.fn() },
}));

vi.mock('@core/services/pluginService', () => ({
  pluginService: {
    getStudios: vi.fn(() => []),
    subscribe: vi.fn(() => () => {}),
  },
}));

import { pluginService } from '@core/services/pluginService';
import { useAppStore } from '@core/store/useAppStore';
import ModalManager from './ModalManager';

const createHandlers = () => ({
  handleUseHistoryEntry: vi.fn(),
  handleClearHistory: vi.fn(),
  handleDeleteHistoryEntry: vi.fn(),
  handleUsePresetOrTemplate: vi.fn(),
  handleSavePreset: vi.fn(),
  handleDeletePreset: vi.fn(),
  handleUpdatePreset: vi.fn(),
  handleLoadProject: vi.fn(),
  handleUpdateProjectMeta: vi.fn(),
  handleResetAll: vi.fn(),
  generatedPrompt: null,
});

const defaultProps = {
  addToast: vi.fn(),
  handlers: createHandlers(),
};

beforeEach(() => {
  vi.mocked(pluginService.getStudios).mockReturnValue([]);
  useAppStore.setState({
    isHistoryOpen: false,
    isTemplatesOpen: false,
    isSavePresetModalOpen: false,
    isProjectManagerOpen: false,
    isVariablesPanelOpen: false,
    isSearchOpen: false,
    isVariationsOpen: false,
    isShortcutsOpen: false,
    activeStudio: null,
  });
});

describe('ModalManager', () => {
  it('should render without crashing', () => {
    const { container } = render(<ModalManager {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('should render minimal content when all modals are closed', () => {
    const { container } = render(<ModalManager {...defaultProps} />);
    expect(container.children.length).toBe(0);
  });

  it('should render loading state when isHistoryOpen is true', () => {
    useAppStore.setState({ isHistoryOpen: true });
    const { container } = render(<ModalManager {...defaultProps} />);
    const busyElements = container.querySelectorAll('[aria-busy="true"]');
    expect(busyElements.length).toBeGreaterThan(0);
  });

  it('should render loading state when isTemplatesOpen is true', () => {
    useAppStore.setState({ isTemplatesOpen: true });
    const { container } = render(<ModalManager {...defaultProps} />);
    const busyElements = container.querySelectorAll('[aria-busy="true"]');
    expect(busyElements.length).toBeGreaterThan(0);
  });

  it('should render loading state when isProjectManagerOpen is true', () => {
    useAppStore.setState({ isProjectManagerOpen: true });
    const { container } = render(<ModalManager {...defaultProps} />);
    const busyElements = container.querySelectorAll('[aria-busy="true"]');
    expect(busyElements.length).toBeGreaterThan(0);
  });

  it('should render loading state when isSearchOpen is true', () => {
    useAppStore.setState({ isSearchOpen: true });
    const { container } = render(<ModalManager {...defaultProps} />);
    const busyElements = container.querySelectorAll('[aria-busy="true"]');
    expect(busyElements.length).toBeGreaterThan(0);
  });

  it('should render loading state when isVariablesPanelOpen is true', () => {
    useAppStore.setState({ isVariablesPanelOpen: true });
    const { container } = render(<ModalManager {...defaultProps} />);
    const busyElements = container.querySelectorAll('[aria-busy="true"]');
    expect(busyElements.length).toBeGreaterThan(0);
  });

  it('should render loading state when isShortcutsOpen is true', () => {
    useAppStore.setState({ isShortcutsOpen: true });
    const { container } = render(<ModalManager {...defaultProps} />);
    const busyElements = container.querySelectorAll('[aria-busy="true"]');
    expect(busyElements.length).toBeGreaterThan(0);
  });

  it('should render more content when multiple modals are open', () => {
    useAppStore.setState({ isHistoryOpen: true, isTemplatesOpen: true });
    const { container } = render(<ModalManager {...defaultProps} />);
    const busyElements = container.querySelectorAll('[aria-busy="true"]');
    expect(busyElements.length).toBeGreaterThanOrEqual(2);
  });

  it('should not crash with custom addToast function', () => {
    useAppStore.setState({ isHistoryOpen: true });
    const addToast = vi.fn();
    expect(() => render(<ModalManager {...defaultProps} addToast={addToast} />)).not.toThrow();
  });

  it('should redirect the legacy suno studio entry point to Prompt Studio music mode', async () => {
    useAppStore.setState({ activeStudio: 'suno' });
    const originalHash = window.location.hash;
    render(<ModalManager {...defaultProps} />);
    await vi.waitFor(() => expect(window.location.hash).toBe('#/studio?mode=music'));
    window.location.hash = originalHash;
  });

  it('should render registered active plugin studios dynamically', () => {
    const MockPluginStudio = () => <div data-testid="active-plugin-studio">Plugin Studio</div>;
    vi.mocked(pluginService.getStudios).mockReturnValue([
      {
        id: 'image',
        name: 'Image Studio',
        component: MockPluginStudio as never,
      } as never,
    ]);
    useAppStore.setState({ activeStudio: 'image' });
    const { getByTestId } = render(<ModalManager {...defaultProps} />);
    expect(getByTestId('active-plugin-studio')).toBeInTheDocument();
  });
});
