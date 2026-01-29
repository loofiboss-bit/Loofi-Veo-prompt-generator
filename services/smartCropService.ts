
import { pipeline, env } from '@xenova/transformers';

// Configuration for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

// Singleton detector instance
let detector: any = null;

export const loadSmartCropModel = async () => {
    if (!detector) {
        console.log("Loading object detection model...");
        // dethr-resnet-50 is robust for person detection
        detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
    }
    return detector;
};

/**
 * Detects the main subject (person) in a video frame and returns their center X coordinate.
 * @param videoFrame The visual source (Canvas, Image, or ImageBitmap).
 * @returns The normalized X center (0.0 to 1.0) of the subject, or null if none found.
 */
export const calculateSubjectCenter = async (videoFrame: ImageBitmap | HTMLCanvasElement | HTMLImageElement): Promise<number | null> => {
    try {
        const detect = await loadSmartCropModel();
        
        // Run inference
        const output = await detect(videoFrame, { threshold: 0.5, percentage: true });
        
        // 1. Prioritize 'person' class
        const people = output.filter((o: any) => o.label === 'person');
        
        let subject = null;
        
        if (people.length > 0) {
            // Pick the person with the highest confidence score
            subject = people.reduce((prev: any, curr: any) => prev.score > curr.score ? prev : curr);
        } else if (output.length > 0) {
            // Fallback: Pick the largest object if no person found (e.g. car, pet)
            subject = output.reduce((prev: any, curr: any) => {
                const prevArea = (prev.box.xmax - prev.box.xmin) * (prev.box.ymax - prev.box.ymin);
                const currArea = (curr.box.xmax - curr.box.xmin) * (curr.box.ymax - curr.box.ymin);
                return currArea > prevArea ? curr : prev;
            });
        }
        
        if (subject) {
            const { xmin, xmax } = subject.box;
            
            // Calculate center point of the bounding box
            const centerAbsolute = (xmin + xmax) / 2;
            
            // Normalize to 0-1 range based on input width
            // Note: If 'percentage: true' is passed to detect(), output boxes are usually already normalized?
            // Transformers.js documentation says percentage:true returns normalized [0, 1] coordinates.
            // Let's verify assumption: Yes, Xenova/transformers usually returns normalized if requested, 
            // but let's clamp just in case.
            
            // If the box seems to be in pixels (e.g. > 1.0), normalize it manually.
            // videoFrame.width is reliable for Canvas/ImageBitmap.
            if (xmax > 1.0 && 'width' in videoFrame) {
                 return centerAbsolute / videoFrame.width;
            }
            
            return centerAbsolute;
        }
        
        return null;
    } catch (error) {
        console.error("Smart Crop Detection Failed", error);
        return null;
    }
};
