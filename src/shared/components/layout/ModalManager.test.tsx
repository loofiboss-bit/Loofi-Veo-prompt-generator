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
}));

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
  handleSaveDNA: vi.fn(),
  handleApplyDNA: vi.fn(),
  handleDeleteDNA: vi.fn(),
  handleLoadProject: vi.fn(),
  handleUpdateProjectMeta: vi.fn(),
  handleResetAll: vi.fn(),
  handleWizardComplete: vi.fn(),
  handleSelectTemplate: vi.fn(),
  handleSelectCharacter: vi.fn(),
  handleUpdateSpatialMotion: vi.fn(),
  handleClearSpatialMotions: vi.fn(),
  handleSelectVariation: vi.fn(),
  handleUseAnalysis: vi.fn(),
  handleCompareSelect: vi.fn(),
  promptVariations: [],
  isGeneratingVariations: false,
  isBrainstorming: false,
  uploadedImageUrl: null,
  currentProjectName: null,
  currentProjectId: null,
  generatedPrompt: null,
});

const defaultProps = {
  addToast: vi.fn(),
  handlers: createHandlers(),
};

beforeEach(() => {
  useAppStore.setState({
    isHistoryOpen: false,
    isTemplatesOpen: false,
    isSavePresetModalOpen: false,
    isDNAModalOpen: false,
    isCharacterBankOpen: false,
    isLocationBankOpen: false,
    isProjectManagerOpen: false,
    isSeriesBibleOpen: false,
    isVariablesPanelOpen: false,
    isWizardOpen: false,
    isNewProjectWizardOpen: false,
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
    // When no modals open, the container renders without modal content
    // Only the base wrapper elements should exist
    expect(container.children.length).toBeGreaterThanOrEqual(1);
  });

  it('should render loading state when isHistoryOpen is true', () => {
    useAppStore.setState({ isHistoryOpen: true });
    const { container } = render(<ModalManager {...defaultProps} />);
    // Lazy component triggers Suspense fallback (skeleton loader)
    const busyElements = container.querySelectorAll('[aria-busy="true"]');
    expect(busyElements.length).toBeGreaterThan(0);
  });

  it('should render loading state when isTemplatesOpen is true', () => {
    useAppStore.setState({ isTemplatesOpen: true });
    const { container } = render(<ModalManager {...defaultProps} />);
    const busyElements = container.querySelectorAll('[aria-busy="true"]');
    expect(busyElements.length).toBeGreaterThan(0);
  });

  it('should render loading state when isWizardOpen is true', () => {
    useAppStore.setState({ isWizardOpen: true });
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

  it('should render more content when multiple modals are open', () => {
    useAppStore.setState({ isHistoryOpen: true, isTemplatesOpen: true });
    const { container } = render(<ModalManager {...defaultProps} />);
    const busyElements = container.querySelectorAll('[aria-busy="true"]');
    // Multiple modals = more skeleton elements
    expect(busyElements.length).toBeGreaterThanOrEqual(2);
  });

  it('should not crash with custom addToast function', () => {
    useAppStore.setState({ isHistoryOpen: true });
    const addToast = vi.fn();
    expect(() => render(<ModalManager {...defaultProps} addToast={addToast} />)).not.toThrow();
  });
});
