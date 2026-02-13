import React from 'react';
import { useAppStore } from '@core/store/useAppStore';
import Icon from '@shared/components/ui/Icon';

interface TakeSelectorProps {
  clipId: string;
}

export const TakeSelector: React.FC<TakeSelectorProps> = ({ clipId }) => {
  const { clips, assets, updateTimelineClip } = useAppStore();

  // Find current clip
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) return null;

  // Find currently active asset for this clip
  const activeAssetId = clip.selectedTakeId || String(clip.resourceId);
  const activeAsset = assets.find((a) => a.id === activeAssetId);

  // If no asset or no take group, nothing to show
  if (!activeAsset || !activeAsset.takeGroupId) return null;

  // Find all assets in the same group
  const takes = assets
    .filter((a) => a.takeGroupId === activeAsset.takeGroupId)
    .sort((a, b) => (a.takeNumber || 0) - (b.takeNumber || 0));

  if (takes.length <= 1) return null; // No other takes available

  const handleSelectTake = (takeId: string) => {
    // Update the clip to point to the new asset
    updateTimelineClip(clipId, {
      resourceId: takeId,
      selectedTakeId: takeId,
      // Reset transforms/effects usually? Or keep them?
      // Keeping them allows applying same grade to different take.
    });
  };

  return (
    <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Icon name="layers" className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Takes</span>
          <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 rounded-full">
            {takes.length}
          </span>
        </div>
        <span
          className="text-[9px] font-mono text-slate-600 truncate max-w-[100px]"
          title={activeAsset.takeGroupId}
        >
          ID: {activeAsset.takeGroupId.substring(0, 6)}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
        {takes.map((take) => {
          const isSelected = take.id === activeAssetId;
          return (
            <button
              key={take.id}
              onClick={() => handleSelectTake(take.id)}
              className={`
                                relative flex-shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 transition-all snap-start
                                ${
                                  isSelected
                                    ? 'border-cyan-400 ring-2 ring-cyan-400/20 shadow-lg z-10 scale-105'
                                    : 'border-slate-700 hover:border-slate-500 opacity-70 hover:opacity-100'
                                }
                            `}
            >
              {take.type === 'video' ? (
                <video
                  src={take.proxyUrl || take.url}
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <img
                  src={take.url}
                  className="w-full h-full object-cover"
                  alt={`Take ${take.takeNumber}`}
                />
              )}

              <div className="absolute top-0 right-0 bg-black/60 px-1.5 py-0.5 rounded-bl text-[9px] font-mono text-white backdrop-blur-sm">
                #{take.takeNumber}
              </div>

              {isSelected && (
                <div className="absolute inset-0 border-2 border-cyan-400 rounded-md pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
