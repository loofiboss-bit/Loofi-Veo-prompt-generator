
import React, { useEffect } from 'react';
import { HistoryEntry } from '../types';
import Icon from './Icon';

interface HistoryPanelProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  uiStrings: {
    title: string;
    clear: string;
    clearConfirm: string;
    empty: string;
    use: string;
    delete: string;
    deleteConfirm: string;
  };
  language: 'en' | 'sv';
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onSelect, onClear, onDelete, onClose, uiStrings, language }) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  const handleDelete = (id: string) => {
      if(window.confirm(uiStrings.deleteConfirm)) {
          onDelete(id);
      }
  };

  const handleClear = () => {
    if (window.confirm(uiStrings.clearConfirm)) {
      onClear();
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-panel-title"
    >
      <div 
        className="bg-slate-900/70 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="history-panel-title" className="text-lg font-semibold text-slate-100">{uiStrings.title}</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close history panel"
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </header>
        
        <div className="p-4 overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>{uiStrings.empty}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {history.map(entry => (
                <li key={entry.id} className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cyan-400 truncate pr-2" title={entry.params.idea}>
                            {entry.params.idea}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {new Date(entry.timestamp).toLocaleString(language, { 
                                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                        </p>
                    </div>
                    <div className="flex items-center flex-shrink-0 space-x-2">
                        <button
                            onClick={() => onSelect(entry)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500"
                        >
                            {uiStrings.use}
                        </button>
                        <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-2 rounded-md transition-colors text-slate-400 hover:text-red-500 hover:bg-slate-700"
                            aria-label={`${uiStrings.delete} "${entry.params.idea}"`}
                        >
                            <Icon name="trash" className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {history.length > 0 && (
            <footer className="p-4 border-t border-slate-700 flex-shrink-0">
                <button
                    onClick={handleClear}
                    className="w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded-md transition-colors"
                >
                    {uiStrings.clear}
                </button>
            </footer>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
