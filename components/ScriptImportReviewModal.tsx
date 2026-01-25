
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import SelectInput from './SelectInput';
import TextAreaInput from './TextAreaInput';
import { Shot } from '../types';
import { generateAndAssemble } from '../services/productionPipeline';

interface ScriptImportReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialShots: Partial<Shot>[];
    characterOptions: { value: string, label: string }[];
    locationOptions: { value: string, label: string }[];
    onImport: (shots: Partial<Shot>[]) => void;
}

const ScriptImportReviewModal: React.FC<ScriptImportReviewModalProps> = ({ 
    isOpen, onClose, initialShots, characterOptions, locationOptions, onImport 
}) => {
    const [shots, setShots] = useState<Partial<Shot>[]>([]);
    const [processingIndices, setProcessingIndices] = useState<number[]>([]);

    useEffect(() => {
        if (isOpen) {
            setShots(initialShots);
        }
    }, [isOpen, initialShots]);

    const updateShot = (index: number, field: keyof Shot, value: any) => {
        const updated = [...shots];
        updated[index] = { ...updated[index], [field]: value };
        setShots(updated);
    };

    const removeShot = (index: number) => {
        const updated = shots.filter((_, i) => i !== index);
        setShots(updated);
    };

    const handleConfirm = () => {
        onImport(shots);
        onClose();
    };

    const handleAssembleShot = async (index: number) => {
        if (processingIndices.includes(index)) return;
        
        setProcessingIndices(prev => [...prev, index]);
        try {
            const shot = shots[index];
            await generateAndAssemble(shot);
        } catch (e) {
            console.error("Assembly failed", e);
            alert("Failed to assemble scene. Check console.");
        } finally {
            setProcessingIndices(prev => prev.filter(i => i !== index));
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[100] p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-slate-900/80 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[85vh] overflow-hidden animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <Icon name="magic" className="w-6 h-6 text-fuchsia-400" />
                            Review Smart Import
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            The AI has parsed your script and attempted to auto-cast characters and locations.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-white transition-colors">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-grow p-6 overflow-y-auto space-y-4">
                    {shots.map((shot, index) => {
                        const isProcessing = processingIndices.includes(index);
                        return (
                            <div key={index} className={`bg-slate-800/40 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start relative group ${isProcessing ? 'border-yellow-500/50' : ''}`}>
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleAssembleShot(index)}
                                        disabled={isProcessing}
                                        className="p-1.5 bg-slate-700 hover:bg-yellow-600 text-slate-300 hover:text-white rounded transition-colors flex items-center gap-1"
                                        title="Instant Assemble: Generates Video & Audio and places on Timeline immediately."
                                    >
                                        {isProcessing ? <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" /> : <Icon name="zap" className="w-3.5 h-3.5 text-yellow-400" />}
                                        <span className="text-[10px] font-bold uppercase">Assemble</span>
                                    </button>
                                    <button onClick={() => removeShot(index)} className="p-1.5 bg-slate-700 hover:bg-red-600 text-slate-500 hover:text-white rounded transition-colors">
                                        <Icon name="trash" className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-600">
                                    {index + 1}
                                </div>

                                <div className="flex-grow space-y-3 w-full">
                                    <TextAreaInput
                                        label="Action"
                                        name={`action-${index}`}
                                        value={shot.action || ''}
                                        onChange={(e) => updateShot(index, 'action', e.target.value)}
                                        rows={2}
                                    />
                                    {shot.dialogueText && (
                                        <div className="p-2 bg-slate-900/50 rounded border border-slate-700/50 text-xs text-slate-400 italic">
                                            "{shot.dialogueText}"
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SelectInput
                                            label={
                                                <span className="flex items-center gap-2">
                                                    Actor 
                                                    {shot.characterId && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 rounded border border-green-500/30">Auto-Matched</span>}
                                                </span>
                                            }
                                            name={`char-${index}`}
                                            value={shot.characterId || ''}
                                            options={characterOptions}
                                            onChange={(e) => updateShot(index, 'characterId', e.target.value)}
                                        />
                                        <SelectInput
                                            label={
                                                <span className="flex items-center gap-2">
                                                    Location 
                                                    {shot.locationId && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 rounded border border-green-500/30">Auto-Matched</span>}
                                                </span>
                                            }
                                            name={`loc-${index}`}
                                            value={shot.locationId || ''}
                                            options={locationOptions}
                                            onChange={(e) => updateShot(index, 'locationId', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <footer className="p-5 border-t border-slate-700/50 bg-slate-900/50 flex justify-end gap-3 flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2"
                    >
                        <Icon name="check" className="w-4 h-4" />
                        Import to Storyboard
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ScriptImportReviewModal;
