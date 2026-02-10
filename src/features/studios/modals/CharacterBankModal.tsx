
import React, { useState, useEffect } from 'react';
import { CharacterProfile, SelectOption } from '@core/types';
import Icon from '@shared/components/ui/Icon';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import SelectInput from '@shared/components/ui/SelectInput';
import { 
    getCharacterAges, 
    getCharacterGenders, 
    getCharacterEthnicityOptions, 
    getCharacterSkinTones 
} from '@core/constants';
import { useAppStore } from '@core/store/useAppStore';

interface CharacterBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Removed savedCharacters, onSave, onDelete props - accessed via store now
    onSelectCharacter: (profile: CharacterProfile) => void;
    uiStrings: any;
    language: 'en' | 'sv' | 'es' | 'fr' | 'de';
}

const CharacterBankModal: React.FC<CharacterBankModalProps> = ({
    isOpen, onClose, onSelectCharacter, uiStrings, language
}) => {
    const { characterBank, addCharacter, updateCharacter, deleteCharacter } = useAppStore();
    const t = uiStrings.characterBank;
    const [view, setView] = useState<'grid' | 'form'>('grid');
    const [formData, setFormData] = useState<CharacterProfile>({
        id: '',
        name: '',
        attributes: { age: 'Any', gender: 'Any', ethnicity: 'Any', bodyType: '', skinTone: 'Any' },
        appearance: { hair: '', eyes: '', distinguishingFeatures: '' },
        wardrobe: '',
        lockedSeed: undefined,
        visualPrompt: '',
        fixedSeed: null,
        negativePrompt: ''
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleCreateNew = () => {
        setFormData({
            id: Date.now().toString(),
            name: '',
            attributes: { age: 'Any', gender: 'Any', ethnicity: 'Any', bodyType: '', skinTone: 'Any' },
            appearance: { hair: '', eyes: '', distinguishingFeatures: '' },
            wardrobe: '',
            lockedSeed: Math.floor(Math.random() * 1000000),
            visualPrompt: '',
            fixedSeed: Math.floor(Math.random() * 1000000),
            negativePrompt: ''
        });
        setView('form');
    };

    const handleEdit = (char: CharacterProfile) => {
        setFormData({ ...char });
        setView('form');
    };

    const handleSave = () => {
        if (!formData.name.trim()) return;
        
        // Check if ID exists to update, else add
        const exists = characterBank.some(c => c.id === formData.id);
        if (exists) {
            updateCharacter(formData.id, formData);
        } else {
            addCharacter(formData);
        }
        
        setView('grid');
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t.deleteConfirm)) {
            deleteCharacter(id);
        }
    };

    // Options for selects
    const ageOptions = getCharacterAges(language);
    const genderOptions = getCharacterGenders(language);
    const ethnicityOptions = getCharacterEthnicityOptions(language);
    const skinToneOptions = getCharacterSkinTones(language);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[80] p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-slate-900/80 backdrop-blur-xl w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <Icon name="users" className="w-6 h-6 text-cyan-400" />
                            {t.title}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Manage persistent actors for consistent storytelling.</p>
                    </div>
                    <div className="flex gap-3">
                        {view === 'grid' && (
                            <button
                                onClick={handleCreateNew}
                                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold shadow-lg transition-transform hover:scale-105"
                            >
                                <Icon name="plus" className="w-4 h-4" />
                                {t.createButton}
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                            <Icon name="cancel" className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <div className="flex-grow overflow-y-auto p-6">
                    {view === 'grid' ? (
                        characterBank.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <Icon name="user" className="w-16 h-16 opacity-20 mb-4" />
                                <p>{t.empty}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {characterBank.map(char => (
                                    <div key={char.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/30 transition-all group relative">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-slate-200 text-lg truncate">{char.name}</h3>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(char)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded">
                                                    <Icon name="edit" className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(char.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded">
                                                    <Icon name="trash" className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-sm text-slate-400 mb-4">
                                            <p>{char.attributes.gender} • {char.attributes.age}</p>
                                            <p className="line-clamp-2 italic text-slate-500">{char.visualPrompt || char.wardrobe}</p>
                                        </div>
                                        <button 
                                            onClick={() => { onSelectCharacter(char); onClose(); }}
                                            className="w-full py-2 bg-slate-700 hover:bg-cyan-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                        >
                                            {t.useButton}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        // Form View
                        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
                            <TextAreaInput
                                label={t.nameLabel}
                                name="charName"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Character Name (e.g. Detective Smith)"
                                rows={1}
                                autoFocus
                            />
                            
                            {/* Visual DNA Field - Prominent */}
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-indigo-500/20">
                                <TextAreaInput
                                    label="Visual DNA (Identity Lock)"
                                    name="charVisualPrompt"
                                    value={formData.visualPrompt}
                                    onChange={(e) => setFormData({ ...formData, visualPrompt: e.target.value })}
                                    placeholder="Dense physical description used for consistent generation..."
                                    rows={4}
                                    info="This description overrides other appearance settings when applying the character."
                                />
                                <div className="mt-2 flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs text-slate-400 block mb-1">Fixed Seed</label>
                                        <input 
                                            type="number" 
                                            value={formData.fixedSeed ?? ''}
                                            onChange={(e) => setFormData({ ...formData, fixedSeed: e.target.value ? parseInt(e.target.value) : null })}
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                                            placeholder="Random if empty"
                                        />
                                    </div>
                                    <div className="flex-[2]">
                                        <label className="text-xs text-slate-400 block mb-1">Negative Prompt</label>
                                        <input 
                                            type="text" 
                                            value={formData.negativePrompt}
                                            onChange={(e) => setFormData({ ...formData, negativePrompt: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                                            placeholder="Exclusions (e.g. beard, hat)"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SelectInput
                                    label={t.ageLabel}
                                    name="charAge"
                                    options={ageOptions}
                                    value={formData.attributes.age}
                                    onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, age: e.target.value } })}
                                />
                                <SelectInput
                                    label={t.genderLabel}
                                    name="charGender"
                                    options={genderOptions}
                                    value={formData.attributes.gender}
                                    onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, gender: e.target.value } })}
                                />
                                <SelectInput
                                    label={t.ethnicityLabel}
                                    name="charEthnicity"
                                    options={ethnicityOptions}
                                    value={formData.attributes.ethnicity}
                                    onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, ethnicity: e.target.value } })}
                                />
                                <SelectInput
                                    label={t.skinToneLabel}
                                    name="charSkinTone"
                                    options={skinToneOptions}
                                    value={formData.attributes.skinTone}
                                    onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, skinTone: e.target.value } })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TextAreaInput
                                    label={t.bodyTypeLabel}
                                    name="charBodyType"
                                    value={formData.attributes.bodyType}
                                    onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, bodyType: e.target.value } })}
                                    placeholder="e.g. Athletic, Tall, Slender"
                                    rows={1}
                                />
                                <TextAreaInput
                                    label={t.hairLabel}
                                    name="charHair"
                                    value={formData.appearance.hair}
                                    onChange={(e) => setFormData({ ...formData, appearance: { ...formData.appearance, hair: e.target.value } })}
                                    placeholder="e.g. Short messy brown hair"
                                    rows={1}
                                />
                                <TextAreaInput
                                    label={t.eyesLabel}
                                    name="charEyes"
                                    value={formData.appearance.eyes}
                                    onChange={(e) => setFormData({ ...formData, appearance: { ...formData.appearance, eyes: e.target.value } })}
                                    placeholder="e.g. Piercing blue eyes"
                                    rows={1}
                                />
                                <TextAreaInput
                                    label={t.featuresLabel}
                                    name="charFeatures"
                                    value={formData.appearance.distinguishingFeatures}
                                    onChange={(e) => setFormData({ ...formData, appearance: { ...formData.appearance, distinguishingFeatures: e.target.value } })}
                                    placeholder="e.g. Scar on left cheek, tattoos"
                                    rows={1}
                                />
                            </div>

                            <TextAreaInput
                                label={t.wardrobeLabel}
                                name="charWardrobe"
                                value={formData.wardrobe}
                                onChange={(e) => setFormData({ ...formData, wardrobe: e.target.value })}
                                placeholder="Detailed clothing description..."
                                rows={3}
                            />

                            <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                                <button
                                    onClick={() => setView('grid')}
                                    className="px-6 py-2 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!formData.name.trim()}
                                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                                >
                                    {t.saveButton}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CharacterBankModal;
