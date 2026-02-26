import React, { useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

export type AppDialogSize = 'sm' | 'base' | 'lg' | 'xl' | 'full';
export type AppDialogLayer = 'modal' | 'overlay';
export type AppDialogPlacement = 'center' | 'right';

export interface AppDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  size?: AppDialogSize;
  layer?: AppDialogLayer;
  placement?: AppDialogPlacement;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  lockScroll?: boolean;
  hideBackdrop?: boolean;
  showCloseButton?: boolean;
  contentClassName?: string;
  bodyClassName?: string;
  backdropClassName?: string;
  dialogClassName?: string;
  containerClassName?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

const sizeStyles: Record<AppDialogSize, string> = {
  sm: 'max-w-md',
  base: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[min(96vw,1400px)]',
};

const layerStyles: Record<AppDialogLayer, string> = {
  modal: 'z-[var(--z-modal)]',
  overlay: 'z-[var(--z-overlay)]',
};

const placementStyles: Record<AppDialogPlacement, string> = {
  center: 'items-center justify-center',
  right: 'items-stretch justify-end',
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const SCROLL_LOCK_COUNT_ATTR = 'data-app-dialog-lock-count';
const SCROLL_LOCK_OVERFLOW_ATTR = 'data-app-dialog-prev-overflow';

const getFocusableElements = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
  );
};

export function AppDialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  headerActions,
  size = 'base',
  layer = 'modal',
  placement = 'center',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  trapFocus = true,
  restoreFocus = true,
  lockScroll = true,
  hideBackdrop = false,
  showCloseButton = true,
  contentClassName = '',
  bodyClassName = '',
  backdropClassName = '',
  dialogClassName = '',
  containerClassName = '',
  ariaLabelledBy,
  ariaDescribedBy,
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const resolvedTitleId = useMemo(
    () => (title ? (ariaLabelledBy ?? `app-dialog-${titleId}`) : undefined),
    [ariaLabelledBy, title, titleId],
  );

  useEffect(() => {
    if (!isOpen) return;

    const isTopMostDialog = () => {
      const currentDialog = dialogRef.current;
      if (!currentDialog) return false;

      const dialogs = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
      );

      return dialogs.length === 0 || dialogs[dialogs.length - 1] === currentDialog;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopMostDialog()) {
        return;
      }

      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !trapFocus) {
        return;
      }

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (
          !activeElement ||
          activeElement === first ||
          !dialogRef.current?.contains(activeElement)
        ) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (!activeElement || activeElement === last || !dialogRef.current?.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeOnEscape, onClose, trapFocus]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusable = getFocusableElements(dialogRef.current);
    const firstFocusable = focusable[0];
    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      dialogRef.current?.focus();
    }

    return () => {
      if (restoreFocus) {
        previousFocusRef.current?.focus();
      }
    };
  }, [isOpen, restoreFocus]);

  useEffect(() => {
    if (!isOpen || !lockScroll) return;

    const body = document.body;
    const currentCount = Number(body.getAttribute(SCROLL_LOCK_COUNT_ATTR) ?? '0');

    if (currentCount === 0) {
      body.setAttribute(SCROLL_LOCK_OVERFLOW_ATTR, body.style.overflow);
      body.style.overflow = 'hidden';
    }

    body.setAttribute(SCROLL_LOCK_COUNT_ATTR, String(currentCount + 1));

    return () => {
      const lockCount = Number(body.getAttribute(SCROLL_LOCK_COUNT_ATTR) ?? '1');
      const nextCount = Math.max(0, lockCount - 1);

      if (nextCount === 0) {
        const previousOverflow = body.getAttribute(SCROLL_LOCK_OVERFLOW_ATTR) ?? '';
        body.style.overflow = previousOverflow;
        body.removeAttribute(SCROLL_LOCK_COUNT_ATTR);
        body.removeAttribute(SCROLL_LOCK_OVERFLOW_ATTR);
      } else {
        body.setAttribute(SCROLL_LOCK_COUNT_ATTR, String(nextCount));
      }
    };
  }, [isOpen, lockScroll]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${layerStyles[layer]} flex ${placementStyles[placement]} p-4 ${containerClassName}`}
    >
      {!hideBackdrop && (
        <button
          type="button"
          aria-label="Close dialog"
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${backdropClassName}`}
          onClick={() => {
            if (closeOnBackdropClick) onClose();
          }}
        />
      )}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={`relative w-full ${sizeStyles[size]} max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/90 backdrop-blur-xl shadow-2xl ${dialogClassName}`}
      >
        {(title || showCloseButton || headerActions) && (
          <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 px-5 py-4">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id={resolvedTitleId} className="truncate text-lg font-semibold text-slate-100">
                  {title}
                </h2>
              )}
            </div>

            <div className="flex items-center gap-2">
              {headerActions}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                  aria-label="Close dialog"
                >
                  <Icon name="cancel" className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className={`overflow-y-auto px-5 py-4 ${bodyClassName}`}>{children}</div>

        {footer && (
          <div className={`border-t border-slate-700/60 px-5 py-4 ${contentClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default AppDialog;
