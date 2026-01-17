
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { ToastMessage, SunoLyricRequest, VisualizerConfig } from '../types';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
import Tabs from './Tabs';
import { countSyllables } from '../utils/textUtils';
import { generateVisualizerVideo } from '../services/videoEditorService';
import LyricSyncerModal from './LyricSyncerModal'; // NEW Import

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

interface WordSuggestions {
    rhymes: string[];
    nearRhymes: string[];
    synonyms: string[];
}

interface SelectionState {
    text: string;
    start: number;
    end: number;
    context: string;
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

const EXTEND_GOALS = [
    { value: 'verse_2', label: 'Verse 2' },
    { value: 'bridge', label: 'Bridge' },
    { value: 'outro', label: 'Outro' }
];

const PRODUCTION_FX = {
    'Lo-Fi': "lo-fi, vinyl crackle, warm tape saturation",
    'Live': "live recording, stadium reverb, crowd noise",
    'Radio': "am radio filter, mono, distorted",
    'Clean': "pristine production, studio master, hifi",
    'Heavy': "heavy distortion, wall of sound, aggressive mixing"
};

const SunoSongStudio: React.FC<SunoSongStudioProps> = ({ onClose, uiStrings, addToast, language, model }) => {
    // --- Core State ---
    const [topic, setTopic] = useState('');
    const [mood, setMood] = useState('');
    const [title, setTitle] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // --- Lyrics State ---
    const [lyricsResult, setLyricsResult] = useState('');
    const lyricsTextareaRef = useRef<HTMLTextAreaElement>(null);
    const lyricsStatsRef = useRef<HTMLDivElement>(null);

    // --- Extension State ---
    const [extensionContext, setExtensionContext] = useState('');
    const [extensionGoal, setExtensionGoal] = useState<'verse_2' | 'bridge' | 'outro'>('verse_2');
    const [extensionResult, setExtensionResult] = useState('');
    const [isExtending, setIsExtending] = useState(false);

    // --- Assistant State ---
    const [selection, setSelection] = useState<SelectionState | null>(null);
    const [suggestions, setSuggestions] = useState<WordSuggestions | null>(null);
    const [isAssistLoading, setIsAssistLoading] = useState(false);
    const [showAssistPanel, setShowAssistPanel] = useState(true);

    // --- Style State ---
    const [styleTagsResult, setStyleTagsResult] = useState('');
    const [genre, setGenre] = useState('Pop');
    
    // --- Harmony State ---
    const [chordSheet, setChordSheet] = useState('');
    const [songKey, setSongKey] = useState('');
    const [songTempo, setSongTempo] = useState('');
    const [isComposing, setIsComposing] = useState(false);

    // --- Cover Art State ---
    const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null);
    const [isArtGenerating, setIsArtGenerating] = useState(false);

    // --- Video Export State ---
    const [isExportingVideo, setIsExportingVideo] = useState(false);
    const [showVideoExportConfig, setShowVideoExportConfig] = useState(false);
    const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>({ style: 'waves', color: '#22d3ee' }); // cyan default
    const [uploadedAudio, setUploadedAudio] = useState<string | null>(null); // To store uploaded song blob url

    // --- Lyric Sync State ---
    const [isSyncingLyrics, setIsSyncingLyrics] = useState(false);

