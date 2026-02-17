import React, { useState, useEffect, useRef } from 'react';
import Icon from '@shared/components/ui/Icon';
import AppDialog from '@shared/components/ui/AppDialog';
import { Shot, Asset, TimelineClip } from '@core/types';
import * as geminiService from '@core/services/geminiService';
import * as sfxService from '@core/services/sfxService';
import { extractLastFrame, extractFramesFromVideo } from '@core/utils/videoUtils';
import { useAppStore } from '@core/store/useAppStore'; // For Timeline manipulation
import { logger } from '@core/services/loggerService';

interface FoleyWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  shot: Shot;
  onApply: (soundBlob: Blob, description: string) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface AudioEvent {
  timestamp: number;
  description: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  id: string;
  blob?: Blob;
}

const FoleyWizardModal: React.FC<FoleyWizardModalProps> = ({
  isOpen,
  onClose,
  shot,
  onApply,
  addToast,
}) => {
  const { addAsset, addTimelineClip, clips, sbShots: _sbShots } = useAppStore();

  // Tab State
  const [activeTab, setActiveTab] = useState<'manual' | 'magic'>('manual');

  // Manual Flow State
  const [step, setStep] = useState<'analyze' | 'select' | 'generate' | 'preview'>('analyze');
  const [detectedSounds, setDetectedSounds] = useState<string[]>([]);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);

  // Magic Sync State
  const [magicEvents, setMagicEvents] = useState<AudioEvent[]>([]);
  const [isMagicAnalyzing, setIsMagicAnalyzing] = useState(false);
  const [isMagicGenerating, setIsMagicGenerating] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Initial Analysis for Manual Mode
  useEffect(() => {
    if (isOpen && activeTab === 'manual' && shot.generatedVideoUrl && detectedSounds.length === 0) {
      const analyze = async () => {
        try {
          setStep('analyze');
          setIsProcessing(true);

          // 1. Get Frame
          const frame = await extractLastFrame(shot.generatedVideoUrl!);
          setPreviewFrame(`data:${frame.mimeType};base64,${frame.data}`);

          // 2. Analyze with Gemini Vision
          const sounds = await geminiService.analyzeImageForSFX(frame.data);
          setDetectedSounds(sounds);

          setIsProcessing(false);
          setStep('select');
        } catch (e) {
          logger.error('Failed to analyze video frame', e);
          addToast('Failed to analyze video frame.', 'error');
        }
      };
      analyze();
    }
  }, [isOpen, shot, activeTab, addToast, detectedSounds.length]);

  // --- Manual Handlers ---

  const handleGenerate = async () => {
    if (!selectedSound) return;

    setStep('generate');
    setIsProcessing(true);

    try {
      const blob = await sfxService.generateSound(selectedSound);
      const url = URL.createObjectURL(blob);

      setGeneratedBlob(blob);
      setGeneratedAudioUrl(url);
      setStep('preview');
    } catch (_e) {
      addToast('Failed to generate audio.', 'error');
      setStep('select');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmManual = () => {
    if (generatedBlob && selectedSound) {
      onApply(generatedBlob, selectedSound);
      onClose();
    }
  };

  // --- Magic Sync Handlers ---

  const handleMagicAnalyze = async () => {
    if (!shot.generatedVideoUrl) return;
    setIsMagicAnalyzing(true);
    setMagicEvents([]);

    try {
      // 1. Extract Frames (1 FPS)
      const frames = await extractFramesFromVideo(shot.generatedVideoUrl, 1.0);

      // 2. Send to Gemini
      const analysis = await geminiService.analyzeVideoForSFX(frames);

      // 3. Populate List
      const events: AudioEvent[] = analysis.map((item, i) => ({
        id: `magic_${Date.now()}_${i}`,
        timestamp: item.timestamp,
        description: item.description,
        status: 'pending',
      }));

      setMagicEvents(events);
      if (events.length === 0) addToast('No distinct audio events detected.', 'info');
    } catch (e) {
      logger.error('Magic analysis failed', e);
      addToast('Magic analysis failed.', 'error');
    } finally {
      setIsMagicAnalyzing(false);
    }
  };

  const handleMagicGenerateAll = async () => {
    setIsMagicGenerating(true);

    // Find the clip start time on the global timeline for this shot
    // The shot object itself stores relative duration, but its position depends on previous shots
    // We find the 'video' clip in timeline that references this shot ID
    const timelineClip = clips.find((c) => c.resourceId === shot.id && c.type === 'video');
    const clipStartTime = timelineClip ? timelineClip.startTime : 0; // Fallback to 0 if not found, though should exist

    // Process sequentially to manage API rate limits slightly better than full parallel
    for (const event of magicEvents) {
      if (event.status === 'done') continue;

      setMagicEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, status: 'generating' } : e)),
      );

      try {
        const blob = await sfxService.generateSound(event.description);

        // 1. Add Asset
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          const assetId = `sfx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

          const newAsset: Asset = {
            id: assetId,
            type: 'audio',
            name: event.description,
            url: URL.createObjectURL(blob),
            data: base64data,
            mimeType: 'audio/wav',
          };
          addAsset(newAsset);

          // 2. Add Clip to Timeline
          const newClip: TimelineClip = {
            id: `clip_${assetId}`,
            resourceId: assetId,
            trackId: 'audio_sfx',
            startTime: clipStartTime + event.timestamp,
            duration: 2, // Default duration, ideally get actual duration
            offset: 0,
            type: 'audio',
            label: event.description,
            volume: 1.0,
            panning: { x: 0, z: 0 },
          };
          addTimelineClip(newClip);
        };
        reader.readAsDataURL(blob);

        setMagicEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, status: 'done', blob } : e)),
        );
      } catch (_err) {
        setMagicEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, status: 'error' } : e)),
        );
      }
    }

    setIsMagicGenerating(false);
    addToast('Magic Sync complete. Clips added to timeline.', 'success');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      layer="overlay"
      showCloseButton={false}
      bodyClassName="!p-0"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="audio" className="w-6 h-6 text-yellow-400" />
            Auto-Foley
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-900">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'manual' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-slate-800/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Single Sound
          </button>
          <button
            onClick={() => setActiveTab('magic')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'magic' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400 bg-slate-800/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Magic Sync (Video AI)
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* MANUAL MODE */}
          {activeTab === 'manual' && (
            <>
              {previewFrame && (
                <div className="mb-6 rounded-xl overflow-hidden border border-slate-700 aspect-video relative">
                  <img
                    src={previewFrame}
                    alt="Analyzed Frame"
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isProcessing && step === 'analyze' && (
                      <div className="bg-black/70 px-4 py-2 rounded-full text-xs font-bold text-yellow-400 animate-pulse flex items-center gap-2">
                        <Icon name="search" className="w-4 h-4" />
                        Scanning Visuals...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 'select' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    AI detected potential sounds. Select one to generate:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {detectedSounds.map((sound, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSound(sound)}
                        className={`p-3 rounded-lg border text-left text-sm transition-all ${
                          selectedSound === sound
                            ? 'bg-yellow-900/30 border-yellow-500 text-yellow-200'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        🔊 {sound}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={!selectedSound}
                    className="w-full py-3 mt-4 bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate Sound
                  </button>
                </div>
              )}

              {step === 'generate' && (
                <div className="text-center py-8">
                  <Icon
                    name="spinner"
                    className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4"
                  />
                  <p className="text-slate-300 font-medium">Synthesizing Audio...</p>
                  <p className="text-slate-500 text-sm mt-1">&quot;{selectedSound}&quot;</p>
                </div>
              )}

              {step === 'preview' && generatedAudioUrl && (
                <div className="space-y-6">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-center">
                    <audio ref={audioRef} src={generatedAudioUrl} controls className="w-full" />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('select')}
                      className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmManual}
                      className="flex-grow py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2"
                    >
                      <Icon name="check" className="w-4 h-4" />
                      Add to Scene
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* MAGIC SYNC MODE */}
          {activeTab === 'magic' && (
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <p className="text-sm text-slate-300 mb-4">
                  Analyze the full video clip to detect multiple audio events and place them
                  precisely on the timeline.
                </p>

                {magicEvents.length === 0 && (
                  <button
                    onClick={handleMagicAnalyze}
                    disabled={isMagicAnalyzing}
                    className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isMagicAnalyzing ? (
                      <Icon name="spinner" className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon name="video-analysis" className="w-5 h-5" />
                    )}
                    Analyze Video
                  </button>
                )}
              </div>

              {magicEvents.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Detected Events
                  </h3>
                  <div className="space-y-2">
                    {magicEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700"
                      >
                        <div className="text-xs font-mono text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded">
                          {event.timestamp}s
                        </div>
                        <div className="flex-grow text-sm text-slate-200">{event.description}</div>
                        <div className="text-xs">
                          {event.status === 'pending' && (
                            <span className="text-slate-500">Wait</span>
                          )}
                          {event.status === 'generating' && (
                            <Icon name="spinner" className="w-4 h-4 text-yellow-400 animate-spin" />
                          )}
                          {event.status === 'done' && (
                            <Icon name="check" className="w-4 h-4 text-green-400" />
                          )}
                          {event.status === 'error' && (
                            <Icon name="alert-triangle" className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleMagicGenerateAll}
                    disabled={isMagicGenerating || magicEvents.every((e) => e.status === 'done')}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isMagicGenerating ? (
                      <Icon name="spinner" className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon name="magic" className="w-5 h-5" />
                    )}
                    Generate & Sync All
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

export default FoleyWizardModal;
