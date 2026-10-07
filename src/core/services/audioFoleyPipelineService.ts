/**
 * Automated Foley & SFX Audio Pipeline Service (v13.0.0 - Milestone 5)
 *
 * Implements sequence-wide audio event detection, A2 (Dialogue) TTS synthesis,
 * A3 (Foley/SFX) sound effect generation, A5 (Ambience) atmosphere beds,
 * dynamic ducking curves, and automatic multi-track timeline placement.
 */

import { Shot, TimelineClip, Asset, VolumeKeyframe } from '@core/types';
import type {
  AudioEventCue,
  AudioPipelineConfig,
  AudioPipelineDetectionResult,
} from '@core/types/audioPipeline';
import { useAppStore } from '@core/store/useAppStore';
import * as sfxService from './sfxService';
import * as geminiAudioService from './gemini/geminiAudioService';
import { createSyntheticWavBlob } from '@core/utils/audio';
import { logger } from './loggerService';

export const DEFAULT_AUDIO_PIPELINE_CONFIG: AudioPipelineConfig = {
  autoDuckMusic: true,
  duckDepthDb: -14, // ~0.20 linear gain
  attackTimeSeconds: 0.2,
  releaseTimeSeconds: 0.4,
  ttsVoice: 'Kore',
  autoGenerateAmbience: true,
};

/**
 * Detects all relevant audio events (Dialogue, Foley, SFX, Ambience) for a single shot.
 */
