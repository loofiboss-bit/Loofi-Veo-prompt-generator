import React, { useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import TextAreaInput from '@shared/components/ui/TextAreaInput';
import { CHARACTER_LIMITS } from '@core/constants';

interface SpatialDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedImageUrl: string | null;
  spatialMotions: Record<string, string>;
  onUpdateMotion: (gridId: string, motion: string) => void;
  onClearAll: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uiStrings: any;
}

const SECTORS = [
  ['0-0', '0-1', '0-2'],
  ['1-0', '1-1', '1-2'],
  ['2-0', '2-1', '2-2'],
];

const SpatialDirectorModal: React.FC<SpatialDirectorModalProps> = ({
  isOpen,
  onClose,
  uploadedImageUrl,
  spatialMotions,
  onUpdateMotion,
  onClearAll,
  uiStrings,
}) => {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Update local input when selection changes
  useEffect(() => {
    if (selectedSector) {
      setTextInput(spatialMotions[selectedSector] || '');
    }
  }, [selectedSector, spatialMotions]);

  const handleSaveInput = () => {
    if (selectedSector) {
      onUpdateMotion(selectedSector, textInput);
      setSelectedSector(null);
    }
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
      <div className="relative bg-slate-900/80 backdrop-blur-xl w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col max-h-[90vh] overflow-hidden">
        <header className="flex items-center justify-between p-5 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Icon name="grid-3x3" className="w-6 h-6 text-cyan-400" />
              {uiStrings.spatialDirector.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{uiStrings.spatialDirector.instruction}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
          {/* Grid Area */}
          <div className="flex-1 p-6 flex items-center justify-center bg-slate-950/50 relative overflow-hidden">
            <div className="relative w-full max-w-3xl aspect-video rounded-lg overflow-hidden border-2 border-slate-700 shadow-2xl">
              {/* Background Image or Placeholder */}
              {uploadedImageUrl ? (
                <img
                  src={uploadedImageUrl}
                  alt="Reference"
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
              ) : (
                <div className="absolute inset-0 bg-slate-800/30 flex items-center justify-center">
                  <Icon name="image" className="w-24 h-24 text-slate-700 opacity-20" />
                </div>
              )}

              {/* 3x3 Grid Overlay */}
              <div className="absolute inset-0 grid grid-rows-3 grid-cols-3">
                {SECTORS.map((row, _rIndex) =>
                  row.map((id, _cIndex) => {
                    const hasContent = !!spatialMotions[id];
                    const isSelected = selectedSector === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedSector(id)}
                        className={`
                                                    relative border border-slate-500/30 transition-all duration-200 group
                                                    ${isSelected ? 'bg-cyan-500/20 border-cyan-400 z-10 shadow-[inset_0_0_20px_rgba(34,211,238,0.3)]' : 'hover:bg-slate-700/20'}
                                                    ${hasContent && !isSelected ? 'bg-green-500/10 border-green-500/30' : ''}
                                                `}
                      >
                        {/* Label (Top Left corner of cell) */}
                        <span className="absolute top-1 left-2 text-[10px] font-mono text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity">
                          {uiStrings.spatialDirector.sectors[id]}
                        </span>

                        {/* Indicator Icon if content exists */}
                        {hasContent && (
                          <div className="absolute bottom-2 right-2">
                            <Icon name="check" className="w-4 h-4 text-green-400" />
                          </div>
                        )}
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
          </div>

          {/* Controls Side Panel */}
          <div className="w-full md:w-80 bg-slate-900 border-l border-slate-700 p-6 flex flex-col">
            {selectedSector ? (
              <div className="flex-grow flex flex-col space-y-4 animate-fade-in-up">
                <div>
                  <h3 className="text-lg font-bold text-cyan-400 mb-1">
                    {uiStrings.spatialDirector.sectors[selectedSector]}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Describe motion for this specific sector.
                  </p>
                </div>

                <TextAreaInput
                  label="Motion / Detail"
                  name="sectorMotion"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={uiStrings.spatialDirector.placeholder}
                  maxLength={CHARACTER_LIMITS.spatialMotion}
                  rows={6}
                  autoFocus
                />

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveInput}
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-semibold text-sm transition-colors"
                  >
                    {uiStrings.spatialDirector.save}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
                <Icon name="grid-3x3" className="w-12 h-12 opacity-20" />
                <p className="text-sm">
                  Select a grid sector on the left to add specific directions.
                </p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-800 mt-auto">
              <button
                onClick={onClearAll}
                className="w-full py-2 border border-slate-700 hover:border-red-500/50 text-slate-400 hover:text-red-400 rounded-md text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="trash" className="w-4 h-4" />
                {uiStrings.spatialDirector.clearAll}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpatialDirectorModal;
