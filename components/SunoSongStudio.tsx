
import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import TextAreaInput from './TextAreaInput';
import SelectInput from './SelectInput';
import Button from './Button';
import { ToastMessage } from '../types';
import * as geminiService from '../services/geminiService';
import { SUNO_TAGS } from '../data/sunoTags';
import { getApiErrorMessage } from '../utils/errorHandler';

interface SunoSongStudioProps {
  onClose: () => void;
  uiStrings: any;
  addToast: (message: string, type: ToastMessage['type']) => void;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  model: string;
}

type TabType = 'style' | 'lyrics' | 'extend';
type FocusedField = 'styleOutput' | 'lyricsOutput' | 'extensionContext' | null;

const SunoSongStudio: React.FC<SunoSongStudioProps> = ({ onClose, uiStrings, addToast, language, model }) => {
  // --- Layout State ---
  const [activeTab, setActiveTab] = useState<TabType>('style');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [lastFocused, setLastFocused] = useState<FocusedField>('styleOutput');

  // --- Style Engineer State ---
  const [styleInputs, setStyleInputs] = useState({
    decade: '',
    genre: 'Pop',
    subGenre: '',
    voice: '',
    tempo: '',
    mood: ''
  });
  const [styleOutput, setStyleOutput] = useState('');
  const [isConstructing, setIsConstructing] = useState(false);

  // --- Lyric Lab State ---
  const [lyricInputs, setLyricInputs] = useState({
    topic: '',
    structure: 'pop_standard' as any
  });
  const [lyricsOutput, setLyricsOutput] = useState('');
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);

  // --- Extension State ---
  const [extendInputs, setExtendInputs] = useState({
    context: '',
    nextSection: 'Verse' as 'Verse' | 'Chorus' | 'Bridge' | 'Outro'
  });
  const [extensionResult, setExtensionResult] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  // --- Refs ---
  const styleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lyricsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const extensionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // --- Logic: Style ---
  const handleConstructStyle = async () => {
    setIsConstructing(true);
    try {
      const constructed = await geminiService.constructSunoStyle({
        ...styleInputs,
        instruments: [] // Could add specific instrument inputs later
      });
      setStyleOutput(constructed);
      setLastFocused('styleOutput');
    } catch (error) {
      addToast("Failed to construct style.", 'error');
    } finally {
      setIsConstructing(false);
    }
  };

  // --- Logic: Lyrics ---
  const handleGenerateLyrics = async () => {
    if (!lyricInputs.topic.trim()) {
      addToast("Please enter a song topic.", 'error');
      return;
    }
    setIsGeneratingLyrics(true);
    try {
      const result = await geminiService.generateSongLyrics({
        topic: lyricInputs.topic,
        mood: styleOutput || styleInputs.mood || 'Engaging',
        structure: lyricInputs.structure,
        language,
        model
      });
      setLyricsOutput(result);
      setLastFocused('lyricsOutput');
      // Switch focus visually
      setActiveTab('lyrics'); 
    } catch (error) {
      addToast(getApiErrorMessage(error, uiStrings), 'error');
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  // --- Logic: Extension ---
  const handleExtend = async () => {
    if (!extendInputs.context.trim()) {
      addToast("Please provide context lyrics.", 'error');
      return;
    }
    setIsExtending(true);
    try {
      const result = await geminiService.extendLyrics(extendInputs.context, extendInputs.nextSection);
      setExtensionResult(result);
    } catch (error) {
      addToast(getApiErrorMessage(error, uiStrings), 'error');
    } finally {
      setIsExtending(false);
    }
  };

  // --- Logic: Tag Insertion ---
  const insertTag = (tag: string) => {
    let targetStateSetter: React.Dispatch<React.SetStateAction<string>> | null = null;
    let targetRef: React.RefObject<HTMLTextAreaElement> | null = null;
    let currentValue = '';

    // Determine target based on active tab AND last focused field
    // If user is in Lyrics tab, force target to lyrics output unless they specifically clicked something else
    
    if (activeTab === 'style') {
        targetStateSetter = setStyleOutput;
        targetRef = styleTextareaRef;
        currentValue = styleOutput;
    } else if (activeTab === 'lyrics') {
        targetStateSetter = setLyricsOutput;
        targetRef = lyricsTextareaRef;
        currentValue = lyricsOutput;
    } else if (activeTab === 'extend') {
        targetStateSetter = (val) => setExtendInputs(prev => ({...prev, context: typeof val === 'function' ? val(prev.context) : val}));
        targetRef = extensionTextareaRef;
        currentValue = extendInputs.context;
    }

    if (targetStateSetter && targetRef && targetRef.current) {
      const start = targetRef.current.selectionStart;
      const end = targetRef.current.selectionEnd;
      
      // Smart spacing
      const prefix = (start > 0 && currentValue[start - 1] !== ' ' && currentValue[start - 1] !== '\n') ? (tag.startsWith('[') ? '\n' : ', ') : '';
      const suffix = (tag.startsWith('[')) ? '\n' : '';

      const insertion = `${prefix}${tag}${suffix}`;
      const newValue = currentValue.substring(0, start) + insertion + currentValue.substring(end);
      
      targetStateSetter(newValue);
      
      // Restore focus and cursor
      setTimeout(() => {
        if (targetRef.current) {
            targetRef.current.focus();
            const newPos = start + insertion.length;
            targetRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  // --- Render Helpers ---
  const renderTabButton = (id: TabType, label: string, icon: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all font-semibold text-sm ${
        activeTab === id
          ? 'border-fuchsia-500 text-fuchsia-400 bg-slate-800/50'
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
      }`}
    >
      <Icon name={icon} className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[130] flex flex-col animate-fade-in-up">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-fuchsia-900/30 rounded-lg">
            <Icon name="music" className="w-6 h-6 text-fuchsia-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Suno Song Studio</h2>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide">V3.0 // AUDIO ARCHITECT</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-lg border transition-colors ${isSidebarOpen ? 'bg-slate-800 border-slate-600 text-fuchsia-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                title="Toggle Tag Library"
            >
                <Icon name="library" className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-slate-800 mx-2"></div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <Icon name="cancel" className="w-6 h-6" />
            </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-grow flex overflow-hidden">
        
        {/* Left: Content Area */}
        <div className="flex-grow flex flex-col min-w-0 bg-slate-900/50">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900">
                {renderTabButton('style', 'Style Engineer', 'sliders')}
                {renderTabButton('lyrics', 'Lyric Lab', 'edit')}
                {renderTabButton('extend', 'Extension', 'plus')}
            </div>

            {/* Content Views */}
            <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                
                {/* 1. Style Engineer */}
                {activeTab === 'style' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <SelectInput 
                                label="Genre" 
                                name="genre" 
                                options={[{value: 'Pop', label: 'Pop'}, {value: 'Rock', label: 'Rock'}, {value: 'Electronic', label: 'Electronic'}, {value: 'Hip Hop', label: 'Hip Hop'}, {value: 'Jazz', label: 'Jazz'}, {value: 'Metal', label: 'Metal'}, {value: 'Classical', label: 'Classical'}]}
                                value={styleInputs.genre} 
                                onChange={(e) => setStyleInputs({...styleInputs, genre: e.target.value})} 
                            />
                            <SelectInput 
                                label="Decade / Era" 
                                name="decade" 
                                options={[{value: '', label: 'Modern'}, {value: '1950s', label: '1950s'}, {value: '1960s', label: '1960s'}, {value: '1970s', label: '1970s'}, {value: '1980s', label: '1980s'}, {value: '1990s', label: '1990s'}, {value: '2000s', label: '2000s'}, {value: '2010s', label: '2010s'}]}
                                value={styleInputs.decade} 
                                onChange={(e) => setStyleInputs({...styleInputs, decade: e.target.value})} 
                            />
                            <SelectInput 
                                label="Voice" 
                                name="voice" 
                                options={[{value: '', label: 'Any'}, {value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}, {value: 'Duet', label: 'Duet'}, {value: 'Choir', label: 'Choir'}, {value: 'Instrumental', label: 'Instrumental'}]}
                                value={styleInputs.voice} 
                                onChange={(e) => setStyleInputs({...styleInputs, voice: e.target.value})} 
                            />
                            <TextAreaInput 
                                label="Sub-Genre / Specifics" 
                                name="subGenre" 
                                value={styleInputs.subGenre} 
                                onChange={(e) => setStyleInputs({...styleInputs, subGenre: e.target.value})} 
                                placeholder="e.g. Dream Pop, Trap, Power Ballad"
                                rows={1}
                            />
                            <SelectInput 
                                label="Tempo" 
                                name="tempo" 
                                options={[{value: '', label: 'Any'}, {value: 'Slow', label: 'Slow'}, {value: 'Mid-tempo', label: 'Mid-tempo'}, {value: 'Fast', label: 'Fast'}, {value: 'Variable', label: 'Variable'}]}
                                value={styleInputs.tempo} 
                                onChange={(e) => setStyleInputs({...styleInputs, tempo: e.target.value})} 
                            />
                            <TextAreaInput 
                                label="Mood / Vibe" 
                                name="mood" 
                                value={styleInputs.mood} 
                                onChange={(e) => setStyleInputs({...styleInputs, mood: e.target.value})} 
                                placeholder="e.g. Ethereal, Aggressive, Sad"
                                rows={1}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleConstructStyle} isLoading={isConstructing} disabled={isConstructing}>
                                Construct Prompt
                            </Button>
                        </div>

                        <div className="border-t border-slate-800 pt-6">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Style Prompt Output</label>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(styleOutput); addToast("Copied!", 'success'); }}
                                    className="text-xs text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1"
                                >
                                    <Icon name="copy" className="w-3 h-3" /> Copy
                                </button>
                            </div>
                            <TextAreaInput 
                                label="" 
                                name="styleOutput" 
                                ref={styleTextareaRef}
                                value={styleOutput} 
                                onChange={(e) => setStyleOutput(e.target.value)} 
                                onBlur={() => setLastFocused('styleOutput')}
                                rows={4}
                                placeholder="Generated style tags will appear here..."
                                actionButton={<div className="text-[10px] text-slate-500 italic px-2">Use sidebar to add more tags</div>}
                            />
                        </div>
                    </div>
                )}

                {/* 2. Lyric Lab */}
                {activeTab === 'lyrics' && (
                    <div className="max-w-4xl mx-auto h-full flex flex-col animate-fade-in-up">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="col-span-2">
                                <TextAreaInput 
                                    label="Song Topic" 
                                    name="lyricTopic" 
                                    value={lyricInputs.topic} 
                                    onChange={(e) => setLyricInputs({...lyricInputs, topic: e.target.value})} 
                                    placeholder="What is this song about?"
                                    rows={1}
                                    autoFocus
                                />
                            </div>
                            <div className="flex items-end pb-1">
                                <Button onClick={handleGenerateLyrics} isLoading={isGeneratingLyrics} disabled={isGeneratingLyrics}>
                                    Generate Lyrics
                                </Button>
                            </div>
                        </div>

                        <div className="flex-grow flex flex-col">
                             <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Lyrics Editor</label>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(lyricsOutput); addToast("Lyrics copied!", 'success'); }}
                                    className="text-xs text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1"
                                >
                                    <Icon name="copy" className="w-3 h-3" /> Copy
                                </button>
                            </div>
                            <div className="flex-grow relative">
                                <TextAreaInput 
                                    label="" 
                                    name="lyricsOutput" 
                                    ref={lyricsTextareaRef}
                                    value={lyricsOutput} 
                                    onChange={(e) => setLyricsOutput(e.target.value)} 
                                    onBlur={() => setLastFocused('lyricsOutput')}
                                    rows={20}
                                    placeholder="Lyrics will appear here. Use the sidebar to insert Structure tags like [Chorus]."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Extension */}
                {activeTab === 'extend' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
                        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-6">
                            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                                <Icon name="plus" className="w-4 h-4 text-fuchsia-400" />
                                Extend Song
                            </h3>
                            
                            <TextAreaInput 
                                label="Previous Context (Last few lines)" 
                                name="extensionContext" 
                                ref={extensionTextareaRef}
                                value={extendInputs.context} 
                                onChange={(e) => setExtendInputs({...extendInputs, context: e.target.value})} 
                                onBlur={() => setLastFocused('extensionContext')}
                                placeholder="Paste the end of your current lyrics here..."
                                rows={6}
                            />

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <SelectInput 
                                    label="Next Section Type" 
                                    name="nextSection" 
                                    options={[{value: 'Verse', label: 'Verse'}, {value: 'Chorus', label: 'Chorus'}, {value: 'Bridge', label: 'Bridge'}, {value: 'Outro', label: 'Outro'}]}
                                    value={extendInputs.nextSection} 
                                    onChange={(e) => setExtendInputs({...extendInputs, nextSection: e.target.value as any})} 
                                />
                                <div className="flex items-end pb-0.5">
                                    <Button onClick={handleExtend} isLoading={isExtending} disabled={isExtending}>
                                        Generate Extension
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {extensionResult && (
                            <div className="bg-slate-900 border border-fuchsia-500/30 rounded-xl p-6 relative">
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button 
                                        onClick={() => {
                                            setLyricsOutput(prev => prev + '\n\n' + extensionResult);
                                            addToast("Appended to Lyric Lab", 'success');
                                            setActiveTab('lyrics');
                                        }}
                                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-600 transition-colors"
                                    >
                                        Append to Editor
                                    </button>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(extensionResult); addToast("Copied extension", 'success'); }}
                                        className="text-xs bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-3 py-1.5 rounded shadow-lg transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <h4 className="text-xs font-bold text-fuchsia-400 uppercase mb-3">Generated Extension</h4>
                                <pre className="text-sm text-slate-300 font-sans whitespace-pre-wrap">{extensionResult}</pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Right: Tag Sidebar */}
        <div 
            className={`bg-slate-900 border-l border-slate-800 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-0 opacity-0 overflow-hidden'}`}
        >
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
                <Icon name="library" className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-bold text-slate-200">Suno Tag Library</h3>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {Object.entries(SUNO_TAGS).map(([category, tags]) => (
                    <div key={category}>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{category}</h4>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => insertTag(tag)}
                                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-fuchsia-900/40 text-slate-300 hover:text-fuchsia-300 border border-slate-700 hover:border-fuchsia-500/50 rounded-md transition-all text-left truncate max-w-full"
                                    title={`Insert ${tag}`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                Click tags to insert at cursor position.
            </div>
        </div>
      </div>
    </div>
  );
};

export default SunoSongStudio;
