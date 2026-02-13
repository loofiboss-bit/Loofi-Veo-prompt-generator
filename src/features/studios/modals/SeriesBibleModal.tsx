import React, { useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import { useAppStore } from '@core/store/useAppStore';

interface SeriesBibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const SeriesBibleModal: React.FC<SeriesBibleModalProps> = ({ isOpen, onClose, addToast }) => {
  const { seriesBible, setSeriesBible } = useAppStore();
  const [localText, setLocalText] = useState(seriesBible);

  useEffect(() => {
    if (isOpen) {
      setLocalText(seriesBible);
    }
  }, [isOpen, seriesBible]);

  const handleSave = () => {
    setSeriesBible(localText);
    addToast('Series Bible updated. AI will now enforce these rules.', 'success');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[90] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-slate-900/80 backdrop-blur-xl w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Icon name="library" className="w-6 h-6 text-amber-400" />
              Series Bible & Lore
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Define strict rules, technology levels, and world facts. The AI will rewrite prompts
              to comply.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow p-6 overflow-y-auto">
          <TextAreaInput
            label="World Rules (Bible)"
            name="seriesBible"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            placeholder="e.g. 1. The year is 1899. No modern technology exists.\n2. Magic requires a physical rune to be drawn.\n3. The sky is always purple."
            rows={12}
            info="These rules will be checked against every video generation prompt."
          />
        </div>

        <footer className="p-5 border-t border-slate-700/50 bg-slate-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2"
          >
            <Icon name="check" className="w-4 h-4" />
            Save Rules
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SeriesBibleModal;
