
import { FilesetResolver, InteractiveSegmenter, RegionOfInterest } from '@mediapipe/tasks-vision';

let segmenter: InteractiveSegmenter | null = null;

const initializeSegmenter = async () => {
    if (segmenter) return segmenter;

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    segmenter = await InteractiveSegmenter.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite",
            delegate: "GPU"
        },
        outputCategoryMask: true,
        outputConfidenceMasks: false
    });

    return segmenter;
};

/**
 * Generates a sequence of binary mask blobs for a video based on click points.
 * 
 * @param videoUrl The source video URL.
 * @param points Array of normalized coordinates {x, y} relative to the video frame.
 * @param onProgress Callback for progress percentage.
 * @returns Array of Blob URLs representing the mask sequence.
 */
export const generateMaskSequence = async (
    videoUrl: string, 
    points: { x: number, y: number }[],
    onProgress?: (percent: number) => void
): Promise<string[]> => {
    
    // 1. Setup Video
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    
    await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(true);
    });

    // 2. Setup AI
    const aiSegmenter = await initializeSegmenter();
    
    // 3. Setup Canvases
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) throw new Error("Canvas context init failed");

    // Prepare Region Of Interest based on clicks
    // MediaPipe Interactive Segmenter usually takes one ROI. We'll use the first point as KeyPoint.
    // Ideally, for multiple points, we'd need a model supporting multi-point or run multiple inferences.
    // 'Magic Touch' model supports a KeyPoint.
    const keypoint: RegionOfInterest = {
        keypoint: { x: points[0].x, y: points[0].y },
        scribble: [] 
    };

    const duration = video.duration;
    // Limit framerate to 12fps for performance/memory optimization in browser
    const fps = 12; 
    const interval = 1 / fps;
    const totalFrames = Math.floor(duration * fps);
    
    const maskUrls: string[] = [];

    // 4. Processing Loop
    for (let i = 0; i < totalFrames; i++) {
        const currentTime = i * interval;
        video.currentTime = currentTime;

        await new Promise<void>(resolve => {
            const onSeek = () => {
                video.removeEventListener('seeked', onSeek);
                resolve();
            };
            video.addEventListener('seeked', onSeek, { once: true });
        });

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0);

        // Segment
        // Note: For video propagation, ideally we use a video segmentation model. 
        // Re-using the same keypoint on every frame assumes the subject doesn't move much relative to frame,
        // or that the model has some temporal consistency (InteractiveSegmenter does not).
        // For a robust "Magic Mask", we re-infer.
        // Optimization: We pass the HTMLVideoElement directly if supported, but canvas is safer for transforms.
        
        let result;
        try {
           result = await aiSegmenter.segment(canvas, keypoint);
        } catch(e) {
            console.warn("Segmentation inference failed at", currentTime, e);
            // Push empty mask or repeat previous
            maskUrls.push(maskUrls.length > 0 ? maskUrls[maskUrls.length-1] : ''); 
            continue;
        }

        // Draw Mask to Canvas
        // The result.categoryMask is a Float32Array or Uint8Array.
        // We need to convert it to a visual B&W mask.
        if (result.categoryMask) {
            const maskData = result.categoryMask.getAsUint8Array();
            const imgData = ctx.createImageData(canvas.width, canvas.height);
            const pixels = imgData.data;

            for (let j = 0; j < maskData.length; j++) {
                const isObject = maskData[j] > 0; // 1 is object, 0 is background
                const offset = j * 4;
                // Create White Object on Transparent Background
                pixels[offset] = 255;     // R
                pixels[offset + 1] = 255; // G
                pixels[offset + 2] = 255; // B
                pixels[offset + 3] = isObject ? 255 : 0; // Alpha
            }
            
            ctx.putImageData(imgData, 0, 0);
            
            // Save as Blob
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                maskUrls.push(URL.createObjectURL(blob));
            } else {
                maskUrls.push('');
            }
        }

        if (onProgress) onProgress(Math.round((i / totalFrames) * 100));
    }

    return maskUrls;
};
