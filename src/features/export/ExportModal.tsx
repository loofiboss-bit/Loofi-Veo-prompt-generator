import React, { useState, useEffect } from 'react';
import Icon from '@shared/components/ui/Icon';
import { EXPORT_PROFILES, ExportProfile } from '@core/config/exportProfiles';
import CheckboxInput from '@shared/components/ui/CheckboxInput';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    profile: ExportProfile,
    options?: { includeWaveform?: boolean; directExport?: boolean },
  ) => void;
  totalDuration: number; // in seconds
  isProcessing: boolean;
  processingStatus: string;
  errorMessage?: string;
  directExportEnabled?: boolean;
  directExportHint?: string;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalDuration,
  isProcessing,
  processingStatus,
  errorMessage,
  directExportEnabled = true,
  directExportHint,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState(EXPORT_PROFILES[0].id);
  const [includeWaveform, setIncludeWaveform] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'file' | 'direct'>('file');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isProcessing]);

  const selectedProfile =
    EXPORT_PROFILES.find((p) => p.id === selectedProfileId) || EXPORT_PROFILES[0];

  const estimateSize = () => {
    const mbits = selectedProfile.estimatedBitrateMbps * totalDuration;
    const mbytes = mbits / 8;
    if (mbytes < 1000) return `${mbytes.toFixed(1)} MB`;
    return `${(mbytes / 1024).toFixed(2)} GB`;
  };

  if (!isOpen) return null;

  const isDirectMode = deliveryMode === 'direct';
  const isDirectActionDisabled = isDirectMode && !directExportEnabled;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center z-[150] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Icon name="download" className="w-5 h-5 text-cyan-400" />
            Export Video
          </h3>
          {!isProcessing && (
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <Icon name="cancel" className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
              <div>
                <h4 className="text-lg font-bold text-slate-200">Rendering...</h4>
                <p className="text-sm text-slate-400 mt-1 font-mono">{processingStatus}</p>
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                Please do not close this window. Processing happens locally in your browser.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <span className="block text-sm font-semibold text-slate-300 uppercase tracking-wide">
                  Target Platform
                </span>
                <div className="grid gap-3">
                  {EXPORT_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedProfileId(profile.id)}
                      className={`flex items-start p-3 rounded-xl border text-left transition-all ${
                        selectedProfileId === profile.id
                          ? 'bg-cyan-900/20 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                          : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div
                        className={`mt-1 mr-3 p-1 rounded-full ${selectedProfileId === profile.id ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}
                      >
                        {selectedProfileId === profile.id && (
                          <Icon name="check" className="w-3 h-3" />
                        )}
                      </div>
                      <div>
                        <div
                          className={`font-bold text-sm ${selectedProfileId === profile.id ? 'text-cyan-300' : 'text-slate-200'}`}
                        >
                          {profile.label}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {profile.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <CheckboxInput
                  id="includeWaveform"
                  name="includeWaveform"
                  label="Include Waveform (Audio Reactor)"
                  checked={includeWaveform}
                  onChange={(e) => setIncludeWaveform(e.target.checked)}
                  tooltipText="Adds a dynamic audio visualization overlay to your video."
                  color="cyan"
                />
              </div>

              <div className="space-y-3">
                <span className="block text-sm font-semibold text-slate-300 uppercase tracking-wide">
                  Delivery
                </span>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('file')}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                      deliveryMode === 'file'
                        ? 'border-cyan-500 bg-cyan-900/20 text-cyan-200'
                        : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    Standard File Export
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('direct')}
                    disabled={!directExportEnabled}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                      deliveryMode === 'direct'
                        ? 'border-cyan-500 bg-cyan-900/20 text-cyan-200'
                        : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    Direct Export to DaVinci Resolve (Desktop)
                  </button>
                </div>
                {directExportHint && (
                  <p className="text-xs text-amber-300 rounded-md border border-amber-600/40 bg-amber-950/30 px-3 py-2">
                    {directExportHint}
                  </p>
                )}
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-rose-600/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
                  {errorMessage}
                </div>
              )}

              <div className="bg-slate-950/50 rounded-lg p-4 flex justify-between items-center text-sm border border-slate-800">
                <span className="text-slate-400">Estimated File Size</span>
                <span className="font-mono font-bold text-slate-200">{estimateSize()}</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    onConfirm(selectedProfile, {
                      includeWaveform,
                      directExport: deliveryMode === 'direct',
                    })
                  }
                  disabled={isDirectActionDisabled}
                  className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-[1.02]"
                >
                  {deliveryMode === 'direct' ? 'Send to Resolve' : 'Export Now'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
