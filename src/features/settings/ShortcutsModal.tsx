import React from 'react';
import { useTranslation } from 'react-i18next';
import AppDialog from '@shared/components/ui/AppDialog';
import Icon from '@shared/components/ui/Icon';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutRow: React.FC<{ keys: string[]; label: string }> = ({ keys, label }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
    <span className="text-sm text-slate-300">{label}</span>
    <div className="flex gap-1 shrink-0">
      {keys.map((k, i) => (
        <kbd
          key={`${k}-${i}`}
          className="rounded border border-slate-600 bg-slate-700 px-2 py-1 font-mono text-xs font-bold text-blue-400 shadow-sm"
        >
          {k}
        </kbd>
      ))}
    </div>
  </div>
);

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('common');

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      size="base"
      title={
        <span className="flex items-center gap-2 text-lg font-bold text-slate-100">
          <Icon name="help" className="h-5 w-5 text-blue-400" />
          {t('shortcuts.title', 'Keyboard Shortcuts')}
        </span>
      }
      bodyClassName="p-6"
    >
      <div className="grid gap-6">
        <section>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            {t('shortcuts.general', 'General')}
          </h4>
          <ShortcutRow
            keys={['Ctrl', 'K']}
            label={t('shortcuts.commandPalette', 'Open Command Palette')}
          />
          <ShortcutRow
            keys={['Ctrl', 'Enter']}
            label={t('shortcuts.buildPrompt', 'Build Prompt in Studio')}
          />
          <ShortcutRow keys={['?', 'F1']} label={t('shortcuts.openHelp', 'Open Help Panel')} />
          <ShortcutRow
            keys={['Ctrl', 'Shift', 'S']}
            label={t('shortcuts.savePreset', 'Save Preset')}
          />
          <ShortcutRow keys={['Esc']} label={t('shortcuts.closeDialog', 'Close Dialog')} />
        </section>

        <section>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            {t('shortcuts.editing', 'Editing')}
          </h4>
          <ShortcutRow keys={['Ctrl', 'Z']} label={t('shortcuts.undo', 'Undo')} />
          <ShortcutRow keys={['Ctrl', 'Shift', 'Z']} label={t('shortcuts.redo', 'Redo')} />
        </section>

        <section>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            {t('shortcuts.timeline', 'Timeline Player')}
          </h4>
          <ShortcutRow keys={['Space']} label={t('shortcuts.playPause', 'Play / Pause')} />
          <ShortcutRow
            keys={['J', 'K', 'L']}
            label={t('shortcuts.shuttle', 'Reverse / Pause / Forward')}
          />
          <ShortcutRow
            keys={['←', '→']}
            label={t('shortcuts.stepFrame', 'Step Backward / Forward')}
          />
        </section>
      </div>
    </AppDialog>
  );
};

export default ShortcutsModal;
