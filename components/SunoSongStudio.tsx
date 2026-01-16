
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useRef } from 'react';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { ToastMessage, SunoLyricRequest } from '../types';
import { getLanguageOptions } from '../constants';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
import Tabs from './Tabs';

interface SunoSongStudioProps {
  onClose: () => void;
  uiStrings: any;
  addToast: (message: string, type: ToastMessage['type']) => void;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  model: string;
}

const SONG_STRUCTURES = [
    { value: 'pop_standard', label: 'Standard Pop (Verse-Chorus)' },
    { value: 'ballad', label: 'Power Ballad' },
    { value: 'rap_freestyle', label: 'Rap / Freestyle' },
    { value: 'edm_build', label: 'EDM (Build & Drop)' }
];

const GENRES = [
    { value: 'Pop', label: 'Pop' },
    { value: 'Rock', label: 'Rock' },
    { value: 'Hip Hop', label: 'Hip Hop' },
    { value: 'Electronic', label: 'Electronic' },
    { value: 'Jazz', label: 'Jazz' },
    { value: 'Classical', label: 'Classical' },
    { value: 'Country', label: 'Country' },
    { value: 'R&B', label: 'R&B' },
    { value: 'Metal', label: 'Metal' },
    { value: 'Lo-Fi', label: 'Lo-Fi' }
];

const VOICES = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Duet', label: 'Duet' },
    { value: 'Choir', label: 'Choir' },
    { value: 'Robotic', label: 'Robotic' }
];

const TEMPOS = [
    { value: 'Slow', label: 'Slow (Ballad)' },
    { value: 'Medium', label: 'Medium (Standard)' },
    { value: 'Fast', label: 'Fast (Upbeat)' },
    { value: 'Very Fast', label: 'Very Fast (High Energy)' }
];

