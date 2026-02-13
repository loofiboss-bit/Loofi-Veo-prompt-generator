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
          reject(new Error('Could not get canvas context'));
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
      reject(
        new Error(
          `Failed to load video for frame extraction: ${video.error?.message || 'Unknown error'}`,
        ),
      );
    };
  });
};

/**
 * Extracts the first frame of a video URL as a Base64 image.
 */
export const extractFirstFrame = (
  videoUrl: string,
): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;

    video.onloadeddata = () => {
      video.currentTime = 0;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const mimeType = 'image/png';
        const data = dataUrl.split(',')[1];

        video.remove();
        resolve({ data, mimeType });
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => reject(new Error('Failed to load video'));
  });
};

/**
 * Extracts frames from a video URL at a specific interval (e.g., 1 frame per second).
 * @param videoUrl The URL of the video.
 * @param intervalSeconds Interval in seconds between frames (default 1s).
 * @returns Promise<string[]> Array of base64 image strings.
 */
export const extractFramesFromVideo = (
  videoUrl: string,
  intervalSeconds: number = 1.0,
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    const frames: string[] = [];
    let currentTime = 0;
    let duration = 0;

    video.onloadedmetadata = () => {
      duration = video.duration;
      video.currentTime = 0;
    };

    video.onseeked = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth / 2; // Resize for API efficiency (960x540 is usually enough for analysis)
        canvas.height = video.videoHeight / 2;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // JPEG compression for size
          frames.push(dataUrl.split(',')[1]);
        }

        currentTime += intervalSeconds;
        if (currentTime < duration) {
          video.currentTime = currentTime;
        } else {
          video.remove();
          resolve(frames);
        }
      } catch (e) {
        reject(e);
      }
    };

    video.onerror = (e) => reject(new Error(`Video load error: ${video.error?.message}`));
  });
};

/**
 * Extracts a specific frame as raw ImageData for pixel analysis.
 */
export const extractFrameImageData = (
  videoUrl: string,
  timeOffset: number = 0,
): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;

    video.onloadedmetadata = () => {
      video.currentTime = timeOffset;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      // Small resolution is sufficient for color grading stats and faster
      canvas.width = 128;
      canvas.height = 72;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No canvas ctx'));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      video.remove();
      resolve(data);
    };

    video.onerror = () => reject(new Error('Video load failed'));
  });
};
