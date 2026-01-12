
/**
 * Extracts the last frame of a video URL as a Base64 image.
 * This allows using the end of one generation as the start of the next (Visual Chaining).
 */
export const extractLastFrame = (videoUrl: string): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        
        // Critical for allowing canvas export of external video sources
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;
        video.muted = true; // Videos must be muted to play programmatically without interaction in some contexts

        video.onloadedmetadata = () => {
            // Seek to nearly the end (last 100ms) to ensure we get a valid frame
            // Seeking exactly to duration sometimes results in black frames depending on encoding
            if (video.duration === Infinity) {
                video.currentTime = 1e101;
                video.ondurationchange = () => {
                    video.currentTime = video.duration - 0.1;
                };
            } else {
                video.currentTime = Math.max(0, video.duration - 0.1);
            }
        };

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Get data URL (default png)
                const dataUrl = canvas.toDataURL('image/png');
                
                // Parse out the base64 data and mime type
                const mimeType = 'image/png';
                const data = dataUrl.split(',')[1];

                // Cleanup
                video.remove();
                
                resolve({ data, mimeType });
            } catch (error) {
                reject(error);
            }
        };

        video.onerror = (e) => {
            reject(new Error(`Failed to load video for frame extraction: ${video.error?.message || 'Unknown error'}`));
        };
    });
};
