/**
 * Modal Component - v1.4.0
 * Reusable modal with backdrop, animations, and focus trap
 */

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'base' | 'lg' | 'xl';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

let openModalCount = 0;
let previousBodyOverflow = '';

function isTopDialog(dialog: HTMLElement | null): boolean {
  const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
  return dialog !== null && dialogs.item(dialogs.length - 1) === dialog;
}

function focusableControls(dialog: HTMLElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((control) => {
    if (control.tabIndex < 0 || control.closest('[hidden], [inert], [aria-hidden="true"]'))
      return false;
    const closedDetails = control.closest('details:not([open])');
    if (closedDetails && !closedDetails.querySelector('summary')?.contains(control)) return false;
    for (
      let element: HTMLElement | null = control;
      element && element !== dialog;
      element = element.parentElement
    ) {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  });
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'base',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
}) => {
  const { t } = useTranslation('common');
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Size styles
  const sizeStyles = {
    sm: 'max-w-md',
    base: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTopDialog(modalRef.current)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;
    const modal = modalRef.current;

    // Focus first focusable element in modal
    if (modal && isTopDialog(modal)) {
      (focusableControls(modal)[0] ?? modal).focus();
    }

    // Restore focus on unmount
    return () => {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      const topDialog = dialogs.item(dialogs.length - 1);
      const previous = previousFocusRef.current;
      if (previous && (!topDialog || topDialog === modal || topDialog.contains(previous)))
        previous.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current || !isTopDialog(modalRef.current)) return;
      const controls = focusableControls(modalRef.current);
      if (!controls.length) {
        event.preventDefault();
        modalRef.current.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || !modalRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !modalRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapTab);
    return () => document.removeEventListener('keydown', trapTab);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    if (openModalCount === 0) previousBodyOverflow = document.body.style.overflow;
    openModalCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      openModalCount -= 1;
      if (openModalCount === 0) document.body.style.overflow = previousBodyOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-label={t('closeModal', 'Close modal')}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative
          ${sizeStyles[size]}
          w-full
          bg-white dark:bg-slate-900
          rounded-xl
          shadow-2xl
          animate-scale-in
          flex flex-col
          max-h-[90vh]
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            {title && (
              <h2 id={titleId} className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  p-2
                  rounded-lg
                  text-slate-400 hover:text-slate-600
                  dark:text-slate-500 dark:hover:text-slate-300
                  hover:bg-slate-100 dark:hover:bg-slate-800
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
                aria-label={t('closeModal', 'Close modal')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
