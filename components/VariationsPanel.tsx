import React, { useEffect } from 'react';
import Icon from './Icon';

interface VariationsPanelProps {
  variations: string[];
  isLoading: boolean;
  onSelect: (variation: string) => void;
  onClose: () => void;
  uiStrings: {
    title: string;
    use: string;
    loading: string;
    empty: string;
  };
}

const VariationsPanel: React.FC<VariationsPanelProps> = ({ variations, isLoading, onSelect, onClose, uiStrings }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-[55] p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="variations-panel-title"
        >
            <div 
                className="bg-slate-900/70 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 id="variations-panel-title" className="text-lg font-semibold text-slate-100">{uiStrings.title}</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        aria-label="Close variations panel"
                    >
                        <Icon name="cancel" className="w-5 h-5" />
                    </button>
                </header>
                
                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                            <Icon name="spinner" className="w-8 h-8 animate-spin text-cyan-400" />
                            <p className="mt-3">{uiStrings.loading}</p>
                        </div>
                    ) : variations.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <p>{uiStrings.empty}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {variations.map((variation, index) => (
                                <div key={index} className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 flex flex-col justify-between hover:border-cyan-500/50 transition-colors">
                                    <p className="text-sm text-slate-300 mb-4 flex-grow">{variation}</p>
                                    <button
                                        onClick={() => onSelect(variation)}
                                        className="w-full mt-auto px-3 py-2 text-sm font-semibold rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500"
                                    >
                                        {uiStrings.use}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VariationsPanel;