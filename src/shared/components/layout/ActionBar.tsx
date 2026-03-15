/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import { PromptState, VeoPromptResponse, ToastMessage } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { decode, decodeAudioData } from '@core/utils/audio';
import QualityMeter from '@features/prompt/QualityMeter';
import { useTranslation } from 'react-i18next';

interface ActionBarProps {
  promptState: PromptState;
  generatedPrompt: VeoPromptResponse | null;
  isLoading: boolean;
  isEditing: boolean;
  editedPrompt: string;
  errors: Partial<Record<keyof PromptState, string>>;
  addToast: (message: string, type: ToastMessage['type']) => void;

  onGeneratePrompt: () => void;
  onNewPrompt: () => void;
  onSavePrompt: (newPrompt: string) => void;
  onSetIsEditing: (isEditing: boolean) => void;
  onSetEditedPrompt: (prompt: string) => void;

  canUndoEdit: boolean;
  onUndoEdit: () => void;
  canRedoEdit: boolean;
  onRedoEdit: () => void;

  // Global History Props
  canUndoPromptState?: boolean;
  onUndoPromptState?: () => void;
  canRedoPromptState?: boolean;
  onRedoPromptState?: () => void;

  isGeneratingArt: boolean;
  onGenerateArt: (prompt: string) => void;
  isGeneratingVideo: boolean;
  onGenerateVideo: (prompt: string) => void;
  isGeneratingStoryboard: boolean;
  onGenerateStoryboard: (prompt: string) => void;
  onOpenStoryBoardStudio?: () => void;
  isGeneratingVariations: boolean;
  onGenerateVariations: (prompt: string) => void;
  isRefining: boolean;
  onRefinePrompt: (prompt: string) => void;
  isRestructuring: boolean;
  onRestructurePrompt: (prompt: string) => void;

  onSaveToHistory: () => void;
  onShare: () => void;
  onDownload: (prompt: string) => void;
  onOpenSavePresetModal: () => void;
  onOpenTemplatesPanel: () => void;
  onCompareModels: () => void;
  onOpenVisualDNA: () => void;
}

const ControlButton: React.FC<{
  onClick?: () => void;
  iconName: React.ComponentProps<typeof Icon>['name'];
  children: React.ReactNode;
  'aria-label': string;
  title?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'dropdown-trigger';
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  dataTourId?: string;
}> = ({
  onClick,
  iconName,
  children,
  'aria-label': ariaLabel,
  title,
  variant = 'ghost',
  disabled,
  isLoading,
  className = '',
  dataTourId,
}) => {
  const baseClasses =
    'flex items-center space-x-1.5 px-2.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

  const variantClasses = {
    primary:
      'bg-cyan-600 text-white hover:bg-cyan-500 disabled:bg-cyan-600/50 shadow-md shadow-cyan-500/20',
    secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 disabled:bg-slate-700/50',
    ghost: 'text-slate-200 hover:bg-slate-700/60 hover:text-white',
    'dropdown-trigger': 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700',
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      disabled={disabled || isLoading}
      data-tour-id={dataTourId}
    >
      {isLoading ? (
        <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon name={iconName} className="w-3.5 h-3.5" />
      )}
      <span>{children}</span>
    </button>
  );
};

