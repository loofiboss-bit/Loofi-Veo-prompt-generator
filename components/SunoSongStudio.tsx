
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useRef } from 'react';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { ToastMessage, SunoLyricRequest } from '../types';
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
    type: 'song' | 'lyrics' | 'style';
    content: any;
    meta?: any;
}

const QUICK_META_TAGS = ['[Intro]', '[Chorus]', '[Verse]', '[Drop]', '[Solo]', '[Hook]', '[Outro]', '[Instrumental Break]'];

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

const SunoSongStudio: React.FC<SunoSongStudioProps> = ({ onClose, uiStrings, addToast, language, model }) => {
    // --- Core State ---
    const [topic, setTopic] = useState('');
    const [mood, setMood] = useState('');
    const [title, setTitle] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // --- Lyrics State ---
    const [lyricsResult, setLyricsResult] = useState('');
    const [structureMode, setStructureMode] = useState<'preset' | 'custom'>('preset');
    const [structure, setStructure] = useState<SunoLyricRequest['structure']>('pop_standard');
    const lyricsTextareaRef = useRef<HTMLTextAreaElement>(null);

    // --- Style State ---
    const [styleTagsResult, setStyleTagsResult] = useState('');
    const [genre, setGenre] = useState('Pop');
    
    // --- UI State ---
    const [activeTab, setActiveTab] = useState(0);
    const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // --- Unified Generation Logic ---
    const handleCreateAll = async () => {
        if (!topic.trim()) {
            addToast("Please enter a song topic first.", 'error');
            return;
        }

        setIsGenerating(true);
        try {
            // 1. Generate Metadata (Title & Style)
            addToast("Drafting song concept...", 'info');
            const metadata = await geminiService.generateSongMetadata(topic, mood || "Engaging");
            
            setTitle(metadata.title);
            setStyleTagsResult(metadata.styleDescription);

            // 2. Generate Lyrics (chained)
            addToast("Writing lyrics...", 'info');
            const lyrics = await geminiService.generateSongLyrics({
                topic: topic,
                mood: metadata.styleDescription, // Use the generated style as context
                structure: 'pop_standard',
                language,
                model
            });
            
            setLyricsResult(lyrics);

            // 3. Save to History
            addToHistory('song', { title: metadata.title, style: metadata.styleDescription, lyrics }, { topic });
            addToast("Song generated successfully!", 'success');

        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const addToHistory = (type: 'song' | 'lyrics' | 'style', content: any, meta: any) => {
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type,
            content,
            meta
        };
        setHistory(prev => [newItem, ...prev].slice(0, 20));
    };

    const handleRestoreHistory = (item: HistoryItem) => {
        if (item.type === 'song') {
            setTitle(item.content.title);
            setStyleTagsResult(item.content.style);
            setLyricsResult(item.content.lyrics);
            if (item.meta?.topic) setTopic(item.meta.topic);
            addToast("Full song restored.", 'info');
        }
    };

    const handleCopy = (content: string, key: string) => {
        if (!content) return;
        navigator.clipboard.writeText(content).then(() => {
            setCopyStatus(prev => ({ ...prev, [key]: true }));
            setTimeout(() => {
                setCopyStatus(prev => ({ ...prev, [key]: false }));
            }, 2000);
            addToast(`${key} copied to clipboard!`, 'success');
        });
    };

    const insertTag = (tag: string) => {
        const textarea = lyricsTextareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = lyricsResult;
        
        const prefix = (start > 0 && text[start - 1] !== '\n') ? '\n' : '';
        const suffix = (end < text.length && text[end] !== '\n') ? '\n' : '';
        
        const insertion = `${prefix}${tag}${suffix}`;
        const newText = text.substring(0, start) + insertion + text.substring(end);

        setLyricsResult(newText);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + insertion.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-[130] p-4">
            <div className="bg-slate-900/90 backdrop-blur-xl w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* 1. Header: Core Concept & One-Click Action */}
                <header className="flex flex-col gap-4 p-6 border-b border-slate-700 flex-shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-purple-400">
                            <Icon name="music" className="w-6 h-6" />
                            <h2 className="text-xl font-bold text-slate-100">Suno Song Studio</h2>
                        </div>
                        <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white transition-colors">
                            <Icon name="cancel" className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-stretch">
                        <div className="flex-grow space-y-4">
                            <div className="flex gap-3">
                                <div className="flex-grow">
                                    <TextAreaInput 
                                        label="Song Topic / Idea" 
                                        name="topic" 
                                        value={topic} 
                                        onChange={(e) => setTopic(e.target.value)} 
                                        placeholder="What should this song be about?" 
                                        rows={1}
                                        autoFocus
                                    />
                                </div>
                                <div className="w-1/3 min-w-[200px]">
                                    <TextAreaInput 
                                        label="Mood (Optional)" 
                                        name="mood" 
                                        value={mood} 
                                        onChange={(e) => setMood(e.target.value)} 
                                        placeholder="e.g. Epic, Sad, Upbeat" 
                                        rows={1}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 flex items-end pb-1">
                            <button
                                onClick={handleCreateAll}
                                disabled={isGenerating || !topic.trim()}
                                className="h-[50px] px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                            >
                                {isGenerating ? (
                                    <>
                                        <Icon name="spinner" className="w-5 h-5 animate-spin" />
                                        <span>Composing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="sparkles" className="w-5 h-5" />
                                        <span>Create All</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex-grow flex overflow-hidden">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* 2. Generated Title Bar */}
                        <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-700/50 flex items-center gap-4">
                            <div className="flex-grow">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Song Title</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={title} 
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Generated title..."
                                        className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 font-bold focus:ring-purple-500 focus:border-purple-500"
                                    />
                                    <button 
                                        onClick={() => handleCopy(title, 'Title')}
                                        className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${copyStatus['Title'] ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                                    >
                                        <Icon name={copyStatus['Title'] ? 'check' : 'copy'} className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 3. Tabs for Style & Lyrics */}
                        <div className="flex-grow p-6 overflow-hidden flex flex-col">
                            <Tabs
                                activeTabIndex={activeTab}
                                onTabChange={setActiveTab}
                                tabs={[
                                    {
                                        label: "Lyrics & Tags",
                                        icon: "pencil",
                                        content: (
                                            <div className="flex flex-col h-full gap-4 pt-4">
                                                {/* Meta-Tag Toolbar */}
                                                <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase self-center mr-2">Insert:</span>
                                                    {QUICK_META_TAGS.map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => insertTag(tag)}
                                                            className="px-2 py-1 bg-slate-700 hover:bg-purple-600 text-white text-[10px] font-bold rounded transition-colors shadow-sm"
                                                        >
                                                            {tag}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Lyrics Editor */}
                                                <div className="flex-grow relative rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden flex flex-col">
                                                    <div className="flex justify-between items-center p-2 bg-slate-800/50 border-b border-slate-700/50">
                                                        <span className="text-xs text-slate-400 font-mono ml-2">Editor</span>
                                                        <button 
                                                            onClick={() => handleCopy(lyricsResult, 'Lyrics')}
                                                            className={`px-3 py-1 text-xs font-bold rounded transition-colors flex items-center gap-1 ${copyStatus['Lyrics'] ? 'text-green-400' : 'text-slate-300 hover:text-white'}`}
                                                        >
                                                            <Icon name={copyStatus['Lyrics'] ? 'check' : 'copy'} className="w-3 h-3" />
                                                            Copy Lyrics
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        ref={lyricsTextareaRef}
                                                        value={lyricsResult}
                                                        onChange={(e) => setLyricsResult(e.target.value)}
                                                        placeholder="Generated lyrics will appear here..."
                                                        className="flex-grow w-full bg-transparent p-4 text-sm text-slate-200 font-mono resize-none focus:outline-none leading-relaxed"
                                                    />
                                                </div>
                                            </div>
                                        )
                                    },
                                    {
                                        label: "Style & Instruments",
                                        icon: "sliders",
                                        content: (
                                            <div className="pt-4 space-y-6">
                                                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700">
                                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Generated Style (Paste to Suno)</label>
                                                    <div className="flex gap-2">
                                                        <textarea 
                                                            value={styleTagsResult}
                                                            onChange={(e) => setStyleTagsResult(e.target.value)}
                                                            className="flex-grow bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 focus:ring-purple-500 focus:border-purple-500 resize-none h-24"
                                                        />
                                                        <button 
                                                            onClick={() => handleCopy(styleTagsResult, 'Style')}
                                                            className={`w-20 rounded-lg font-bold transition-colors flex flex-col items-center justify-center gap-1 flex-shrink-0 ${copyStatus['Style'] ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                                        >
                                                            <Icon name={copyStatus['Style'] ? 'check' : 'copy'} className="w-5 h-5" />
                                                            <span className="text-xs">Copy</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <SelectInput 
                                                        label="Base Genre Override" 
                                                        name="genre" 
                                                        value={genre} 
                                                        onChange={(e) => setGenre(e.target.value)} 
                                                        options={GENRES} 
                                                    />
                                                    {/* Add more controls if needed */}
                                                </div>
                                            </div>
                                        )
                                    }
                                ]}
                            />
                        </div>
                    </div>

                    {/* 4. Sidebar: History */}
                    <div className={`w-72 bg-slate-900/50 border-l border-slate-700/50 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : 'hidden'}`}>
                        <div className="p-4 border-b border-slate-700/50 bg-slate-900/80 flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Session History
                            </h3>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-3 space-y-3">
                            {history.length === 0 ? (
                                <p className="text-center text-xs text-slate-500 py-8 italic">No songs generated yet.</p>
                            ) : (
                                history.map((item) => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => handleRestoreHistory(item)}
                                        className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl cursor-pointer transition-colors group"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                                Song
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-200 mt-1 mb-0.5 truncate">{item.content.title}</h4>
                                        <p className="text-[10px] text-slate-400 line-clamp-1 italic">
                                            {item.meta?.topic}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SunoSongStudio;