export function detectShotAudioCues(
  shot: Shot,
  shotStartTimeSeconds: number,
  config: AudioPipelineConfig = DEFAULT_AUDIO_PIPELINE_CONFIG,
): AudioEventCue[] {
  const cues: AudioEventCue[] = [];
  const shotDuration = Math.max(1, shot.duration || 5);
  const actionText = (shot.action || '').toLowerCase();
  const environmentText = (shot.environment || '').toLowerCase();
  const cameraText = (shot.camera || '').toLowerCase();

  // 1. Dialogue Detection (A2 Track)
  const dialogue = shot.dialogue || shot.dialogueText;
  if (dialogue && dialogue.trim().length > 0) {
    const wordCount = dialogue.trim().split(/\s+/).length;
    const estDuration = Math.min(shotDuration, Math.max(1.2, wordCount * 0.38));
    cues.push({
      id: `cue_dlg_${shot.id}_${Date.now()}_0`,
      shotId: shot.id,
      timeOffsetSeconds: shotStartTimeSeconds + 0.3, // slight breath offset
      durationSeconds: estDuration,
      category: 'dialogue',
      targetTrackId: 'audio_dialogue',
      label: `Dialogue: "${dialogue.slice(0, 24)}${dialogue.length > 24 ? '...' : ''}"`,
      prompt: dialogue,
      volume: 1.0,
      duckingIntensity: 0.85,
      status: 'pending',
    });
  }

  // 2. Explicit Foley Cues from Screenplay / Shot metadata (A3 Track)
  if (Array.isArray(shot.foleyCues) && shot.foleyCues.length > 0) {
    shot.foleyCues.forEach((cueText, idx) => {
      const cueTime = Math.min(shotDuration - 0.5, 0.5 + idx * 1.5);
      cues.push({
        id: `cue_foley_exp_${shot.id}_${idx}`,
        shotId: shot.id,
        timeOffsetSeconds: shotStartTimeSeconds + cueTime,
        durationSeconds: Math.min(3, shotDuration - cueTime),
        category: 'foley',
        targetTrackId: 'audio_sfx',
        label: `Foley Cue: ${cueText}`,
        prompt: cueText,
        volume: 0.9,
        duckingIntensity: 0.3,
        status: 'pending',
      });
    });
  }

  // 3. Action-based Foley Detection (A3 Track)
  // Footsteps / Running
  if (
    actionText.includes('springer') ||
    actionText.includes('går') ||
    actionText.includes('rusar') ||
    actionText.includes('steg') ||
    actionText.includes('running') ||
    actionText.includes('walk') ||
    actionText.includes('flees') ||
    actionText.includes('steps')
  ) {
    cues.push({
      id: `cue_foley_steps_${shot.id}`,
      shotId: shot.id,
      timeOffsetSeconds: shotStartTimeSeconds + 0.2,
      durationSeconds: Math.min(shotDuration, 3.5),
      category: 'foley',
      targetTrackId: 'audio_sfx',
      label: 'Footsteps & Movement',
      prompt: 'Rhythmic footsteps running and shoe impacts with floor cloth rustle',
      volume: 0.8,
      duckingIntensity: 0.2,
      status: 'pending',
    });
  }

  // Doors / Openings / Machinery
  if (
    actionText.includes('öppnar') ||
    actionText.includes('dörr') ||
    actionText.includes('stänger') ||
    actionText.includes('door') ||
    actionText.includes('latch') ||
    actionText.includes('window')
  ) {
    cues.push({
      id: `cue_foley_door_${shot.id}`,
      shotId: shot.id,
      timeOffsetSeconds: shotStartTimeSeconds + 0.8,
      durationSeconds: 1.8,
      category: 'foley',
      targetTrackId: 'audio_sfx',
      label: 'Door / Mechanical Action',
      prompt: 'Heavy door latch turn, creek open and wooden close slam',
      volume: 0.9,
      duckingIntensity: 0.4,
      status: 'pending',
    });
  }

  // Physical impact / Combat / Fighting
  if (
    actionText.includes('slår') ||
    actionText.includes('krasch') ||
    actionText.includes('svärd') ||
    actionText.includes('faller') ||
    actionText.includes('punch') ||
    actionText.includes('impact') ||
    actionText.includes('fight') ||
    actionText.includes('crash')
  ) {
    cues.push({
      id: `cue_foley_hit_${shot.id}`,
      shotId: shot.id,
      timeOffsetSeconds: shotStartTimeSeconds + 1.0,
      durationSeconds: 1.5,
      category: 'foley',
      targetTrackId: 'audio_sfx',
      label: 'Physical Impact / Hit',
      prompt: 'Heavy body hit impact with leather cloth movement',
      volume: 1.0,
      duckingIntensity: 0.6,
      status: 'pending',
    });
  }

  // 4. Cinematic SFX / Dynamic Camera Transitions (A3 Track)
  if (
    cameraText.includes('fpv') ||
    cameraText.includes('drone') ||
    cameraText.includes('whip') ||
    cameraText.includes('dolly-zoom') ||
    cameraText.includes('crane') ||
    actionText.includes('explosion') ||
    actionText.includes('skott') ||
    actionText.includes('laser')
  ) {
    const isExplosion = actionText.includes('explosion') || actionText.includes('skott');
    cues.push({
      id: `cue_sfx_cine_${shot.id}`,
      shotId: shot.id,
      timeOffsetSeconds: shotStartTimeSeconds + 0.1,
      durationSeconds: isExplosion ? 3.0 : 2.0,
      category: 'sfx',
      targetTrackId: 'audio_sfx',
      label: isExplosion ? 'Explosion & Blast' : 'Cinematic Camera Whoosh',
      prompt: isExplosion
        ? 'Massive cinematic explosion boom with low sub-bass rumble'
        : 'High-speed cinematic camera whoosh riser transition',
      volume: 0.95,
      duckingIntensity: isExplosion ? 0.9 : 0.4,
      status: 'pending',
    });
  }

  // 5. Environmental Room Tone & Ambience (A5 Track)
  if (config.autoGenerateAmbience) {
    const envPrompt = shot.environment
      ? `Atmospheric room tone: ${shot.environment}`
      : environmentText.includes('rain') || environmentText.includes('regn')
        ? 'Continuous heavy rain on pavement with distant thunder'
        : 'Cinematic room tone and subtle environmental hum';

    cues.push({
      id: `cue_amb_${shot.id}`,
      shotId: shot.id,
      timeOffsetSeconds: shotStartTimeSeconds,
      durationSeconds: shotDuration,
      category: 'ambience',
      targetTrackId: 'audio_ambience',
      label: `Ambience: ${shot.environment ? shot.environment.slice(0, 20) : 'Room Tone'}`,
      prompt: envPrompt,
      volume: 0.35,
      duckingIntensity: 0.0,
      status: 'pending',
    });
  }

  return cues;
}

/**
 * Analyzes an entire sequence of shots, calculating cumulative start times and cues.
 */