const DropdownMenu: React.FC<{
  triggerLabel: string;
  triggerIcon: React.ComponentProps<typeof Icon>['name'];
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}> = ({ triggerLabel, triggerIcon, children, isOpen, onToggle, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={ref}>
      <ControlButton
        onClick={onToggle}
        iconName={triggerIcon}
        aria-label={triggerLabel}
        variant="dropdown-trigger"
        className={isOpen ? 'ring-2 ring-cyan-500/50 border-cyan-500/50' : ''}
      >
        {triggerLabel}
        <Icon
          name="chevron-down"
          className={`w-3 h-3 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </ControlButton>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-48 bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden z-50 animate-fade-in-up origin-bottom-left">
          <div className="p-1 space-y-0.5">{children}</div>
        </div>
      )}
    </div>
  );
};

const DropdownItem: React.FC<{
  onClick: () => void;
  iconName: React.ComponentProps<typeof Icon>['name'];
  label: string;
  disabled?: boolean;
  isLoading?: boolean;
}> = ({ onClick, iconName, label, disabled, isLoading }) => (
  <button
    onClick={onClick}
    disabled={disabled || isLoading}
    className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/80 rounded-lg transition-colors disabled:opacity-50 text-left"
  >
    <div className="w-5 flex justify-center">
      {isLoading ? (
        <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon name={iconName} className="w-3.5 h-3.5 text-cyan-400" />
      )}
    </div>
    <span>{label}</span>
  </button>
);

const ActionBar: React.FC<ActionBarProps> = (props) => {
  const { t, i18n } = useTranslation(['common', 'tooltips', 'errors']);
  const {
    promptState,
    generatedPrompt,
    isLoading,
    isEditing,
    editedPrompt,
    errors,
    addToast,
    onGeneratePrompt,
    onNewPrompt,
    onSavePrompt,
    onSetIsEditing,
    canUndoEdit,
    onUndoEdit,
    canRedoEdit,
    onRedoEdit,
    canUndoPromptState,
    onUndoPromptState,
    canRedoPromptState,
    onRedoPromptState,
    isGeneratingArt,
    onGenerateArt,
    isGeneratingVideo,
    onGenerateVideo,
    isGeneratingStoryboard,
    onGenerateStoryboard,
    onOpenStoryBoardStudio,
    isGeneratingVariations,
    onGenerateVariations,
    isRefining,
    onRefinePrompt,
    isRestructuring,
    onRestructurePrompt,
    onSaveToHistory,
    onShare,
    onDownload,
    onOpenSavePresetModal,
    onOpenTemplatesPanel,
    onCompareModels,
    onOpenVisualDNA,
  } = props;

  const [copied, setCopied] = useState(false);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [creativeMenuOpen, setCreativeMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const currentPromptText = isEditing ? editedPrompt : generatedPrompt?.prompt || '';

  const handleCopy = useCallback(() => {
    if (!currentPromptText) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentPromptText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [currentPromptText]);

  const handleSave = () => onSavePrompt(editedPrompt);
  const handleCancel = () => onSetIsEditing(false);
  const handleEdit = () => onSetIsEditing(true);

  const handleReadAloud = async () => {
    if (isReadingAloud || !currentPromptText) return;

    setIsReadingAloud(true);
    try {
      const base64Audio = await geminiService.generateSpeech(currentPromptText);
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext ||
          (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext
        )({
          sampleRate: 24000,
        });
      }
      const ctx = audioContextRef.current;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const decodedBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(decodedBytes, ctx, 24000, 1);

      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsReadingAloud(false);
        audioSourceRef.current = null;
      };
      source.start();
      audioSourceRef.current = source;
    } catch (error) {
      addToast(
        getApiErrorMessage(error, i18n.getResourceBundle(i18n.language, 'errors') || {}),
        'error',
      );
      setIsReadingAloud(false);
    }
  };

  const anyActionInProgress =
    isLoading ||
    isGeneratingArt ||
    isGeneratingVideo ||
    isGeneratingStoryboard ||
    isGeneratingVariations ||
    isRefining ||
    isRestructuring ||
    isReadingAloud;
  const isVeoAspectRatioInvalid =
    promptState.aspectRatio !== '16:9' && promptState.aspectRatio !== '9:16';

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/55 p-3 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)] backdrop-blur-sm">
      {/* Top Row: Current Prompt Text or Primary Actions */}
      <div className="w-full">
        {!generatedPrompt ? (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <ControlButton
                onClick={onOpenTemplatesPanel}
                iconName="template"
                aria-label={t('common:templatesButton')}
                title={t('tooltips:templatesButton')}
                dataTourId="templates-button"
              >
                {t('common:templatesButton')}
              </ControlButton>
              <ControlButton
                onClick={onOpenSavePresetModal}
                iconName="plus"
                aria-label={t('common:saveAsPresetButton')}
                title={t('tooltips:saveAsPresetButton')}
              >
                {t('common:saveAsPresetButton')}
              </ControlButton>
              {onUndoPromptState && (
                <>
                  <div className="border-l border-slate-700 h-4 mx-1"></div>
                  <ControlButton
                    onClick={onUndoPromptState}
                    iconName="undo"
                    aria-label={t('common:undoButton')}
                    disabled={!canUndoPromptState}
                    title={t('tooltips:undoButton')}
                  >
                    {t('common:undoButton')}
                  </ControlButton>
                  <ControlButton
                    onClick={onRedoPromptState}
                    iconName="redo"
                    aria-label={t('common:redoButton')}
                    disabled={!canRedoPromptState}
                    title={t('tooltips:redoButton')}
                  >
                    {t('common:redoButton')}
                  </ControlButton>
                </>
              )}
              <div className="border-l border-slate-700 h-4 mx-1"></div>
              <ControlButton
                onClick={onCompareModels}
                iconName="compare"
                aria-label={t('common:compareModelsButton')}
                disabled={!promptState.idea}
                title={t('common:compareModelsButton')}
              >
                Compare
              </ControlButton>
              <ControlButton
                onClick={onOpenVisualDNA}
                iconName="dna"
                aria-label="Visual DNA"
                title="Manage Visual Consistency"
              >
                Visual DNA
              </ControlButton>
            </div>

            {/* Prompt Quality Meter */}
            <div className="hidden md:block">
              <QualityMeter promptState={promptState} alignment="right" />
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
            <p className="text-xs text-slate-300 truncate font-mono" title={currentPromptText}>
              <span className="font-semibold text-cyan-500">PROMPT: </span>
              {currentPromptText}
            </p>
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-white transition-colors"
              title={t('tooltips:copyButton')}
            >
              {copied ? (
                <Icon name="check" className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Icon name="copy" className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Row: Actions Toolbar */}
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex-1 md:hidden">
          {/* Mobile Quality Meter position */}
          {!generatedPrompt && <QualityMeter promptState={promptState} alignment="left" />}
        </div>
        <div className="flex-1 hidden md:block"></div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {!generatedPrompt ? (
            <button
              onClick={onGeneratePrompt}
              disabled={isLoading || Object.keys(errors).length > 0 || !promptState.idea}
              className="flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-xl text-white bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 shadow-[0_0_8px_rgba(34,211,238,0.3)] hover:shadow-[0_0_18px_rgba(34,211,238,0.5)] w-full sm:w-auto"
              title={t('tooltips:generateButton')}
              data-tutorial-id="generate-prompt-button"
              data-tour-id="generate-prompt-button"
            >
              {isLoading ? (
                <Icon name="spinner" className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
              ) : (
                <Icon name="magic" className="w-4 h-4 mr-2" />
              )}
              {isLoading
                ? t('common:loadingGenerateButton') || 'Architecting...'
                : t('common:generateButton')}
            </button>
          ) : isEditing ? (
            <>
              <ControlButton
                onClick={handleSave}
                iconName="check"
                aria-label="Save changes"
                variant="primary"
                title={t('tooltips:saveButton')}
              >
                {t('common:saveButton')}
              </ControlButton>
              <ControlButton
                onClick={handleCancel}
                iconName="cancel"
                aria-label="Cancel editing"
                variant="secondary"
                title={t('tooltips:cancelButton')}
              >
                {t('common:cancelButton')}
              </ControlButton>
              <div className="border-l border-slate-700 h-4 mx-1"></div>
              <ControlButton
                onClick={onUndoEdit}
                iconName="undo"
                aria-label={t('common:undoButton')}
                disabled={!canUndoEdit}
                title={t('tooltips:undoButton')}
              >
                {t('common:undoButton')}
              </ControlButton>
              <ControlButton
                onClick={onRedoEdit}
                iconName="redo"
                aria-label={t('common:redoButton')}
                disabled={!canRedoEdit}
                title={t('tooltips:redoButton')}
              >
                {t('common:redoButton')}
              </ControlButton>
            </>
          ) : (
            <>
              {/* Primary Actions */}
              <ControlButton
                onClick={onNewPrompt}
                iconName="plus"
                aria-label={t('common:newButton')}
                title={t('tooltips:newButtonTooltip')}
                disabled={anyActionInProgress}
                variant="secondary"
              >
                {t('common:newButton')}
              </ControlButton>
              <ControlButton
                onClick={onGeneratePrompt}
                iconName="sparkles"
                aria-label={t('common:updateButton')}
                title={t('tooltips:updateButtonTooltip')}
                disabled={anyActionInProgress}
                isLoading={isLoading}
                variant="secondary"
              >
                {isLoading ? t('common:loadingUpdateButton') : t('common:updateButton')}
              </ControlButton>
              <ControlButton
                onClick={() => onGenerateVideo(currentPromptText)}
                iconName="video"
                aria-label="Generate video"
                disabled={anyActionInProgress || isVeoAspectRatioInvalid}
                isLoading={isGeneratingVideo}
                variant="primary"
                title={
                  isVeoAspectRatioInvalid
                    ? t('errors:errorInvalidAspectRatioForVeo')
                    : t('tooltips:generateVideoButton')
                }
              >
                {isGeneratingVideo
                  ? t('common:loadingVideoButton')
                  : t('common:generateVideoButton')}
              </ControlButton>

              <div className="border-l border-slate-700 h-4 mx-1"></div>

              {/* Group: Creative Tools (Dropdown) */}
              <DropdownMenu
                triggerLabel="Creative"
                triggerIcon="palette"
                isOpen={creativeMenuOpen}
                onToggle={() => setCreativeMenuOpen(!creativeMenuOpen)}
                onClose={() => setCreativeMenuOpen(false)}
              >
                <DropdownItem
                  onClick={() => {
                    onGenerateArt(currentPromptText);
                    setCreativeMenuOpen(false);
                  }}
                  iconName="image"
                  label={
                    isGeneratingArt ? t('common:loadingArtButton') : t('common:generateArtButton')
                  }
                  isLoading={isGeneratingArt}
                  disabled={anyActionInProgress}
                />
                <DropdownItem
                  onClick={() => {
                    onGenerateStoryboard(currentPromptText);
                    setCreativeMenuOpen(false);
                  }}
                  iconName="film"
                  label={
                    isGeneratingStoryboard
                      ? t('common:loadingStoryboardButton')
                      : t('common:generateStoryboardButton')
                  }
                  isLoading={isGeneratingStoryboard}
                  disabled={anyActionInProgress}
                />
                <DropdownItem
                  onClick={() => {
                    onGenerateVariations(currentPromptText);
                    setCreativeMenuOpen(false);
                  }}
                  iconName="sparkles"
                  label={
                    isGeneratingVariations
                      ? t('common:loadingVariationsButton')
                      : t('common:generateVariationsButton')
                  }
                  isLoading={isGeneratingVariations}
                  disabled={anyActionInProgress}
                />
                <DropdownItem
                  onClick={() => {
                    onRefinePrompt(currentPromptText);
                    setCreativeMenuOpen(false);
                  }}
                  iconName="magic"
                  label={isRefining ? t('common:loadingRefineButton') : t('common:refineButton')}
                  isLoading={isRefining}
                  disabled={anyActionInProgress}
                />
                <DropdownItem
                  onClick={() => {
                    onRestructurePrompt(currentPromptText);
                    setCreativeMenuOpen(false);
                  }}
                  iconName="sliders"
                  label={
                    isRestructuring
                      ? t('common:loadingRestructureButton')
                      : t('common:restructureButton')
                  }
                  isLoading={isRestructuring}
                  disabled={anyActionInProgress}
                />
              </DropdownMenu>

              {/* Group: Tools & Management (Dropdown) */}
              <DropdownMenu
                triggerLabel="Tools"
                triggerIcon="sliders"
                isOpen={toolsMenuOpen}
                onToggle={() => setToolsMenuOpen(!toolsMenuOpen)}
                onClose={() => setToolsMenuOpen(false)}
              >
                <DropdownItem
                  onClick={handleEdit}
                  iconName="edit"
                  label={t('common:editButton')}
                  disabled={anyActionInProgress}
                />
                <DropdownItem
                  onClick={onOpenTemplatesPanel}
                  iconName="template"
                  label={t('common:templatesButton')}
                  disabled={anyActionInProgress}
                />
                {onOpenStoryBoardStudio && (
                  <DropdownItem
                    onClick={() => {
                      onOpenStoryBoardStudio();
                      setToolsMenuOpen(false);
                    }}
                    iconName="film"
                    label={t('common:storyBoardButton') || 'Story Board'}
                    disabled={anyActionInProgress}
                  />
                )}
                <DropdownItem
                  onClick={onSaveToHistory}
                  iconName="save"
                  label={t('common:saveToHistoryButton')}
                  disabled={anyActionInProgress}
                />
                <DropdownItem
                  onClick={onOpenSavePresetModal}
                  iconName="plus"
                  label={t('common:saveAsPresetButton')}
                  disabled={anyActionInProgress}
                />
                <DropdownItem
                  onClick={onOpenVisualDNA}
                  iconName="dna"
                  label="Visual DNA"
                  disabled={anyActionInProgress}
                />
              </DropdownMenu>

              <div className="border-l border-slate-700 h-4 mx-1"></div>

              {/* Icons Only Group */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onShare}
                  className="p-2 rounded-lg text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors"
                  aria-label="Share prompt"
                  title={t('tooltips:shareButton')}
                >
                  <Icon name="share" className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDownload(currentPromptText)}
                  className="p-2 rounded-lg text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors"
                  aria-label="Download prompt"
                  title={t('tooltips:downloadButton')}
                >
                  <Icon name="download" className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleReadAloud}
                  disabled={anyActionInProgress}
                  className="p-2 rounded-lg text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors disabled:opacity-50"
                  aria-label="Read prompt aloud"
                  title="Read prompt aloud"
                >
                  <Icon name="audio" className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors"
                  aria-label="Copy prompt"
                  title={t('tooltips:copyButton')}
                >
                  {copied ? (
                    <Icon name="check" className="w-4 h-4 text-green-400" />
                  ) : (
                    <Icon name="copy" className="w-4 h-4" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionBar;
