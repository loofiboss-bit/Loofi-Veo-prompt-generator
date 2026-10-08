import { studioCheckDetail } from './studioValidationPresentation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { VideoPromptArtifactInput, VideoPromptVariant } from '@core/types/promptArtifact';
import { compileVideoPromptArtifact } from '@core/services/promptStudioService';
import { STUDIO_CAPABILITIES } from '@core/config/studioCapabilities';

interface ModelArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  input: VideoPromptArtifactInput;
  onSelectTarget: (target: VideoPromptArtifactInput['target']) => void | Promise<void>;
}

export const ARENA_TARGETS: VideoPromptArtifactInput['target'][] = [
  'flow-veo',
  'wan-video',
  'kling',
  'runway-gen3',
  'sora',
  'minimax-hailuo',
  'luma-ray',
  'veo-api',
];

export function ModelArenaModal({ isOpen, onClose, input, onSelectTarget }: ModelArenaModalProps) {
  const { t } = useTranslation('studio');
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [error, setError] = useState<'copyError' | 'selectError' | null>(null);
  const [selecting, setSelecting] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const results = useMemo(
    () =>
      isOpen
        ? ARENA_TARGETS.map((target) => {
            const artifact = compileVideoPromptArtifact({ ...input, target });
            return { target, artifact, primary: artifact.primary as VideoPromptVariant };
          })
        : [],
    [input, isOpen],
  );

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setCopiedTarget(null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, summary, [tabindex="0"]',
        ) ?? [],
      ).filter((element) => {
        if (element.hasAttribute('disabled')) return false;
        const details = element.closest('details');
        return !details || details.open || element === details.querySelector('summary');
      });
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.current?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialog.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialog.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;
  const copy = async (target: string, text: string) => {
    setError(null);
    setCopiedTarget(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
    } catch {
      setError('copyError');
    }
  };
  const select = async (target: VideoPromptArtifactInput['target']) => {
    setSelecting(true);
    setError(null);
    try {
      await onSelectTarget(target);
      onClose();
    } catch {
      setError('selectError');
    } finally {
      setSelecting(false);
    }
  };
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="arena-modal-title"
        aria-describedby="arena-modal-description"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border-primary)',
        }}
      >
        <div
          className="flex items-start justify-between gap-4 border-b p-4"
          style={{ borderColor: 'var(--color-border-primary)' }}
        >
          <div>
            <h2 id="arena-modal-title" className="text-lg font-semibold">
              {t('arenaTitle', { defaultValue: 'Model Comparison Arena' })}
            </h2>
            <p
              id="arena-modal-description"
              className="mt-1 text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('arenaDescription', {
                defaultValue:
                  'Compare prompt packages from the same brief. This comparison does not rate generated video quality.',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-2"
            aria-label={t('close', { defaultValue: 'Close' })}
          >
            ×
          </button>
        </div>
        {error && (
          <p role="alert" className="px-4 py-2">
            {t(error, {
              defaultValue:
                error === 'copyError'
                  ? 'Copy failed. Try again or select and copy the text manually.'
                  : 'Target selection failed. Your current draft is preserved.',
            })}
          </p>
        )}
        <div
          className="grid grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2 lg:grid-cols-3"
          aria-busy={selecting}
        >
          {results.map(({ target, artifact, primary }) => {
            const active = input.target === target;
            const capability = STUDIO_CAPABILITIES[target];
            return (
              <section
                key={target}
                aria-label={capability.label}
                className="flex flex-col gap-3 rounded-xl border p-4"
                style={{
                  background: 'var(--color-bg-secondary)',
                  borderColor: active ? 'var(--color-primary-500)' : 'var(--color-border-primary)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{capability.label}</h3>
                  {active && (
                    <span className="text-xs">{t('active', { defaultValue: 'Active' })}</span>
                  )}
                </div>
                <p className="text-xs">
                  {t(capability.handoff === 'manual' ? 'handoffManual' : 'handoffInternal', {
                    defaultValue:
                      capability.handoff === 'manual'
                        ? 'Manual copy handoff'
                        : 'Internal generation requires approval',
                  })}
                </p>
                <details>
                  <summary className="cursor-pointer text-xs">
                    {t('prompt', { defaultValue: 'Prompt' })}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap break-words text-xs">{primary.prompt}</p>
                </details>
                <details>
                  <summary className="cursor-pointer text-xs">
                    {t('negative', { defaultValue: 'Negative prompt' })}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap break-words text-xs">
                    {primary.negativePrompt}
                  </p>
                </details>
                <details>
                  <summary className="cursor-pointer text-xs">
                    {t('settings', { defaultValue: 'Settings' })}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap break-words text-xs">
                    {primary.copySettingsChecklist}
                  </p>
                </details>
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {artifact.validation
                    .filter(
                      (check) =>
                        check.id === 'target-compatibility' || check.id.startsWith('provider-'),
                    )
                    .map((check) => (
                      <p key={check.id} className="mb-1">
                        {studioCheckDetail(check, t)}
                      </p>
                    ))}
                </div>
                <div className="mt-auto flex gap-2">
                  <button
                    type="button"
                    disabled={selecting}
                    onClick={() => void copy(target, primary.copyAll)}
                    className="flex-1 rounded-lg border px-2 py-2 text-xs"
                  >
                    {copiedTarget === target
                      ? t('copied', { defaultValue: 'Copied' })
                      : t('arenaCopy', { defaultValue: 'Copy prompt package' })}
                  </button>
                  <button
                    type="button"
                    disabled={active || selecting}
                    onClick={() => void select(target)}
                    className="rounded-lg border px-2 py-2 text-xs"
                  >
                    {active
                      ? t('selected', { defaultValue: 'Selected' })
                      : t('useTarget', { defaultValue: 'Use Target' })}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
        <div
          className="flex justify-end border-t p-4"
          style={{ borderColor: 'var(--color-border-primary)' }}
        >
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-xs">
            {t('close', { defaultValue: 'Close' })}
          </button>
        </div>
        <span role="status" className="sr-only">
          {copiedTarget ? t('copied', { defaultValue: 'Copied' }) : ''}
        </span>
      </div>
    </div>,
    document.body,
  );
}
