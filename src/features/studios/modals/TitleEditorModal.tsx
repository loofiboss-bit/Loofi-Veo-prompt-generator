import React, { useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import AppDialog from '@shared/components/ui/AppDialog';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import RangeInput from '@shared/components/ui/RangeInput';
import SelectInput from '@shared/components/ui/SelectInput';
import { Shot, TextOverlay } from '@core/types';

interface TitleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  shot: Shot;
  onSave: (overlays: TextOverlay[]) => void;
}

const DEFAULT_OVERLAY: TextOverlay = {
  id: '',
  text: 'New Title',
  startTime: 0,
  duration: 3,
  animationIn: 'fade',
  animationOut: 'fade',
  animationDuration: 0.5,
  position: { x: 50, y: 50 },
  style: {
    fontSize: 48,
    color: '#ffffff',
    backgroundColor: '#000000',
    backgroundOpacity: 0,
    fontFamily: 'Arial',
  },
};

const ANIMATION_IN_OPTIONS = [
  { value: 'none', label: 'None (Instant)' },
  { value: 'fade', label: 'Fade In' },
  { value: 'slide_up', label: 'Slide Up' },
  { value: 'zoom', label: 'Zoom In' },
  { value: 'typewriter', label: 'Typewriter' },
];

const ANIMATION_OUT_OPTIONS = [
  { value: 'none', label: 'None (Instant)' },
  { value: 'fade', label: 'Fade Out' },
  { value: 'slide_down', label: 'Slide Down' },
  { value: 'zoom', label: 'Zoom Out' },
];

