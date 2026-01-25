
import { useAppStore } from '../store/useAppStore';
import { Asset, TimelineClip, Shot } from '../types';
import * as geminiService from './geminiService';
import { generateProxy } from './videoEditorService';
import { createWavHeader } from '../utils/audio';

/**
 * Automates the creation of a full rough cut from a single script line.
 * 
 * Flow:
 * 1. Analyze script line -> Visual Prompt, Audio Prompt, Duration
 * 2. Generate Audio (TTS or SFX) -> Asset
 * 3. Generate Visual (Image -> Video) -> Asset
 * 4. Create Timeline Clips and place them sequentially.
 */
export const generateAndAssemble = async (shot: Partial<Shot>): Promise<void> => {
    const { addAsset, addTimelineClip, sbTimeline, updateTimelineClip, updateShot } = useAppStore.getState();
    const scriptLine = `${shot.action} ${shot.dialogueText || ''}`.trim();

    if (!scriptLine) throw new Error("Empty script line");

    // 1. Analyze
    const analysis = await geminiService.analyzeScene(scriptLine);
    
    const timestamp = Date.now();
    const baseId = `auto_${timestamp}_${Math.floor(Math.random() * 1000)}`;
    
    // Determine insertion point (end of current timeline)
    // We scan all clips to find the max end time
    const maxEndTime = sbTimeline.clips.reduce((max, clip) => Math.max(max, clip.startTime + clip.duration), 0);
    const startTime = maxEndTime > 0 ? maxEndTime + 0.5 : 0; // Small gap for visual clarity

    // --- AUDIO PIPELINE ---
    const audioAssetId = `aud_${baseId}`;
    let audioDuration = analysis.duration || 5;

    // We start audio generation immediately
    const audioPromise = (async () => {
        try {
            // Generate raw audio
            let base64Audio = "";
            if (analysis.isDialogue) {
                base64Audio = await geminiService.generateSpeech(analysis.audioPrompt);
            } else {
                base64Audio = await geminiService.generateSoundEffect(analysis.audioPrompt);
            }

            if (base64Audio) {
                // Convert to Blob
                const byteCharacters = atob(base64Audio);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                
                // Add WAV header
                const wavHeader = createWavHeader(byteArray.length, 24000, 1, 16);
                const wavBlob = new Blob([wavHeader, byteArray], { type: 'audio/wav' });
                const url = URL.createObjectURL(wavBlob);
                
                // Estimate duration roughly (bytes / rate / channels / bits)
                // 24000 * 1 * 2 = 48000 bytes/sec
                const estimatedDur = byteArray.length / 48000;
                audioDuration = estimatedDur;

                // Create Asset
                const asset: Asset = {
                    id: audioAssetId,
                    type: 'audio',
                    name: `Audio: ${scriptLine.substring(0, 20)}...`,
                    url: url,
                    data: base64Audio, // Store base64 for persistence
                    mimeType: 'audio/wav'
                };
                
                addAsset(asset);

                // Add to Timeline
                const clip: TimelineClip = {
                    id: `clip_${audioAssetId}`,
                    resourceId: audioAssetId,
                    trackId: analysis.isDialogue ? 'audio_dialogue' : 'audio_sfx',
                    startTime: startTime,
                    duration: estimatedDur,
                    offset: 0,
                    type: 'audio',
                    label: analysis.isDialogue ? "Dialogue" : "SFX"
                };
                addTimelineClip(clip);
            }
        } catch (e) {
            console.error("Audio pipeline failed", e);
        }
    })();

    // --- VIDEO PIPELINE ---
    const videoAssetId = `vid_${baseId}`;
    
    // 1. Create Placeholder Timeline Clip
    // We place a placeholder so the user sees "Generating..." on the timeline immediately
    const ghostClipId = `clip_${videoAssetId}`;
    const ghostClip: TimelineClip = {
        id: ghostClipId,
        resourceId: videoAssetId, // Will match real asset later
        trackId: 'video_main',
        startTime: startTime,
        duration: analysis.duration || 5, // Estimate
        offset: 0,
        type: 'video',
        label: "Generating Video...",
        isLoading: true
    };
    addTimelineClip(ghostClip);

    const videoPromise = (async () => {
        try {
            // A. Generate Concept Image
            const imageUrl = await geminiService.generateConceptArt(analysis.visualPrompt, { aspectRatio: '16:9' });
            
            // B. Generate Video (Using Veo)
            // We need to parse the image URL back to base64 for the video API if it's a data URL
            let inputImage = undefined;
            if (imageUrl.startsWith('data:')) {
                const parts = imageUrl.split(',');
                inputImage = {
                    mimeType: parts[0].match(/:(.*?);/)![1],
                    data: parts[1]
                };
            }

            const videoOp = await geminiService.generateVideo(
                analysis.visualPrompt, 
                inputImage, 
                '16:9', 
                '720p', 
                'fast'
            );

            // C. Poll for completion
            let videoUrl = "";
            let attempts = 0;
            
            while (!videoUrl && attempts < 40) { // Poll for ~2 mins max (3s interval)
                await new Promise(r => setTimeout(r, 3000));
                const status = await geminiService.pollVideoOperation(videoOp.name);
                
                if (status.done) {
                    if (status.response?.generatedVideos?.[0]?.video?.uri) {
                        // Fetch the actual blob to store it (and enable offline/playback)
                        const uri = status.response.generatedVideos[0].video.uri;
                        videoUrl = await geminiService.fetchVideo(uri);
                    } else {
                        throw new Error("Video generation completed but returned no URI.");
                    }
                } else if (status.error) {
                    throw new Error(status.error.message || "Video generation failed.");
                }
                attempts++;
            }

            if (videoUrl) {
                // Generate Proxy for performance
                // Note: In real app, this should be done in a worker to not block UI
                // We'll skip waiting for proxy here for speed of "Rough Cut"
                
                // Create Asset
                const asset: Asset = {
                    id: videoAssetId,
                    type: 'video',
                    name: `Video: ${scriptLine.substring(0, 20)}...`,
                    url: videoUrl,
                    data: '', // Large blob, handled by cache or explicit storage
                    mimeType: 'video/mp4'
                };
                addAsset(asset);

                // Update Timeline Clip (Remove loading state)
                updateTimelineClip(ghostClipId, {
                    isLoading: false,
                    label: "Video Scene"
                });
            } else {
                throw new Error("Video generation timed out.");
            }

        } catch (e) {
            console.error("Video pipeline failed", e);
            updateTimelineClip(ghostClipId, {
                label: "Generation Failed",
                isLoading: false
            });
        }
    })();

    await Promise.all([audioPromise, videoPromise]);
};