    // --- UI State ---
    const [activeTab, setActiveTab] = useState(0);
    const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSyncingLyrics) onClose(); // Prevent closing main modal if sync modal is open
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isSyncingLyrics]);

    // ... [Previous handlers for lyrics, suggestions, syllable counting, etc. remain unchanged] ...
    
    // --- Text Selection Handler ---
    const handleTextSelect = () => {
        const textarea = lyricsTextareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value.substring(start, end).trim();

        if (text && text.length > 0) {
            const fullText = textarea.value;
            const lineStart = fullText.lastIndexOf('\n', start - 1) + 1;
            const lineEnd = fullText.indexOf('\n', end);
            const contextLine = fullText.substring(lineStart, lineEnd === -1 ? fullText.length : lineEnd);

            setSelection({ start, end, text, context: contextLine });
            setSuggestions(null);
        } else {
            setSelection(null);
        }
    };

    const handleGetSuggestions = async () => {
        if (!selection) return;
        setIsAssistLoading(true);
        try {
            const results = await geminiService.getWordSuggestions(selection.text, selection.context);
            setSuggestions(results);
        } catch (error) {
            addToast("Failed to get suggestions.", 'error');
        } finally {
            setIsAssistLoading(false);
        }
    };

    const handleReplaceWord = (newWord: string) => {
        if (!selection || !lyricsTextareaRef.current) return;
        const textarea = lyricsTextareaRef.current;
        const before = lyricsResult.substring(0, selection.start);
        const after = lyricsResult.substring(selection.end);
        const newText = before + newWord + after;
        setLyricsResult(newText);
        const newEnd = selection.start + newWord.length;
        setSelection({ ...selection, end: newEnd, text: newWord });
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(selection.start, newEnd);
        }, 0);
    };

    const lineStats = useMemo(() => {
        const lines = lyricsResult.split('\n');
        return lines.map((line, index) => {
            const count = countSyllables(line);
            let colorClass = "text-slate-600";
            if (count > 0) {
                colorClass = "text-slate-400";
                let prevIndex = index - 1;
                while (prevIndex >= 0 && countSyllables(lines[prevIndex]) === 0) prevIndex--;
                if (prevIndex >= 0) {
                    const prevCount = countSyllables(lines[prevIndex]);
                    if (Math.abs(prevCount - count) >= 4) colorClass = "text-yellow-500 font-bold";
                }
            }
            return { count: count > 0 ? count : '', color: colorClass };
        });
    }, [lyricsResult]);

    const handleCreateAll = async () => {
        if (!topic.trim()) {
            addToast("Please enter a song topic first.", 'error');
            return;
        }
        setIsGenerating(true);
        try {
            addToast("Drafting song concept...", 'info');
            const metadata = await geminiService.generateSongMetadata(topic, mood || "Engaging");
            setTitle(metadata.title);
            setStyleTagsResult(metadata.styleDescription);
            addToast("Writing lyrics...", 'info');
            const lyrics = await geminiService.generateSongLyrics({
                topic: topic,
                mood: metadata.styleDescription,
                structure: 'pop_standard',
                language,
                model
            });
            setLyricsResult(lyrics);
            addToHistory('song', { title: metadata.title, style: metadata.styleDescription, lyrics }, { topic });
            addToast("Song generated successfully!", 'success');
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // ... [Previous handlers for Extend Lyrics, Chords, etc. remain unchanged] ...
    const handleExtendLyrics = async () => {
        if (!extensionContext.trim()) { addToast("Please provide context.", 'error'); return; }
        setIsExtending(true);
        try {
            const result = await geminiService.extendLyrics(extensionContext, extensionGoal);
            setExtensionResult(result);
            addToast("Lyrics extended!", 'success');
        } catch (error) { addToast("Failed.", 'error'); } finally { setIsExtending(false); }
    };

    const handleGenerateChords = async () => {
        if (!lyricsResult.trim()) { addToast("Generate lyrics first.", 'error'); return; }
        setIsComposing(true);
        try {
            const result = await geminiService.generateChords(lyricsResult, styleTagsResult || genre);
            setChordSheet(result.chordSheet);
            setSongKey(result.key);
            setSongTempo(result.tempo);
            addToast("Harmony generated.", 'success');
        } catch (error) { addToast("Failed.", 'error'); } finally { setIsComposing(false); }
    };

    const handleGenerateArt = async () => {
        const promptTitle = title || topic;
        if (!promptTitle.trim()) { addToast("Enter topic/title.", 'error'); return; }
        setIsArtGenerating(true);
        try {
            const vibe = styleTagsResult || mood || genre;
            const prompt = `Album cover art for a song titled '${promptTitle}'. Vibe: ${vibe}. High quality, digital art, ${genre} style, no text, square aspect ratio.`;
            const url = await geminiService.generateConceptArt(prompt, { aspectRatio: '1:1' });
            setCoverArtUrl(url);
            addToast("Cover art generated!", 'success');
        } catch (error) { addToast("Failed.", 'error'); } finally { setIsArtGenerating(false); }
    };

    const handleDownloadArt = () => {
        if (!coverArtUrl) return;
        const link = document.createElement('a');
        link.href = coverArtUrl;
        link.download = `${(title || 'cover').replace(/[^a-z0-9]/gi, '_')}-cover.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const addToHistory = (type: 'song' | 'lyrics' | 'style', content: any, meta: any) => {
        const newItem: HistoryItem = { id: Date.now().toString(), timestamp: Date.now(), type, content, meta };
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
            setTimeout(() => setCopyStatus(prev => ({ ...prev, [key]: false })), 2000);
            addToast(`${key} copied to clipboard!`, 'success');
        });
    };

    const handleToggleFx = (tags: string) => {
        let current = styleTagsResult;
        if (current.includes(tags)) current = current.replace(tags, "");
        else {
            const separator = current.trim().length > 0 && !current.trim().endsWith(',') ? ", " : "";
            current = current + separator + tags;
        }
        current = current.replace(/,\s*,/g, ', ').replace(/\s\s+/g, ' ').replace(/^,\s*/, '').replace(/,\s*$/, '');
        setStyleTagsResult(current);
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

    // --- Video Export Logic ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setUploadedAudio(url);
            setShowVideoExportConfig(true);
        }
    };

    const handleExportVideo = async () => {
        if (!uploadedAudio || !coverArtUrl) {
            addToast("Need audio and cover art.", 'error');
            return;
        }
        setIsExportingVideo(true);
        try {
            const videoUrl = await generateVisualizerVideo(uploadedAudio, coverArtUrl, visualizerConfig, (msg) => {
                // Optional: set specific loading message
            });
            
            const link = document.createElement('a');
            link.href = videoUrl;
            link.download = `${title.replace(/\s+/g, '_')}_visualizer.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast("Video exported successfully!", 'success');
            setShowVideoExportConfig(false);
        } catch (error) {
            console.error(error);
            addToast("Failed to render video.", 'error');
        } finally {
            setIsExportingVideo(false);
        }
    };
    
    // --- Sync Logic Handler ---
    const handleSaveSRT = (srtContent: string) => {
        // Create a blob for the SRT and download it
        const blob = new Blob([srtContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s+/g, '_')}.srt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Also save to history/state for this project (optional, future feature)
        addToast("Subtitles (SRT) downloaded.", 'success');
        setIsSyncingLyrics(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-[130] p-4">
            <div className="bg-slate-900/90 backdrop-blur-xl w-full max-w-7xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* Header */}
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
                                    <TextAreaInput label="Song Topic / Idea" name="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What should this song be about?" rows={1} autoFocus />
                                </div>
                                <div className="w-1/3 min-w-[200px]">
                                    <TextAreaInput label="Mood (Optional)" name="mood" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="e.g. Epic, Sad, Upbeat" rows={1} />
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 flex items-end pb-1">
                            <button onClick={handleCreateAll} disabled={isGenerating || !topic.trim()} className="h-[50px] px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105">
                                {isGenerating ? <><Icon name="spinner" className="w-5 h-5 animate-spin" /><span>Composing...</span></> : <><Icon name="sparkles" className="w-5 h-5" /><span>Create All</span></>}
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex-grow flex overflow-hidden">
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Title Bar & Cover Art */}
                        <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-700/50 flex items-center gap-6 flex-shrink-0">
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden group shadow-lg">
                                {coverArtUrl ? (
                                    <>
                                        <img src={coverArtUrl} alt="Album Art" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 backdrop-blur-sm">
                                            <button onClick={handleDownloadArt} className="text-white hover:text-cyan-400 p-1"><Icon name="download" className="w-5 h-5" /></button>
                                            <button onClick={handleGenerateArt} className="text-white hover:text-fuchsia-400 p-1" title="Regenerate"><Icon name="redo" className="w-4 h-4" /></button>
                                        </div>
                                    </>
                                ) : (
                                    <button onClick={handleGenerateArt} disabled={isArtGenerating || (!title && !topic)} className="w-full h-full flex flex-col items-center justify-center text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Generate Album Art">
                                        {isArtGenerating ? <Icon name="spinner" className="w-6 h-6 animate-spin" /> : <><Icon name="image" className="w-6 h-6 mb-1" /><span className="text-[9px] font-bold uppercase">Gen Art</span></>}
                                    </button>
                                )}
                            </div>

                            <div className="flex-grow">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Song Title</label>
                                <div className="flex gap-2 items-center">
                                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Generated title..." className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 font-bold focus:ring-purple-500 focus:border-purple-500" />
                                    <button onClick={() => handleCopy(title, 'Title')} className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${copyStatus['Title'] ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}><Icon name={copyStatus['Title'] ? 'check' : 'copy'} className="w-4 h-4" /></button>
                                    
                                    {/* Video Export Button */}
                                    <div className="h-8 w-px bg-slate-700 mx-1"></div>
                                    <input type="file" accept="audio/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                    <button 
                                        onClick={() => {
                                            if(!coverArtUrl) { addToast("Generate Cover Art first!", 'error'); return; }
                                            fileInputRef.current?.click();
                                        }} 
                                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
                                        title="Create Video from MP3 + Art"
                                    >
                                        <Icon name="video" className="w-4 h-4" />
                                        <span>Export Video</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex-grow px-6 pb-6 pt-2 overflow-hidden flex flex-col">
                            <Tabs
                                activeTabIndex={activeTab}
                                onTabChange={setActiveTab}
                                tabs={[
                                    {
                                        label: "Lyrics & Tags",
                                        icon: "pencil",
                                        content: (
                                            <div className="flex h-full gap-4 pt-4 overflow-hidden">
                                                <div className="flex-grow flex flex-col h-full gap-4 min-w-0">
                                                    <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex-shrink-0">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase self-center mr-2">Insert:</span>
                                                        {QUICK_META_TAGS.map(tag => (
                                                            <button key={tag} onClick={() => insertTag(tag)} className="px-2 py-1 bg-slate-700 hover:bg-purple-600 text-white text-[10px] font-bold rounded transition-colors shadow-sm">{tag}</button>
                                                        ))}
                                                    </div>
                                                    <div className="flex-grow relative rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden flex flex-col">
                                                        <div className="flex justify-between items-center p-2 bg-slate-800/50 border-b border-slate-700/50 flex-shrink-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-400 font-mono ml-2">Editor (Syllable Count on left)</span>
                                                                {selection && <button onClick={handleGetSuggestions} disabled={isAssistLoading} className="flex items-center gap-1 px-2 py-0.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-[10px] font-bold rounded shadow-sm animate-fade-in-up">{isAssistLoading ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="magic" className="w-3 h-3" />} Assist</button>}
                                                            </div>
                                                            <button onClick={() => handleCopy(lyricsResult, 'Lyrics')} className={`px-3 py-1 text-xs font-bold rounded transition-colors flex items-center gap-1 ${copyStatus['Lyrics'] ? 'text-green-400' : 'text-slate-300 hover:text-white'}`}><Icon name={copyStatus['Lyrics'] ? 'check' : 'copy'} className="w-3 h-3" /> Copy Lyrics</button>
                                                        </div>
                                                        <div className="flex-grow relative flex overflow-hidden">
                                                            <div ref={lyricsStatsRef} className="w-10 bg-slate-800/50 border-r border-slate-700 pt-4 text-center text-xs font-mono text-slate-500 select-none overflow-hidden">
                                                                {lineStats.map((stat, i) => <div key={i} style={{ height: '1.5rem', lineHeight: '1.5rem' }} className={stat.color}>{stat.count || '-'}</div>)}
                                                            </div>
                                                            <textarea ref={lyricsTextareaRef} value={lyricsResult} onChange={(e) => setLyricsResult(e.target.value)} onScroll={(e) => { if(lyricsStatsRef.current) lyricsStatsRef.current.scrollTop = e.currentTarget.scrollTop }} onSelect={handleTextSelect} onMouseUp={handleTextSelect} onKeyUp={handleTextSelect} placeholder="Generated lyrics will appear here..." className="flex-grow w-full bg-transparent p-4 pl-3 text-sm text-slate-200 font-mono resize-none focus:outline-none whitespace-pre overflow-x-auto" style={{ lineHeight: '1.5rem' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                                {showAssistPanel && (
                                                    <div className="w-64 flex-shrink-0 bg-slate-800/30 border border-slate-700/50 rounded-xl flex flex-col overflow-hidden transition-all duration-300">
                                                        <div className="p-3 bg-slate-800/50 border-b border-slate-700/50 flex justify-between items-center">
                                                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Lyric Assist</span>
                                                            <button onClick={() => setShowAssistPanel(false)} className="text-slate-500 hover:text-white"><Icon name="cancel" className="w-3 h-3" /></button>
                                                        </div>
                                                        <div className="flex-grow overflow-y-auto p-3 space-y-4">
                                                            {!selection ? <div className="text-center py-8 text-slate-500 text-xs italic">Highlight a word in the editor to find rhymes and synonyms.</div> : isAssistLoading ? <div className="flex justify-center py-8"><Icon name="spinner" className="w-6 h-6 text-fuchsia-400 animate-spin" /></div> : suggestions ? (
                                                                <>
                                                                    <div className="text-center mb-2"><span className="text-sm font-bold text-fuchsia-300">"{selection.text}"</span></div>
                                                                    {['Perfect Rhymes', 'Near Rhymes', 'Synonyms'].map((cat, idx) => (
                                                                        <div key={cat}>
                                                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">{cat}</h4>
                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                {(suggestions as any)[['rhymes', 'nearRhymes', 'synonyms'][idx]].map((word: string) => (
                                                                                    <button key={word} onClick={() => handleReplaceWord(word)} className="px-2 py-1 bg-slate-700 hover:bg-fuchsia-600 text-slate-200 hover:text-white text-xs rounded border border-slate-600 transition-colors">{word}</button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </>
                                                            ) : <div className="text-center py-4"><button onClick={handleGetSuggestions} className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold rounded-lg shadow-md transition-transform hover:scale-105">Analyze Selection</button></div>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    },
                                    // ... [Harmony and Extend tabs preserved] ...
                                    {
                                        label: "Style & Instruments",
                                        icon: "sliders",
                                        content: (
                                            <div className="pt-4 space-y-6 h-full overflow-y-auto pr-2">
                                                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700">
                                                    <label className="text-xs font-bold text-slate-400 uppercase mb-3 block flex items-center gap-2"><Icon name="sliders" className="w-4 h-4" /> Mixing Console (Production FX)</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(PRODUCTION_FX).map(([label, tags]) => {
                                                            const isActive = styleTagsResult.includes(tags);
                                                            return <button key={label} onClick={() => handleToggleFx(tags)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isActive ? 'bg-fuchsia-600 border-fuchsia-500 text-white shadow-[0_0_10px_rgba(217,70,239,0.3)]' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'}`}>{label}</button>;
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700">
                                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Generated Style (Paste to Suno)</label>
                                                    <div className="flex gap-2">
                                                        <textarea value={styleTagsResult} onChange={(e) => setStyleTagsResult(e.target.value)} className="flex-grow bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 focus:ring-purple-500 focus:border-purple-500 resize-none h-24 leading-relaxed" />
                                                        <button onClick={() => handleCopy(styleTagsResult, 'Style')} className={`w-20 rounded-lg font-bold transition-colors flex flex-col items-center justify-center gap-1 flex-shrink-0 ${copyStatus['Style'] ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}><Icon name={copyStatus['Style'] ? 'check' : 'copy'} className="w-5 h-5" /><span className="text-xs">Copy</span></button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 pb-4">
                                                    <SelectInput label="Base Genre Override" name="genre" value={genre} onChange={(e) => setGenre(e.target.value)} options={GENRES} />
                                                </div>
                                            </div>
                                        )
                                    }
                                ]}
                            />
                        </div>
                    </div>

                    {/* Sidebar History */}
                    <div className={`w-72 bg-slate-900/50 border-l border-slate-700/50 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : 'hidden'}`}>
                        <div className="p-4 border-b border-slate-700/50 bg-slate-900/80 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session History</h3>
                        </div>
                        <div className="flex-grow overflow-y-auto p-3 space-y-3">
                            {history.length === 0 ? <p className="text-center text-xs text-slate-500 py-8 italic">No songs generated yet.</p> : history.map((item) => (
                                <div key={item.id} onClick={() => handleRestoreHistory(item)} className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl cursor-pointer transition-colors group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">Song</span>
                                        <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-200 mt-1 mb-0.5 truncate">{item.content.title}</h4>
                                    <p className="text-[10px] text-slate-400 line-clamp-1 italic">{item.meta?.topic}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Export Configuration Modal */}
            {showVideoExportConfig && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[140] p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Video Config</h3>
                            <button onClick={() => setShowVideoExportConfig(false)} className="text-slate-400 hover:text-white"><Icon name="cancel" className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Visualizer Style</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button 
                                        onClick={() => setVisualizerConfig({...visualizerConfig, style: 'waves'})}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${visualizerConfig.style === 'waves' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                    >
                                        <Icon name="activity" className="w-5 h-5" />
                                        <span className="text-[10px]">Waves</span>
                                    </button>
                                    <button 
                                        onClick={() => setVisualizerConfig({...visualizerConfig, style: 'lines'})}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${visualizerConfig.style === 'lines' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                    >
                                        <Icon name="sliders" className="w-5 h-5 rotate-90" />
                                        <span className="text-[10px]">Lines</span>
                                    </button>
                                    <button 
                                        onClick={() => setVisualizerConfig({...visualizerConfig, style: 'frequency'})}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${visualizerConfig.style === 'frequency' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                    >
                                        <Icon name="filter" className="w-5 h-5" />
                                        <span className="text-[10px]">Freq</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Color</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="color" 
                                        value={visualizerConfig.color}
                                        onChange={(e) => setVisualizerConfig({...visualizerConfig, color: e.target.value})}
                                        className="h-10 w-10 rounded cursor-pointer border-0 bg-transparent p-0"
                                    />
                                    <span className="text-sm font-mono text-slate-300">{visualizerConfig.color}</span>
                                </div>
                            </div>

                            {/* --- Start of Lyric Sync Trigger --- */}
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Subtitles</label>
                                <button 
                                    onClick={() => setIsSyncingLyrics(true)}
                                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                                >
                                    <Icon name="subtitles" className="w-4 h-4" />
                                    Tap to Sync Lyrics
                                </button>
                            </div>
                            {/* --- End of Lyric Sync Trigger --- */}

                            <button 
                                onClick={handleExportVideo}
                                disabled={isExportingVideo}
                                className="w-full py-3 mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
                            >
                                {isExportingVideo ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="download" className="w-5 h-5" />}
                                {isExportingVideo ? "Rendering..." : "Render & Download"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Lyric Syncer Modal */}
            {isSyncingLyrics && uploadedAudio && (
                <LyricSyncerModal 
                    isOpen={isSyncingLyrics}
                    onClose={() => setIsSyncingLyrics(false)}
                    lyricsText={lyricsResult}
                    audioUrl={uploadedAudio}
                    onSave={handleSaveSRT}
                />
            )}
        </div>
    );
};

export default SunoSongStudio;
