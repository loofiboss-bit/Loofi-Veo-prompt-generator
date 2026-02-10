
export const chromaKeyVertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
  }
`;

export const chromaKeyFragmentShader = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform vec3 u_keyColor;
  uniform float u_similarity;
  uniform float u_smoothness;
  uniform float u_spill;
  varying vec2 v_texCoord;

  // Convert RGB to YUV for better color distance calculation
  vec3 rgb2yuv(vec3 rgb) {
      float y = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
      float u = -0.147 * rgb.r - 0.289 * rgb.g + 0.436 * rgb.b;
      float v = 0.615 * rgb.r - 0.515 * rgb.g - 0.100 * rgb.b;
      return vec3(y, u, v);
  }

  // Helper for RGB to HSV
  vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  // Helper for HSV to RGB
  vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
      vec4 color = texture2D(u_image, v_texCoord);
      
      // Calculate distance in RGB space
      float d = distance(color.rgb, u_keyColor);
      
      // Alpha Keying
      // If distance < similarity, alpha is 0.
      // If distance > similarity + smoothness, alpha is 1.
      // Smooth interpolation in between.
      float alpha = smoothstep(u_similarity, u_similarity + u_smoothness, d);
      
      // Spill Removal (Despill)
      // If pixel is close to key color (even if we keep it), desaturate it to remove green fringe.
      if (d < u_similarity + u_smoothness + 0.2) {
          float spillIntensity = (1.0 - alpha) * u_spill;
          vec3 hsv = rgb2hsv(color.rgb);
          hsv.y = max(0.0, hsv.y - spillIntensity); // Reduce saturation
          color.rgb = hsv2rgb(hsv);
      }

      gl_FragColor = vec4(color.rgb, alpha * color.a);
  }
`;

export const initShaderProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram | null => {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  if (!vertexShader || !fragmentShader) return null;

  const shaderProgram = gl.createProgram();
  if (!shaderProgram) return null;

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
};

const loadShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
};
