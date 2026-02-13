/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Icon from '@shared/components/ui/Icon';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import { ToastMessage, Shot, SFXEvent, Asset } from '@core/types';
import { buildShotPrompt } from '@core/services/promptBuilder';
import * as geminiService from '@core/services/geminiService';
import { videoGenerationService } from '@core/services/videoGenerationService';
import TimelinePlayer from './TimelinePlayer';
import { useDirectorsChain } from '@shared/hooks/useDirectorsChain';
import { useAppStore } from '@core/store/useAppStore';
import AutoBlockerModal from '../studios/modals/AutoBlockerModal';
import { useLocationStore } from '@core/store/useLocationStore';
import CameraPlotterModal from '../studios/modals/CameraPlotterModal';
import WhiteboardModal from '../studios/modals/WhiteboardModal';
import InpaintingModal from '../studios/modals/InpaintingModal';
import GenerativeCanvasModal from '../studios/modals/GenerativeCanvasModal';
import RecordingBoothModal from '../studios/modals/RecordingBoothModal';
import TableReadPlayer from '@shared/components/TableReadPlayer';
import { useCollaborativeProject } from '@shared/hooks/useCollaborativeProject';
import ScriptImportReviewModal from '../studios/modals/ScriptImportReviewModal';
import TitleEditorModal from '../studios/modals/TitleEditorModal';
import { extractLastFrame } from '@core/utils/videoUtils';
import PoseEditorModal from '../studios/modals/PoseEditorModal';
import MotionCropEditor from '@shared/components/MotionCropEditor';
import { upscaleVideo } from '@core/services/upscaleService';
import DubbingModal from '../studios/modals/DubbingModal';
import FoleyWizardModal from '../studios/modals/FoleyWizardModal';
import MagicMaskModal from '../studios/modals/MagicMaskModal';
import { ShotCard } from './components/ShotCard';