export function detectSequenceAudioCues(
  shots: Shot[],
  config: Partial<AudioPipelineConfig> = {},
): AudioPipelineDetectionResult {
  const mergedConfig = { ...DEFAULT_AUDIO_PIPELINE_CONFIG, ...config };
  const allCues: AudioEventCue[] = [];
  let currentTime = 0;

  for (const shot of shots) {
    const shotCues = detectShotAudioCues(shot, currentTime, mergedConfig);
    allCues.push(...shotCues);
    currentTime += Math.max(1, shot.duration || 5);
  }

  return {
    cues: allCues,
    totalCues: allCues.length,
    estimatedDurationSeconds: currentTime,
  };
}

/**
 * Computes dynamic volume ducking keyframes for music and ambient background tracks.
 * Smoothly attenuates background audio during dialogue and impactful SFX.
 */
export function computeDuckingKeyframes(
  cues: AudioEventCue[],
  totalDurationSeconds: number,
  config: Partial<AudioPipelineConfig> = {},
): VolumeKeyframe[] {
  const cfg = { ...DEFAULT_AUDIO_PIPELINE_CONFIG, ...config };
  if (!cfg.autoDuckMusic || totalDurationSeconds <= 0) return [];

  // Find ducking intervals
  const duckingIntervals: Array<{ start: number; end: number; intensity: number }> = [];

  for (const cue of cues) {
    const intensity = cue.duckingIntensity ?? 0;
    if (intensity > 0.2) {
      duckingIntervals.push({
        start: cue.timeOffsetSeconds,
        end: cue.timeOffsetSeconds + cue.durationSeconds,
        intensity,
      });
    }
  }

  if (duckingIntervals.length === 0) return [];

  // Sort intervals by start time
  duckingIntervals.sort((a, b) => a.start - b.start);

  // Merge overlapping or nearby intervals
  const merged: Array<{ start: number; end: number; intensity: number }> = [];
  for (const interval of duckingIntervals) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end + cfg.releaseTimeSeconds) {
      last.end = Math.max(last.end, interval.end);
      last.intensity = Math.max(last.intensity, interval.intensity);
    } else {
      merged.push({ ...interval });
    }
  }

  // Generate volume keyframes
  const keyframes: VolumeKeyframe[] = [];
  const normalGain = 1.0;
  const duckGain = Math.max(0.1, Math.pow(10, cfg.duckDepthDb / 20)); // -14 dB -> ~0.2 linear

  // Initial keyframe at start
  keyframes.push({ time: 0, value: normalGain });

  for (const m of merged) {
    const attackStart = Math.max(0, m.start - cfg.attackTimeSeconds);
    const attackEnd = m.start;
    const releaseStart = m.end;
    const releaseEnd = Math.min(totalDurationSeconds, m.end + cfg.releaseTimeSeconds);

    const targetDucked = normalGain - (normalGain - duckGain) * m.intensity;

    // Normal level right before attack
    if (
      attackStart > 0 &&
      (!keyframes.length || keyframes[keyframes.length - 1].time < attackStart)
    ) {
      keyframes.push({ time: attackStart, value: normalGain });
    }

    // Ducked level at start of cue
    keyframes.push({ time: attackEnd, value: targetDucked });

    // Ducked level at end of cue
    keyframes.push({ time: releaseStart, value: targetDucked });

    // Restored level after release
    keyframes.push({ time: releaseEnd, value: normalGain });
  }

  // Ensure keyframes are strictly ordered and deduplicated
  keyframes.sort((a, b) => a.time - b.time);
  const deduped: VolumeKeyframe[] = [];
  for (const kf of keyframes) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.time - kf.time) < 0.05) {
      prev.value = kf.value;
    } else {
      deduped.push(kf);
    }
  }

  return deduped;
}

/**
 * Synthesizes audio for a single cue. Uses Gemini / SFX services when available,
 * falling back to synthetic PCM WAV audio when offline or without API keys.
 */
