import React, { useState, useEffect } from 'react';
import { PromptState, VisualDNA, SharedVisualDNA } from '@core/types';
import Icon from '@shared/components/ui/Icon';
import * as geminiService from '@core/services/geminiService';
import * as communityService from '@core/services/communityService';
import CommunityGallery from './CommunityModal';
import StyleTunerModal from './StyleTunerModal';

import type { UIStrings } from '@core/constants';

interface VisualDNAModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedDNAs: VisualDNA[];
  onSaveDNA: (name: string, styleParams: Partial<PromptState>) => void;
  onApplyDNA: (dna: VisualDNA) => void;
  onDeleteDNA: (id: string) => void;
  currentPromptState: PromptState;
  uiStrings: UIStrings;
}

const extractStyleDNA = (state: PromptState): Partial<PromptState> => {
  // Only extract style-related parameters
  return {
    artStyle: state.artStyle,
    customArtStyle: state.customArtStyle,
    lightingStyle: state.lightingStyle,
    colorPalette: state.colorPalette,
    visualEffect: state.visualEffect,
    cameraMovement: state.cameraMovement,
    cameraDistance: state.cameraDistance,
    lensType: state.lensType,
    aspectRatio: state.aspectRatio,
    voiceStyle: state.voiceStyle,
    ambientSound: state.ambientSound,
    soundEffectsIntensity: state.soundEffectsIntensity,
    motionIntensity: state.motionIntensity,
    creativityLevel: state.creativityLevel,
    resolution: state.resolution,
    veoModel: state.veoModel,
    targetModel: state.targetModel,
  } as Partial<PromptState>;
};

