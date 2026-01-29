
import * as geminiService from './geminiService';

interface OutpaintPreparation {
    composite: string; // Base64
    mask: string;      // Base64
    prompt: string;    // Description of the image
}

/**
 * Loads a Blob into an HTMLImageElement
 */
const loadImage = (blob: Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
    });
};

/**
 * Prepares an image for outpainting by placing it on a larger canvas of the target aspect ratio,
 * creating a corresponding mask, and generating a descriptive prompt.
 * 
 * @param imageBlob The source image.
 * @param targetRatio The desired aspect ratio (width / height), e.g. 16/9.
 */
export const prepareOutpaint = async (imageBlob: Blob, targetRatio: number): Promise<OutpaintPreparation> => {
    const img = await loadImage(imageBlob);
    
    // Calculate new dimensions
    // We want to expand, not crop. So the source dimension becomes the constraining factor.
    let newWidth, newHeight;
    const currentRatio = img.width / img.height;

    if (currentRatio > targetRatio) {
        // Source is wider than target (e.g. 21:9 to 16:9) -> Pad Height
        newWidth = img.width;
        newHeight = img.width / targetRatio;
    } else {
        // Source is taller/sqaurer than target (e.g. 1:1 to 16:9) -> Pad Width
        newHeight = img.height;
        newWidth = img.height * targetRatio;
    }

    // Center offsets
    const dx = (newWidth - img.width) / 2;
    const dy = (newHeight - img.height) / 2;

    // 1. Create Composite Canvas (The Input Image)
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = newWidth;
    compositeCanvas.height = newHeight;
    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");

    // Fill background with black (neutral)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, newWidth, newHeight);
    
    // Draw original image centered
    ctx.drawImage(img, dx, dy);
    
    const compositeBase64 = compositeCanvas.toDataURL('image/png').split(',')[1];

    // 2. Create Mask Canvas
    // Logic: White = Generate (Fill), Black = Protect (Original Image)
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = newWidth;
    maskCanvas.height = newHeight;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) throw new Error("Could not get mask context");

    // Fill background White (Area to generate)
    maskCtx.fillStyle = '#FFFFFF';
    maskCtx.fillRect(0, 0, newWidth, newHeight);

    // Draw protected area Black (Center)
    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(dx, dy, img.width, img.height);

    const maskBase64 = maskCanvas.toDataURL('image/png').split(',')[1];

    // 3. Generate Description (Prompt)
    // We need a description of the original image to guide the generation of the surroundings
    const originalBase64 = (await blobToBase64(imageBlob)).split(',')[1];
    const description = await geminiService.describeImage(originalBase64, imageBlob.type);
    
    // Enhance prompt for outpainting context
    const fullPrompt = `High quality, seamless extension of the scene: ${description}. Fill the empty space naturally matching the lighting and texture.`;

    return {
        composite: compositeBase64,
        mask: maskBase64,
        prompt: fullPrompt
    };
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
