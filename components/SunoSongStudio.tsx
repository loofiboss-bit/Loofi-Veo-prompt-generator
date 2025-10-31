import React, { useState, useEffect, useCallback } from 'react';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { ToastMessage } from '../types';
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
    const [title, setTitle] = useState('');
    const [styleOfMusic, setStyleOfMusic] = useState('');
    const [lyrics, setLyrics] = useState('');
    
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
    const [styleSuggestions, setStyleSuggestions] = useState<string[]>([]);

    const [isAutoWriting, setIsAutoWriting] = useState(false);
    const [isSuggestingTitles, setIsSuggestingTitles] = useState(false);
    const [isSuggestingStyles, setIsSuggestingStyles] = useState(false);
    const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);

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
                const lyricsResult = await geminiService.generateLyricsForSuno(idea, firstStyle, language, model);
                setLyrics(lyricsResult);
            }
        } catch (error) {
            addToast(getApiErrorMessage(error, appUIStrings[language]), 'error');
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
            addToast(getApiErrorMessage(error, appUIStrings[language]), 'error');
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
            addToast(getApiErrorMessage(error, appUIStrings[language]), 'error');
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
            const result = await geminiService.generateLyricsForSuno(idea, styleOfMusic, language, model);
            setLyrics(result);
        } catch (error) {
            addToast(getApiErrorMessage(error, appUIStrings[language]), 'error');
        } finally {
            setIsGeneratingLyrics(false);
        }
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            addToast('Copied to clipboard!', 'success');
        });
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
                        actionButton={
                            <Button onClick={handleAutoWrite} isLoading={isAutoWriting} disabled={isAutoWriting || !idea}>
                                {isAutoWriting ? uiStrings.autoWritingButton : uiStrings.autoWriteButton}
                            </Button>
                        }
                    />

                    <div className="space-y-4 pt-4 border-t border-slate-700/50 animate-fade-in-up">
                        <TextAreaInput
                            label={uiStrings.outputTitle}
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            rows={1}
                            actionButton={renderActionButton(handleSuggestTitles, isSuggestingTitles, !idea.trim(), uiStrings.suggestTitlesButton)}
                        />
                        <SuggestionPills suggestions={titleSuggestions} onSelect={setTitle} />
                        
                        <TextAreaInput
                            label={uiStrings.outputStyle}
                            name="styleOfMusic"
                            value={styleOfMusic}
                            onChange={(e) => setStyleOfMusic(e.target.value)}
                            rows={2}
                            actionButton={renderActionButton(handleSuggestStyles, isSuggestingStyles, !idea.trim(), uiStrings.suggestStylesButton)}
                        />
                        <SuggestionPills suggestions={styleSuggestions} onSelect={setStyleOfMusic} />

                        <TextAreaInput
                            label={uiStrings.outputLyrics}
                            name="lyrics"
                            value={lyrics}
                            onChange={(e) => setLyrics(e.target.value)}
                            rows={12}
                            actionButton={renderActionButton(handleGenerateLyrics, isGeneratingLyrics, !idea.trim() || !styleOfMusic.trim(), "Generate lyrics with AI")}
                        />
                    </div>
                </div>
                 <footer className="p-4 border-t border-slate-700 flex-shrink-0 flex justify-end items-center gap-2">
                    <a href="https://suno.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                        Open Suno.com
                    </a>
                    <button onClick={() => handleCopy(title)} className="p-2 rounded-md text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors" title="Copy Title"><Icon name="copy" className="w-4 h-4" /></button>
                    <button onClick={() => handleCopy(styleOfMusic)} className="p-2 rounded-md text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors" title="Copy Style"><Icon name="copy" className="w-4 h-4" /></button>
                    <button onClick={() => handleCopy(lyrics)} className="p-2 rounded-md text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors" title="Copy Lyrics"><Icon name="copy" className="w-4 h-4" /></button>
                </footer>
            </div>
        </div>
    );
};

export default SunoSongStudio;