
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
import { SUNO_TAGS } from '../data/sunoTags';

interface SunoSongStudioProps {
  onClose: () => void;
  uiStrings: any;
  addToast: (message: string, type: ToastMessage['type']) => void;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  model: string;
}

interface HistoryItem {
    id: string;
    timestamp: number;
    type: 'lyrics' | 'style';
    content: string;
    meta?: any;
}

const SONG_STRUCTURES = [
    { value: 'pop_standard', label: 'Standard Pop (Verse-Chorus)' },
    { value: 'ballad', label: 'Power Ballad' },
    { value: 'rap_freestyle', label: 'Rap / Freestyle' },
    { value: 'edm_build', label: 'EDM (Build & Drop)' }
];

const STRUCTURE_PARTS = [
    'Intro', 'Verse', 'Chorus', 'Bridge', 'Outro', 'Solo', 'Drop', 'Pre-Chorus'
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
    const [structureMode, setStructureMode] = useState<'preset' | 'custom'>('preset');
    const [structure, setStructure] = useState<SunoLyricRequest['structure']>('pop_standard');
    const [customSections, setCustomSections] = useState<string[]>(['[Intro]', '[Verse]', '[Chorus]', '[Outro]']);
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

    // --- Sidebar State ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarView, setSidebarView] = useState<'tags' | 'history'>('tags');
    const [expandedCategory, setExpandedCategory] = useState<string | null>('Structure');
    
    // --- History State ---
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // --- Handlers ---

    const handleAddSection = (section: string) => {
        setCustomSections(prev => [...prev, `[${section}]`]);
    };

    const handleRemoveSection = (index: number) => {
        setCustomSections(prev => prev.filter((_, i) => i !== index));
    };

    const addToHistory = (type: 'lyrics' | 'style', content: string, meta: any) => {
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type,
            content,
            meta
        };
        setHistory(prev => [newItem, ...prev].slice(0, 10));
    };

    const handleGenerateLyrics = async () => {
        if (!topic.trim()) {
            addToast("Please enter a song topic.", 'error');
            return;
        }
        if (structureMode === 'custom' && customSections.length === 0) {
            addToast("Please add at least one section to your custom structure.", 'error');
            return;
        }

        setIsGeneratingLyrics(true);
        try {
            const request: SunoLyricRequest = {
                topic,
                mood,
                structure: structureMode === 'preset' ? structure : 'pop_standard', // Fallback if custom
                customStructure: structureMode === 'custom' ? customSections : undefined,
                language,
                model
            };
            const result = await geminiService.generateSongLyrics(request);
            setLyricsResult(result);
            addToHistory('lyrics', result, { topic, mood, structure, structureMode, customSections });
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
            addToHistory('style', tags, { genre, voice, tempo, vibeInput });
            addToast("Style tags generated.", 'success');
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsGeneratingTags(false);
        }
    };

    const handleRestoreHistory = (item: HistoryItem) => {
        if (item.type === 'lyrics') {
            setLyricsResult(item.content);
            setActiveTab(0);
            if (item.meta) {
                setTopic(item.meta.topic || '');
                setMood(item.meta.mood || '');
                setStructure(item.meta.structure || 'pop_standard');
                if (item.meta.structureMode) setStructureMode(item.meta.structureMode);
                if (item.meta.customSections) setCustomSections(item.meta.customSections);
            }
            addToast("Lyrics restored from history.", 'info');
        } else {
            setStyleTagsResult(item.content);
            setActiveTab(1);
            if (item.meta) {
                setGenre(item.meta.genre || 'Pop');
                setVoice(item.meta.voice || 'Female');
                setTempo(item.meta.tempo || 'Medium');
                setVibeInput(item.meta.vibeInput || '');
            }
            addToast("Style restored from history.", 'info');
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

    const handleTagClick = (tag: string) => {
        if (activeTab === 0) {
            // Lyric Tab: Insert into textarea
            insertTag(tag);
        } else {
            // Style Tab: Append to style result
            const current = styleTagsResult.trim();
            const cleanTag = tag.replace(/^\[|\]$/g, '');
            const separator = current.length > 0 && !current.endsWith(',') ? ', ' : '';
            setStyleTagsResult(current + separator + cleanTag);
        }
    };

    const toggleSidebar = (view: 'tags' | 'history') => {
        if (isSidebarOpen && sidebarView === view) {
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true);
            setSidebarView(view);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-[130] p-4"
            onClick={onClose}
            role="dialog" aria-modal="true"
        >
            <div
                className="bg-slate-900/80 backdrop-blur-xl w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Icon name="music" className="w-6 h-6 text-purple-400" />
                        Suno Custom Studio
                    </h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => toggleSidebar('history')}
                            className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isSidebarOpen && sidebarView === 'history' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Icon name="history" className="w-4 h-4" />
                            History
                        </button>
                        <button
                            onClick={() => toggleSidebar('tags')}
                            className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isSidebarOpen && sidebarView === 'tags' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Icon name="library" className="w-4 h-4" />
                            Tag Library
                        </button>
                        <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                            <Icon name="cancel" className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <div className="flex-grow flex overflow-hidden">
                    {/* Main Content */}
                    <div className="flex-1 p-6 overflow-hidden flex flex-col min-w-0">
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
                                                        rows={2} 
                                                        autoFocus
                                                    />
                                                    <TextAreaInput 
                                                        label="Mood" 
                                                        name="mood" 
                                                        value={mood} 
                                                        onChange={(e) => setMood(e.target.value)} 
                                                        placeholder="e.g. Melancholic, Hype" 
                                                        rows={1}
                                                    />

                                                    {/* Structure Builder */}
                                                    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <label className="text-xs font-bold text-slate-400 uppercase">Song Structure</label>
                                                            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                                                                <button
                                                                    onClick={() => setStructureMode('preset')}
                                                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${structureMode === 'preset' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                                                >
                                                                    Preset
                                                                </button>
                                                                <button
                                                                    onClick={() => setStructureMode('custom')}
                                                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${structureMode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                                                >
                                                                    Custom Builder
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {structureMode === 'preset' ? (
                                                            <SelectInput 
                                                                label="" 
                                                                name="structure" 
                                                                value={structure} 
                                                                onChange={(e) => setStructure(e.target.value as any)} 
                                                                options={SONG_STRUCTURES} 
                                                            />
                                                        ) : (
                                                            <div className="space-y-3 animate-fade-in-up">
                                                                {/* Sequence Visualizer */}
                                                                <div className="flex flex-wrap gap-2 p-3 bg-slate-900/60 rounded-lg border border-slate-700 min-h-[3rem] items-center">
                                                                    {customSections.length === 0 ? (
                                                                        <span className="text-xs text-slate-500 italic">Add sections below...</span>
                                                                    ) : (
                                                                        customSections.map((section, index) => (
                                                                            <div key={index} className="group relative px-3 py-1.5 bg-indigo-900/40 border border-indigo-500/30 rounded text-indigo-200 text-xs font-mono font-bold flex items-center gap-2">
                                                                                {section}
                                                                                <button 
                                                                                    onClick={() => handleRemoveSection(index)}
                                                                                    className="text-indigo-400 hover:text-red-400 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                >
                                                                                    <Icon name="cancel" className="w-3 h-3" />
                                                                                </button>
                                                                                {index < customSections.length - 1 && (
                                                                                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-2 h-px bg-slate-600"></div>
                                                                                )}
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>

                                                                {/* Toolbox */}
                                                                <div className="flex flex-wrap gap-2">
                                                                    {STRUCTURE_PARTS.map(part => (
                                                                        <button
                                                                            key={part}
                                                                            onClick={() => handleAddSection(part)}
                                                                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold rounded border border-slate-600 hover:border-slate-500 transition-colors flex items-center gap-1"
                                                                        >
                                                                            <Icon name="plus" className="w-3 h-3" />
                                                                            {part}
                                                                        </button>
                                                                    ))}
                                                                    <button 
                                                                        onClick={() => setCustomSections([])}
                                                                        className="ml-auto text-[10px] text-red-400 hover:text-red-300 underline decoration-red-400/50"
                                                                    >
                                                                        Clear
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
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
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Editor</span>
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

                    {/* Sidebar */}
                    <div className={`w-64 bg-slate-900/50 border-l border-slate-700/50 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full w-0 opacity-0 overflow-hidden'}`}>
                        <div className="p-4 border-b border-slate-700/50 bg-slate-900/80 flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {sidebarView === 'history' ? 'Generation History' : 'Quick Tags'}
                            </h3>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-2 space-y-2">
                            {sidebarView === 'tags' ? (
                                Object.entries(SUNO_TAGS).map(([category, tags]) => (
                                    <div key={category} className="rounded-lg bg-slate-800/30 overflow-hidden">
                                        <button
                                            onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                                            className="w-full flex items-center justify-between p-3 text-left text-xs font-bold text-slate-300 hover:bg-slate-700/50 transition-colors"
                                        >
                                            {category}
                                            <Icon name="chevron-down" className={`w-3 h-3 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {expandedCategory === category && (
                                            <div className="p-2 pt-0 grid grid-cols-2 gap-2">
                                                {tags.map((tag) => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => handleTagClick(tag)}
                                                        className="px-2 py-1.5 bg-slate-700 hover:bg-purple-600 text-white text-[10px] font-medium rounded transition-colors truncate text-center shadow-sm"
                                                        title={tag}
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                // History View
                                <div className="space-y-2">
                                    {history.length === 0 ? (
                                        <p className="text-center text-xs text-slate-500 py-4 italic">No history yet.</p>
                                    ) : (
                                        history.map((item) => (
                                            <div 
                                                key={item.id} 
                                                onClick={() => handleRestoreHistory(item)}
                                                className="p-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-700 rounded-lg cursor-pointer transition-colors group"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${item.type === 'lyrics' ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'}`}>
                                                        {item.type}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">
                                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                                                    {item.content}
                                                </p>
                                                <div className="mt-2 pt-2 border-t border-slate-700/50 hidden group-hover:block text-center">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Click to Restore</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SunoSongStudio;
