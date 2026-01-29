

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shot, VideoFilters, CropConfig, TextOverlay, ColorGradeParams, MotionConfig, VisualizerConfig, ClipTransition, ChromaKeyConfig } from '../types';
import Icon from './Icon';
import { stitchVideos, transcodeVideo, renderAudioVisualizer } from '../services/videoEditorService';
import FilterControls from './FilterControls';
import ChromaKeyPanel from './ChromaKeyPanel';
import AudioMixer from './AudioMixer';
import VFXPanel from './VFXPanel';
import { useHotkeys } from '../hooks/useHotkeys';
import SocialCropModal from './SocialCropModal';
import ExportModal from './ExportModal';
import { ExportProfile } from '../config/exportProfiles';
import { useAppStore } from '../store/useAppStore';
import { generateFCPXML } from '../utils/xmlExport';
import JSZip from 'jszip';
import AmbienceStudio from './AmbienceStudio';
import Timeline from './Timeline/Timeline'; 
import { fetchFile } from '@ffmpeg/util';
import { useVideoGeneration } from '../hooks/useVideoGeneration';
import { chromaKeyVertexShader, chromaKeyFragmentShader, initShaderProgram } from '../utils/shaders/chromaKey';
import InspectorPanel from './InspectorPanel';
import { createSpatialPanner, updateSpatialPanner, getFrequencyEnergy } from '../services/audioAnalysisService';
import { decode, decodeAudioData } from '../utils/audio';
import { calculateCameraTransform } from '../utils/cameraPhysics';

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
    spill: 0.1
};

