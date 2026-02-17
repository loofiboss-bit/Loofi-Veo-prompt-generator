import React, { useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import EmptyState from '@shared/components/EmptyState';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import { ScriptBreakdownItem, ToastMessage } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { useUIStrings } from '@shared/hooks/useUIStrings';

interface ScriptBreakdownProps {
  onClose: () => void;
  onGenerateShot: (prompt: string) => void;
  addToast: (msg: string, type: ToastMessage['type']) => void;
}

const ScriptBreakdown: React.FC<ScriptBreakdownProps> = ({ onClose, onGenerateShot, addToast }) => {
  const uiStrings = useUIStrings();
  const t = uiStrings.scriptStudio;
  const [scriptText, setScriptText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [items, setItems] = useState<ScriptBreakdownItem[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAnalyze = async () => {
    if (!scriptText.trim()) return;
    setIsAnalyzing(true);
    try {
      const results = await geminiService.analyzeScriptBreakdown(scriptText);
      setItems(results);
      addToast(`Successfully parsed ${results.length} shots.`, 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, uiStrings), 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateClick = (item: ScriptBreakdownItem) => {
    // Optimistically update status (real app might wait for signal)
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'generated' } : i)));
    onGenerateShot(item.visualPrompt);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[60] flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Icon name="file-text" className="w-6 h-6 text-fuchsia-400" />
          <h2 className="text-xl font-bold text-slate-100">{t.title}</h2>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
          <Icon name="cancel" className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow flex overflow-hidden">
        {/* Left: Input */}
        <div className="w-1/3 min-w-[320px] max-w-md bg-slate-900 border-r border-slate-700 flex flex-col p-6">
          <div className="flex-grow flex flex-col space-y-4">
            <label
              htmlFor="textarea-scriptInput"
              className="text-sm font-bold text-slate-300 uppercase tracking-wider"
            >
              Screenplay Input
            </label>
            <TextAreaInput
              label=""
              name="scriptInput"
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder={t.placeholder}
              rows={20} // fills height mostly
              className="flex-grow font-mono text-sm leading-relaxed"
            />
          </div>
          <div className="mt-6">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !scriptText.trim()}
              className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Icon name="spinner" className="w-5 h-5 animate-spin" />
                  <span>{t.analyzingButton}</span>
                </>
              ) : (
                <>
                  <Icon name="magic" className="w-5 h-5" />
                  <span>{t.analyzeButton}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Table */}
        <div className="flex-grow bg-slate-950 p-6 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon="🧩"
                title="No shots parsed yet."
                description="Paste a script and click Analyze to begin."
              />
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="p-4 w-16 text-center">{t.tableHeader.scene}</th>
                    <th className="p-4 w-1/4">{t.tableHeader.description}</th>
                    <th className="p-4">{t.tableHeader.prompt}</th>
                    <th className="p-4 w-20 text-center">{t.tableHeader.duration}</th>
                    <th className="p-4 w-32 text-right">{t.tableHeader.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                      <td className="p-4 text-center font-bold text-slate-500">{item.scene}</td>
                      <td className="p-4 font-medium text-slate-200">{item.description}</td>
                      <td className="p-4 text-slate-400 italic text-xs leading-relaxed">
                        {item.visualPrompt}
                      </td>
                      <td className="p-4 text-center font-mono text-slate-500">{item.duration}s</td>
                      <td className="p-4 text-right">
                        {item.status === 'generated' ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-xs font-bold px-3 py-1.5 bg-green-900/20 rounded-lg border border-green-900/50">
                            <Icon name="check" className="w-3 h-3" />
                            {t.generated}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleGenerateClick(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-md transition-transform hover:scale-105"
                          >
                            <Icon name="video" className="w-3 h-3" />
                            {t.generateShot}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptBreakdown;
