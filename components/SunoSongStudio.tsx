/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useCallback } from 'react';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { ToastMessage, SavedSunoSong } from '../types';
import { CHARACTER_LIMITS, getLanguageOptions } from '../constants';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
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
                    className="px-3 py-1 text-xs rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors border border-slate-600/50"
                >
                    + {suggestion}
                </button>
            ))}
        </div>
    );
};

const SunoSongStudio: React.FC<SunoSongStudioProps> = ({ onClose, uiStrings, addToast, language, model }) => {
    const t = uiStrings.sunoStudio;
    const [idea, setIdea] = useState('');
    const [lyricalTheme, setLyricalTheme] = useState('');
    const [title, setTitle] = useState('');
    const [styleOfMusic, setStyleOfMusic] = useState('');
    const [lyrics, setLyrics] = useState('');
    const [songLanguage, setSongLanguage] = useState(language);
    
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
    const [styleSuggestions, setStyleSuggestions] = useState<string[]>([]);
    
    // Index tracking for navigation
    const [currentTitleIndex, setCurrentTitleIndex] = useState(0);
    
    // Lyrics history to support navigation
    const [lyricsHistory, setLyricsHistory] = useState<string[]>([]);
    const [currentLyricsIndex, setCurrentLyricsIndex] = useState(-1);

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
        setLyricsHistory([]);
        setCurrentLyricsIndex(-1);
        setCurrentTitleIndex(0);
        
        try {
            const [titles, styles] = await Promise.all([
                geminiService.suggestSunoTitles(idea, lyricalTheme, songLanguage, model),
                geminiService.suggestSunoStyles(idea, lyricalTheme, songLanguage, model)
            ]);
            
            const firstTitle = titles[0] || '';
            const firstStyle = styles[0] || '';
            
            setTitle(firstTitle);
            setTitleSuggestions(titles);
            setStyleOfMusic(firstStyle);
            setStyleSuggestions(styles);
            
            if (firstStyle) {
                setIsGeneratingLyrics(true); // Show spinner for lyrics part
                const lyricsResult = await geminiService.generateLyricsForSuno(idea, firstStyle, lyricalTheme, songLanguage, model);
                setLyrics(lyricsResult);
                setLyricsHistory([lyricsResult]);
                setCurrentLyricsIndex(0);
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
            const titles = await geminiService.suggestSunoTitles(idea, lyricalTheme, songLanguage, model);
            setTitleSuggestions(titles);
            if (!title && titles.length > 0) {
                setTitle(titles[0]);
                setCurrentTitleIndex(0);
            }
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
            const styles = await geminiService.suggestSunoStyles(idea, lyricalTheme, songLanguage, model);
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
            const result = await geminiService.generateLyricsForSuno(idea, styleOfMusic, lyricalTheme, songLanguage, model);
            setLyrics(result);
            setLyricsHistory(prev => [...prev, result]);
            setCurrentLyricsIndex(prev => prev + 1);
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsGeneratingLyrics(false);
        }
    };

    const cycleTitle = (direction: 'next' | 'prev') => {
        if (titleSuggestions.length === 0) return;
        let newIndex = direction === 'next' ? currentTitleIndex + 1 : currentTitleIndex - 1;
        if (newIndex >= titleSuggestions.length) newIndex = 0;
        if (newIndex < 0) newIndex = titleSuggestions.length - 1;
        
        setCurrentTitleIndex(newIndex);
        setTitle(titleSuggestions[newIndex]);
    };

    const cycleLyrics = (direction: 'next' | 'prev') => {
        if (lyricsHistory.length === 0) return;
        let newIndex = direction === 'next' ? currentLyricsIndex + 1 : currentLyricsIndex - 1;
        if (newIndex >= lyricsHistory.length) newIndex = 0;
        if (newIndex < 0) newIndex = lyricsHistory.length - 1;
        
        setCurrentLyricsIndex(newIndex);
        setLyrics(lyricsHistory[newIndex]);
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
        addToast(uiStrings.toastSongSaved, 'success');
    }, [title, styleOfMusic, lyrics, lyricalTheme, sunoHistory, addToast, uiStrings.toastSongSaved]);
    
    const handleUseSong = (song: SavedSunoSong) => {
        setTitle(song.songData.title);
        setStyleOfMusic(song.songData.styleOfMusic);
        setLyrics(song.songData.lyrics);
        setLyricalTheme(song.songData.lyricalTheme || '');
        
        // Reset navigation state when loading from history
        setLyricsHistory([song.songData.lyrics]);
        setCurrentLyricsIndex(0);
        setTitleSuggestions([song.songData.title]);
        setCurrentTitleIndex(0);
        
        addToast(uiStrings.toastSongLoaded, 'info');
    };

    const handleDeleteSong = (id: string) => {
        if (window.confirm(t.deleteConfirm)) {
            const updatedHistory = sunoHistory.filter(song => song.id !== id);
            setSunoHistory(updatedHistory);
            localStorage.setItem(SUNO_HISTORY_KEY, JSON.stringify(updatedHistory));
            addToast(uiStrings.toastSongDeleted, 'success');
        }
    };
    
    const handleClearHistory = () => {
        if (window.confirm(t.clearConfirm)) {
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

    const renderNavLabel = (text: string, onPrev: () => void, onNext: () => void, showNav: boolean) => (
        <div className="flex items-center justify-between w-full pr-2">
            <span>{text}</span>
            {showNav && (
                <div className="flex items-center gap-2" onMouseDown={(e) => e.preventDefault()}> 
                    <button onClick={(e) => { e.preventDefault(); onPrev(); }} className="p-1 text-slate-400 hover:text-cyan-400 transition-colors">
                        <Icon name="chevron-down" className="w-5 h-5 rotate-90" />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); onNext(); }} className="p-1 text-slate-400 hover:text-cyan-400 transition-colors">
                        <Icon name="chevron-down" className="w-5 h-5 -rotate-90" />
                    </button>
                </div>
            )}
        </div>
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
                        {t.title}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" aria-label="Close Suno Song Studio">
                        <Icon name="cancel" className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <TextAreaInput
                                label={t.ideaLabel}
                                name="sunoIdea"
                                value={idea}
                                onChange={(e) => setIdea(e.currentTarget.value)}
                                placeholder={t.ideaPlaceholder}
                                rows={3}
                                maxLength={CHARACTER_LIMITS.sunoIdea}
                                info={uiStrings.tooltips.sunoStudioIdea}
                            />
                        </div>
                        <div>
                             <SelectInput
                                label="Language"
                                name="songLanguage"
                                options={getLanguageOptions()}
                                value={songLanguage}
                                onChange={(e) => setSongLanguage(e.currentTarget.value as any)}
                                info="Language for the generated lyrics."
                            />
                        </div>
                    </div>

                    <TextAreaInput
                        label={t.lyricalThemeLabel}
                        name="lyricalTheme"
                        value={lyricalTheme}
                        onChange={(e) => setLyricalTheme(e.currentTarget.value)}
                        placeholder={t.lyricalThemePlaceholder}
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
                            <span>{isAutoWriting ? t.autoWritingButton : t.autoWriteButton}</span>
                        </button>
                    </div>


                    <div className="space-y-4 pt-4 border-t border-slate-700/50 animate-fade-in-up">
                        <TextAreaInput
                            label={renderNavLabel(t.outputTitle, () => cycleTitle('prev'), () => cycleTitle('next'), titleSuggestions.length > 1)}
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.currentTarget.value)}
                            rows={1}
                            info={uiStrings.tooltips.sunoStudioTitle}
                            actionButton={renderActionButton(handleSuggestTitles, isSuggestingTitles, !idea.trim(), t.suggestTitlesButton)}
                        />
                        <SuggestionPills suggestions={titleSuggestions} onSelect={(val) => { setTitle(val); setCurrentTitleIndex(titleSuggestions.indexOf(val)); }} />
                        
                        <TextAreaInput
                            label={t.outputStyle}
                            name="styleOfMusic"
                            value={styleOfMusic}
                            onChange={(e) => setStyleOfMusic(e.currentTarget.value)}
                            rows={2}
                            info={uiStrings.tooltips.sunoStudioStyle}
                            actionButton={renderActionButton(handleSuggestStyles, isSuggestingStyles, !idea.trim(), t.suggestStylesButton)}
                        />
                        <SuggestionPills suggestions={styleSuggestions} onSelect={setStyleOfMusic} />

                        <TextAreaInput
                            label={renderNavLabel(t.outputLyrics, () => cycleLyrics('prev'), () => cycleLyrics('next'), lyricsHistory.length > 1)}
                            name="lyrics"
                            value={lyrics}
                            onChange={(e) => setLyrics(e.currentTarget.value)}
                            rows={12}
                            info={uiStrings.tooltips.sunoStudioLyrics}
                            actionButton={renderActionButton(handleGenerateLyrics, isGeneratingLyrics, !idea.trim() || !styleOfMusic.trim(), "Generate lyrics with AI")}
                        />
                    </div>

                    {/* History Section */}
                    <div className="pt-6 border-t border-slate-700/50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-md font-semibold text-slate-300">{t.historyTitle}</h3>
                            {sunoHistory.length > 0 && (
                                <button
                                    onClick={handleClearHistory}
                                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded-md transition-colors"
                                >
                                    {t.clearHistoryButton}
                                </button>
                            )}
                        </div>
                        {sunoHistory.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                <p>{t.historyEmpty}</p>
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
                                            <button onClick={() => handleUseSong(song)} className="px-3 py-1 text-xs font-semibold rounded-md transition-colors bg-slate-700 text-white hover:bg-slate-600">{t.useButton}</button>
                                            <button onClick={() => handleDeleteSong(song.id)} className="p-1.5 rounded-md transition-colors text-slate-400 hover:text-red-500 hover:bg-slate-700" aria-label={`${t.deleteButton} "${song.songData.title}"`}>
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
                            <span>{t.saveSongButton}</span>
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