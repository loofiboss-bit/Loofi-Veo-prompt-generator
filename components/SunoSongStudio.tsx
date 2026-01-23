
import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
import { ToastMessage, SunoPack } from '../types';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';

interface SunoSongStudioProps {
  onClose: () => void;
  uiStrings: any;
  addToast: (message: string, type: ToastMessage['type']) => void;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  model: string;
}

const GENRES = [
    { value: 'Cyberpunk', label: 'Cyberpunk' },
    { value: 'Rock', label: 'Rock' },
    { value: 'Lo-Fi', label: 'Lo-Fi' },
    { value: 'Pop', label: 'Pop' },
    { value: 'Cinematic', label: 'Cinematic' },
    { value: 'Hip Hop', label: 'Hip Hop' },
    { value: 'Electronic', label: 'Electronic' },
    { value: 'Metal', label: 'Metal' },
    { value: 'Jazz', label: 'Jazz' },
    { value: 'Acoustic', label: 'Acoustic' },
    { value: 'Orchestral', label: 'Orchestral' }
];

const SunoSongStudio: React.FC<SunoSongStudioProps> = ({ onClose, uiStrings, addToast }) => {
    const [view, setView] = useState<'input' | 'launchpad'>('input');
    const [songData, setSongData] = useState<SunoPack | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Input State
    const [topic, setTopic] = useState('');
    const [genre, setGenre] = useState('Cyberpunk');
    const [mood, setMood] = useState('');

    // Copy Feedback State
    const [copyStyleText, setCopyStyleText] = useState("📋 COPY STYLE");
    const [copyLyricsText, setCopyLyricsText] = useState("📋 COPY LYRICS");

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleGenerate = async () => {
        if (!topic.trim()) {
            addToast("Please enter a topic/story.", 'error');
            return;
        }

        setIsGenerating(true);
        try {
            const pack = await geminiService.generateSunoPack(topic, genre, mood);
            setSongData(pack);
            setView('launchpad');
            addToast("Song package generated!", 'success');
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyStyle = () => {
        if (songData?.style) {
            navigator.clipboard.writeText(songData.style);
            setCopyStyleText("✅ COPIED");
            setTimeout(() => setCopyStyleText("📋 COPY STYLE"), 2000);
        }
    };

    const handleCopyLyrics = () => {
        if (songData?.lyrics) {
            navigator.clipboard.writeText(songData.lyrics);
            setCopyLyricsText("✅ COPIED");
            setTimeout(() => setCopyLyricsText("📋 COPY LYRICS"), 2000);
        }
    };

    const handleOpenSuno = () => {
        window.open('https://suno.com/create', '_blank');
    };

    const handleReset = () => {
        setView('input');
        // We keep the inputs to allow iteration
    };

    return (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[130] flex flex-col animate-fade-in-up items-center justify-center p-4">
             {/* Main Container */}
             <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <Icon name="music" className="w-6 h-6 text-fuchsia-400" />
                        Suno Launchpad
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-8 relative">
                    
                    {/* INPUT VIEW */}
                    {view === 'input' && (
                        <div className="max-w-xl mx-auto space-y-8 animate-fade-in-up">
                             <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-white mb-2">Create a Song Idea</h3>
                                <p className="text-slate-400">Describe your concept, and AI will structure it for Suno.</p>
                             </div>

                             <TextAreaInput
                                label="Topic / Story"
                                name="topic"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. A robot discovering a flower in a wasteland..."
                                rows={3}
                                autoFocus
                             />

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SelectInput
                                    label="Genre"
                                    name="genre"
                                    value={genre}
                                    options={GENRES}
                                    onChange={(e) => setGenre(e.target.value)}
                                />
                                <TextAreaInput
                                    label="Mood"
                                    name="mood"
                                    value={mood}
                                    onChange={(e) => setMood(e.target.value)}
                                    placeholder="e.g. Dark, Upbeat, Melancholic"
                                    rows={1}
                                />
                             </div>

                             <div className="pt-4">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !topic.trim()}
                                    className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-fuchsia-900/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Icon name="spinner" className="w-6 h-6 animate-spin" />
                                            <span>Composing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="sparkles" className="w-6 h-6" />
                                            <span>Create Song</span>
                                        </>
                                    )}
                                </button>
                             </div>
                        </div>
                    )}

                    {/* LAUNCHPAD VIEW */}
                    {view === 'launchpad' && songData && (
                        <div className="h-full flex flex-col animate-fade-in-up">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-3xl font-bold text-white truncate max-w-md" title={songData.title}>
                                    {songData.title}
                                </h3>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleReset}
                                        className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-600 rounded-lg transition-colors"
                                    >
                                        New Idea
                                    </button>
                                    <button 
                                        onClick={handleOpenSuno}
                                        className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 border border-slate-600 transition-colors"
                                    >
                                        <Icon name="share" className="w-4 h-4" />
                                        Open Suno.com
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
                                {/* Style Card */}
                                <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex flex-col shadow-lg">
                                    <div className="flex items-center gap-2 mb-3 text-fuchsia-400">
                                        <Icon name="sliders" className="w-5 h-5" />
                                        <h4 className="font-bold uppercase tracking-wider text-xs">Style Prompt</h4>
                                    </div>
                                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 flex-grow mb-4 text-slate-200 text-sm leading-relaxed overflow-y-auto max-h-40 lg:max-h-none">
                                        {songData.style}
                                    </div>
                                    <button
                                        onClick={handleCopyStyle}
                                        className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                                            copyStyleText === "✅ COPIED" 
                                            ? 'bg-green-600 text-white' 
                                            : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-900/20'
                                        }`}
                                    >
                                        {copyStyleText === "✅ COPIED" ? <Icon name="check" className="w-4 h-4" /> : <Icon name="copy" className="w-4 h-4" />}
                                        {copyStyleText}
                                    </button>
                                </div>

                                {/* Lyrics Card */}
                                <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex flex-col shadow-lg min-h-[400px]">
                                    <div className="flex items-center gap-2 mb-3 text-cyan-400">
                                        <Icon name="edit" className="w-5 h-5" />
                                        <h4 className="font-bold uppercase tracking-wider text-xs">Lyrics</h4>
                                    </div>
                                    <div className="relative flex-grow mb-4">
                                        <textarea
                                            readOnly
                                            value={songData.lyrics}
                                            className="w-full h-full bg-slate-900 rounded-lg p-4 border border-slate-700 text-slate-300 font-mono text-sm resize-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCopyLyrics}
                                        className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                                            copyLyricsText === "✅ COPIED" 
                                            ? 'bg-green-600 text-white' 
                                            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20'
                                        }`}
                                    >
                                        {copyLyricsText === "✅ COPIED" ? <Icon name="check" className="w-4 h-4" /> : <Icon name="copy" className="w-4 h-4" />}
                                        {copyLyricsText}
                                    </button>
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
