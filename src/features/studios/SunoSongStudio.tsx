import React, { useState, useEffect, useRef } from 'react';
import Icon from '@shared/components/ui/Icon';
import { SunoExportMode, SunoPack, ToastMessage, SunoSettings } from '@core/types';
import { SUNO_TAGS } from '@core/data/sunoTags';
import * as geminiService from '@core/services/geminiService';
import { exportSunoPack } from '@core/services/suno/sunoWorkflowService';
import { getApiErrorMessage } from '@core/utils/errorHandler';
import { useTranslation } from 'react-i18next';
import SelectInput from '@shared/components/ui/SelectInput';
import TextAreaInput from '@shared/components/ui/TextAreaInput';

interface SunoSongStudioProps {
  onClose: () => void;
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const FIRST_TAG_CATEGORY = Object.keys(SUNO_TAGS)[0];
const DEFAULT_LANGUAGE = 'English';
const DEFAULT_STYLE_INFLUENCE = 75;
const SUNO_EXPORT_OPTIONS: Array<{ value: SunoExportMode; label: string }> = [
  { value: 'simple-prompt', label: 'Simple Prompt' },
  { value: 'custom-mode-prompt', label: 'Custom Mode' },
  { value: 'lyrics-only', label: 'Lyrics Only' },
  { value: 'style-tags-only', label: 'Style Tags Only' },
  { value: 'full-production-brief', label: 'Production Brief' },
  { value: 'json', label: 'JSON' },
];
const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Korean',
].map((language) => ({ value: language, label: language }));

const DEFAULT_SETTINGS: SunoSettings = {
  topic: '',
  genre: '',
  mood: '',
  voice: 'Any',
  tempo: 'Any',
  structure: 'Auto',
  language: DEFAULT_LANGUAGE,
  instruments: '',
  isInstrumental: false,
  styleInfluence: null,
};

