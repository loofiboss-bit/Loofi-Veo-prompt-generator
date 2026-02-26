import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Shot, VideoFilters, ChromaKeyConfig, DirectExportFailureReason } from '@core/types';
import Icon from '@shared/components/ui/Icon';

/** Window augmentation for vendor-prefixed APIs */
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}
import FilterControls from '@shared/components/FilterControls';
import ChromaKeyPanel from '@shared/components/ChromaKeyPanel';
import AudioMixer from '@shared/components/AudioMixer';
import VFXPanel from '@shared/components/VFXPanel';
import { useHotkeys } from '@shared/hooks/useHotkeys';
import ExportModal from '@features/export/ExportModal';
import { ExportProfile } from '@core/config/exportProfiles';
import { useAppStore } from '@core/store/useAppStore';
import Timeline from './components/Timeline';
import { useVideoGeneration } from '@shared/hooks/useVideoGeneration';
import {
  chromaKeyVertexShader,
  chromaKeyFragmentShader,
  initShaderProgram,
} from '@core/utils/shaders/chromaKey';
import InspectorPanel from '@shared/components/InspectorPanel';
import {
  createSpatialPanner,
  updateSpatialPanner,
  getFrequencyEnergy,
} from '@core/services/audioAnalysisService';
import { calculateCameraTransform } from '@core/utils/cameraPhysics';
import { logger } from '@core/services/loggerService';
import HistoryControls from '@features/history/HistoryControls';
import { getEasedValue } from '@core/utils/easing';
import { applyFilmEmulation } from '@core/services/effectPipeline';
import {
  directExportToResolve,
  getResolveDirectExportReadiness,
} from '@core/services/nleDirectExportService';

interface TimelinePlayerProps {
  shots: Shot[];
  onClose: () => void;
  bgMusicUrl?: string | null;
  ambienceUrl?: string | null;
}

const DEFAULT_CHROMA_CONFIG: ChromaKeyConfig = {
  enabled: false,
  color: '#00FF00',
  similarity: 0.4,
  smoothness: 0.1,
  spill: 0.1,
};