interface StoryBoardProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uiStrings: any;
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const StoryBoard: React.FC<StoryBoardProps> = ({ isOpen, onClose, uiStrings, addToast }) => {
  const t = uiStrings.storyBoard;

  // Connect to Collaborative Sync Hook
  useCollaborativeProject();

  // Connect to Zustand Store
  const {
    sbGlobalContext: globalContext,
    setSbGlobalContext: setGlobalContext,
    sbShots: shots,
    setSbShots: setShots,
    addShot,
    deleteShot,
    updateShot: handleShotChange,
    promptState,
    addAsset,
    characterBank: savedCharacters,
    credits,
    deductCredits,
    gcTimeline,
  } = useAppStore();

  // Connect to Location Store
  const { locations } = useLocationStore();

  const [isGenerating, setIsGenerating] = useState(false);

  // Import Script State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Smart Import Review State
  const [pendingImportShots] = useState<Partial<Shot>[]>([]);
  const [isReviewingImport, setIsReviewingImport] = useState(false);

  // Auto Blocker State
  const [isAutoBlockerOpen, setIsAutoBlockerOpen] = useState(false);

  // Camera Plotter State
  const [plottingShotId, setPlottingShotId] = useState<number | null>(null);

  // Whiteboard State
  const [whiteboardShotId, setWhiteboardShotId] = useState<number | null>(null);

  // Inpainting State
  const [inpaintingShotId, setInpaintingShotId] = useState<number | null>(null);

  // Outpainting (Generative Canvas) State
  const [outpaintingShotId, setOutpaintingShotId] = useState<number | null>(null);

  // Pose Editor State
  const [poseEditorShotId, setPoseEditorShotId] = useState<number | null>(null);

  // Recording Booth State
  const [recordingShotId, setRecordingShotId] = useState<number | null>(null);

  // Text Overlay Editor State
  const [textEditorShotId, setTextEditorShotId] = useState<number | null>(null);

  // Motion Editor State
  const [motionEditorShotId, setMotionEditorShotId] = useState<number | null>(null);

  // Dubbing State
  const [dubbingShotId, setDubbingShotId] = useState<number | null>(null);

  // Foley (SFX) State
  const [foleyShotId, setFoleyShotId] = useState<number | null>(null);

  // Magic Mask State
  const [magicMaskShotId, setMagicMaskShotId] = useState<number | null>(null);

  // Track blob URLs for cleanup on unmount
  const createdBlobUrls = useRef<string[]>([]);

  // Timeline Player State
  const [isPlayingMovie, setIsPlayingMovie] = useState(false);

  // Table Read State
  const [isTableReadOpen, setIsTableReadOpen] = useState(false);

  // Script Doctor State
  const [doctorShotId, setDoctorShotId] = useState<number | null>(null);

  // --- Bridge / Selection State ---
  const [selectedShotIds, setSelectedShotIds] = useState<number[]>([]);
  const [isBridging, setIsBridging] = useState(false);

  // --- Color Match State ---
  const [colorMatchTargetId, setColorMatchTargetId] = useState<number | null>(null);
  const [isColorMatching, setIsColorMatching] = useState(false);

  // --- Upscaling State ---
  const [isUpscaling, setIsUpscaling] = useState<Record<number, boolean>>({});

  // Prepare Background Music URL from Store
  const backgroundMusicUrl = useMemo(() => {
    if (promptState.uploadedAudio) {
      try {
        const byteCharacters = atob(promptState.uploadedAudio.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: promptState.uploadedAudio.mimeType });
        return URL.createObjectURL(blob);
      } catch (e) {
        console.error('Failed to process background music', e);
      }
    }
    return null;
  }, [promptState.uploadedAudio]);

  // Revoke background music blob URL when it changes or on unmount to prevent leaks
  useEffect(() => {
    return () => {
      if (backgroundMusicUrl) URL.revokeObjectURL(backgroundMusicUrl);
      // Revoke all SFX / asset blob URLs created in this component
      createdBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      createdBlobUrls.current = [];
    };
  }, [backgroundMusicUrl]);

  // GC timeline on unmount: prune shots/clips beyond the 50-entry limit
  useEffect(() => {
    return () => {
      gcTimeline();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- DIRECTOR'S CHAIN INTEGRATION ---
  useDirectorsChain({
    shots,
    setShots,
    updateShot: handleShotChange,
    addToast,
    globalContext,
    savedCharacters,
    locations,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape handling for sub-modals
      if (e.key === 'Escape') {
        if (isImportModalOpen) setIsImportModalOpen(false);
        else if (isReviewingImport) setIsReviewingImport(false);
        else if (isPlayingMovie) setIsPlayingMovie(false);
        else if (isTableReadOpen) setIsTableReadOpen(false);
        else if (isAutoBlockerOpen) setIsAutoBlockerOpen(false);
        else if (plottingShotId !== null) setPlottingShotId(null);
        else if (whiteboardShotId !== null) setWhiteboardShotId(null);
        else if (inpaintingShotId !== null) setInpaintingShotId(null);
        else if (outpaintingShotId !== null) setOutpaintingShotId(null);
        else if (poseEditorShotId !== null) setPoseEditorShotId(null);
        else if (recordingShotId !== null) setRecordingShotId(null);
        else if (textEditorShotId !== null) setTextEditorShotId(null);
        else if (motionEditorShotId !== null) setMotionEditorShotId(null);
        else if (dubbingShotId !== null) setDubbingShotId(null);
        else if (foleyShotId !== null) setFoleyShotId(null);
        else if (magicMaskShotId !== null) setMagicMaskShotId(null);
        else if (doctorShotId !== null) setDoctorShotId(null);
        else if (colorMatchTargetId !== null) setColorMatchTargetId(null);
        else if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onClose,
    isImportModalOpen,
    isPlayingMovie,
    isTableReadOpen,
    isAutoBlockerOpen,
    plottingShotId,
    whiteboardShotId,
    inpaintingShotId,
    outpaintingShotId,
    poseEditorShotId,
    recordingShotId,
    textEditorShotId,
    motionEditorShotId,
    dubbingShotId,
    foleyShotId,
    magicMaskShotId,
    doctorShotId,
    colorMatchTargetId,
    isOpen,
    isReviewingImport,
  ]);

  // Define handlers before they are used in the return statement
  const handleDeleteShot = useCallback(
    (id: number) => {
      if (confirm('Delete this shot?')) {
        deleteShot(id);
      }
    },
    [deleteShot],
  );

  const handleSelectionToggle = useCallback((id: number) => {
    setSelectedShotIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  }, []);

  const handleColorMatch = async (targetShotId: number) => {
    if (colorMatchTargetId === null) return;
    const sourceShot = shots.find((s) => s.id === colorMatchTargetId);
    const targetShot = shots.find((s) => s.id === targetShotId);

    if (!sourceShot?.generatedVideoUrl || !targetShot?.generatedVideoUrl) {
      addToast('Both shots need video for color matching.', 'error');
      return;
    }

    setIsColorMatching(true);
    try {
      // We need base64 frames. Ideally extract frames.
      const sourceFrame = await extractLastFrame(sourceShot.generatedVideoUrl);
      const targetFrame = await extractLastFrame(targetShot.generatedVideoUrl);

      const colorGrade = await geminiService.calculateColorGrade(
        sourceFrame.data,
        targetFrame.data,
      );
      handleShotChange(targetShotId, 'colorGrade', colorGrade);
      addToast('Color grade applied.', 'success');
    } catch (e) {
      console.error(e);
      addToast('Color match failed.', 'error');
    } finally {
      setIsColorMatching(false);
      setColorMatchTargetId(null);
    }
  };

  const handleBridgeGap = async () => {
    if (selectedShotIds.length !== 2) return;
    const [id1, id2] = selectedShotIds.sort((a, b) => a - b);
    const shotA = shots.find((s) => s.id === id1);
    const shotB = shots.find((s) => s.id === id2);

    if (!shotA || !shotB) return;

    setIsBridging(true);
    try {
      const contextA = shotA.action;
      const contextB = shotB.action;
      const bridgeShots = await geminiService.bridgeScenes(contextA, contextB);

      // Insert bridge shots between id1 and id2.
      const newShotsList = [...shots];
      const indexA = newShotsList.findIndex((s) => s.id === id1);

      let nextId = Math.max(...shots.map((s) => s.id)) + 1;

      const insertedShots = bridgeShots.map((bs, idx) => ({
        id: nextId + idx,
        type: 'video' as const,
        action: bs.action || 'Bridge action',
        camera: bs.camera || 'Standard',
        characterId: '',
        takes: [],
        selectedTakeIndex: 0,
        duration: 5,
        transition: { type: 'cut' as const, duration: 0 },
        visualLink: false, // Add missing property
      }));

      // Insert after indexA
      newShotsList.splice(indexA + 1, 0, ...insertedShots);
      setShots(newShotsList);

      addToast(`Bridged with ${bridgeShots.length} new shots.`, 'success');
      setSelectedShotIds([]);
    } catch (error) {
      console.error(error);
      addToast('Failed to bridge scenes.', 'error');
    } finally {
      setIsBridging(false);
    }
  };

  const handleBatchGenerate = async () => {
    const promptsAndShots = shots
      .filter((s) => !s.generatedVideoUrl && s.type !== 'title' && s.action)
      .map((s) => ({
        prompt: buildShotPrompt(
          globalContext,
          s,
          savedCharacters.find((c) => c.id === s.characterId),
          locations.find((l) => l.id === s.locationId),
        ),
        shotId: s.id,
      }));

    if (promptsAndShots.length === 0) {
      addToast('No pending shots to generate.', 'info');
      return;
    }

    setIsGenerating(true);
    addToast(`Queuing ${promptsAndShots.length} shots for generation...`, 'info');

    try {
      for (const item of promptsAndShots) {
        await videoGenerationService.startGeneration(
          item.prompt,
          {
            aspectRatio: '16:9',
            resolution: '720p',
            veoModel: 'fast',
            count: 1,
          },
          undefined, // image
          (msg, type) => addToast(msg, type),
        );
      }
      addToast('All shots queued in background studio.', 'success');
    } catch (e) {
      console.error(e);
      addToast('Batch generation incomplete.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpscale = async (shot: Shot) => {
    if (!shot.generatedVideoUrl) return;
    if (credits < 5) {
      addToast('Not enough credits (5 required).', 'error');
      return;
    }

    setIsUpscaling((prev) => ({ ...prev, [shot.id]: true }));
    try {
      const upscaledUrl = await upscaleVideo(shot.generatedVideoUrl, 4);
      handleShotChange(shot.id, 'generatedVideoUrl', upscaledUrl); // Update to 4K url
      handleShotChange(shot.id, 'is4K', true);
      deductCredits(5);
      addToast('Upscale complete.', 'success');
    } catch {
      addToast('Upscale failed.', 'error');
    } finally {
      setIsUpscaling((prev) => ({ ...prev, [shot.id]: false }));
    }
  };

  // --- SFX / Foley Handler ---
  const handleAddFoley = (soundBlob: Blob, description: string) => {
    if (foleyShotId === null) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = (reader.result as string).split(',')[1];
      const assetId = `sfx_${Date.now()}`;

      // 1. Create Asset
      const newAsset: Asset = {
        id: assetId,
        type: 'audio',
        name: description,
        url: URL.createObjectURL(soundBlob),
        data: base64data,
        mimeType: 'audio/wav',
      };
      createdBlobUrls.current.push(newAsset.url);
      addAsset(newAsset);

      // 2. Add to Shot metadata
      const shot = shots.find((s) => s.id === foleyShotId);
      if (shot) {
        const newSFX: SFXEvent = {
          description: description,
          timestamp: 0, // Start at beginning of shot by default
        };
        handleShotChange(foleyShotId, 'sfx', [...(shot.sfx || []), newSFX]);
      }

      addToast(`Added SFX: ${description}`, 'success');
    };
    reader.readAsDataURL(soundBlob);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-[60] flex flex-col overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Icon name="film" className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-slate-100">{t.title}</h2>
          <div className="flex items-center px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
            <Icon name="zap" className="w-3 h-3 text-yellow-400 mr-2" />
            <span className="text-xs font-bold text-yellow-100">{credits} Credits</span>
          </div>
          <div className="h-6 w-px bg-slate-700 mx-2" />
          <button
            onClick={() => setIsAutoBlockerOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-fuchsia-400 border border-slate-600 transition-colors"
          >
            <Icon name="magic" className="w-4 h-4" /> Auto-Block
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlayingMovie(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-bold shadow-lg transition-colors"
          >
            <Icon name="play" className="w-4 h-4" /> Timeline
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Close Storyboard"
            aria-label="Close Storyboard"
          >
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-grow flex overflow-hidden">
        {/* Global Context Sidebar */}
        <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col flex-shrink-0 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
              {t.globalContext}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{t.globalContextDesc}</p>
            <TextAreaInput
              label={t.styleLabel}
              name="globalStyle"
              value={globalContext.style}
              onChange={(e) => setGlobalContext((prev) => ({ ...prev, style: e.target.value }))}
              rows={3}
              placeholder={t.stylePlaceholder}
            />
            <div className="h-4" />
            <TextAreaInput
              label={t.characterLabel}
              name="globalCharacter"
              value={globalContext.character}
              onChange={(e) => setGlobalContext((prev) => ({ ...prev, character: e.target.value }))}
              rows={3}
              placeholder={t.characterPlaceholder}
            />
            <div className="h-4" />
            <TextAreaInput
              label={t.settingLabel}
              name="globalSetting"
              value={globalContext.setting}
              onChange={(e) => setGlobalContext((prev) => ({ ...prev, setting: e.target.value }))}
              rows={3}
              placeholder={t.settingPlaceholder}
            />
          </div>

          <div className="mt-auto">
            <button
              onClick={handleBatchGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <Icon name="spinner" className="w-5 h-5 animate-spin" />
              ) : (
                <Icon name="magic" className="w-5 h-5" />
              )}
              {isGenerating ? t.generating : t.batchGenerate}
            </button>
          </div>
        </div>

        {/* Shot List */}
        <div className="flex-grow bg-slate-950 overflow-y-auto p-6 space-y-4">
          {shots.map((shot, index) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              index={index}
              isSelected={selectedShotIds.includes(shot.id)}
              isUpscaling={!!isUpscaling[shot.id]}
              isColorMatching={isColorMatching}
              colorMatchTargetId={colorMatchTargetId}
              savedCharacters={savedCharacters}
              t={t}
              onShotChange={handleShotChange}
              onDelete={handleDeleteShot}
              onSelectionToggle={handleSelectionToggle}
              onWhiteboard={setWhiteboardShotId}
              onCameraPlotter={setPlottingShotId}
              onPoseEditor={setPoseEditorShotId}
              onFoley={setFoleyShotId}
              onMagicMask={setMagicMaskShotId}
              onMotionEditor={setMotionEditorShotId}
              onDubbing={setDubbingShotId}
              onUpscale={handleUpscale}
              onColorMatch={handleColorMatch}
              onColorMatchTarget={setColorMatchTargetId}
              onRecording={setRecordingShotId}
            />
          ))}

          <button
            onClick={() => addShot('video')}
            className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-500 hover:bg-slate-900/50 transition-all flex items-center justify-center gap-2"
          >
            <Icon name="plus" className="w-5 h-5" />
            {t.addShot}
          </button>
        </div>
      </div>

      {/* Floating Actions */}
      {selectedShotIds.length === 2 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-slate-600 animate-fade-in-up z-[70]">
          <span className="text-sm font-bold">{selectedShotIds.length} Shots Selected</span>
          <button
            onClick={handleBridgeGap}
            disabled={isBridging}
            className="px-4 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-full text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isBridging ? 'Bridging...' : 'Bridge Gap (AI)'}
          </button>
          <button
            onClick={() => setSelectedShotIds([])}
            className="text-slate-400 hover:text-white"
            title="Cancel Selection"
            aria-label="Cancel Selection"
          >
            <Icon name="cancel" className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      {isAutoBlockerOpen && (
        <AutoBlockerModal
          isOpen={isAutoBlockerOpen}
          onClose={() => setIsAutoBlockerOpen(false)}
          savedCharacters={savedCharacters}
          onGenerate={(newShots) => {
            newShots.forEach(() => addShot());
          }}
          uiStrings={uiStrings}
        />
      )}
      {isImportModalOpen && (
        <ScriptImportReviewModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          initialShots={pendingImportShots}
          characterOptions={savedCharacters.map((c) => ({ value: c.id, label: c.name }))}
          locationOptions={locations.map((l) => ({ value: l.id, label: l.name }))}
          onImport={() => {}}
        />
      )}
      {isPlayingMovie && (
        <TimelinePlayer
          shots={shots}
          onClose={() => setIsPlayingMovie(false)}
          bgMusicUrl={backgroundMusicUrl}
        />
      )}
      {isTableReadOpen && (
        <TableReadPlayer
          shots={shots}
          savedCharacters={savedCharacters}
          onClose={() => setIsTableReadOpen(false)}
        />
      )}
      {whiteboardShotId !== null && (
        <WhiteboardModal
          isOpen={whiteboardShotId !== null}
          onClose={() => setWhiteboardShotId(null)}
          onGeneratePreview={(b64) => {
            handleShotChange(whiteboardShotId!, 'conceptImageUrl', `data:image/png;base64,${b64}`);
            setWhiteboardShotId(null);
          }}
          initialImage={shots.find((s) => s.id === whiteboardShotId)?.conceptImageUrl}
        />
      )}
      {plottingShotId !== null && (
        <CameraPlotterModal
          isOpen={plottingShotId !== null}
          onClose={() => setPlottingShotId(null)}
          conceptImageUrl={shots.find((s) => s.id === plottingShotId)?.conceptImageUrl}
          onApply={(prompt) => {
            handleShotChange(plottingShotId!, 'camera', prompt);
          }}
          addToast={addToast}
          uiStrings={uiStrings}
        />
      )}
      {recordingShotId !== null && (
        <RecordingBoothModal
          isOpen={recordingShotId !== null}
          onClose={() => setRecordingShotId(null)}
          scriptText={shots.find((s) => s.id === recordingShotId)?.dialogueText || ''}
          onSave={(_blob) => {
            /* Upload logic */
          }}
        />
      )}
      {inpaintingShotId !== null && (
        <InpaintingModal
          isOpen={inpaintingShotId !== null}
          onClose={() => setInpaintingShotId(null)}
          imageUrl={shots.find((s) => s.id === inpaintingShotId)?.conceptImageUrl || ''}
          onGenerate={async () => {}}
        />
      )}
      {outpaintingShotId !== null && (
        <GenerativeCanvasModal
          isOpen={outpaintingShotId !== null}
          onClose={() => setOutpaintingShotId(null)}
          conceptImageUrl={shots.find((s) => s.id === outpaintingShotId)?.conceptImageUrl || ''}
          onGenerateFill={async () => {}}
        />
      )}
      {poseEditorShotId !== null && (
        <PoseEditorModal
          isOpen={poseEditorShotId !== null}
          onClose={() => setPoseEditorShotId(null)}
          onSave={(b64) =>
            handleShotChange(poseEditorShotId!, 'poseUrl', `data:image/png;base64,${b64}`)
          }
        />
      )}
      {motionEditorShotId !== null && (
        <MotionCropEditor
          isOpen={motionEditorShotId !== null}
          onClose={() => setMotionEditorShotId(null)}
          imageUrl={
            shots.find((s) => s.id === motionEditorShotId)?.conceptImageUrl ||
            shots.find((s) => s.id === motionEditorShotId)?.generatedVideoUrl ||
            ''
          }
          initialConfig={shots.find((s) => s.id === motionEditorShotId)?.motionConfig}
          onSave={(config) => handleShotChange(motionEditorShotId!, 'motionConfig', config)}
        />
      )}

      {/* Title Editor */}
      {textEditorShotId !== null && (
        <TitleEditorModal
          isOpen={textEditorShotId !== null}
          onClose={() => setTextEditorShotId(null)}
          shot={shots.find((s) => s.id === textEditorShotId)!}
          onSave={(overlays) => handleShotChange(textEditorShotId!, 'overlays', overlays)}
        />
      )}

      {/* Dubbing Modal */}
      {dubbingShotId !== null && (
        <DubbingModal
          isOpen={dubbingShotId !== null}
          onClose={() => setDubbingShotId(null)}
          shot={shots.find((s) => s.id === dubbingShotId)!}
          onSave={() => {}}
          addToast={addToast}
        />
      )}

      {/* Foley Wizard */}
      {foleyShotId !== null && (
        <FoleyWizardModal
          isOpen={foleyShotId !== null}
          onClose={() => setFoleyShotId(null)}
          shot={shots.find((s) => s.id === foleyShotId)!}
          onApply={handleAddFoley}
          addToast={addToast}
        />
      )}

      {/* Magic Mask Modal */}
      {magicMaskShotId !== null && (
        <MagicMaskModal
          isOpen={magicMaskShotId !== null}
          onClose={() => setMagicMaskShotId(null)}
          videoUrl={shots.find((s) => s.id === magicMaskShotId)?.generatedVideoUrl || ''}
          onApply={(maskSequence) => {
            handleShotChange(magicMaskShotId!, 'maskSequence', maskSequence);
            // Disable standard green screen if using magic mask
            handleShotChange(magicMaskShotId!, 'isGreenScreen', false);
            addToast('Mask applied to timeline clip.', 'success');
          }}
        />
      )}
    </div>
  );
};

export default StoryBoard;
