import { useEffect, useRef } from 'react';
import { useAppStore } from '@core/store/useAppStore';
import * as sfxService from '@core/services/sfxService';
import { Asset, TimelineClip } from '@core/types';
import { logger } from '@core/services/loggerService';

export const useSceneAmbience = () => {
  const { clips, addAsset, addTimelineClip, sbShots, assets } = useAppStore();
  const processedClipIds = useRef<Set<string>>(new Set());
  const createdBlobUrls = useRef<string[]>([]);

  // Revoke all blob URLs created by this hook on unmount
  useEffect(() => {
    return () => {
      createdBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      createdBlobUrls.current = [];
    };
  }, []);

  useEffect(() => {
    const videoClips = clips.filter((c) => c.trackId === 'video_main');

    videoClips.forEach(async (clip) => {
      if (processedClipIds.current.has(clip.id)) return;

      // Check if ambience already exists overlapping this clip's time range
      // We want roughly one ambience track per scene or shot if they are distinct
      // For simplicity, we add one per shot if not present
      const hasAmbience = clips.some(
        (c) => c.trackId === 'audio_ambience' && Math.abs(c.startTime - clip.startTime) < 0.5,
      );

      if (hasAmbience) {
        processedClipIds.current.add(clip.id);
        return;
      }

      processedClipIds.current.add(clip.id); // Mark as processing to avoid double calls

      // Determine Scene Context
      let sceneDescription = 'Cinematic scene';

      // 1. Try to find source Shot
      const shot = sbShots.find((s) => s.id === clip.resourceId);
      if (shot) {
        sceneDescription = shot.action || sceneDescription;
      } else {
        // 2. Try to find source Asset (for stock footage)
        const asset = assets.find((a) => a.id === String(clip.resourceId));
        if (asset) {
          sceneDescription = asset.name || sceneDescription;
        }
      }

      // Don't generate for completely empty descriptions
      if (sceneDescription === 'Cinematic scene' || !sceneDescription.trim()) return;

      try {
        const blob = await sfxService.getAmbience(sceneDescription);

        // Create Asset
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          const assetId = `amb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

          const newAsset: Asset = {
            id: assetId,
            type: 'audio',
            name: `Ambience: ${sceneDescription.substring(0, 20)}...`,
            url: URL.createObjectURL(blob),
            data: base64data,
            mimeType: 'audio/wav',
          };
          createdBlobUrls.current.push(newAsset.url);
          addAsset(newAsset);

          // Add to Timeline
          const newClip: TimelineClip = {
            id: `clip_${assetId}`,
            resourceId: assetId,
            trackId: 'audio_ambience',
            startTime: clip.startTime,
            duration: clip.duration,
            offset: 0,
            type: 'audio',
            label: `Ambience: ${sceneDescription.substring(0, 15)}...`,
            volume: 0.1, // Locked to Low Volume (~ -20dB)
            panning: { x: 0, z: 0 },
          };
          addTimelineClip(newClip);
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        logger.error('Auto-ambience failed', e);
        // Remove from processed so we can retry later if needed, or leave it to avoid spam
        processedClipIds.current.delete(clip.id);
      }
    });
  }, [clips, sbShots, assets, addAsset, addTimelineClip]);
};
