import React, { useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import AppDialog from '@shared/components/ui/AppDialog';
import SelectInput from '@shared/components/ui/SelectInput';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import { CharacterProfile, Shot } from '@core/types';
import { CINEMATIC_SEQUENCES } from '../templates/cinematicSequences';
import * as geminiService from '@core/services/geminiService';
import type { UIStrings } from '@core/constants';
import { logger } from '@core/services/loggerService';

interface AutoBlockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedCharacters: CharacterProfile[];
  onGenerate: (shots: Partial<Shot>[]) => void;
  uiStrings: UIStrings;
}

const AutoBlockerModal: React.FC<AutoBlockerModalProps> = ({
  isOpen,
  onClose,
  savedCharacters,
  onGenerate,
  uiStrings: _uiStrings,
}) => {
  // Mode Selection
  const [mode, setMode] = useState<'template' | 'script'>('template');

  // Template Mode State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(CINEMATIC_SEQUENCES[0].id);
  const [char1Id, setChar1Id] = useState<string>('');
  const [char2Id, setChar2Id] = useState<string>('');
  const [context, setContext] = useState<string>('');

  // AI Script Mode State
  const [scriptText, setScriptText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewShots, setPreviewShots] = useState<Partial<Shot>[]>([]);

  // Derived state for Template Mode
  const currentTemplate =
    CINEMATIC_SEQUENCES.find((t) => t.id === selectedTemplateId) || CINEMATIC_SEQUENCES[0];

  // Character options
  const charOptions = [
    { value: '', label: 'Select Character...' },
    ...savedCharacters.map((c) => ({ value: c.id, label: c.name })),
  ];

  const templateOptions = CINEMATIC_SEQUENCES.map((t) => ({ value: t.id, label: t.label }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handler: Template Generation
  const handleGenerateTemplate = () => {
    const char1 = savedCharacters.find((c) => c.id === char1Id);
    const char2 = savedCharacters.find((c) => c.id === char2Id);

    // Fallback names if characters aren't selected
    const name1 = char1 ? char1.name : 'Character A';
    const name2 = char2 ? char2.name : 'Character B';
    const contextText = context.trim() || 'the situation';

    const newShots: Partial<Shot>[] = currentTemplate.shots.map((templateShot) => {
      let processedAction = templateShot.action
        .replace(/{char1}/g, name1)
        .replace(/{char2}/g, name2)
        .replace(/{context}/g, contextText);

      let assignedCharId = '';
      if (templateShot.focusChar === 1) assignedCharId = char1Id;
      else if (templateShot.focusChar === 2) assignedCharId = char2Id;
      // 'both' typically leaves ID empty for generic prompts or picks char1 as lead
      else if (templateShot.focusChar === 'both') assignedCharId = char1Id || char2Id;

      return {
        action: processedAction,
        camera: templateShot.camera,
        characterId: assignedCharId,
        visualLink: true, // Auto-link sequences for continuity
      };
    });

    onGenerate(newShots);
    onClose();
  };

  // Handler: AI Script Analysis
  const handleAnalyzeScript = async () => {
    if (!scriptText.trim()) return;
    setIsAnalyzing(true);
    try {
      const results = await geminiService.generateBlockingFromScript(scriptText, savedCharacters);
      // Enhance results with defaults
      const validResults = results.map((s) => ({
        ...s,
        type: 'video',
        duration: 5,
        visualLink: true,
      }));
      setPreviewShots(validResults as Partial<Shot>[]);
    } catch (e) {
      logger.error('Failed to analyze script', e);
      alert('Failed to analyze script.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler: Confirm Script Blocking
  const handleConfirmScript = () => {
    onGenerate(previewShots);
    onClose();
  };

  if (!isOpen) return null;

  const isTemplateReady =
    char1Id !== '' && (currentTemplate.requiredCharacters < 2 || char2Id !== '');

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      layer="overlay"
      showCloseButton={false}
      bodyClassName="!p-0"
    >
      <div className="relative bg-slate-900/80 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden animate-fade-in-up max-h-[90vh]">
        <header className="flex items-center justify-between p-5 border-b border-slate-700/50 bg-slate-900/50 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="video" className="w-6 h-6 text-fuchsia-400" />
            Auto-Block Scene
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-slate-700/50 bg-slate-900/30 flex-shrink-0">
          <button
            onClick={() => setMode('template')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'template' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400 bg-slate-800/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Templates (Classic)
          </button>
          <button
            onClick={() => setMode('script')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'script' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            AI Script Blocking
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-grow">
          {/* TEMPLATE MODE */}
          {mode === 'template' && (
            <div className="space-y-6">
              <p className="text-sm text-slate-300">
                Automatically generate a storyboard sequence using standard cinematic templates.
              </p>

              <SelectInput
                label="Sequence Type"
                name="sequenceType"
                value={selectedTemplateId}
                options={templateOptions}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                info={currentTemplate.description}
              />

              <div className="grid grid-cols-2 gap-4">
                <SelectInput
                  label="Cast Character A"
                  name="char1"
                  value={char1Id}
                  options={charOptions}
                  onChange={(e) => setChar1Id(e.target.value)}
                />
                {currentTemplate.requiredCharacters > 1 && (
                  <SelectInput
                    label="Cast Character B"
                    name="char2"
                    value={char2Id}
                    options={charOptions}
                    onChange={(e) => setChar2Id(e.target.value)}
                  />
                )}
              </div>

              <TextAreaInput
                label="Context / Topic"
                name="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. arguing about the map directions, searching for the artifact..."
                rows={2}
                info="This replaces {context} in the templates."
              />

              <button
                onClick={handleGenerateTemplate}
                disabled={!isTemplateReady}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  isTemplateReady
                    ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-fuchsia-900/20 transform hover:scale-[1.02]'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Icon name="magic" className="w-5 h-5" />
                Generate {currentTemplate.shots.length} Shots
              </button>
            </div>
          )}

          {/* AI SCRIPT MODE */}
          {mode === 'script' && (
            <div className="space-y-6 h-full flex flex-col">
              {previewShots.length === 0 ? (
                <div className="space-y-4 flex-grow">
                  <p className="text-sm text-slate-300">
                    Paste a script excerpt. Gemini will act as Director of Photography to plan the
                    shots.
                  </p>
                  <TextAreaInput
                    label="Script / Scene Description"
                    name="scriptText"
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    placeholder="EXT. ALLEYWAY - NIGHT..."
                    rows={6}
                    autoFocus
                  />
                  <div className="p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400 border border-slate-700/50">
                    <strong>Tip:</strong> Ensure characters in the script match names in your
                    Character Bank for auto-assignment.
                  </div>
                  <button
                    onClick={handleAnalyzeScript}
                    disabled={isAnalyzing || !scriptText.trim()}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <Icon name="spinner" className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon name="video-analysis" className="w-5 h-5" />
                    )}
                    Analyze & Block Scene
                  </button>
                </div>
              ) : (
                <div className="space-y-4 flex-grow flex flex-col">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-200">Generated Shot List</h3>
                    <button
                      onClick={() => setPreviewShots([])}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex-grow overflow-y-auto max-h-64">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                        <tr>
                          <th className="p-3">Shot</th>
                          <th className="p-3">Action</th>
                          <th className="p-3">Camera</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {previewShots.map((shot, idx) => (
                          <tr key={idx} className="hover:bg-slate-700/30">
                            <td className="p-3 font-mono text-slate-500">#{idx + 1}</td>
                            <td className="p-3 text-slate-200">{shot.action}</td>
                            <td className="p-3 text-cyan-400 text-xs">{shot.camera}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleConfirmScript}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 mt-auto"
                  >
                    <Icon name="check" className="w-5 h-5" />
                    Add {previewShots.length} Shots to Storyboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppDialog>
  );
};

export default AutoBlockerModal;
