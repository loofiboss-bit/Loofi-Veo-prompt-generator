import { logger } from './loggerService';

/** Detection result from object detection pipeline */
interface DetectionResult {
  label: string;
  score: number;
  box: { xmin: number; xmax: number; ymin: number; ymax: number };
}

/** Object detection pipeline callable */
type DetectorPipeline = (
  input: ImageBitmap | HTMLCanvasElement | HTMLImageElement,
  options: { threshold: number; percentage: boolean },
) => Promise<DetectionResult[]>;

// Singleton detector instance
let detector: DetectorPipeline | null = null;

export const loadSmartCropModel = async () => {
  if (!detector) {
    const { pipeline, env } = await import('@huggingface/transformers');
    // Configuration for browser environment
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    logger.info('Loading object detection model...');
    // dethr-resnet-50 is robust for person detection
    detector = (await pipeline(
      'object-detection',
      'Xenova/detr-resnet-50',
    )) as unknown as DetectorPipeline;
  }
  return detector;
};

/**
 * Detects the main subject (person) in a video frame and returns their center X coordinate.
 * @param videoFrame The visual source (Canvas, Image, or ImageBitmap).
 * @returns The normalized X center (0.0 to 1.0) of the subject, or null if none found.
 */
export const calculateSubjectCenter = async (
  videoFrame: ImageBitmap | HTMLCanvasElement | HTMLImageElement,
): Promise<number | null> => {
  try {
    const detect = await loadSmartCropModel();

    // Run inference
    const output = await detect(videoFrame, { threshold: 0.5, percentage: true });

    // 1. Prioritize 'person' class
    const people = output.filter((o) => o.label === 'person');

    let subject: DetectionResult | null = null;

    if (people.length > 0) {
      // Pick the person with the highest confidence score
      subject = people.reduce((prev, curr) => (prev.score > curr.score ? prev : curr));
    } else if (output.length > 0) {
      // Fallback: Pick the largest object if no person found (e.g. car, pet)
      subject = output.reduce((prev, curr) => {
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
      // Transformers.js returns normalized detections when requested,
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
    logger.error('Smart Crop Detection Failed', error);
    return null;
  }
};