export async function synthesizeCueAudio(
  cue: AudioEventCue,
  config: AudioPipelineConfig = DEFAULT_AUDIO_PIPELINE_CONFIG,
): Promise<{ blob: Blob; url: string }> {
  try {
    let blob: Blob | null = null;

    if (cue.category === 'dialogue') {
      const base64 = await geminiAudioService.generateSpeech(cue.prompt, config.ttsVoice);
      if (base64) {
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        // Gemini TTS is 24kHz mono PCM
        blob = new Blob([bytes], { type: 'audio/wav' });
      }
    } else if (cue.category === 'ambience') {
      blob = await sfxService.getAmbience(cue.prompt);
    } else {
      // foley or sfx
      blob = await sfxService.generateSound(cue.prompt);
    }

    if (blob) {
      const url =
        typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : `blob:${cue.id}`;
      return { blob, url };
    }
  } catch (err) {
    logger.warn(
      `Online audio synthesis unavailable for cue "${cue.label}", generating synthetic previz audio:`,
      err,
    );
  }

  // Deterministic local synth fallback
  const freq =
    cue.category === 'dialogue'
      ? 280
      : cue.category === 'ambience'
        ? 140
        : cue.category === 'sfx'
          ? 550
          : 380;
  const synthBlob = createSyntheticWavBlob(cue.durationSeconds, freq);
  const synthUrl =
    typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(synthBlob)
      : `mock-audio://${cue.id}.wav`;

  return { blob: synthBlob, url: synthUrl };
}

/**
 * Places a synthesized audio cue onto the multi-track timeline as an Asset and TimelineClip.
 */
export function placeCueOnTimeline(cue: AudioEventCue, blob: Blob, url: string): TimelineClip {
  const store = useAppStore.getState();
  const assetId = `asset_${cue.id}`;

  const newAsset: Asset = {
    id: assetId,
    type: 'audio',
    name: cue.label,
    url,
    data: '',
    mimeType: 'audio/wav',
  };

  store.addAsset(newAsset);

  const clipId = `clip_${cue.id}`;
  const newClip: TimelineClip = {
    id: clipId,
    resourceId: assetId,
    trackId: cue.targetTrackId,
    startTime: cue.timeOffsetSeconds,
    duration: cue.durationSeconds,
    offset: 0,
    type: 'audio',
    label: cue.label,
    volume: cue.volume,
  };

  store.addTimelineClip(newClip);
  return newClip;
}

/**
 * High-level pipeline runner: detects all cues, batch synthesizes audio,
 * places clips onto the multi-track timeline, and updates ducking curves.
 */
export async function executeBatchPipeline(
  shots: Shot[],
  config: Partial<AudioPipelineConfig> = {},
  onProgress?: (completed: number, total: number) => void,
): Promise<{
  cues: AudioEventCue[];
  clips: TimelineClip[];
  duckingKeyframes: VolumeKeyframe[];
}> {
  const mergedConfig = { ...DEFAULT_AUDIO_PIPELINE_CONFIG, ...config };
  const detection = detectSequenceAudioCues(shots, mergedConfig);
  const synthesizedCues: AudioEventCue[] = [];
  const placedClips: TimelineClip[] = [];

  const total = detection.cues.length;
  let completed = 0;

  for (const cue of detection.cues) {
    cue.status = 'synthesizing';
    try {
      const { blob, url } = await synthesizeCueAudio(cue, mergedConfig);
      cue.audioBlob = blob;
      cue.audioUrl = url;
      cue.status = 'ready';

      const clip = placeCueOnTimeline(cue, blob, url);
      placedClips.push(clip);
    } catch (err: unknown) {
      cue.status = 'error';
      cue.error = String(err);
      logger.error(`Error processing audio cue "${cue.id}":`, err);
    }

    completed++;
    onProgress?.(completed, total);
    synthesizedCues.push(cue);
  }

  // Calculate & apply ducking keyframes
  const duckingKeyframes = computeDuckingKeyframes(
    synthesizedCues,
    detection.estimatedDurationSeconds,
    mergedConfig,
  );

  // Apply ducking to existing music or ambience clips on timeline
  if (duckingKeyframes.length > 0 && mergedConfig.autoDuckMusic) {
    const store = useAppStore.getState();
    const musicClips = store.clips.filter((c) => c.trackId === 'audio_music');
    for (const mc of musicClips) {
      store.updateTimelineClip(mc.id, { volumeKeyframes: duckingKeyframes });
    }
  }

  return {
    cues: synthesizedCues,
    clips: placedClips,
    duckingKeyframes,
  };
}