const TimelinePlayer: React.FC<TimelinePlayerProps> = ({ shots, onClose, bgMusicUrl, ambienceUrl }) => {
    // Filter shots to only include those with videos
    const playlist = React.useMemo(() => shots.filter(s => s.generatedVideoUrl), [shots]);
    
    const { sbTimeline, syncTimelineFromShots, updateTimelineClip, addAsset, addTimelineClip, updateShot } = useAppStore();
    const { startGeneration } = useVideoGeneration({}, () => {}); 

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [useProxy, setUseProxy] = useState(true); // Default to ON for performance
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState('');
    const [showExportModal, setShowExportModal] = useState(false);

    // Tools State
    const [showFilters, setShowFilters] = useState(false);
    const [showChromaKey, setShowChromaKey] = useState(false);
    const [showMixer, setShowMixer] = useState(false);
    const [isPickingColor, setIsPickingColor] = useState(false);

    const [filters, setFilters] = useState<VideoFilters>({
        contrast: 100,
        saturation: 100,
        brightness: 100,
        hueRotate: 0,
        sepia: 0,
        grain: 0,
        vfxType: 'none',
        vfxIntensity: 50
    });
    
    const [audioMix, setAudioMix] = useState({ dialogue: 1.0, sfx: 1.0, music: 0.5, ambience: 0.15 });
    const [autoDuck, setAutoDuck] = useState(true);
    
    const [isRecording, setIsRecording] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [muteForDubbing, setMuteForDubbing] = useState(true);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number>(0);

    const [activeOverlays, setActiveOverlays] = useState<TextOverlay[]>([]);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [showInspector, setShowInspector] = useState(true);
    
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const bgVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const musicRef = useRef<HTMLAudioElement>(null);
    const ambienceRef = useRef<HTMLAudioElement>(null); 
    
    // Advanced Audio Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null); // For dialogue primarily
    const pannerNodeRef = useRef<PannerNode | null>(null); // Spatial panner for current clip
    const gainNodeRef = useRef<GainNode | null>(null);
    
    // Music Analysis Ref
    const musicSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const musicAnalyserRef = useRef<AnalyserNode | null>(null);

    const rafIdRef = useRef<number | null>(null);
    const webglContextRef = useRef<WebGLRenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const textureRef = useRef<WebGLTexture | null>(null);

    // FIX: Added missing refs
    const lastTimeRef = useRef<number>(0);
    const seekTargetRef = useRef<number | null>(null);

    const totalDuration = playlist.reduce((acc, shot) => acc + (shot.duration || 5), 0);
    const currentShot = playlist[currentIndex];
    
    // --- SMART PROXY LOGIC ---
    // Determine which URL to load based on proxy setting and availability
    const highResSrc = (currentShot?.takes && typeof currentShot?.selectedTakeIndex === 'number' && currentShot.takes[currentShot.selectedTakeIndex]) 
        ? currentShot.takes[currentShot.selectedTakeIndex] 
        : currentShot?.generatedVideoUrl;

    const activeVideoSrc = (useProxy && currentShot?.proxyVideoUrl) 
        ? currentShot.proxyVideoUrl 
        : highResSrc;
    
    const isUsingProxy = useProxy && !!currentShot?.proxyVideoUrl;

    const chromaConfig = currentShot?.chromaKey || DEFAULT_CHROMA_CONFIG;
    // Backward compatibility for old shots using isGreenScreen boolean
    const isLegacyGreenScreen = currentShot?.isGreenScreen && !currentShot.chromaKey;
    const effectiveChromaConfig = isLegacyGreenScreen 
        ? { ...DEFAULT_CHROMA_CONFIG, enabled: true } 
        : chromaConfig;
    
    const bgUrl = currentShot?.backgroundLayerUrl;

    const selectedClip = sbTimeline.clips.find(c => c.id === selectedClipId) || null;

    // Sync timeline data on mount
    useEffect(() => {
        syncTimelineFromShots();
    }, [playlist.length]);

    // Cleanup WebGL on unmount
    useEffect(() => {
        return () => {
             if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
             // WebGL context loss is handled by browser garbage collection mostly for simple apps
             if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    // Initialize Audio Context for Spatial Audio & Analysis
    useEffect(() => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        return () => { ctx.close(); };
    }, []);

    // Connect Music to Analyser for Reactivity
    useEffect(() => {
        const ctx = audioContextRef.current;
        const audioEl = musicRef.current;

        if (ctx && audioEl && !musicSourceNodeRef.current) {
            try {
                // Ensure we don't reconnect if already connected (can happen in strict mode double render)
                const source = ctx.createMediaElementSource(audioEl);
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 512;
                
                source.connect(analyser);
                analyser.connect(ctx.destination);
                
                musicSourceNodeRef.current = source;
                musicAnalyserRef.current = analyser;
            } catch (e) {
                console.warn("MediaElementSource creation failed (CORS or state)", e);
            }
        }
    }, [bgMusicUrl]);

    // --- Audio Playback with Panner Logic ---
    const playDialogueAudio = async () => {
        if (!currentShot?.audioUrl || !audioContextRef.current) return;
        
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        // Stop previous
        if (audioSourceRef.current) {
            try { audioSourceRef.current.stop(); } catch(e) {}
        }

        // Fetch and Decode
        try {
            const response = await fetch(currentShot.audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            
            // Gain (Volume)
            const gainNode = ctx.createGain();
            gainNode.gain.value = Math.min(1, (currentShot.audioVolume ?? 1.0) * audioMix.dialogue);
            gainNodeRef.current = gainNode;

            // Panner
            // Find the timeline clip for the current shot to get panning data
            // Assuming 1:1 mapping for simplicity in this player view, but timeline might differ
            // We look up the clip ID constructed in timelineSlice: audio_{shot.id}
            const timelineClip = sbTimeline.clips.find(c => c.id === `audio_${currentShot.id}`);
            const panning = timelineClip?.panning || { x: 0, z: 0 };
            
            const panner = createSpatialPanner(ctx, panning.x, panning.z);
            pannerNodeRef.current = panner;

            // Connect: Source -> Gain -> Panner -> Destination
            source.connect(gainNode);
            gainNode.connect(panner);
            panner.connect(ctx.destination);
            
            source.start(0);
            audioSourceRef.current = source;
        } catch (e) {
            console.error("Audio playback error", e);
        }
    };
    
    // Update panning dynamically if changed while playing
    useEffect(() => {
        if (pannerNodeRef.current && selectedClip && selectedClip.id === `audio_${currentShot?.id}`) {
             const { x, z } = selectedClip.panning || { x: 0, z: 0 };
             updateSpatialPanner(pannerNodeRef.current, x, z);
        }
    }, [selectedClip?.panning, currentShot?.id]);

    const togglePlay = () => {
        if (isRecording || countdown !== null || isPickingColor) return; 

        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                bgVideoRef.current?.pause();
                // Pause Audio Context Source
                if (audioContextRef.current && audioContextRef.current.state === 'running') {
                    audioContextRef.current.suspend();
                }
                musicRef.current?.pause();
                ambienceRef.current?.pause();
            } else {
                videoRef.current.play();
                bgVideoRef.current?.play();
                // Resume Audio Context
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume();
                } else if (!audioSourceRef.current) {
                     // If no source started yet (fresh load), start it
                     playDialogueAudio();
                }
                
                musicRef.current?.play().catch(e => console.warn("Music play blocked", e));
                ambienceRef.current?.play().catch(e => console.warn("Ambience play blocked", e));
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

    // FIX: Added handleGlobalSeek function
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
        
        // Edge case: end of timeline
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
        
        useAppStore.setState(state => ({ 
            sbTimeline: { ...state.sbTimeline, currentTime: globalTime } 
        }));
    };

    // FIX: Handle pending seek after clip switch
    useEffect(() => {
        if (seekTargetRef.current !== null && videoRef.current) {
            try {
                videoRef.current.currentTime = seekTargetRef.current;
            } catch(e) { /* ignore */ }
            seekTargetRef.current = null;
        }
    }, [activeVideoSrc]);

    useHotkeys({
        "SPACE": togglePlay,
        "ARROWLEFT": prevClip,
        "ARROWRIGHT": nextClip,
        "ESC": () => {
            if (isPickingColor) setIsPickingColor(false);
            else onClose();
        }
    });

    // --- WebGL Setup & Rendering ---
    const initWebGL = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }); // preserveDrawingBuffer useful for color picking
        if (!gl) return;
        webglContextRef.current = gl;

        const program = initShaderProgram(gl, chromaKeyVertexShader, chromaKeyFragmentShader);
        if (!program) return;
        programRef.current = program;

        // Setup Attributes
        const positionLocation = gl.getAttribLocation(program, "a_position");
        const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        // Full quad
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
            -1.0,  1.0,
             1.0, -1.0,
             1.0,  1.0,
        ]), gl.STATIC_DRAW);

        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        // Texture coords (inverted Y usually for WebGL images)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0, 1.0,
            1.0, 1.0,
            0.0, 0.0,
            0.0, 0.0,
            1.0, 1.0,
            1.0, 0.0,
        ]), gl.STATIC_DRAW);

        // Setup Texture
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        textureRef.current = texture;

        // Enable attribs
        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(texCoordLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.useProgram(program);
    };
    
    // Hex to Normalized RGB Vector
    const hexToRGB = (hex: string): [number, number, number] => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
    };

    // Render Loop (WebGL + Reactivity)
    const renderFrame = useCallback(() => {
        const gl = webglContextRef.current;
        const video = videoRef.current;
        const program = programRef.current;
        
        // Find current video clip in timeline to get properties
        const currentClip = currentShot 
            ? sbTimeline.clips.find(c => c.resourceId === currentShot.id && c.type === 'video')
            : null;

        // --- Apply Transforms (Reactivity + Virtual Camera) ---
        if (video && currentClip) {
            let reactiveTransform = '';
            
            // 1. Audio Reactivity
            if (musicAnalyserRef.current && currentClip.reactivity) {
                const { frequencyRange, sensitivity, targetProperty } = currentClip.reactivity;
                const energy = getFrequencyEnergy(musicAnalyserRef.current, frequencyRange);
                const modifier = energy * sensitivity;
                
                if (targetProperty === 'scale') {
                    // Logic handled below in combined transform
                    reactiveTransform = `scale(${1 + modifier})`;
                } else if (targetProperty === 'brightness') {
                    video.style.filter = `brightness(${filters.brightness + (modifier * 50)}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) hue-rotate(${filters.hueRotate}deg)`;
                }
            } else {
                 video.style.filter = `contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) brightness(${filters.brightness}%) hue-rotate(${filters.hueRotate}deg)`;
            }

            // 2. Virtual Camera Physics
            let cameraTransform = '';
            if (currentClip.cameraEffect && currentClip.cameraEffect.type !== 'static') {
                cameraTransform = calculateCameraTransform(
                    currentClip.cameraEffect, 
                    video.currentTime, 
                    currentClip.duration
                );
            }

            // 3. Static Transform (Inspector)
            const baseScale = (currentClip.transform?.scale || 100) / 100;
            const staticTransform = `scale(${baseScale})`;
            
            // Combine Transforms
            // Note: CSS Transform order matters. Scale -> Translate -> Rotate.
            // But we have multiple sources. Camera physics handles its own composition.
            // Reactivity usually just pulses scale.
            // We append strings.
            
            video.style.transform = `${staticTransform} ${cameraTransform} ${reactiveTransform}`;
        }

        // --- WebGL Rendering ---
        if (effectiveChromaConfig.enabled && gl && video && program && video.readyState >= 2) {
             // Resize canvas if needed
            if (gl.canvas.width !== video.videoWidth || gl.canvas.height !== video.videoHeight) {
                gl.canvas.width = video.videoWidth;
                gl.canvas.height = video.videoHeight;
                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            }

            gl.useProgram(program);

            // Update Texture
            gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

            // Set Uniforms
            const keyColor = hexToRGB(effectiveChromaConfig.color);
            gl.uniform3fv(gl.getUniformLocation(program, "u_keyColor"), keyColor);
            gl.uniform1f(gl.getUniformLocation(program, "u_similarity"), effectiveChromaConfig.similarity);
            gl.uniform1f(gl.getUniformLocation(program, "u_smoothness"), effectiveChromaConfig.smoothness);
            gl.uniform1f(gl.getUniformLocation(program, "u_spill"), effectiveChromaConfig.spill);

            // Draw
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        if (isPlaying || isPickingColor) {
             rafIdRef.current = requestAnimationFrame(renderFrame);
        }
    }, [isPlaying, effectiveChromaConfig, isPickingColor, currentShot, sbTimeline.clips, filters]);

    // Effect to start/stop Render loop
    // Note: We run loop even if Chroma disabled to handle audio reactivity
    useEffect(() => {
        // Initialize WebGL if needed for chroma
        if (effectiveChromaConfig.enabled && !webglContextRef.current) {
            initWebGL();
        }

        if (isPlaying || isPickingColor) {
             rafIdRef.current = requestAnimationFrame(renderFrame);
        } else {
             if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        }

        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        };
    }, [effectiveChromaConfig.enabled, isPlaying, currentIndex, activeVideoSrc, renderFrame, isPickingColor]);


    const handleChromaConfigChange = (newConfig: ChromaKeyConfig) => {
        if (currentShot) {
            updateShot(currentShot.id, 'chromaKey', newConfig);
            // Also unset deprecated flag if setting new config
            if (currentShot.isGreenScreen) updateShot(currentShot.id, 'isGreenScreen', false);
        }
    };
    
    // --- Eye Dropper Logic ---
    const handlePickColor = async () => {
        // Native EyeDropper API
        if ('EyeDropper' in window) {
            try {
                const eyeDropper = new (window as any).EyeDropper();
                const result = await eyeDropper.open();
                handleChromaConfigChange({ ...effectiveChromaConfig, color: result.sRGBHex });
            } catch (e) {
                console.log("EyeDropper canceled");
            }
        } else {
            // Fallback: Click on canvas
            setIsPickingColor(true);
            setIsPlaying(false); // Pause to pick easily
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
        
        // Read pixel from WebGL context (requires preserveDrawingBuffer: true)
        const gl = webglContextRef.current;
        const pixels = new Uint8Array(4);
        // WebGL Y is inverted relative to Mouse Y
        gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        
        // Convert to Hex
        const hex = "#" + [pixels[0], pixels[1], pixels[2]].map(x => x.toString(16).padStart(2, '0')).join('');
        
        handleChromaConfigChange({ ...effectiveChromaConfig, color: hex.toUpperCase() });
        setIsPickingColor(false);
    };

    // --- Standard Player Handlers (Play, Pause, etc.) ---
    useEffect(() => {
        lastTimeRef.current = 0;
        setIsPlaying(true);
        setActiveOverlays([]);
        
        // Trigger Audio Context Playback
        if (currentShot) {
            playDialogueAudio();
        }

        if (musicRef.current && isPlaying && bgMusicUrl) musicRef.current.play().catch(() => {});
        if (ambienceRef.current && isPlaying && ambienceUrl) {
             ambienceRef.current.volume = audioMix.ambience;
             ambienceRef.current.play().catch(() => {});
        }

    }, [currentIndex, playlist]);

    // Handle Time Update for Sync
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            
            // Sync Store Timeline Position
            let globalTime = 0;
            for (let i = 0; i < currentIndex; i++) globalTime += playlist[i].duration || 5;
            globalTime += currentTime;
            
            useAppStore.setState(state => ({ 
                sbTimeline: { ...state.sbTimeline, currentTime: globalTime } 
            }));
            
            // Sync BG Video
            if (bgVideoRef.current && Math.abs(bgVideoRef.current.currentTime - currentTime) > 0.5) {
                bgVideoRef.current.currentTime = currentTime;
            }
            
            // Sync Audio Context (Rough sync check, re-trigger if drift)
            // Note: Web Audio runs on its own clock. Exact sync usually requires managing the video element 
            // as the master clock and creating a MediaElementSource, but that conflicts with PannerNode in some setups due to cross-origin.
            // For now, we rely on initial start sync.

            // Audio Ducking
            if (musicRef.current && !musicRef.current.muted) {
                // Determine if dialogue is active based on time and existence
                const voiceIsActive = audioSourceRef.current && currentShot.audioUrl;
                // Ideally check RMS here, but using bool flag from setup
                
                const duckingMultiplier = (autoDuck && voiceIsActive) ? 0.3 : 1.0;
                const targetVolume = Math.min(1, audioMix.music * duckingMultiplier);
                if (Math.abs(musicRef.current.volume - targetVolume) > 0.01) {
                    musicRef.current.volume += (targetVolume - musicRef.current.volume) * 0.05;
                }
            }
            lastTimeRef.current = currentTime;
        }
    };
    
    const handleEnded = () => {
        if (currentIndex < playlist.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setIsPlaying(false);
        }
    };

    const handleConfirmExport = (profile: ExportProfile) => { /* ... */ };

    // Standard styling for video element (overridden by reactivity in render loop if active)
    const videoStyle = {
        filter: `contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) brightness(${filters.brightness}%) hue-rotate(${filters.hueRotate}deg)`
    };

    if (playlist.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in-up">
            {/* We don't render <audio ref={audioRef} /> anymore as we use WebAudio API */}
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
                    {/* Smart Proxy Toggle */}
                    <button 
                        onClick={() => setUseProxy(!useProxy)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            useProxy 
                            ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
                            : 'bg-slate-800/50 border-slate-600 text-slate-400'
                        }`}
                        title="Use low-res proxies for smoother playback during editing"
                    >
                        <Icon name="activity" className="w-3 h-3" />
                        <span>{useProxy ? 'Proxy ON' : 'Proxy OFF'}</span>
                    </button>
                    
                    <button 
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-full text-xs shadow-lg"
                    >
                        <Icon name="download" className="w-4 h-4" />
                        Export
                    </button>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors">
                        <Icon name="cancel" className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Tool Panels */}
            {showFilters && (
                <div className="absolute top-24 right-4 z-30 animate-fade-in-up origin-top-right">
                    <FilterControls filters={filters} onChange={(k, v) => setFilters(p => ({...p, [k]: v}))} onReset={() => setFilters({contrast: 100, saturation: 100, brightness: 100, hueRotate: 0, sepia: 0, grain: 0, vfxType: 'none', vfxIntensity: 50})} />
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
                    <AudioMixer volumes={audioMix} autoDuck={autoDuck} onChange={(k, v) => setAudioMix(p => ({...p, [k]: v}))} onAutoDuckChange={setAutoDuck} onReset={() => setAudioMix({dialogue: 1, sfx: 1, music: 0.5, ambience: 0.15})} />
                </div>
            )}
            
            {/* Main Content Area: Split View */}
            <div className="flex-grow flex h-[60%] border-b border-slate-800 bg-slate-920 overflow-hidden">
                {/* Main Player */}
                <div className="flex-grow relative flex items-center justify-center bg-black">
                    <div className="relative max-h-full max-w-full aspect-video shadow-2xl flex items-center justify-center w-full h-full">
                        
                        {/* Background (if chroma active) */}
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

                        {/* Main Video (Hidden if Chroma Active, drawn to canvas) */}
                        <video
                            key={activeVideoSrc}
                            ref={videoRef}
                            src={activeVideoSrc}
                            className={effectiveChromaConfig.enabled ? "hidden" : "max-h-full max-w-full block h-full"}
                            style={videoStyle}
                            autoPlay
                            onEnded={handleEnded}
                            onTimeUpdate={handleTimeUpdate}
                            onClick={togglePlay}
                            // Audio handling is done via WebAudio API separately, video element muted or handled there?
                            // For simplicity, we assume the video element handles video, audio via AudioContext.
                            muted={!!currentShot.audioUrl} // Mute video if we have separate dialogue audio track
                            crossOrigin="anonymous"
                        />

                        {/* SD Badge for Proxies */}
                        {isUsingProxy && (
                            <div className="absolute top-24 left-4 z-10 bg-yellow-500/80 text-black font-bold px-2 py-1 rounded text-[10px] shadow pointer-events-none backdrop-blur-sm border border-yellow-400/50">
                                SD PROXY
                            </div>
                        )}

                        {/* WebGL Canvas for Chroma Key */}
                        <canvas 
                            ref={canvasRef}
                            className={`${effectiveChromaConfig.enabled ? "block" : "hidden"} max-h-full max-w-full h-full ${isPickingColor ? 'cursor-crosshair' : 'cursor-pointer'}`}
                            style={videoStyle}
                            onClick={handleCanvasClick}
                        />
                        
                        {/* Color Picker Instruction */}
                        {isPickingColor && (
                            <div className="absolute top-4 bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/20 animate-pulse pointer-events-none">
                                Click on the background color to key it out
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

                {/* Inspector Panel */}
                {showInspector && selectedClip && (
                    <InspectorPanel 
                        selectedClip={selectedClip} 
                        onUpdate={updateTimelineClip} 
                        currentTime={sbTimeline.currentTime} 
                    />
                )}
            </div>

            {/* Timeline & Toolbar */}
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
                        <button onClick={() => setShowInspector(!showInspector)} className={`text-xs flex gap-1 ${showInspector ? 'text-cyan-400' : 'text-slate-400'}`}>
                            <Icon name="edit" className="w-4 h-4" /> Properties
                        </button>
                        <button onClick={() => { setShowFilters(!showFilters); setShowChromaKey(false); setShowMixer(false); }} className={`text-xs flex gap-1 ${showFilters ? 'text-cyan-400' : 'text-slate-400'}`}>
                            <Icon name="sliders" className="w-4 h-4" /> Color
                        </button>
                        <button onClick={() => { setShowChromaKey(!showChromaKey); setShowFilters(false); setShowMixer(false); }} className={`text-xs flex gap-1 ${showChromaKey ? 'text-green-400' : 'text-slate-400'}`}>
                            <Icon name="layers" className="w-4 h-4" /> Green Screen
                        </button>
                        <button onClick={() => { setShowMixer(!showMixer); setShowFilters(false); setShowChromaKey(false); }} className={`text-xs flex gap-1 ${showMixer ? 'text-purple-400' : 'text-slate-400'}`}>
                            <Icon name="audio" className="w-4 h-4" /> Mixer
                        </button>
                    </div>
                </div>

                <Timeline 
                    timelineState={sbTimeline}
                    onClipUpdate={updateTimelineClip}
                    onSeek={handleGlobalSeek}
                    duration={totalDuration}
                    startVideoGeneration={startGeneration} 
                    onSelectClip={(clip) => setSelectedClipId(clip.id)}
                    selectedClipId={selectedClipId}
                />
            </div>
            
            <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onConfirm={handleConfirmExport} totalDuration={totalDuration} isProcessing={isExporting} processingStatus={exportStatus} />
        </div>
    );
};

export default TimelinePlayer;