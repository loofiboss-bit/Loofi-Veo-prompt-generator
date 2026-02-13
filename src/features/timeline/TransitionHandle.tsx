import React, { useState, useRef } from 'react';
import Icon from '@shared/components/ui/Icon';
import { ClipTransition } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { extractFrameImageData } from '@core/utils/videoUtils';
import { analyzeCut, TransitionRecommendation } from '@core/services/transitionAnalyst';

interface TransitionHandleProps {
  transition: ClipTransition;
  onUpdate: (t: ClipTransition) => void;
  left: number; // Pixel position
  zoomLevel: number;
  incomingClipId?: string;
  outgoingClipId?: string;
}

const TransitionHandle: React.FC<TransitionHandleProps> = ({
  transition,
  onUpdate,
  left,
  zoomLevel,
  incomingClipId,
  outgoingClipId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<TransitionRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);
  const { clips, assets } = useAppStore();

  // Calculate visual width of the transition handle
  const width = transition.type === 'cut' ? 4 : transition.duration * zoomLevel;
  const offsetLeft = left - width / 2;

  const getIcon = (type: string) => {
    switch (type) {
      case 'dissolve':
        return 'activity';
      case 'fade_black':
        return 'moon';
      case 'wipe_left':
        return 'arrow-right';
      default:
        return 'plus';
    }
  };

  const handleSelect = (type: ClipTransition['type']) => {
    const duration = type === 'cut' ? 0 : 1.0;
    onUpdate({ type, duration });
    setIsOpen(false);
  };

  const runAnalysis = async () => {
    if (!incomingClipId || !outgoingClipId) return;

    const outClip = clips.find((c) => c.id === outgoingClipId);
    const inClip = clips.find((c) => c.id === incomingClipId);

    if (!outClip || !inClip) return;

    // Resolve Assets
    const outAsset = assets.find((a) => a.id === String(outClip.resourceId));
    const inAsset = assets.find((a) => a.id === String(inClip.resourceId));

    if (!outAsset?.url || !inAsset?.url) return;

    setIsAnalyzing(true);
    try {
      // Get Last Frame of Outgoing (End of clip)
      // Time offset = duration (approx)
      const outFrame = await extractFrameImageData(outAsset.url, outClip.duration - 0.1);

      // Get First Frame of Incoming
      const inFrame = await extractFrameImageData(inAsset.url, 0);

      const result = analyzeCut(outFrame, inFrame);
      setRecommendation(result);
    } catch (e) {
      console.error('Smart Transition Analysis Failed', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMouseEnter = () => {
    // Debounce analysis to avoid spamming on quick mouseover
    hoverTimeoutRef.current = window.setTimeout(() => {
      if (!recommendation && !isAnalyzing) {
        runAnalysis();
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  return (
    <>
      <div
        className={`absolute top-0 bottom-0 z-30 group cursor-pointer flex flex-col justify-center items-center transition-all ${isOpen ? 'z-50' : ''}`}
        style={{ left: `${offsetLeft}px`, width: `${Math.max(16, width)}px` }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Visual Bar */}
        <div
          className={`w-full h-full opacity-50 group-hover:opacity-80 transition-opacity rounded-sm ${
            transition.type === 'cut'
              ? 'w-1 bg-white/20 group-hover:bg-white/50'
              : 'bg-fuchsia-500/30 border-x border-fuchsia-400/50'
          }`}
        ></div>

        {/* Icon Badge */}
        <div className="absolute top-2 p-1 rounded-full bg-slate-800 border border-slate-600 shadow-md transform scale-0 group-hover:scale-100 transition-transform flex items-center justify-center">
          <Icon name={getIcon(transition.type)} className="w-3 h-3 text-white" />
        </div>

        {/* AI Suggestion Tooltip (On Hover) */}
        {!isOpen && (isAnalyzing || recommendation) && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg shadow-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Icon name="spinner" className="w-3 h-3 animate-spin" />
                <span>Analyzing cut...</span>
              </div>
            ) : recommendation ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="sparkles" className="w-3 h-3 text-cyan-400" />
                  <span className="text-[10px] font-bold text-cyan-300 uppercase">
                    AI Suggestion
                  </span>
                </div>
                <div className="text-xs font-bold text-white mb-1">
                  {recommendation.type === 'cut'
                    ? 'Hard Cut'
                    : recommendation.type === 'dissolve'
                      ? 'Cross Dissolve'
                      : 'Dip to Black'}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">{recommendation.reason}</p>
                <div className="mt-2 flex gap-1 text-[9px] font-mono text-slate-600">
                  <span>ΔColor: {recommendation.scores.colorDiff.toFixed(0)}%</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Popover Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute top-8 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 w-48 animate-fade-in-up"
            style={{ left: `${left}px` }}
          >
            <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-2">
              Transition Type
            </h4>

            {/* Quick Apply Recommendation */}
            {recommendation && (
              <button
                onClick={() => handleSelect(recommendation.type)}
                className="w-full flex items-center gap-2 px-2 py-2 mb-2 rounded bg-cyan-900/30 border border-cyan-500/30 text-xs text-cyan-200 hover:bg-cyan-900/50"
              >
                <Icon name="sparkles" className="w-3 h-3" />
                <span>Apply Suggestion</span>
              </button>
            )}

            <div className="space-y-1">
              <button
                onClick={() => handleSelect('cut')}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-xs text-slate-300"
              >
                <Icon name="cancel" className="w-3 h-3" /> None (Cut)
              </button>
              <button
                onClick={() => handleSelect('dissolve')}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-xs text-slate-300"
              >
                <Icon name="activity" className="w-3 h-3 text-cyan-400" /> Cross Dissolve
              </button>
              <button
                onClick={() => handleSelect('fade_black')}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-xs text-slate-300"
              >
                <Icon name="moon" className="w-3 h-3 text-slate-400" /> Dip to Black
              </button>
              <button
                onClick={() => handleSelect('wipe_left')}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-xs text-slate-300"
              >
                <Icon name="arrow-right" className="w-3 h-3 text-fuchsia-400" /> Wipe Left
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default TransitionHandle;