const SunoSongStudio: React.FC<SunoSongStudioProps> = ({ onClose, uiStrings, addToast, language, model }) => {
    // --- State: Lyrics Lab ---
    const [topic, setTopic] = useState('');
    const [structure, setStructure] = useState<SunoLyricRequest['structure']>('pop_standard');
    const [mood, setMood] = useState('');
    const [lyricsResult, setLyricsResult] = useState('');
    const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
    const lyricsTextareaRef = useRef<HTMLTextAreaElement>(null);

    // --- State: Style Builder ---
    const [genre, setGenre] = useState('Pop');
    const [voice, setVoice] = useState('Female');
    const [tempo, setTempo] = useState('Medium');
    const [vibeInput, setVibeInput] = useState('');
    const [styleTagsResult, setStyleTagsResult] = useState('');
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);

    const [activeTab, setActiveTab] = useState(0);
    const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // --- Handlers ---

    const handleGenerateLyrics = async () => {
        if (!topic.trim()) {
            addToast("Please enter a song topic.", 'error');
            return;
        }
        setIsGeneratingLyrics(true);
        try {
            const request: SunoLyricRequest = {
                topic,
                mood,
                structure,
                language,
                model
            };
            const result = await geminiService.generateSongLyrics(request);
            setLyricsResult(result);
            addToast("Lyrics generated.", 'success');
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsGeneratingLyrics(false);
        }
    };

    const handleGenerateTags = async () => {
        setIsGeneratingTags(true);
        try {
            // Map tempo string to approximate BPM for backend
            let bpm = 120;
            if (tempo.includes('Slow')) bpm = 80;
            else if (tempo.includes('Fast')) bpm = 140;
            else if (tempo.includes('Very Fast')) bpm = 170;

            const description = `${vibeInput} (${voice} vocals)`;
            
            const tags = await geminiService.generateSunoTags(description, genre, bpm, model);
            setStyleTagsResult(tags);
            addToast("Style tags generated.", 'success');
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsGeneratingTags(false);
        }
    };

    const handleCopy = (content: string, key: string) => {
        if (!content) return;
        navigator.clipboard.writeText(content).then(() => {
            setCopyStatus(prev => ({ ...prev, [key]: true }));
            setTimeout(() => {
                setCopyStatus(prev => ({ ...prev, [key]: false }));
            }, 2000);
            addToast('Copied to clipboard!', 'success');
        });
    };

    // --- Meta-Tag Logic ---
    const insertTag = (tag: string) => {
        const textarea = lyricsTextareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = lyricsResult;
        
        // Add newlines around block tags if not present
        const prefix = (start > 0 && text[start - 1] !== '\n') ? '\n' : '';
        const suffix = (end < text.length && text[end] !== '\n') ? '\n' : '';
        
        const insertion = `${prefix}${tag}${suffix}`;
        const newText = text.substring(0, start) + insertion + text.substring(end);

        setLyricsResult(newText);

        // Restore focus and move cursor after the inserted tag
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + insertion.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    // Dynamic Tag Helpers
    const getSoloTag = () => {
        const g = genre.toLowerCase();
        if (g.includes('rock') || g.includes('metal')) return '[Guitar Solo]';
        if (g.includes('jazz')) return '[Saxophone Solo]';
        if (g.includes('electronic') || g.includes('techno')) return '[Synth Solo]';
        if (g.includes('country')) return '[Fiddle Solo]';
        return '[Instrumental Solo]';
    };

    const getVoiceTag = () => {
        const v = voice.toLowerCase();
        if (v.includes('choir')) return '[Gospel Choir]';
        if (v.includes('female')) return '[Female Narrator]';
        if (v.includes('male')) return '[Male Narrator]';
        if (v.includes('robotic')) return '[Robot Voice]';
        return '[Spoken Word]';
    };

    return (
        <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-[130] p-4"
            onClick={onClose}
            role="dialog" aria-modal="true"
        >
            <div
                className="bg-slate-900/80 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Icon name="music" className="w-6 h-6 text-purple-400" />
                        Suno Custom Studio
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-grow p-6 overflow-hidden flex flex-col">
                    <Tabs
                        activeTabIndex={activeTab}
                        onTabChange={setActiveTab}
                        tabs={[
                            {
                                label: "Lyric Lab",
                                icon: "pencil",
                                content: (
                                    <div className="flex flex-col h-full overflow-hidden space-y-6 pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-shrink-0">
                                            <div className="space-y-4">
                                                <TextAreaInput 
                                                    label="Song Topic" 
                                                    name="topic" 
                                                    value={topic} 
                                                    onChange={(e) => setTopic(e.target.value)} 
                                                    placeholder="What is this song about?" 
                                                    rows={3} 
                                                    autoFocus
                                                />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <SelectInput 
                                                        label="Structure" 
                                                        name="structure" 
                                                        value={structure} 
                                                        onChange={(e) => setStructure(e.target.value as any)} 
                                                        options={SONG_STRUCTURES} 
                                                    />
                                                    <TextAreaInput 
                                                        label="Mood" 
                                                        name="mood" 
                                                        value={mood} 
                                                        onChange={(e) => setMood(e.target.value)} 
                                                        placeholder="e.g. Melancholic, Hype" 
                                                        rows={1}
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleGenerateLyrics}
                                                    disabled={!topic.trim() || isGeneratingLyrics}
                                                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {isGeneratingLyrics ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
                                                    Generate Lyrics
                                                </button>
                                            </div>
                                            
                                            <div className="flex flex-col h-full min-h-[300px] bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden relative">
                                                <div className="flex-shrink-0 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 p-2 flex justify-between items-center z-10">
                                                    
                                                    {/* Meta-Tag Toolbar */}
                                                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar mask-linear-fade">
                                                        <button onClick={() => insertTag('[Instrumental Break]')} className="px-2 py-1 bg-slate-700 hover:bg-purple-600 text-white text-[10px] font-bold rounded transition-colors whitespace-nowrap">
                                                            [Break]
                                                        </button>
                                                        <button onClick={() => insertTag(getSoloTag())} className="px-2 py-1 bg-slate-700 hover:bg-purple-600 text-white text-[10px] font-bold rounded transition-colors whitespace-nowrap">
                                                            {getSoloTag()}
                                                        </button>
                                                        <button onClick={() => insertTag(getVoiceTag())} className="px-2 py-1 bg-slate-700 hover:bg-purple-600 text-white text-[10px] font-bold rounded transition-colors whitespace-nowrap">
                                                            {getVoiceTag()}
                                                        </button>
                                                        <button onClick={() => insertTag('[Outro]\n[Fade Out]\n[End]')} className="px-2 py-1 bg-slate-700 hover:bg-red-500 text-white text-[10px] font-bold rounded transition-colors whitespace-nowrap">
                                                            [End]
                                                        </button>
                                                    </div>

                                                    <button 
                                                        onClick={() => handleCopy(lyricsResult, 'lyrics')}
                                                        className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${copyStatus['lyrics'] ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                                    >
                                                        {copyStatus['lyrics'] ? <Icon name="check" className="w-3 h-3" /> : <Icon name="copy" className="w-3 h-3" />}
                                                        Copy
                                                    </button>
                                                </div>
                                                <textarea
                                                    ref={lyricsTextareaRef}
                                                    value={lyricsResult}
                                                    onChange={(e) => setLyricsResult(e.target.value)}
                                                    placeholder="Generated lyrics will appear here..."
                                                    className="flex-grow w-full bg-transparent p-4 text-sm text-slate-200 font-mono resize-none focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                label: "Style Builder",
                                icon: "sliders",
                                content: (
                                    <div className="flex flex-col h-full space-y-6 pt-4 max-w-2xl mx-auto w-full">
                                        <div className="grid grid-cols-3 gap-4">
                                            <SelectInput 
                                                label="Genre" 
                                                name="genre" 
                                                value={genre} 
                                                onChange={(e) => setGenre(e.target.value)} 
                                                options={GENRES} 
                                            />
                                            <SelectInput 
                                                label="Voice" 
                                                name="voice" 
                                                value={voice} 
                                                onChange={(e) => setVoice(e.target.value)} 
                                                options={VOICES} 
                                            />
                                            <SelectInput 
                                                label="Tempo" 
                                                name="tempo" 
                                                value={tempo} 
                                                onChange={(e) => setTempo(e.target.value)} 
                                                options={TEMPOS} 
                                            />
                                        </div>
                                        
                                        <TextAreaInput 
                                            label="Additional Vibes / Instruments" 
                                            name="vibeInput" 
                                            value={vibeInput} 
                                            onChange={(e) => setVibeInput(e.target.value)} 
                                            placeholder="e.g. Heavy distortion, orchestral strings, lo-fi drums..." 
                                            rows={2} 
                                        />

                                        <button
                                            onClick={handleGenerateTags}
                                            disabled={isGeneratingTags}
                                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isGeneratingTags ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
                                            Generate Style Tags
                                        </button>

                                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Result (Paste into Suno Style)</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={styleTagsResult}
                                                    onChange={(e) => setStyleTagsResult(e.target.value)}
                                                    placeholder="Tags will appear here..."
                                                    className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                                                />
                                                <button 
                                                    onClick={() => handleCopy(styleTagsResult, 'style')}
                                                    className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 flex-shrink-0 ${copyStatus['style'] ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                                >
                                                    {copyStatus['style'] ? <Icon name="check" className="w-4 h-4" /> : <Icon name="copy" className="w-4 h-4" />}
                                                    Copy
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2 text-right">
                                                {styleTagsResult.length} / 120 chars
                                            </p>
                                        </div>
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>
            </div>
        </div>
    );
};

export default SunoSongStudio;
