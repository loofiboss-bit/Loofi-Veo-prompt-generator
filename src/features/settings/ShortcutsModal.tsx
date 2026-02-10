
import React, { useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShortcutRow: React.FC<{ keys: string[]; label: string }> = ({ keys, label }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
        <span className="text-sm text-slate-300">{label}</span>
        <div className="flex gap-1">
            {keys.map((k, i) => (
                <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs font-mono text-cyan-400 font-bold border border-slate-600 shadow-sm">
                    {k}
                </span>
            ))}
        </div>
    </div>
);

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
    
    // Close on Escape internally handled by global hook or simple effect
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in-up"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/30">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Icon name="help" className="w-5 h-5 text-cyan-400" />
                        Keyboard Shortcuts
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <Icon name="cancel" className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 grid gap-6">
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">General</h4>
                        <ShortcutRow keys={['?']} label="Show Shortcuts" />
                        <ShortcutRow keys={['Ctrl', 'Enter']} label="Generate Prompt" />
                        <ShortcutRow keys={['Esc']} label="Close Modal" />
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Story Board</h4>
                        <ShortcutRow keys={['Shift', 'N']} label="Add New Shot" />
                        <ShortcutRow keys={['Ctrl', 'Enter']} label="Batch Generate Prompts" />
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Timeline Player</h4>
                        <ShortcutRow keys={['Space']} label="Play / Pause" />
                        <ShortcutRow keys={['←', '→']} label="Prev / Next Clip" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShortcutsModal;
