
import React, { useState, useEffect } from 'react';
import { PromptState, VisualDNA } from '../types';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';

interface VisualDNAModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedDNAs: VisualDNA[];
  onSaveDNA: (name: string, styleParams: Partial<PromptState>) => void;
  onApplyDNA: (dna: VisualDNA) => void;
  onDeleteDNA: (id: string) => void;
  currentPromptState: PromptState;
  uiStrings: any;
}

const extractStyleDNA = (state: PromptState): Partial<PromptState> => {
    // Only extract style-related parameters
    return {
        artStyle: state.artStyle,
        customArtStyle: state.customArtStyle,
        lightingStyle: state.lightingStyle,
        colorPalette: state.colorPalette,
        visualEffect: state.visualEffect,
        cameraMovement: state.cameraMovement,
        cameraDistance: state.cameraDistance,
        lensType: state.lensType,
        aspectRatio: state.aspectRatio,
        voiceStyle: state.voiceStyle,
        ambientSound: state.ambientSound,
        soundEffectsIntensity: state.soundEffectsIntensity,
        motionIntensity: state.motionIntensity,
        creativityLevel: state.creativityLevel,
        resolution: state.resolution,
        veoModel: state.veoModel,
        targetModel: state.targetModel
    } as any;
};

const VisualDNAModal: React.FC<VisualDNAModalProps> = ({ 
    isOpen, onClose, savedDNAs, onSaveDNA, onApplyDNA, onDeleteDNA, currentPromptState, uiStrings 
}) => {
    const [newDNAName, setNewDNAName] = useState('');
    const [previewDNA, setPreviewDNA] = useState<VisualDNA | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSave = () => {
        if (!newDNAName.trim()) return;
        const styleParams = extractStyleDNA(currentPromptState);
        onSaveDNA(newDNAName.trim(), styleParams);
        setNewDNAName('');
    };

    const handleApply = (dna: VisualDNA) => {
        onApplyDNA(dna);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[80] p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-slate-900/80 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <Icon name="dna" className="w-6 h-6 text-cyan-400" />
                            Visual DNA
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Extract, save, and reuse the stylistic essence of your scenes.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
                    {/* Left: DNA Library */}
                    <div className="flex-1 p-6 border-r border-slate-700/50 flex flex-col min-w-0 bg-slate-900/30">
                        <div className="mb-6 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                            <h3 className="text-sm font-semibold text-cyan-300 mb-2 uppercase tracking-wider">Extract Current Style</h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newDNAName}
                                    onChange={(e) => setNewDNAName(e.target.value)}
                                    placeholder="e.g., Cyber Noir V2"
                                    className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500"
                                />
                                <button 
                                    onClick={handleSave}
                                    disabled={!newDNAName.trim()}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Extract
                                </button>
                            </div>
                        </div>

                        <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Saved DNA Library</h3>
                        <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                            {savedDNAs.length === 0 ? (
                                <p className="text-center text-slate-500 py-8 text-sm italic">No saved DNA strands yet.</p>
                            ) : (
                                savedDNAs.map(dna => (
                                    <div 
                                        key={dna.id}
                                        onClick={() => setPreviewDNA(dna)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 group flex justify-between items-center ${
                                            previewDNA?.id === dna.id 
                                            ? 'bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                                            : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                                        }`}
                                    >
                                        <div>
                                            <h4 className={`font-semibold text-sm ${previewDNA?.id === dna.id ? 'text-cyan-300' : 'text-slate-200'}`}>
                                                {dna.name}
                                            </h4>
                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                {new Date(dna.timestamp).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteDNA(dna.id); if(previewDNA?.id === dna.id) setPreviewDNA(null); }}
                                            className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Icon name="trash" className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: DNA Inspector */}
                    <div className="w-full md:w-80 bg-slate-900/50 p-6 flex flex-col overflow-y-auto">
                        {previewDNA ? (
                            <>
                                <h3 className="text-lg font-bold text-slate-100 mb-4 pb-2 border-b border-slate-700/50 flex items-center gap-2">
                                    <Icon name="sliders" className="w-5 h-5 text-cyan-400" />
                                    {previewDNA.name}
                                </h3>
                                
                                <div className="space-y-4 mb-6">
                                    {Object.entries(previewDNA.styleParams).map(([key, value]) => {
                                        if (!value || value === 'Any' || value === 'None' || value === 'Static shot' || value === 'Medium shot') return null;
                                        return (
                                            <div key={key} className="flex flex-col">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-0.5">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                                <span className="text-sm text-slate-300 bg-slate-800/50 px-2 py-1.5 rounded border border-slate-700/30">
                                                    {String(value)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-auto">
                                    <button 
                                        onClick={() => handleApply(previewDNA)}
                                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                                    >
                                        <Icon name="magic" className="w-5 h-5" />
                                        Inject Visual DNA
                                    </button>
                                    <p className="text-center text-[10px] text-slate-500 mt-3 px-2">
                                        This will update style settings but keep your core Idea and Subject intact.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
                                <div className="p-4 bg-slate-800/30 rounded-full">
                                    <Icon name="dna" className="w-12 h-12 opacity-30" />
                                </div>
                                <p className="text-sm">Select a saved DNA strand from the library to view its genetic makeup.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisualDNAModal;
