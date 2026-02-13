import React, { useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import { useAppStore } from '@core/store/useAppStore';

interface VariablesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const VariablesPanel: React.FC<VariablesPanelProps> = ({ isOpen, onClose }) => {
  const { variables, setVariable, deleteVariable } = useAppStore();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    setNewKey(val);
    setError('');
  };

  const handleAdd = () => {
    if (!newKey) {
      setError('Key is required');
      return;
    }
    if (variables[newKey] !== undefined && !confirm('Variable exists. Overwrite?')) {
      return;
    }
    setVariable(newKey, newValue);
    setNewKey('');
    setNewValue('');
  };

  const handleDelete = (key: string) => {
    if (confirm(`Delete variable {{${key}}}?`)) {
      deleteVariable(key);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-end z-[100] animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 h-full shadow-2xl border-l border-slate-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Icon name="sliders" className="w-5 h-5 text-fuchsia-400" />
              Global Variables
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Use <code className="bg-slate-700 px-1 rounded text-cyan-400">{'{{KEY}}'}</code> in
              prompts to reuse these values.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-grow overflow-y-auto">
          {/* Add New */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Add / Update Variable
            </h3>
            <div className="flex gap-2 mb-2">
              <div className="flex-shrink-0 w-1/3">
                <input
                  type="text"
                  value={newKey}
                  onChange={handleKeyChange}
                  placeholder="KEY"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-fuchsia-400 font-bold placeholder-slate-600 focus:ring-fuchsia-500 uppercase"
                />
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Value (e.g. Detective John)"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-cyan-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <button
              onClick={handleAdd}
              className="w-full py-2 bg-slate-700 hover:bg-fuchsia-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="plus" className="w-3 h-3" />
              Set Variable
            </button>
          </div>

          {/* List */}
          <div className="space-y-3">
            {Object.entries(variables).length === 0 ? (
              <p className="text-center text-slate-500 text-sm italic py-8">
                No variables defined.
              </p>
            ) : (
              Object.entries(variables).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700 hover:border-slate-600 group"
                >
                  <div className="flex-shrink-0 bg-fuchsia-500/10 text-fuchsia-400 px-2 py-1 rounded text-xs font-bold border border-fuchsia-500/20 font-mono">
                    {`{{${key}}}`}
                  </div>
                  <div className="flex-grow min-w-0">
                    <input
                      type="text"
                      value={String(value)}
                      onChange={(e) => setVariable(key, e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-sm text-slate-300 focus:ring-0"
                    />
                  </div>
                  <button
                    onClick={() => handleDelete(key)}
                    className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariablesPanel;