const TitleEditorModal: React.FC<TitleEditorModalProps> = ({ isOpen, onClose, shot, onSave }) => {
  const [overlays, setOverlays] = useState<TextOverlay[]>(shot.overlays || []);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Preview Logic
  const activeOverlay = overlays.find((o) => o.id === activeId);

  const activeVideoSrc =
    shot.takes && typeof shot.selectedTakeIndex === 'number' && shot.takes[shot.selectedTakeIndex]
      ? shot.takes[shot.selectedTakeIndex]
      : shot.generatedVideoUrl;

  useEffect(() => {
    if (isOpen) {
      setOverlays(shot.overlays || []);
      if (shot.overlays && shot.overlays.length > 0) {
        setActiveId(shot.overlays[0].id);
      }
    }
  }, [isOpen, shot]);

  const handleAdd = () => {
    const newOverlay: TextOverlay = {
      ...DEFAULT_OVERLAY,
      id: Date.now().toString(),
      duration: Math.min(3, shot.duration || 5),
    };
    setOverlays([...overlays, newOverlay]);
    setActiveId(newOverlay.id);
  };

  const handleRemove = (id: string) => {
    setOverlays(overlays.filter((o) => o.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const updateActive = (
    updates:
      | Partial<TextOverlay>
      | Partial<TextOverlay['style']>
      | Partial<TextOverlay['position']>,
  ) => {
    if (!activeId) return;

    setOverlays((prev) =>
      prev.map((o) => {
        if (o.id !== activeId) return o;

        // Handle Nested Updates nicely
        if (
          'fontSize' in updates ||
          'color' in updates ||
          'backgroundColor' in updates ||
          'backgroundOpacity' in updates
        ) {
          return { ...o, style: { ...o.style, ...updates } };
        }
        if ('x' in updates || 'y' in updates) {
          return { ...o, position: { ...o.position, ...updates } };
        }

        return { ...o, ...updates };
      }),
    );
  };

  const handleSave = () => {
    onSave(overlays);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      layer="overlay"
      showCloseButton={false}
      bodyClassName="!p-0"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col h-[90vh] overflow-hidden">
        <header className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="subtitles" className="w-6 h-6 text-cyan-400" />
            Text & Titles
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow flex overflow-hidden">
          {/* Left: Preview Area */}
          <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
            <div className="relative max-h-full max-w-full aspect-video shadow-2xl bg-slate-900">
              {/* Video Base */}
              {activeVideoSrc ? (
                <video
                  src={activeVideoSrc}
                  className="w-full h-full object-contain"
                  muted
                  loop
                  autoPlay
                />
              ) : shot.conceptImageUrl ? (
                <img
                  src={shot.conceptImageUrl}
                  className="w-full h-full object-contain opacity-50"
                  alt="Ref"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700">
                  No Preview
                </div>
              )}

              {/* Overlays Render - Static for editor ease */}
              {overlays.map((overlay) => (
                <div
                  key={overlay.id}
                  onClick={() => setActiveId(overlay.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveId(overlay.id);
                    }
                  }}
                  className={`absolute cursor-pointer select-none transition-all ${activeId === overlay.id ? 'ring-2 ring-cyan-400' : ''}`}
                  role="button"
                  tabIndex={0}
                  style={{
                    left: `${overlay.position.x}%`,
                    top: `${overlay.position.y}%`,
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${overlay.style.fontSize / 2}px`, // Scale down for preview if needed or use container query
                    color: overlay.style.color,
                    backgroundColor:
                      overlay.style.backgroundColor +
                      Math.floor((overlay.style.backgroundOpacity || 0) * 255)
                        .toString(16)
                        .padStart(2, '0'),
                    fontFamily: overlay.style.fontFamily,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {overlay.text}
                </div>
              ))}
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">
                Duration: {shot.duration}s
              </span>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="w-96 bg-slate-900 border-l border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/30">
              <h3 className="text-sm font-bold text-slate-300">Layers</h3>
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded font-bold flex items-center gap-1"
              >
                <Icon name="plus" className="w-3 h-3" /> Add Text
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-6">
              {/* Layer List (Mini) */}
              <div className="space-y-2 mb-6">
                {overlays.map((overlay) => (
                  <div
                    key={overlay.id}
                    onClick={() => setActiveId(overlay.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveId(overlay.id);
                      }
                    }}
                    className={`p-2 rounded border flex justify-between items-center cursor-pointer ${
                      activeId === overlay.id
                        ? 'border-cyan-500 bg-cyan-900/20'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="text-xs text-slate-200 truncate max-w-[150px]">
                      {overlay.text}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(overlay.id);
                      }}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Icon name="trash" className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {activeOverlay ? (
                <div className="space-y-5 animate-fade-in-up">
                  <TextAreaInput
                    label="Content"
                    name="textContent"
                    value={activeOverlay.text}
                    onChange={(e) => updateActive({ text: e.target.value })}
                    rows={2}
                  />

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Style
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="overlayColor" className="text-xs text-slate-400 block mb-1">
                          Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="overlayColor"
                            type="color"
                            value={activeOverlay.style.color}
                            onChange={(e) => updateActive({ color: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="overlayBgColor"
                          className="text-xs text-slate-400 block mb-1"
                        >
                          Background
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="overlayBgColor"
                            type="color"
                            value={activeOverlay.style.backgroundColor}
                            onChange={(e) => updateActive({ backgroundColor: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                          />
                        </div>
                      </div>
                    </div>
                    <RangeInput
                      label="Font Size"
                      name="fontSize"
                      value={activeOverlay.style.fontSize}
                      onChange={(e) => updateActive({ fontSize: parseInt(e.target.value) })}
                      min={10}
                      max={200}
                    />
                    <RangeInput
                      label="BG Opacity"
                      name="bgOpacity"
                      value={Math.round((activeOverlay.style.backgroundOpacity || 0) * 100)}
                      onChange={(e) =>
                        updateActive({ backgroundOpacity: parseInt(e.target.value) / 100 })
                      }
                      min={0}
                      max={100}
                    />
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Position
                    </h4>
                    <RangeInput
                      label="X Position (%)"
                      name="posX"
                      value={activeOverlay.position.x}
                      onChange={(e) => updateActive({ x: parseInt(e.target.value) })}
                      min={0}
                      max={100}
                    />
                    <RangeInput
                      label="Y Position (%)"
                      name="posY"
                      value={activeOverlay.position.y}
                      onChange={(e) => updateActive({ y: parseInt(e.target.value) })}
                      min={0}
                      max={100}
                    />
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Animation
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <SelectInput
                        label="Entrance"
                        name="animIn"
                        options={ANIMATION_IN_OPTIONS}
                        value={activeOverlay.animationIn || 'none'}
                        onChange={(e) =>
                          updateActive({
                            animationIn: e.target.value as TextOverlay['animationIn'],
                          })
                        }
                      />
                      <SelectInput
                        label="Exit"
                        name="animOut"
                        options={ANIMATION_OUT_OPTIONS}
                        value={activeOverlay.animationOut || 'none'}
                        onChange={(e) =>
                          updateActive({
                            animationOut: e.target.value as TextOverlay['animationOut'],
                          })
                        }
                      />
                    </div>
                    <RangeInput
                      label="Duration (Speed)"
                      name="animDuration"
                      value={(activeOverlay.animationDuration || 0.5) * 100} // Multiply for easier slider
                      min={10}
                      max={200}
                      step={10}
                      onChange={(e) =>
                        updateActive({ animationDuration: parseInt(e.target.value) / 100 })
                      }
                      info="Time in seconds for the animation to complete."
                    />
                    <p className="text-[10px] text-slate-500 text-right">
                      {activeOverlay.animationDuration || 0.5}s
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Timing (Seconds)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="overlayStartTime"
                          className="text-xs text-slate-400 block mb-1"
                        >
                          Start
                        </label>
                        <input
                          id="overlayStartTime"
                          type="number"
                          min={0}
                          max={shot.duration}
                          step={0.1}
                          value={activeOverlay.startTime}
                          onChange={(e) => updateActive({ startTime: parseFloat(e.target.value) })}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="overlayDuration"
                          className="text-xs text-slate-400 block mb-1"
                        >
                          Duration
                        </label>
                        <input
                          id="overlayDuration"
                          type="number"
                          min={0.5}
                          max={shot.duration}
                          step={0.1}
                          value={activeOverlay.duration}
                          onChange={(e) => updateActive({ duration: parseFloat(e.target.value) })}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 mt-10">
                  <p>Select a layer to edit</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-900">
              <button
                onClick={handleSave}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Icon name="check" className="w-5 h-5" />
                Save Overlays
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppDialog>
  );
};

export default TitleEditorModal;
