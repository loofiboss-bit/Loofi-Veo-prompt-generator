
import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { SunoPack, ToastMessage } from '../types';
import { SUNO_TAGS } from '../data/sunoTags';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';

interface SunoSongStudioProps {
  onClose: () => void;
  uiStrings: any;
  addToast: (message: string, type: ToastMessage['type']) => void;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  model: string;
}

const SunoSongStudio: React.FC<SunoSongStudioProps> = ({ onClose, uiStrings, addToast }) => {
    const [view, setView] = useState<'input' | 'launchpad'>('input');
    const [songData, setSongData] = useState<SunoPack | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Input State
    const [topic, setTopic] = useState('');
    const [genre, setGenre] = useState('');
    const [mood, setMood] = useState('');

    // Feedback State
    const [styleCopyText, setStyleCopyText] = useState('COPY STYLE');
    const [lyricsCopyText, setLyricsCopyText] = useState('COPY LYRICS');

    // Tag Toolbar State
    const [activeCategory, setActiveCategory] = useState<string>(Object.keys(SUNO_TAGS)[0]);
    
    // Refs
    const lyricsRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // --- Actions ---

    const handleGenerate = async () => {
        if (!topic.trim()) {
            addToast("Please enter a song topic.", 'error');
            return;
        }

        setIsGenerating(true);
        try {
            const pack = await geminiService.generateSunoPack(topic, genre, mood);
            setSongData(pack);
            setView('launchpad');
            addToast("Pro Asset Generated", 'success');
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyStyle = () => {
        if (songData?.style) {
            navigator.clipboard.writeText(songData.style);
            setStyleCopyText('COPIED!');
            setTimeout(() => setStyleCopyText('COPY STYLE'), 3000);
        }
    };

    const handleCopyLyrics = () => {
        if (songData?.lyrics) {
            navigator.clipboard.writeText(songData.lyrics);
            setLyricsCopyText('COPIED!');
            setTimeout(() => setLyricsCopyText('COPY LYRICS'), 3000);
        }
    };

    const handleInsertTag = (tag: string) => {
        if (!lyricsRef.current || !songData) return;

        const textarea = lyricsRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = songData.lyrics;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        // Insert tag with newline if needed, or just inline? 
        // Suno tags usually sit on their own line or inline. 
        // We'll insert inline with a leading space if needed.
        const insertion = ` ${tag} `;
        
        const newText = before + insertion + after;
        
        setSongData({ ...songData, lyrics: newText });
        
        // Restore focus and cursor
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + insertion.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleReset = () => {
        setView('input');
        setSongData(null);
    };

    const openSuno = () => window.open('https://suno.com/create', '_blank');

    return (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-fade-in-up">
            <div className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                
                {/* --- HEADER --- */}
                <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-fuchsia-900/30 rounded-lg border border-fuchsia-500/30">
                            <Icon name="music" className="w-5 h-5 text-fuchsia-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100">Suno V5 Architect</h2>
                            {view === 'launchpad' && <p className="text-xs text-slate-400">Pro Asset Launchpad</p>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {view === 'launchpad' && (
                            <button onClick={handleReset} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors">
                                New Idea
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
                            <Icon name="cancel" className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* --- CONTENT --- */}
                <div className="flex-grow overflow-y-auto relative">
                    
                    {/* VIEW 1: INPUT STAGE */}
                    {view === 'input' && (
                        <div className="h-full flex flex-col items-center justify-center p-8 max-w-2xl mx-auto space-y-8">
                            <div className="text-center space-y-2">
                                <h1 className="text-3xl font-bold text-white tracking-tight">Design Your Hit</h1>
                                <p className="text-slate-400 text-lg">Turn a simple idea into a complex musical structure.</p>
                            </div>

                            <div className="w-full space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Song Topic</label>
                                    <textarea
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="A story about a cyberpunk detective finding a flower..."
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all h-32 resize-none"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Genre</label>
                                        <input
                                            type="text"
                                            value={genre}
                                            onChange={(e) => setGenre(e.target.value)}
                                            placeholder="Auto (AI)"
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:ring-fuchsia-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Mood</label>
                                        <input
                                            type="text"
                                            value={mood}
                                            onChange={(e) => setMood(e.target.value)}
                                            placeholder="Auto (AI)"
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:ring-fuchsia-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    disabled={!topic.trim() || isGenerating}
                                    className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-lg font-bold rounded-xl shadow-lg shadow-fuchsia-900/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 mt-4"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Icon name="spinner" className="w-5 h-5 animate-spin" />
                                            <span>Architecting Song...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="sparkles" className="w-5 h-5" />
                                            <span>Generate Pro Asset</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* VIEW 2: LAUNCHPAD STAGE */}
                    {view === 'launchpad' && songData && (
                        <div className="h-full flex flex-col md:flex-row">
                            
                            {/* LEFT COLUMN: STYLE & INFO */}
                            <div className="md:w-1/3 bg-slate-900/50 p-6 border-r border-slate-700 flex flex-col gap-6 overflow-y-auto">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Title</h3>
                                    <p className="text-xl font-bold text-white leading-tight">{songData.title}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <h3 className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest">Style Prompt</h3>
                                        <span className="text-[10px] text-slate-500">{songData.style.length} chars</span>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-sm text-fuchsia-100 font-mono leading-relaxed">
                                        {songData.style}
                                    </div>
                                    <button 
                                        onClick={handleCopyStyle}
                                        className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all ${styleCopyText === 'COPIED!' ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                                    >
                                        {styleCopyText === 'COPIED!' ? <Icon name="check" className="w-4 h-4" /> : <Icon name="copy" className="w-4 h-4" />}
                                        {styleCopyText}
                                    </button>
                                </div>

                                <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50 flex-grow">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Strategy</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed italic">
                                        "{songData.explanation}"
                                    </p>
                                </div>

                                <div className="mt-auto pt-4">
                                    <button 
                                        onClick={openSuno}
                                        className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-fuchsia-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Icon name="share" className="w-4 h-4" />
                                        Open Suno.com
                                    </button>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: LYRICS EDITOR */}
                            <div className="md:w-2/3 flex flex-col bg-slate-950">
                                {/* Editor Header */}
                                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                                    <div className="flex items-center gap-2 text-cyan-400">
                                        <Icon name="edit" className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Lyrics Editor</span>
                                    </div>
                                    <button 
                                        onClick={handleCopyLyrics}
                                        className={`px-4 py-1.5 rounded-md font-bold text-xs uppercase tracking-wide flex items-center gap-2 transition-all ${lyricsCopyText === 'COPIED!' ? 'bg-green-600 text-white' : 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900/50'}`}
                                    >
                                        {lyricsCopyText === 'COPIED!' ? <Icon name="check" className="w-3 h-3" /> : <Icon name="copy" className="w-3 h-3" />}
                                        {lyricsCopyText}
                                    </button>
                                </div>

                                {/* Text Area */}
                                <div className="flex-grow relative">
                                    <textarea
                                        ref={lyricsRef}
                                        value={songData.lyrics}
                                        onChange={(e) => setSongData({ ...songData, lyrics: e.target.value })}
                                        className="w-full h-full bg-slate-950 p-6 text-slate-300 font-mono text-sm leading-7 resize-none focus:outline-none"
                                        spellCheck={false}
                                    />
                                </div>

                                {/* Tag Injector Toolbar */}
                                <div className="border-t border-slate-800 bg-slate-900 p-2">
                                    {/* Category Tabs */}
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2 px-2">
                                        {Object.keys(SUNO_TAGS).map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setActiveCategory(cat)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-colors ${
                                                    activeCategory === cat 
                                                    ? 'bg-slate-700 text-white' 
                                                    : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Tag Buttons */}
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 py-1">
                                        {(SUNO_TAGS as any)[activeCategory].map((tag: string) => (
                                            <button
                                                key={tag}
                                                onClick={() => handleInsertTag(tag)}
                                                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded text-xs text-fuchsia-300 font-mono transition-colors whitespace-nowrap"
                                                title="Insert at cursor"
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SunoSongStudio;