const VisualDNAModal: React.FC<VisualDNAModalProps> = ({
  isOpen,
  onClose,
  savedDNAs,
  onSaveDNA,
  onApplyDNA,
  onDeleteDNA,
  currentPromptState,
  uiStrings: _uiStrings,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'mixer' | 'community'>('library');
  const [newDNAName, setNewDNAName] = useState('');
  const [previewDNA, setPreviewDNA] = useState<VisualDNA | null>(null);
  const [isTunerOpen, setIsTunerOpen] = useState(false);

  // Mixer State
  const [parentAId, setParentAId] = useState<string>('');
  const [parentBId, setParentBId] = useState<string>('');
  const [mixBalance, setMixBalance] = useState(50);
  const [isMixing, setIsMixing] = useState(false);
  const [mixedResult, setMixedResult] = useState<Partial<PromptState> | null>(null);
  const [mixedName, setMixedName] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isTunerOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isTunerOpen]);

  const handleSave = () => {
    if (!newDNAName.trim()) return;
    const styleParams = extractStyleDNA(currentPromptState);
    onSaveDNA(newDNAName.trim(), styleParams);
    setNewDNAName('');
  };

  const handleApply = (dna: VisualDNA) => {
    onApplyDNA(dna);
    onClose();
  };

  const handleApplyMixed = () => {
    if (mixedResult) {
      // Create a temporary VisualDNA object to pass to onApplyDNA
      const tempDNA: VisualDNA = {
        id: 'temp-mixed',
        name: 'Mixed Style',
        timestamp: Date.now(),
        styleParams: mixedResult,
      };
      onApplyDNA(tempDNA);
      onClose();
    }
  };

  const handleSaveMixed = () => {
    if (mixedResult && mixedName.trim()) {
      onSaveDNA(mixedName.trim(), mixedResult);
      setMixedResult(null);
      setMixedName('');
      setActiveTab('library'); // Switch back to library to see the new DNA
    }
  };

  const handleMix = async () => {
    const parentA = savedDNAs.find((d) => d.id === parentAId);
    const parentB = savedDNAs.find((d) => d.id === parentBId);

    if (!parentA || !parentB) return;

    setIsMixing(true);
    setMixedResult(null);
    try {
      const result = await geminiService.mixVisualDNA(parentA, parentB, mixBalance);
      setMixedResult(result);
    } catch (error) {
      console.error(error);
      // In a real app, use addToast here (prop drill needed or context)
    } finally {
      setIsMixing(false);
    }
  };

  const handlePublish = async (dna: VisualDNA, e: React.MouseEvent) => {
    e.stopPropagation();
    const author = prompt('Enter your name to publish this style:');
    if (author) {
      try {
        await communityService.publishDNA(dna, author);
        alert(`"${dna.name}" has been published to the community!`);
        setActiveTab('community'); // Switch to view it
      } catch (_err) {
        alert('Failed to publish style.');
      }
    }
  };

  const handleImportFromCommunity = (sharedDna: SharedVisualDNA) => {
    // Check if already exists to avoid dupes (simple name check for now)
    if (savedDNAs.some((d) => d.name === sharedDna.name)) {
      alert('You already have a style with this name.');
      return;
    }

    onSaveDNA(sharedDna.name, sharedDna.styleParams);
    alert(`Imported "${sharedDna.name}" to your library!`);
    setActiveTab('library');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[80] p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div
        className="relative bg-slate-900/80 backdrop-blur-xl w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh] overflow-hidden"
      >
        <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Icon name="dna" className="w-6 h-6 text-cyan-400" />
              Visual DNA
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Extract, save, blend, and share visual styles.
            </p>
          </div>
          <div className="flex bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'library' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Library
            </button>
            <button
              onClick={() => setActiveTab('mixer')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'mixer' ? 'bg-fuchsia-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Mixer
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'community' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Community
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ml-4"
          >
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
          {activeTab === 'library' ? (
            <>
              {/* Left: DNA Library */}
              <div className="flex-1 p-6 border-r border-slate-700/50 flex flex-col min-w-0 bg-slate-900/30">
                {/* Style Tuner Banner */}
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-fuchsia-900/40 to-purple-900/40 border border-fuchsia-500/30 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-fuchsia-200 text-sm">
                      Don&apos;t know what style to pick?
                    </h3>
                    <p className="text-[10px] text-fuchsia-300/70">
                      Let the visual tuner discover your aesthetic.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsTunerOpen(true)}
                    className="px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-1 transition-transform hover:scale-105"
                  >
                    <Icon name="magic" className="w-3 h-3" />
                    Tune Style
                  </button>
                </div>

                <div className="mb-6 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <h3 className="text-sm font-semibold text-cyan-300 mb-2 uppercase tracking-wider">
                    Extract Current Style
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDNAName}
                      onChange={(e) => setNewDNAName(e.target.value)}
                      placeholder="e.g., Cyber Noir V2"
                      className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                    <button
                      onClick={handleSave}
                      disabled={!newDNAName.trim()}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Extract
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                  Saved DNA Library
                </h3>
                <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                  {savedDNAs.length === 0 ? (
                    <p className="text-center text-slate-500 py-8 text-sm italic">
                      No saved DNA strands yet.
                    </p>
                  ) : (
                    savedDNAs.map((dna) => (
                      <div
                        key={dna.id}
                        onClick={() => setPreviewDNA(dna)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setPreviewDNA(dna);
                          }
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 group flex justify-between items-center ${
                          previewDNA?.id === dna.id
                            ? 'border-fuchsia-500 bg-fuchsia-900/20'
                            : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/30'
                        }`}
                        role="button"
                        tabIndex={0}
                      >
                        <div>
                          <h4
                            className={`font-semibold text-sm ${previewDNA?.id === dna.id ? 'text-cyan-300' : 'text-slate-200'}`}
                          >
                            {dna.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(dna.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handlePublish(dna, e)}
                            className="p-1.5 rounded text-slate-500 hover:text-green-400 hover:bg-green-900/20"
                            title="Publish to Community"
                          >
                            <Icon name="globe" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDNA(dna.id);
                              if (previewDNA?.id === dna.id) setPreviewDNA(null);
                            }}
                            className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-900/20"
                            title="Delete"
                          >
                            <Icon name="trash" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: DNA Inspector */}
              <div className="w-full md:w-80 bg-slate-900/50 p-6 flex flex-col overflow-y-auto">
                {previewDNA ? (
                  <>
                    <h3 className="text-lg font-bold text-slate-100 mb-4 pb-2 border-b border-slate-700/50 flex items-center gap-2">
                      <Icon name="sliders" className="w-5 h-5 text-cyan-400" />
                      {previewDNA.name}
                    </h3>

                    <div className="space-y-4 mb-6">
                      {Object.entries(previewDNA.styleParams).map(([key, value]) => {
                        if (
                          !value ||
                          value === 'Any' ||
                          value === 'None' ||
                          value === 'Static shot' ||
                          value === 'Medium shot'
                        )
                          return null;
                        return (
                          <div key={key} className="flex flex-col">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-0.5">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="text-sm text-slate-300 bg-slate-800/50 px-2 py-1.5 rounded border border-slate-700/30">
                              {String(value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-auto">
                      <button
                        onClick={() => handleApply(previewDNA)}
                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                      >
                        <Icon name="magic" className="w-5 h-5" />
                        Inject Visual DNA
                      </button>
                      <p className="text-center text-[10px] text-slate-500 mt-3 px-2">
                        This will update style settings but keep your core Idea and Subject intact.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
                    <div className="p-4 bg-slate-800/30 rounded-full">
                      <Icon name="dna" className="w-12 h-12 opacity-30" />
                    </div>
                    <p className="text-sm">
                      Select a saved DNA strand from the library to view its genetic makeup.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'mixer' ? (
            // MIXER TAB
            <div className="flex-1 p-6 flex flex-col h-full bg-slate-950/20 animate-fade-in-up">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Parent A */}
                <div className="space-y-2">
                  <label htmlFor="dnaParentA" className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Parent A
                  </label>
                  <select
                    id="dnaParentA"
                    value={parentAId}
                    onChange={(e) => setParentAId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="">Select DNA...</option>
                    {savedDNAs.map((dna) => (
                      <option key={dna.id} value={dna.id}>
                        {dna.name}
                      </option>
                    ))}
                  </select>
                  {parentAId && (
                    <div className="p-3 bg-slate-800/30 rounded-lg border border-cyan-500/10 text-xs text-slate-400">
                      {savedDNAs.find((d) => d.id === parentAId)?.styleParams.artStyle ||
                        'Custom Style'}
                    </div>
                  )}
                </div>

                {/* Parent B */}
                <div className="space-y-2">
                  <label htmlFor="dnaParentB" className="text-xs font-bold text-fuchsia-400 uppercase tracking-wider">
                    Parent B
                  </label>
                  <select
                    id="dnaParentB"
                    value={parentBId}
                    onChange={(e) => setParentBId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                  >
                    <option value="">Select DNA...</option>
                    {savedDNAs.map((dna) => (
                      <option key={dna.id} value={dna.id}>
                        {dna.name}
                      </option>
                    ))}
                  </select>
                  {parentBId && (
                    <div className="p-3 bg-slate-800/30 rounded-lg border border-fuchsia-500/10 text-xs text-slate-400">
                      {savedDNAs.find((d) => d.id === parentBId)?.styleParams.artStyle ||
                        'Custom Style'}
                    </div>
                  )}
                </div>
              </div>

              {/* Slider */}
              <div className="mb-8 px-4 py-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <label className="flex justify-between text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                  <span className="text-cyan-400">Influence A ({100 - mixBalance}%)</span>
                  <span className="text-fuchsia-400">Influence B ({mixBalance}%)</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={mixBalance}
                  onChange={(e) => setMixBalance(parseInt(e.target.value))}
                  className="w-full h-3 bg-gradient-to-r from-cyan-600 to-fuchsia-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Action */}
              <div className="flex justify-center mb-8">
                <button
                  onClick={handleMix}
                  disabled={!parentAId || !parentBId || isMixing}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-600 via-purple-600 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg shadow-purple-900/30 hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                >
                  {isMixing ? (
                    <>
                      <Icon name="spinner" className="w-5 h-5 animate-spin" />
                      Mixing DNA...
                    </>
                  ) : (
                    <>
                      <Icon name="sparkles" className="w-5 h-5" />
                      Generate Hybrid
                    </>
                  )}
                </button>
              </div>

              {/* Result */}
              {mixedResult && (
                <div className="flex-grow bg-slate-900/50 rounded-xl border border-purple-500/30 p-6 animate-fade-in-up flex flex-col">
                  <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                    <Icon name="dna" className="w-5 h-5 text-purple-400" />
                    Hybrid DNA Result
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-6 flex-grow overflow-y-auto">
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase">Art Style</span>
                      <p className="text-sm text-purple-200">
                        {mixedResult.artStyle === 'Custom'
                          ? mixedResult.customArtStyle
                          : mixedResult.artStyle}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase">Lighting</span>
                      <p className="text-sm text-purple-200">{mixedResult.lightingStyle}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase">Colors</span>
                      <p className="text-sm text-purple-200">{mixedResult.colorPalette}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase">Camera</span>
                      <p className="text-sm text-purple-200">{mixedResult.cameraMovement}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-700/50">
                    <input
                      type="text"
                      value={mixedName}
                      onChange={(e) => setMixedName(e.target.value)}
                      placeholder="Name this new style..."
                      className="flex-grow bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <button
                      onClick={handleSaveMixed}
                      disabled={!mixedName.trim()}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      Save DNA
                    </button>
                    <button
                      onClick={handleApplyMixed}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-900/20 transition-colors"
                    >
                      Use Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // COMMUNITY TAB
            <CommunityGallery onImport={handleImportFromCommunity} />
          )}
        </div>
      </div>

      {/* Nested Tuner Modal */}
      <StyleTunerModal
        isOpen={isTunerOpen}
        onClose={() => setIsTunerOpen(false)}
        onSave={onSaveDNA}
      />
    </div>
  );
};

export default VisualDNAModal;
