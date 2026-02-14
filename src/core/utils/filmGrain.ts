let noiseCanvas: HTMLCanvasElement | null = null;
let noiseCtx: CanvasRenderingContext2D | null = null;

// Initialize a static noise buffer (1024x1024) to sample from
// This avoids per-frame pixel generation overhead
const initNoise = () => {
  if (noiseCanvas) return;

  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 1024;
  noiseCanvas.height = 1024;
  noiseCtx = noiseCanvas.getContext('2d');

  if (noiseCtx) {
    const idata = noiseCtx.createImageData(1024, 1024);
    const buffer = new Uint32Array(idata.data.buffer);
    const len = buffer.length;

    for (let i = 0; i < len; i++) {
      if (Math.random() < 0.5) {
        // Set pixel to semi-transparent grey noise
        // Alpha varies for texture
        const val = Math.random() * 255;
        // Little-endian order: A B G R
        // We want grayscale noise: R=val, G=val, B=val
        // Alpha can be fixed high, we control blend via globalAlpha later
        // 0xAA = 170 alpha
        buffer[i] = (0xaa << 24) | (val << 16) | (val << 8) | val;
      } else {
        buffer[i] = 0; // Transparent
      }
    }
    noiseCtx.putImageData(idata, 0, 0);
  }
};

/**
 * Draws procedural film grain onto a canvas context.
 * Uses a pre-computed noise texture for performance, drawing it with a random offset each frame.
 *
 * @param ctx The destination canvas context.
 * @param width Width of the destination area.
 * @param height Height of the destination area.
 * @param intensity Strength of the grain (0-1).
 * @param time Current time (used to seed random offset for animation).
 */
export const drawGrain = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  time: number,
) => {
  if (intensity <= 0) return;
  if (!noiseCanvas) initNoise();
  if (!noiseCanvas) return;

  // Save context state
  ctx.save();

  // Set blending mode for grain
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = intensity;

  // Calculate random offset into the noise buffer based on time
  // We create a "jitter" effect by moving the source window around
  const seed = Math.floor(time * 24); // Quantize time to frames (e.g. 24fps)
  const noiseW = noiseCanvas.width;
  const noiseH = noiseCanvas.height;

  // Random offset (pseudo-random based on frame count)
  const _offsetX = (seed * 137) % (noiseW - (width % noiseW));
  const _offsetY = (seed * 293) % (noiseH - (height % noiseH));

  // If destination is smaller than noise buffer, draw direct slice
  // If larger, pattern repeats.
  // For simplicity/perf, we use createPattern which tiles automatically

  // Pattern approach:
  // This tiles the noise canvas across the destination
  // We translate the matrix to animate
  const pattern = ctx.createPattern(noiseCanvas, 'repeat');
  if (pattern) {
    // Translate pattern to animate
    const matrix = new DOMMatrix();
    // Use large random jumps to avoid seeing repetition
    matrix.translateSelf(Math.random() * noiseW, Math.random() * noiseH);
    pattern.setTransform(matrix);

    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
};