// Memory audit (Task 2.6): No URL.createObjectURL calls exist in this component.
// bgMusicUrl and ambienceUrl are received as props (owned by StoryBoard, which
// handles blob revocation via its own useEffect cleanup).
const TimelinePlayer: React.FC<TimelinePlayerProps> = ({
  shots,
  onClose,
  bgMusicUrl,
  ambienceUrl,
}) => {
  // Filter shots to only include those with videos
  const playlist = React.useMemo(() => shots.filter((s) => s.generatedVideoUrl), [shots]);

  // Access Store with flattened timeline properties
  const {
    tracks,
    clips,
    zoomLevel,
    currentTime,
    setCurrentTime,
    syncTimelineFromShots,
    updateTimelineClip,
    updateShot,
  } = useAppStore();

  const { startGeneration } = useVideoGeneration(() => {});

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [useProxy, setUseProxy] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [exportError, setExportError] = useState<string | undefined>(undefined);
  const [exportErrorReason, setExportErrorReason] = useState<DirectExportFailureReason | undefined>(
    undefined,
  );
  const [exportErrorRetryable, setExportErrorRetryable] = useState<boolean | undefined>(undefined);
  const [showExportModal, setShowExportModal] = useState(false);
  const [directExportEnabled, setDirectExportEnabled] = useState(true);
  const [directExportHint, setDirectExportHint] = useState<string | undefined>(undefined);

  // Tools State
  const [showFilters, setShowFilters] = useState(false);
  const [showChromaKey, setShowChromaKey] = useState(false);
  const [showMixer, setShowMixer] = useState(false);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [showVFX, setShowVFX] = useState(false); // New state for VFX panel

  const [filters, setFilters] = useState<VideoFilters>({
    contrast: 100,
    saturation: 100,
    brightness: 100,
    hueRotate: 0,
    sepia: 0,
    grain: 0,
    vfxType: 'none',
    vfxIntensity: 50,
    filmConfig: {
      enabled: false,
      preset: 'custom',
      grainIntensity: 0,
      halationIntensity: 0,
      jitterIntensity: 0,
    },
  });

  const [audioMix, setAudioMix] = useState({ dialogue: 1.0, sfx: 1.0, music: 0.5, ambience: 0.15 });
  const [autoDuck, setAutoDuck] = useState(true);

  const isRecording = false;
  const countdown = null;
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(true);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vfxCanvasRef = useRef<HTMLCanvasElement>(null); // New canvas for film effects
  const musicRef = useRef<HTMLAudioElement>(null);
  const ambienceRef = useRef<HTMLAudioElement>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const pannerNodeRef = useRef<PannerNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const musicSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const musicAnalyserRef = useRef<AnalyserNode | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const webglContextRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);

  const lastTimeRef = useRef<number>(0);
  const seekTargetRef = useRef<number | null>(null);

  const totalDuration = playlist.reduce((acc, shot) => acc + (shot.duration || 5), 0);
  const currentShot = playlist[currentIndex];

  const highResSrc =
    currentShot?.takes &&
    typeof currentShot?.selectedTakeIndex === 'number' &&
    currentShot.takes[currentShot.selectedTakeIndex]
      ? currentShot.takes[currentShot.selectedTakeIndex]
      : currentShot?.generatedVideoUrl;

  const activeVideoSrc =
    useProxy && currentShot?.proxyVideoUrl ? currentShot.proxyVideoUrl : highResSrc;

  const isUsingProxy = useProxy && !!currentShot?.proxyVideoUrl;

  const effectiveChromaConfig = useMemo(() => {
    const config = currentShot?.chromaKey || DEFAULT_CHROMA_CONFIG;
    const isLegacy = currentShot?.isGreenScreen && !currentShot.chromaKey;
    return isLegacy ? { ...DEFAULT_CHROMA_CONFIG, enabled: true } : config;
  }, [currentShot?.chromaKey, currentShot?.isGreenScreen]);

  const bgUrl = currentShot?.backgroundLayerUrl;

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  useEffect(() => {
    syncTimelineFromShots();
  }, [playlist.length, syncTimelineFromShots]);

  // ... (Keep existing WebGL and Audio Context setup useEffects) ...

  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    audioContextRef.current = ctx;
    return () => {
      ctx.close();
    };
  }, []);

  useEffect(() => {
    const ctx = audioContextRef.current;
    const audioEl = musicRef.current;

    if (ctx && audioEl && !musicSourceNodeRef.current) {
      try {
        const source = ctx.createMediaElementSource(audioEl);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        musicSourceNodeRef.current = source;
        musicAnalyserRef.current = analyser;
      } catch (e) {
        logger.warn('MediaElementSource creation failed', e);
      }
    }
  }, [bgMusicUrl]);

  // Audio Playback
  const playDialogueAudio = async () => {
    if (!currentShot?.audioUrl || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {}
    }

    try {
      const response = await fetch(currentShot.audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = Math.min(1, (currentShot.audioVolume ?? 1.0) * audioMix.dialogue);
      gainNodeRef.current = gainNode;

      const timelineClip = clips.find((c) => c.id === `audio_${currentShot.id}`);
      const panning = timelineClip?.panning || { x: 0, z: 0 };
      const panner = createSpatialPanner(ctx, panning.x, panning.z);
      pannerNodeRef.current = panner;

      source.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(ctx.destination);
      source.start(0);
      audioSourceRef.current = source;
    } catch (e) {
      logger.error('Audio playback error', e);
    }
  };

  useEffect(() => {
    if (pannerNodeRef.current && selectedClip && selectedClip.id === `audio_${currentShot?.id}`) {
      const { x, z } = selectedClip.panning || { x: 0, z: 0 };
      updateSpatialPanner(pannerNodeRef.current, x, z);
    }
  }, [selectedClip, selectedClip?.panning, currentShot?.id]);

  const togglePlay = () => {
    if (isRecording || countdown !== null || isPickingColor) return;
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        bgVideoRef.current?.pause();
        if (audioContextRef.current && audioContextRef.current.state === 'running') {
          audioContextRef.current.suspend();
        }
        musicRef.current?.pause();
        ambienceRef.current?.pause();
      } else {
        videoRef.current.play();
        bgVideoRef.current?.play();
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        } else if (!audioSourceRef.current) {
          playDialogueAudio();
        }
        musicRef.current?.play().catch((e) => logger.warn('Music play blocked', e));
        ambienceRef.current?.play().catch((e) => logger.warn('Ambience play blocked', e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const nextClip = () => {
    if (currentIndex < playlist.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const prevClip = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleGlobalSeek = (globalTime: number) => {
    let accum = 0;
    let targetIndex = 0;
    let localTime = 0;

    for (let i = 0; i < playlist.length; i++) {
      const dur = playlist[i].duration || 5;
      if (globalTime < accum + dur) {
        targetIndex = i;
        localTime = globalTime - accum;
        break;
      }
      accum += dur;
    }

    if (globalTime >= accum && playlist.length > 0) {
      targetIndex = playlist.length - 1;
      localTime = playlist[targetIndex].duration || 5;
    }

    if (targetIndex !== currentIndex) {
      seekTargetRef.current = localTime;
      setCurrentIndex(targetIndex);
    } else if (videoRef.current) {
      videoRef.current.currentTime = localTime;
    }

    setCurrentTime(globalTime);
  };

  useEffect(() => {
    if (seekTargetRef.current !== null && videoRef.current) {
      try {
        videoRef.current.currentTime = seekTargetRef.current;
      } catch {
        /* ignore */
      }
      seekTargetRef.current = null;
    }
  }, [activeVideoSrc]);

  useHotkeys({
    SPACE: togglePlay,
    ARROWLEFT: prevClip,
    ARROWRIGHT: nextClip,
    ESC: () => {
      if (isPickingColor) setIsPickingColor(false);
      else onClose();
    },
  });

  // ... (Keep WebGL rendering logic) ...
  const initWebGL = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) return;
    webglContextRef.current = gl;
    const program = initShaderProgram(gl, chromaKeyVertexShader, chromaKeyFragmentShader);
    if (!program) return;
    programRef.current = program;

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]),
      gl.STATIC_DRAW,
    );
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
  };

  const hexToRGB = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  };

  const renderFrame = useCallback(() => {
    const gl = webglContextRef.current;
    const video = videoRef.current;
    const program = programRef.current;
    const vfxCanvas = vfxCanvasRef.current;

    // Find current video clip in timeline store
    const currentClip = currentShot
      ? clips.find((c) => c.resourceId === currentShot.id && c.type === 'video')
      : null;

    if (video && currentClip) {
      let reactiveTransform = '';
      if (musicAnalyserRef.current && currentClip.reactivity) {
        const { frequencyRange, sensitivity, targetProperty } = currentClip.reactivity;
        const energy = getFrequencyEnergy(musicAnalyserRef.current, frequencyRange);
        const modifier = energy * sensitivity;
        if (targetProperty === 'scale') {
          reactiveTransform = `scale(${1 + modifier})`;
        } else if (targetProperty === 'brightness') {
          video.style.filter = `brightness(${filters.brightness + modifier * 50}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) hue-rotate(${filters.hueRotate}deg)`;
        }
      } else {
        video.style.filter = `contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) brightness(${filters.brightness}%) hue-rotate(${filters.hueRotate}deg)`;
      }

      let cameraTransform = '';
      if (currentClip.cameraEffect && currentClip.cameraEffect.type !== 'static') {
        cameraTransform = calculateCameraTransform(
          currentClip.cameraEffect,
          video.currentTime,
          currentClip.duration,
        );
      }

      let motionTransform = '';
      if (currentShot?.motionConfig) {
        const { start, end, ease } = currentShot.motionConfig;
        const clipProgress = Math.max(0, Math.min(1, video.currentTime / currentClip.duration));
        const t = getEasedValue(clipProgress, ease || 'linear');

        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const currentZoom = lerp(start.zoom, end.zoom, t);
        const currentX = lerp(start.x, end.x, t);
        const currentY = lerp(start.y, end.y, t);

        const translateX = (0.5 - currentX) * 100;
        const translateY = (0.5 - currentY) * 100;

        motionTransform = `scale(${currentZoom}) translate(${translateX}%, ${translateY}%)`;
      } else {
        const baseScale = (currentClip.transform?.scale || 100) / 100;
        motionTransform = `scale(${baseScale})`;
      }

      video.style.transform = `${motionTransform} ${cameraTransform} ${reactiveTransform}`;
    }

    // WebGL Chroma Key Render
    if (effectiveChromaConfig.enabled && gl && video && program && video.readyState >= 2) {
      if (gl.canvas.width !== video.videoWidth || gl.canvas.height !== video.videoHeight) {
        gl.canvas.width = video.videoWidth;
        gl.canvas.height = video.videoHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      }
      gl.useProgram(program);
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      const keyColor = hexToRGB(effectiveChromaConfig.color);
      gl.uniform3fv(gl.getUniformLocation(program, 'u_keyColor'), keyColor);
      gl.uniform1f(
        gl.getUniformLocation(program, 'u_similarity'),
        effectiveChromaConfig.similarity,
      );
      gl.uniform1f(
        gl.getUniformLocation(program, 'u_smoothness'),
        effectiveChromaConfig.smoothness,
      );
      gl.uniform1f(gl.getUniformLocation(program, 'u_spill'), effectiveChromaConfig.spill);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Film Emulation Render (VFX Canvas)
    if (filters.filmConfig?.enabled && vfxCanvas && video) {
      const ctx = vfxCanvas.getContext('2d');
      if (ctx) {
        // Resize if needed
        if (vfxCanvas.width !== video.clientWidth || vfxCanvas.height !== video.clientHeight) {
          vfxCanvas.width = video.clientWidth;
          vfxCanvas.height = video.clientHeight;
        }

        ctx.clearRect(0, 0, vfxCanvas.width, vfxCanvas.height);
        // We pass undefined as sourceCanvas for halation in preview to avoid heavy readback
        // Unless we really want it. For grain/jitter, no source needed.
        applyFilmEmulation(
          ctx,
          vfxCanvas.width,
          vfxCanvas.height,
          filters.filmConfig,
          video.currentTime,
        );
      }
    } else if (vfxCanvas) {
      // Clear if disabled
      const ctx = vfxCanvas.getContext('2d');
      ctx?.clearRect(0, 0, vfxCanvas.width, vfxCanvas.height);
    }

    if (isPlaying || isPickingColor) {
      rafIdRef.current = requestAnimationFrame(renderFrame);
    }
  }, [isPlaying, effectiveChromaConfig, isPickingColor, currentShot, clips, filters]);

  useEffect(() => {
    if (effectiveChromaConfig.enabled && !webglContextRef.current) initWebGL();
    if (isPlaying || isPickingColor) rafIdRef.current = requestAnimationFrame(renderFrame);
    else if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [
    effectiveChromaConfig.enabled,
    isPlaying,
    currentIndex,
    activeVideoSrc,
    renderFrame,
    isPickingColor,
  ]);

  const handleChromaConfigChange = (newConfig: ChromaKeyConfig) => {
    if (currentShot) {
      updateShot(currentShot.id, 'chromaKey', newConfig);
      if (currentShot.isGreenScreen) updateShot(currentShot.id, 'isGreenScreen', false);
    }
  };

  const handlePickColor = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new window.EyeDropper!();
        const result = await eyeDropper.open();
        handleChromaConfigChange({ ...effectiveChromaConfig, color: result.sRGBHex });
      } catch {}
    } else {
      setIsPickingColor(true);
      setIsPlaying(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPickingColor || !webglContextRef.current) {
      togglePlay();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const gl = webglContextRef.current;
    const pixels = new Uint8Array(4);
    gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const hex =
      '#' + [pixels[0], pixels[1], pixels[2]].map((x) => x.toString(16).padStart(2, '0')).join('');
    handleChromaConfigChange({ ...effectiveChromaConfig, color: hex.toUpperCase() });
    setIsPickingColor(false);
  };

  useEffect(() => {
    lastTimeRef.current = 0;
    setIsPlaying(true);
    if (currentShot) playDialogueAudio();
    if (musicRef.current && isPlaying && bgMusicUrl) musicRef.current.play().catch(() => {});
    if (ambienceRef.current && isPlaying && ambienceUrl) {
      ambienceRef.current.volume = audioMix.ambience;
      ambienceRef.current.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally fires only on clip navigation; adding playDialogueAudio, isPlaying, audioMix, etc. would restart playback on unrelated state changes
  }, [currentIndex, playlist]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      let globalTime = 0;
      for (let i = 0; i < currentIndex; i++) globalTime += playlist[i].duration || 5;
      globalTime += time;

      // Sync via Action to store
      setCurrentTime(globalTime);

      if (bgVideoRef.current && Math.abs(bgVideoRef.current.currentTime - time) > 0.5) {
        bgVideoRef.current.currentTime = time;
      }
      if (musicRef.current && !musicRef.current.muted) {
        const voiceIsActive = audioSourceRef.current && currentShot.audioUrl;
        const duckingMultiplier = autoDuck && voiceIsActive ? 0.3 : 1.0;
        const targetVolume = Math.min(1, audioMix.music * duckingMultiplier);
        if (Math.abs(musicRef.current.volume - targetVolume) > 0.01) {
          musicRef.current.volume += (targetVolume - musicRef.current.volume) * 0.05;
        }
      }
      lastTimeRef.current = time;
    }
  };

  const handleEnded = () => {
    if (currentIndex < playlist.length - 1) setCurrentIndex(currentIndex + 1);
    else setIsPlaying(false);
  };

  const handleConfirmExport = async (
    profile: ExportProfile,
    options?: { includeWaveform?: boolean; directExport?: boolean },
  ) => {
    const includeWaveform = options?.includeWaveform ?? false;
    const directExport = options?.directExport ?? false;

    setExportError(undefined);
    setExportErrorReason(undefined);
    setExportErrorRetryable(undefined);

    if (!directExport) {
      logger.info(
        `[TimelinePlayer] Standard export selected (profile=${profile.id}, includeWaveform=${String(includeWaveform)})`,
      );
      setShowExportModal(false);
      return;
    }

    if (!directExportEnabled) {
      setExportErrorReason('unsupported_environment');
      setExportErrorRetryable(false);
      setExportError(
        directExportHint ?? 'Direct Export is currently unavailable. Use file export.',
      );
      return;
    }

    setIsExporting(true);
    setExportStatus('Checking DaVinci Resolve bridge...');

    const result = await directExportToResolve({
      timelineName: 'NLE Timeline',
      profile: {
        id: profile.id,
        label: profile.label,
        container: profile.container,
      },
      includeWaveform,
      clipCount: playlist.length,
      totalDurationSeconds: totalDuration,
      createdAt: Date.now(),
    });

    if (result.success) {
      setExportStatus(result.message);
      setTimeout(() => {
        setIsExporting(false);
        setExportStatus('');
        setShowExportModal(false);
      }, 400);
      return;
    }

    setIsExporting(false);
    setExportStatus('');
    setExportError(result.message);
    setExportErrorReason(result.reason);
    setExportErrorRetryable(result.retryable);

    if (result.retryable === false) {
      setDirectExportEnabled(false);
      setDirectExportHint(result.message);
    }
  };

  const handleOpenExportModal = async () => {
    setExportError(undefined);
    setExportErrorReason(undefined);
    setExportErrorRetryable(undefined);
    setDirectExportHint(undefined);
    setDirectExportEnabled(true);

    const readiness = await getResolveDirectExportReadiness();
    if (!readiness.ready) {
      setDirectExportEnabled(false);
      setDirectExportHint(readiness.message);
    }

    setShowExportModal(true);
  };

  const videoStyle = {
    filter: `contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) brightness(${filters.brightness}%) hue-rotate(${filters.hueRotate}deg)`,
  };

  if (playlist.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in-up">
      {bgMusicUrl && <audio ref={musicRef} src={bgMusicUrl} loop crossOrigin="anonymous" />}
      {ambienceUrl && <audio ref={ambienceRef} src={ambienceUrl} loop />}

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none h-20">
        <div className="pointer-events-auto">
          <h2 className="text-white font-bold text-lg drop-shadow-md">NLE Timeline</h2>
          <p className="text-slate-300 text-xs drop-shadow-md">
            Clip {currentIndex + 1} of {playlist.length}
          </p>
        </div>
        <div className="flex gap-3 pointer-events-auto">
          <HistoryControls />

          <button
            onClick={() => setUseProxy(!useProxy)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              useProxy
                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                : 'bg-slate-800/50 border-slate-600 text-slate-400'
            }`}
            title="Use low-res proxies"
          >
            <Icon name="activity" className="w-3 h-3" />
            <span>{useProxy ? 'Proxy ON' : 'Proxy OFF'}</span>
          </button>

          <button
            onClick={handleOpenExportModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-full text-xs shadow-lg"
          >
            <Icon name="download" className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
          >
            <Icon name="cancel" className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Panels */}
      {showFilters && (
        <div className="absolute top-24 right-4 z-30 animate-fade-in-up origin-top-right">
          <FilterControls
            filters={filters}
            onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
            onReset={() =>
              setFilters({
                contrast: 100,
                saturation: 100,
                brightness: 100,
                hueRotate: 0,
                sepia: 0,
                grain: 0,
                vfxType: 'none',
                vfxIntensity: 50,
              })
            }
          />
        </div>
      )}
      {showVFX && (
        <div className="absolute top-24 right-4 z-30 animate-fade-in-up origin-top-right">
          <VFXPanel
            filters={filters}
            onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
            onReset={() =>
              setFilters((p) => ({
                ...p,
                vfxType: 'none',
                filmConfig: {
                  enabled: false,
                  preset: 'custom',
                  grainIntensity: 0,
                  halationIntensity: 0,
                  jitterIntensity: 0,
                },
              }))
            }
          />
        </div>
      )}
      {showChromaKey && (
        <div className="absolute top-24 right-4 z-30 animate-fade-in-up origin-top-right">
          <ChromaKeyPanel
            config={effectiveChromaConfig}
            onChange={handleChromaConfigChange}
            onReset={() => handleChromaConfigChange(DEFAULT_CHROMA_CONFIG)}
            onPickColor={handlePickColor}
            isPicking={isPickingColor}
          />
        </div>
      )}
      {showMixer && (
        <div className="absolute bottom-[40%] right-4 z-40">
          <AudioMixer
            volumes={audioMix}
            autoDuck={autoDuck}
            onChange={(k, v) => setAudioMix((p) => ({ ...p, [k]: v }))}
            onAutoDuckChange={setAutoDuck}
            onReset={() => setAudioMix({ dialogue: 1, sfx: 1, music: 0.5, ambience: 0.15 })}
          />
        </div>
      )}

      {/* Player View */}
      <div className="flex-grow flex h-[60%] border-b border-slate-800 bg-slate-920 overflow-hidden">
        <div className="flex-grow relative flex items-center justify-center bg-black">
          <div className="relative max-h-full max-w-full aspect-video shadow-2xl flex items-center justify-center w-full h-full">
            {effectiveChromaConfig.enabled && bgUrl && (
              <video
                ref={bgVideoRef}
                src={bgUrl}
                className="absolute inset-0 w-full h-full object-contain -z-10"
                muted
                loop
                style={videoStyle}
              />
            )}
            <video
              key={activeVideoSrc}
              ref={videoRef}
              src={activeVideoSrc}
              className={
                effectiveChromaConfig.enabled ? 'hidden' : 'max-h-full max-w-full block h-full'
              }
              style={videoStyle}
              autoPlay
              onEnded={handleEnded}
              onTimeUpdate={handleTimeUpdate}
              onClick={togglePlay}
              muted={!!currentShot.audioUrl}
              crossOrigin="anonymous"
            />
            {/* VFX Overlay Canvas */}
            <canvas
              ref={vfxCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {isUsingProxy && (
              <div className="absolute top-24 left-4 z-10 bg-yellow-500/80 text-black font-bold px-2 py-1 rounded text-[10px] shadow pointer-events-none backdrop-blur-sm border border-yellow-400/50">
                SD PROXY
              </div>
            )}
            <canvas
              ref={canvasRef}
              className={`${effectiveChromaConfig.enabled ? 'block' : 'hidden'} max-h-full max-w-full h-full ${isPickingColor ? 'cursor-crosshair' : 'cursor-pointer'}`}
              style={videoStyle}
              onClick={handleCanvasClick}
            />
            {isPickingColor && (
              <div className="absolute top-4 bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/20 animate-pulse pointer-events-none">
                Click background to key out
              </div>
            )}
            {!isPlaying && !isPickingColor && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-10">
                <div className="p-4 bg-white/10 rounded-full backdrop-blur-md">
                  <Icon name="play" className="w-12 h-12 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
        {showInspector && selectedClip && (
          <InspectorPanel
            selectedClip={selectedClip}
            onUpdate={updateTimelineClip}
            currentTime={currentTime}
          />
        )}
      </div>

      {/* Timeline Area */}
      <div className="h-[40%] bg-slate-900 border-t border-slate-800 flex flex-col z-20 relative">
        <div className="h-10 bg-slate-850 flex items-center px-4 border-b border-slate-700 justify-between">
          <div className="flex gap-2">
            <button onClick={togglePlay} className="text-white hover:text-cyan-400">
              <Icon name={isPlaying ? 'spinner' : 'play'} className="w-5 h-5" />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1"></div>
            <button onClick={prevClip} className="text-slate-400 hover:text-white">
              <Icon name="chevron-down" className="w-5 h-5 rotate-90" />
            </button>
            <button onClick={nextClip} className="text-slate-400 hover:text-white">
              <Icon name="chevron-down" className="w-5 h-5 -rotate-90" />
            </button>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowInspector(!showInspector)}
              className={`text-xs flex gap-1 ${showInspector ? 'text-cyan-400' : 'text-slate-400'}`}
            >
              <Icon name="edit" className="w-4 h-4" /> Properties
            </button>
            <button
              onClick={() => {
                setShowFilters(!showFilters);
                setShowChromaKey(false);
                setShowMixer(false);
                setShowVFX(false);
              }}
              className={`text-xs flex gap-1 ${showFilters ? 'text-cyan-400' : 'text-slate-400'}`}
            >
              <Icon name="sliders" className="w-4 h-4" /> Color
            </button>
            <button
              onClick={() => {
                setShowVFX(!showVFX);
                setShowFilters(false);
                setShowChromaKey(false);
                setShowMixer(false);
              }}
              className={`text-xs flex gap-1 ${showVFX ? 'text-fuchsia-400' : 'text-slate-400'}`}
            >
              <Icon name="magic" className="w-4 h-4" /> VFX / Film
            </button>
            <button
              onClick={() => {
                setShowChromaKey(!showChromaKey);
                setShowFilters(false);
                setShowMixer(false);
                setShowVFX(false);
              }}
              className={`text-xs flex gap-1 ${showChromaKey ? 'text-green-400' : 'text-slate-400'}`}
            >
              <Icon name="layers" className="w-4 h-4" /> Green Screen
            </button>
            <button
              onClick={() => {
                setShowMixer(!showMixer);
                setShowFilters(false);
                setShowChromaKey(false);
                setShowVFX(false);
              }}
              className={`text-xs flex gap-1 ${showMixer ? 'text-purple-400' : 'text-slate-400'}`}
            >
              <Icon name="audio" className="w-4 h-4" /> Mixer
            </button>
          </div>
        </div>

        <Timeline
          timelineState={{ tracks, clips, zoomLevel, currentTime }}
          onClipUpdate={updateTimelineClip}
          onSeek={handleGlobalSeek}
          duration={totalDuration}
          startVideoGeneration={startGeneration}
          onSelectClip={(clip) => setSelectedClipId(clip?.id ?? null)}
          selectedClipId={selectedClipId}
        />
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => {
          setExportError(undefined);
          setExportErrorReason(undefined);
          setExportErrorRetryable(undefined);
          setShowExportModal(false);
        }}
        onConfirm={handleConfirmExport}
        totalDuration={totalDuration}
        isProcessing={isExporting}
        processingStatus={exportStatus}
        errorMessage={exportError}
        errorReason={exportErrorReason}
        errorRetryable={exportErrorRetryable}
        directExportEnabled={directExportEnabled}
        directExportHint={directExportHint}
      />
    </div>
  );
};

export default TimelinePlayer;
