
import React, { useState, useEffect, useCallback } from 'react';
import * as geminiService from '../services/geminiService';
import { getApiErrorMessage } from '../utils/errorHandler';
import { SunoSongData, ToastMessage } from '../types';
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

const OutputSection: React.FC<{ title: string; content: string; copyText: string; copiedText: string; rows?: number }> = ({ title, content, copyText, copiedText, rows = 3 }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(content).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    }, [content]);

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-semibold text-slate-100">{title}</h3>
                <button
                    onClick={handleCopy}
                    className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-slate-300 bg-slate-700/60 hover:bg-slate-700 disabled:opacity-50"
                    disabled={!content}
                >
                    <Icon name={isCopied ? 'check' : 'copy'} className={`w-4 h-4 ${isCopied ? 'text-green-400' : ''}`} />
                    <span>{isCopied ? copiedText : copyText}</span>
                </button>
            </div>
            <textarea
                readOnly
                value={content}
                rows={rows}
                className="w-full bg-slate-800/60 backdrop-blur-sm border rounded-lg shadow-sm text-slate-200 placeholder-slate-500 p-3 resize-y border-slate-700 font-mono text-sm"
                placeholder="..."
            />
        </div>
    );
};


const SunoSongStudio: React.FC<SunoSongStudioProps> = ({ onClose, uiStrings, addToast, language, model }) => {
    const [idea, setIdea] = useState('');
    const [songData, setSongData] = useState<SunoSongData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);
    
    const handleGenerate = async () => {
        if (!idea.trim()) {
            addToast('Please enter a song idea.', 'error');
            return;
        }
        setIsLoading(true);
        setSongData(null);
        try {
            const result = await geminiService.generateSunoSong(idea, language, model);
            setSongData(result);
        } catch (error) {
            addToast(getApiErrorMessage(error, uiStrings), 'error');
        } finally {
            setIsLoading(false);
        }
    };

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
                    />
                    <div className="flex justify-center">
                        <Button onClick={handleGenerate} isLoading={isLoading} disabled={isLoading || !idea}>
                            {isLoading ? uiStrings.generatingButton : uiStrings.generateButton}
                        </Button>
                    </div>

                    {songData && (
                        <div className="space-y-4 pt-4 border-t border-slate-700/50 animate-fade-in-up">
                            <OutputSection 
                                title={uiStrings.outputTitle}
                                content={songData.title}
                                copyText={uiStrings.copyButton}
                                copiedText={appUIStrings[language].copied}
                                rows={1}
                            />
                             <OutputSection 
                                title={uiStrings.outputStyle}
                                content={songData.styleOfMusic}
                                copyText={uiStrings.copyButton}
                                copiedText={appUIStrings[language].copied}
                                rows={2}
                            />
                             <OutputSection 
                                title={uiStrings.outputLyrics}
                                content={songData.lyrics}
                                copyText={uiStrings.copyButton}
                                copiedText={appUIStrings[language].copied}
                                rows={12}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SunoSongStudio;