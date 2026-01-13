
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import SelectInput from './SelectInput';
import TextAreaInput from './TextAreaInput';
import { CharacterProfile, Shot } from '../types';
import { CINEMATIC_SEQUENCES, SequenceTemplate } from '../templates/cinematicSequences';

interface AutoBlockerModalProps {
    isOpen: boolean;
    onClose: () => void;
    savedCharacters: CharacterProfile[];
    onGenerate: (shots: Partial<Shot>[]) => void;
    uiStrings: any;
}

const AutoBlockerModal: React.FC<AutoBlockerModalProps> = ({ 
    isOpen, onClose, savedCharacters, onGenerate, uiStrings 
}) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(CINEMATIC_SEQUENCES[0].id);
    const [char1Id, setChar1Id] = useState<string>('');
    const [char2Id, setChar2Id] = useState<string>('');
    const [context, setContext] = useState<string>('');

    // Derived state
    const currentTemplate = CINEMATIC_SEQUENCES.find(t => t.id === selectedTemplateId) || CINEMATIC_SEQUENCES[0];
    
    // Character options
    const charOptions = [
        { value: '', label: 'Select Character...' },
        ...savedCharacters.map(c => ({ value: c.id, label: c.name }))
    ];

    const templateOptions = CINEMATIC_SEQUENCES.map(t => ({ value: t.id, label: t.label }));

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleGenerate = () => {
        const char1 = savedCharacters.find(c => c.id === char1Id);
        const char2 = savedCharacters.find(c => c.id === char2Id);
        
        // Fallback names if characters aren't selected
        const name1 = char1 ? char1.name : "Character A";
        const name2 = char2 ? char2.name : "Character B";
        const contextText = context.trim() || "the situation";

        const newShots: Partial<Shot>[] = currentTemplate.shots.map(templateShot => {
            let processedAction = templateShot.action
                .replace(/{char1}/g, name1)
                .replace(/{char2}/g, name2)
                .replace(/{context}/g, contextText);

            let assignedCharId = '';
            if (templateShot.focusChar === 1) assignedCharId = char1Id;
            else if (templateShot.focusChar === 2) assignedCharId = char2Id;
            // 'both' typically leaves ID empty for generic prompts or picks char1 as lead
            else if (templateShot.focusChar === 'both') assignedCharId = char1Id || char2Id;

            return {
                action: processedAction,
                camera: templateShot.camera,
                characterId: assignedCharId,
                visualLink: true // Auto-link sequences for continuity
            };
        });

        onGenerate(newShots);
        onClose();
    };

    if (!isOpen) return null;

    const isReady = char1Id !== '' && (currentTemplate.requiredCharacters < 2 || char2Id !== '');

    return (
        <div 
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[90] p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-slate-900/80 backdrop-blur-xl w-full max-w-xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-slate-700/50 bg-slate-900/50">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Icon name="video" className="w-6 h-6 text-fuchsia-400" />
                        Auto-Block Scene
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </header>

                <div className="p-6 space-y-6">
                    <p className="text-sm text-slate-300">
                        Automatically generate a storyboard sequence using standard cinematic templates.
                    </p>

                    <SelectInput 
                        label="Sequence Type"
                        name="sequenceType"
                        value={selectedTemplateId}
                        options={templateOptions}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        info={currentTemplate.description}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <SelectInput 
                            label="Cast Character A"
                            name="char1"
                            value={char1Id}
                            options={charOptions}
                            onChange={(e) => setChar1Id(e.target.value)}
                        />
                        {currentTemplate.requiredCharacters > 1 && (
                            <SelectInput 
                                label="Cast Character B"
                                name="char2"
                                value={char2Id}
                                options={charOptions}
                                onChange={(e) => setChar2Id(e.target.value)}
                            />
                        )}
                    </div>

                    <TextAreaInput 
                        label="Context / Topic"
                        name="context"
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="e.g. arguing about the map directions, searching for the artifact..."
                        rows={2}
                        info="This replaces {context} in the templates."
                    />

                    <button
                        onClick={handleGenerate}
                        disabled={!isReady}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                            isReady 
                            ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-fuchsia-900/20 transform hover:scale-[1.02]' 
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        <Icon name="magic" className="w-5 h-5" />
                        Generate {currentTemplate.shots.length} Shots
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AutoBlockerModal;
