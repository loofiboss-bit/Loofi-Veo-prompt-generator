
import React, { useState, useEffect, useCallback } from 'react';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { ToastMessage, SavedSunoSong } from '../types';
import { CHARACTER_LIMITS } from '../constants';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import Button from './Button';
import { appUIStrings } from '../translations';

interface SunoSongStudioProps {
  onClose: () => void;
  uiStrings: any;
  addToast: (message: string, type: ToastMessage['type']) => void;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  model: string;
}

const SUNO_HISTORY_KEY = 'suno-song-history';

const SuggestionPills: React.FC<{
    suggestions: string[];
    onSelect: (suggestion: string) => void;
}> = ({ suggestions, onSelect }) => {
    if (suggestions.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {suggestions.map((suggestion, i) => (
                <button
                    key={i}
                    onClick={() => onSelect(suggestion)}
                    className="px-3 py-1 text-xs rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                    + {suggestion}
                </button>
            ))}
        </div>
    );
};

const SunoSongStudio: React.FC<SunoSongStudioProps> = ({ onClose, uiStrings, addToast, language, model }) => {
    const [idea, setIdea] = useState('');
    const [lyricalTheme, setLyricalTheme] = useState('');
    const [title, setTitle] = useState('');
    const [styleOfMusic, setStyleOfMusic] = useState('');
    const [lyrics, setLyrics] = useState('');
    
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
    const [styleSuggestions, setStyleSuggestions] = useState<string[]>([]);

    const [isAutoWriting, setIsAutoWriting] = useState(false);
    const [isSuggestingTitles, setIsSuggestingTitles] = useState(false);
    const [isSuggestingStyles, setIsSuggestingStyles] = useState(false);
    const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);

    const [sunoHistory, setSunoHistory] = useState<SavedSunoSong[]>([]);
    
    // Feedback state for copy buttons
    const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        try {
            const saved = localStorage.getItem(SUNO_HISTORY_KEY);
            if (saved) {
                setSunoHistory(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load Suno history", e);
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);
    
    const handleAutoWrite = async () => {
        if (!idea.trim()) {
            addToast('Please enter a song idea.', 'error');
            return;
        }
        setIsAutoWriting(true);
        setTitle('');
        setStyleOfMusic('');
        setLyrics('');
        setTitleSuggestions([]);
        setStyleSuggestions([]);
        
        try {
            const [titles, styles] = await Promise.all([
                geminiService.suggestSunoTitles(idea, language, model),
                geminiService.suggestSunoStyles(idea, language, model)
            ]);
            
            const firstTitle = titles[0] || '';
            const firstStyle = styles[0] || '';
            
            setTitle(firstTitle);
            setTitleSuggestions(titles);
            setStyleOfMusic(firstStyle);
            setStyleSuggestions(styles);
            
            if (firstStyle) {
                setIsGeneratingLyrics(true); // Show spinner for lyrics part
                const lyricsResult = await geminiService.generateLyricsForSuno(idea, firstStyle, lyricalTheme, language, model);
                setLyrics(lyricsResult);
            }
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsAutoWriting(false);
            setIsGeneratingLyrics(false);
        }
    };

    const handleSuggestTitles = async () => {
        if (!idea.trim()) return;
        setIsSuggestingTitles(true);
        try {
            const titles = await geminiService.suggestSunoTitles(idea, language, model);
            setTitleSuggestions(titles);
            if (!title && titles.length > 0) setTitle(titles[0]);
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsSuggestingTitles(false);
        }
    };

    const handleSuggestStyles = async () => {
        if (!idea.trim()) return;
        setIsSuggestingStyles(true);
        try {
            const styles = await geminiService.suggestSunoStyles(idea, language, model);
            setStyleSuggestions(styles);
            if (!styleOfMusic && styles.length > 0) setStyleOfMusic(styles[0]);
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsSuggestingStyles(false);
        }
    };

    const handleGenerateLyrics = async () => {
        if (!idea.trim() || !styleOfMusic.trim()) {
            addToast('Please provide an idea and a music style first.', 'error');
            return;
        }
        setIsGeneratingLyrics(true);
        try {
            const result = await geminiService.generateLyricsForSuno(idea, styleOfMusic, lyricalTheme, language, model);
            setLyrics(result);
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsGeneratingLyrics(false);
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
    
    const handleSaveSong = useCallback(() => {
        if (!lyrics.trim() || !title.trim()) {
            addToast('Cannot save a song without a title and lyrics.', 'error');
            return;
        }
        const newSong: SavedSunoSong = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            songData: { title, styleOfMusic, lyrics, lyricalTheme },
        };
        const updatedHistory = [newSong, ...sunoHistory];
        setSunoHistory(updatedHistory);
        localStorage.setItem(SUNO_HISTORY_KEY, JSON.stringify(updatedHistory));
        addToast((appUIStrings[language] || appUIStrings['en']).toastSongSaved, 'success');
    }, [title, styleOfMusic, lyrics, lyricalTheme, sunoHistory, language, addToast]);
    
    const handleUseSong = (song: SavedSunoSong) => {
        setTitle(song.songData.title);
        setStyleOfMusic(song.songData.styleOfMusic);
        setLyrics(song.songData.lyrics);
        setLyricalTheme(song.songData.lyricalTheme || '');
        addToast((appUIStrings[language] || appUIStrings['en']).toastSongLoaded, 'info');
    };

    const handleDeleteSong = (id: string) => {
        if (window.confirm(uiStrings.deleteConfirm)) {
            const updatedHistory = sunoHistory.filter(song => song.id !== id);
            setSunoHistory(updatedHistory);
            localStorage.setItem(SUNO_HISTORY_KEY, JSON.stringify(updatedHistory));
            addToast((appUIStrings[language] || appUIStrings['en']).toastSongDeleted, 'success');
        }
    };
    
    const handleClearHistory = () => {
        if (window.confirm(uiStrings.clearConfirm)) {
            setSunoHistory([]);
            localStorage.removeItem(SUNO_HISTORY_KEY);
        }
    };


    const renderActionButton = (handler: () => void, isLoading: boolean, disabled: boolean, tooltip: string) => (
         <button
            onClick={handler}
            disabled={isLoading || disabled}
            className="p-1.5 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={tooltip}
        >
            {isLoading ? <Icon name="spinner" className="w-5 h-5 animate-spin" /> : <Icon name="magic" className="w-5 h-5" />}
        </button>
    );

    return (
        <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center z-50 p-4"
            onClick={onClose}
            role="dialog" aria-modal="true" aria-labelledby="suno-studio-title"
        >
            <div
                className="bg-slate-900/70 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 id="suno-studio-title" className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                        <Icon name="music" className="w-6 h-6 text-cyan-400" />
                        {uiStrings.title}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" aria-label="Close Suno Song Studio">
                        <Icon name="cancel" className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                    <TextAreaInput
                        label={uiStrings.ideaLabel}
                        name="sunoIdea"
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder={uiStrings.ideaPlaceholder}
                        rows={3}
                        maxLength={CHARACTER_LIMITS.sunoIdea}
                        info={uiStrings.tooltips.sunoStudioIdea}
                    />

                    <TextAreaInput
                        label={uiStrings.lyricalThemeLabel}
                        name="lyricalTheme"
                        value={lyricalTheme}
                        onChange={(e) => setLyricalTheme(e.target.value)}
                        placeholder={uiStrings.lyricalThemePlaceholder}
                        rows={2}
                        info={uiStrings.tooltips.sunoStudioLyricalTheme}
                    />

                    <div className="flex justify-center">
                        <button
                            onClick={handleAutoWrite}
                            disabled={isAutoWriting || !idea}
                            className={`flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                                isAutoWriting ? 'bg-cyan-700 animate-pulse' : 'hover:bg-cyan-500'
                            }`}
                        >
                            {isAutoWriting && <Icon name="spinner" className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                            <span>{isAutoWriting ? uiStrings.autoWritingButton : uiStrings.autoWriteButton}</span>
                        </button>
                    </div>


                    <div className="space-y-4 pt-4 border-t border-slate-700/50 animate-fade-in-up">
                        <TextAreaInput
                            label={uiStrings.outputTitle}
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            rows={1}
                            info={uiStrings.tooltips.sunoStudioTitle}
                            actionButton={renderActionButton(handleSuggestTitles, isSuggestingTitles, !idea.trim(), uiStrings.suggestTitlesButton)}
                        />
                        <SuggestionPills suggestions={titleSuggestions} onSelect={setTitle} />
                        
                        <TextAreaInput
                            label={uiStrings.outputStyle}
                            name="styleOfMusic"
                            value={styleOfMusic}
                            onChange={(e) => setStyleOfMusic(e.target.value)}
                            rows={2}
                            info={uiStrings.tooltips.sunoStudioStyle}
                            actionButton={renderActionButton(handleSuggestStyles, isSuggestingStyles, !idea.trim(), uiStrings.suggestStylesButton)}
                        />
                        <SuggestionPills suggestions={styleSuggestions} onSelect={setStyleOfMusic} />

                        <TextAreaInput
                            label={uiStrings.outputLyrics}
                            name="lyrics"
                            value={lyrics}
                            onChange={(e) => setLyrics(e.target.value)}
                            rows={12}
                            info={uiStrings.tooltips.sunoStudioLyrics}
                            actionButton={renderActionButton(handleGenerateLyrics, isGeneratingLyrics, !idea.trim() || !styleOfMusic.trim(), "Generate lyrics with AI")}
                        />
                    </div>

                    {/* History Section */}
                    <div className="pt-6 border-t border-slate-700/50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-md font-semibold text-slate-300">{uiStrings.historyTitle}</h3>
                            {sunoHistory.length > 0 && (
                                <button
                                    onClick={handleClearHistory}
                                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded-md transition-colors"
                                >
                                    {uiStrings.clearHistoryButton}
                                </button>
                            )}
                        </div>
                        {sunoHistory.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                <p>{uiStrings.historyEmpty}</p>
                            </div>
                        ) : (
                            <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {sunoHistory.map(song => (
                                    <li key={song.id} className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50 flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 truncate pr-2" title={song.songData.title}>
                                                {song.songData.title}
                                            </p>
                                            <p className="text-xs text-slate-300 mt-1">
                                                {new Date(song.timestamp).toLocaleString(language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center flex-shrink-0 space-x-1">
                                            <button onClick={() => handleUseSong(song)} className="px-3 py-1 text-xs font-semibold rounded-md transition-colors bg-slate-700 text-white hover:bg-slate-600">{uiStrings.useButton}</button>
                                            <button onClick={() => handleDeleteSong(song.id)} className="p-1.5 rounded-md transition-colors text-slate-400 hover:text-red-500 hover:bg-slate-700" aria-label={`${uiStrings.deleteButton} "${song.songData.title}"`}>
                                                <Icon name="trash" className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                 <footer className="p-4 border-t border-slate-700 flex-shrink-0 flex justify-between items-center gap-2">
                    <div>
                        <button 
                            onClick={handleSaveSong}
                            disabled={!lyrics.trim() || !title.trim()}
                            className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-slate-700 text-slate-200 hover:bg-slate-600"
                        >
                            <Icon name="save" className="w-4 h-4" />
                            <span>{uiStrings.saveSongButton}</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href="https://suno.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-300 hover:text-cyan-400 transition-colors">
                            Open Suno.com
                        </a>
                        <button 
                            onClick={() => handleCopy(title, 'title')} 
                            className={`p-2 rounded-md transition-all duration-300 ${copyStatus['title'] ? 'text-green-400 bg-green-500/10' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'}`} 
                            title="Copy Title"
                        >
                            {copyStatus['title'] ? <Icon name="check" className="w-4 h-4" /> : <Icon name="copy" className="w-4 h-4" />}
                        </button>
                        <button 
                            onClick={() => handleCopy(styleOfMusic, 'style')} 
                            className={`p-2 rounded-md transition-all duration-300 ${copyStatus['style'] ? 'text-green-400 bg-green-500/10' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'}`} 
                            title="Copy Style"
                        >
                            {copyStatus['style'] ? <Icon name="check" className="w-4 h-4" /> : <Icon name="copy" className="w-4 h-4" />}
                        </button>
                        <button 
                            onClick={() => handleCopy(lyrics, 'lyrics')} 
                            className={`p-2 rounded-md transition-all duration-300 ${copyStatus['lyrics'] ? 'text-green-400 bg-green-500/10' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'}`} 
                            title="Copy Lyrics"
                        >
                            {copyStatus['lyrics'] ? <Icon name="check" className="w-4 h-4" /> : <Icon name="copy" className="w-4 h-4" />}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default SunoSongStudio;