const SunoSongStudio: React.FC<SunoSongStudioProps> = ({ onClose, addToast }) => {
  const { i18n } = useTranslation('errors');
  const [view, setView] = useState<'input' | 'launchpad'>('input');
  const [settings, setSettings] = useState<SunoSettings>(DEFAULT_SETTINGS);
  const [songData, setSongData] = useState<SunoPack | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [exportMode, setExportMode] = useState<SunoExportMode>('custom-mode-prompt');

  // Feedback State
  const [styleCopyText, setStyleCopyText] = useState('COPY STYLE');
  const [lyricsCopyText, setLyricsCopyText] = useState('COPY LYRICS');
  const [exportCopyText, setExportCopyText] = useState('COPY EXPORT');

  // Tag Toolbar State
  const [activeCategory, setActiveCategory] = useState<string>(FIRST_TAG_CATEGORY);
  const [inputResetVersion, setInputResetVersion] = useState(0);

  // Refs
  const lyricsRef = useRef<HTMLTextAreaElement>(null);
  const topicInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (view !== 'input') {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      topicInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [view, inputResetVersion]);

  const updateSetting = <K extends keyof SunoSettings>(key: K, value: SunoSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleVoiceChange = (voice: string) => {
    setSettings((current) => ({
      ...current,
      voice,
      isInstrumental:
        voice === 'Instrumental'
          ? true
          : current.isInstrumental && current.voice === 'Instrumental'
            ? false
            : current.isInstrumental,
    }));
  };

  const handleInstrumentalToggle = (isInstrumental: boolean) => {
    setSettings((current) => ({
      ...current,
      isInstrumental,
      voice: isInstrumental
        ? 'Instrumental'
        : current.voice === 'Instrumental'
          ? 'Any'
          : current.voice,
    }));
  };

  // --- Actions ---

  const handleGenerate = async () => {
    if (!settings.topic.trim()) {
      addToast('Please enter a song topic.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const pack = await geminiService.generateSunoPack(settings);
      setSongData(pack);
      setView('launchpad');
      addToast('Pro Asset Generated', 'success');
    } catch (error) {
      addToast(
        getApiErrorMessage(error, i18n.getResourceBundle(i18n.language, 'errors') || {}),
        'error',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExtendLyrics = async () => {
    if (!songData) return;
    setIsExtending(true);
    try {
      const newLines = await geminiService.extendSunoLyrics(
        songData.lyrics || '',
        settings.topic,
        songData.style || '',
        settings.language,
      );
      if (newLines) {
        setSongData({ ...songData, lyrics: (songData.lyrics || '') + '\n\n' + newLines });
        addToast('Lyrics extended.', 'success');
      }
    } catch (_e) {
      addToast('Failed to extend lyrics.', 'error');
    } finally {
      setIsExtending(false);
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

  const handleCopyExport = () => {
    if (!songData) return;

    navigator.clipboard.writeText(exportSunoPack(settings, songData, exportMode));
    setExportCopyText('COPIED!');
    setTimeout(() => setExportCopyText('COPY EXPORT'), 3000);
  };

  const handleInsertTag = (tag: string) => {
    if (!lyricsRef.current || !songData) return;

    const textarea = lyricsRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = songData.lyrics || '';
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const insertion = `\n${tag}\n`;
    const newText = before + insertion + after;

    setSongData({ ...songData, lyrics: newText });

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertion.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleReset = () => {
    if (confirm('Start over? Unsaved lyrics will be lost.')) {
      setView('input');
      setSongData(null);
      setShowManual(false);
      setStyleCopyText('COPY STYLE');
      setLyricsCopyText('COPY LYRICS');
      setExportCopyText('COPY EXPORT');
      setActiveCategory(FIRST_TAG_CATEGORY);
      setSettings((current) => ({ ...DEFAULT_SETTINGS, topic: current.topic }));
      setInputResetVersion((current) => current + 1);
    }
  };

  const openSuno = () => window.open('https://suno.com/create', '_blank');

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[150] flex items-center justify-center p-4 animate-fade-in-up">
      <div className="w-full max-w-6xl h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* --- HEADER --- */}
        <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-fuchsia-900/30 rounded-lg border border-fuchsia-500/30">
              <Icon name="music" className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Suno Architect{' '}
                <span className="text-[10px] bg-fuchsia-600 text-white px-1.5 rounded uppercase">
                  V3
                </span>
              </h2>
              {view === 'launchpad' && (
                <p className="text-xs text-slate-400 font-mono tracking-wide">PRO ASSET STUDIO</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {view === 'launchpad' && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
              >
                New Song
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Close Studio"
              aria-label="Close Studio"
            >
              <Icon name="cancel" className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* --- CONTENT --- */}
        <div className="flex-grow overflow-y-auto relative bg-slate-950">
          {/* VIEW 1: INPUT WIZARD */}
          {view === 'input' && (
            <div className="h-full flex flex-col items-center justify-center p-8 max-w-3xl mx-auto space-y-8 animate-fade-in-up">
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-black text-white tracking-tight">Design Your Hit</h1>
                <p className="text-slate-400 text-lg">
                  Define the soul of your song. AI handles the structure.
                </p>
              </div>

              <div className="w-full bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 space-y-4">
                <TextAreaInput
                  key={`suno-topic-${inputResetVersion}`}
                  ref={topicInputRef}
                  label="Song Topic / Story"
                  name="topic"
                  value={settings.topic}
                  onChange={(e) => updateSetting('topic', e.target.value)}
                  placeholder="e.g. A cyberpunk detective finding a flower in the rain..."
                  rows={3}
                  autoFocus
                />
                <p className="text-xs leading-relaxed text-slate-500">
                  Best results come from a vivid emotional arc or scene here. Use manual settings
                  for genre, instruments, language, and arrangement so the lyrics stay cleaner and
                  the style prompt stays sharp.
                </p>

                <div className="flex justify-center border-t border-slate-800/50 pt-4">
                  <button
                    onClick={() => setShowManual(!showManual)}
                    className="group flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-fuchsia-400 transition-colors uppercase tracking-widest"
                  >
                    <Icon
                      name="sliders"
                      className={`w-4 h-4 transition-transform ${showManual ? 'rotate-180 text-fuchsia-400' : ''}`}
                    />
                    {showManual ? 'Hide Manual Settings' : 'Manual Settings (Optional)'}
                  </button>
                </div>

                {showManual && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fade-in-up">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
                        Musical Style
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={settings.genre}
                          onChange={(e) => updateSetting('genre', e.target.value)}
                          placeholder="Genre (e.g. Synthwave)"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-fuchsia-500"
                        />
                        <input
                          type="text"
                          value={settings.mood}
                          onChange={(e) => updateSetting('mood', e.target.value)}
                          placeholder="Vibe (e.g. Melancholic)"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-fuchsia-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <SelectInput
                          label="Voice"
                          name="voice"
                          options={['Any', 'Male', 'Female', 'Duet', 'Instrumental', 'Choir'].map(
                            (v) => ({ value: v, label: v }),
                          )}
                          value={settings.voice}
                          onChange={(e) => handleVoiceChange(e.target.value)}
                        />
                        <input
                          type="text"
                          value={settings.tempo}
                          onChange={(e) => updateSetting('tempo', e.target.value)}
                          placeholder="Tempo (e.g. 120 BPM)"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-fuchsia-500 mt-6"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <SelectInput
                          label="Language"
                          name="language"
                          options={LANGUAGE_OPTIONS}
                          value={settings.language}
                          onChange={(e) => updateSetting('language', e.target.value)}
                        />
                        <input
                          type="text"
                          value={settings.instruments}
                          onChange={(e) => updateSetting('instruments', e.target.value)}
                          placeholder="Key instruments (e.g. Analog synth, cello)"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-fuchsia-500 mt-6"
                        />
                      </div>
                      <label className="flex items-center gap-3 text-sm text-slate-300 mt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.isInstrumental || settings.voice === 'Instrumental'}
                          onChange={(e) => handleInstrumentalToggle(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-fuchsia-500 focus:ring-fuchsia-500/60"
                        />
                        Instrumental mode (skip sung lyrics and optimize the style prompt for
                        arrangement)
                      </label>
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">
                            Style Influence
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateSetting(
                                'styleInfluence',
                                settings.styleInfluence === null ? DEFAULT_STYLE_INFLUENCE : null,
                              )
                            }
                            className="text-[11px] px-2 py-1 rounded-md border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                          >
                            {settings.styleInfluence === null
                              ? 'Auto'
                              : `${settings.styleInfluence}%`}
                          </button>
                        </div>
                        <input
                          type="range"
                          aria-label="Style Influence"
                          min={0}
                          max={100}
                          value={settings.styleInfluence ?? DEFAULT_STYLE_INFLUENCE}
                          onChange={(e) => updateSetting('styleInfluence', Number(e.target.value))}
                          className="w-full accent-cyan-500"
                        />
                        <p className="text-[11px] leading-relaxed text-slate-500">
                          Higher values follow your tags more strictly. Lower values allow a little
                          tasteful genre blending.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
                        Structure
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {['Auto', 'Standard', 'Pop', 'Rap', 'Ambient', 'Custom'].map((s) => (
                          <button
                            key={s}
                            onClick={() =>
                              setSettings({
                                ...settings,
                                structure: s as SunoSettings['structure'],
                              })
                            }
                            className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                              settings.structure === s
                                ? 'bg-fuchsia-900/30 border-fuchsia-500 text-fuchsia-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 italic mt-2">
                        {settings.structure === 'Pop'
                          ? 'Verse-Chorus-Verse-Chorus-Bridge-Chorus'
                          : settings.structure === 'Rap'
                            ? 'Intro-Hook-Verse-Hook-Verse-Outro'
                            : settings.structure === 'Ambient'
                              ? 'Linear progression, no distinct chorus'
                              : 'Balanced structure optimized for 2-3 min song'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={!settings.topic.trim() || isGenerating}
                className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-lg font-bold rounded-xl shadow-lg shadow-fuchsia-900/30 transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
              >
                {isGenerating ? (
                  <>
                    <Icon name="spinner" className="w-6 h-6 animate-spin" />
                    <span>Designing Audio Architecture...</span>
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" className="w-6 h-6" />
                    <span>Generate Pro Asset Pack</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* VIEW 2: LAUNCHPAD STAGE */}
          {view === 'launchpad' && songData && (
            <div className="h-full flex flex-col lg:flex-row">
              {/* LEFT COLUMN: STYLE & STRATEGY */}
              <div className="lg:w-1/3 bg-slate-900/50 p-6 border-r border-slate-800 flex flex-col gap-6 overflow-y-auto">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Project Title
                  </h3>
                  <input
                    type="text"
                    aria-label="Project Title"
                    value={songData.title || ''}
                    onChange={(e) => setSongData({ ...songData, title: e.target.value })}
                    className="w-full bg-transparent text-2xl font-bold text-white border-none p-0 focus:ring-0"
                    placeholder="Untitled Song"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest flex items-center gap-2">
                      <Icon name="sliders" className="w-4 h-4" /> Style Prompt
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      {(songData.style || '').length} chars
                    </span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-700 shadow-inner group relative">
                    <textarea
                      aria-label="Style Prompt"
                      value={songData.style || ''}
                      onChange={(e) => setSongData({ ...songData, style: e.target.value })}
                      className="w-full bg-transparent text-sm text-fuchsia-100 font-mono leading-relaxed resize-none border-none focus:ring-0 min-h-[80px]"
                      title="Style Prompt"
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon name="edit" className="w-4 h-4 text-slate-600" />
                    </div>
                  </div>

                  <button
                    onClick={handleCopyStyle}
                    className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md ${styleCopyText === 'COPIED!' ? 'bg-green-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                  >
                    {styleCopyText === 'COPIED!' ? (
                      <Icon name="check" className="w-4 h-4" />
                    ) : (
                      <Icon name="copy" className="w-4 h-4" />
                    )}
                    {styleCopyText}
                  </button>
                </div>

                <div className="space-y-3">
                  <SelectInput
                    label="Export Mode"
                    name="sunoExportMode"
                    options={SUNO_EXPORT_OPTIONS}
                    value={exportMode}
                    onChange={(e) => setExportMode(e.target.value as SunoExportMode)}
                  />
                  <button
                    onClick={handleCopyExport}
                    className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md ${exportCopyText === 'COPIED!' ? 'bg-green-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                  >
                    {exportCopyText === 'COPIED!' ? (
                      <Icon name="check" className="w-4 h-4" />
                    ) : (
                      <Icon name="copy" className="w-4 h-4" />
                    )}
                    {exportCopyText}
                  </button>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Use descriptive style terms instead of naming real artists, voices, or
                    copyrighted lyrics.
                  </p>
                </div>

                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50 flex-grow">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <Icon name="lightbulb" className="w-3 h-3" /> Strategy Note
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed italic">
                    &quot;{songData.explanation || ''}&quot;
                  </p>
                </div>

                <div className="mt-auto pt-4 space-y-3">
                  <div className="p-3 bg-fuchsia-900/10 border border-fuchsia-500/20 rounded-lg text-xs text-fuchsia-300">
                    <strong>Tip:</strong> Paste Style into &quot;Style of Music&quot; and Lyrics
                    into &quot;Lyrics&quot; in Custom Mode.
                  </div>
                  <button
                    onClick={openSuno}
                    className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-fuchsia-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Icon name="share" className="w-4 h-4" />
                    Launch Suno.com
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: LYRICS EDITOR */}
              <div className="lg:w-2/3 flex flex-col bg-slate-950 h-full">
                {/* Editor Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Icon name="edit" className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Lyrics Editor
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExtendLyrics}
                      disabled={isExtending}
                      className="px-3 py-1.5 text-xs font-bold text-purple-400 border border-purple-500/30 hover:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-2"
                    >
                      {isExtending ? (
                        <Icon name="spinner" className="w-3 h-3 animate-spin" />
                      ) : (
                        <Icon name="magic" className="w-3 h-3" />
                      )}
                      Extend
                    </button>
                    <button
                      onClick={handleCopyLyrics}
                      className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide flex items-center gap-2 transition-all ${lyricsCopyText === 'COPIED!' ? 'bg-green-600 text-white' : 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900/40'}`}
                    >
                      {lyricsCopyText === 'COPIED!' ? (
                        <Icon name="check" className="w-3 h-3" />
                      ) : (
                        <Icon name="copy" className="w-3 h-3" />
                      )}
                      {lyricsCopyText}
                    </button>
                  </div>
                </div>

                {/* Text Area */}
                <div className="flex-grow relative">
                  <textarea
                    ref={lyricsRef}
                    aria-label="Lyrics Editor"
                    value={songData.lyrics || ''}
                    onChange={(e) => setSongData({ ...songData, lyrics: e.target.value })}
                    className="w-full h-full bg-slate-950 p-8 text-slate-300 font-mono text-base leading-relaxed resize-none focus:outline-none focus:bg-slate-900/30 transition-colors"
                    spellCheck={false}
                    placeholder="Write your lyrics here..."
                  />
                </div>

                {/* Tag Injector Toolbar */}
                <div className="border-t border-slate-800 bg-slate-900 p-2">
                  {/* Category Tabs */}
                  <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2 px-2 pb-1">
                    {Object.keys(SUNO_TAGS).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-colors border ${
                          activeCategory === cat
                            ? 'bg-slate-700 text-white border-slate-600'
                            : 'text-slate-500 border-transparent hover:text-slate-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  {/* Tag Buttons */}
                  <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 py-1 pb-2">
                    {SUNO_TAGS[activeCategory].map((tag: string) => (
                      <button
                        key={tag}
                        onClick={() => handleInsertTag(tag)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-xs text-fuchsia-300 font-mono transition-colors whitespace-nowrap shadow-sm"
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
