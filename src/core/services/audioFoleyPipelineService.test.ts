import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Shot } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import {
  detectShotAudioCues,
  detectSequenceAudioCues,
  computeDuckingKeyframes,
  synthesizeCueAudio,
  placeCueOnTimeline,
  executeBatchPipeline,
  DEFAULT_AUDIO_PIPELINE_CONFIG,
} from './audioFoleyPipelineService';

describe('audioFoleyPipelineService', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      sbShots: [],
      clips: [],
      assets: [],
    });
  });

  describe('detectShotAudioCues', () => {
    it('detects dialogue, foley, cinematic SFX and ambience for a rich shot', () => {
      const shot: Shot = {
        id: 1,
        duration: 6,
        type: 'video',
        action: 'Kuriren springer över hustaket och sparkar upp en dörr',
        dialogue: 'De är precis bakom oss! Spring!',
        camera: 'FPV drone dive',
        environment: 'Regnvåt cyberpunk-stadsmiljö med neonsken',
        characterId: 'char-1',
        takes: [],
        selectedTakeIndex: 0,
        visualLink: false,
        transition: { type: 'cut', duration: 0 },
      };

      const cues = detectShotAudioCues(shot, 0);

      // Dialogue cue
      const dialogueCue = cues.find((c) => c.category === 'dialogue');
      expect(dialogueCue).toBeDefined();
      expect(dialogueCue?.targetTrackId).toBe('audio_dialogue');
      expect(dialogueCue?.prompt).toContain('De är precis bakom oss!');
      expect(dialogueCue?.duckingIntensity).toBeGreaterThan(0.5);

      // Footsteps foley
      const foleySteps = cues.find((c) => c.id.includes('steps'));
      expect(foleySteps).toBeDefined();
      expect(foleySteps?.targetTrackId).toBe('audio_sfx');

      // Door foley
      const foleyDoor = cues.find((c) => c.id.includes('door'));
      expect(foleyDoor).toBeDefined();
      expect(foleyDoor?.targetTrackId).toBe('audio_sfx');

      // Camera whoosh SFX
      const sfxCamera = cues.find((c) => c.category === 'sfx');
      expect(sfxCamera).toBeDefined();
      expect(sfxCamera?.targetTrackId).toBe('audio_sfx');

      // Ambience
      const ambCue = cues.find((c) => c.category === 'ambience');
      expect(ambCue).toBeDefined();
      expect(ambCue?.targetTrackId).toBe('audio_ambience');
      expect(ambCue?.durationSeconds).toBe(6);
    });

    it('respects explicit foleyCues array from screenplay', () => {
      const shot: Shot = {
        id: 2,
        duration: 4,
        type: 'video',
        action: 'Detektiven inspekterar skrivbordet',
        foleyCues: ['Gyllene fickur klickar', 'Låda dras ut'],
        camera: 'Static 50mm',
        characterId: 'char-2',
        takes: [],
        selectedTakeIndex: 0,
        visualLink: false,
        transition: { type: 'cut', duration: 0 },
      };

      const cues = detectShotAudioCues(shot, 10);
      const explicitFoley = cues.filter((c) => c.id.includes('cue_foley_exp'));
      expect(explicitFoley.length).toBe(2);
      expect(explicitFoley[0].prompt).toBe('Gyllene fickur klickar');
      expect(explicitFoley[1].prompt).toBe('Låda dras ut');
      expect(explicitFoley[0].timeOffsetSeconds).toBeGreaterThanOrEqual(10);
    });
  });

  describe('detectSequenceAudioCues', () => {
    it('calculates cumulative timestamps across multiple shots', () => {
      const shots: Shot[] = [
        {
          id: 1,
          duration: 4,
          type: 'video',
          action: 'Karaktär A talar',
          dialogue: 'Hallå där!',
          camera: 'static',
          characterId: 'c1',
          takes: [],
          selectedTakeIndex: 0,
          visualLink: false,
          transition: { type: 'cut', duration: 0 },
        },
        {
          id: 2,
          duration: 6,
          type: 'video',
          action: 'Karaktär B springer iväg',
          camera: 'pan',
          characterId: 'c2',
          takes: [],
          selectedTakeIndex: 0,
          visualLink: false,
          transition: { type: 'cut', duration: 0 },
        },
      ];

      const result = detectSequenceAudioCues(shots);
      expect(result.totalCues).toBeGreaterThan(2);
      expect(result.estimatedDurationSeconds).toBe(10);

      const shot2Cues = result.cues.filter((c) => c.shotId === 2);
      expect(shot2Cues.length).toBeGreaterThan(0);
      // Shot 2 starts at t=4s
      expect(shot2Cues[0].timeOffsetSeconds).toBeGreaterThanOrEqual(4);
    });
  });

  describe('computeDuckingKeyframes', () => {
    it('generates attack, hold, and release volume keyframes for dialogue cues', () => {
      const cues = [
        {
          id: 'cue-1',
          timeOffsetSeconds: 2.0,
          durationSeconds: 3.0,
          category: 'dialogue' as const,
          targetTrackId: 'audio_dialogue' as const,
          label: 'Test Dialogue',
          prompt: 'Talar',
          volume: 1.0,
          duckingIntensity: 0.85,
          status: 'pending' as const,
        },
      ];

      const keyframes = computeDuckingKeyframes(cues, 10, {
        attackTimeSeconds: 0.2,
        releaseTimeSeconds: 0.4,
      });

      expect(keyframes.length).toBeGreaterThanOrEqual(4);
      // First is normal gain
      expect(keyframes[0].time).toBe(0);
      expect(keyframes[0].value).toBe(1.0);

      // During dialogue, gain should duck significantly (< 0.5)
      const ducked = keyframes.find((k) => k.time >= 2.0 && k.time <= 5.0);
      expect(ducked).toBeDefined();
      expect(ducked!.value).toBeLessThan(0.4);

      // Restores back to 1.0 after cue ends + release
      const restored = keyframes[keyframes.length - 1];
      expect(restored.value).toBe(1.0);
      expect(restored.time).toBeCloseTo(5.4, 1);
    });

    it('returns empty keyframes if autoDuckMusic is false', () => {
      const cues = [
        {
          id: 'cue-1',
          timeOffsetSeconds: 2.0,
          durationSeconds: 2.0,
          category: 'dialogue' as const,
          targetTrackId: 'audio_dialogue' as const,
          label: 'Dialogue',
          prompt: 'Talar',
          volume: 1.0,
          duckingIntensity: 0.8,
          status: 'pending' as const,
        },
      ];

      const keyframes = computeDuckingKeyframes(cues, 10, { autoDuckMusic: false });
      expect(keyframes).toEqual([]);
    });
  });

  describe('synthesizeCueAudio & placeCueOnTimeline', () => {
    it('synthesizes audio blob and registers asset and timeline clip', async () => {
      const cue = {
        id: 'cue-synth-1',
        shotId: 1,
        timeOffsetSeconds: 1.5,
        durationSeconds: 2.0,
        category: 'foley' as const,
        targetTrackId: 'audio_sfx' as const,
        label: 'Footsteps',
        prompt: 'Footsteps on floor',
        volume: 0.8,
        status: 'pending' as const,
      };

      const { blob, url } = await synthesizeCueAudio(cue, DEFAULT_AUDIO_PIPELINE_CONFIG);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(44); // More than WAV header
      expect(url).toBeDefined();

      const clip = placeCueOnTimeline(cue, blob, url);
      expect(clip.trackId).toBe('audio_sfx');
      expect(clip.startTime).toBe(1.5);
      expect(clip.duration).toBe(2.0);

      const store = useAppStore.getState();
      expect(store.clips.length).toBe(1);
      expect(store.assets.length).toBe(1);
      expect(store.assets[0].type).toBe('audio');
    });
  });

  describe('executeBatchPipeline', () => {
    it('executes full pipeline, populating clips and ducking existing music', async () => {
      // Setup existing music clip on audio_music track
      useAppStore.setState({
        clips: [
          {
            id: 'music-clip-1',
            resourceId: 'music-asset-1',
            trackId: 'audio_music',
            startTime: 0,
            duration: 15,
            offset: 0,
            type: 'audio',
            label: 'Background Score',
          },
        ],
      });

      const shots: Shot[] = [
        {
          id: 1,
          duration: 5,
          type: 'video',
          action: 'Kuriren rusar in i gränden',
          dialogue: 'Vi måste gömma oss!',
          camera: 'steadicam-follow',
          environment: 'Regnig bakgata',
          characterId: 'c1',
          takes: [],
          selectedTakeIndex: 0,
          visualLink: false,
          transition: { type: 'cut', duration: 0 },
        },
      ];

      const progressSpy = vi.fn();
      const result = await executeBatchPipeline(shots, {}, progressSpy);

      expect(result.cues.length).toBeGreaterThan(0);
      expect(result.clips.length).toBe(result.cues.length);
      expect(progressSpy).toHaveBeenCalled();

      // Check that music clip received ducking keyframes
      const updatedMusic = useAppStore.getState().clips.find((c) => c.id === 'music-clip-1');
      expect(updatedMusic?.volumeKeyframes).toBeDefined();
      expect(updatedMusic?.volumeKeyframes?.length).toBeGreaterThan(0);
    });
  });
});
