/**
 * ConfirmDialog
 *
 * Lightweight confirmation dialog built on AppDialog.
 * Replaces native `window.confirm()` calls with an accessible, styled modal.
 */

import { AppDialog } from './AppDialog';
import Button from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button with the `danger` variant for destructive actions. */
  danger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  message,
  title = 'Confirm',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
}: ConfirmDialogProps) {
  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  );

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={footer}
      closeOnEscape
    >
      <p className="text-sm text-neutral-300">{message}</p>
    </AppDialog>
  );
}
